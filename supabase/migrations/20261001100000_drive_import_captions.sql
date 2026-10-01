-- =====================================================================
-- Drive import: subtitles (captions), lesson extras, "other" resources
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. CAPTIONS: subtitle files stored privately in Drive, one row per track
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lesson_captions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  drive_file_id TEXT NOT NULL,
  drive_name TEXT,
  format TEXT NOT NULL CHECK (format IN ('srt','vtt')),
  language TEXT NOT NULL DEFAULT 'en' CHECK (language ~ '^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})?$'),
  label TEXT NOT NULL DEFAULT 'English',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS lesson_captions_drive_uidx ON public.lesson_captions (lesson_id, drive_file_id);
CREATE INDEX IF NOT EXISTS lesson_captions_lesson_idx ON public.lesson_captions (lesson_id);

-- Learners never read this table directly (it holds Drive IDs); they use the functions below.
ALTER TABLE public.lesson_captions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lesson_captions FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_captions TO authenticated;
DROP POLICY IF EXISTS "captions admin" ON public.lesson_captions;
CREATE POLICY "captions admin" ON public.lesson_captions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ---------------------------------------------------------------------
-- 2. lesson_extras(): description + caption list, same access rule as lesson_content()
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lesson_extras(_lesson_id UUID)
RETURNS TABLE (description TEXT, captions JSONB)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT l.description,
         COALESCE((
           SELECT jsonb_agg(jsonb_build_object('id', c.id, 'language', c.language, 'label', c.label, 'is_default', c.is_default)
                            ORDER BY c.is_default DESC, c.label)
           FROM public.lesson_captions c WHERE c.lesson_id = l.id
         ), '[]'::jsonb)
  FROM public.lessons l
  WHERE l.id = _lesson_id
    AND EXISTS (SELECT 1 FROM public.lesson_content(_lesson_id));
$$;
REVOKE ALL ON FUNCTION public.lesson_extras(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lesson_extras(UUID) TO anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. caption_source(): used only by /api/caption/[id] to stream the file
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.caption_source(_caption_id UUID)
RETURNS TABLE (drive_file_id TEXT, format TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.drive_file_id, c.format
  FROM public.lesson_captions c
  WHERE c.id = _caption_id
    AND EXISTS (SELECT 1 FROM public.lesson_content(c.lesson_id));
$$;
REVOKE ALL ON FUNCTION public.caption_source(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.caption_source(UUID) TO anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. RESOURCES: allow "other" so no Drive file has to be skipped
-- ---------------------------------------------------------------------
ALTER TABLE public.course_resources DROP CONSTRAINT IF EXISTS course_resources_resource_type_check;
ALTER TABLE public.course_resources ADD CONSTRAINT course_resources_resource_type_check
  CHECK (resource_type IN ('pdf','notes','cheat_sheet','external_link','code_repository','dataset','template','presentation','recording','other'));

-- Original Drive file name, so downloads keep their real extension.
ALTER TABLE public.course_resources ADD COLUMN IF NOT EXISTS drive_name TEXT;
