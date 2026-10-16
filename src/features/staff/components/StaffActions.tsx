"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArchiveRestore, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setStaffArchived } from "../actions/save-staff";
import { StaffActionsMenu, type StaffMenuTarget } from "./StaffRowActions";

/** The staff page's buttons: Edit and the "…" menu, or Restore when archived. */
export function StaffActions({ staff, archived }: { staff: StaffMenuTarget; archived: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  if (archived) {
    return staff.self ? null : (
      <Button
        variant="outline"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await setStaffArchived(staff.staffId, false);
            if (!res.success) return void toast.error(res.message);
            toast.success(res.message);
            router.refresh();
          })
        }
      >
        <ArchiveRestore /> Restore
      </Button>
    );
  }

  return (
    <>
      <Button asChild>
        <Link href={`/staff/${staff.staffId}/edit`}>
          <Pencil /> Edit
        </Link>
      </Button>
      <StaffActionsMenu staff={staff} onPage onChanged={() => router.refresh()} />
    </>
  );
}
