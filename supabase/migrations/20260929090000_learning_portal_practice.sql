-- =====================================================================
-- Phase 2 — Learning portal, progress, practice, resources, notes
-- Also closes security holes found in the Phase 2A audit (see docs/SECURITY.md).
-- Safe to run once on the existing database. Does not edit older migrations.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Helper: can the current user access a course's protected content?
--    admin / employee / active enrollment.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_access_course(_course_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'employee')
    OR EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.user_id = auth.uid() AND e.course_id = _course_id
        AND (e.expires_at IS NULL OR e.expires_at > now())
    )
  );
$$;
REVOKE ALL ON FUNCTION public.can_access_course(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_course(UUID) TO anon, authenticated;

-- =====================================================================
-- 2A-1. LESSON CONTENT BOUNDARY
-- Before: anon + authenticated could SELECT every column (incl. video_url,
-- content_text, join_url) of every lesson in a published course.
-- After: lesson ROWS are readable only by staff, enrolled learners, or for
-- free-preview lessons. Everyone else gets the safe outline via RPC.
-- =====================================================================
DROP POLICY IF EXISTS "anon read lessons" ON public.lessons;
DROP POLICY IF EXISTS "auth read lessons" ON public.lessons;
DROP POLICY IF EXISTS "lessons readable" ON public.lessons;

CREATE POLICY "lessons read: staff, enrolled or preview" ON public.lessons
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.course_modules m JOIN public.courses c ON c.id = m.course_id
      WHERE m.id = lessons.module_id
        AND (public.can_access_course(c.id) OR (c.is_published AND lessons.is_free_preview))
    )
  );
-- anon has no row access to lessons any more.
REVOKE SELECT ON public.lessons FROM anon;

-- Safe, public curriculum outline (no media / text / join links).
CREATE OR REPLACE FUNCTION public.course_outline(_course_id UUID)
RETURNS TABLE (id UUID, module_id UUID, title TEXT, type public.lesson_type, duration_seconds INT, order_index INT, is_free_preview BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT l.id, l.module_id, l.title, l.type, l.duration_seconds, l.order_index, l.is_free_preview
  FROM public.lessons l
  JOIN public.course_modules m ON m.id = l.module_id
  JOIN public.courses c ON c.id = m.course_id
  WHERE m.course_id = _course_id
    AND (c.is_published OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'employee'))
  ORDER BY m.order_index, l.order_index;
