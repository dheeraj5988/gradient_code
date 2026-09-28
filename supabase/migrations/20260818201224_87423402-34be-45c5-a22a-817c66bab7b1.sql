INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM public.profiles WHERE email = 'admin@dreamcrest.net'
ON CONFLICT (user_id, role) DO NOTHING;