"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useProgramme } from "@/providers/ProgrammeContext";
import { changeAthletePlan } from "../../actions/change-plan";
import { blankPlanChange, planChangeProblem, PlanChangeFields, type FeeBill, type PlanChangeValue } from "./PlanChangeFields";

/** Change plan, for an athlete who has one: from the next bill, from today (billed now), or stop. */
export function ChangePlanDialog({
  athleteId,
  batchId,
  currentPlan,
  bills,
}: {
  athleteId: string;
  batchId?: string | null;
  currentPlan: { id: string; name: string };
  bills: FeeBill[];
}) {
  const router = useRouter();
  const { plansFor, programmeOfBatch } = useProgramme();
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState<PlanChangeValue>(blankPlanChange());
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const plans = plansFor(programmeOfBatch(batchId)).filter((p) => p.id !== currentPlan.id);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const problem = planChangeProblem(plan);
    if (problem) return setError(problem);
    start(async () => {
      const res = await changeAthletePlan({
        athleteId,
        plan: { ...plan, planId: plan.planId || undefined, oldInvoice: plan.oldInvoice || undefined },
      });
      if (!res.success) return setError(res.message);
      toast.success(res.message);
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setPlan(blankPlanChange());
          setError(null);
          setOpen(true);
        }}
      >
        Change plan
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Change plan</DialogTitle>
            <DialogDescription>On {currentPlan.name} now.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4" noValidate>
            <PlanChangeFields
              idPrefix="change-plan"
              value={plan}
              onChange={(v) => {
                setPlan(v);
                setError(null);
              }}
              plans={plans}
              choices={["NEXT_BILL", "RESTART", "STOP"]}
              currentPlan={currentPlan.name}
              bills={bills}
            />
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
