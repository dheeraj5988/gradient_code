-- =====================================================================
-- Phase 3 — Admin CMS foundation
-- Course status/demo flags, lesson/module/resource Drive metadata for
-- idempotent imports, review moderation, admin audit log.
-- Additive only. Does not edit earlier migrations.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. COURSES: lifecycle status + demo flag + Drive source
-- ---------------------------------------------------------------------
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS drive_folder_id TEXT;

UPDATE public.courses SET status = CASE WHEN is_published THEN 'published' ELSE 'draft' END WHERE status IS NULL;
ALTER TABLE public.courses ALTER COLUMN status SET DEFAULT 'draft';
ALTER TABLE public.courses ALTER COLUMN status SET NOT NULL;
DO $$ BEGIN
  ALTER TABLE public.courses ADD CONSTRAINT courses_status_check CHECK (status IN ('draft','published','archived'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Keep legacy is_published (read by RLS and the old app) in sync with status.
CREATE OR REPLACE FUNCTION public.sync_course_status() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS NULL THEN NEW.status := CASE WHEN NEW.is_published THEN 'published' ELSE 'draft' END; END IF;
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    NULL; -- status drives
  ELSIF NEW.is_published IS DISTINCT FROM OLD.is_published THEN
    NEW.status := CASE WHEN NEW.is_published THEN 'published' ELSE 'draft' END; -- legacy writer drives
  END IF;
  NEW.is_published := (NEW.status = 'published');
  NEW.archived_at := CASE WHEN NEW.status = 'archived' THEN COALESCE(NEW.archived_at, now()) ELSE NULL END;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS courses_sync_status ON public.courses;
CREATE TRIGGER courses_sync_status BEFORE INSERT OR UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.sync_course_status();

-- Evidence-based demo flag: published courses with NO real video source are
-- Lovable-era placeholders (0 lessons or only placeholder media). Admin can change it.
UPDATE public.courses c SET is_demo = true
WHERE NOT EXISTS (
  SELECT 1 FROM public.course_modules m JOIN public.lessons l ON l.module_id = m.id
  WHERE m.course_id = c.id AND l.video_url IS NOT NULL AND l.video_url NOT LIKE '%gpteng.co/placeholder%'
);

CREATE UNIQUE INDEX IF NOT EXISTS courses_drive_folder_uidx ON public.courses (drive_folder_id) WHERE drive_folder_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS courses_status_idx ON public.courses (status, updated_at DESC);

-- ---------------------------------------------------------------------
-- 2. MODULES: Drive source folder (idempotent import) + description
-- ---------------------------------------------------------------------
ALTER TABLE public.course_modules
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS drive_folder_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS course_modules_drive_uidx ON public.course_modules (course_id, drive_folder_id) WHERE drive_folder_id IS NOT NULL;

-- ---------------------------------------------------------------------
-- 3. LESSONS: editorial fields + Drive metadata
-- ---------------------------------------------------------------------
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS is_required BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS drive_name TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS lessons_updated ON public.lessons;
CREATE TRIGGER lessons_updated BEFORE UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill Drive IDs from legacy preview URLs (does not change what the old app plays).
UPDATE public.lessons
SET drive_file_id = substring(video_url from 'drive\.google\.com/file/d/([-\w]+)'),
    video_provider = 'drive'
WHERE drive_file_id IS NULL AND video_url ~ 'drive\.google\.com/file/d/[-\w]+';
UPDATE public.lessons SET video_provider = 'youtube' WHERE video_provider = 'html5' AND video_url ~ '(youtube\.com|youtu\.be)/';
UPDATE public.lessons SET video_provider = 'vimeo'   WHERE video_provider = 'html5' AND video_url ~ 'vimeo\.com/';

-- A Drive file is imported at most once per module (idempotency key).
CREATE UNIQUE INDEX IF NOT EXISTS lessons_module_drive_uidx ON public.lessons (module_id, drive_file_id) WHERE drive_file_id IS NOT NULL;

-- Unpublished lessons are hidden from learners (staff still see them).
CREATE OR REPLACE FUNCTION public.course_outline(_course_id UUID)
RETURNS TABLE (id UUID, module_id UUID, title TEXT, type public.lesson_type, duration_seconds INT, order_index INT, is_free_preview BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT l.id, l.module_id, l.title, l.type, l.duration_seconds, l.order_index, l.is_free_preview
  FROM public.lessons l
  JOIN public.course_modules m ON m.id = l.module_id
  JOIN public.courses c ON c.id = m.course_id
  WHERE m.course_id = _course_id
    AND (
      (c.is_published AND l.is_published)
      OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'employee')
    )
  ORDER BY m.order_index, l.order_index;
$$;

DROP FUNCTION IF EXISTS public.lesson_content(UUID);
CREATE FUNCTION public.lesson_content(_lesson_id UUID)
RETURNS TABLE (id UUID, video_url TEXT, content_text TEXT, join_url TEXT, live_at TIMESTAMPTZ, video_provider TEXT, drive_file_id TEXT, drive_mime_type TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT l.id, l.video_url, l.content_text, l.join_url, l.live_at, l.video_provider, l.drive_file_id, l.drive_mime_type
  FROM public.lessons l
  JOIN public.course_modules m ON m.id = l.module_id
  JOIN public.courses c ON c.id = m.course_id
  WHERE l.id = _lesson_id
    AND (
      public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'employee')
      OR (l.is_published AND (public.can_access_course(c.id) OR (c.is_published AND l.is_free_preview)))
    );
$$;
REVOKE ALL ON FUNCTION public.lesson_content(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lesson_content(UUID) TO anon, authenticated;

DROP POLICY IF EXISTS "lessons read: staff, enrolled or preview" ON public.lessons;
CREATE POLICY "lessons read: staff, enrolled or preview" ON public.lessons
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'employee')
    OR (lessons.is_published AND EXISTS (
      SELECT 1 FROM public.course_modules m JOIN public.courses c ON c.id = m.course_id
      WHERE m.id = lessons.module_id
        AND (public.can_access_course(c.id) OR (c.is_published AND lessons.is_free_preview))
    ))
  );

-- ---------------------------------------------------------------------
-- 4. RESOURCES: Drive-backed files
-- ---------------------------------------------------------------------
ALTER TABLE public.course_resources
  ADD COLUMN IF NOT EXISTS drive_file_id TEXT,
  ADD COLUMN IF NOT EXISTS drive_mime_type TEXT,
  ADD COLUMN IF NOT EXISTS drive_size BIGINT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.course_resources DROP CONSTRAINT IF EXISTS course_resources_check;
ALTER TABLE public.course_resources DROP CONSTRAINT IF EXISTS course_resources_source_check;
ALTER TABLE public.course_resources ADD CONSTRAINT course_resources_source_check
  CHECK (url IS NOT NULL OR file_path IS NOT NULL OR drive_file_id IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS course_resources_drive_uidx ON public.course_resources (course_id, drive_file_id) WHERE drive_file_id IS NOT NULL;
DROP TRIGGER IF EXISTS course_resources_updated ON public.course_resources;
CREATE TRIGGER course_resources_updated BEFORE UPDATE ON public.course_resources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------
-- 5. QUESTIONS: archive
-- ---------------------------------------------------------------------
ALTER TABLE public.practice_questions ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS practice_questions_updated_idx ON public.practice_questions (updated_at DESC);

-- ---------------------------------------------------------------------
-- 6. REVIEW MODERATION
-- ---------------------------------------------------------------------
ALTER TABLE public.course_reviews
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES auth.users ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ;
DROP POLICY IF EXISTS "reviews public read" ON public.course_reviews;
CREATE POLICY "reviews public read" ON public.course_reviews FOR SELECT
  USING (NOT is_hidden OR user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "admins moderate reviews" ON public.course_reviews;
CREATE POLICY "admins moderate reviews" ON public.course_reviews FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
-- Learners may edit their review text/rating but not the moderation flag.
DROP POLICY IF EXISTS "users edit own review" ON public.course_reviews;
CREATE POLICY "users edit own review" ON public.course_reviews FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND NOT is_hidden);

CREATE OR REPLACE FUNCTION public.refresh_course_rating() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid UUID := COALESCE(NEW.course_id, OLD.course_id);
BEGIN
  UPDATE public.courses c SET
    rating_avg = COALESCE((SELECT ROUND(AVG(rating)::numeric,1) FROM public.course_reviews WHERE course_id = cid AND NOT is_hidden),0),
    rating_count = (SELECT COUNT(*) FROM public.course_reviews WHERE course_id = cid AND NOT is_hidden)
  WHERE c.id = cid;
  RETURN NULL;
END $$;

-- ---------------------------------------------------------------------
-- 7. ENROLLMENTS: auditable manual grants
-- ---------------------------------------------------------------------
ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS granted_by UUID REFERENCES auth.users ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notes TEXT;
CREATE INDEX IF NOT EXISTS enrollments_course_idx ON public.enrollments (course_id);
CREATE INDEX IF NOT EXISTS enrollments_enrolled_at_idx ON public.enrollments (enrolled_at DESC);

-- ---------------------------------------------------------------------
-- 8. ADMIN AUDIT LOG (append-only)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id UUID REFERENCES auth.users ON DELETE SET NULL,
  action TEXT NOT NULL,                 -- e.g. course.create, course.publish, lesson.update, enrollment.grant
  entity_type TEXT NOT NULL,            -- course | module | lesson | question | topic | resource | enrollment | review | instructor | import
  entity_id TEXT,
  summary TEXT NOT NULL DEFAULT '',
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_audit_log_created_idx ON public.admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_log_entity_idx ON public.admin_audit_log (entity_type, entity_id);
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.admin_audit_log TO authenticated;
CREATE POLICY "audit read admin" ON public.admin_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "audit insert admin as self" ON public.admin_audit_log FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') AND actor_id = auth.uid());
-- No UPDATE/DELETE policies: the log is append-only for everyone but the service role.

-- ---------------------------------------------------------------------
-- 9. Helpful indexes for admin lists
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS profiles_created_idx ON public.profiles (created_at DESC);

-- ---------------------------------------------------------------------
-- 10. Per-course content counts for admin lists (security_invoker → caller's RLS applies)
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.admin_course_stats WITH (security_invoker = true) AS
SELECT
  c.id AS course_id,
  COUNT(DISTINCT m.id) AS modules,
  COUNT(l.id) AS lessons,
  COUNT(l.id) FILTER (WHERE l.is_published) AS published_lessons,
  COUNT(l.id) FILTER (WHERE l.type = 'video' AND l.video_url IS NULL AND l.drive_file_id IS NULL) AS video_lessons_missing_media,
  COUNT(l.id) FILTER (WHERE l.is_free_preview AND l.is_published) AS preview_lessons,
  COALESCE(SUM(l.duration_seconds), 0) AS total_seconds
FROM public.courses c
LEFT JOIN public.course_modules m ON m.course_id = c.id
LEFT JOIN public.lessons l ON l.module_id = m.id
GROUP BY c.id;
GRANT SELECT ON public.admin_course_stats TO authenticated;
