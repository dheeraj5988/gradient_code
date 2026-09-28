-- =====================================================================
-- GRADIENT CODE: MASTER PRODUCTION DATABASE SCHEMA
-- =====================================================================
-- Target: Completely empty Supabase PostgreSQL database
--
-- This file compiles all repository migrations into a single, cohesive,
-- idempotent bootstrap script:
--   - Exactly 37 public application tables
--   - 83 Row Level Security (RLS) policies
--   - 10 database functions & secure RPC endpoints
--   - 8 triggers (automatic updated_at timestamps, ratings calculation)
--   - 5 custom enum types
--   - B-tree and partial indexes for high query performance
--   - Core production seed data:
--       * 2 flagship masterclass courses (270 lessons across 29 modules)
--       * 3 instructors, 3 internships, 4 coupons
--
-- Execution instructions:
--   1. Open Supabase Dashboard -> SQL Editor
--   2. Paste the full contents of this file
--   3. Click "Run"
-- =====================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- =====================================================================
-- SECTION 1: BASE TYPES, SCHEMAS & UTILITIES
-- Source: 20260814195317_6f814be6-1441-4b33-820a-90fbe4c574d1.sql
-- =====================================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('student','employee','admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.employee_role AS ENUM ('support','mentor','instructor','content_editor');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.lesson_type AS ENUM ('video','text','live');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.access_policy AS ENUM ('lifetime','days');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Timestamp update trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Table 1: profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  avatar_url TEXT,
  phone TEXT,
  bio TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  must_change_password BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Table 2: user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Role check function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- Table 3: employee_permissions
CREATE TABLE IF NOT EXISTS public.employee_permissions (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  employee_roles public.employee_role[] NOT NULL DEFAULT '{}',
  can_manage_courses BOOLEAN NOT NULL DEFAULT false,
  can_answer_forum BOOLEAN NOT NULL DEFAULT false,
  can_reply_messages BOOLEAN NOT NULL DEFAULT false,
  can_issue_certificates BOOLEAN NOT NULL DEFAULT false,
  can_manage_assignments BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.employee_permissions TO authenticated;
GRANT ALL ON public.employee_permissions TO service_role;
ALTER TABLE public.employee_permissions ENABLE ROW LEVEL SECURITY;

-- Profiles & roles policies
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'employee'));
CREATE POLICY "own profile write" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "roles read" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "perms read" ON public.employee_permissions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- Trigger: profiles updated_at
DROP TRIGGER IF EXISTS profiles_updated ON public.profiles;
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auth user bootstrap trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Table 4: courses
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  thumbnail_url TEXT,
  track TEXT NOT NULL DEFAULT 'General',
  price NUMERIC NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_crash_course BOOLEAN NOT NULL DEFAULT false,
  access_policy public.access_policy NOT NULL DEFAULT 'lifetime',
  access_days INTEGER,
  instructor_name TEXT,
  instructor_bio TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.courses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage courses" ON public.courses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP TRIGGER IF EXISTS courses_updated ON public.courses;
CREATE TRIGGER courses_updated BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table 5: course_modules
CREATE TABLE IF NOT EXISTS public.course_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.course_modules TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_modules TO authenticated;
GRANT ALL ON public.course_modules TO service_role;
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff manage modules" ON public.course_modules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.employee_permissions p WHERE p.user_id = auth.uid() AND p.can_manage_courses))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.employee_permissions p WHERE p.user_id = auth.uid() AND p.can_manage_courses));

-- Table 6: lessons
CREATE TABLE IF NOT EXISTS public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.course_modules ON DELETE CASCADE,
  title TEXT NOT NULL,
  type public.lesson_type NOT NULL DEFAULT 'video',
  video_url TEXT,
  content_text TEXT,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_free_preview BOOLEAN NOT NULL DEFAULT false,
  live_at TIMESTAMPTZ,
  join_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lessons TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lessons TO authenticated;
GRANT ALL ON public.lessons TO service_role;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff manage lessons" ON public.lessons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.employee_permissions p WHERE p.user_id = auth.uid() AND p.can_manage_courses))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.employee_permissions p WHERE p.user_id = auth.uid() AND p.can_manage_courses));

-- Table 7: enrollments
CREATE TABLE IF NOT EXISTS public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  source TEXT NOT NULL DEFAULT 'manual_grant',
  UNIQUE (user_id, course_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enrollments TO authenticated;
GRANT ALL ON public.enrollments TO service_role;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own enrollments" ON public.enrollments FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'employee'));
CREATE POLICY "admin manage enrollments" ON public.enrollments FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin delete enrollments" ON public.enrollments FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- Table 8: lesson_progress
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_progress TO authenticated;
GRANT ALL ON public.lesson_progress TO service_role;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own progress read" ON public.lesson_progress FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'employee'));
CREATE POLICY "own progress delete" ON public.lesson_progress FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Table 9: certificates
CREATE TABLE IF NOT EXISTS public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses ON DELETE CASCADE,
  certificate_number TEXT NOT NULL UNIQUE DEFAULT ('GC-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  pdf_url TEXT,
  UNIQUE (user_id, course_id)
);
GRANT SELECT, INSERT, DELETE ON public.certificates TO authenticated;
GRANT ALL ON public.certificates TO service_role;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own certificates" ON public.certificates FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin revoke certificate" ON public.certificates FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- Table 10: forum_questions
CREATE TABLE IF NOT EXISTS public.forum_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  assigned_to UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.forum_questions TO authenticated;
GRANT ALL ON public.forum_questions TO service_role;
ALTER TABLE public.forum_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "forum q read" ON public.forum_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "forum q insert" ON public.forum_questions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "forum q update" ON public.forum_questions FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.employee_permissions p WHERE p.user_id = auth.uid() AND p.can_answer_forum))
  WITH CHECK (true);
CREATE POLICY "forum q delete" ON public.forum_questions FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- Table 11: forum_answers
CREATE TABLE IF NOT EXISTS public.forum_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.forum_questions ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.forum_answers TO authenticated;
GRANT ALL ON public.forum_answers TO service_role;
ALTER TABLE public.forum_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "forum a read" ON public.forum_answers FOR SELECT TO authenticated USING (true);
CREATE POLICY "forum a insert" ON public.forum_answers FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "forum a modify" ON public.forum_answers FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "forum a delete" ON public.forum_answers FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- Table 12: assignments
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assignments TO authenticated;
GRANT ALL ON public.assignments TO service_role;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assignments read" ON public.assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "assignments manage" ON public.assignments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.employee_permissions p WHERE p.user_id = auth.uid() AND p.can_manage_assignments))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.employee_permissions p WHERE p.user_id = auth.uid() AND p.can_manage_assignments));

-- Table 13: assignment_submissions
CREATE TABLE IF NOT EXISTS public.assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  file_url TEXT,
  note TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  grade TEXT,
  feedback TEXT,
  UNIQUE (assignment_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assignment_submissions TO authenticated;
GRANT ALL ON public.assignment_submissions TO service_role;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "submissions read" ON public.assignment_submissions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.employee_permissions p WHERE p.user_id = auth.uid() AND p.can_manage_assignments));
CREATE POLICY "submissions insert" ON public.assignment_submissions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "submissions update" ON public.assignment_submissions FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.employee_permissions p WHERE p.user_id = auth.uid() AND p.can_manage_assignments))
  WITH CHECK (true);

-- Table 14: ebooks
CREATE TABLE IF NOT EXISTS public.ebooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  cover_url TEXT,
  file_url TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ebooks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ebooks TO authenticated;
GRANT ALL ON public.ebooks TO service_role;
ALTER TABLE public.ebooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ebooks read" ON public.ebooks FOR SELECT USING (true);
CREATE POLICY "ebooks manage" ON public.ebooks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Table 15: bootcamps
CREATE TABLE IF NOT EXISTS public.bootcamps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  thumbnail_url TEXT,
  cohort_start_date DATE,
  seats_total INTEGER NOT NULL DEFAULT 0,
  seats_filled INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bootcamps TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bootcamps TO authenticated;
GRANT ALL ON public.bootcamps TO service_role;
ALTER TABLE public.bootcamps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bootcamps read" ON public.bootcamps FOR SELECT USING (true);
CREATE POLICY "bootcamps manage" ON public.bootcamps FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Table 16: messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL DEFAULT gen_random_uuid(),
  sender_id UUID,
  recipient_id UUID,
  course_id UUID REFERENCES public.courses ON DELETE SET NULL,
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  is_broadcast BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ,
  resolved BOOLEAN NOT NULL DEFAULT false
);
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages read" ON public.messages FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid() OR is_broadcast OR public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.employee_permissions p WHERE p.user_id = auth.uid() AND p.can_reply_messages));
CREATE POLICY "messages insert" ON public.messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());
CREATE POLICY "messages update" ON public.messages FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid() OR sender_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.employee_permissions p WHERE p.user_id = auth.uid() AND p.can_reply_messages))
  WITH CHECK (true);

-- Table 17: orders
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses ON DELETE SET NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'created',
  refund_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders read" ON public.orders FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "orders insert" ON public.orders FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- Table 18: job_openings
CREATE TABLE IF NOT EXISTS public.job_openings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  department TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT 'Remote',
  description TEXT NOT NULL DEFAULT '',
  is_open BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.job_openings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_openings TO authenticated;
