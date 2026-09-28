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