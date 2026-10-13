"use client";

import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { PASSWORD_CHECKS, isLongPassword, isMixedPassword } from "@/lib/password-policy";

/**
 * Live checklist under a new-password field. Either path satisfies the rule:
 * 12+ characters, or 8+ with all four character types.
 */
function Item({ done, met, muted, children }: { done: boolean; met: string; muted: string; children: React.ReactNode }) {
  return (
    <li className={cn("flex items-center gap-1.5", done ? met : muted)}>
      {done ? <Check className="size-3.5" aria-hidden /> : <Circle className="size-3" aria-hidden />}
      <span>{children}</span>
      <span className="sr-only">{done ? "(done)" : "(not yet)"}</span>
    </li>
  );
}

export function PasswordRules({ value, tone = "default" }: { value: string; tone?: "default" | "onDark" }) {
  const long = isLongPassword(value);
  const mixed = isMixedPassword(value);
  const ok = long || mixed;
  const muted = tone === "onDark" ? "text-white/55" : "text-muted-foreground";
  const met = tone === "onDark" ? "text-brand-gold" : "text-success";


  return (
    <div className="space-y-1.5 text-xs" aria-live="polite">
      <p className={cn("font-medium", ok ? met : muted)}>
        {ok ? "Strong enough." : "Use 12+ characters, or 8+ with all of these:"}
      </p>
      {!long && (
        <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
          <Item done={value.length >= 8} met={met} muted={muted}>8 or more characters</Item>
          {PASSWORD_CHECKS.map((c) => (
            <Item key={c.id} done={c.test(value)} met={met} muted={muted}>
              {c.label}
            </Item>
          ))}
        </ul>
      )}
      {!ok && value.length > 0 && !mixed && (
        <p className={muted}>{Math.max(12 - value.length, 0)} more characters and any password works.</p>
      )}
    </div>
  );
}
