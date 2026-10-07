/** Shared password policy: min 8 chars, at least one digit. Returns an error message or null. */
export function validatePassword(pw: string, fr = true): string | null {
  if (pw.length < 8) return fr ? "Le mot de passe doit contenir au moins 8 caractères." : "Password must be at least 8 characters.";
  if (pw.length > 72) return fr ? "Le mot de passe est trop long (72 max)." : "Password is too long (72 max).";
  if (!/\d/.test(pw)) return fr ? "Le mot de passe doit contenir au moins un chiffre." : "Password must contain at least one number.";
  return null;
}
