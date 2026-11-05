"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { cn } from "@/lib/utils";
import type { SettingsData } from "../queries";
import { saveBatch } from "../actions/batches";
import { saveProgramme, setProgrammeArchived } from "../actions/programmes";
import { useProgramme } from "@/providers/ProgrammeContext";
import {
  saveDrill,
  savePitch,
  saveReason,
  setDrillArchived,
  setPitchArchived,
  setReasonArchived,
} from "../actions/lists";
import { ItemDialog, REASON_STATUSES, type ItemChoice, type ItemValues } from "./ItemDialog";
import { RowMenu } from "./RowMenu";
import type { ListTab } from "../lib/tabs";

type Kind = ListTab;

/** Per tab: the words used and the server calls behind them. */
const KINDS = {
  batches: {
    add: "New batch",
    title: (editing: boolean) => (editing ? "Edit batch" : "New batch"),
    nameLabel: "Batch name",
    namePlaceholder: "e.g. U19",
    withDescription: "Description",
    save: (v: ItemValues, id?: string) =>
      saveBatch({ name: v.name, description: v.description, programmeId: v.choice }, id),
  },
  programmes: {
    add: "Add programme",
    title: (editing: boolean) => (editing ? "Rename programme" : "Add a programme"),
    nameLabel: "Programme name",
    namePlaceholder: "e.g. Girls",
    save: (v: ItemValues, id?: string) => saveProgramme({ name: v.name }, id),
  },
  pitches: {
    add: "Add pitch",
    title: (editing: boolean) => (editing ? "Rename pitch" : "Add a pitch"),
    nameLabel: "Pitch name",
    namePlaceholder: "e.g. Eastleigh main pitch",
    save: (v: ItemValues, id?: string) => savePitch({ name: v.name }, id),
  },
  drills: {
    add: "Add drill",
    title: (editing: boolean) => (editing ? "Edit drill" : "Add a drill"),
    nameLabel: "Drill name",
    namePlaceholder: "e.g. Rondo 4v1",
    withDescription: "How it runs",
    save: (v: ItemValues, id?: string) =>
      saveDrill({ name: v.name, description: v.description }, id),
  },
  reasons: {
    add: "Add reason",
    title: (editing: boolean) =>
      editing ? "Edit reason" : "Add an attendance reason",
    nameLabel: "Reason",
    namePlaceholder: "e.g. School exams",
    withStatus: true,
    save: (v: ItemValues, id?: string) =>
      saveReason({ status: v.status as "ABSENT", label: v.name }, id),
  },
} satisfies Record<Kind, unknown>;

/** The batch dialog's programme buttons; a new batch starts in the header's programme. */
export function useProgrammeChoice(): ItemChoice {
  const { programmes } = useProgramme();
  return { label: "Programme", options: programmes.map((p) => ({ value: p.id, label: p.name })) };
}

export function AddItemButton({ kind }: { kind: Kind }) {
  const [open, setOpen] = useState(false);
  const k = KINDS[kind];
  const choice = useProgrammeChoice();
  const { programmeId } = useProgramme();
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus /> {k.add}
      </Button>
      <ItemDialog
        open={open}
        onOpenChange={setOpen}
        title={k.title(false)}
        nameLabel={k.nameLabel}
        namePlaceholder={k.namePlaceholder}
        withDescription={"withDescription" in k ? k.withDescription : undefined}
        withStatus={"withStatus" in k}
        choice={kind === "batches" ? choice : undefined}
        initial={kind === "batches" && programmeId ? { choice: programmeId } : undefined}
        submitLabel={k.add}
        submit={(v) => k.save(v)}
      />
    </>
  );
}

type Row = {
  id: string;
  name: string;
  description?: string | null;
  status?: string;
  archived: boolean;
  used: number;
};