$$;
REVOKE ALL ON FUNCTION public.course_outline(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.course_outline(UUID) TO anon, authenticated;

-- Protected content for ONE lesson: returned only when authorised.
CREATE OR REPLACE FUNCTION public.lesson_content(_lesson_id UUID)
RETURNS TABLE (id UUID, video_url TEXT, content_text TEXT, join_url TEXT, live_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT l.id, l.video_url, l.content_text, l.join_url, l.live_at
  FROM public.lessons l
  JOIN public.course_modules m ON m.id = l.module_id
  JOIN public.courses c ON c.id = m.course_id
  WHERE l.id = _lesson_id
    AND (public.can_access_course(c.id) OR (c.is_published AND l.is_free_preview));
$$;
REVOKE ALL ON FUNCTION public.lesson_content(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lesson_content(UUID) TO anon, authenticated;

-- =====================================================================
-- 2A-2. ENROLLMENTS
-- Before: "self enroll" let any user INSERT an enrollment for ANY course (incl. paid).
-- After: only admins insert directly; free courses go through enroll_free();
-- paid courses will be enrolled by the server after payment verification (service role).
-- =====================================================================
DROP POLICY IF EXISTS "self enroll" ON public.enrollments;
DROP POLICY IF EXISTS "admins insert enrollments" ON public.enrollments;
CREATE POLICY "admins insert enrollments" ON public.enrollments
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));

ALTER TABLE public.enrollments DROP CONSTRAINT IF EXISTS enrollments_source_check;
ALTER TABLE public.enrollments ADD CONSTRAINT enrollments_source_check
  CHECK (source IN ('free','payment','admin','manual_grant','scholarship','promotion')) NOT VALID;

CREATE OR REPLACE FUNCTION public.enroll_free(_course_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c RECORD; eid UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT id, price, is_published, access_policy, access_days INTO c FROM public.courses WHERE id = _course_id;
  IF NOT FOUND OR NOT c.is_published THEN RAISE EXCEPTION 'course_not_found'; END IF;
  IF c.price > 0 THEN RAISE EXCEPTION 'course_not_free'; END IF;
  INSERT INTO public.enrollments (user_id, course_id, source, expires_at)
  VALUES (auth.uid(), _course_id, 'free',
          CASE WHEN c.access_policy = 'days' AND c.access_days IS NOT NULL THEN now() + make_interval(days => c.access_days) END)
  ON CONFLICT (user_id, course_id) DO NOTHING
  RETURNING id INTO eid;
  RETURN eid;
END $$;
REVOKE ALL ON FUNCTION public.enroll_free(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enroll_free(UUID) TO authenticated;

-- =====================================================================
-- 2A-3. CERTIFICATES — students can no longer self-issue.
-- =====================================================================
DROP POLICY IF EXISTS "issue own certificate" ON public.certificates;
DROP POLICY IF EXISTS "admins issue certificates" ON public.certificates;
CREATE POLICY "admins issue certificates" ON public.certificates
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
-- No UPDATE policy exists → updates denied for everyone except service role.

-- =====================================================================
-- 2A-4. ANSWER KEYS — the Phase 0 quiz_questions table let any
-- authenticated user read correct_index. It is superseded by the practice
-- model below and dropped (it held no production data).
-- =====================================================================
DROP TABLE IF EXISTS public.quiz_questions;

-- =====================================================================
-- 2C. VIDEO PROGRESS (lesson completion stays in lesson_progress)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.video_progress (
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons ON DELETE CASCADE,
  position_seconds INT NOT NULL DEFAULT 0 CHECK (position_seconds >= 0),
  duration_seconds INT CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, lesson_id)
);
ALTER TABLE public.video_progress ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_progress TO authenticated;
CREATE POLICY "own video progress" ON public.video_progress FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Completion can only be recorded for lessons the learner can access.
DROP POLICY IF EXISTS "own progress write" ON public.lesson_progress;
CREATE POLICY "own progress write" ON public.lesson_progress FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.lessons l JOIN public.course_modules m ON m.id = l.module_id
    WHERE l.id = lesson_id AND public.can_access_course(m.course_id)));

CREATE INDEX IF NOT EXISTS lesson_progress_user_idx ON public.lesson_progress (user_id);
CREATE INDEX IF NOT EXISTS lessons_module_order_idx ON public.lessons (module_id, order_index);
CREATE INDEX IF NOT EXISTS modules_course_order_idx ON public.course_modules (course_id, order_index);

-- =====================================================================
-- 2E. PRACTICE
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.course_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses ON DELETE CASCADE,
  module_id UUID REFERENCES public.course_modules ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (course_id, slug)
);
CREATE INDEX IF NOT EXISTS course_topics_course_idx ON public.course_topics (course_id, order_index);
ALTER TABLE public.course_topics ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.course_topics TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.course_topics TO authenticated;
CREATE POLICY "topics read: course access" ON public.course_topics FOR SELECT TO authenticated
  USING (public.can_access_course(course_id));
