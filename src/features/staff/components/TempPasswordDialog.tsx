"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** Shows a one-time password once, to pass on to the person. */
export function TempPasswordDialog({
  name,
  email,
  password,
  onClose,
}: {
  name: string;
  email: string;
  password: string | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(`Email: ${email}\nPassword: ${password}`).catch(() => undefined);
    setCopied(true);
  };

  return (
    <Dialog open={!!password} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Sign-in for {name}</DialogTitle>
          <DialogDescription>Give them these details. They&apos;ll choose their own password when they sign in.</DialogDescription>
        </DialogHeader>
        <dl className="grid gap-3 rounded-lg border bg-muted/40 p-4">
          <div>
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Email</dt>
            <dd className="font-medium break-all">{email}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">One-time password</dt>
            <dd className="font-mono text-2xl font-semibold tracking-wider select-all">{password}</dd>
          </div>
        </dl>
        <p className="text-sm text-muted-foreground">This password isn&apos;t shown again. If it&apos;s lost, give them a new one from their page.</p>
        <DialogFooter>
          <Button variant="outline" onClick={copy}>
            {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
          </Button>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
