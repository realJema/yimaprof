// Password rules shared by sign-up / reset screens. Server-side, Supabase Auth
// enforces its own minimum length; keep the dashboard setting >= 8.
export type PasswordRule = { id: string; fr: string; en: string; test: (p: string) => boolean };

export const PASSWORD_RULES: PasswordRule[] = [
  { id: "len", fr: "Au moins 8 caractères", en: "At least 8 characters", test: (p) => p.length >= 8 },
  { id: "letter", fr: "Au moins une lettre", en: "At least one letter", test: (p) => /[A-Za-zÀ-ÿ]/.test(p) },
  { id: "digit", fr: "Au moins un chiffre", en: "At least one number", test: (p) => /\d/.test(p) },
];

export const isPasswordValid = (p: string) => PASSWORD_RULES.every((r) => r.test(p));

/** 0..4 strength score */
export const passwordStrength = (p: string): number => {
  if (!p) return 0;
  let s = 0;
  if (p.length >= 8) s++;
  if (p.length >= 12) s++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return Math.min(4, s);
};

// Client-side throttle for reset requests (Supabase Auth also rate-limits server-side).
const KEY = "pw_reset_requests";
const MAX = 3;
const WINDOW = 60 * 60 * 1000;

export const canRequestReset = (email: string): boolean => {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || "{}") as Record<string, number[]>;
    const now = Date.now();
    const list = (all[email] || []).filter((t) => now - t < WINDOW);
    if (list.length >= MAX) return false;
    list.push(now);
    all[email] = list;
    localStorage.setItem(KEY, JSON.stringify(all));
    return true;
  } catch {
    return true;
  }
};