CREATE POLICY "topics admin" ON public.course_topics FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Student-visible question data. NO answers or explanations here.
CREATE TABLE IF NOT EXISTS public.practice_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses ON DELETE CASCADE,
  module_id UUID REFERENCES public.course_modules ON DELETE SET NULL,
  topic_id UUID REFERENCES public.course_topics ON DELETE SET NULL,
  lesson_id UUID REFERENCES public.lessons ON DELETE SET NULL,          -- related lesson
  category TEXT NOT NULL DEFAULT 'practice' CHECK (category IN ('practice','interview')),
  role TEXT,                                                              -- interview: target role
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  prompt TEXT NOT NULL,                                                   -- markdown/plain text
  type TEXT NOT NULL CHECK (type IN ('mcq','multi_select','true_false','short_answer','coding','debugging','output_prediction','scenario')),
  difficulty TEXT NOT NULL DEFAULT 'easy' CHECK (difficulty IN ('easy','medium','hard')),
  options TEXT[] NOT NULL DEFAULT '{}',                                   -- mcq / multi_select choices
  hint TEXT,
  day_number INT CHECK (day_number IS NULL OR day_number > 0),            -- optional daily plan grouping
  estimated_minutes INT NOT NULL DEFAULT 3 CHECK (estimated_minutes > 0),
  points INT NOT NULL DEFAULT 10 CHECK (points >= 0),
  order_index INT NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (course_id, slug)
);
CREATE INDEX IF NOT EXISTS practice_questions_course_idx ON public.practice_questions (course_id, category, order_index);
CREATE INDEX IF NOT EXISTS practice_questions_topic_idx ON public.practice_questions (topic_id);
ALTER TABLE public.practice_questions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.practice_questions TO authenticated;
CREATE POLICY "questions read: published + course access" ON public.practice_questions FOR SELECT TO authenticated
  USING ((is_published AND public.can_access_course(course_id)) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "questions admin" ON public.practice_questions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER practice_questions_updated BEFORE UPDATE ON public.practice_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Answer keys: students have NO select access. Read only by the grading function.
CREATE TABLE IF NOT EXISTS public.practice_answer_keys (
  question_id UUID PRIMARY KEY REFERENCES public.practice_questions ON DELETE CASCADE,
  correct_options INT[] NOT NULL DEFAULT '{}',        -- indexes into options (mcq/multi/true_false: 0=True,1=False)
  accepted_answers TEXT[] NOT NULL DEFAULT '{}',      -- short_answer / output_prediction (case/space-insensitive)
  explanation TEXT,
  solution TEXT
);
ALTER TABLE public.practice_answer_keys ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.practice_answer_keys FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.practice_answer_keys TO authenticated;
CREATE POLICY "answer keys admin only" ON public.practice_answer_keys FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.question_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.practice_questions ON DELETE CASCADE,
  answer JSONB NOT NULL,
  is_correct BOOLEAN,                                 -- NULL = needs review (coding/scenario)
  score INT NOT NULL DEFAULT 0,
  attempt_number INT NOT NULL,
  time_spent_seconds INT CHECK (time_spent_seconds IS NULL OR time_spent_seconds >= 0),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, question_id, attempt_number)
);
CREATE INDEX IF NOT EXISTS question_attempts_user_idx ON public.question_attempts (user_id, question_id);
ALTER TABLE public.question_attempts ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.question_attempts TO authenticated;
-- Read own attempts only. Inserts ONLY through submit_practice_answer() (no INSERT policy → direct inserts denied).
CREATE POLICY "own attempts read" ON public.question_attempts FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.saved_questions (
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.practice_questions ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, question_id)
);
ALTER TABLE public.saved_questions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.saved_questions TO authenticated;
CREATE POLICY "own saved read" ON public.saved_questions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own saved insert" ON public.saved_questions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.practice_questions q WHERE q.id = question_id AND public.can_access_course(q.course_id)));
CREATE POLICY "own saved delete" ON public.saved_questions FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Interview prep review state (reuses practice_questions with category='interview').
CREATE TABLE IF NOT EXISTS public.question_reviews (
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.practice_questions ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('not_reviewed','reviewed','confident')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, question_id)
);
ALTER TABLE public.question_reviews ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.question_reviews TO authenticated;
CREATE POLICY "own reviews" ON public.question_reviews FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Grading. Validates access, grades against the hidden key, records the attempt,
-- and only THEN returns the correct answer + explanation.
CREATE OR REPLACE FUNCTION public.submit_practice_answer(_question_id UUID, _answer JSONB, _time_spent INT DEFAULT NULL)
RETURNS TABLE (is_correct BOOLEAN, attempt_number INT, correct_options INT[], accepted_answers TEXT[], explanation TEXT, solution TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE q RECORD; k RECORD; ok BOOLEAN; n INT; picked INT[]; txt TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO q FROM public.practice_questions WHERE id = _question_id AND is_published;
  IF NOT FOUND OR NOT public.can_access_course(q.course_id) THEN RAISE EXCEPTION 'not_allowed'; END IF;
  SELECT * INTO k FROM public.practice_answer_keys WHERE question_id = _question_id;

  IF q.type IN ('mcq','true_false','multi_select') THEN
    SELECT COALESCE(array_agg(DISTINCT v::INT ORDER BY v::INT), '{}') INTO picked
      FROM jsonb_array_elements_text(COALESCE(_answer->'choices','[]'::jsonb)) v;
    ok := k.question_id IS NOT NULL AND picked = (SELECT COALESCE(array_agg(DISTINCT x ORDER BY x), '{}') FROM unnest(k.correct_options) x);
  ELSIF q.type IN ('short_answer','output_prediction') THEN
    txt := lower(regexp_replace(trim(COALESCE(_answer->>'text','')), '\s+', ' ', 'g'));
    ok := k.question_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM unnest(k.accepted_answers) a WHERE lower(regexp_replace(trim(a), '\s+', ' ', 'g')) = txt);
  ELSE
    ok := NULL; -- coding / debugging / scenario: recorded for review, not auto-graded
  END IF;

  SELECT COALESCE(MAX(a.attempt_number), 0) + 1 INTO n FROM public.question_attempts a
    WHERE a.user_id = auth.uid() AND a.question_id = _question_id;
  INSERT INTO public.question_attempts (user_id, question_id, answer, is_correct, score, attempt_number, time_spent_seconds)
  VALUES (auth.uid(), _question_id, _answer, ok, CASE WHEN ok THEN q.points ELSE 0 END, n, _time_spent);

  RETURN QUERY SELECT ok, n, k.correct_options, k.accepted_answers, k.explanation, k.solution;