GRANT ALL ON public.job_openings TO service_role;
ALTER TABLE public.job_openings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jobs manage" ON public.job_openings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Table 19: contact_submissions
CREATE TABLE IF NOT EXISTS public.contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  job_id UUID REFERENCES public.job_openings ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.contact_submissions TO anon;
GRANT SELECT, INSERT, UPDATE ON public.contact_submissions TO authenticated;
GRANT ALL ON public.contact_submissions TO service_role;
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can contact" ON public.contact_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "admins read contact" ON public.contact_submissions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- Table 20: activity_log
CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own activity" ON public.activity_log FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "log own activity" ON public.activity_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Initial base demo catalog courses
INSERT INTO public.courses (id, title, slug, description, track, price, is_published, is_crash_course, instructor_name, instructor_bio, thumbnail_url) VALUES
 ('11111111-1111-1111-1111-111111111111','Full Stack Web Development','full-stack-web-development','Go from HTML basics to deploying production React + Node applications. Build 4 real projects along the way.','Full Stack Development',14999,true,false,'Shubham Vashistha','Engineer and founder of Gradient Code with 8+ years shipping production web apps.',null),
 ('22222222-2222-2222-2222-222222222222','Data Science & AI Foundations','data-science-ai-foundations','Python, pandas, machine learning and a capstone AI project you can show recruiters.','Data Science & AI',17999,true,false,'Aarav Mehta','Data scientist working on ML systems at scale.',null),
 ('33333333-3333-3333-3333-333333333333','Cloud & DevOps Essentials','cloud-devops-essentials','Docker, CI/CD, AWS fundamentals and infrastructure as code.','Cloud & DevOps',13999,true,false,'Neha Kapoor','DevOps lead automating deployments for high-traffic platforms.',null),
 ('44444444-4444-4444-4444-444444444444','Git & GitHub Crash Course','git-github-crash-course','Ship confidently with branches, pull requests and clean commit history in under two hours.','Full Stack Development',499,true,true,'Shubham Vashistha','Engineer and founder of Gradient Code.',null),
 ('55555555-5555-5555-5555-555555555555','Cybersecurity Fundamentals','cybersecurity-fundamentals','Threat modelling, secure coding and hands-on labs with real vulnerabilities.','Cybersecurity',15999,true,false,'Imran Sheikh','Security engineer and CTF player.',null)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.course_modules (id, course_id, title, order_index) VALUES
 ('aaaaaaa1-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Getting Started',0),
 ('aaaaaaa1-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','React Fundamentals',1),
 ('aaaaaaa1-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','Backend & Deployment',2),
 ('aaaaaaa2-0000-0000-0000-000000000001','22222222-2222-2222-2222-222222222222','Python for Data',0),
 ('aaaaaaa2-0000-0000-0000-000000000002','22222222-2222-2222-2222-222222222222','Machine Learning',1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lessons (module_id, title, type, video_url, content_text, duration_seconds, order_index, is_free_preview) VALUES
 ('aaaaaaa1-0000-0000-0000-000000000001','How this course works','video','https://cdn.gpteng.co/placeholder.mp4','Welcome to the course. Here is how to get the most out of it.',420,0,true),
 ('aaaaaaa1-0000-0000-0000-000000000001','Setting up your dev environment','video',null,'Install Node, VS Code and Git.',900,1,false),
 ('aaaaaaa1-0000-0000-0000-000000000001','Reading: How the web works','text',null,'A request leaves your browser, hits DNS, reaches a server, and HTML comes back. Understanding this cycle makes every later topic easier.',300,2,false),
 ('aaaaaaa1-0000-0000-0000-000000000002','Components and props','video',null,'Composing UI from small pieces.',1500,0,false),
 ('aaaaaaa1-0000-0000-0000-000000000002','State and effects','video',null,'Managing changing data over time.',1800,1,false),
 ('aaaaaaa1-0000-0000-0000-000000000002','Live doubt session','live',null,'Weekly live Q&A with the instructor.',3600,2,false),
 ('aaaaaaa1-0000-0000-0000-000000000003','Building a REST API','video',null,'Routes, controllers and validation.',2100,0,false),
 ('aaaaaaa1-0000-0000-0000-000000000003','Shipping to production','video',null,'Deploy, monitor, iterate.',1200,1,false),
 ('aaaaaaa2-0000-0000-0000-000000000001','NumPy and pandas basics','video',null,'Working with tabular data.',1700,0,true),
 ('aaaaaaa2-0000-0000-0000-000000000001','Cleaning messy datasets','video',null,'Real data is never tidy.',1400,1,false),
 ('aaaaaaa2-0000-0000-0000-000000000002','Your first model','video',null,'Train, evaluate, iterate.',2000,0,false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.assignments (course_id, title, description) VALUES
 ('11111111-1111-1111-1111-111111111111','Build a portfolio page','Ship a responsive personal portfolio and submit the deployed link.'),
 ('22222222-2222-2222-2222-222222222222','Clean a public dataset','Pick any Kaggle dataset, clean it and submit your notebook.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.ebooks (title, category) VALUES
 ('The Gradient Code Interview Handbook','Career'),
 ('50 JavaScript Patterns You Should Know','Full Stack Development')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.bootcamps (title, description, cohort_start_date, seats_total, seats_filled) VALUES
 ('Full Stack Career Bootcamp','12-week live cohort with mentors, mock interviews and placement support.','2026-09-01',40,26)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.job_openings (title, department, location, description) VALUES
 ('Instructor — Data Science','Teaching','Remote (India)','Design and deliver our data science curriculum.'),
 ('Community & Support Associate','Support','Delhi NCR / Hybrid','Be the first response for our learners.')
ON CONFLICT (id) DO NOTHING;

-- =====================================================================
-- SECTION 2: HARDENED READ POLICIES & SECURITY
-- Source: 20260814195351_9cdb4e9b-6b0b-4b02-8810-6b3a5405e670.sql
-- =====================================================================

CREATE POLICY "anon read published courses" ON public.courses FOR SELECT TO anon
  USING (is_published);
CREATE POLICY "auth read courses" ON public.courses FOR SELECT TO authenticated
  USING (is_published OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'employee'));

CREATE POLICY "anon read modules" ON public.course_modules FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.is_published));
CREATE POLICY "auth read modules" ON public.course_modules FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND (c.is_published OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'employee'))));

CREATE POLICY "anon read jobs" ON public.job_openings FOR SELECT TO anon
  USING (is_open);
CREATE POLICY "auth read jobs" ON public.job_openings FOR SELECT TO authenticated
  USING (is_open OR public.has_role(auth.uid(),'admin'));

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;

-- =====================================================================
-- SECTION 3: ROLE & CONTACT ADMINISTRATION
-- Source: 20260818200325_aba48fc3-c516-42db-802b-024bc7bea3df.sql
-- =====================================================================

CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins update contact" ON public.contact_submissions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================================================================
-- SECTION 4: LESSON NOTES
-- Source: 20260818204035_06c0c2c7-e4fe-416a-a0c3-46d0e71c8b20.sql
-- =====================================================================

-- Table 21: lesson_notes
CREATE TABLE IF NOT EXISTS public.lesson_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_notes TO authenticated;
GRANT ALL ON public.lesson_notes TO service_role;
ALTER TABLE public.lesson_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own lesson notes" ON public.lesson_notes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS lesson_notes_updated ON public.lesson_notes;
CREATE TRIGGER lesson_notes_updated BEFORE UPDATE ON public.lesson_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- SECTION 5: FULL STACK WEB DEVELOPMENT WITH AI & ML INTEGRATION
-- Sources:
--   - 20260908223535_c8d1d064-6174-4a4a-a61a-93582377dbd6.sql
--   - 20260908223801_8d4b84f3-768b-43e3-bd5a-0f790a6d64ad.sql
--   - 20260908224003_b6d61994-393f-4dbd-9131-a55f96540d5e.sql
--   - 20260908224152_904336b2-5d9b-408c-8a36-7b4b032b4bc8.sql
-- =====================================================================

DELETE FROM public.courses WHERE slug = 'full-stack-web-development-with-ai-ml';

WITH c AS (
  INSERT INTO public.courses (title, slug, description, track, price, thumbnail_url, instructor_name, instructor_bio, is_published, is_crash_course, access_policy, access_days)
  VALUES (
    'Full Stack Web Development with AI & ML Integration',
    'full-stack-web-development-with-ai-ml',
    'A complete, project-based journey from your first HTML page to deploying AI-powered web apps. Learn HTML5, CSS3, Bootstrap, JavaScript and the DOM, Git and version control, Python and Django, then move into data science, machine learning, deep learning and convolutional neural networks - and integrate trained models into real Django apps hosted with Nginx, Gunicorn and AWS. No coding or maths background needed: 225 video lessons, downloadable code and datasets, and a certificate on completion.',
    'Web Development', 6999, NULL,
    'Gradient Code Faculty',
    'Full-stack engineer and machine learning practitioner who teaches by building real, deployable products.',
    true, false, 'lifetime', NULL)
  RETURNING id
)
INSERT INTO public.course_modules (course_id, title, order_index)
SELECT c.id, x.t, x.i FROM c, (VALUES
('Introduction',0),
('History of the Web',1),
('How the Internet Works',2),
('HTML5',3),
('Advanced HTML5',4),
('CSS',5),
('Advanced CSS',6),
('Bootstrap 4 — Front-End Mastery',7),
('Build a Startup Landing Page',8),
('CSS Grid & Layout',9),
('JavaScript',10),
('The Document Object Model (DOM)',11),
('Advanced JavaScript',12),
('Developer Lifeline — Git & Version Control',13),
('Python — The Most Powerful Language',14),
('Django Basic Level',15),
('Fundamentals of Data Science',16),
('Machine Learning',17),
('Django Part 2 — Advanced',18),
('Deep Learning Neural Nets',19),
('Convolutional Neural Networks (CNN)',20)
) AS x(t,i);


