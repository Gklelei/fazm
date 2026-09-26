"use client";

import * as React from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

/**
 * Shared shell for a Dialog used to host a create/edit form: title,
 * optional description, a scrollable body for the form fields, and a
 * consistent Cancel/Submit footer with a loading state on the submit
 * button. Several modals across the app previously hand-rolled this same
 * open-state + header + footer boilerplate around Dialog; this is the
 * shared version, used for new/refactored modals rather than forcing an
 * unverified rewrite of every existing one.
 */
export function FormModal({
  trigger,
  title,
  description,
  open,
  onOpenChange,
  submitLabel = "Save",
  isSubmitting = false,
  onSubmit,
  children,
}: {
  trigger?: React.ReactNode;
  title: string;
  description?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  submitLabel?: string;
  isSubmitting?: boolean;
  onSubmit?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto py-2">{children}</div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSubmitting}>
              Cancel
            </Button>
          </DialogClose>
          {onSubmit && (
            <Button type="button" onClick={onSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitLabel}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
