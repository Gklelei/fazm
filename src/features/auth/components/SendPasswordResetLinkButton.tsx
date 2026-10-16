"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { Sweetalert } from "@/lib/alerts";

interface Props extends React.ComponentProps<typeof Button> {
  email: string;
  buttonText?: string;
}

/** Emails a password reset link to a known address (staff profile). */
export default function SendPasswordResetLinkButton({ email, buttonText = "Send reset link", variant = "outline", disabled, ...props }: Props) {
  const [sending, setSending] = useState(false);

  const send = async () => {
    setSending(true);
    const { error } = await authClient.requestPasswordReset({ email, redirectTo: "/res-password" });
    setSending(false);
    Sweetalert(
      error
        ? { icon: "error", title: "Not sent", text: "We couldn't send the reset link. Try again in a minute." }
        : { icon: "success", title: "Link sent", text: `A reset link has been sent to ${email}. It works for one hour.` },
    );
  };

  return (
    <Button type="button" variant={variant} onClick={send} disabled={sending || disabled} {...props}>
      {sending && <Loader2 className="animate-spin" />}
      {buttonText}
    </Button>
  );
}
