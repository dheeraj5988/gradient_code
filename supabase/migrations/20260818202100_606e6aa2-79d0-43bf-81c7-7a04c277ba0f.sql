delete from public.lessons where module_id in (select id from public.course_modules where course_id in (select id from public.courses where slug='data-science-python-with-ai'));
delete from public.course_modules where course_id in (select id from public.courses where slug='data-science-python-with-ai');
insert into public.courses (title, slug, description, track, price, is_published, is_crash_course, access_policy, instructor_name, instructor_bio, thumbnail_url)
values ('Data Science with Python & AI','data-science-python-with-ai',
 'A complete, project-driven journey from Python fundamentals to exploratory data analysis, web scraping, machine learning and deep learning. Includes real-world projects such as fake news detection, Parkinson''s disease detection and end-to-end data science case studies.',
 'Data Science & AI', 14999, true, false, 'lifetime', 'Gradient Code Faculty', 'Industry mentors with hands-on experience in data science, machine learning and AI engineering.', null)
on conflict (slug) do update set title=excluded.title, description=excluded.description, track=excluded.track, is_published=true, instructor_name=excluded.instructor_name, instructor_bio=excluded.instructor_bio;

with m as (insert into public.course_modules (course_id, title, order_index) select id, 'Introduction', 1 from public.courses where slug='data-science-python-with-ai' returning id)
insert into public.lessons (module_id, title, type, video_url, duration_seconds, order_index, is_free_preview) values
((select id from m), 'Session 1', 'video', 'https://drive.google.com/file/d/1fynKAq8c--bHyTgNMOuKPxLpTNz6hnDq/preview', 0, 1, true),
((select id from m), 'Session 2', 'video', 'https://drive.google.com/file/d/1ySiLkuMNLKNL9tCxQhWYPVH3e3pKfefg/preview', 0, 2, false),
((select id from m), 'Session 3', 'video', 'https://drive.google.com/file/d/1mWLYi5GCaWRYxw5_mXPmo1bvW-UlkYfx/preview', 0, 3, false);
with m as (insert into public.course_modules (course_id, title, order_index) select id, 'Operators & Control Flow', 2 from public.courses where slug='data-science-python-with-ai' returning id)
insert into public.lessons (module_id, title, type, video_url, duration_seconds, order_index, is_free_preview) values
((select id from m), 'Session 4', 'video', 'https://drive.google.com/file/d/1dIl_H1eUmXRUVzrjBaTjoxQwbfl7XnmD/preview', 0, 1, false);
with m as (insert into public.course_modules (course_id, title, order_index) select id, 'Python String Data', 3 from public.courses where slug='data-science-python-with-ai' returning id)
insert into public.lessons (module_id, title, type, video_url, duration_seconds, order_index, is_free_preview) values
((select id from m), 'Python String Data — Session 1', 'video', 'https://drive.google.com/file/d/16RMgEO_LOWvF1rPihVVr5WDnOFcj3Krw/preview', 0, 1, false);
with m as (insert into public.course_modules (course_id, title, order_index) select id, 'Announcements', 4 from public.courses where slug='data-science-python-with-ai' returning id)
insert into public.lessons (module_id, title, type, video_url, duration_seconds, order_index, is_free_preview) values
((select id from m), 'Course Announcement', 'video', 'https://drive.google.com/file/d/1nX_mftnVdy9Nl6aAWQXeFe_4j3mu-JDR/preview', 0, 1, false);
with m as (insert into public.course_modules (course_id, title, order_index) select id, 'GitHub', 5 from public.courses where slug='data-science-python-with-ai' returning id)
insert into public.lessons (module_id, title, type, video_url, duration_seconds, order_index, is_free_preview) values
((select id from m), 'Working with GitHub', 'video', 'https://drive.google.com/file/d/1cbbleYuN0z2iRLRww1HZDhIYiTanfthP/preview', 0, 1, false);
with m as (insert into public.course_modules (course_id, title, order_index) select id, 'Modules & Functions', 6 from public.courses where slug='data-science-python-with-ai' returning id)
insert into public.lessons (module_id, title, type, video_url, duration_seconds, order_index, is_free_preview) values
((select id from m), 'Modules & Functions — Session 1', 'video', 'https://drive.google.com/file/d/1y9INFBOj-FmnrEo-fPj5dZX8XtPjBfwT/preview', 0, 1, false);
with m as (insert into public.course_modules (course_id, title, order_index) select id, 'Packages & Data Types', 7 from public.courses where slug='data-science-python-with-ai' returning id)
insert into public.lessons (module_id, title, type, video_url, duration_seconds, order_index, is_free_preview) values
((select id from m), 'Packages & Data Types — Session 1', 'video', 'https://drive.google.com/file/d/1FaajjrcgSYA9QuVq2F7cJPY6-045t8oY/preview', 0, 1, false);
with m as (insert into public.course_modules (course_id, title, order_index) select id, 'Installation & Setup', 8 from public.courses where slug='data-science-python-with-ai' returning id)
insert into public.lessons (module_id, title, type, video_url, duration_seconds, order_index, is_free_preview) values
((select id from m), 'Session 11 — Installation', 'video', 'https://drive.google.com/file/d/14wN2CbJBRsKlcad1vcFg4AXgYsY_AXiz/preview', 0, 1, false);
with m as (insert into public.course_modules (course_id, title, order_index) select id, 'EDA Basics', 9 from public.courses where slug='data-science-python-with-ai' returning id)
insert into public.lessons (module_id, title, type, video_url, duration_seconds, order_index, is_free_preview) values
((select id from m), 'Session 12 — EDA Basics', 'video', 'https://drive.google.com/file/d/1-j1EoAw3ZNdM7qYp67HsKpRjt0vk-8a-/preview', 0, 1, false);
with m as (insert into public.course_modules (course_id, title, order_index) select id, 'Packages & Data Types — Part 2', 10 from public.courses where slug='data-science-python-with-ai' returning id)
insert into public.lessons (module_id, title, type, video_url, duration_seconds, order_index, is_free_preview) values
((select id from m), 'Session 13 — Packages & Data Types (Part 2)', 'video', 'https://drive.google.com/file/d/1QJtvc8dhSf1r4Bvmpe1NtVs7Ba3_kFPU/preview', 0, 1, false);
with m as (insert into public.course_modules (course_id, title, order_index) select id, 'EDA Mini Projects', 11 from public.courses where slug='data-science-python-with-ai' returning id)
insert into public.lessons (module_id, title, type, video_url, duration_seconds, order_index, is_free_preview) values
((select id from m), 'Session 14 — EDA Mini Project', 'video', 'https://drive.google.com/file/d/1D6sFNVWW6xlB4lqlbu50kvrzmvi0XkOA/preview', 0, 1, false),
((select id from m), 'Session 15 — EDA Project', 'video', 'https://drive.google.com/file/d/1eXJmJSImyho1mqO1VqzkhM5eU2E1PQis/preview', 0, 2, false),
((select id from m), 'Session 16 — EDA Projects', 'video', 'https://drive.google.com/file/d/1QIMvlR8TQKoT91sXarCKk_R__mFrCCIT/preview', 0, 3, false);
with m as (insert into public.course_modules (course_id, title, order_index) select id, 'Web Scraping', 12 from public.courses where slug='data-science-python-with-ai' returning id)
insert into public.lessons (module_id, title, type, video_url, duration_seconds, order_index, is_free_preview) values
((select id from m), 'Session 17 — Web Scraping', 'video', 'https://drive.google.com/file/d/1Hi6rhUvCXZkRY9Afj5iAc0DtK1te6Qup/preview', 0, 1, false);
with m as (insert into public.course_modules (course_id, title, order_index) select id, 'Data Science Project', 13 from public.courses where slug='data-science-python-with-ai' returning id)
insert into public.lessons (module_id, title, type, video_url, duration_seconds, order_index, is_free_preview) values
((select id from m), 'Session 18 — Data Science Project', 'video', 'https://drive.google.com/file/d/1tHnJj4qz0Y49N2Xo_8UCgVZZn6IrK1Ws/preview', 0, 1, false);
with m as (insert into public.course_modules (course_id, title, order_index) select id, 'Data Science with Machine Learning', 14 from public.courses where slug='data-science-python-with-ai' returning id)
insert into public.lessons (module_id, title, type, video_url, duration_seconds, order_index, is_free_preview) values
((select id from m), 'Session 19 — Data Science & Machine Learning', 'video', 'https://drive.google.com/file/d/1-cRnV_zewny7Lg6-VrkA3ZRFD2Kl9NCz/preview', 0, 1, false),
((select id from m), 'Session 20 — Data Science & Machine Learning', 'video', 'https://drive.google.com/file/d/1e95NViQleVPdlWPi6G6kZjHMNt80pLi9/preview', 0, 2, false);
with m as (insert into public.course_modules (course_id, title, order_index) select id, 'Major Machine Learning Algorithms', 15 from public.courses where slug='data-science-python-with-ai' returning id)
insert into public.lessons (module_id, title, type, video_url, duration_seconds, order_index, is_free_preview) values
((select id from m), 'Session 21 — Major Machine Learning Algorithms', 'video', 'https://drive.google.com/file/d/1H-DakpUV3fkmNni7ErOXj34SlM3xFmc2/preview', 0, 1, false);
with m as (insert into public.course_modules (course_id, title, order_index) select id, 'Fake News Detection Practicals', 16 from public.courses where slug='data-science-python-with-ai' returning id)
insert into public.lessons (module_id, title, type, video_url, duration_seconds, order_index, is_free_preview) values
((select id from m), 'Session 22 — Fake News Practical (Part 1)', 'video', 'https://drive.google.com/file/d/1Q5yf95V_hhApvC3eMFQDK1A3HkfCbk3x/preview', 0, 1, false),
((select id from m), 'Session 23 — Fake News Practical (Part 2)', 'video', 'https://drive.google.com/file/d/1U4zqIvSsRhXi5Q5xJy_v67cLKh_b5ZbA/preview', 0, 2, false);
with m as (insert into public.course_modules (course_id, title, order_index) select id, 'Databases for Data Science', 17 from public.courses where slug='data-science-python-with-ai' returning id)
insert into public.lessons (module_id, title, type, video_url, duration_seconds, order_index, is_free_preview) values
((select id from m), 'Session 24 — Database Introduction for Data Science', 'video', 'https://drive.google.com/file/d/1XZJ4wlTYx8B33fJbAu6fG3iYFgsnG7tC/preview', 0, 1, false);
with m as (insert into public.course_modules (course_id, title, order_index) select id, 'Detecting Parkinson''s Disease', 18 from public.courses where slug='data-science-python-with-ai' returning id)
insert into public.lessons (module_id, title, type, video_url, duration_seconds, order_index, is_free_preview) values
((select id from m), 'Session 25 — Detecting Parkinson''s Disease', 'video', 'https://drive.google.com/file/d/19M1zaB3TGQWpSKimfJQ3ffaeaZJOhEwJ/preview', 0, 1, false),
((select id from m), 'Session 27 — Detecting Parkinson''s Disease (Part 2)', 'video', 'https://drive.google.com/file/d/1SqosdsHmkhJE1pUuawh9pZ3x3GMIgyiG/preview', 0, 2, false);
with m as (insert into public.course_modules (course_id, title, order_index) select id, 'Data Analysis using Pandas', 19 from public.courses where slug='data-science-python-with-ai' returning id)
insert into public.lessons (module_id, title, type, video_url, duration_seconds, order_index, is_free_preview) values
((select id from m), 'Session 29 — Data Analysis using Pandas (Part 1)', 'video', 'https://drive.google.com/file/d/1LffHKi_TWwo6a4gtXuB6HPIFNUzLHQSj/preview', 0, 1, false),
((select id from m), 'Session 30 — Data Analysis using Pandas (Part 2)', 'video', 'https://drive.google.com/file/d/1wdT3pI3a0s1Cs2DTWbJyek8uHmzZdPMH/preview', 0, 2, false);
with m as (insert into public.course_modules (course_id, title, order_index) select id, 'In-depth Machine Learning Algorithms', 20 from public.courses where slug='data-science-python-with-ai' returning id)
insert into public.lessons (module_id, title, type, video_url, duration_seconds, order_index, is_free_preview) values
((select id from m), 'Session 31 — In-depth ML Algorithms (Part 1)', 'video', 'https://drive.google.com/file/d/19SC8FCDTVkERZntx3iQdcT2QIxoqpjWO/preview', 0, 1, false),
((select id from m), 'Session 32 — In-depth ML Algorithms (Part 2)', 'video', 'https://drive.google.com/file/d/1XZz8KJy-dZzD6tiLujMBTXphk65iXER5/preview', 0, 2, false);
with m as (insert into public.course_modules (course_id, title, order_index) select id, 'Deep Learning', 21 from public.courses where slug='data-science-python-with-ai' returning id)
insert into public.lessons (module_id, title, type, video_url, duration_seconds, order_index, is_free_preview) values
((select id from m), 'Session 33 — Deep Learning (Part 1)', 'video', 'https://drive.google.com/file/d/1a8lC5XYMn6aTHzOmKGaxDmj2tCXDnpx6/preview', 0, 1, false),
((select id from m), 'Session 34 — Deep Learning (Part 2)', 'video', 'https://drive.google.com/file/d/1KJaC0p8e4xSCTt5jebfV-cZSE0GxFi2X/preview', 0, 2, false);