INSERT INTO public.lessons (module_id, title, type, video_url, content_text, duration_seconds, order_index, is_free_preview)
SELECT m.id, l.title,
  (CASE WHEN l.k = 'v' THEN 'video' ELSE 'text' END)::public.lesson_type,
  CASE WHEN l.k = 'v' THEN 'https://drive.google.com/file/d/' || l.fid || '/preview' END,
  CASE WHEN l.k = 't' THEN 'Source file for this lesson.' || chr(10) || chr(10) || 'Open or download: https://drive.google.com/file/d/' || l.fid || '/view'
       WHEN l.k = 'f' THEN l.extra || chr(10) || chr(10) || 'Open the folder: https://drive.google.com/drive/folders/' || l.fid END,
  CASE WHEN l.k = 'v' THEN 600 ELSE 120 END,
  l.li,
  (l.mi = 0 AND l.li = 0)
FROM (VALUES
(0,0,'v','What is a Browser','1k8KbPeO8gXEjp7emiGGFTgkCo2TjoZSZ',NULL),
(0,1,'v','Web Browsing','1x2oEhhg38SVLTNevSWWsn9M6n7a1Bb5j',NULL),
(1,0,'v','WWW vs Internet, and CSS, HTML & Java','1Qhn45pKEtnO3nVsghxumfTU9jRPGtUc2',NULL),
(1,1,'v','Web Developer Fundamentals II','1K0O2ZRmvUz34tWCAJhGImsd6Uvl3OBN6',NULL),
(2,0,'v','Backbone of the Internet','1-gSIHKnHOp9l_iJb3Wunh0rJcOc3kAq9',NULL),
(2,1,'v','Traceroute','1ZftlEhp5u9Ke0suSmCWYtLy4DxB1XrjG',NULL),
(2,2,'v','Web Developer Fundamentals','1wxVlrULgAxGThhLLf4LLNTp3G4DlOi9H',NULL),
(2,3,'v','Front End vs Back End','13myMygwNKY0-GJQF4qHDWWPFIdNxMchk',NULL),
(3,0,'v','Build Your First Website','1vXlzdFzyi2Ww_g5x_lufruElya3wiDvN',NULL),
(3,1,'v','Web Developer Fundamentals III','1byWgyAI_3ce36Bn9Vf6ywjBWHUxTwG4v',NULL),
(3,2,'v','Web Developer Fundamentals IV','11bYYvcU-25hpgEuIQt05SkRkqODZujA8',NULL),
(3,3,'v','HTML Tags','1flyhcnth1J5AGJl8Xb1MbTcmw82B-25d',NULL),
(3,4,'v','HTML Tags II','1PcppemKAjE3xMZRK8UWMaANjqkUNwXAs',NULL),
(3,5,'v','Self-Closing Tags','1HOIqFlFh7yzFylvJ7MRmIDbcMREbLd3w',NULL),
(3,6,'v','Anchor Tags','1ub7PKHY4dWc2NXD_dnsR7arN7NZGQ0Mq',NULL),
(3,7,'v','Some FAQs','1ZG3J4kZ7fRDBvWwR1KX84CFSyGQ2QHkd',NULL),
(4,0,'v','Building a Form in HTML — Part 1','1BB7so4eE8SOHnvdsr6cj34hvS82bUCJX',NULL),
(4,1,'v','Building a Form in HTML — Part 2','1-c_luLtCJRRTUoMUns3U1FcQnu_s-gep',NULL),
(4,2,'v','HTML Tags III','1HbDQirBvZ-dk5lcZ5-HZv_1CfGXz3BIl',NULL),
(4,3,'v','Submitting a Form','1JWPvs7Gl-tZHSNdtJnV-FOgU362r-Jw3',NULL),
(4,4,'v','HTML vs HTML5','1VUbTPW10yT-28SJOgYgzVEsaNQVQP_p_',NULL),
(4,5,'v','Copying a Website from Google','1AUyDHO32xUv0lsZt6v4dt5cI6rOFBpWw',NULL),
(5,0,'v','Your First CSS','1Dm4Ghj4KSaGaZpv_zoIfF4r5oV3IOzxf',NULL),
(5,1,'t','Code: About.html','1EcOSW3-fv19EAWdGqsLyuQI_bNeMzQ1e',NULL),
(5,2,'t','Code: index.html','1CJMt4XWDcTRMk46RxJ5m0qA13RDJXEHX',NULL),
(5,3,'t','Code: login.html','1BtvYz8uofAQRuI1GrNfeqi_LAwuMPEsQ',NULL),
(5,4,'v','CSS Styling','1GjqEq8oemD4QO1bfYcNyjqEsRhoH6gzV',NULL),
(5,5,'v','CSS Properties','1_HJkKwQIPdmD7kp_RMuaTSsBsgmgVeDG',NULL),
(5,6,'v','CSS Selectors','1ogpewbrs0My_LxT-9-EpyxHMUTbOhyQS',NULL),
(5,7,'v','Text and Fonts in CSS','1lQYJoYqH5nPUn_lfxuUsiqjkoE5sbs-L',NULL),
(5,8,'v','Images in CSS','1GePjiq9967XaOt32TzXJbZdP65c9J_hC',NULL),
(5,9,'v','The Box Model','1uWAcYAz7mYNSiPaW14CKMdAmc665hkt8',NULL),
(5,10,'v','px vs em vs rem','1FpkLgLPywbxdgCK17FSCmOtgSKa0nsy5',NULL),
(6,0,'v','Critical Render Path','1x8rIDJCkDcoe4z3fhGVr9DH0ldFUmsUE',NULL),
(6,1,'v','Flexbox — Part 1','1d-ldH8jGSwNUo_tsXAWNXFKUs4CzHokB',NULL),
(6,2,'v','Flexbox — Part 2','1GFuMDcfQUrZK65gnuorbXHbmMofmD19x',NULL),
(6,3,'t','Image URLs','1T4n0IjAnP5MakFO3ZBvNrxcNO1pPY5o4',NULL),
(6,4,'v','What is CSS3','1YvIyiDmW70sTMtPfr5WEaCtqIPISNSLe',NULL),
(6,5,'v','Responsive Websites and UI','18WxRnvyz9CMnN-XiQ1jo2QEFyFmwAPgb',NULL),
(7,0,'f','Bootstrap Grid Features (resources)','15LBFm-GjDnVLbi1wsBn80xWjIP61486U','Files: index.html, index1.html, style.css, style1.css'),
(7,1,'v','Bootstrap 4','1GjAwyb0SB_5E25OFMP8SSCIaOga2YnVI',NULL),
(7,2,'v','Using Bootstrap','1_ZaCR5sJJKLsRgg-hMM41enUckuBILar',NULL),
(7,3,'v','Bootstrap Grid Features','1NuB-3zrDVzPjN-2HjbMwyL99k79KN20L',NULL),
(8,0,'f','Project Landing Page (resources)','1R3PnVKmLRbFC9D8eH5OKI4lvtPIJX3ew','Files: header.jpg, index.html, style.css'),
(8,1,'f','Putting Your Website on the Internet (resources)','1W8jaUrW-iNmwJONV7yMp6zuztZ1Z-jvD','Files: GITHUB LINK.txt, header.jpg, index.html, style.css'),
(8,2,'v','Project Landing Page','1-XpiPKE68_dPnJwrWeDOefsDMBXAW-qK',NULL),
(8,3,'v','Startup Landing Page — Part 1','1TPKvUsXmgFD9w6NkcFW9D3LT1_YlDoUy',NULL),
(8,4,'v','Startup Landing Page — Part 2','1YPn3p2id_1k_UqIugCnXX78v6bof6bpj',NULL),
(8,5,'v','Startup Landing Page — Part 3','1B8pbGw5mR7ampfdhfJO6t-rMwj48-UXh',NULL),
(8,6,'v','Startup Landing Page — Part 4','1xnVqv80Xv_JNKAq70tbGY9rz92BOnGRt',NULL),
(8,7,'v','Adding an Email Subscribe Form','1T0zAX1Mqx4G-iXT7DpOfSf2Qp4pvo-vu',NULL),
(8,8,'v','Putting Your Website on the Internet','1fimnwZO3-1gYvjr5sv4iNWSEYJaAsXXc',NULL),
(8,9,'v','Putting Your Website Online — Method 2','15JzWUR49L4LFYETUaxkGJdZW9i_WQAnI',NULL),
(8,10,'v','Developer Fundamentals','104PhnRMt2GyEf4T-MJZUlC0egHn6OG_Y',NULL),
(8,11,'v','Using Templates','13hLUHSP1XArftwNxI3sHQ5OYQiiyDXTd',NULL),
(9,0,'f','CSS Grid 1 (resources)','1qlhlF1JItHDflW-l0skf2eX2LeD29oPU','Files: index.html, style.css'),
(9,1,'f','Finished Website (resources)','1LawqISouy7O-C0kg8QDDfND7qyqHFY7g','Files: 1.png, 2.png, 3.png, 4.png, 5.png, 6.png, 7.png, 8.png, index.html, style.css, undraw.png'),
(9,2,'v','Section Introduction','1L9Xr1e_IGeYomMlWc344vtBKZPoL98dz',NULL),
(9,3,'v','CSS Grid vs Flexbox vs Bootstrap','1nZNlG5iwyryMRcs0KbOSy2pV5LFEA3F-',NULL),
(9,4,'v','CSS Grid 1','1fsB4SKuPWdJvK9El3Fdwyj--D99Hy1mE',NULL),
(9,5,'t','Lecture Resources','1SQwXApFO3Amev-HYlI-i8OFGuhagaO7e',NULL),
(9,6,'v','CSS Grid 2','1QozmwjRWFpxM_0KUpceoAjKxEjrikQjy',NULL),
(9,7,'v','CSS Grid 3','11gsbbliQRXOK0VJnXrq89dMV62YRGWmw',NULL),
(9,8,'v','CSS Grid 4','16sRWvFMBd3y61FY-DghZhJQO9F_u3rPe',NULL),
(9,9,'v','CSS Grid 5','1okHRAsr7bS116uS141Wh3y2Qf0JkdNBB',NULL),
(9,10,'v','Building a Real Website — Part 1','1Zv0lqurhg6NYwKmL2-K80SVnMzi-fBht',NULL),
(9,11,'v','Building a Real Website — Part 2','109YBHLnHZiL1KzXfRmMKss__m5lX_RQD',NULL),
(9,12,'v','Building a Real Website — Part 3','1zu_OuQJPZr3yXfNxj143p9CXXSk-NPEW',NULL),
(9,13,'v','Building a Real Website — Part 4','1jMZXneZ26Q3Y8mvEdwhvykPFCjLDqxE9',NULL),
(9,14,'v','Adding Some Beauty to the Website','12mv-JpQWzYxyYxY6yv-oGOgmHIB2CM-3',NULL),
(10,0,'f','All code used in this section (resources)','1Yc0rXyTH-kNa3AVyLhUoVBqmHC_Z52fA','Files: index.html, java.js'),
(10,1,'v','Developer Fundamentals','1_Mk-MgY2HuifvzLgOFJI1UMZP0PDTOYH',NULL),
(10,2,'v','Introduction to JavaScript','1L1QvDHookN7YC5l1ZFXvxKR6YfSVz8xF',NULL),
(10,3,'v','Writing Your First JavaScript','1XEeEMuQdkJePN16GLWD6WyoHnI-KRlus',NULL),
(10,4,'t','Topics Covered List','1AOOEbMUFke2errNwksPgbKpPH8er0O_o',NULL),
(10,5,'v','Variables in JavaScript','16SyWHUuS0001YmcbsoTn6N1uTQgpK39W',NULL),
(10,6,'v','Program Flow Control','18lwIehn1hW4tHI0WjkLwF89AVBDusJPJ',NULL),
(10,7,'v','How to Use JavaScript on a Web Page','1sFDZTSJ-hBHULKDSM08i1Qdf6aaGdVDv',NULL),
(10,8,'v','Functions — Part 1','1Bo4vK-_54JtoqgrDG87NI7oeMx_s6qti',NULL),
(10,9,'v','Functions — Part 2','1CVHFV1W8CWQREFG1YT-p4RzHcKTk6a6C',NULL),
(10,10,'v','Data Structures: Arrays','1VyNcw8QFNhT5Ksox77KoibRNiJAzeBKl',NULL),
(10,11,'v','Built-In Methods','100nwwlQCIExy_llC-X9wIwnNU2O3VWFw',NULL),
(10,12,'v','Data Structures: Objects','1Ygq06xpPUDFF0WYOja08ZjSc-em3cMyE',NULL),
(10,13,'t','Code: Data Structure Objects','1e8Rt5PF8tQE5SI1H_gRXeJ8slLzKatIi',NULL),
(10,14,'v','Building a Social Media Website — Part 1','1MLErfQgHwfYs27dmt8naNRNarqg6f7Tl',NULL),
(10,15,'t','Code: Social Media Website Part 1','1B4kvYM7o35GmBPMeYnnYn0uRRrl8Guwy',NULL),
(10,16,'v','JavaScript Terminology','1YjT1OHISWhpveJq03ivpsz-Hxx38KFCf',NULL),
(10,17,'t','Code: JavaScript Terminology','13zAHS-xl44pD9y1vCxAzEmMDMckj4A9y',NULL),
(10,18,'v','Loops','1IStnspagIE0ue1569njmXKCcbaLXw7EU',NULL),
(10,19,'t','Code: Loops','11nI6esuf9jyqzYWtjJh4hxde7PIr5Xil',NULL),
(10,20,'v','Social Media Website — Part 2','1sPRjibg20LYGweYu3fUocvk-tkg3-zfV',NULL),
(10,21,'t','Code: Social Media Website Part 2','1FuHggKN6kA0-foJynYaisv9yk_Sh8NGJ',NULL),
(10,22,'v','Developer Fundamentals: Variables','1xrzWFh1SSQ-Sp1d7Y_FwkuBW_796yeVB',NULL),
(11,0,'f','Document Object Model (resources)','1OVBwbtGLnsJ6Zyh5dyvIUcR4i0sBIG9j','Files: index.html, style.css'),
(11,1,'f','DOM Events Part 1 (resources)','1yhmq1GmHTD0XBetAQFw1obtkc1wv7Z0x','Files: index.html, java.js'),
(11,2,'f','Files used in upcoming lessons (resources)','1ofVfPU13h2vIado5KqCK_HB_xyZTruz2','Files: back.css, background.html, javascript.js, notes.txt'),
(11,3,'v','The Document Object Model','1Vqgtj-_oDkWx6R70Tfg9nnz3vZ3h5bUt',NULL),
(11,4,'v','DOM Selectors Explained','1JVimtetuPIbHIZD09VD8F9pKVubBJqwk',NULL),
(11,5,'t','DOM Common Selectors','1m39iViYjipSt29bYyq9WqzyhEBsJSUlY',NULL),
(11,6,'v','DOM Events — Part 1','1XUMmcGyBLVA1bxVr2BNOvcm9hEIwJ713',NULL),
(11,7,'v','DOM Events — Part 2','1AHXXd9geZStQ4KPi4UKVrT0_bqLkOoBW',NULL),
(11,8,'v','Background Colour Generator — Part 1','1CJP9nywFUe7uX2dXX_hWlvaUBwjyvYpn',NULL),
(11,9,'v','Background Colour Generator — Part 2','1o2bFNSpLEC6UqoqssS7ZtPeo6gCOoAM5',NULL),
(11,10,'v','Developer Fundamentals: Performance','1K4D0zTBOyxU9w_ZbB3m8YPr811Xf6Jsn',NULL),
(12,0,'f','ES5 & ES6 Part 1 (resources)','1UEk9k6CeITuYpsv3gJWXzgXyx76m_kpF','Files: Resource.txt'),
(12,1,'v','Variable Scope — Part 1','1_DPYzgSX5KonrGvUOEvEMtwyuBPwgEpr',NULL),
(12,2,'v','Variable Scope — Part 2','1Hhd4BKEXkTbXR_vVZFPKRsKpahqyBUaD',NULL),
(12,3,'t','Code: Scope','1zPqo7rTjfAdIGMuTXt7fwkhUTYO2-2eU',NULL),
(12,4,'v','Advanced Flow Control: Ternary Operator','1PR7evHoI0gykAY7MgolZ6APv-gZybBda',NULL),
(12,5,'t','Code: Ternary Operator','1fkyjHvgoox8O_hCZjd6QF7DG2zTVQQax',NULL),
(12,6,'v','Advanced Flow Control: Switch Statement','1-6IXNn86DFOgmowao8pDOfOsLyumUh21',NULL),
(12,7,'t','Code: Switch Statement','1hbfeVLozN-2NaBPWEgviFKNG5nZJV1En',NULL),
(12,8,'v','ES5 & ES6 — Part 1','1kh6roeECXu1oOgbpTE1JwtY5qYp3EJLC',NULL),
(12,9,'v','ES5 & ES6 — Part 2','1jMCmkQdpnaq1tvIHVkDXKE9jyCU4I4s6',NULL),
(12,10,'t','Code: ES5 & ES6 Parts 1 and 2','15LtmUREFkpaa3AvSgTzYCG1d528F-CJO',NULL),
(12,11,'v','Advanced Functions — Part 1','1z94wWgVRmGzZJ4Jj7fxdu3n7oDxq9aIB',NULL),
(12,12,'v','Advanced Functions — Part 2','1V877Zudh3HNBWKYzRzdZWXo5UC3bHPmE',NULL),
(12,13,'t','Code: Advanced Functions','1UGjJfv9UD7O01hUTqtaEHrfv1DK3EacE',NULL),
(12,14,'v','Advanced Arrays','1xh7foTmoEVX_3sNzsbfpyX-01V3cWygD',NULL),
(12,15,'t','Code: Advanced Arrays','1FRgLAIUw3wDxTrqg28aGkAGNA3GmW8wk',NULL),
(12,16,'v','Advanced Objects','1_gXkfr_BtWPJapce4d_DmIve5NkGCfNC',NULL),
(12,17,'t','Code: Advanced Objects','1J80ykxWNYpXg2aziYV_4mYnht_Dfeo0l',NULL),
(12,18,'v','Pass by Value and Pass by Reference','1IwEC7bJ1pSXb9wvjyii8qjPw2xZVIBi7',NULL),
(12,19,'v','Type Coercion','1LYen8nD2gkdCaGniMWb2KHDihDi5TPp-',NULL),
(12,20,'v','ES7 & ES8 Updates','1FC2FmgCrII_SOIoJGXOYdvIhrHLr9M5p',NULL),
(12,21,'v','ES10 Updates','1cDtstW5vCU8c6KnFwO2zYji6WG93FdL3',NULL),
(12,22,'v','Advanced Loops','15sZwCBqGy82FH5NblRdgzGceQv5LnQ3f',NULL),
(12,23,'v','Debugging','1WK3T1GJAMjVqfrnnBCB3igPkMOnHpqvj',NULL),
(12,24,'v','Inner Workings of JavaScript','1r9XJpWHt0ODMN67Kf_hUq7GjvPAymh2w',NULL)
) AS l(mi, li, k, title, fid, extra)
JOIN public.course_modules m
  ON m.order_index = l.mi
 AND m.course_id = (SELECT id FROM public.courses WHERE slug = 'full-stack-web-development-with-ai-ml');


