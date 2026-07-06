/** Loose format check for the login/reset-password email fields — not a full RFC validator. */
export function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())
}
