import "server-only";
import { after } from "next/server";

/** Runs work after the response is sent (emails and the like). Outside a request (jobs, tests) it just runs. Failures are logged, never thrown. */
export function inBackground(work: () => Promise<unknown>) {
  const run = () => work().catch((e) => console.error("Background work failed", e));
  try {
    after(run);
  } catch {
    void run();
  }
}
