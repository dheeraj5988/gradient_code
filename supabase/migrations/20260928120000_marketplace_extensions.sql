-- Gradient Code v2: marketplace features (Udemy/Coursera/Internshala-style).
-- Safe to run on the existing Lovable database: only ADDs columns/tables.

-- 1. Richer course metadata (course detail page like Udemy)
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS subtitle TEXT,
  ADD COLUMN IF NOT EXISTS level TEXT NOT NULL DEFAULT 'Beginner',        -- Beginner | Intermediate | Advanced | All levels
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'Hinglish',
  ADD COLUMN IF NOT EXISTS mrp NUMERIC,                                   -- strike-through price
  ADD COLUMN IF NOT EXISTS what_you_learn TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS requirements TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS target_audience TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS skills TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS includes JSONB NOT NULL DEFAULT '{}'::jsonb,     -- {"hours":37,"articles":85,"resources":40,"certificate":true}
  ADD COLUMN IF NOT EXISTS preview_video_url TEXT,
  ADD COLUMN IF NOT EXISTS instructor_id UUID,
  ADD COLUMN IF NOT EXISTS rating_avg NUMERIC(2,1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS students_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_internship BOOLEAN NOT NULL DEFAULT false;

-- 2. Instructors (public profile pages)
CREATE TABLE IF NOT EXISTS public.instructors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  headline TEXT,
  bio TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  linkedin_url TEXT,
  website_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.instructors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "instructors public read" ON public.instructors FOR SELECT USING (true);
CREATE POLICY "admins manage instructors" ON public.instructors FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
ALTER TABLE public.courses
  ADD CONSTRAINT courses_instructor_fk FOREIGN KEY (instructor_id) REFERENCES public.instructors(id) ON DELETE SET NULL;

-- 3. Reviews & ratings
CREATE TABLE IF NOT EXISTS public.course_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (course_id, user_id)
);
ALTER TABLE public.course_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews public read" ON public.course_reviews FOR SELECT USING (true);
CREATE POLICY "enrolled users write own review" ON public.course_reviews FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.enrollments e WHERE e.user_id = auth.uid() AND e.course_id = course_reviews.course_id));
CREATE POLICY "users edit own review" ON public.course_reviews FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "users delete own review" ON public.course_reviews FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.refresh_course_rating() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid UUID := COALESCE(NEW.course_id, OLD.course_id);
BEGIN
  UPDATE public.courses c SET
    rating_avg = COALESCE((SELECT ROUND(AVG(rating)::numeric,1) FROM public.course_reviews WHERE course_id = cid),0),
    rating_count = (SELECT COUNT(*) FROM public.course_reviews WHERE course_id = cid)
  WHERE c.id = cid;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS course_reviews_rating ON public.course_reviews;
CREATE TRIGGER course_reviews_rating AFTER INSERT OR UPDATE OR DELETE ON public.course_reviews
  FOR EACH ROW EXECUTE FUNCTION public.refresh_course_rating();

-- 4. Wishlist
CREATE TABLE IF NOT EXISTS public.wishlist (
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, course_id)
);
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own wishlist" ON public.wishlist FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 5. Coupons
CREATE TABLE IF NOT EXISTS public.coupons (
  code TEXT PRIMARY KEY,
  percent_off SMALLINT CHECK (percent_off BETWEEN 1 AND 100),
  amount_off NUMERIC,
  course_id UUID REFERENCES public.courses ON DELETE CASCADE,   -- NULL = sitewide
  max_uses INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage coupons" ON public.coupons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
-- Coupon validation happens server-side with the service role key.

-- 6. Internships (Internshala-style)
CREATE TABLE IF NOT EXISTS public.internships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  company TEXT NOT NULL DEFAULT 'Gradient Code',
  company_logo_url TEXT,
  location TEXT NOT NULL DEFAULT 'Remote',
  mode TEXT NOT NULL DEFAULT 'Remote',          -- Remote | Hybrid | On-site
  duration_weeks INTEGER NOT NULL DEFAULT 8,
  stipend_min INTEGER NOT NULL DEFAULT 0,
  stipend_max INTEGER,
  skills TEXT[] NOT NULL DEFAULT '{}',
  description TEXT NOT NULL DEFAULT '',
  responsibilities TEXT[] NOT NULL DEFAULT '{}',
  perks TEXT[] NOT NULL DEFAULT '{}',
  openings INTEGER NOT NULL DEFAULT 1,
  required_course_id UUID REFERENCES public.courses ON DELETE SET NULL,  -- "complete this course to unlock"
  apply_by DATE,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.internships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "published internships public" ON public.internships FOR SELECT
  USING (is_published OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage internships" ON public.internships FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

DO $$ BEGIN
  CREATE TYPE public.application_status AS ENUM ('applied','shortlisted','interview','offered','rejected','withdrawn');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.internship_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  internship_id UUID NOT NULL REFERENCES public.internships ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  resume_url TEXT,
  portfolio_url TEXT,
  cover_note TEXT NOT NULL DEFAULT '',
  status public.application_status NOT NULL DEFAULT 'applied',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (internship_id, user_id)
);
ALTER TABLE public.internship_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own applications read" ON public.internship_applications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own applications insert" ON public.internship_applications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "admins update applications" ON public.internship_applications FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER internship_applications_updated BEFORE UPDATE ON public.internship_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Quizzes (lesson-level)
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  options TEXT[] NOT NULL,
  correct_index SMALLINT NOT NULL,
  explanation TEXT,
  order_index INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quiz read authenticated" ON public.quiz_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage quiz" ON public.quiz_questions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
-- Certificates already have a unique certificate_number used for public /verify/<number>.
