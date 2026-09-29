# Fresh Supabase Database Bootstrap Guide

This guide walks you through bootstrapping a brand-new, empty Supabase project with the complete Gradient Code production schema in a single execution.

---

## Prerequisites

- **Supabase Project:** Created and accessible on [Supabase Dashboard](https://supabase.com/dashboard)
- **Database Status:** Clean, empty database (no prior migrations applied)
- **Target Schema File:** [`supabase/master_schema.sql`](file:///Users/dheerajsmac/Documents/antigravity/gradientcode/supabase/master_schema.sql)

---

## Step 1: Open Supabase SQL Editor

1. Open your browser and navigate to the [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project (e.g., `czejfthqrnwjfflbqfqm`).
3. In the left navigation menu, click **SQL Editor** (icon with `>_`).
4. Click **+ New Query** to open a blank query tab.

Direct link:
```text
https://supabase.com/dashboard/project/czejfthqrnwjfflbqfqm/sql/new
```

---

## Step 2: Paste master_schema.sql

1. Open the file [`supabase/master_schema.sql`](file:///Users/dheerajsmac/Documents/antigravity/gradientcode/supabase/master_schema.sql) in your editor or terminal.
2. Copy the entire contents of the file.
3. Paste the contents into the blank query tab in the Supabase SQL Editor.

---

## Step 3: Run

1. Click the green **Run** button at the bottom right of the SQL editor (or press `Cmd + Enter` on macOS / `Ctrl + Enter` on Windows/Linux).
2. Wait for execution to finish.
3. You should see:
   ```text
   Success. No rows returned.
   ```
   *(or execution completed in a few seconds)*

---

## Step 4: Verify Tables, Policies & Curriculum

Run the following verification queries in the SQL Editor to confirm the bootstrap succeeded.

### Verification Query 1: Verify Table Count (Expected: 37 tables)

```sql
SELECT count(*) AS total_tables
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE';
```

**Expected Result:**
```text
total_tables
37
```

---

### Verification Query 2: List All 37 Tables with RLS Status

```sql
SELECT 
  t.tablename, 
  t.rowsecurity AS rls_enabled,
  count(p.policyname) AS policy_count
FROM pg_tables t
LEFT JOIN pg_policies p 
  ON p.schemaname = t.schemaname 
 AND p.tablename = t.tablename
WHERE t.schemaname = 'public'
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.tablename;
```

**Expected Result:**
All 37 tables should have `rls_enabled = true`. The list of tables:
1. `activity_log` (2 policies)
2. `assignment_submissions` (3 policies)
3. `assignments` (2 policies)
4. `bootcamps` (2 policies)
5. `certificates` (3 policies)
6. `contact_submissions` (3 policies)
7. `coupons` (1 policy)
8. `course_modules` (3 policies)
9. `course_resources` (2 policies)
10. `course_reviews` (4 policies)
11. `course_topics` (2 policies)
12. `courses` (3 policies)
13. `ebooks` (2 policies)
14. `employee_permissions` (1 policy)
15. `enrollments` (4 policies)
16. `forum_answers` (4 policies)
17. `forum_questions` (4 policies)
18. `instructors` (2 policies)
19. `internship_applications` (3 policies)
20. `internships` (2 policies)
21. `job_openings` (3 policies)
22. `learner_notes` (1 policy)
23. `learning_plans` (1 policy)
24. `lesson_notes` (1 policy)
25. `lesson_progress` (3 policies)
26. `lessons` (2 policies)
27. `messages` (3 policies)
28. `orders` (2 policies)
29. `practice_answer_keys` (1 policy)
30. `practice_questions` (2 policies)
31. `profiles` (3 policies)
32. `question_attempts` (1 policy)
33. `question_reviews` (1 policy)
34. `saved_questions` (3 policies)
35. `user_roles` (2 policies)
36. `video_progress` (1 policy)
37. `wishlist` (1 policy)

---

### Verification Query 3: Total Security Policies (Expected: 83 policies)

```sql
SELECT count(*) AS total_policies
FROM pg_policies
WHERE schemaname = 'public';
```

**Expected Result:**
```text
total_policies
83
```

---

### Verification Query 4: Core Production Courses & Lessons

```sql
SELECT 
  c.slug, 
  c.title, 
  c.price,
  c.is_published, 
  count(DISTINCT m.id) AS module_count, 
  count(l.id) AS lesson_count
FROM public.courses c
LEFT JOIN public.course_modules m ON m.course_id = c.id
LEFT JOIN public.lessons l ON l.module_id = m.id
WHERE c.slug IN ('full-stack-web-development-with-ai-ml', 'data-science-python-with-ai')
GROUP BY c.id, c.slug, c.title, c.price, c.is_published
ORDER BY c.slug;
```

**Expected Result:**
| slug | title | price | is_published | module_count | lesson_count |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `data-science-python-with-ai` | Data Science, Python & AI/ML Masterclass | 4999 | `true` | 8 | 46 |
| `full-stack-web-development-with-ai-ml` | Full Stack Web Development with AI & ML Integration | 6999 | `true` | 21 | 224 |

Total production masterclass curriculum: **270 lessons across 29 modules**.

---

### Verification Query 5: Custom Functions & RPCs (Expected: 10 functions)

```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;
```

**Expected Functions:**
1. `can_access_course`
2. `course_outline`
3. `enroll_free`
4. `handle_new_user`
5. `has_role`
6. `lesson_content`
7. `practice_review`
8. `refresh_course_rating`
9. `submit_practice_answer`
10. `update_updated_at_column`

---

### Verification Query 6: Custom Enums (Expected: 5 enums)

```sql
SELECT typname
FROM pg_type
JOIN pg_namespace ON pg_namespace.oid = pg_type.typnamespace
WHERE nspname = 'public' AND typtype = 'e'
ORDER BY typname;
```

**Expected Enums:**
1. `access_policy`
2. `app_role`
3. `application_status`
4. `employee_role`
5. `lesson_type`

---

## Step 5: Post-Database Setup Tasks

Once your database is verified:
1. **Supabase Auth Redirect URLs:**
   In Supabase Dashboard → **Authentication** → **URL Configuration**:
   - Site URL: `http://localhost:3000` (or your production Vercel URL)
   - Redirect URLs:
     - `http://localhost:3000/auth/callback`
     - `https://<your-vercel-domain>.vercel.app/auth/callback`
2. **Local Application:**
   Run `npm run dev` to verify the site connects to Supabase and displays the published courses in `/courses`.
3. **Deploy to Vercel:**
   Push commits to GitHub and deploy to Vercel with your production environment variables.

## After master_schema.sql (verified 2026-09-30)
Run these in order in the SQL editor — all apply cleanly on top of `master_schema.sql` (47 tables total):
1. `supabase/migrations/20260929180000_admin_cms.sql`
2. `supabase/migrations/20260930090000_payments_referrals.sql`
3. `supabase/migrations/20260930100000_legal_pages.sql`
4. `supabase/migrations/20260930110000_certificates.sql`
5. `supabase/migrations/20260930120000_internships.sql`
