import { Check, X } from "lucide-react";
import { PASSWORD_RULES, passwordStrength } from "@/lib/passwordPolicy";
import { cn } from "@/lib/utils";

const LABELS = {
  fr: ["Très faible", "Faible", "Moyen", "Bon", "Excellent"],
  en: ["Very weak", "Weak", "Fair", "Good", "Strong"],
};
const COLORS = ["bg-destructive", "bg-destructive", "bg-secondary", "bg-primary", "bg-primary"];

export default function PasswordStrength({ password, language }: { password: string; language: "fr" | "en" }) {
  const score = passwordStrength(password);
  return (
    <div className="space-y-2" aria-live="polite">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={cn("h-1.5 flex-1 rounded-full bg-muted", password && i < Math.max(1, score) && COLORS[score])} />
        ))}
      </div>
      {password && <p className="text-xs text-muted-foreground">{LABELS[language][score]}</p>}
      <ul className="space-y-1">
        {PASSWORD_RULES.map((r) => {
          const ok = r.test(password);
          return (
            <li key={r.id} className={cn("flex items-center gap-1.5 text-xs", ok ? "text-primary" : "text-muted-foreground")}>
              {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
              {r[language]}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