function ItemRow({
  kind,
  row,
  usedLabel,
}: {
  kind: Exclude<Kind, "batches">;
  row: Row;
  usedLabel: string;
}) {
  const [editing, setEditing] = useState(false);
  const k = KINDS[kind];
  const setArchived = {
    programmes: setProgrammeArchived,
    pitches: setPitchArchived,
    drills: setDrillArchived,
    reasons: setReasonArchived,
  }[kind];
  return (
    <li
      className={cn(
        "flex items-center gap-3 px-4 py-3",
        row.archived && "bg-muted/40",
      )}
    >
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "flex items-center gap-2 font-medium",
            row.archived && "text-muted-foreground",
          )}
        >
          <span className="truncate">{row.name}</span>
          {row.archived && <StatusBadge tone="neutral">Archived</StatusBadge>}
        </p>
        {row.description && (
          <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
            {row.description}
          </p>
        )}
        <p className="tabular mt-0.5 text-xs text-muted-foreground sm:hidden">
          {usedLabel}
        </p>
      </div>
      <span className="tabular hidden shrink-0 text-sm text-muted-foreground sm:block">
        {usedLabel}
      </span>
      <RowMenu
        name={row.name}
        archived={row.archived}
        editLabel={kind === "pitches" || kind === "programmes" ? "Rename" : "Edit"}
        onEdit={() => setEditing(true)}
        setArchived={(to) => setArchived(row.id, to)}
      />
      <ItemDialog
        open={editing}
        onOpenChange={setEditing}
        title={k.title(true)}
        nameLabel={k.nameLabel}
        withDescription={"withDescription" in k ? k.withDescription : undefined}
        withStatus={"withStatus" in k}
        initial={{
          name: row.name,
          description: row.description ?? "",
          status: row.status,
        }}
        submitLabel="Save"
        submit={(v) => k.save(v, row.id)}
      />
    </li>
  );
}

/** Old reasons were saved in capitals ("SENT APOLOGY"); show them as a sentence. */
const tidy = (label: string) => (label === label.toUpperCase() ? label.charAt(0) + label.slice(1).toLowerCase() : label);

const times = (n: number, one: string, many = `${one}s`) =>
  n === 0 ? "Not used yet" : `Used in ${n} ${n === 1 ? one : many}`;

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-4 py-12 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}

export function ProgrammeList({ rows }: { rows: SettingsData["programmes"] }) {
  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      {rows.length ? (
        <ul className="divide-y">
          {rows.map((r) => (
            <ItemRow
              key={r.id}
              kind="programmes"
              row={r}
              usedLabel={
                r.batches
                  ? `${r.batches} batch${r.batches === 1 ? "" : "es"}, ${r.athletes} athlete${r.athletes === 1 ? "" : "s"}`
                  : "No batches yet"
              }
            />
          ))}
        </ul>
      ) : (
        <Empty>No programmes yet.</Empty>
      )}
    </section>
  );
}

export function PitchList({ rows }: { rows: SettingsData["pitches"] }) {
  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      {rows.length ? (
        <ul className="divide-y">
          {rows.map((r) => (
            <ItemRow
              key={r.id}
              kind="pitches"
              row={r}
              usedLabel={times(r.used, "session")}
            />
          ))}
        </ul>
      ) : (
        <Empty>No pitches yet.</Empty>
      )}
    </section>
  );
}

export function DrillList({ rows }: { rows: SettingsData["drills"] }) {
  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      {rows.length ? (
        <ul className="divide-y">
          {rows.map((r) => (
            <ItemRow
              key={r.id}
              kind="drills"
              row={r}
              usedLabel={times(r.used, "session")}
            />
          ))}
        </ul>
      ) : (
        <Empty>No drills yet.</Empty>
      )}
    </section>
  );
}

export function ReasonList({ rows }: { rows: SettingsData["reasons"] }) {
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      {REASON_STATUSES.map((s) => {
        const group = rows.filter((r) => r.status === s.value);
        return (
          <section
            key={s.value}
            className="overflow-hidden rounded-lg border bg-card"
          >
            <header className="flex items-center justify-between border-b px-4 py-2.5">
              <StatusBadge status={s.value}>{s.label}</StatusBadge>
              <span className="tabular text-xs text-muted-foreground">
                {group.filter((r) => !r.archived).length} reason
                {group.filter((r) => !r.archived).length === 1 ? "" : "s"}
              </span>
            </header>
            {group.length ? (
              <ul className="divide-y">
                {group.map((r) => (
                  <ItemRow
                    key={r.id}
                    kind="reasons"
                    row={{ ...r, name: tidy(r.label) }}
                    usedLabel={
                      r.used
                        ? `Used ${r.used} time${r.used === 1 ? "" : "s"}`
                        : "Not used yet"
                    }
                  />
                ))}
              </ul>
            ) : (
              <Empty>No reasons for {s.label.toLowerCase()}.</Empty>
            )}
          </section>
        );
      })}
    </div>
  );
}
