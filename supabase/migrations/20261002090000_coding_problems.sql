-- =====================================================================
-- Coding problem sheet: external practice problems (LeetCode, HackerRank…)
-- per course/module, with per-learner "solved" tracking.
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.coding_problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.course_modules(id) ON DELETE SET NULL,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 2 AND 200),
  platform TEXT NOT NULL DEFAULT 'leetcode' CHECK (platform IN ('leetcode','hackerrank','geeksforgeeks','codeforces','other')),
  url TEXT NOT NULL CHECK (url ~ '^https://[^\s]+$'),
  difficulty TEXT CHECK (difficulty IN ('easy','medium','hard')),
  order_index INT NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (course_id, url)
);
CREATE INDEX IF NOT EXISTS coding_problems_course_idx ON public.coding_problems (course_id, order_index);

ALTER TABLE public.coding_problems ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.coding_problems FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coding_problems TO authenticated;
DROP POLICY IF EXISTS "coding problems read: enrolled or admin" ON public.coding_problems;
CREATE POLICY "coding problems read: enrolled or admin" ON public.coding_problems FOR SELECT TO authenticated
  USING ((is_published AND public.can_access_course(course_id)) OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "coding problems admin" ON public.coding_problems;
CREATE POLICY "coding problems admin" ON public.coding_problems FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.coding_problem_progress (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  problem_id UUID NOT NULL REFERENCES public.coding_problems(id) ON DELETE CASCADE,
  solved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, problem_id)
);
ALTER TABLE public.coding_problem_progress ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.coding_problem_progress FROM anon;
GRANT SELECT, INSERT, DELETE ON public.coding_problem_progress TO authenticated;
DROP POLICY IF EXISTS "problem progress read own" ON public.coding_problem_progress;
CREATE POLICY "problem progress read own" ON public.coding_problem_progress FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
-- A learner can only tick problems they can actually see (published + course access).
DROP POLICY IF EXISTS "problem progress insert own" ON public.coding_problem_progress;
CREATE POLICY "problem progress insert own" ON public.coding_problem_progress FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.coding_problems p WHERE p.id = problem_id AND p.is_published AND public.can_access_course(p.course_id)));
DROP POLICY IF EXISTS "problem progress delete own" ON public.coding_problem_progress;
CREATE POLICY "problem progress delete own" ON public.coding_problem_progress FOR DELETE TO authenticated
  USING (user_id = auth.uid());
