"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const REASON_STATUSES = [
  { value: "ABSENT", label: "Absent" },
  { value: "LATE", label: "Late" },
  { value: "EXCUSED", label: "Excused" },
  { value: "PRESENT", label: "Present" },
] as const;

export type ItemValues = { name: string; description: string; status: string; choice: string; code: string };

/** A programme's ID letters: the field's label and hint, and whether they can still change */
export type ItemCode = { label: string; hint: (typed: string) => string; locked: boolean };

/** One pick from a few options, shown as buttons (a batch's programme). */
export type ItemChoice = { label: string; options: { value: string; label: string }[] };

/**
 * Add or edit one settings item (batch, pitch, drill, reason). Only the
 * fields asked for are shown; the server validates and answers in words.
 */
export function ItemDialog({
  open,
  onOpenChange,
  title,
  description,
  nameLabel = "Name",
  namePlaceholder,
  withDescription,
  withStatus,
  withCode,
  choice,
  initial,
  submitLabel,
  submit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  nameLabel?: string;
  namePlaceholder?: string;
  withDescription?: string; // its label
  withStatus?: boolean;
  withCode?: ItemCode;
  choice?: ItemChoice;
  initial?: Partial<ItemValues>;
  submitLabel: string;
  submit: (values: ItemValues) => Promise<ActionResult>;
}) {
  const router = useRouter();
  const blank = (): ItemValues => ({
    name: "",
    description: "",
    status: "ABSENT",
    choice: choice?.options.length === 1 ? choice.options[0].value : "",
    code: "",
    ...initial,
  });
  const [values, setValues] = useState<ItemValues>(blank);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = (patch: Partial<ItemValues>) =>
    setValues((v) => ({ ...v, ...patch }));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (choice?.options.length && !values.choice)
      return setError(`Pick a ${choice.label.toLowerCase()}.`);
    if (!values.name.trim())
      return setError(`Enter a ${nameLabel.toLowerCase()}.`);
    start(async () => {
      const res = await submit({
        ...values,
        name: values.name.trim(),
        description: values.description.trim(),
      });
      if (!res.success) return setError(res.message);
      toast.success(res.message);
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) {
          setValues(blank());
          setError(null);
        }
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {withStatus && (
            <fieldset className="grid gap-2">
              <legend className="mb-2 text-sm font-medium">
                When the athlete is
              </legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {REASON_STATUSES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    aria-pressed={values.status === s.value}
                    onClick={() => set({ status: s.value })}
                    className={cn(
                      "h-10 rounded-md border text-sm font-medium transition-colors",
                      values.status === s.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:bg-muted",
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          {choice && choice.options.length > 1 && (
            <fieldset className="grid gap-2">
              <legend className="mb-2 text-sm font-medium">{choice.label}</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {choice.options.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    aria-pressed={values.choice === o.value}
                    onClick={() => set({ choice: o.value })}
                    className={cn(
                      "h-10 truncate rounded-md border px-2 text-sm font-medium transition-colors",
                      values.choice === o.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:bg-muted",
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          <div className="grid gap-2">
            <Label htmlFor="item-name">{nameLabel}</Label>
            <Input
              id="item-name"
              value={values.name}
              placeholder={namePlaceholder}
              onChange={(e) => set({ name: e.target.value })}
              autoFocus
              maxLength={80}
              aria-invalid={!!error || undefined}
            />
          </div>
          {withCode && (
            <div className="grid gap-2">
              <Label htmlFor="item-code">{withCode.label}</Label>
              <Input
                id="item-code"
                value={values.code}
                onChange={(e) => set({ code: e.target.value.toUpperCase().replace(/[^A-Z]/g, "") })}
                maxLength={3}
                disabled={withCode.locked}
                autoComplete="off"
                className="w-24 font-mono uppercase"
                aria-describedby="item-code-hint"
              />
              <p id="item-code-hint" className="text-xs text-muted-foreground">
                {withCode.hint(values.code)}
              </p>
            </div>
          )}
          {withDescription && (
            <div className="grid gap-2">
              <Label htmlFor="item-description">
                {withDescription}{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Textarea
                id="item-description"
                value={values.description}
                onChange={(e) => set({ description: e.target.value })}
                rows={3}
                maxLength={500}
              />
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
