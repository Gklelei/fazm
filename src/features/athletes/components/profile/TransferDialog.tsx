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
import { formatCurrency } from "@/lib/format";
import { useProgramme } from "@/providers/ProgrammeContext";
import { transferAthlete } from "../../actions/transfer-athlete";

/** Moves an athlete to a batch in another programme, on a fee plan for it. */
export function TransferDialog({ athlete }: { athlete: { athleteId: string; name: string; batchId: string } }) {
  const router = useRouter();
  const { allBatches, programmes, programmeOfBatch, plansFor } = useProgramme();
  const [open, setOpen] = useState(false);
  const [batch, setBatch] = useState("");
  const [plan, setPlan] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const current = programmeOfBatch(athlete.batchId);
  const programmeName = programmes.find((p) => p.id === current)?.name ?? "their programme";
  const batches = allBatches.filter((b) => b.programmeId !== current && !/unassigned/i.test(b.name));
  const target = programmeOfBatch(batch);
  const plans = target ? plansFor(target) : [];

  // Nothing to move to with one programme
  if (programmes.length < 2) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batch) return setError("Choose the batch they're joining.");
    if (!plan) return setError("Choose their fee plan.");
    start(async () => {
      const res = await transferAthlete({ athleteId: athlete.athleteId, toBatch: batch, subscriptionPlanId: plan, reason });
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
          setPlan("");
          setReason("");
          setError(null);
          setOpen(true);
        }}
      >
        <ArrowRightLeft /> Transfer
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
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
                  setPlan("");
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
            <div className="grid gap-2">
              <Label htmlFor="transfer-plan">Fee plan</Label>
              <Select value={plan} onValueChange={setPlan} disabled={!batch}>
                <SelectTrigger id="transfer-plan" className="w-full">
                  <SelectValue placeholder={batch ? "Choose a plan" : "Choose the batch first"} />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} · {formatCurrency(Number(p.amount))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
