-- Gradient Code: Google Drive & Video Streaming Metadata
-- Safe, additive migration extending lessons table with video streaming provider metadata
-- and updating lesson_content RPC to securely expose drive metadata to authorized learners.

ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS video_provider TEXT NOT NULL DEFAULT 'html5',
  ADD COLUMN IF NOT EXISTS drive_file_id TEXT,
  ADD COLUMN IF NOT EXISTS drive_mime_type TEXT DEFAULT 'video/mp4',
  ADD COLUMN IF NOT EXISTS drive_size BIGINT,
  ADD COLUMN IF NOT EXISTS drive_modified_time TIMESTAMPTZ;

-- Constrain video provider types
DO $$ BEGIN
  ALTER TABLE public.lessons
    ADD CONSTRAINT lessons_video_provider_check
    CHECK (video_provider IN ('html5', 'drive', 'youtube', 'vimeo', 'external'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Fast index for streaming lookup by Drive file ID
CREATE INDEX IF NOT EXISTS idx_lessons_drive_file_id ON public.lessons(drive_file_id) WHERE drive_file_id IS NOT NULL;

-- Update lesson_content RPC to securely return video_provider and drive_file_id
DROP FUNCTION IF EXISTS public.lesson_content(UUID);
CREATE OR REPLACE FUNCTION public.lesson_content(_lesson_id UUID)
RETURNS TABLE (
  id UUID,
  video_url TEXT,
  content_text TEXT,
  join_url TEXT,
  live_at TIMESTAMPTZ,
  video_provider TEXT,
  drive_file_id TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT l.id, l.video_url, l.content_text, l.join_url, l.live_at, l.video_provider, l.drive_file_id
  FROM public.lessons l
  JOIN public.course_modules m ON m.id = l.module_id
  JOIN public.courses c ON c.id = m.course_id
  WHERE l.id = _lesson_id
    AND (public.can_access_course(c.id) OR (c.is_published AND l.is_free_preview));
$$;

REVOKE ALL ON FUNCTION public.lesson_content(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lesson_content(UUID) TO anon, authenticated;
