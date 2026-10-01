/**
 * Drive → course import planning. Pure functions (no I/O) + a tree scanner that
 * takes a `list` function, so the whole planner is testable without Google.
 * Nothing here writes to the database or publishes anything.
 */
import type { DriveItem } from "./client";

export const FOLDER_MIME = "application/vnd.google-apps.folder";

export type ScannedFile = DriveItem & { parentId: string; path: string[] };
export type ScannedFolder = { id: string; name: string; parentId: string | null; depth: number; path: string[]; description?: string };
export type Tree = { root: { id: string; name: string; description?: string }; folders: ScannedFolder[]; files: ScannedFile[]; truncated: boolean };

export type ResourceKind = "pdf" | "notes" | "cheat_sheet" | "code_repository" | "dataset" | "template" | "presentation" | "recording" | "other";
export type Classified =
  | { kind: "video" }
  | { kind: "subtitle"; format: "srt" | "vtt" }
  | { kind: "resource"; resourceType: ResourceKind }
  | { kind: "skip"; reason: string };

const EXT = (name: string) => (name.includes(".") ? name.split(".").pop()!.toLowerCase() : "");
const VIDEO_EXT = ["mp4", "m4v", "mov", "webm", "mkv", "avi", "wmv", "flv", "mpg", "mpeg", "3gp", "ts"];
/** Containers most browsers can't play natively — imported, but flagged in the preview. */
const NON_WEB_VIDEO_EXT = ["mkv", "avi", "wmv", "flv", "mpg", "mpeg", "3gp", "ts"];
const SYSTEM_FILES = new Set([".ds_store", "thumbs.db", "desktop.ini", "icon\r"]);
const UNEXPORTABLE_GOOGLE: Record<string, string> = {
  "application/vnd.google-apps.form": "Google Form",
  "application/vnd.google-apps.site": "Google Site",
  "application/vnd.google-apps.map": "Google My Map",
  "application/vnd.google-apps.script": "Apps Script project",
  "application/vnd.google-apps.jam": "Jamboard",
  "application/vnd.google-apps.shortcut": "Shortcut whose target isn't shared with the service account",
};

export function classify(f: Pick<DriveItem, "name" | "mimeType" | "size">): Classified {
  const ext = EXT(f.name);
  const mt = f.mimeType || "";
  if (SYSTEM_FILES.has(f.name.toLowerCase()) || f.name.startsWith("._")) return { kind: "skip", reason: "System file (not course content)" };
  if (UNEXPORTABLE_GOOGLE[mt]) return { kind: "skip", reason: `${UNEXPORTABLE_GOOGLE[mt]} — Google can't export this type` };
  // Drive labels TypeScript sources video/mp2t, like MPEG-TS video. Real .ts recordings are large; source files are not.
  if (ext === "ts") return (f.size ?? 0) > 20_000_000 ? { kind: "video" } : { kind: "resource", resourceType: "code_repository" };
  if (mt.startsWith("video/") || VIDEO_EXT.includes(ext)) return { kind: "video" };
  if (ext === "srt" || ext === "vtt" || mt === "text/vtt" || mt === "application/x-subrip") return { kind: "subtitle", format: ext === "vtt" || mt === "text/vtt" ? "vtt" : "srt" };
  if (mt === "application/pdf" || ext === "pdf") return { kind: "resource", resourceType: "pdf" };
  if (mt === "application/vnd.google-apps.presentation" || ["ppt", "pptx", "key", "odp"].includes(ext)) return { kind: "resource", resourceType: "presentation" };
  if (mt === "application/vnd.google-apps.document" || ["doc", "docx", "txt", "md", "rtf", "odt"].includes(ext)) return { kind: "resource", resourceType: "notes" };
  if (mt === "application/vnd.google-apps.spreadsheet" || ["csv", "tsv", "xlsx", "xls", "ods", "json", "parquet", "sqlite", "db", "xml", "yaml", "yml"].includes(ext)) return { kind: "resource", resourceType: "dataset" };
  if (["zip", "rar", "7z", "tar", "gz", "tgz", "py", "ipynb", "js", "mjs", "jsx", "tsx", "html", "htm", "css", "scss", "java", "c", "h", "cpp", "cs", "go", "rs", "rb", "php", "kt", "swift", "sql", "sh", "bat", "ps1", "r", "env", "toml", "ini", "dockerfile", "gitignore"].includes(ext)) return { kind: "resource", resourceType: "code_repository" };
  if (mt.startsWith("audio/") || ["mp3", "wav", "m4a", "aac", "ogg", "flac"].includes(ext)) return { kind: "resource", resourceType: "recording" };
  if (mt === "application/vnd.google-apps.drawing" || mt.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "svg", "webp", "bmp", "fig", "psd", "ai"].includes(ext)) return { kind: "resource", resourceType: "template" };
  // Anything else is still course material: import it as a generic downloadable resource.
  return { kind: "resource", resourceType: "other" };
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

