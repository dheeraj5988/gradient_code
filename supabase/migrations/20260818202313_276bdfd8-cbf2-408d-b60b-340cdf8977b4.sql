insert into public.enrollments (user_id, course_id, source)
select u.id, c.id, 'manual'
from auth.users u, public.courses c
where u.email = 'testuser@gmailx.com' and c.slug = 'data-science-python-with-ai'
and not exists (select 1 from public.enrollments e where e.user_id = u.id and e.course_id = c.id);