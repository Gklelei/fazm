import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/PageHeader";
import { ActivityExport } from "@/features/audit-logs/components/ActivityExport";
import { ActivityFeed } from "@/features/audit-logs/components/ActivityFeed";
import { ActivityToolbar } from "@/features/audit-logs/components/ActivityToolbar";
import {
  activityFiltersFromParams,
  activityParams,
  listActivity,
  listLoggedPeople,
} from "@/features/audit-logs/queries/list";

export const metadata: Metadata = { title: "Activity log" };

// The developer (super admin) only: the proxy limits this page through nav-config.
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const filters = activityFiltersFromParams((k) => sp[k]);
  const query = activityParams(filters).toString();
  const [first, people] = await Promise.all([listActivity(filters), listLoggedPeople()]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity log"
        description="Who did what, and when: every change, views of sensitive records, downloads and sign-ins."
        actions={<ActivityExport query={query} />}
      />
      <section className="overflow-hidden rounded-lg border bg-card">
        <ActivityToolbar kind={filters.kind} people={people} />
        {/* key: a new filter starts a fresh list */}
        <ActivityFeed key={query} query={query} initial={JSON.parse(JSON.stringify(first))} />
      </section>
    </div>
  );
}
