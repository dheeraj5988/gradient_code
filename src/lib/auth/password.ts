/** Password policy for new passwords (sign-up and reset). Mirror it in Supabase → Auth → Password requirements. */
export const PASSWORD_RULES = [
  { id: "length", label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { id: "upper", label: "One uppercase letter (A–Z)", test: (p: string) => /[A-Z]/.test(p) },
  { id: "lower", label: "One lowercase letter (a–z)", test: (p: string) => /[a-z]/.test(p) },
  { id: "digit", label: "One number (0–9)", test: (p: string) => /\d/.test(p) },
] as const;

/** Returns the first unmet requirement as a sentence, or null when the password is acceptable. */
export function passwordProblem(p: string): string | null {
  const miss = PASSWORD_RULES.find((r) => !r.test(p));
  return miss ? `Password needs: ${miss.label.charAt(0).toLowerCase()}${miss.label.slice(1)}.` : null;
}
