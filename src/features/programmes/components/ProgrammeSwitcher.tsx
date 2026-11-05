"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Layers } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProgramme } from "@/providers/ProgrammeContext";
import { selectProgramme } from "@/features/programmes/actions/select";

const ALL = "all";

/** Header control: every list, report and figure follows the programme picked here. */
export function ProgrammeSwitcher() {
  const { programmeId, programmes } = useProgramme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, start] = useTransition();
  if (programmes.length < 2) return null;

  return (
    <Select
      value={programmeId ?? ALL}
      disabled={pending}
      onValueChange={(v) =>
        start(async () => {
          await selectProgramme(v === ALL ? "" : v);
          // Lists loaded in the browser were for the old programme
          await queryClient.invalidateQueries();
          router.refresh();
        })
      }
    >
      <SelectTrigger size="sm" aria-label="Programme" className="w-auto min-w-36 gap-2">
        <Layers className="size-4 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="end">
        <SelectItem value={ALL}>All programmes</SelectItem>
        {programmes.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
