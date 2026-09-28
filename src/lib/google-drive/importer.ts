/**
 * Drive → course import planning. Pure functions (no I/O) + a tree scanner that
 * takes a `list` function, so the whole planner is testable without Google.
 * Nothing here writes to the database or publishes anything.
 */
import type { DriveItem } from "./client";

export const FOLDER_MIME = "application/vnd.google-apps.folder";

export type ScannedFile = DriveItem & { parentId: string; path: string[] };
export type ScannedFolder = { id: string; name: string; parentId: string | null; depth: number; path: string[] };
export type Tree = { root: { id: string; name: string }; folders: ScannedFolder[]; files: ScannedFile[]; truncated: boolean };

export type ResourceKind = "pdf" | "notes" | "cheat_sheet" | "code_repository" | "dataset" | "template" | "presentation" | "recording";
export type Classified =
  | { kind: "video" }
  | { kind: "resource"; resourceType: ResourceKind }
  | { kind: "skip"; reason: string };

const EXT = (name: string) => (name.includes(".") ? name.split(".").pop()!.toLowerCase() : "");

export function classify(f: Pick<DriveItem, "name" | "mimeType">): Classified {
  const ext = EXT(f.name);
  const mt = f.mimeType || "";
  if (mt.startsWith("video/") || ["mp4", "m4v", "mov", "webm", "mkv", "avi"].includes(ext)) return { kind: "video" };
  if (["srt", "vtt"].includes(ext)) return { kind: "skip", reason: "Subtitle file — caption support is planned; not imported yet" };
  if (mt === "application/pdf" || ext === "pdf") return { kind: "resource", resourceType: "pdf" };
  if (mt === "application/vnd.google-apps.presentation" || ["ppt", "pptx", "key"].includes(ext)) return { kind: "resource", resourceType: "presentation" };
  if (mt === "application/vnd.google-apps.document" || ["doc", "docx", "txt", "md", "rtf"].includes(ext)) return { kind: "resource", resourceType: "notes" };
  if (mt === "application/vnd.google-apps.spreadsheet" || ["csv", "tsv", "xlsx", "xls", "json", "parquet", "sqlite", "db"].includes(ext)) return { kind: "resource", resourceType: "dataset" };
  if (["zip", "rar", "7z", "tar", "gz", "py", "ipynb", "js", "ts", "jsx", "tsx", "html", "css", "java", "c", "cpp", "sql", "sh", "r"].includes(ext)) return { kind: "resource", resourceType: "code_repository" };
  if (mt.startsWith("audio/") || ["mp3", "wav", "m4a"].includes(ext)) return { kind: "resource", resourceType: "recording" };
  if (mt.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext)) return { kind: "resource", resourceType: "template" };
  if (mt.startsWith("application/vnd.google-apps.")) return { kind: "skip", reason: "Google-native file type that can't be streamed (shortcut/form/site)" };
  return { kind: "skip", reason: `Unrecognised file type${ext ? ` (.${ext})` : ""}` };
}

/** "Section 04 - HTML5" → "HTML5"; "002. Web Browsing.mp4" → "Web Browsing"; "13_intro_to_css" → "Intro to css". */
export function cleanTitle(name: string, { isFolder = false } = {}): string {
  let t = isFolder ? name : name.replace(/\.[a-z0-9]{1,5}$/i, "");
  t = t.replace(/^(section|module|chapter|part|week|day|unit)\s*[-_.:]?\s*\d+\s*[-_.:)]*\s*/i, "");
  t = t.replace(/^\d+(\.\d+)*\s*[-_.:)]+\s*/, "").replace(/^\d+\s+/, "");
  t = t.replace(/[_]+/g, " ").replace(/\s{2,}/g, " ").trim();
  if (!t) t = name.replace(/\.[a-z0-9]{1,5}$/i, "").trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Natural sort: "2. x" < "10. x"; numbering anywhere in the name is respected. */
