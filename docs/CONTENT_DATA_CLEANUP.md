# Content Data Quality & Cleanup Plan

This document details the legacy data-quality issue identified in the course catalog and the safe migration path to clean it up without data loss or breaking student progress.

---

## 1. Issue Summary: Legacy Assets Stored as Lessons

During the initial import from Lovable/legacy sources, non-video assets (76 code files, HTML snippets, style sheets, and configuration archives) for the **Full Stack Web Development with AI & ML Integration** course (`slug: full-stack-web-development-with-ai-ml`) were imported into the `lessons` table instead of being attached as downloadable resources.

### Quantitative Impact
- **Total rows in `lessons` for Full Stack course:** 300
- **Actual video lessons with Drive streaming IDs:** 224
- **Legacy code and asset rows:** 76
- **Result:** Artificially inflated lesson count (reported as 300 instead of 224 video lessons).

---

## 2. Why Automatic Deletion is Unsafe

Automatic batch deletion (`DELETE FROM lessons WHERE ...`) in a production database is **strictly prohibited** for the following reasons:

1. **Foreign Key Integrity:** Tables such as `lesson_progress`, `lesson_notes`, and `video_progress` reference `lessons.id` via foreign keys. Automatic cascade deletion would erase learner completion records.
2. **Sequential Navigation Gaps:** The learning portal sequences lessons using `order_index`. Hard-deleting rows could cause missing links or broken 'Next Lesson' transitions if indices are not sequentially re-compacted.
3. **Loss of Content References:** Several of these 76 files contain reference implementations or starter boilerplates that students need. Removing them without migrating them would permanently lose these materials.
4. **Active Student Sessions:** Any active session or bookmark pointing to `/learn/full-stack-web-development-with-ai-ml/lesson/[lessonId]` would immediately 404.

---

## 3. Recommended Migration Path: Mapping to `course_resources`

Instead of deletion, the 76 records should be transitioned into the dedicated `course_resources` table introduced in Phase 2/3.

### Target Schema: `course_resources`
- `course_id`: `dde6789d-2ec0-4593-b1b2-0ce7fc8d8120`
- `module_id`: Parent module of the respective lesson
- `lesson_id`: Preceding or associated video lesson
- `title`: Extracted title / filename of the asset
- `resource_type`: `'code'` or `'file'`
- `url` or `drive_file_id`: Pointer to the source file

### Safe Phased Execution Steps
1. **Audit & Extraction:** Run an automated script to export all 76 text/code lesson records with their metadata, content, and parent module mappings.
2. **Insert into `course_resources`:** Populate corresponding rows in `course_resources`.
3. **Mark or Soft-Archive Lessons:** Add an `is_published = false` or `is_resource = true` flag to these 76 records so they are excluded from the lesson player playlist while preserving FK constraints.
4. **Re-index Lesson Sequence:** Recalculate `order_index` for the remaining 224 video lessons in `course_modules` to ensure gap-free navigation.
5. **Verify Learner Progress:** Run reconciliation queries on `lesson_progress` to ensure course completion percentages reflect only required video/assessment lessons.
