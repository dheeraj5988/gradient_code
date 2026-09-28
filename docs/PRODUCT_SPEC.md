# Gradient Code — Product Specification

> SOURCE OF TRUTH for product, design and architecture. Agents: read the section relevant to your task before coding.
> Section index: PRODUCT VISION · BRAND · VISUAL DESIGN · GLOBAL NAVIGATION · MARKETING WEBSITE · COURSE CATALOG · COURSE DETAIL PAGE · COURSE LEARNING PORTAL · PRACTICE SYSTEM · RESOURCES · NOTES · INTERVIEW PREP · PROJECT SYSTEM · ASSESSMENT · CERTIFICATE ELIGIBILITY ENGINE · INTERNSHIP ELIGIBILITY ENGINE · ADMIN PANEL · PAYMENT SYSTEM · SECURITY · DATABASE DESIGN · DESIGN TOKENS / SYSTEM · PHASES.

## Phase-1 implemented design tokens
See `src/app/globals.css`. Brand blue `#2563EB` (hover `#1D4ED8`), text `#0F172A` / `#475569`, border `#E2E8F0`, surfaces `#FFFFFF` / `#F8FAFC`, radius 8px (`rounded-lg`) for controls, 12px (`rounded-xl`) for cards. Inter everywhere; JetBrains Mono only for code.

---