INSERT INTO public.lessons (module_id, title, type, video_url, content_text, duration_seconds, order_index, is_free_preview)
SELECT m.id, l.title,
  (CASE WHEN l.k = 'v' THEN 'video' ELSE 'text' END)::public.lesson_type,
  CASE WHEN l.k = 'v' THEN 'https://drive.google.com/file/d/' || l.fid || '/preview' END,
  CASE WHEN l.k = 't' THEN 'Source file for this lesson.' || chr(10) || chr(10) || 'Open or download: https://drive.google.com/file/d/' || l.fid || '/view'
       WHEN l.k = 'f' THEN l.extra || chr(10) || chr(10) || 'Open the folder: https://drive.google.com/drive/folders/' || l.fid END,
  CASE WHEN l.k = 'v' THEN 600 ELSE 120 END,
  l.li, false
FROM (VALUES
(13,0,'v','Using the Terminal and Command Line','1ahEI5Qu-SWoUoG-EZSnhan4ECYUWq6J-',NULL),
(13,1,'v','Git & GitHub — Part 1','1d-H39um42F-xCs8as27xcIwkZwl7G18P',NULL),
(13,2,'v','Git & GitHub — Part 2 (Advanced)','11O0-ZxtPXdV1cwLACro6FfXb0MgiUrQg',NULL),
(13,3,'v','NPM','1HjL02g38OellNHIdhqBCenHbWpbroZak',NULL),
(13,4,'v','NPM — Part 2','1-UzgBUpGBF9pQAtSh0PQzWJazfZ4FVS5',NULL),
(13,5,'v','Installing Two Important Packages','1EKJk-BqF0k154QB4Xx48tpxda0bcVSYy',NULL),
(13,6,'v','Building a Portfolio Website','1nkbCpm-RUQa3_GNB0YAygIHPZF2kEDrx',NULL),
(14,0,'v','Python and Anaconda','1r8Ol_CMeVYlbuFd8aWzOJ_HT0PdfAfKA',NULL),
(14,1,'v','Which IDE Should You Use?','1qL88oqzv3AdTjAkOOlflOeVWA0bi6oVY',NULL),
(14,2,'v','Indentation — Very Important','1YdSkZh5YXr1i68gj_MzGh7UdGjOHqsiy',NULL),
(14,3,'v','Print and Input','1DgtlbVnIxsLtaAcracpHIvM1iRDpBDHM',NULL),
(14,4,'t','Code: Print and Input','1o_GYvgbPZV4DrhnGWx2eduw6HmFZT0TI',NULL),
(14,5,'v','String Concatenation','1TOt1X2-LJ701QLloM4hCQ2Tmzi0FvjDm',NULL),
(14,6,'v','Data Types','11CpbQ2eHKqHhVyNi73k6ya_79iONg0HY',NULL),
(14,7,'v','Lists and Dictionaries in Short','1wbbJT7c18fVvWC2XEqbzhQUvmzpUyUY9',NULL),
(14,8,'t','Code: Lists and Dictionaries','10Dn9mMEPzeI7G9h6RruIyirhNxKP2ICz',NULL),
(14,9,'v','Operators','1EMQtPrRujHNc_uLSpADO1YnFCT2SH6eE',NULL),
(14,10,'t','Notes: Operators','17aWjttYTjatBR8TaYaQKRnqmrSzPBJro',NULL),
(14,11,'v','How to Format Strings','1CdG5uvuSSbqhQOvk29PHrey57os1iN_q',NULL),
(14,12,'t','Code: Formatting Strings','1dgqxficLpE1jUDkq0lOV9PkiYD3b2-S9',NULL),
(14,13,'v','Exercise and Solution 1','1ciozS1_Cg9KMromhEaYzIxFoPR8DHiVS',NULL),
(14,14,'t','Code: Exercise 1','1iKgg17rggW7e7BbpgtHIpYdMNoykYQsQ',NULL),
(14,15,'v','Modules — All You Need to Know','1Rh_FkZp3t8tnab4Bug-ISYi3RMMJ4k8P',NULL),
(14,16,'t','Code: Modules','1KK1EOqBaLqyU8IJRs-lTef4yXwTFXSX3',NULL),
(14,17,'v','How to Remove Errors from Your Code','1xyghM7DKIp9pn2U-LVH2281YJj-pueWF',NULL),
(14,18,'t','Code: Fixing Errors','14DAz7ZxHwMpnXFsgMN9w7v_97QA6LRPS',NULL),
(14,19,'v','Exercise and Solution 2','1YQEh-g4P6elYMGXYURQcTjRmrq6gJrCh',NULL),
(14,20,'t','Code: Exercise 2','10xFyiTXbyXOqIlPAQ2gR9szbshQsnGpB',NULL),
(14,21,'v','Making Decisions with if / else','1ZDYpi3LZ_vUGBrUSxuY1UQ01kICTZaSf',NULL),
(14,22,'t','Code: if / else','1_0mPAiMJkOHDQ8maObSd-6dUdpBH_O4R',NULL),
(14,23,'v','Exercise and Solution: Number Guessing Game','1eyYVGW8fIiaCqngLsfWysml1FwOLoM5z',NULL),
(14,24,'t','Code: Number Guessing Game','1wATGI2kkFlNe_VMoyu9POZUwAixZNXST',NULL),
(14,25,'v','Storing Data in Lists','1Wuj8BOevoXxHNI1arLQXt9gHaGgjVLVB',NULL),
(14,26,'t','Code: Lists','1hFrtKv-j8cYhnB4cw728zvtOOY6FXsBN',NULL),
(14,27,'v','Exercise and Solution: Twister Game','18fvko3nrGEI_4LtO4QRNDGxQQnQLkU-x',NULL),
(14,28,'t','Code: Twister Game','1NHc0hUiTPmoeXURJiEwzHO6WZuhw9-0A',NULL),
(14,29,'v','List Methods and Functions','17EMLAKo3axwdRwxXIqpuZWGYMuLQRWX0',NULL),
(14,30,'t','Code: List Methods','1Sq6MjeaQMzISN4OBUg7-ZCAZ3yblaeJs',NULL),
(14,31,'v','Indexing the Cool Way','16beRT0OlchYwnzdvuoLhDRnh2UnvhM3E',NULL),
(14,32,'t','Code: Indexing','1d4JxNteGC5w6jPdbrCmRetwqfb4BCYHE',NULL),
(14,33,'v','The for Loop','1TXtK7y3tCLgnszMH3C9NGu_0wRzSE8GG',NULL),
(14,34,'t','Code: for Loop','1Qm23CGNnpqDxZ_mGdKoNmLoVi8dL5Xmo',NULL),
(14,35,'v','if, continue and break','146ZB5HhNJD6R_JC23c1bjijvnGiqWpry',NULL),
(14,36,'t','Code: continue and break','1LiKd9tsqxV9JQgMdjCtiwwORG_YyGXDT',NULL),
(14,37,'v','List Comprehension','1h7Fgl7IwGMBWfTnAxW8G-9bWFK7ifiHa',NULL),
(14,38,'t','Code: List Comprehension','1bNrrZG1cR7k6enWIuV4nMqXaBu9x1vkG',NULL),
(14,39,'v','Tuples and Sets','1k6xTVQ9PClhRG9Y5fRPB5NKLfWjiLevw',NULL),
(14,40,'t','Code: Tuples and Sets','1wCMJZzxCMuA4f8xsi44PbmZ4MYGdxFvT',NULL),
(14,41,'v','Dictionaries in Detail','1gcQrkuM65Tdg7GfJHaIBLPpVcNhb5dOx',NULL),
(14,42,'t','Code: Dictionaries','1MO-UOXP7YbXVUGdjlViHFdKZkD9VNsBH',NULL),
(14,43,'v','Real-Time Currency Converter','1K_w7fBjz0iU9wCv9VGQFHqtA8t2LWJLx',NULL),
(14,44,'t','Code: Currency Converter','1pGDiRbOp1Zv04L2qWaj-9KYRM6jV6p6w',NULL),
(14,45,'v','While Loop','1etJrF8QyduQTNqS6DkxyDGmdd2LXaCyd',NULL),
(14,46,'t','Code: While Loop','1G_d3a1PD6f5YaSGnVBTvBM1IMaxoVUy8',NULL),
(14,47,'v','Dice Sixer Exercise Using a While Loop','1PnywgplXEn8MuKzHUaZzB47oWR24hubF',NULL),
(14,48,'t','Code: Dice Sixer','1Fjs2oJRWA1IbL7b8PXDmnZOWWiKD_zz6',NULL),
(14,49,'v','Functions','1b_R_mIbNIoKXh1vETW3HpFec99bL1fOD',NULL),
(15,0,'v','Django Introduction','1LxLmvl_irxlGE7f25qnECqXFEcsspCMy',NULL),
(15,1,'v','Creating a Django Project','1FIWdEyIgo352WvAwq10yAfo4KEsPs9Bh',NULL),
(15,2,'v','Putting the Web App on a Local Server','1JWvrkRlaqpDxiw0qm-rQPa74loElGxCr',NULL),
(15,3,'v','Django Theory: MVC','14GeDUV-YAIhBKx8L7QeQsx-0NCILx6l9',NULL),
(15,4,'v','First View and URL Patterns','1S_IKogAqnpLbPvKRCaUaZy-vkSPV9QM9',NULL),
(15,5,'v','Connecting HTML with Django','1BIgfh9EE54uZxn7cMdE2W2TVXwWEC16_',NULL),
(15,6,'v','Single Page Web App — Exercise and Solution','1GUoXt0tHl6urmRbjdXMMvU0U8dxoTMPb',NULL),
(15,7,'v','Multiple Page Web App','1YhleScukSHNEy3QTjMyI1Vmuj3zXeTbF',NULL),
(15,8,'v','Adding Static Files','1eE2emhB027ClsMdCFth3GzQR17Ofp2-n',NULL),
(15,9,'v','Django Forms','1Ot7hob8GW4zwYjU2Ld5GRBo6pjHCAnUT',NULL),
(15,10,'v','Django Forms — Part 2','1TpdsNeFKSEXQHN8uJ09U-DxXQ_ypkkH8',NULL),
(15,11,'v','Connecting a Machine Learning Model with Django','1vPB-5egy2CDxdZJoZoPfok_RdJZR3R84',NULL),
(16,0,'f','Datasets (resources)','1VaQhoF9JpctZsFXVvP5QOE-YHt0i7KCB','Files: titanic.zip'),
(16,1,'v','Data Science Introduction','1UGdXTQ_FVCJGUPIkba2mK3DGIZiqJLan',NULL),
(16,2,'v','Installing Required Libraries','17lVQq40U-V1KbY9bBcc2DmsmqVecy0U9',NULL),
(16,3,'v','Getting Your Data','1PCQe_MTOCpzfvqGJjamk0dp658zByRZI',NULL),
(16,4,'v','Loading Data','1Alr55XFAn09PSRUKQPknEH6S8o29Rbt4',NULL),
(16,5,'v','Exploring Data','1buAujN31P19FsuykhIU4kLGjKIw-Ltwl',NULL),
(16,6,'v','Some Basic Exploration','1FkjRTJKcXGNY0hQgtIpU_iQUkQrwHpjq',NULL),
(16,7,'t','Code: Basic Exploration','1AQD9lRTGe-hPQcsVZUXV4bSq1wQ_MuTY',NULL),
(16,8,'v','Data Visualisation','1yEBkXC_v7vmoRSFv0OaFYiEv6YqSRiHj',NULL),
(16,9,'t','Code: Data Visualisation','1_JD7ky-b-wDy-phdLncPiql2Tcj9n5Kx',NULL),
(16,10,'v','Variable Types','1Tzt3cB2mc1_UoD9khgb2finZRsBKcitN',NULL),
(16,11,'v','The Four Cs of Data Cleaning','1R3teCqcd8nGftPP9aLBGgXWHfvfBFoDf',NULL),
(16,12,'v','Correcting Data','1h63eAwUz-HtIxMxC557yW9PHvgE98RFA',NULL),
(16,13,'t','Code: Correcting Data','1ECwHFOn1vhV9vPGtdiXCvHDM_gct1iEy',NULL),
(16,14,'v','Completing Data','1CgmQ5I3bMPdfitlobmmmNGCMCxjBh55y',NULL),
(16,15,'t','Code: Completing Data','1_hdCsGL7qbGO9ekAjz15PPUWLZw_H4m8',NULL),
(16,16,'v','Creating Features','1XEyp9eYQFMt3CuU2JXl4naHurEGPvQHF',NULL),
(16,17,'t','Code: Creating Features','10vdPr6BIP3ROo-jk_uFu1L2Jq-aHQJHF',NULL),
(16,18,'v','Converting Data','1EBaNjUkEgVe7VGDMPFVJ1k-jNwfzOAoM',NULL),
(16,19,'t','Code: Converting Data','100SmV9eARs1fVgax5czxxu1oaWPucbM6',NULL),
(16,20,'v','A Few Words Before You Continue','1PTqwRt90svu9rs-ug6x2WViEHvWEru1d',NULL),
(17,0,'v','Introduction to Machine Learning','1uLq_jHwabrrB13BFWRMb2RJqSym6dACM',NULL),
(17,1,'t','Code: Machine Learning Starter Files','1EBBiNPueJRCMHdHYnxa27ODsz6SC81Fe',NULL),
(17,2,'v','Linear Regression the Easy Way','13oPJ25_zenmgiSyK2kIQxU_vGVimeKu0',NULL),
(17,3,'v','Exercise and Solution: Linear Regression','1TtKw8XAsmjJhpgL9ok7LAI1ZQGu8ZvFl',NULL),
(17,4,'v','Line of Best Fit (Bonus)','1fy3CXEdh3lXRWxpSNvFhQg0J5JNYHvNO',NULL),
(17,5,'v','Linear Regression: Mean Squared Error','1GPXolrbTyp_0cOeZSnvPzvZNgYLgvZJ_',NULL),
(17,6,'v','Mean Squared Error: Exercise and Solution','1hY4V-1WMrJ3VT9FT6Cr8NS1XJeRWoNZc',NULL),
(17,7,'v','Logistic Regression','122eebdodpJOpp9mt8bEq2InvzFY8TI6n',NULL),
(17,8,'v','Overfitting: Perfect is Not Always Good','1AKRjhmOXbIFVcLz6vMkQWk30TnR_Oh6a',NULL),
(17,9,'v','Practice: Test and Train','1k52FXglKL6KwwQZyU1-i6VKp2mxJTcIf',NULL),
(17,10,'v','How to Use Google Colab','1hKf6fxZSkbBeuZg5GsJT-Yi69BvHRANq',NULL),
(17,11,'v','Decision Trees and Random Forests','1Csiut1y1PtzUcQQXU_6-NeKhzkkeUkI3',NULL),
(17,12,'t','Code: Used in Upcoming Lessons','1J4RsvjQM01JOPGeayYYOAzFF16NR55CA',NULL),
(17,13,'v','Moving Your Code onto a Google GPU','13o4ywAQzD1uLTaLkIRwA9JlTkee19Q6j',NULL),
(17,14,'v','Training a Machine Learning Model','1fO2tg8NACsbBzpLBvywo_4WyQ8OLAHkx',NULL),
(17,15,'v','Matching Your Prediction with Kaggle','1oMe0YCyiwchRWbMel81cgAiStR-xh83M',NULL)
) AS l(mi, li, k, title, fid, extra)
JOIN public.course_modules m
  ON m.order_index = l.mi
 AND m.course_id = (SELECT id FROM public.courses WHERE slug = 'full-stack-web-development-with-ai-ml');


