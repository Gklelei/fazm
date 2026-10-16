import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CalendarPlus } from "lucide-react";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { SessionsExport } from "@/features/trainings/components/SessionsExport";
import { SessionsFeed } from "@/features/trainings/components/SessionsFeed";
import { SessionsToolbar } from "@/features/trainings/components/SessionsToolbar";
import { listSessions, parseSessionParams, sessionParams } from "@/features/trainings/queries/list-sessions";

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
  const first = await listSessions(params, {
    userId: session.user.id,
    role: session.user.role ?? null,
  });
  const query = sessionParams(params).toString();
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

        {first.rows.length === 0 ? (
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
          <SessionsFeed key={query} query={query} initial={JSON.parse(JSON.stringify(first))} />
        )}

      </section>
    </div>
  );
}
