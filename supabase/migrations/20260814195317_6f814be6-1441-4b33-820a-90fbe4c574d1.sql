-- ROLES
CREATE TYPE public.app_role AS ENUM ('student','employee','admin');
CREATE TYPE public.employee_role AS ENUM ('support','mentor','instructor','content_editor');
CREATE TYPE public.lesson_type AS ENUM ('video','text','live');
CREATE TYPE public.access_policy AS ENUM ('lifetime','days');

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.profiles (
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

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE TABLE public.employee_permissions (
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

-- PROFILE POLICIES
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'employee'));
CREATE POLICY "own profile write" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(),'admin')) WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "roles read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "perms read" ON public.employee_permissions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- new user -> profile + student role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- COURSES
CREATE TABLE public.courses (
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
CREATE POLICY "published courses public" ON public.courses FOR SELECT USING (is_published OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'employee'));
CREATE POLICY "admins manage courses" ON public.courses FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER courses_updated BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.course_modules (
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
CREATE POLICY "modules readable" ON public.course_modules FOR SELECT USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND (c.is_published OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'employee'))));
CREATE POLICY "staff manage modules" ON public.course_modules FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.employee_permissions p WHERE p.user_id = auth.uid() AND p.can_manage_courses)) WITH CHECK (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.employee_permissions p WHERE p.user_id = auth.uid() AND p.can_manage_courses));

CREATE TABLE public.lessons (
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
CREATE POLICY "lessons readable" ON public.lessons FOR SELECT USING (EXISTS (SELECT 1 FROM public.course_modules m JOIN public.courses c ON c.id = m.course_id WHERE m.id = module_id AND (c.is_published OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'employee'))));
CREATE POLICY "staff manage lessons" ON public.lessons FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.employee_permissions p WHERE p.user_id = auth.uid() AND p.can_manage_courses)) WITH CHECK (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.employee_permissions p WHERE p.user_id = auth.uid() AND p.can_manage_courses));

CREATE TABLE public.enrollments (
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
CREATE POLICY "own enrollments" ON public.enrollments FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'employee'));
CREATE POLICY "self enroll" ON public.enrollments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin manage enrollments" ON public.enrollments FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin delete enrollments" ON public.enrollments FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_progress TO authenticated;
GRANT ALL ON public.lesson_progress TO service_role;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own progress read" ON public.lesson_progress FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'employee'));
CREATE POLICY "own progress write" ON public.lesson_progress FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own progress delete" ON public.lesson_progress FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.certificates (
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
CREATE POLICY "own certificates" ON public.certificates FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "issue own certificate" ON public.certificates FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin revoke certificate" ON public.certificates FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.forum_questions (
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
CREATE POLICY "forum q update" ON public.forum_questions FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.employee_permissions p WHERE p.user_id = auth.uid() AND p.can_answer_forum)) WITH CHECK (true);
CREATE POLICY "forum q delete" ON public.forum_questions FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.forum_answers (
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
CREATE POLICY "forum a delete" ON public.forum_answers FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.assignments (
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
CREATE POLICY "assignments manage" ON public.assignments FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.employee_permissions p WHERE p.user_id = auth.uid() AND p.can_manage_assignments)) WITH CHECK (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.employee_permissions p WHERE p.user_id = auth.uid() AND p.can_manage_assignments));

CREATE TABLE public.assignment_submissions (
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
CREATE POLICY "submissions read" ON public.assignment_submissions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.employee_permissions p WHERE p.user_id = auth.uid() AND p.can_manage_assignments));
CREATE POLICY "submissions insert" ON public.assignment_submissions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "submissions update" ON public.assignment_submissions FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.employee_permissions p WHERE p.user_id = auth.uid() AND p.can_manage_assignments)) WITH CHECK (true);

CREATE TABLE public.ebooks (
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
CREATE POLICY "ebooks manage" ON public.ebooks FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.bootcamps (
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
CREATE POLICY "bootcamps manage" ON public.bootcamps FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.messages (
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
CREATE POLICY "messages read" ON public.messages FOR SELECT TO authenticated USING (sender_id = auth.uid() OR recipient_id = auth.uid() OR is_broadcast OR public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.employee_permissions p WHERE p.user_id = auth.uid() AND p.can_reply_messages));
CREATE POLICY "messages insert" ON public.messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());
CREATE POLICY "messages update" ON public.messages FOR UPDATE TO authenticated USING (recipient_id = auth.uid() OR sender_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.employee_permissions p WHERE p.user_id = auth.uid() AND p.can_reply_messages)) WITH CHECK (true);

