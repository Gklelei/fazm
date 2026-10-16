import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

/** A problem with the whole form (from the server), shown in the form instead of a pop-up. */
export function FormAlert({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <Alert variant="destructive" className="border-destructive/40 bg-destructive/5">
      <AlertCircle />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