/** File name without extension, lower-cased and whitespace-normalised — used to pair videos with sidecars. */
const normBase = (s: string) => s.toLowerCase().replace(/[\s_]+/g, " ").trim();
export const baseName = (name: string) => normBase(name.replace(/\.[a-z0-9]{1,5}$/i, ""));

const LANG_LABELS: Record<string, string> = { en: "English", hi: "Hindi", ur: "Urdu", bn: "Bengali", ta: "Tamil", te: "Telugu", mr: "Marathi", gu: "Gujarati", kn: "Kannada", ml: "Malayalam", pa: "Punjabi", es: "Spanish", fr: "French", de: "German" };
const LANG_WORDS: Record<string, string> = { english: "en", hindi: "hi", hinglish: "hi", urdu: "ur", bengali: "bn", tamil: "ta", telugu: "te", marathi: "mr" };

/** "Intro.en.srt" → { base: "intro", language: "en" }; "Intro - Hindi.vtt" → { base: "intro", language: "hi" }. */
export function subtitleInfo(name: string): { base: string; language: string; label: string } {
  let b = name.replace(/\.(srt|vtt)$/i, "");
  let language = "en";
  const code = b.match(/[._-]([a-z]{2,3}(?:-[A-Za-z0-9]{2,8})?)$/);
  const word = b.match(/[\s._-]+\(?(english|hindi|hinglish|urdu|bengali|tamil|telugu|marathi)\)?$/i);
  if (word) { language = LANG_WORDS[word[1].toLowerCase()]; b = b.slice(0, word.index); }
  else if (code && (LANG_LABELS[code[1].split("-")[0].toLowerCase()] || code[1].includes("-"))) { language = code[1]; b = b.slice(0, code.index); }
  const primary = language.split("-")[0].toLowerCase();
  // "Intro.mp4.srt" → "intro" (only a real video extension is stripped, so "Lesson 1.2" stays intact)
  b = b.replace(new RegExp(`\\.(${VIDEO_EXT.join("|")})$`, "i"), "");
  return { base: normBase(b), language, label: LANG_LABELS[primary] ?? language.toUpperCase() };
}

/** Breadth-first scan with limits. `list` returns the direct children of a folder. Folder shortcuts are followed once (cycle-safe). */
export async function scanTree(root: { id: string; name: string; description?: string }, list: (folderId: string) => Promise<DriveItem[]>, opts: { maxDepth?: number; maxItems?: number } = {}): Promise<Tree> {
  const maxDepth = opts.maxDepth ?? 10;
  const maxItems = opts.maxItems ?? 20000;
  const folders: ScannedFolder[] = [];
  const files: ScannedFile[] = [];
  const visited = new Set<string>([root.id]);
  const queue: ScannedFolder[] = [{ id: root.id, name: root.name, parentId: null, depth: 0, path: [] }];
  let truncated = false;
  while (queue.length && !truncated) {
    const f = queue.shift()!;
    const children = await list(f.id);
    for (const c of children) {
      if (folders.length + files.length >= maxItems) { truncated = true; break; }
      if (c.mimeType === FOLDER_MIME) {
        if (visited.has(c.id)) continue; // the same folder reached twice (shortcut loop or duplicate shortcut)
        visited.add(c.id);
        const sf: ScannedFolder = { id: c.id, name: c.name, parentId: f.id, depth: f.depth + 1, path: [...f.path, c.name], description: c.description };
        folders.push(sf);
        if (sf.depth < maxDepth) queue.push(sf);
        else truncated = true;
      } else files.push({ ...c, parentId: f.id, path: f.path });
    }
  }
  return { root, folders, files, truncated };
}