export function naturalCompare(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

/** Breadth-first scan with limits. `list` returns the direct children of a folder. */
export async function scanTree(root: { id: string; name: string }, list: (folderId: string) => Promise<DriveItem[]>, opts: { maxDepth?: number; maxItems?: number } = {}): Promise<Tree> {
  const maxDepth = opts.maxDepth ?? 4;
  const maxItems = opts.maxItems ?? 5000;
  const folders: ScannedFolder[] = [];
  const files: ScannedFile[] = [];
  const queue: ScannedFolder[] = [{ id: root.id, name: root.name, parentId: null, depth: 0, path: [] }];
  let truncated = false;
  while (queue.length) {
    const f = queue.shift()!;
    const children = await list(f.id);
    for (const c of children) {
      if (folders.length + files.length >= maxItems) { truncated = true; break; }
      if (c.mimeType === FOLDER_MIME) {
        const sf = { id: c.id, name: c.name, parentId: f.id, depth: f.depth + 1, path: [...f.path, c.name] };
        folders.push(sf);
        if (sf.depth < maxDepth) queue.push(sf);
        else truncated = true;
      } else files.push({ ...c, parentId: f.id, path: f.path });
    }
    if (truncated && folders.length + files.length >= maxItems) break;
  }
  return { root, folders, files, truncated };
}

export type PlanLesson = { driveFileId: string; driveName: string; title: string; mimeType: string; size: number | null; modifiedTime: string | null; exists: boolean };
export type PlanResource = { driveFileId: string; driveName: string; title: string; resourceType: ResourceKind; mimeType: string; size: number | null; exists: boolean };
export type PlanModule = { key: string; driveFolderId: string | null; title: string; sourceName: string; exists: boolean; lessons: PlanLesson[]; resources: PlanResource[] };
export type ImportPlan = {
  root: { id: string; name: string };
  suggestedTitle: string;
  modules: PlanModule[];
  skipped: { name: string; path: string; reason: string }[];
  totals: { modules: number; lessons: number; resources: number; skipped: number; alreadyImported: number };
  truncated: boolean;
  warnings: string[];
};

export type Existing = { moduleFolderIds: Set<string>; lessonFileIds: Set<string>; resourceFileIds: Set<string> };

/**
 * Folder → module mapping:
 *  - each direct subfolder of the root becomes a module (natural order);
 *  - videos directly in the root go to a leading "Getting started" module; root documents are course-wide resources;
 *  - files in deeper subfolders belong to their top-level module (videos → lessons, others → resources).
 * Duplicate Drive file IDs within the scan are imported once.
 */
export function buildPlan(tree: Tree, existing: Existing = { moduleFolderIds: new Set(), lessonFileIds: new Set(), resourceFileIds: new Set() }): ImportPlan {
  const top = tree.folders.filter((f) => f.parentId === tree.root.id).sort((a, b) => naturalCompare(a.name, b.name));
  const topOf = (folderId: string): string | null => {
    let f = tree.folders.find((x) => x.id === folderId);
    while (f && f.parentId !== tree.root.id) f = tree.folders.find((x) => x.id === f!.parentId);
    return f?.id ?? null;
  };
  const buckets = new Map<string, ScannedFile[]>();
  const rootKey = "__root__";
  for (const file of tree.files) {
    const key = file.parentId === tree.root.id ? rootKey : topOf(file.parentId) ?? rootKey;
    buckets.set(key, [...(buckets.get(key) ?? []), file]);
  }
  const seen = new Set<string>();
  const skipped: ImportPlan["skipped"] = [];
  const warnings: string[] = [];

  const makeModule = (key: string, folder: ScannedFolder | null): PlanModule => {
    const files = (buckets.get(key) ?? []).sort((a, b) => naturalCompare([...a.path, a.name].join("/"), [...b.path, b.name].join("/")));
    const lessons: PlanLesson[] = [];
    const resources: PlanResource[] = [];
    for (const f of files) {
      if (seen.has(f.id)) { skipped.push({ name: f.name, path: f.path.join(" / "), reason: "Same Drive file appears twice in the folder" }); continue; }
      seen.add(f.id);
      const c = classify(f);
      if (c.kind === "skip") { skipped.push({ name: f.name, path: f.path.join(" / "), reason: c.reason }); continue; }
      if (c.kind === "video") lessons.push({ driveFileId: f.id, driveName: f.name, title: cleanTitle(f.name), mimeType: f.mimeType || "video/mp4", size: f.size ?? null, modifiedTime: f.modifiedTime ?? null, exists: existing.lessonFileIds.has(f.id) });
      else resources.push({ driveFileId: f.id, driveName: f.name, title: cleanTitle(f.name), resourceType: c.resourceType, mimeType: f.mimeType, size: f.size ?? null, exists: existing.resourceFileIds.has(f.id) });
    }
    return {
      key,
      driveFolderId: folder?.id ?? (lessons.length ? tree.root.id : null), // root videos: keyed by the root folder so re-imports reuse the module
      // Root-level files: videos form a "Getting started" module; documents become course-wide resources.
      title: folder ? cleanTitle(folder.name, { isFolder: true }) : lessons.length ? "Getting started" : "Course materials",
      sourceName: folder?.name ?? tree.root.name,
      exists: existing.moduleFolderIds.has(folder?.id ?? tree.root.id),
      lessons,
      resources,
    };
  };

  const modules: PlanModule[] = [];
  if (buckets.has(rootKey)) modules.push(makeModule(rootKey, null));
  for (const f of top) modules.push(makeModule(f.id, f));
  const nonEmpty = modules.filter((m) => m.lessons.length || m.resources.length);
  top.filter((f) => !nonEmpty.some((m) => m.driveFolderId === f.id)).forEach((f) => warnings.push(`Folder “${f.name}” has no importable files.`));
  if (tree.truncated) warnings.push("The folder is very large or deeply nested; the scan stopped at the safety limit. Import in parts.");
  if (!nonEmpty.some((m) => m.lessons.length)) warnings.push("No video files were found.");

  const lessons = nonEmpty.reduce((s, m) => s + m.lessons.length, 0);
  const resources = nonEmpty.reduce((s, m) => s + m.resources.length, 0);
  const alreadyImported = nonEmpty.reduce((s, m) => s + m.lessons.filter((l) => l.exists).length + m.resources.filter((r) => r.exists).length, 0);
  return {
    root: tree.root,
    suggestedTitle: cleanTitle(tree.root.name, { isFolder: true }),
    modules: nonEmpty,
    skipped,
    totals: { modules: nonEmpty.length, lessons, resources, skipped: skipped.length, alreadyImported },
    truncated: tree.truncated,
    warnings,
  };
}
