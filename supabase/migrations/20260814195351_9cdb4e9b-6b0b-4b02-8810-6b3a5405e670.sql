DROP POLICY "published courses public" ON public.courses;
CREATE POLICY "anon read published courses" ON public.courses FOR SELECT TO anon USING (is_published);
CREATE POLICY "auth read courses" ON public.courses FOR SELECT TO authenticated USING (is_published OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'employee'));

DROP POLICY "modules readable" ON public.course_modules;
CREATE POLICY "anon read modules" ON public.course_modules FOR SELECT TO anon USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.is_published));
CREATE POLICY "auth read modules" ON public.course_modules FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND (c.is_published OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'employee'))));

DROP POLICY "lessons readable" ON public.lessons;
CREATE POLICY "anon read lessons" ON public.lessons FOR SELECT TO anon USING (EXISTS (SELECT 1 FROM public.course_modules m JOIN public.courses c ON c.id = m.course_id WHERE m.id = module_id AND c.is_published));
CREATE POLICY "auth read lessons" ON public.lessons FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.course_modules m JOIN public.courses c ON c.id = m.course_id WHERE m.id = module_id AND (c.is_published OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'employee'))));

DROP POLICY "jobs read" ON public.job_openings;
CREATE POLICY "anon read jobs" ON public.job_openings FOR SELECT TO anon USING (is_open);
CREATE POLICY "auth read jobs" ON public.job_openings FOR SELECT TO authenticated USING (is_open OR public.has_role(auth.uid(),'admin'));

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;