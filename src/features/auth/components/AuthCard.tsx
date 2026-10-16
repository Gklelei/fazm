import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

/** Every auth page: a heading, a line of help, then the form. */
export function AuthCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 space-y-2">
        <h1 className="font-display text-3xl font-bold tracking-wide uppercase">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  );
}

/** A problem with what was submitted, shown in the form instead of a pop-up. */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <Alert variant="destructive" className="border-destructive/40 bg-destructive/5">
      <AlertCircle />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
