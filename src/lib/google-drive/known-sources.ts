/**
 * Drive folders supplied by the course owner (see docs/COURSE_CONTENT_MANIFEST.md).
 * Status is informational; the importer always re-checks access live.
 */
export const KNOWN_DRIVE_SOURCES = [
  { label: "Data Science with Python & AI", folderId: "1vdaCFv3aj37sOtrCL7simto0RDZWejQN", courseSlug: "data-science-python-with-ai", note: "SOURCE INACCESSIBLE — returned HTTP 404 in the last audit. Share the folder with the service account or provide a new link." },
  { label: "Full Stack Web Development with AI & ML", folderId: "1XKNUqk6KBISRDJH0SfaMoYFPYEw90m74", courseSlug: "full-stack-web-development-with-ai-ml", note: "21 sections · 224 videos · 76 assets. Source item 003 is missing in Drive and is intentionally skipped." },
  { label: "Generative AI, LLMs, Agents & MCP", folderId: "1Og-73g3BdogcD7Q921_Ii3oYd-Z-dkwt", courseSlug: "generative-ai-llms-agents-mcp", note: "8 sections · 46 videos · 46 subtitles · outline + resource folder." },
] as const;
