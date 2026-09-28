GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update contact" ON public.contact_submissions FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins insert enrollments" ON public.enrollments FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));