```text
You are the lead product architect, senior frontend engineer, backend engineer, UI/UX designer and EdTech LMS engineer responsible for transforming the existing Gradient Code project into a production-quality EdTech platform.

IMPORTANT:
This is an EXISTING project.

Do NOT:
- re-scaffold the application
- replace the current stack unnecessarily
- create a new project
- destroy existing working functionality
- randomly rewrite the entire codebase
- introduce unnecessary dependencies
- create fake statistics
- create fake testimonials
- create fake companies
- create fake student outcomes
- hardcode data that should be stored in the database

First inspect the entire repository and understand:
- current architecture
- routes
- Supabase schema
- authentication
- current components
- design system
- existing course structure
- current dashboard
- current admin structure
- existing migrations
- existing TODOs
- existing payment architecture
- existing internship architecture
- existing certificate architecture

Read these files first if they exist:
- AGENTS.md
- README.md
- docs/ROADMAP.md
- docs/RESEARCH.md
- package.json
- all relevant Supabase migrations
- current route structure
- current design/token files

The final product must feel like a REAL PROFESSIONAL EDTECH COMPANY, not an AI-generated SaaS landing page.

======================================================================
                    PRODUCT VISION
======================================================================

Gradient Code should become a professional learning and career platform based on this lifecycle:

DISCOVER
    ↓
PURCHASE / ENROLL
    ↓
LEARN
    ↓
PRACTICE
    ↓
BUILD PROJECTS
    ↓
COMPLETE ASSESSMENTS
    ↓
BECOME CERTIFICATE ELIGIBLE
    ↓
BUILD LEARNER PROFILE
    ↓
BECOME INTERNSHIP ELIGIBLE
    ↓
APPLY FOR INTERNSHIPS
    ↓
BUILD EXPERIENCE
    ↓
SHOWCASE PORTFOLIO

The product should therefore not feel like only:
- Udemy
- Coursera
- LinkedIn Learning
- Internshala
- Apna College

Instead, combine useful patterns from those products while creating a distinct Gradient Code experience.

The central product concept is:

LEARN → PRACTICE → BUILD → CERTIFY → EXPERIENCE

======================================================================
                  IMPORTANT UI REFERENCE
======================================================================

I am providing a screenshot from Apna College as a UX reference.

Analyze the screenshot carefully.

Use the following patterns as inspiration:

1. Dedicated learning/problem-solving workspace
2. Left navigation for learning resources
3. Top global search
4. Progress visualization
5. Difficulty breakdown
6. Daily/structured learning plan
7. Topic/section based question grouping
8. Expandable topic accordions
9. Practice questions associated with topics
10. Saved questions
11. Downloadable notes/resources
12. Interview preparation area
13. Personalized progress
14. Clear completion indicators

DO NOT copy:
- Apna College branding
- logo
- colors exactly
- text
- layout pixel-for-pixel
- proprietary illustrations
- proprietary assets
- exact wording
- exact page structure

Create an ORIGINAL Gradient Code interface inspired by the underlying UX concepts.

The screenshot should be treated as design research, not a template to clone.

======================================================================
                         BRAND
======================================================================

Brand:
Gradient Code

Positioning:

Professional, modern, practical EdTech platform for students and early-career developers.

Brand personality:
- trustworthy
- educational
- career-focused
- practical
- clean
- technical
- modern
- premium
- credible

The website must NOT look like:
- AI startup landing page
- crypto dashboard
- gaming website
- neon developer portfolio
- generic Lovable template

======================================================================
                     VISUAL DESIGN
======================================================================

The current project uses too much:
- gradients
- dark surfaces
- glow
- blobs
- decorative grids
- floating effects
- gradient text
- oversized rounded cards
- visual gimmicks

Reduce or remove these.

Create a professional EdTech design system.

PRIMARY MODE:
Light-first.

Core palette:

Background:
#FFFFFF
#F8FAFC

Primary text:
#0F172A

Secondary text:
#475569

Borders:
#E2E8F0

Primary brand:
professional blue

Success:
restrained green

Warning:
restrained amber

Danger:
restrained red

Do NOT use purple/pink neon gradients as the primary identity.

Use gradients only where genuinely useful and very sparingly.

Typography:
Use Inter as the primary interface font.

Use JetBrains Mono only for:
- source code
- code snippets
- programming problem inputs/outputs
- developer terminal content

Do NOT use decorative fonts throughout the marketing website.

Spacing:
Use a consistent 4/8-based spacing system.

Radius:
Mostly 8px–12px.

Avoid making every component extremely rounded.

Shadows:
Subtle and restrained.

Borders:
Use borders heavily enough to establish structure.

Animation:
Use minimal functional animation.

Appropriate:
- hover
- dropdown
- modal
- progress
- skeleton loading
- accordion
- transitions

Avoid:
- floating blobs
- constant motion
- glowing animation
- unnecessary background movement

======================================================================
                    GLOBAL NAVIGATION
======================================================================

Create a professional global header.

Desktop:

Gradient Code logo

Navigation:
Courses
Programs
Internships
Projects
Resources

Search

Login

Get Started

Possible secondary menu items:
Practice
Certificates
Career

Do NOT put too many items in the top navigation.

Avoid:
Pricing
Crash Courses
About
Contact

as primary navigation items unless they are strategically important.

These can be moved to footer or secondary areas.

======================================================================
                     MARKETING WEBSITE
======================================================================

Redesign the public website.

Homepage structure:

1. Header

2. Professional hero

Example positioning:

Learn practical skills.
Build real projects.
Get certified.
Gain real-world experience.

Supporting text:
Industry-oriented courses and programs designed to help students develop practical technical skills and demonstrate them through projects and assessments.

CTAs:
Explore Courses
Explore Programs

Do not invent performance numbers.

3. Search / discover section

Search courses, programs, projects and internships.

4. Popular categories

Examples:
- Full Stack Development
- Data Analytics
- Data Science
- Artificial Intelligence
- Machine Learning
- Cybersecurity
- Cloud Computing
- Programming
- DevOps

Categories should come from database where possible.

5. Featured courses

6. Career programs

7. Hands-on project showcase

8. Practice / problem-solving showcase

9. Internship showcase

10. How Gradient Code works

LEARN
↓
PRACTICE
↓
BUILD
↓
CERTIFY
↓
GAIN EXPERIENCE

11. Instructor/mentor section

12. Student stories

Only use real data when available.

13. Certificate explanation

14. Career opportunities

15. FAQ

16. Professional footer

======================================================================
                     COURSE CATALOG
======================================================================

Create a mature marketplace experience.

Route:

/courses

Features:
- search
- categories
- subcategories
- level
- duration
- price
- rating
- language
- certificate availability
- internship eligibility
- project count
- sort
- pagination or infinite loading

Create professional filter controls.

Course cards should contain:

thumbnail
category
title
short description
instructor
rating
review count
student count if real
duration
difficulty
project count
certificate badge
internship badge where applicable
price
original price only when actually configured
discount only when actually configured
wishlist button
CTA

Do not make course cards look like SaaS feature cards.

They must look like learning products.

======================================================================
                     COURSE DETAIL PAGE
======================================================================

The course detail page should be commercially strong.

Structure:

Breadcrumbs

Category

Course title

Subtitle

Rating

Reviews

Learner count

Instructor

Last updated date

Course preview

Purchase box

Price

Original price when applicable

Discount

Access period

Certificate

Projects

Resources

Internship eligibility

Buy now

Add to wishlist

Preview content

Then:

What you will learn

Learning outcomes

Skills

Curriculum

Modules

Lessons

Duration

Projects

Assignments

Practice questions

Quizzes

Requirements

Who this course is for

Instructor

Certificate

Internship pathway

Student reviews

FAQ

Related courses

======================================================================
            NEW FEATURE: COURSE LEARNING PORTAL
======================================================================

This is one of the most important changes.

Every purchased course should have a dedicated learning portal.

Example route:

/learn/[courseSlug]

or:

/dashboard/courses/[courseId]

This is NOT the same as the marketing course page.

After purchase, the learner enters a full learning workspace.

The learning workspace should have:

LEFT SIDEBAR

Course title

Overall progress

Modules

Lessons

Practice

Projects

Quizzes

Resources

Notes

Certificates

Internship

RIGHT/MAIN CONTENT

Current lesson/practice material.

Create a persistent learner navigation.

======================================================================
                   LEARNING PORTAL SIDEBAR
======================================================================

Example:

COURSE

Introduction
Module 1
Module 2
Module 3
Module 4

PRACTICE

Practice Questions
Coding Problems
Quizzes
Assignments

RESOURCES

Notes
Downloads
Cheat Sheets
Reference Material

CAREER

Projects
Certificate
Internship

Use database-driven navigation.

Do NOT hardcode modules.

======================================================================
                  COURSE PROGRESS ENGINE
======================================================================

Implement a real progress engine.

Track:

course progress
module progress
lesson progress
video progress
quiz progress
question progress
project progress
assignment progress

Progress should update automatically.

Example:

Course completion:
68%

Module 3:
82%

Practice:
45/60

Projects:
3/5

Quiz:
7/10

The progress engine should be database-backed.

Do not calculate everything only in frontend state.

======================================================================
                 NEW FEATURE: PRACTICE SYSTEM
======================================================================

Create a first-class practice platform INSIDE Gradient Code.

Inspired by the screenshot's problem-solving experience.

Each course can have its own practice system.

Example:

/practice/[courseSlug]

or:

/learn/[courseSlug]/practice

The practice dashboard should show:

Course Practice

Overall progress

Questions solved

Questions remaining

Difficulty breakdown

Easy
Medium
Hard

Topic completion

Current streak only when backed by real activity data.

Saved questions

Recent activity

Recommended questions

Continue practice

======================================================================
                PRACTICE PAGE LAYOUT
======================================================================

Create an interface inspired by the supplied screenshot.

Desktop:

LEFT SIDEBAR

Course practice menu

Overview
Practice
Questions
Saved
Resources
Notes
Interview Prep

MAIN AREA

Header:
Course / Practice title

Description

Progress summary

Overall progress ring

Questions solved / total

Difficulty progress

Easy
Medium
Hard

Topic progress

Daily practice plan

Question list grouped by:
- topic
- module
- day
- difficulty

Each section should be expandable.

Example:

Day 1 — Arrays

0 / 6 completed

Day 2 — Arrays

0 / 6 completed

Day 3 — Strings

0 / 6 completed

But make the data dynamic and course-specific.

======================================================================
              PRACTICE QUESTION DATA MODEL
======================================================================

Create a scalable question model.

Possible tables/entities:

questions
question_topics
question_tags
question_difficulties
question_options
question_test_cases
question_solutions
question_resources
question_attempts
saved_questions
question_progress

Each question should support:

id
course_id
module_id
topic_id
title
slug
description
difficulty
question_type
explanation
solution
hint
estimated_time
points
order_index
is_published

Question types should support:

MCQ
multiple-select
true/false
short-answer
coding
output prediction
debugging
technical concept
scenario-based

======================================================================
                COURSE-SPECIFIC PRACTICE
======================================================================

Important:

Questions must be associated with the purchased course.

Example:

Full Stack course:

HTML
CSS
JavaScript
React
Node.js
Express
MongoDB
APIs
Authentication
Deployment

Data Science course:

Python
NumPy
Pandas
SQL
Statistics
EDA
Machine Learning
Deep Learning

Cybersecurity course:

Networking
Linux
OWASP
Web Security
Authentication
Encryption
Vulnerability Analysis

Questions must be mapped to course/module/topic.

This makes the platform scalable.

Admin should be able to create a new course and attach its own question bank.

======================================================================
                  QUESTION SOLVING PAGE
======================================================================

Create a professional question interface.

Top:

Question number
Topic
Difficulty
Points

Main:

Question statement

Examples

Input/output where relevant

Hints

Resources

Answer area

For MCQ:
options

For coding:
code editor

For short answer:
text input

Actions:

Check Answer
Submit
Save
Add Note
Next Question

After submission:

Correct / Incorrect

Explanation

Expected answer

Concept

Related lesson

Related resource

Next recommended question

Do not expose the answer before submission.

======================================================================
                     CODING PLATFORM
======================================================================

Create a coding-practice architecture.

Do NOT attempt to build a full LeetCode clone immediately.

Create the architecture so it can later support:

- code editor
- language selection
- test cases
- sample input
- expected output
- submission history
- execution status
- compile errors
- runtime errors
- test case results

Supported languages can initially be limited.

Prefer server-side code execution architecture.

Do NOT execute arbitrary user-submitted code directly inside the Next.js web server.

Design an isolated execution service/container architecture.

For MVP, if secure execution infrastructure is not implemented yet:
display the coding editor and clearly mark execution as pending.

Never create an insecure eval-based code runner.

======================================================================
                 QUESTION PROGRESS
======================================================================

For each learner, track:

not_started
attempted
incorrect
correct
mastered

Track:
- first attempt
- last attempt
- attempts count
- best result
- completion date
- time spent

Progress calculation must be deterministic.

Example:

100 questions

62 correct
18 attempted but incorrect
20 untouched

Overall:
62%

But provide more useful metrics such as:
62/100 solved
62%

======================================================================
                  PERSONALIZED PLAN
======================================================================

Implement a course-specific learning planner.

Like the screenshot:

Plan Your Learning

But make it more useful for Gradient Code.

Allow:

Target completion date

Hours/day

Preferred days

Current level

Learning goal

Then generate a schedule.

Example:

Day 1
Module 1
Lessons 1–3
Practice 5 questions

Day 2
Lessons 4–6
Practice 5 questions

Day 3
Quiz
Practice 8 questions

The plan should update based on progress.

Do not use fake AI personalization.

A deterministic rules-based planner is acceptable initially.

Later architecture can support AI recommendations.

======================================================================
                     RESOURCES SYSTEM
======================================================================

Every course should have related resources.

Resource types:

PDF
Notes
Cheat sheet
External link
Code repository
Dataset
Template
Presentation
Recording
Reference article

Each resource should contain:

title
description
type
file/url
module
lesson
course
access requirement

Student should be able to:

view
download
bookmark
search

Add:

/learn/[course]/resources

======================================================================
                    NOTES SYSTEM
======================================================================

Allow students to take personal notes.

Notes may be associated with:

course
module
lesson
timestamp
question

Student actions:

Add note
Edit note
Delete note
Search notes

This makes the learner portal more useful.

======================================================================
                  SAVED QUESTIONS
======================================================================

Allow:

Save question

Saved page:

/practice/saved

Show:

question
topic
difficulty
saved date
completion state

Allow filtering.

======================================================================
                   INTERVIEW PREP
======================================================================

Create:

/learn/[course]/interview

Course-specific interview preparation.

Examples:

Technical interview questions

Common interview questions

Role-specific questions

Scenario questions

Rapid revision

Interview checklist

Students should be able to mark interview questions as:

Not reviewed
Reviewed
Confident

======================================================================
                     PROJECT SYSTEM
======================================================================

Projects must become a first-class feature.

Route:

/projects
/projects/[slug]

Project contains:

title
thumbnail
description
difficulty
estimated time
skills
technologies
course
module
learning outcomes
requirements
starter resources
repository template
submission instructions
rubric

Student can submit:

GitHub repository
Live URL
files
description
screenshots

Track:

Not started
In progress
Submitted
Needs revision
Approved
Completed

Mentor/admin feedback should be supported.

======================================================================
                 COURSE ASSESSMENT SYSTEM
======================================================================

Courses should support assessments.

Types:

Module quiz
Topic quiz
Final assessment
Practice assessment
Project assessment

Store:

questions
answers
score
attempts
passing score
time limit if applicable

Do not automatically award certificates simply because the learner watched videos.

======================================================================
                CERTIFICATE ELIGIBILITY ENGINE
======================================================================

IMPORTANT:

Certificate eligibility must be based on explicit configurable requirements.

Create a configurable certificate policy.

Example requirements:

1. Course enrollment
2. Minimum course progress
3. All required lessons complete
4. Required quizzes passed
5. Minimum final assessment score
6. Required projects submitted
7. Required projects approved
8. Required practice questions completed

Admin must be able to configure which requirements are mandatory.

Example:

Certificate requirements:

Course lessons:
100%

Required quizzes:
80% average

Final assessment:
70%

Projects:
4/4

Practice:
80%

When all conditions are satisfied:

Status:
CERTIFICATE ELIGIBLE

Then allow:

Generate Certificate

Do NOT generate a certificate simply from frontend progress.

Certificate issuance must be verified server-side.

======================================================================
                INTERNSHIP ELIGIBILITY ENGINE
======================================================================

Internship eligibility must also be configurable.

Example:

Course progress >= 90%

All mandatory modules completed

Practice questions >= 80%

Final assessment >= 70%

Projects completed >= 80%

Profile completion >= 90%

Resume uploaded

Then:

Internship eligible

The admin can choose different criteria per program/course.

Create an eligibility engine.

Example:

certificate_policy
internship_policy

with configurable rules.

======================================================================
                 CERTIFICATE PAGE
======================================================================

Student page:

/certificates

Display:

Certificate title
Course
Issue date
Credential ID
Verification URL
Download PDF
Share

Create public verification route:

/verify/[credentialId]

Public verification should show:

Valid certificate
Student name
Course/program
Issue date
Credential ID

Only expose information intentionally made public.

======================================================================
               INTERNSHIP MARKETPLACE
======================================================================

Create a professional internship marketplace.

Route:

/internships

Filters:

role
skills
mode
location
duration
stipend
eligibility
course
deadline

Internship cards:

Role
Company
Mode
Location
Duration
Stipend
Skills
Deadline
Eligibility

Internship detail:

Overview
Responsibilities
Requirements
Skills
Duration
Stipend
Perks
Eligibility
Application process

Apply button.

======================================================================
                  APPLICATION WORKFLOW
======================================================================

Student application states:

Draft
Applied
Under Review
Shortlisted
Interview
Selected
Rejected
Withdrawn

Track timestamps.

Student portal should provide an application tracker.

Example:

Applied
↓
Profile reviewed
↓
Shortlisted
↓
Interview
↓
Decision

Admin can change application status.

Do not let normal students manipulate their status.

======================================================================
                   LEARNER PROFILE
======================================================================

Create a professional learner profile.

Student profile:

Name
Headline
Bio
Skills
Education
Courses
Certificates
Projects
Internships
GitHub
LinkedIn
Portfolio
Resume

Profile completion indicator.

Allow a public shareable profile later.

Example:

/u/[username]

======================================================================
                       STUDENT DASHBOARD
======================================================================

Redesign the dashboard as an LMS and career dashboard.

Top:

Welcome back, [name]

Continue learning

Course cards with:

progress
last lesson
next lesson
estimated remaining time

Then:

Learning overview

Courses enrolled
Courses completed
Projects completed
Certificates
Practice questions solved

Then:

Upcoming tasks

Continue learning

Practice recommendations

Project deadlines

Assessment status

Certificate progress

Internship eligibility

Career profile completion

Recommendations should be based on real learner data.

======================================================================
                      ADMIN PANEL
======================================================================

Build a REAL admin panel.

Not placeholder cards.

Route:

/admin

Admin sections:

Dashboard
Courses
Programs
Modules
Lessons
Questions
Question Topics
Quizzes
Projects
Resources
Students
Instructors
Enrollments
Orders
Payments
Coupons
Certificates
Internships
Applications
Reviews
Notifications
Settings
Analytics

======================================================================
                     ADMIN DASHBOARD
======================================================================

Show real metrics from database:

Total students
New students
Enrollments
Course purchases
Revenue
Certificates issued
Internship applications
Active courses
Completion rate
Average course progress

Use real data.

Do not fabricate statistics.

Provide charts only where data exists.

======================================================================
                   COURSE MANAGEMENT
======================================================================

Admin must be able to:

Create course
Edit course
Save draft
Publish
Unpublish
Archive

Fields:

title
slug
description
short description
thumbnail
category
level
language
duration
price
original price
certificate enabled
internship enabled

Curriculum builder:

Course
 → Module
    → Lesson
    → Quiz
    → Practice
    → Project
    → Resource

Drag/drop ordering is desirable but not mandatory for initial implementation.

======================================================================
                      LESSON MANAGEMENT
======================================================================

Lesson fields:

title
slug
video URL
preview flag
duration
description
content
resources
order
required flag

Support:

free preview

for selected lessons.

Students should see previews before purchase.

======================================================================
                 QUESTION BANK ADMIN
======================================================================

Create question management.

Admin can:

create
edit
delete
duplicate
publish
unpublish

Question metadata:

course
module
topic
difficulty
type
points
solution
hint
tags

Bulk import should be architecturally considered.

Possible future format:

CSV / JSON

======================================================================
                 PROJECT ADMINISTRATION
======================================================================

Admin can:

create project
edit
publish
assign to course
set completion criteria
review submissions
approve
request revision

Provide grading rubric.

======================================================================
                 CERTIFICATE ADMIN
======================================================================

Admin can:

view eligibility
view issued certificates
revoke certificates
verify credentials
configure certificate templates
configure requirements

======================================================================
               INTERNSHIP ADMINISTRATION
======================================================================

Admin can:

create internship
edit internship
publish/unpublish
set eligibility
review applicants
shortlist
schedule interview
select/reject
send notification

======================================================================
                   PAYMENT SYSTEM
======================================================================

Use Razorpay architecture already present where applicable.

Payment flow:

Course
↓
Checkout
↓
Razorpay
↓
Payment verification
↓
Server-side verification
↓
Enrollment
↓
Access granted

Do NOT mark course as purchased from frontend alone.

Never trust a client-side success response.

Payment verification must happen server-side.

Use proper idempotency and webhook support where appropriate.

======================================================================
                    SECURITY
======================================================================

Use Supabase Row Level Security appropriately.

Students should only access:

their own progress
their own notes
their own submissions
their own applications
their own certificates

Admin access must be restricted.

Do not expose privileged Supabase credentials to the client.

Never put service-role keys into frontend code.

Validate user input.

Protect:
- admin routes
- purchase state
- certificates
- applications
- progress records

======================================================================
                  CONTENT ACCESS CONTROL
======================================================================

Course content should support access levels:

Public preview
Enrolled student
Paid student
Completed prerequisite
Admin

The server must determine whether the user can access protected content.

Do not rely only on frontend route guards.

======================================================================
                  NOTIFICATIONS
======================================================================

Create architecture for:

in-app notifications
email notifications later

Triggers:

purchase successful
course enrolled
assignment due
quiz result
certificate eligible
certificate issued
internship eligibility
application status
new course content

Do not implement complex email infrastructure unnecessarily during MVP, but design the database and UI properly.

======================================================================
                     SEARCH
======================================================================

Global search should support:

courses
programs
projects
internships
questions
resources

Search should return grouped results.

Example:

Courses
Projects
Practice
Internships

======================================================================
                    MOBILE DESIGN
======================================================================

The complete platform must be responsive.

Test at:

390px
768px
1024px
1440px

Learning portal mobile behavior:

Desktop:
sidebar + content

Mobile:
collapsible drawer

Practice question pages:
question content first
answer/control area below
sticky action bar where appropriate

Admin:
responsive tables
horizontal scrolling where unavoidable
or responsive card representation

No horizontal overflow.

======================================================================
                  ACCESSIBILITY
======================================================================

Implement:

semantic HTML
proper heading hierarchy
keyboard navigation
focus indicators
ARIA only when needed
accessible form labels
accessible dialogs
sufficient contrast
screen-reader labels
reduced-motion consideration

Target WCAG 2.2 AA practices where practical.

======================================================================
                   LOADING STATES
======================================================================

Every major data-driven screen should support:

loading
empty
error
success

Do not show blank screens.

Create reusable:

Skeleton
EmptyState
ErrorState
Toast
ConfirmDialog

components.

======================================================================
                     DATABASE DESIGN
======================================================================

Review existing schema before modifying.

Do not duplicate existing tables unnecessarily.

Add normalized relationships for:

courses
programs
modules
lessons
enrollments
lesson_progress
course_progress
questions
topics
question_attempts
saved_questions
quizzes
quiz_attempts
projects
project_submissions
resources
notes
certificates
certificate_policies
certificate_eligibility
internships
internship_policies
internship_eligibility
applications
reviews
wishlists
orders
payments
coupons
notifications

Use foreign keys and indexes appropriately.

Use database constraints where helpful.

======================================================================
                    ANALYTICS
======================================================================

Eventually support:

course enrollment funnel
course completion
lesson drop-off
quiz completion
question difficulty
project completion
certificate issuance
internship applications
payment conversion

Do not add meaningless charts.

======================================================================
                 DESIGN COMPONENT LIBRARY
======================================================================

Create reusable components.

Examples:

Header
Footer
CourseCard
ProgramCard
InternshipCard
ProjectCard
InstructorCard
ProgressRing
ProgressBar
Rating
Badge
Breadcrumbs
Tabs
Accordion
SearchBar
FilterPanel
DataTable
Modal
Dropdown
Toast
Skeleton
EmptyState
QuestionCard
QuestionOption
CodeEditor
ResourceCard
CertificateCard
EligibilityCard
ApplicationTimeline
CourseSidebar
PracticeSidebar
AdminSidebar

The same component should be reused wherever possible.

======================================================================
                DESIGN TOKENS / SYSTEM
======================================================================

Create a coherent design token system.

Tokens for:

colors
spacing
radius
typography
shadows
borders
breakpoints

Avoid page-specific random styles.

======================================================================
                  PROFESSIONAL DETAILS
======================================================================

Add these details where appropriate:

- breadcrumbs
- contextual page titles
- subtle hover states
- consistent button hierarchy
- clear disabled states
- clear success states
- empty states
- confirmation dialogs
- skeletons
- form validation
- unsaved changes warning for admin forms
- pagination
- filters
- sorting
- search
- URL state for filters where appropriate

======================================================================
                  DO NOT OVERBUILD
======================================================================

Do NOT try to build every advanced feature at once.

Use this phased execution model.

PHASE 0:
Repository audit.

PHASE 1:
Professional redesign + design system.

PHASE 2:
Course marketplace + course detail.

PHASE 3:
Student LMS learning portal.

PHASE 4:
Practice/question platform.

PHASE 5:
Projects/resources/notes/interview preparation.

PHASE 6:
Assessment + certificate eligibility engine.

PHASE 7:
Internship eligibility + applications.

PHASE 8:
Payments + production enrollment.

PHASE 9:
Real admin panel.

PHASE 10:
Analytics, SEO, performance, accessibility and production polish.

======================================================================
                 CRITICAL PRODUCT LOGIC
======================================================================

The most important business rule is:

A student should NOT automatically receive a certificate just because:
- they purchased the course
- they opened the course
- they watched videos

Instead, certificates and internship eligibility must be earned through configurable requirements.

For example:

COURSE COMPLETION

100% required lessons
+
80% average quiz score
+
70% final assessment
+
required projects submitted
+
required practice completed

=
CERTIFICATE ELIGIBLE

INTERNSHIP ELIGIBILITY

certificate eligible
+
profile complete
+
projects approved
+
required practice threshold
+
resume uploaded

=
INTERNSHIP ELIGIBLE

The exact values MUST be configurable by an admin.

Different courses may use different rules.

======================================================================
                   USER JOURNEY
======================================================================

Create this complete user journey:

Visitor
↓
Explore Courses
↓
Course Detail
↓
Purchase
↓
Enrollment
↓
Student Dashboard
↓
Learning Portal
↓
Lesson
↓
Practice
↓
Quiz
↓
Project
↓
Assessment
↓
Certificate Eligibility
↓
Certificate
↓
Internship Eligibility
↓
Internship Marketplace
↓
Application
↓
Interview
↓
Internship
↓
Learner Portfolio

Every stage should be connected.

======================================================================
                DEMO/SEED CONTENT
======================================================================

Create realistic demo content only where existing data is absent.

Example courses:

Full Stack Development
Data Analytics
AI & Machine Learning
Cybersecurity

But mark demo data clearly.

Do not claim fake students, salaries or placement success.

======================================================================
                     SEO
======================================================================

Implement appropriate metadata for:

homepage
courses
course detail
programs
internships
projects
resources

Use:
title
description
canonical
OpenGraph
Twitter metadata

Course detail pages should be indexable.

Private learning pages should not be indexed.

======================================================================
                 PERFORMANCE
======================================================================

Use:
- server components where appropriate
- lazy loading where beneficial
- optimized images
- pagination
- database indexes
- efficient queries
- caching where safe

Do not overuse client components.

======================================================================
              TESTING / QUALITY CONTROL
======================================================================

After every major phase:

npm run typecheck

npm run build

Also test important flows manually.

Test:

signup
login
logout
course listing
course detail
purchase flow
enrollment
lesson access
lesson progress
practice question
answer submission
saved question
quiz
project submission
certificate eligibility
certificate access
internship eligibility
application
admin access

Check:
desktop
tablet
mobile

======================================================================
                      GIT PROCESS
======================================================================

Do not make one gigantic untracked change.

Use logical commits.

Example:

phase-0-audit
phase-1-edtech-redesign
phase-2-course-marketplace
phase-3-learning-portal
phase-4-practice-engine
phase-5-projects-resources
phase-6-certification
phase-7-internships
phase-8-payments
phase-9-admin
phase-10-production-polish

Only commit when the relevant phase builds successfully.

======================================================================
                         ZIP OUTPUT
======================================================================

At the end of the complete implementation:

1. Run typecheck
2. Run build
3. Fix build errors
4. Remove unnecessary temporary/debug files
5. Ensure secrets are excluded
6. Ensure .env files containing secrets are NOT included
7. Ensure README is updated
8. Ensure database migration instructions are documented
9. Ensure the final repository is clean

Then create a production-ready ZIP of the project.

The ZIP must include:
- source code
- public assets
- database migrations
- documentation
- README
- environment example

Do NOT include:
- node_modules
- .next
- .env.local
- Supabase service role keys
- Razorpay secret keys
- other secrets

Name the final archive:

gradient-code-edtech-production.zip

Also create:

docs/PRODUCT_ARCHITECTURE.md
docs/DATABASE_ARCHITECTURE.md
docs/ADMIN_GUIDE.md
docs/STUDENT_FLOW.md
docs/PRACTICE_SYSTEM.md
docs/CERTIFICATE_RULES.md
docs/INTERNSHIP_RULES.md

======================================================================
                        FINAL REPORT
======================================================================

When complete, report:

1. What was already present
2. What you changed
3. New routes
4. New components
5. New database tables
6. New migrations
7. Authentication changes
8. Payment changes
9. Practice system
10. Project system
11. Certificate logic
12. Internship logic
13. Admin functionality
14. Remaining TODOs
15. Build status
16. Typecheck status
17. Manual Supabase steps
18. Environment variables required
19. Deployment instructions
20. Location of the final ZIP

MOST IMPORTANT:

The final website must look and feel like a mature EdTech product.

Do not optimize for visual novelty.

Optimize for:
clarity
trust
education
discoverability
learning progress
practice
career outcomes
maintainability
accessibility
performance
One architectural change I especially recommend

Don't make the certification rule:

“Finish 100% of the course = certificate.”

That can become too easy to game.

Instead make each course have a Completion Policy.

For example:

Course: Full Stack Development
Lessons                 100%
Module quizzes           80%
Practice questions       75%
Assignments              100%
Projects                 4/5
Final assessment         70%

Then:

             COURSE COMPLETE
                    ↓
          Certificate Eligible

And a separate policy:

Certificate Eligible
        +
Profile complete
        +
Resume
        +
Projects approved
        +
Practice threshold
        ↓
Internship Eligible

That gives you a real progression system instead of simply selling videos.

How the student's portal should look

Your screenshot actually gives us a very useful direction.

I would create this after login:

┌─────────────────────────────────────────────────────┐
│ Gradient Code            Search        Profile      │
├───────────────┬─────────────────────────────────────┤
│               │                                     │
│ COURSE        │  Full Stack Development             │
│               │                                     │
│ Overview      │  68% Complete                       │
│ Lessons       │  ████████████░░                     │
│ Practice      │                                     │
│ Projects      │  Continue Learning                  │
│ Quizzes       │                                     │
│ Resources     │  Module 5 → Authentication         │
│ Notes         │                                     │
│ Saved         │                                     │
│ Interview     │  Practice                           │
│               │  42 / 60 questions solved           │
│ CERTIFICATE   │                                     │
│               │  Easy     ███████████                │
│ Internship    │  Medium   ███████░░░                │
│               │  Hard     ████░░░░░                  │
│               │                                     │
│               │  Today's Plan                       │
│               │  □ Watch lesson                     │
│               │  □ Solve 5 questions                │
│               │  □ Complete quiz                    │
│               │                                     │
└───────────────┴─────────────────────────────────────┘

Then clicking Practice becomes a dedicated coding/question environment.

That's the part that can make Gradient Code substantially more than another course-selling site.

One more important change: make it course-aware

Suppose the student buys:

Data Analytics

They should see:

Data Analytics
├── Lessons
├── SQL Practice
├── Python Practice
├── Statistics Questions
├── Pandas Exercises
├── Case Studies
├── Projects
├── Resources
├── Interview Questions
├── Final Assessment
└── Certificate

But if they buy:

Cybersecurity

they should see:

Cybersecurity
├── Lessons
├── Networking Questions
├── Linux Practice
├── OWASP Questions
├── Security Labs
├── Projects
├── Resources
├── Interview Questions
├── Final Assessment
└── Certificate

So the portal itself must be generated from course configuration, not hardcoded for DSA.

That is extremely important for your long-term business.

Admin should control everything

For example, an admin creates:

Course:
React + Node.js

Module:
React Fundamentals

Lessons:
8

Practice:
25 questions

Quiz:
10 questions

Project:
React Dashboard

Resource:
React Cheatsheet.pdf

Then the student automatically gets:

React + Node.js
       ↓
React Fundamentals
       ↓
Lessons
       ↓
Practice
       ↓
Quiz
       ↓
Project

No developer should need to modify code every time you launch a new course.

That's the architecture I would insist Claude builds.

I also recommend one extra feature

Create a "Career Readiness" dashboard.

For example:

Career Readiness

Course Progress        92%
Practice               84%
Projects               75%
Assessment             78%
Profile                100%
Resume                 100%

Certificate             ✓
Internship Eligible     ✓

Overall preparation
████████████████░░ 86%

Then the student immediately understands:

"What do I still need to do?"

That is much stronger UX than simply showing a course completion percentage.
```

