"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useInView } from "react-intersection-observer";
import { Loader2, RefreshCcw, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import ExportDropdown from "@/components/shared/ExportDropdown";
import { useDebounce } from "@/hooks/use-debounce";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ATHLETE_ACCOUNT_STATUS } from "@/generated/prisma/enums";
import {
  athleteFilterParams,
  useAthletes,
  type AthletesInfiniteData,
} from "../hooks/useAthletes";
import { athleteName } from "../lib/names";
import AthleteCard from "./AthleteCard";
import AthletesFilterBar, { type RosterFilterState } from "./AthletesFilterBar";
import AthletesTable from "./AthletesTable";
import { ATHLETE_STATUS_LABEL } from "./AthleteRowActions";

type ExportItem = {
  athleteId: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  phoneNumber: string | null;
  status: ATHLETE_ACCOUNT_STATUS;
  createdAt: string;
  batches: { name: string } | null;
};

const EMPTY: RosterFilterState = { search: "", status: "", batchId: "", from: "", to: "" };

export default function AthletesRoster({
  initialData,
}: {
  initialData?: AthletesInfiniteData;
}) {
  const isMobile = useIsMobile();
  const [form, setForm] = useState(EMPTY);
  const search = useDebounce(form.search, 400);

  const filters = useMemo(
    () => ({
      search: search.trim(),
      status: (form.status || undefined) as ATHLETE_ACCOUNT_STATUS | undefined,
      batchId: form.batchId,
      from: form.from,
      to: form.to,
    }),
    [search, form.status, form.batchId, form.from, form.to],
  );
  const filtered = Object.values(filters).some(Boolean);

  const {
    data,
    isPending,
    isError,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useAthletes({ filters, initialData });

  const athletes = useMemo(() => data?.pages.flatMap((p) => p.allAthletes) ?? [], [data]);

  const { ref, inView } = useInView({ rootMargin: "400px" });
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Athletes"
        description="Search the roster, update status and reach guardians. Pick a batch, then Export → PDF to print its list."
        actions={
          <>
            <ExportDropdown<ExportItem>
              filename="Athletes"
              headers={["#", "Athlete ID", "Name", "Batch", "Phone", "Status", "Registered"]}
              rows={athletes.map((a, i) => [
                String(i + 1),
                a.athleteId,
                athleteName(a),
                a.batches?.name ?? "",
                a.guardians[0]?.phoneNumber ?? "",
                ATHLETE_STATUS_LABEL[a.status] ?? a.status,
                new Date(a.createdAt).toLocaleDateString("en-GB"),
              ])}
              fetchAllUrl={`/api/export?resource=athletes&${athleteFilterParams(filters)}`}
              mapRow={(a, i) => [
                String(i + 1),
                a.athleteId,
                athleteName(a),
                a.batches?.name ?? "",
                a.phoneNumber ?? "",
                ATHLETE_STATUS_LABEL[a.status] ?? a.status,
                new Date(a.createdAt).toLocaleDateString("en-GB"),
              ]}
            />
            <Button asChild>
              <Link href="/players/create">
                <UserPlus /> Register athlete
              </Link>
            </Button>
          </>
        }
      />

      <section className="overflow-hidden rounded-lg border bg-card">
        <AthletesFilterBar
          value={form}
          onChange={(next) => setForm((f) => ({ ...f, ...next }))}
          busy={isFetching && !isFetchingNextPage}
        />

        {isPending ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        ) : isError ? (
          <div className="grid place-items-center gap-3 px-4 py-14 text-center">
            <p className="font-medium">The roster didn&apos;t load.</p>
            <p className="text-sm text-muted-foreground">
              Check your connection, then try again.
            </p>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCcw /> Try again
            </Button>
          </div>
        ) : athletes.length === 0 ? (
          <div className="grid place-items-center gap-3 px-4 py-14 text-center">
            {filtered ? (
              <>
                <p className="font-medium">No athletes match these filters.</p>
                <Button variant="outline" onClick={() => setForm(EMPTY)}>
                  Clear filters
                </Button>
              </>
            ) : (
              <>
                <p className="font-medium">The roster is empty.</p>
                <p className="text-sm text-muted-foreground">
                  Register your first athlete to start tracking attendance and fees.
                </p>
                <Button asChild>
                  <Link href="/players/create">
                    <UserPlus /> Register athlete
                  </Link>
                </Button>
              </>
            )}
          </div>
        ) : isMobile ? (
          <div className="divide-y">
            {athletes.map((a) => (
              <AthleteCard key={a.id} athlete={a} />
            ))}
          </div>
        ) : (
          <AthletesTable athletes={athletes} />
        )}

        {athletes.length > 0 && (
          <div
            ref={ref}
            className="flex h-14 items-center justify-center border-t text-sm text-muted-foreground"
          >
            {isFetchingNextPage ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" /> Loading more
              </span>
            ) : hasNextPage ? (
              <Button variant="ghost" size="sm" onClick={() => fetchNextPage()}>
                Load more
              </Button>
            ) : (
              <span className="tabular">
                {athletes.length} athlete{athletes.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