END $$;
REVOKE ALL ON FUNCTION public.submit_practice_answer(UUID, JSONB, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_practice_answer(UUID, JSONB, INT) TO authenticated;

-- Review a question the learner has ALREADY attempted (answer + explanation), never before.
CREATE OR REPLACE FUNCTION public.practice_review(_question_id UUID)
RETURNS TABLE (correct_options INT[], accepted_answers TEXT[], explanation TEXT, solution TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT k.correct_options, k.accepted_answers, k.explanation, k.solution
  FROM public.practice_answer_keys k
  WHERE k.question_id = _question_id
    AND EXISTS (SELECT 1 FROM public.question_attempts a WHERE a.user_id = auth.uid() AND a.question_id = _question_id);
$$;
REVOKE ALL ON FUNCTION public.practice_review(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.practice_review(UUID) TO authenticated;

-- =====================================================================
-- RESOURCES
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.course_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses ON DELETE CASCADE,
  module_id UUID REFERENCES public.course_modules ON DELETE SET NULL,
  lesson_id UUID REFERENCES public.lessons ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('pdf','notes','cheat_sheet','external_link','code_repository','dataset','template','presentation','recording')),
  url TEXT,                    -- external / public URL
  file_path TEXT,              -- Supabase Storage path in private bucket 'course-resources'
  is_downloadable BOOLEAN NOT NULL DEFAULT true,
  is_published BOOLEAN NOT NULL DEFAULT false,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (url IS NOT NULL OR file_path IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS course_resources_course_idx ON public.course_resources (course_id, order_index);
ALTER TABLE public.course_resources ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_resources TO authenticated;
CREATE POLICY "resources read: published + course access" ON public.course_resources FOR SELECT TO authenticated
  USING ((is_published AND public.can_access_course(course_id)) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "resources admin" ON public.course_resources FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =====================================================================
-- NOTES (course-level, many per lesson, optional video timestamp).
-- The legacy lesson_notes table (one note per lesson, used by the old app)
-- is left untouched; its rows are copied here once.
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.learner_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.lessons ON DELETE SET NULL,
  video_timestamp_seconds INT CHECK (video_timestamp_seconds IS NULL OR video_timestamp_seconds >= 0),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 10000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS learner_notes_user_course_idx ON public.learner_notes (user_id, course_id, created_at DESC);
ALTER TABLE public.learner_notes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learner_notes TO authenticated;
CREATE POLICY "own notes" ON public.learner_notes FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER learner_notes_updated BEFORE UPDATE ON public.learner_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.learner_notes (user_id, course_id, lesson_id, content, created_at, updated_at)
SELECT n.user_id, m.course_id, n.lesson_id, n.body, n.created_at, n.updated_at
FROM public.lesson_notes n
JOIN public.lessons l ON l.id = n.lesson_id
JOIN public.course_modules m ON m.id = l.module_id
WHERE length(trim(n.body)) > 0
  AND NOT EXISTS (SELECT 1 FROM public.learner_notes x WHERE x.user_id = n.user_id AND x.lesson_id = n.lesson_id);

-- =====================================================================
-- LEARNING PLAN (rules-based; one per learner per course)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.learning_plans (
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses ON DELETE CASCADE,
  target_date DATE NOT NULL,
  hours_per_day NUMERIC(3,1) NOT NULL CHECK (hours_per_day > 0 AND hours_per_day <= 12),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, course_id)
);
ALTER TABLE public.learning_plans ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_plans TO authenticated;
CREATE POLICY "own plans" ON public.learning_plans FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
