import { ROLE_LABEL } from "@/lib/roles";
import { cn } from "@/lib/utils";
import type { ROLES } from "@/generated/prisma/enums";

/** Their role, or that they don't sign in. */
export function SignInBadge({ user }: { user: { role: ROLES; isArchived: boolean } | null }) {
  const on = !!user && !user.isArchived;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        on ? "border-primary/25 bg-primary/8 text-primary" : "border-border bg-muted text-muted-foreground",
      )}
    >
      {on ? ROLE_LABEL[user.role] : "No sign-in"}
    </span>
  );
}
