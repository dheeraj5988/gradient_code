# Course Content Inventory & Reconciliation Manifest

This document records the exact inventory of the source material from Google Drive, reconciles it against the Supabase database schema, and identifies content discrepancies, missing files, and migration paths.

---

## 1. Summary of Google Drive Course Folders

| Course | Drive Folder Title | Drive Folder ID | Status | Modules / Sections | Total Videos | Total Assets |
|---|---|---|---|---|---|---|
| **Course 1:** Data Science with Python & AI | N/A | `1vdaCFv3aj37sOtrCL7simto0RDZWejQN` | ❌ **MISSING / INACCESSIBLE** (HTTP 404) | 0 | 0 | 0 |
| **Course 2:** Full Stack Web Development with AI & ML | Full Stack Web Developer with AI & ML Integration | `1XKNUqk6KBISRDJH0SfaMoYFPYEw90m74` | ✅ **VERIFIED** | 21 | 224 | 300 |
| **Course 3:** Generative AI, LLMs, Agents & MCP | AI fundamentals for Beginners - Learn LLM, Agentic AI, MCP | `1Og-73g3BdogcD7Q921_Ii3oYd-Z-dkwt` | ✅ **VERIFIED** | 8 | 46 | 93 |

---

## 2. Course-by-Course Technical Inventory

### 2.1 Course 1: Data Science with Python & AI
- **Provided Source URL:** `https://drive.google.com/drive/folders/1vdaCFv3aj37sOtrCL7simto0RDZWejQN`
- **Audit Result:** `MISSING / INACCESSIBLE`
- **Technical Details:** Google Drive HTTP request returns `HTTP/2 404 Not Found`. The folder ID does not exist or has not been shared with appropriate permissions.
- **Candidate Metadata (from Platform Spec):**
  - **Slug:** `data-science-python-with-ai`
  - **Track:** Data Science & AI
  - **Level:** Beginner
  - **Price / MRP:** ₹5,999 / ₹11,999
  - **Target Audience:** Aspiring data scientists, Python beginners, analysts.
  - **Key Skills:** Python, NumPy, Pandas, Matplotlib, Scikit-learn, Machine Learning, Parkinson's Detection Capstone.
- **Action Required:** Course owner must provide an updated active Google Drive folder ID or share permission to `drive-streamer@gradient-code.iam.gserviceaccount.com`.

---

### 2.2 Course 2: Full Stack Web Development with AI & ML
- **Provided Source URL:** `https://drive.google.com/drive/folders/1XKNUqk6KBISRDJH0SfaMoYFPYEw90m74`
- **Root Folder ID:** `1XKNUqk6KBISRDJH0SfaMoYFPYEw90m74`
- **Root Folder Name:** `Full Stack Web Developer with AI & ML Integration`
- **Total Sections/Modules:** 21
- **Total Video Files:** 224 (.mp4)
- **Total Associated Resources / Subfolders:** 76 (Zip files, HTML/CSS project assets, code templates)
- **Missing File Audit:**
  - ⚠️ **Item 003 Missing:** Section 01 ends with `002. Web Browsing.mp4` (`1x2oEhhg38SVLTNevSWWsn9M6n7a1Bb5j`) and Section 02 begins with `004. www vs Internet and CSS HTML and Java.mp4` (`1Qhn45pKEtnO3nVsghxumfTU9jRPGtUc2`).
  - **Status:** `SKIPPED — SOURCE FILE MISSING` (Item `003` was omitted from source Drive).
  - Subsequent section numbers continue sequentially with occasional index gaps in internal naming (e.g. Section 06 skips 25-27, Section 15 jumps 134 to 136), but the internal files within each module are logically contiguous.

#### Section Breakdown:
| Module Index | Section Title | Folder ID | Video Count | Resources / Folders |
|---|---|---|---|---|
| 01 | Section 01 - Introduction | `1MNQmDUgXP2zFeZyEvULayqR23BGKVSRR` | 2 | 0 |
| 02 | Section 02 - History of Web | `1fdOtgVQtwHxX9dbfbvADv5eUrne10S3j` | 2 | 0 |
| 03 | Section 03 - How Internet works | `1tzXUEnw0S6ZJgZpoFr9g8cfCLFzYfVda` | 4 | 0 |
| 04 | Section 04 - HTML5 | `14JXEKaQv1NN17I_I6nDdtG7Nby-QSFsf` | 8 | 0 |
| 05 | Section 05 - Advanced HTML5 | `1rhtRtkynDYhdy7B-FK_WNpPdgJR-kp_z` | 6 | 0 |
| 06 | Section 06 - CSS | `1Qnx1WINtmu-sO_6NJKicKW_PucmfiVky` | 8 | 3 |
| 07 | Section 07 - Advanced CSS | `1hMVoowOt4S2kh-4FPnoGF8USxq4c0z0I` | 5 | 1 |
| 08 | Section 08 - Bootstrap 4 The FRONT End Master | `1C_9020TE5JhaFXAxhafoDH9RiRUpkkY4` | 3 | 1 |
| 09 | Section 09 - How to Built Startup Landing Page | `1kaX9gSPJldYjFjZ4f44eFowDLw9xglGv` | 10 | 2 |
| 10 | Section 10 - CSS GRID and CSS Layout | `1D6Uo0gPpMTcjrtIFZPVRYiBIatmurOoj` | 12 | 3 |
| 11 | Section 11 - JavaScript | `1UKGrGe0kPwejB7YU8dKCr5kBAX9re0u2` | 16 | 7 |
| 12 | Section 12 - Document Object Models | `1_tDyyq1wvZbz88U6hRrQDJWCPOMU7NYB` | 7 | 4 |
| 13 | Section 13 - Advanced JavaScripts | `1ibA8fME3lbroNk0zTn4EIJJ17IQvMj3L` | 17 | 8 |
| 14 | Section 14 - Developer Life Line | `1FzgP5Wveup__2brQkv4N7VXbwISnB7Cq` | 7 | 0 |
| 15 | Section 15 - Python The Most Powerful Language | `1gH3ZZei5uZHKHyB8HnG0mJ0SZAnsgHPg` | 28 | 22 |
| 16 | Section 16 - Django Basic Level | `17xT2UJ1qhb5i4mFTDeVN25nmmXHUGWJC` | 12 | 0 |
| 17 | Section 17 - Fundamentals of Data Science | `1rBFpGuYDznwUs4tFwyPyehBGXGMnuVaz` | 14 | 7 |
| 18 | Section 18 - Machine Learning | `1EwTUc1ldGoVBg8ZxEkJdebiHNrxqnoYS` | 14 | 2 |
| 19 | Section 19 - Django Part_2 | `1NFQub7pHEULRLcw5C9Lg0s4ZMfTiuNaS` | 17 | 5 |
| 20 | Section 20 - Deep Learning Neural Nets | `1e8pkqnOzEXFr47ALxVJ6nFU9DF0Z2N6h` | 16 | 4 |
| 21 | Section 21 - Convolution Neural Networks(CNN) | `1NY7jM9b5gVwVYK9mL5mW3nro2I0CaVGH` | 16 | 7 |

