import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAuditLog } from "@/lib/audit";
import { JOBS, type JobName } from "@/features/jobs/jobs";

export const dynamic = "force-dynamic";

/** Constant-time Bearer check; refuses everything if CRON_SECRET is unset. */
function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer /, "");
  if (!secret || secret.length < 16 || token.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(secret));
}

/**
 * POST /api/cron-jobs/<job>[?dryRun=1]
 * Called by the server crontab (scripts/cron/run-job.sh) on localhost.
 * Every run is written to the activity log as CRON_<JOB>.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ job: string }> }) {
  if (!authorized(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { job } = await params;
  if (!(job in JOBS)) return NextResponse.json({ ok: false, error: `Unknown job '${job}'` }, { status: 404 });

  const dryRun = req.nextUrl.searchParams.get("dryRun") === "1";
  const started = Date.now();
  try {
    const result = await JOBS[job as JobName]({ dryRun });
    const ms = Date.now() - started;
    if (!dryRun) {
      await createAuditLog({
        action: `CRON_${job.toUpperCase().replaceAll("-", "_")}`,
        resource: "Cron",
        details: JSON.stringify({ ...result, ms }).slice(0, 2000),
      });
    }
    console.log(`[cron] ${job} ok in ${ms}ms`, result);
    return NextResponse.json({ ok: true, job, ms, ...result });
  } catch (error) {
    console.error(`[cron] ${job} failed`, error);
    await createAuditLog({
      action: `CRON_${job.toUpperCase().replaceAll("-", "_")}_FAILED`,
      resource: "Cron",
      details: error instanceof Error ? error.message.slice(0, 500) : "unknown error",
    });
    return NextResponse.json({ ok: false, job, error: "Job failed; see server log" }, { status: 500 });
  }
}
