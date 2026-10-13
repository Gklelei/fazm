import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { SessionsExport } from "@/features/trainings/components/SessionsExport";
import { SessionsList } from "@/features/trainings/components/SessionsList";
import { SessionsToolbar } from "@/features/trainings/components/SessionsToolbar";
import { listSessions, parseSessionParams } from "@/features/trainings/queries/list-sessions";

export const metadata: Metadata = { title: "Training sessions" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const sp = await searchParams;
  const params = parseSessionParams(sp);
  const { rows, total, pages } = await listSessions(params, {
    userId: session.user.id,
    role: session.user.role ?? null,
  });

  const pageHref = (page: number) => {
    const q = new URLSearchParams(Object.entries(sp).filter((e): e is [string, string] => !!e[1]));
    q.set("page", String(page));
    return `/sessions?${q}`;
  };
  const filtered = !!(params.search || params.batchId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sessions"
        description={
          session.user.role === "COACH"
            ? "Your training sessions. Open one to take attendance or assess athletes."
            : "Plan training, take attendance and assess athletes."
        }
        actions={
          <>
            <SessionsExport />
            <Button asChild>
              <Link href="/sessions/create">
                <CalendarPlus /> Plan a session
              </Link>
            </Button>
          </>
        }
      />

      <section className="overflow-hidden rounded-lg border bg-card">
        <SessionsToolbar view={params.view} />

        {rows.length === 0 ? (
          <div className="grid place-items-center gap-3 px-4 py-16 text-center">
            <p className="font-medium">
              {filtered
                ? "No sessions match these filters."
                : params.view === "upcoming"
                  ? "Nothing on the schedule yet."
                  : "No past sessions."}
            </p>
            {filtered ? (
              <Button variant="outline" asChild>
                <Link href={`/sessions?view=${params.view}`}>Clear filters</Link>
              </Button>
            ) : (
              params.view === "upcoming" && (
                <Button asChild>
                  <Link href="/sessions/create">
                    <CalendarPlus /> Plan a session
                  </Link>
                </Button>
              )
            )}
          </div>
        ) : (
          <SessionsList rows={rows} />
        )}

        {total > 0 && (
          <footer className="flex items-center justify-between gap-3 border-t px-4 py-3 text-sm text-muted-foreground">
            <span className="tabular">
              {total} session{total === 1 ? "" : "s"}
            </span>
            {pages > 1 && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild disabled={params.page <= 1}>
                  <Link
                    href={pageHref(params.page - 1)}
                    aria-disabled={params.page <= 1}
                    className={params.page <= 1 ? "pointer-events-none opacity-50" : ""}
                  >
                    <ChevronLeft /> Previous
                  </Link>
                </Button>
                <span className="tabular">
                  {params.page} / {pages}
                </span>
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={pageHref(params.page + 1)}
                    aria-disabled={params.page >= pages}
                    className={params.page >= pages ? "pointer-events-none opacity-50" : ""}
                  >
                    Next <ChevronRight />
                  </Link>
                </Button>
              </div>
            )}
          </footer>
        )}
      </section>
    </div>
  );
}