CREATE TABLE public.orders (
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
CREATE POLICY "orders read" ON public.orders FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "orders insert" ON public.orders FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.job_openings (
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
CREATE POLICY "jobs read" ON public.job_openings FOR SELECT USING (is_open OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "jobs manage" ON public.job_openings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  job_id UUID REFERENCES public.job_openings ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.contact_submissions TO anon;
GRANT SELECT, INSERT ON public.contact_submissions TO authenticated;
GRANT ALL ON public.contact_submissions TO service_role;
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can contact" ON public.contact_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "admins read contact" ON public.contact_submissions FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own activity" ON public.activity_log FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "log own activity" ON public.activity_log FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- DEMO CONTENT
INSERT INTO public.courses (id, title, slug, description, track, price, is_published, is_crash_course, instructor_name, instructor_bio, thumbnail_url) VALUES
 ('11111111-1111-1111-1111-111111111111','Full Stack Web Development','full-stack-web-development','Go from HTML basics to deploying production React + Node applications. Build 4 real projects along the way.','Full Stack Development',14999,true,false,'Shubham Vashistha','Engineer and founder of Gradient Code with 8+ years shipping production web apps.',null),
 ('22222222-2222-2222-2222-222222222222','Data Science & AI Foundations','data-science-ai-foundations','Python, pandas, machine learning and a capstone AI project you can show recruiters.','Data Science & AI',17999,true,false,'Aarav Mehta','Data scientist working on ML systems at scale.',null),
 ('33333333-3333-3333-3333-333333333333','Cloud & DevOps Essentials','cloud-devops-essentials','Docker, CI/CD, AWS fundamentals and infrastructure as code.','Cloud & DevOps',13999,true,false,'Neha Kapoor','DevOps lead automating deployments for high-traffic platforms.',null),
 ('44444444-4444-4444-4444-444444444444','Git & GitHub Crash Course','git-github-crash-course','Ship confidently with branches, pull requests and clean commit history in under two hours.','Full Stack Development',499,true,true,'Shubham Vashistha','Engineer and founder of Gradient Code.',null),
 ('55555555-5555-5555-5555-555555555555','Cybersecurity Fundamentals','cybersecurity-fundamentals','Threat modelling, secure coding and hands-on labs with real vulnerabilities.','Cybersecurity',15999,true,false,'Imran Sheikh','Security engineer and CTF player.',null);

INSERT INTO public.course_modules (id, course_id, title, order_index) VALUES
 ('aaaaaaa1-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Getting Started',0),
 ('aaaaaaa1-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','React Fundamentals',1),
 ('aaaaaaa1-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','Backend & Deployment',2),
 ('aaaaaaa2-0000-0000-0000-000000000001','22222222-2222-2222-2222-222222222222','Python for Data',0),
 ('aaaaaaa2-0000-0000-0000-000000000002','22222222-2222-2222-2222-222222222222','Machine Learning',1);

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
 ('aaaaaaa2-0000-0000-0000-000000000002','Your first model','video',null,'Train, evaluate, iterate.',2000,0,false);

INSERT INTO public.assignments (course_id, title, description) VALUES
 ('11111111-1111-1111-1111-111111111111','Build a portfolio page','Ship a responsive personal portfolio and submit the deployed link.'),
 ('22222222-2222-2222-2222-222222222222','Clean a public dataset','Pick any Kaggle dataset, clean it and submit your notebook.');

INSERT INTO public.ebooks (title, category) VALUES
 ('The Gradient Code Interview Handbook','Career'),
 ('50 JavaScript Patterns You Should Know','Full Stack Development');

INSERT INTO public.bootcamps (title, description, cohort_start_date, seats_total, seats_filled) VALUES
 ('Full Stack Career Bootcamp','12-week live cohort with mentors, mock interviews and placement support.','2026-09-01',40,26);

INSERT INTO public.job_openings (title, department, location, description) VALUES
 ('Instructor — Data Science','Teaching','Remote (India)','Design and deliver our data science curriculum.'),
 ('Community & Support Associate','Support','Delhi NCR / Hybrid','Be the first response for our learners.');