export type PlanCaption = { driveFileId: string; driveName: string; format: "srt" | "vtt"; language: string; label: string };
export type PlanLesson = {
  driveFileId: string; driveName: string; title: string; mimeType: string; size: number | null; modifiedTime: string | null; exists: boolean;
  description: string | null; descriptionFileId: string | null; captions: PlanCaption[];
};
/** lessonDriveFileId: set when the file sits in a "<lesson> resources" folder next to that lesson's video. */
export type PlanResource = { driveFileId: string; driveName: string; title: string; resourceType: ResourceKind; mimeType: string; size: number | null; exists: boolean; description: string | null; lessonDriveFileId: string | null };
export type PlanModule = { key: string; driveFolderId: string | null; title: string; sourceName: string; exists: boolean; lessons: PlanLesson[]; resources: PlanResource[]; description: string | null; descriptionFileId: string | null };
export type ImportPlan = {
  root: { id: string; name: string };
  suggestedTitle: string;
  courseDescription: string | null;
  courseDescriptionFileId: string | null;
  modules: PlanModule[];
  skipped: { name: string; path: string; reason: string }[];
  totals: { modules: number; lessons: number; resources: number; captions: number; descriptions: number; skipped: number; alreadyImported: number };
  truncated: boolean;
  warnings: string[];
};

/** moduleTitles: normalised titles of existing modules not yet linked to a Drive folder (matched by name). */
export type Existing = { moduleFolderIds: Set<string>; lessonFileIds: Set<string>; resourceFileIds: Set<string>; moduleTitles?: Set<string> };

export const normTitle = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Folder-level description files: "description.txt", "README.md", "about.txt", "overview.md". */
const isFolderDescriptionFile = (name: string) => /^(description|readme|about|overview|course[ _-]?description)\.(txt|md)$/i.test(name.trim());
const isTextSidecar = (name: string) => /\.(txt|md)$/i.test(name);

/**
 * Folder → module mapping:
 *  - each direct subfolder of the root becomes a module (natural order);
 *  - videos directly in the root go to a leading "Getting started" module; root documents are course-wide resources;
 *  - files in deeper subfolders belong to their top-level module (videos → lessons, others → resources);
 *  - subtitles (.srt/.vtt) attach to the video with the same base name in the same folder;
 *  - a .txt/.md with the same base name as a video becomes that lesson's description;
 *  - description.txt / README.md in the root or a module folder describes the course / module.
 * Duplicate Drive file IDs within the scan are imported once.
 */
