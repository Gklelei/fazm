import { Loader2Icon } from "lucide-react";

export const Loader2Spinner = () => {
  return (
    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
      <Loader2Icon className="h-5 w-5 animate-spin" />
      <span>Loading</span>
    </div>
  );
};
