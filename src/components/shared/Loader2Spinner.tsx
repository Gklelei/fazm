import { Spinner } from "@/components/ui/spinner";

export const Loader2Spinner = () => {
  return (
    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
      <Spinner className="h-5 w-5" />
      <span>Loading</span>
    </div>
  );
};