INSERT INTO public.lessons (module_id, title, type, video_url, content_text, duration_seconds, order_index, is_free_preview)
SELECT m.id, l.title,
  (CASE WHEN l.k = 'v' THEN 'video' ELSE 'text' END)::public.lesson_type,
  CASE WHEN l.k = 'v' THEN 'https://drive.google.com/file/d/' || l.fid || '/preview' END,
  CASE WHEN l.k = 't' THEN 'Source file for this lesson.' || chr(10) || chr(10) || 'Open or download: https://drive.google.com/file/d/' || l.fid || '/view'
       WHEN l.k = 'f' THEN l.extra || chr(10) || chr(10) || 'Open the folder: https://drive.google.com/drive/folders/' || l.fid END,
  CASE WHEN l.k = 'v' THEN 600 ELSE 120 END,
  l.li, false
FROM (VALUES
(18,0,'v','Section Introduction','1-nOHOHIl8cySwoxLu4mRiWAQ5DFi6uTv',NULL),
(18,1,'v','Creating the Django Project','1dBE-ev13TY7TqVFgz_o2YZOX20uAScOi',NULL),
(18,2,'v','Connecting Multiple Pages in Django','1XG9s_l7YdFd1c1wzBGxdPWC6sVetEmo9',NULL),
(18,3,'v','How to Import a Model in Django — Part 1','1X9nOJP1YP47zfpasTj9CioW1sGaHXUp2',NULL),
(18,4,'v','How to Import a Model in Django — Part 2','1tYGsH-UGcF3QMj2tH4mE58kf3F7Upv4w',NULL),
(18,5,'v','Integrating a Machine Learning Model with Django','1VYlS3waLtDy3iH9byt7jQm7zYuJpeMyq',NULL),
(18,6,'t','Cleaned Project Files','1c8Aiax7EorZ9xysILwz4jhLbpYMURPPn',NULL),
(18,7,'v','Using Amazon Web Services for an ML Model','15HrUFgE4XMug1lqYMo4mL1QuPemEDwYm',NULL),
(18,8,'t','Steps Needed for the Upcoming Lessons','1TYCSpvP8ns4FZVqKDPAzb_sgb0AxJIj_',NULL),
(18,9,'v','Connecting the AWS Machine with Your Local Machine','1YuR4h-nlXtyKeOy0XKDneQtBWzxUddDS',NULL),
(18,10,'v','Moving Our Web App to Git and AWS','1CKdEcV5xn8T0zhbok8iyp4XTLuWU79RN',NULL),
(18,11,'t','Steps So You Do Not Miss Anything','1IAAWA0-lVBBaYl6LnqS1n0zLEDVwjg2n',NULL),
(18,12,'v','Making Our Machine Learning App Live on the Internet','1GSSgYvFI2v8erf4fQt5LxuklLoi4aVRh',NULL),
(18,13,'v','Validating Our Machine Learning Model','1Jnja7UNv5HNQ-A1PKNp7kdq3UpXBTzJr',NULL),
(18,14,'v','Installing Gunicorn','1DEFyUrt292-DOdydxM5mBFbJMMC81cdT',NULL),
(18,15,'v','Creating the .sock File and Nginx — Part 1','1_5iiCqkovezGjFPAHqdXsz736rbRWYdM',NULL),
(18,16,'v','Creating the .sock File and Nginx — Part 2','1GMwvrFYaYBdLfCjpHyArxwv3AO1S7vT6',NULL),
(18,17,'t','Steps Needed for These Lectures','1prrSz3MqejI_yMltCMfzDWUIRCY0LJ4Y',NULL),
(18,18,'v','Connecting a Domain Name','1tl5fD-62jrJLKM42F7nzYm9uenxNC3tA',NULL),
(18,19,'v','How to Make Changes in Your Live Web App','1SNSLUJoIpYbhoJ3UeP5DsNo1ssgb6OAS',NULL),
(18,20,'v','Adding CSS and JavaScript Files to the ML App','13FowdZxJH8YUHDiAV2fS9TabO4Ee0xNk',NULL),
(18,21,'t','Steps Needed','1-BrfQxjIItGyyBxmRCONWW17kd_MreBb',NULL),
(19,0,'f','All code and projects so far (resources)','1lTjO0KJIGtqAWcovUDWgb75nOXOWyoQ2','Files: Data_Science.rar, ML_titanic.rar, titanic_project.rar'),
(19,1,'v','Introduction to Neural Networks','1BdpNI2Te60F9Od2L4hOs7Hg_Md-7e20F',NULL),
(19,2,'v','Machine Learning vs Deep Learning','1T-qtWckrBV8bo7WaioLfDlFGJ0lTxifA',NULL),
(19,3,'v','Recap of the Basics: Regression, Loss and Cost','1zf_A2_EyorSXNkgyh14MXbb1D7PTDqPN',NULL),
(19,4,'v','Neural Net Fundamentals','1hbHBZsblDNeHTRCc2nXYPYa4ZNaH_n7V',NULL),
(19,5,'v','Neural Nets with Multiple Inputs','1kwj22CNjwD08S5-t0m3QE7BldPdOXucC',NULL),
(19,6,'v','Bias and Variance: b and w','1ChSGXG78LDFTrN0aGub7eL8YgjNevk5K',NULL),
(19,7,'v','Epochs, Forward and Backward Propagation','1C36zkhd3PoCTGZ2B9-jNu9CPEAOiu6qV',NULL),
(19,8,'v','Bias and Variance','1auaXpAjgkNUcMTHGtjrA3PeZ9BXU2Z-B',NULL),
(19,9,'v','Hyperparameters','1NbOTxwX2W3KNAyu8zq0zTkw0ad8huDgn',NULL),
(19,10,'v','Installing Dependencies for Neural Nets','1w9LFF1XD8d3PXk1wQnJSG_3y_wcMXBcG',NULL),
(19,11,'v','Applying Neural Nets','1AbsaG-2bLvCt3hwbNnYA3ioIscNKMDiv',NULL),
(19,12,'v','Optimising a Neural Network with Hyperparameters','1NqCZuuFJtTvE7Z-a1QLcndTgWkO82urU',NULL),
(19,13,'t','Code: My Neural Network','1FBs5obxu8nVchWpwvFlglOokoH-SC2Pz',NULL),
(19,14,'v','Saving the Model for Reuse in a Web App','1l7Kl8_dvkqegy2fqpp7ZVtnCjq7NDhsC',NULL),
(19,15,'v','How to Get Your Data in the Right Shape','1g4ZWovQ_SWCjTUxNFJbWY3EV2pn3DGgI',NULL),
(19,16,'v','Building a Neural Net Image Classifier — Part 1','1nkpeHa55aMB4iwuXA-aHBNaRnpOOecFs',NULL),
(19,17,'v','Building a Neural Net Image Classifier — Part 2','1szq_AjW0H5oKi91MdHotCkgfNuljBgou',NULL),
(19,18,'t','Code: Image Classifier','1fkQjBvhU5tJtDIQlMXFT6tdDnyCPDMrw',NULL),
(19,19,'t','All code and projects so far','1MaYUfBJNT9cjyWXVBAyiWe5vcBd7jwM8',NULL),
(20,0,'f','Datasets you need (resources)','1bqPBzwgPQH-4kdG2Odhmgqc4BHPK9WXn','Files: humans.zip, robots.zip'),
(20,1,'f','All course data (resources)','1m9gP1bYBxvUD_Nps3jEfvZkpiXcJv0l7','Files: Conv_NN.zip'),
(20,2,'v','Introduction to CNNs','1ZobfPdjW5nr7e2bCWVQ_WrB_WFj3k_EK',NULL),
(20,3,'v','How Filters and Kernels Work','176mF52B1hrc4vTUmiTvvbK7d8KXhJHFy',NULL),
(20,4,'v','Filter Parameters to Improve CNN Accuracy','1yrUfC7l3wNdtmw9BSt7bJwfzuw0XcaR9',NULL),
(20,5,'v','Filter Parameters to Improve CNNs — Part 2','1lhan10QGDZi1McA2AhXaWGZ8FO1cCqda',NULL),
(20,6,'v','Pooling Explained','1IAR2waFUHY1sGfVDS3uCpgNeA6XO-oxV',NULL),
(20,7,'v','Building a Terminator Using a CNN','1fo5RPgK3glvD6vaSAA1V2_Sz4GXQlCkn',NULL),
(20,8,'v','Loading Data for the Terminator CNN','1IDl-M7u3QKrJx4B01vm7n4uc1KBdpiB-',NULL),
(20,9,'t','Code: Used in Upcoming Lessons','1DAiKDpWF0UzSvOYpJCnUtx7wvy15zTWC',NULL),
(20,10,'t','Datasets you need','1elpuWoYia6ujiqFM9sNTzxKnTgceaslq',NULL),
(20,11,'v','Preparing Data for the Terminator CNN','1cSvz4r8o9bpNTqdIc2cnV1BUdqWbjYxr',NULL),
(20,12,'v','Splitting Data into Test and Train','119fa_7FoDQ13jFCYrkUkokunw0q28gld',NULL),
(20,13,'v','How to Improve the Accuracy of a CNN','1YvIppdVDeGyI7Ql8ryhVEvX7FxfUJAyr',NULL),
(20,14,'t','Code: Improving Accuracy','1p92DTcO-YJr_RLnPhiA8evWzGGinc2T7',NULL),
(20,15,'v','Running Predictions on Images in the Dataset','1VnQZFSM8h7pYSmoP3WysjiUd4u8xxvIj',NULL),
(20,16,'v','Running Predictions on Images Outside the Dataset','1-gwY08BLHciLB5Cimo9Q52xxZ3fBTpa8',NULL),
(20,17,'t','Code: Predictions','1xuPY4nECId0yO-8J5bt-EfnD5iU6gGyL',NULL),
(20,18,'t','All course data','14szCuNUrX1aZNgKHHXVoL9ENkCl9rh5B',NULL),
(20,19,'v','Final Note and a Few Words','1TnLaVsHU-BkVylNwMrvmIvUNibr5FlbE',NULL),
(20,20,'v','Models in Django: Create the Project (Optional)','15owjipOxYdD1oljfaIFbz7jbZkHQ2dCg',NULL),
(20,21,'v','What is a Model?','1OBDLTo7XLTfMM-zywm3IN_yl7uXphiTR',NULL),
(20,22,'v','Creating Your First Model','1ZtHYmOYBYan8IdCujBD8ufIL6v_05Z8H',NULL)
) AS l(mi, li, k, title, fid, extra)
JOIN public.course_modules m
  ON m.order_index = l.mi
 AND m.course_id = (SELECT id FROM public.courses WHERE slug = 'full-stack-web-development-with-ai-ml');