---

## Execution guidance (phase order agreed with the owner)

```text
Step 5 — Don't ask Claude to build everything after that

This is where the previous approach could go wrong.

After Claude finishes this phase, stop.

Look at the actual website.

Specifically inspect:

Homepage
Course listing
Course detail
Dashboard
Learning player
Mobile version

You want to see whether the transformation actually looks like:

professional EdTech

rather than:

AI-generated SaaS with the colors changed.

Then Phase 2: Build the Learning Portal

Once the redesign is approved, this should be your next major task.

Your architecture should become:

                 PURCHASE COURSE
                       │
                       ▼
                STUDENT DASHBOARD
                       │
                       ▼
                 LEARNING PORTAL
                       │
       ┌───────────────┼────────────────┐
       ▼               ▼                ▼
    LESSONS         PRACTICE         RESOURCES
       │               │                │
       ▼               ▼                ▼
    QUIZZES         QUESTIONS          NOTES
       │               │
       └───────┬───────┘
               ▼
            PROJECTS
               │
               ▼
          FINAL ASSESSMENT
               │
               ▼
        CERTIFICATE ELIGIBILITY
               │
               ▼
         INTERNSHIP ELIGIBILITY
               │
               ▼
           APPLICATIONS

That is the real product you are building.

Then Phase 3: Practice Platform

This should be one of your highest priorities.

Your screenshot becomes the inspiration here.

For example, a student purchases:

Full Stack Development

Their portal automatically becomes:

FULL STACK DEVELOPMENT

Overview
Lessons

PRACTICE
  HTML
  CSS
  JavaScript
  React
  Node.js
  Express
  MongoDB

QUIZZES

PROJECTS

RESOURCES

NOTES

INTERVIEW PREP

CERTIFICATE

For Data Analytics:

DATA ANALYTICS

Lessons

Practice
  Excel
  SQL
  Python
  Pandas
  Statistics
  Visualization
  Power BI

Quizzes
Projects
Resources
Interview Prep
Certificate

The student should not get the same DSA question system for every course.

Everything needs to be course-configurable from the database/admin panel.

Your certificate idea is good, but implement it carefully

Don't use:

course progress = 100%
       ↓
certificate

Use:

Lessons                  100%
Quiz average              80%
Practice                   75%
Required projects          100%
Final assessment            70%
                         ───────
                   Certificate eligible

Then separately:

Certificate eligible
+
Profile complete
+
Resume
+
Project requirements
+
Practice requirement
        ↓
Internship eligible

And all of those thresholds should be configurable by the admin.

Then Payments

After the learning/practice architecture is working:

Course
 ↓
Checkout
 ↓
Razorpay
 ↓
Server verification
 ↓
Enrollment
 ↓
Access to learning portal

This is when you can actually start selling courses.

Then Certificates + Internship

Build:

/certificates
/verify/[credentialId]
/internships
/internships/[slug]
/applications

with the eligibility engine.

Then Admin

Only after you know exactly what the student experience looks like.

The admin eventually needs:

ADMIN

Dashboard
Courses
Programs
Modules
Lessons

Questions
Quizzes
Projects
Resources

Students
Instructors

Orders
Payments
Coupons

Certificates

Internships
Applications

Reviews
Notifications

Analytics
Settings

Most importantly, admin should be able to create:

Course
  ↓
Module
  ↓
Lesson
  ↓
Practice Questions
  ↓
Quiz
  ↓
Project
  ↓
Assessment
  ↓
Certificate Rules
  ↓
Internship Rules

without touching your source code.

Finally: create the ZIP

Do not ask Claude to create gradient-code-edtech-production.zip now.

Do it only after:

UI ✅
Courses ✅
LMS ✅
Practice ✅
Projects ✅
Payments ✅
Certificates ✅
Internships ✅
Admin ✅
Mobile ✅
Security ✅
SEO ✅
Build ✅

Then Claude should produce:

gradient-code-edtech-production.zip

without:

node_modules/
.next/
.env.local
secrets
service-role keys
Razorpay secrets
So your immediate workflow is simply this
CURRENT PROJECT
      ↓
BACKUP
      ↓
Give Claude screenshot
      ↓
Create PRODUCT_SPEC.md
      ↓
Claude Audit + UI Redesign
      ↓
YOU REVIEW WEBSITE
      ↓
Learning Portal
      ↓
Practice/Questions
      ↓
Projects + Resources
      ↓
Payments
      ↓
Certificate Engine
      ↓
Internship Engine
      ↓
Admin Panel
      ↓
Analytics + SEO + Security + Polish
      ↓
FINAL ZIP```
