# Admin guide

## Becoming an admin
Admin rights are stored in `public.user_roles`. After signing up, run once in the Supabase SQL editor:
```sql
update public.user_roles set role = 'admin'
where user_id = (select id from auth.users where email = 'you@example.com');
```
Admin pages (`/admin/*`) check this role on the server and the database re-checks it on every write (RLS). Students who open `/admin` are sent to their dashboard.

## Create a course (no code needed)
1. **Admin → Courses → New course.** Fill title, category, level, price (0 = free). It is saved as a **draft** (invisible to learners).
2. **Curriculum:** add modules, then add lessons (title + type). New lessons are **unpublished drafts**.
3. **Open a lesson** to set the video (Google Drive file, YouTube, Vimeo or a direct file URL), duration, description, *Free preview*, *Required* and *Published*.
4. Back on **Course settings**, the *Content completeness* panel shows what's missing. Required items (red) block publishing; recommended items (grey) don't.
5. Click **Publish course**. You can unpublish (back to draft) or archive at any time. Nothing is deleted.

Other actions: **Duplicate** (creates a draft copy with modules and lessons), **Demo / test course** (hidden from the public catalog even when published).

### Ordering & deleting
Use ↑ ↓ to reorder modules and lessons (order is saved in the database). A module can only be deleted when empty. A lesson that learners have completed can't be deleted — unpublish it instead.

## Import from Google Drive
See `docs/COURSE_IMPORT_GUIDE.md`. Imports are always drafts and never overwrite anything.

## Practice content
- **Topics:** group questions inside a course (e.g. HTML, SQL).
- **Questions:** choose course/module/topic/related lesson, type and difficulty. The **answer key** (correct option numbers, accepted text answers, explanation, reference solution) is stored in a separate table learners can't read; it is revealed only after a learner submits. Set *Used for → Interview prep* for self-review interview questions.
- Publish / unpublish / duplicate / archive from the list.

## Resources
Public link, **private Google Drive file** (served through an access-checked proxy — learners never see the Drive link) or Supabase Storage file. Publish to make it visible to enrolled learners.

## Students & enrollments
- **Students:** search, view profile, enrollments with progress, practice attempts, certificates and applications. Personal notes stay private.
- **Enrollments → Grant course access:** email + course + reason (admin / scholarship / promotion) + note, optional expiry. Every grant and revoke is written to the **Audit log**. Paid enrollments can't be revoked here (refunds belong to the payments flow).

## Reviews
Hide or restore reviews. Hidden reviews don't count toward the course rating.

## Audit log & settings
- **Audit log:** append-only record of admin changes (course/lesson/question/resource edits, publishing, imports, grants, moderation).
- **Settings & integrations:** shows which environment variables are configured (never their values).
