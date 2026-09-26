import { Spinner } from "@/components/ui/spinner";

export const PageLoader = () => {
  return (
    <div className="flex min-h-50 flex-col items-center justify-center gap-3">
      <Spinner className="h-8 w-8 text-primary" />
      <p className="text-sm text-muted-foreground">Loading, please wait…</p>
    </div>
  );
};
