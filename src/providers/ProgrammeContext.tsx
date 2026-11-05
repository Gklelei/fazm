"use client";

import { createContext, useContext, useMemo } from "react";
import { UseUtilsContext } from "@/providers/UtilsContext";

type Programme = { id: string; name: string };
type ProgrammeValue = {
  /** The header switcher's programme; null: all programmes */
  programmeId: string | null;
  programme: Programme | null;
  programmes: Programme[];
  /** Batches pickers offer: the selected programme's, or every batch, named by batchLabel */
  batches: NonNullable<UtilsResponse>["batches"];
  /** Every batch whatever the programme (a coach's batches), named by batchLabel */
  allBatches: NonNullable<UtilsResponse>["batches"];
  /** "Girls U13" when all programmes are shown and names repeat across them */
  batchLabel: (batchId: string) => string;
  /** The programme a batch belongs to */
  programmeOfBatch: (batchId: string | null | undefined) => string | null;
  /** Fee plans that fit a programme: its own and those for any; null: every plan */
  plansFor: (programmeId: string | null) => NonNullable<UtilsResponse>["plans"];
};

const Ctx = createContext<{ programmeId: string | null; shown: boolean }>({ programmeId: null, shown: false });

/** `shown`: whether this user sees programmes (Settings → Programmes, "Who sees programmes"). */
export function ProgrammeProvider({
  programmeId,
  shown,
  children,
}: {
  programmeId: string | null;
  shown: boolean;
  children: React.ReactNode;
}) {
  const value = useMemo(() => ({ programmeId, shown }), [programmeId, shown]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProgramme(): ProgrammeValue {
  const { programmeId, shown } = useContext(Ctx);
  const { data } = UseUtilsContext();
  return useMemo(() => {
    // Hidden: no programmes at all, so no switcher, fields or "Girls U13" labels
    const programmes = shown ? (data?.programmes ?? []) : [];
    const all = data?.batches ?? [];
    const byId = new Map(programmes.map((p) => [p.id, p.name]));
    // Names repeat across programmes (Boys U13, Girls U13): say which, unless one programme is shown
    const nameOf = (b: (typeof all)[number], always = false) =>
      (programmeId && !always) || programmes.length < 2 ? b.name : `${byId.get(b.programmeId) ?? ""} ${b.name}`.trim();
    const label = (batchId: string) => {
      const b = all.find((x) => x.id === batchId);
      return b ? nameOf(b) : "";
    };
    const batches = (programmeId ? all.filter((b) => b.programmeId === programmeId) : all).map((b) => ({ ...b, name: nameOf(b) }));
    const allBatches = all.map((b) => ({ ...b, name: nameOf(b, true) }));
    const plans = data?.plans ?? [];
    const plansFor = (id: string | null) => (id ? plans.filter((p) => !p.programmeId || p.programmeId === id) : plans);
    const programmeOfBatch = (batchId: string | null | undefined) =>
      shown ? (all.find((b) => b.id === batchId)?.programmeId ?? null) : null;
    return {
      programmeId,
      programme: programmes.find((p) => p.id === programmeId) ?? null,
      programmes,
      batches,
      allBatches,
      batchLabel: label,
      programmeOfBatch,
      plansFor,
    };
  }, [programmeId, shown, data]);
}
