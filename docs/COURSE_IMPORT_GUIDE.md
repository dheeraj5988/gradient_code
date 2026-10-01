# Course import from Google Drive

## Before you start
Google Drive credentials must be configured (see `docs/GOOGLE_DRIVE_SETUP.md`) and the course folder must be **shared with the service-account email as Viewer**. Admin → Settings shows the configuration status. Without credentials the importer shows **BLOCKED**.

## Expected folder layout
```
Course folder/
  Course outline.pdf            → course-wide resource
  Section 01 - Introduction/    → module "Introduction"
    001. Welcome.mp4            → lesson "Welcome"
    002. Web Browsing.mp4       → lesson "Web Browsing"
  Section 10 - CSS Grid/
    9. Flexbox recap.mp4        → lessons are ordered naturally (9 before 10)
    10. CSS Grid basics.mp4
    Code/grid-project.zip       → resource (code) in that module
    cheat sheet.pdf             → resource (pdf)
```
- Each **direct subfolder** of the course folder becomes a **module**; deeper folders belong to their top-level module.
- **Videos** → lessons (`video_provider = drive`, Drive file ID stored).
- **PDF / slides / docs / datasets / code / archives / images** → resources.
- **Subtitles (.srt/.vtt)**, shortcuts and unknown types are **skipped** and listed with a reason.
- Titles are cleaned: numbering prefixes (`001.`, `Section 04 -`), extensions and underscores are removed. Edit titles afterwards in the curriculum.

## Steps
1. **Admin → Import from Drive.** Paste the folder URL/ID (or click a known course folder) and choose *A new draft course* or an existing course.
2. **Scan folder** — nothing is written. Review modules, videos, resources, already-imported and skipped counts.
3. Untick any module or file you don't want.
4. **Import as draft.** Confirm.
5. Open the curriculum: fix titles/durations, mark one lesson as *Free preview*, publish lessons, then publish the course.

## Safety guarantees
- Never publishes anything (courses are drafts, lessons/resources unpublished).
- Never deletes or overwrites existing lessons.
- **Idempotent:** Drive file IDs are the stable key. Re-importing the same folder into the same course only adds new files; importing the same folder as a *new* course is refused.
- The import re-scans Drive on the server; it never trusts file lists from the browser.
- No credentials, tokens or private Drive URLs are stored in the database or sent to learners.

## Known course sources
| Course | Folder ID | Status |
|---|---|---|
| Data Science with Python & AI | `1vdaCFv3aj37sOtrCL7simto0RDZWejQN` | **SOURCE INACCESSIBLE** (HTTP 404 in the last audit). The course already has 31 Drive lessons from the old import; don't re-import until the folder is shared again. |
| Full Stack Web Development with AI & ML | `1XKNUqk6KBISRDJH0SfaMoYFPYEw90m74` | 21 sections · 224 videos · 76 assets. Item 003 is missing in Drive and stays skipped. Already present in the database — import **into the existing course** to link any new files. |
| Generative AI, LLMs, Agents & MCP | `1Og-73g3BdogcD7Q921_Ii3oYd-Z-dkwt` | 8 sections · 46 videos · 46 subtitles (skipped for now). Already present in the database. |

Existing lessons created by the old Lovable import already have their Drive IDs backfilled by the Phase 3 migration, so when you import a folder **into its existing course**:
- videos that are already lessons are recognised by Drive file ID and skipped (whatever module they are in);
- legacy modules without a Drive link are **matched by title** (e.g. folder "Section 04 - HTML5" ↔ module "HTML5") and linked to their folder; unmatched folders become new draft modules;
- files not yet in the course (e.g. the Full Stack course's code assets, which Lovable stored as text lessons) are added as **unpublished resources**. Review the preview carefully; you can untick anything.

## What gets imported (2026-10-01)
Everything in the folder tree (up to 10 levels, 20,000 items) is imported as **unpublished drafts**. Nothing is silently dropped — the preview lists every skipped file with a reason.

| In Drive | Becomes |
|---|---|
| Subfolder of the course folder | Module (natural order: `2` before `10`) |
| Video (`mp4`, `webm`, `mov`, `m4v`; `mkv/avi/…` imported with a "convert to MP4" warning) | Video lesson, streamed privately via `/api/video/[lessonId]` |
| `Intro.srt`, `Intro.en.vtt`, `Intro - Hindi.srt` next to `Intro.mp4` | Subtitle track(s) for that lesson (SRT converted to WebVTT on the fly) |
| `Intro.txt` / `Intro.md` next to `Intro.mp4` | That lesson's description |
| `description.txt` / `README.md` in the course folder or a module folder | Course / module description |
| Drive "Description" field of a file or folder | Description (a sidecar file wins) |
| PDF, docs, slides, sheets, code, archives, images, audio, any other file | Downloadable resource (Google Docs/Slides export as PDF, Sheets as XLSX) |
| Shortcuts | Resolved to their target (the target must be shared with the service account) |
| Skipped | `.DS_Store`/`Thumbs.db`, Google Forms/Sites/Maps/Apps Script, exact duplicates |

Re-importing never overwrites: it adds new files, missing subtitles, and descriptions only where they are empty. If one module fails, the rest still import and the summary lists the failure — run the import again to retry.
Subtitles need the Drive service account to be configured (native player). Requires migration `20261001100000_drive_import_captions.sql`.