export function buildPlan(tree: Tree, existing: Existing = { moduleFolderIds: new Set(), lessonFileIds: new Set(), resourceFileIds: new Set() }): ImportPlan {
  const top = tree.folders.filter((f) => f.parentId === tree.root.id).sort((a, b) => naturalCompare(a.name, b.name));
  const byId = new Map(tree.folders.map((f) => [f.id, f]));
  const topOf = (folderId: string): string | null => {
    let f = byId.get(folderId);
    while (f && f.parentId !== tree.root.id) f = f.parentId ? byId.get(f.parentId) : undefined;
    return f?.id ?? null;
  };
  const skipped: ImportPlan["skipped"] = [];
  const warnings: string[] = [];

  // De-duplicate first so a file reachable twice (e.g. via a shortcut) is planned once.
  const seen = new Set<string>();
  const unique: ScannedFile[] = [];
  for (const f of tree.files) {
    if (seen.has(f.id)) { skipped.push({ name: f.name, path: f.path.join(" / "), reason: "Same Drive file appears twice in the folder (imported once)" }); continue; }
    seen.add(f.id);
    unique.push(f);
  }

  // Pair sidecars with videos in the same folder.
  const videoKey = (parentId: string, base: string) => `${parentId}\u0000${base}`;
  const videoIdByKey = new Map(unique.filter((f) => classify(f).kind === "video").map((f) => [videoKey(f.parentId, baseName(f.name)), f.id]));
  const videosByKey = new Set(videoIdByKey.keys());
  // "01 - Intro resources" / "01 - Intro - Resources" / "Resources - 01 - Intro" next to "01 - Intro.mp4" → that lesson's material.
  const lessonOfFolder = new Map<string, string>();
  for (const f of tree.folders) {
    if (!f.parentId) continue;
    const base = normBase(f.name.replace(/^\s*resources?\s*[-_:–]\s*/i, "").replace(/\s*[-_:–(]?\s*(resources?|materials?|files|assets)\)?\s*$/i, ""));
    const vid = videoIdByKey.get(videoKey(f.parentId, base));
    if (vid && base !== normBase(f.name)) lessonOfFolder.set(f.id, vid);
  }
  const lessonFor = (folderId: string): string | null => {
    for (let f = byId.get(folderId); f; f = f.parentId ? byId.get(f.parentId) : undefined) {
      const v = lessonOfFolder.get(f.id);
      if (v) return v;
    }
    return null;
  };
  const captionsFor = new Map<string, PlanCaption[]>();
  const descFileFor = new Map<string, string>();
  const consumed = new Set<string>();
  let courseDescriptionFileId: string | null = null;
  const moduleDescFile = new Map<string, string>();
  for (const f of unique) {
    const c = classify(f);
    if (c.kind === "subtitle") {
      const info = subtitleInfo(f.name);
      const k = videoKey(f.parentId, info.base);
      if (videosByKey.has(k)) {
        captionsFor.set(k, [...(captionsFor.get(k) ?? []), { driveFileId: f.id, driveName: f.name, format: c.format, language: info.language, label: info.label }]);
        consumed.add(f.id);
      }
    } else if (isTextSidecar(f.name)) {
      const k = videoKey(f.parentId, baseName(f.name));
      if (videosByKey.has(k) && !descFileFor.has(k)) { descFileFor.set(k, f.id); consumed.add(f.id); }
      else if (isFolderDescriptionFile(f.name)) {
        if (f.parentId === tree.root.id && !courseDescriptionFileId) { courseDescriptionFileId = f.id; consumed.add(f.id); }
        else if (top.some((t) => t.id === f.parentId) && !moduleDescFile.has(f.parentId)) { moduleDescFile.set(f.parentId, f.id); consumed.add(f.id); }
      }
    }
  }

  const buckets = new Map<string, ScannedFile[]>();
  const rootKey = "__root__";
  for (const file of unique) {
    if (consumed.has(file.id)) continue;
    const key = file.parentId === tree.root.id ? rootKey : topOf(file.parentId) ?? rootKey;
    buckets.set(key, [...(buckets.get(key) ?? []), file]);
  }

  const nonWebVideos: string[] = [];
  const makeModule = (key: string, folder: ScannedFolder | null): PlanModule => {
    const files = (buckets.get(key) ?? []).sort((a, b) => naturalCompare([...a.path, a.name].join("/"), [...b.path, b.name].join("/")));
    const lessons: PlanLesson[] = [];
    const resources: PlanResource[] = [];
    for (const f of files) {
      const c = classify(f);
      if (c.kind === "skip") { skipped.push({ name: f.name, path: f.path.join(" / "), reason: c.reason }); continue; }
      if (c.kind === "video") {
        const k = videoKey(f.parentId, baseName(f.name));
        if (NON_WEB_VIDEO_EXT.includes(EXT(f.name))) nonWebVideos.push(f.name);
        lessons.push({
          driveFileId: f.id, driveName: f.name, title: cleanTitle(f.name), mimeType: f.mimeType?.startsWith("video/") ? f.mimeType : "video/mp4",
          size: f.size ?? null, modifiedTime: f.modifiedTime ?? null, exists: existing.lessonFileIds.has(f.id),
          description: f.description?.trim() || null, descriptionFileId: descFileFor.get(k) ?? null, captions: captionsFor.get(k) ?? [],
        });
      } else {
        // Unmatched subtitles are still kept, as downloadable resources.
        const resourceType: ResourceKind = c.kind === "subtitle" ? "other" : c.resourceType;
        resources.push({ driveFileId: f.id, driveName: f.name, title: cleanTitle(f.name), resourceType, mimeType: f.mimeType, size: f.size ?? null, exists: existing.resourceFileIds.has(f.id), description: f.description?.trim() || null, lessonDriveFileId: lessonFor(f.parentId) });
      }
    }
    return {
      key,
      driveFolderId: folder?.id ?? (lessons.length ? tree.root.id : null), // root videos: keyed by the root folder so re-imports reuse the module
      // Root-level files: videos form a "Getting started" module; documents become course-wide resources.
      title: folder ? cleanTitle(folder.name, { isFolder: true }) : lessons.length ? "Getting started" : "Course materials",
      sourceName: folder?.name ?? tree.root.name,
      exists: existing.moduleFolderIds.has(folder?.id ?? tree.root.id) || (!!folder && !!existing.moduleTitles?.has(normTitle(cleanTitle(folder.name, { isFolder: true })))),
      lessons,
      resources,
      description: folder?.description?.trim() || null,
      descriptionFileId: folder ? moduleDescFile.get(folder.id) ?? null : null,
    };
  };

  const modules: PlanModule[] = [];
  if (buckets.has(rootKey)) modules.push(makeModule(rootKey, null));
  for (const f of top) modules.push(makeModule(f.id, f));
  const nonEmpty = modules.filter((m) => m.lessons.length || m.resources.length);
  top.filter((f) => !nonEmpty.some((m) => m.driveFolderId === f.id)).forEach((f) => warnings.push(`Folder “${f.name}” has no importable files.`));
  if (tree.truncated) warnings.push("The folder is very large or deeply nested; the scan stopped at the safety limit. Import in parts.");
  if (!nonEmpty.some((m) => m.lessons.length)) warnings.push("No video files were found.");
  if (nonWebVideos.length) warnings.push(`${nonWebVideos.length} video(s) are in a format most browsers can't play (${[...new Set(nonWebVideos.map(EXT))].join(", ")}). They are imported, but convert them to MP4 (H.264) for playback.`);

  const allLessons = nonEmpty.flatMap((m) => m.lessons);
  const lessons = allLessons.length;
  const resources = nonEmpty.reduce((s, m) => s + m.resources.length, 0);
  const captions = allLessons.reduce((s, l) => s + l.captions.length, 0);
  const descriptions = allLessons.filter((l) => l.description || l.descriptionFileId).length + nonEmpty.filter((m) => m.description || m.descriptionFileId).length + (tree.root.description || courseDescriptionFileId ? 1 : 0);
  const alreadyImported = nonEmpty.reduce((s, m) => s + m.lessons.filter((l) => l.exists).length + m.resources.filter((r) => r.exists).length, 0);
  return {
    root: { id: tree.root.id, name: tree.root.name },
    suggestedTitle: cleanTitle(tree.root.name, { isFolder: true }),
    courseDescription: tree.root.description?.trim() || null,
    courseDescriptionFileId,
    modules: nonEmpty,
    skipped,
    totals: { modules: nonEmpty.length, lessons, resources, captions, descriptions, skipped: skipped.length, alreadyImported },
    truncated: tree.truncated,
    warnings,
  };
}
