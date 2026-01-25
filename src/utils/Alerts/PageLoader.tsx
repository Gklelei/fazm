import { Loader2Icon } from "lucide-react";

export const PageLoader = () => {
  return (
    <div className="flex min-h-50 flex-col items-center justify-center gap-3">
      <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Loading, please wait…</p>
    </div>
  );
};
