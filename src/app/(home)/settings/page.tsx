import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/PageHeader";
import { getSettingsData } from "@/features/settings/queries";
import { SquadCard } from "@/features/settings/components/SquadCard";
import {
  AddItemButton,
  DrillList,
  PitchList,
  ReasonList,
} from "@/features/settings/components/SettingsLists";
import { SettingsToolbar } from "@/features/settings/components/SettingsToolbar";
import { SETTINGS_TABS, type SettingsTab } from "@/features/settings/lib/tabs";

export const metadata: Metadata = { title: "Settings" };

const BLURB: Record<SettingsTab, string> = {
  squads:
    "Each squad's weekly timetable. Plan sessions fills the calendar from it, with the squad on the register.",
  pitches:
    "Where training happens. Sessions and timetables pick from this list.",
  drills: "Drills coaches can add to a session plan.",
  reasons:
    "Why an athlete was absent, late or excused. Coaches pick one when taking attendance.",
};

// Admin-only: the proxy limits /settings to the admin roles (nav-config).
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; archived?: string }>;
}) {
  const sp = await searchParams;
  const tab = (SETTINGS_TABS.find((t) => t.key === sp.tab)?.key ??
    "squads") as SettingsTab;
  const showArchived = sp.archived === "1";
  const data = await getSettingsData();

  const lists = {
    squads: data.squads,
    pitches: data.pitches,
    drills: data.drills,
    reasons: data.reasons,
  };
  const visible = <T extends { archived: boolean }>(rows: T[]) =>
    showArchived ? rows : rows.filter((r) => !r.archived);
  const counts = Object.fromEntries(
    Object.entries(lists).map(([k, rows]) => [
      k,
      rows.filter((r) => !r.archived).length,
    ]),
  ) as Record<SettingsTab, number>;
  const archivedCount = lists[tab].filter((r) => r.archived).length;

  const pitches = data.pitches
    .filter((p) => !p.archived)
    .map((p) => ({ id: p.id, name: p.name }));
  const coaches = data.coaches.map((c) => ({
    id: c.staffId,
    name: c.fullNames,
  }));
  const squads = visible(data.squads);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description={BLURB[tab]}
        actions={<AddItemButton kind={tab} />}
      />
      <SettingsToolbar
        tab={tab}
        counts={counts}
        showArchived={showArchived}
        archivedCount={archivedCount}
      />

      {tab === "squads" &&
        (squads.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {squads.map((s) => (
              <SquadCard
                key={s.id}
                squad={s}
                pitches={pitches}
                coaches={coaches}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed px-4 py-12 text-center text-sm text-muted-foreground">
            No squads yet. Add one for each age group you train.
          </p>
        ))}
      {tab === "pitches" && <PitchList rows={visible(data.pitches)} />}
      {tab === "drills" && <DrillList rows={visible(data.drills)} />}
      {tab === "reasons" && <ReasonList rows={visible(data.reasons)} />}
    </div>
  );
}