---

### 2.3 Course 3: Generative AI, LLMs, Agents & MCP — Practical Foundations
- **Provided Source URL:** `https://drive.google.com/drive/folders/1Og-73g3BdogcD7Q921_Ii3oYd-Z-dkwt`
- **Root Folder ID:** `1Og-73g3BdogcD7Q921_Ii3oYd-Z-dkwt`
- **Root Folder Name:** `AI fundamentals for Beginners - Learn LLM, Agentic AI, MCP`
- **Total Sections/Modules:** 8
- **Total Video Files:** 46 (.mp4)
- **Total Subtitle Files:** 46 (.en.vtt matching 1-to-1 with videos)
- **Total Text Outlines:** 1 (`course_outline.txt` ID `1ZL7XM1pSyvGPq0Y1Wh3NljabXj9IQayV`)
- **Missing File Audit:**
  - ✅ **0 Missing Files.** The numbering runs sequentially from Lesson 01 (`01 - Jumping right into...`) through Lesson 46 (`46 - Wrap-up.mp4`).

#### Section Breakdown:
| Module Index | Section Title | Folder ID | Lessons Range | Video Count |
|---|---|---|---|---|
| 01 | 01 - Getting first hand taste of Generative Ai on your local Machine | `1Py8JW4PU6rWTCoxgBWmA4eygupkwMdBq` | 01 – 07 | 7 |
| 02 | 02 - Fundamentals of Generative AI & LLMs | `1C5UrljIgTlqUFWf52T0DNHbblpEQrP21` | 08 – 12 | 5 |
| 03 | 03 - Art of Prompt Engineering_ Understanding And Crafting good Prompts | `1YTNuKSaDGS9NpLcbX-qgDqJdXElcb7A0` | 13 – 20 | 8 |
| 04 | 04 - Agentic AI Fundamentals and Development | `1l_kYYFJF8r3P4PqCPQvfvAk8P6OErdE7` | 21 – 27 | 7 |
| 05 | 05 - Understanding and Implementing Agentic RAG | `1saB7UiAqm6GSqgObbT2PhT6zDXFRzVGK` | 28 – 32 | 5 |
| 06 | 06 - Fundamentals of Model Context Protocol (MCP) and Use | `11KcHfI3j7rMKeZuDaeRH9FXLG2dXHY3O` | 33 – 36 | 4 |
| 07 | 07 - Claude AI Assistant | `18gojJlmmIsVob5E0_E8kfj-oIMkKG6vr` | 37 – 45 | 9 |
| 08 | 08 - Conclusion | `1EJ1kWge8yS5LOkd5luKvmz6z60f299Qb` | 46 | 1 |

---

## 3. Database Reconciliation Matrix

### 3.1 Course Entity Comparison
| Course Identifier | Drive Status | Supabase Status | Classification | Action |
|---|---|---|---|---|
| `full-stack-web-development-with-ai-ml` | ✅ 21 Sections, 224 Videos | ✅ Table record present | **Production Real Course** | Reconcile & link Drive File IDs |
| `generative-ai-llms-agents-mcp` | ✅ 8 Sections, 46 Videos | ✅ Candidate record | **Production Real Course** | Insert modules & lessons from manifest |
| `data-science-python-with-ai` | ❌ Folder 404 | ✅ Table record present | **Production Real Course** | Awaiting new Drive folder link |
| `react-nextjs-crash-course` | ❌ None | ⚠️ Demo mock only | **DEMO ONLY** | **DO NOT PUBLISH** |
| `docker-devops-essentials` | ❌ None | ⚠️ Demo mock only | **DEMO ONLY** | **DO NOT PUBLISH** |

### 3.2 Suggested Lesson Ingestion Strategy
1. **Module Hierarchy:**
   - Map each Drive subfolder directly to a row in `course_modules` with sequential `order_index`.
2. **Lesson Records:**
   - Map each `.mp4` file to `lessons` table with `type = 'video'`.
   - Store Drive File ID in `drive_file_id`.
   - Set `video_provider = 'drive'`.
   - Set `video_url = '/api/video/' || id` (the authorized streaming endpoint).
   - If `.en.vtt` exists, upload/link for closed captioning.
3. **Free Previews:**
   - Flag Lesson 01 (`is_free_preview = true`) for public visitor preview.
