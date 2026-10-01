-- Course thumbnails: public-read Storage bucket, admin-only writes.
-- Thumbnails are marketing images (shown on the public catalog), so public read is intended.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('course-thumbnails', 'course-thumbnails', true, 5242880, ARRAY['image/png','image/jpeg','image/webp'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "course thumbnails: admin insert" ON storage.objects;
CREATE POLICY "course thumbnails: admin insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'course-thumbnails' AND public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "course thumbnails: admin update" ON storage.objects;
CREATE POLICY "course thumbnails: admin update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'course-thumbnails' AND public.has_role(auth.uid(),'admin'))
  WITH CHECK (bucket_id = 'course-thumbnails' AND public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "course thumbnails: admin delete" ON storage.objects;
CREATE POLICY "course thumbnails: admin delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'course-thumbnails' AND public.has_role(auth.uid(),'admin'));
