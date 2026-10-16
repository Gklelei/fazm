"use client";

import { useState } from "react";
import { Eye, EyeOff, TriangleAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** A password field with a show/hide toggle and a Caps Lock warning. */
export function PasswordInput({ className, ...props }: Omit<React.ComponentProps<"input">, "type">) {
  const [show, setShow] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const checkCaps = (e: React.KeyboardEvent<HTMLInputElement>) => setCapsLock(e.getModifierState?.("CapsLock") ?? false);

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Input
          {...props}
          type={show ? "text" : "password"}
          onKeyDown={(e) => {
            checkCaps(e);
            props.onKeyDown?.(e);
          }}
          onKeyUp={checkCaps}
          onBlur={(e) => {
            setCapsLock(false);
            props.onBlur?.(e);
          }}
          className={cn("h-12 pr-12 text-base", className)}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-md text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {capsLock && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-warning-foreground dark:text-warning" role="status">
          <TriangleAlert className="size-3.5" aria-hidden /> Caps Lock is on
        </p>
      )}
    </div>
  );
}
