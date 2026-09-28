/**
 * Static marketing copy. Describes how the platform works — contains NO numbers,
 * outcomes or testimonials. Anything measurable must come from the database.
 */
export const HOW_IT_WORKS = [
  { step: "Learn", body: "Structured video lessons, notes and resources, organised module by module." },
  { step: "Practice", body: "Course-specific questions and quizzes that check you understood each topic." },
  { step: "Build", body: "Hands-on projects you submit for review and keep in your portfolio." },
  { step: "Certify", body: "Meet the course requirements to earn a certificate with a public verification ID." },
  { step: "Gain experience", body: "Eligible learners can apply for internships linked to their course." },
] as const;

export const CERTIFICATE_POINTS = [
  "Earned by meeting the course's completion requirements — not just by watching videos.",
  "Every certificate has a unique credential ID.",
  "Anyone can verify a credential on the public verification page.",
] as const;

export const FAQS = [
  {
    q: "How do I choose the right course?",
    a: "Start from the role you want. Each course page lists what you will learn, the skills covered, requirements and who it is for. You can also preview free lessons before buying.",
  },
  {
    q: "I'm a complete beginner. Can I join?",
    a: "Yes. Courses marked Beginner assume no prior experience. Check the Requirements section on each course page.",
  },
  {
    q: "How long do I have access to a course?",
    a: "The access period is shown on every course page and at checkout. Most courses include lifetime access.",
  },
  {
    q: "How do I get a certificate?",
    a: "Each course defines its completion requirements, such as finishing lessons, passing assessments and submitting projects. Once you meet them, your certificate is issued with a verifiable credential ID.",
  },
  {
    q: "How do internships work?",
    a: "Some internships are linked to a course. Completing that course's requirements makes you eligible to apply. Internship listings show the duration, mode, stipend and skills required.",
  },
  {
    q: "Can I get a refund?",
    a: "Refunds follow our refund policy. Please read it before purchasing.",
  },
] as const;
