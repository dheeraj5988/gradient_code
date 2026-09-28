-- =====================================================================
-- TEMPLATE: add practice topics, questions, answer keys and resources to a
-- REAL course until the admin panel exists (Phase 8).
-- Run in Supabase → SQL editor. Replace the slug and content below.
-- Answer keys go in practice_answer_keys, which students can never read.
-- =====================================================================
DO $$
DECLARE
  c UUID := (SELECT id FROM public.courses WHERE slug = 'full-stack-web-development-with-ai-ml');  -- ← your course slug
  t_html UUID; t_js UUID; q UUID;
BEGIN
  IF c IS NULL THEN RAISE EXCEPTION 'course slug not found'; END IF;

  INSERT INTO public.course_topics (course_id, name, slug, order_index) VALUES (c, 'HTML', 'html', 0)
    ON CONFLICT (course_id, slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO t_html;
  INSERT INTO public.course_topics (course_id, name, slug, order_index) VALUES (c, 'JavaScript', 'javascript', 1)
    ON CONFLICT (course_id, slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO t_js;

  -- Multiple choice (correct_options are 0-based indexes into options)
  INSERT INTO public.practice_questions (course_id, topic_id, title, slug, prompt, type, difficulty, options, hint, day_number, order_index, is_published)
  VALUES (c, t_html, 'Semantic navigation', 'semantic-nav', 'Which element should wrap a site''s primary navigation links?', 'mcq', 'easy',
          ARRAY['<div>', '<nav>', '<section>', '<menu>'], 'Think about HTML5 landmarks.', 1, 0, true)
  RETURNING id INTO q;
  INSERT INTO public.practice_answer_keys (question_id, correct_options, explanation)
  VALUES (q, ARRAY[1], '<nav> is the landmark element for major navigation blocks.');

  -- True / false (0 = True, 1 = False)
  INSERT INTO public.practice_questions (course_id, topic_id, title, slug, prompt, type, difficulty, options, day_number, order_index, is_published)
  VALUES (c, t_html, 'Decorative images', 'decorative-alt', 'Decorative images should use alt="".', 'true_false', 'easy', ARRAY['True', 'False'], 1, 1, true)
  RETURNING id INTO q;
  INSERT INTO public.practice_answer_keys (question_id, correct_options, explanation) VALUES (q, ARRAY[0], 'Empty alt tells screen readers to skip it.');

  -- Short answer / output prediction (accepted_answers compared case- and space-insensitively)
  INSERT INTO public.practice_questions (course_id, topic_id, title, slug, prompt, type, difficulty, day_number, order_index, is_published)
  VALUES (c, t_js, 'typeof null', 'typeof-null', E'What does this print?\n\nconsole.log(typeof null);', 'output_prediction', 'medium', 2, 2, true)
  RETURNING id INTO q;
  INSERT INTO public.practice_answer_keys (question_id, accepted_answers, explanation) VALUES (q, ARRAY['object'], 'A historical quirk of JavaScript.');

  -- Interview question (category = interview; no answer key needed)
  INSERT INTO public.practice_questions (course_id, topic_id, category, role, title, slug, prompt, type, difficulty, order_index, is_published)
  VALUES (c, t_js, 'interview', 'Frontend developer', 'Explain the event loop', 'event-loop', 'Explain how the event loop handles the call stack, microtasks and macrotasks.', 'scenario', 'medium', 0, true);

  -- Resource (external link). For private files, upload to Storage bucket "course-resources" and set file_path instead of url.
  INSERT INTO public.course_resources (course_id, title, description, resource_type, url, is_downloadable, is_published, order_index)
  VALUES (c, 'MDN HTML reference', 'Official reference for every HTML element.', 'external_link', 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element', false, true, 0);
END $$;

-- Private resource files: create the bucket once (Storage → New bucket → "course-resources", NOT public).
-- The app issues 10-minute signed URLs only after RLS confirms the learner can read the resource row.