-- =====================================================================
-- SECTION 6: DATA SCIENCE, PYTHON & AI/ML MASTERCLASS
-- Sources:
--   - 20260920212851_598ca7cc-83e4-4a59-9282-a30818a98be6.sql
--   - 20260920213150_90d6912e-2c08-4912-a20a-039da02b9f87.sql
-- =====================================================================

insert into public.courses (title, slug, description, track, price, thumbnail_url, instructor_name, instructor_bio, is_published, is_crash_course, access_policy, access_days)
values ('Generative AI, LLMs, Agents & MCP — Practical Foundations','generative-ai-llms-agents-mcp','A beginner-friendly, hands-on introduction to modern AI — Generative AI, Large Language Models, prompt engineering, agents, RAG and the Model Context Protocol.

What you''ll learn
- Fundamentals of Generative AI and how it differs from traditional AI
- How Large Language Models work at a high level, without heavy math
- Tokens, prompts and how tokenization affects output quality and API cost
- Prompt engineering techniques for consistent, reliable results from any LLM
- How AI systems use context, memory and tools
- Retrieval-Augmented Generation: traditional vs agentic RAG, built visually in Langflow
- Building AI agents in AWS Bedrock Agent that work autonomously
- Model Context Protocol: hosts, clients, servers and transport layers
- Building your own MCP server for Google Calendar with OAuth and live API access
- Using third-party MCP servers to connect external systems
- Running and comparing open-source models locally
- Getting more from Claude: Claude Code, Claude Cowork and Claude Skills

Taught by Himanshu Rana, a Cloud Solutions Architect with 16+ years delivering enterprise-grade solutions on AWS and Azure, and a Microsoft Certified Trainer.

Who this course is for
- Beginners with no prior AI or machine learning background
- Developers and non-developers who want a visual, low-code path into RAG and agentic workflows
- Product managers, founders and team leads who need a working mental model of modern AI systems
- Anyone curious about MCP, Langflow, or connecting an AI model to a real external tool

By the end you will have a working RAG pipeline built visually in Langflow and a complete, deployed MCP server project.','AI & Machine Learning',4999,null,'Himanshu Rana','Cloud Solutions Architect with 16+ years delivering enterprise-grade solutions on AWS and Azure, and a Microsoft Certified Trainer.',true,false,'lifetime',null);

insert into public.course_modules (course_id, title, order_index)
select c.id, v.title, v.idx from public.courses c,
(values
('Getting Started: Generative AI on Your Own Machine',0),
('Fundamentals of Generative AI & LLMs',1),
('The Art of Prompt Engineering',2),
('Agentic AI Fundamentals & Development',3),
('Understanding and Implementing Agentic RAG',4),
('Model Context Protocol (MCP) Fundamentals & Projects',5),
('Claude AI Assistant',6),
('Conclusion',7)
) as v(title, idx)
where c.slug='generative-ai-llms-agents-mcp';


insert into public.lessons (module_id, title, type, video_url, content_text, duration_seconds, order_index, is_free_preview)
select m.id, v.title, v.ltype::lesson_type, v.url, v.txt, v.dur, v.ord, v.free
from public.course_modules m join public.courses c on c.id = m.course_id,
(values
(0, 'Jumping Right Into the World of Artificial Intelligence', 'video', 'https://drive.google.com/file/d/1XZ5-PaaolxA2FJ_ywjZWIOfJ6mt-vDEM/preview', null, 600, 0, true),
(0, 'Setting Up Ollama on Mac & Windows for Local Testing', 'video', 'https://drive.google.com/file/d/1LUmIjf9rhpA_Y63IRtaIhe0UnitJT37l/preview', null, 600, 1, false),
(0, 'Build Your First AI Application: English Tutor Using Ollama', 'video', 'https://drive.google.com/file/d/1Qclkmz8f7iZwMCbgqMa2buBSami_FwjY/preview', null, 600, 2, false),
(0, 'Explore NotebookLM from Google', 'video', 'https://drive.google.com/file/d/1rVYyTqY_HqU2P-9uAbszSSs6qJHfoyzA/preview', null, 600, 3, false),
(0, 'Course Roadmap', 'video', 'https://drive.google.com/file/d/1H_TV8lsx3E8I53yQtX0FqS1Qb1_x46va/preview', null, 600, 4, false),
(0, 'Know Your Instructor (optional)', 'video', 'https://drive.google.com/file/d/19vSXytkmGVUt0dTCVOcPwu8TLQd8oSAR/preview', null, 600, 5, false),
(0, 'A Look at Widely Used Closed and Open Source Models', 'video', 'https://drive.google.com/file/d/1-dySTYNlZ3cL0UaCX6kXIdcRXCjUbnjF/preview', null, 600, 6, false),
(1, 'Generative AI vs Traditional AI', 'video', 'https://drive.google.com/file/d/13AdrHgNOZWVT10esto69sjq8bldv-XXO/preview', null, 600, 0, false),
(1, 'What Are Large Language Models (LLMs)?', 'video', 'https://drive.google.com/file/d/1I43a36gcwEwaGBJ8DqY68DOS_m1TgZrM/preview', null, 600, 1, false),
(1, 'How an LLM Works', 'video', 'https://drive.google.com/file/d/1OWfxDEZg2uc5-0q4LxzeuEskbXDzKDDO/preview', null, 600, 2, false),
(1, 'What Are Tokens?', 'video', 'https://drive.google.com/file/d/1T5qr_d-Q1VgolPQTBEbtm0zpJEDclMps/preview', null, 600, 3, false),
(1, 'AI Jargon: Inference, Context Window, Hallucinations, RAG', 'video', 'https://drive.google.com/file/d/12nL91O9ohCMAEO5CZTRviatSr_T8hwWi/preview', null, 600, 4, false),
(2, 'Why Do We Need to Engineer a Prompt?', 'video', 'https://drive.google.com/file/d/1RD_4F9WBpdgYXSXk1xCo8MZ3LVwY3PvL/preview', null, 600, 0, false),
(2, 'Role of Temperature, Top-K and Top-P in Sampling Output', 'video', 'https://drive.google.com/file/d/1NMKKlVyRBHofWAsWDyphyVB08TxE2Zv2/preview', null, 600, 1, false),
(2, 'Components of a Prompt', 'video', 'https://drive.google.com/file/d/1DgLF36-O6-DBwbvJX-UQj9t5j3vLd8XA/preview', null, 600, 2, false),
(2, 'Zero-Shot Prompting', 'video', 'https://drive.google.com/file/d/1WJuK6z32iDE1ZBlpn4kGf3Q-QBSdlAeA/preview', null, 600, 3, false),
(2, 'One-Shot and Few-Shot Prompting', 'video', 'https://drive.google.com/file/d/1tBuvZPpwIkx3_lcB1voyGOdlP6AH00mO/preview', null, 600, 4, false),
(2, 'Chain-of-Thought (CoT) Prompting', 'video', 'https://drive.google.com/file/d/14MyUds2PpPlfowJVE-NK0GYdJRNfKyjh/preview', null, 600, 5, false),
(2, 'ReAct (Reason and Act) Prompting', 'video', 'https://drive.google.com/file/d/1L53qofDJcOo6KIQsgbzvr54rGF7l3Fxq/preview', null, 600, 6, false),
(2, 'System, Contextual and Role Prompting', 'video', 'https://drive.google.com/file/d/1LJeipXz9kRzKdwTDfAsFWL4g8Hua8YO5/preview', null, 600, 7, false),
(3, 'What Is an AI Agent?', 'text', null, 'Lesson notes and transcript are provided with this session.', 120, 0, false),
(3, 'Components of an AI Agent', 'text', null, 'Lesson notes and transcript are provided with this session.', 120, 1, false),
(3, 'AWS Bedrock Agent — A Serverless Service', 'text', null, 'Lesson notes and transcript are provided with this session.', 120, 2, false),
(3, 'Understanding Our AIOps Agent Architecture and Prerequisites', 'text', null, 'Lesson notes and transcript are provided with this session.', 120, 3, false),
(3, 'Set Up the AWS CLI and AWS Credentials', 'text', null, 'Downloadable resources for this lesson: https://drive.google.com/drive/folders/1wd36OzDToP-D_BasOyNOdQJsi6iwuaiJ', 120, 4, false),
(3, 'Create an AIOps AI Agent in AWS Bedrock', 'text', null, 'Downloadable resources for this lesson: https://drive.google.com/drive/folders/1rNzVcMmLFTKvkdkbfD72u25C42jskCjr', 120, 5, false),
(3, 'Responsible AI Principles', 'text', null, 'Lesson notes and transcript are provided with this session.', 120, 6, false),
(4, 'Understanding Retrieval-Augmented Generation (RAG)', 'video', 'https://drive.google.com/file/d/1KCbMbpxfWPskFbcanXsiWCWvptO4l3K9/preview', null, 600, 0, false),
(4, 'Front Desk Agent Without RAG — Understanding the Problem', 'video', 'https://drive.google.com/file/d/1GDLAiOMP5UbQE7bc2i9BryM12Dhm5HX2/preview', null, 600, 1, false),
(4, 'Implementing a RAG-Based Front Desk Agent Using Langflow', 'video', 'https://drive.google.com/file/d/1cn9IjdyHIQqe4NHwnXZmYFKc-XYKqK5x/preview', null, 600, 2, false),
(4, 'Traditional RAG vs Agentic RAG', 'video', 'https://drive.google.com/file/d/1f8gphfvPATt6KwAO_3H4cfSh9JmhOUiW/preview', null, 600, 3, false),
(4, 'Implementing Agentic RAG', 'video', 'https://drive.google.com/file/d/1kn4n_PUErvXxLU7dJImFIBthQ9H-bSDY/preview', null, 600, 4, false),
(5, 'What Is MCP — The Universal Connector for AI', 'video', 'https://drive.google.com/file/d/1HudzePXMY7PXjHO_Xv_8bOTSp0lKpmAE/preview', null, 600, 0, false),
(5, 'Get a Taste of the Docker MCP Server', 'video', 'https://drive.google.com/file/d/11NLG3KcYgJ-w8H3ubWVB0ITNXetp2Mo0/preview', null, 600, 1, false),
(5, 'Basic MCP Architecture', 'video', 'https://drive.google.com/file/d/1Djuzv076xPj0iyjsiV_qfWwLjRTCvT6I/preview', null, 600, 2, false),
(5, 'Project: Build Your Own MCP Server to Manage Google Calendar', 'video', 'https://drive.google.com/file/d/1AEppO0zk5O1FLhyXyk9OCWmsmHirvUia/preview', null, 600, 3, false),
(6, 'What Is Claude?', 'video', 'https://drive.google.com/file/d/1sm6a6E329KW0bRaiXJ6LsLxK_xYsrTTW/preview', null, 600, 0, false),
(6, 'Installing Claude Desktop', 'video', 'https://drive.google.com/file/d/1LeKj0ZxUlui1MHQrw0_mIKppvlGWYUe4/preview', null, 600, 1, false),
(6, 'Claude Features — Not Just a Chatbot', 'video', 'https://drive.google.com/file/d/1uDYoaWDOjvWktt8vKrZt2uLoRz7mE9ye/preview', null, 600, 2, false),
(6, 'The Claude Model Family', 'video', 'https://drive.google.com/file/d/1y5IGuoOOMkFtJX_PegRIUtlzfOIuym1N/preview', null, 600, 3, false),
(6, 'What Is Claude Code?', 'text', null, 'Lesson notes and transcript are provided with this session.', 120, 4, false),
(6, 'Build a Real App Using Claude Code', 'text', null, 'Lesson notes and transcript are provided with this session.', 120, 5, false),
(6, 'Overview of Claude Skills', 'text', null, 'Lesson notes and transcript are provided with this session.', 120, 6, false),
(6, 'Using Claude Skills', 'text', null, 'Lesson notes and transcript are provided with this session.', 120, 7, false),
(6, 'Creating a New Claude Skill', 'text', null, 'Lesson notes and transcript are provided with this session.', 120, 8, false),
(7, 'Wrap-Up', 'video', 'https://drive.google.com/file/d/1qg71OAGmv_0Pybvf7HYp9MhJhDm7Gp18/preview', null, 600, 0, false)
) as v(midx, title, ltype, url, txt, dur, ord, free)
where c.slug='generative-ai-llms-agents-mcp' and m.order_index = v.midx
and not exists (select 1 from public.lessons l where l.module_id = m.id and l.order_index = v.ord);


-- =====================================================================
-- SECTION 7: MARKETPLACE EXTENSIONS, INSTRUCTORS, REVIEWS & INTERNSHIPS
-- Source: 20260928120000_marketplace_extensions.sql
-- =====================================================================

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

-- (Note: quiz_questions omitted; replaced by comprehensive practice system in Section 8)


-- =====================================================================
-- SECTION 8: LEARNING PORTAL, PRACTICE SYSTEM, RESOURCES & NOTES
-- Source: 20260929090000_learning_portal_practice.sql
-- =====================================================================

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
-- (Note: lesson_content RPC is defined in Section 9 with video streaming metadata: video_provider & drive_file_id)


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
-- (quiz_questions omitted)

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


-- =====================================================================
-- SECTION 9: GOOGLE DRIVE & VIDEO STREAMING METADATA
-- Source: 20260929120000_drive_video_metadata.sql
-- =====================================================================

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

