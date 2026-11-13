"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRightLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useProgramme } from "@/providers/ProgrammeContext";
import { transferAthlete } from "../../actions/transfer-athlete";
import { blankPlanChange, planChangeProblem, PlanChangeFields, type FeeBill, type PlanChangeValue } from "./PlanChangeFields";

/** Moves an athlete to a batch in another programme, saying what happens to their fee plan. */
export function TransferDialog({
  athlete,
}: {
  athlete: { athleteId: string; name: string; batchId: string; currentPlan?: { name: string; programmeId: string | null }; bills: FeeBill[] };
}) {
  const router = useRouter();
  const { allBatches, programmes, programmeOfBatch, plansFor } = useProgramme();
  const [open, setOpen] = useState(false);
  const [batch, setBatch] = useState("");
  const [plan, setPlan] = useState<PlanChangeValue>(blankPlanChange());
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const current = programmeOfBatch(athlete.batchId);
  const programmeName = programmes.find((p) => p.id === current)?.name ?? "their programme";
  const batches = allBatches.filter((b) => b.programmeId !== current && !/unassigned/i.test(b.name));
  const target = programmeOfBatch(batch);
  // Keep is offered when their plan also fits the new programme
  const canKeep = !!athlete.currentPlan && (!athlete.currentPlan.programmeId || athlete.currentPlan.programmeId === target);

  // Nothing to move to with one programme
  if (programmes.length < 2) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batch) return setError("Choose the batch they're joining.");
    const problem = planChangeProblem(plan);
    if (problem) return setError(problem);
    start(async () => {
      const res = await transferAthlete({
        athleteId: athlete.athleteId,
        toBatch: batch,
        plan: { ...plan, planId: plan.planId || undefined, oldInvoice: plan.oldInvoice || undefined },
        reason,
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
        onClick={() => {
          // A fresh form each time it opens
          setBatch("");
          setPlan(blankPlanChange());
          setReason("");
          setError(null);
          setOpen(true);
        }}
      >
        <ArrowRightLeft /> Transfer
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Transfer {athlete.name}</DialogTitle>
            <DialogDescription>
              From {programmeName} to a batch in another programme. They keep {athlete.athleteId}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div className="grid gap-2">
              <Label htmlFor="transfer-batch">New batch</Label>
              <Select
                value={batch}
                onValueChange={(v) => {
                  setBatch(v);
                  // Plans depend on the programme; Keep may no longer fit
                  setPlan(blankPlanChange());
                  setError(null);
                }}
              >
                <SelectTrigger id="transfer-batch" className="w-full">
                  <SelectValue placeholder="Choose a batch" />
                </SelectTrigger>
                <SelectContent>
                  {batches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {batch && (
              <PlanChangeFields
                idPrefix="transfer"
                value={plan}
                onChange={(v) => {
                  setPlan(v);
                  setError(null);
                }}
                plans={target ? plansFor(target) : []}
                choices={canKeep ? ["NEXT_BILL", "RESTART", "KEEP", "STOP"] : ["NEXT_BILL", "RESTART", "STOP"]}
                currentPlan={athlete.currentPlan?.name}
                bills={athlete.bills}
              />
            )}
            <div className="grid gap-2">
              <Label htmlFor="transfer-reason">
                Reason <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Textarea id="transfer-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={200} />
            </div>
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
                Transfer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
