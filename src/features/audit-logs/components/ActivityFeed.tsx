"use client";

import Link from "next/link";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  Archive,
  ArchiveRestore,
  ArrowUpRight,
  Download,
  Eye,
  KeyRound,
  LogIn,
  LogOut,
  Pencil,
  Plus,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import { LoadMore } from "@/components/shared/LoadMore";
import { formatAcademy, academyToday } from "@/lib/academy-time";
import { ROLE_LABEL } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { areaOf, toneOf, type Tone } from "../lib/catalog";
import type { ActivityPage, ActivityRow } from "../queries/list";

const TONE: Record<Tone, { icon: LucideIcon; className: string; label: string }> = {
  added: { icon: Plus, className: "bg-success/12 text-success", label: "Added" },
  changed: { icon: Pencil, className: "bg-info/10 text-info", label: "Changed" },
  removed: { icon: Archive, className: "bg-destructive/10 text-destructive", label: "Archived or removed" },
  restored: { icon: ArchiveRestore, className: "bg-success/12 text-success", label: "Restored" },
  viewed: { icon: Eye, className: "bg-muted text-muted-foreground", label: "Viewed" },
  downloaded: { icon: Download, className: "bg-muted text-muted-foreground", label: "Downloaded" },
  signin: { icon: LogIn, className: "bg-muted text-muted-foreground", label: "Signed in" },
  signout: { icon: LogOut, className: "bg-muted text-muted-foreground", label: "Signed out" },
  failed: { icon: ShieldAlert, className: "bg-destructive/10 text-destructive", label: "Failed sign-in" },
  security: { icon: KeyRound, className: "bg-warning/15 text-warning-foreground dark:text-warning", label: "Security" },
};

const FIELD: Record<string, string> = {
  trainingLocationsId: "Pitch",
  staffId: "Coach",
  batchesId: "Squad",
  isActive: "Active",
  isArchived: "Archived",
  drillOrder: "Drills",
  fullNames: "Name",
  academyName: "Academy name",
  paymentMathod: "Payment method",
  paymentMethodType: "Payment method type",
  receiptFooterNotes: "Receipt footer",
};
const fieldLabel = (k: string) =>
  FIELD[k] ?? k.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase()).replace(/ ([A-Z])/g, (_, c) => ` ${c.toLowerCase()}`);
const show = (v: unknown) =>
  v === null || v === undefined || v === "" ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v);

/** What happened, in words; older entries stored a JSON object, shown as "key value" pairs. */
function describe(r: Wire, fallback: string) {
  const d = r.details?.trim();
  if (!d) return { PASSWORD_CHANGE: "Changed their password", PASSWORD_RESET: "Reset their password with an emailed link" }[r.action] ?? fallback;
  if (!d.startsWith("{")) return d;
  try {
    return Object.entries(JSON.parse(d) as Record<string, unknown>)
      .map(([k, v]) => `${k} ${typeof v === "object" ? JSON.stringify(v) : v}`)
      .join(" · ");
  } catch {
    return d;
  }
}

/** "Chrome on Android" from a user-agent string; good enough to tell devices apart. */
function deviceOf(ua: string | null) {
  if (!ua) return null;
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iPhone" : /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser} on ${os}` : browser;
}

/** Where the entry's record lives in the app, when it has a page. */
function recordLink(r: Wire) {
  if (r.athlete) return { href: `/players/user-profile/${r.athlete.athleteId}`, label: "Open athlete" };
  if (r.invoice) return { href: `/invoices/${r.invoice.id}`, label: "Open invoice" };
  if (r.training) return { href: `/sessions/view/${r.training.id}`, label: "Open session" };
  if (r.resource === "Staff" && r.recordId) return { href: `/staff/${r.recordId}/view`, label: "Open staff profile" };
  if (r.resource === "Batch") return { href: "/settings", label: "Open squads" };
  return null;
}

type Wire = Omit<ActivityRow, "createdAt"> & { createdAt: string | Date };
type Changes = { before: Record<string, unknown>; after: Record<string, unknown> } | null;

const dayKey = (d: string | Date) => formatAcademy(d, { year: "numeric", month: "2-digit", day: "2-digit" });
function dayLabel(d: string | Date) {
  const key = dayKey(d);
  const today = academyToday().split("-").reverse().join("/");
  const yesterday = new Date(Date.parse(`${academyToday()}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10).split("-").reverse().join("/");
  const long = formatAcademy(d, { weekday: "long", day: "numeric", month: "short", year: "numeric" });
  return key === today ? `Today · ${long}` : key === yesterday ? `Yesterday · ${long}` : long;
}

function Entry({ r }: { r: Wire }) {
  const tone = TONE[toneOf(r.action)];
  const changes = r.changes as Changes;
  const fields = changes ? Object.keys(changes.after) : [];
  const link = recordLink(r);
  const device = deviceOf(r.userAgent);
  const Icon = tone.icon;

  return (
    <li>
      <details className="group">
        <summary className="grid cursor-pointer list-none grid-cols-[auto_1fr_auto] items-start gap-3 px-4 py-3 hover:bg-muted/40 [&::-webkit-details-marker]:hidden">
          <span className={cn("mt-0.5 grid size-8 place-items-center rounded-full", tone.className)} title={tone.label}>
            <Icon className="size-4" aria-hidden />
            <span className="sr-only">{tone.label}</span>
          </span>
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm">
              <span className="font-medium">{r.user?.name ?? "System"}</span>
              {r.role && <span className="text-xs text-muted-foreground"> · {ROLE_LABEL[r.role as keyof typeof ROLE_LABEL] ?? r.role}</span>}
            </p>
            <p className="text-sm break-words text-foreground/90 group-open:line-clamp-none line-clamp-2">{describe(r, tone.label)}</p>
            <p className="text-xs text-muted-foreground">
              {areaOf(r.resource)?.label ?? r.resource}
              {fields.length > 0 && ` · ${fields.length} field${fields.length === 1 ? "" : "s"} changed`}
            </p>
          </div>
          <time className="tabular pt-0.5 text-xs text-muted-foreground" dateTime={new Date(r.createdAt).toISOString()}>
            {formatAcademy(r.createdAt, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}
          </time>
        </summary>

        <div className="mr-4 mb-3 ml-15 space-y-3 rounded-md border bg-muted/30 p-3 text-sm">
          {changes && fields.length > 0 && (
            <table className="w-full max-w-2xl text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="pb-1 font-medium">Field</th>
                  <th className="pb-1 font-medium">Before</th>
                  <th className="pb-1 font-medium">After</th>
                </tr>
              </thead>
              <tbody className="align-top">
                {fields.map((f) => (
                  <tr key={f} className="border-t">
                    <td className="py-1 pr-3 font-medium">{fieldLabel(f)}</td>
                    <td className="py-1 pr-3 break-all text-muted-foreground line-through decoration-muted-foreground/40">
                      {show(changes.before[f])}
                    </td>
                    <td className="py-1 break-all">{show(changes.after[f])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
            <dt className="text-muted-foreground">When</dt>
            <dd className="tabular">
              {formatAcademy(r.createdAt, { dateStyle: "medium", timeStyle: "medium", hourCycle: "h23" })}
            </dd>
            {r.user?.email && (
              <>
                <dt className="text-muted-foreground">Account</dt>
                <dd className="break-all">{r.user.email}</dd>
              </>
            )}
            {device && (
              <>
                <dt className="text-muted-foreground">Device</dt>
                <dd>{device}</dd>
              </>
            )}
            {r.ip && (
              <>
                <dt className="text-muted-foreground">IP address</dt>
                <dd className="tabular">{r.ip}</dd>
              </>
            )}
            <dt className="text-muted-foreground">Code</dt>
            <dd className="font-mono">{r.action}</dd>
          </dl>
          {link && (
            <Link href={link.href} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              {link.label} <ArrowUpRight className="size-3.5" />
            </Link>
          )}
        </div>
      </details>
    </li>
  );
}

/** The log as a day-by-day feed; further pages load as you scroll. */
export function ActivityFeed({ query, initial }: { query: string; initial: ActivityPage }) {
  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } = useInfiniteQuery({
    queryKey: ["activity", query],
    initialData: { pages: [initial], pageParams: [""] },
    queryFn: async ({ pageParam }): Promise<ActivityPage> => {
      const params = new URLSearchParams(query);
      if (pageParam) params.set("cursor", pageParam);
      const res = await fetch(`/api/activity?${params}`);
      if (!res.ok) throw new Error("Couldn't load the activity log");
      return res.json();
    },
    initialPageParam: "",
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: 30_000,
  });

  const rows = data.pages.flatMap((p) => p.rows) as Wire[];
  const days = new Map<string, Wire[]>();
  for (const r of rows) days.set(dayKey(r.createdAt), [...(days.get(dayKey(r.createdAt)) ?? []), r]);

  if (!rows.length) {
    return <p className="px-4 py-16 text-center text-sm text-muted-foreground">Nothing matches these filters.</p>;
  }

  return (
    <>
      {[...days.values()].map((list) => (
        <section key={list[0].id}>
          <h2 className="sticky top-14 z-10 border-b bg-muted/80 px-4 py-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase backdrop-blur">
            {dayLabel(list[0].createdAt)}
          </h2>
          <ul className="divide-y">
            {list.map((r) => (
              <Entry key={r.id} r={r} />
            ))}
          </ul>
        </section>
      ))}
      <LoadMore
        shown={rows.length}
        total={data.pages[0].total}
        noun={["entry", "entries"]}
        hasNextPage={!!hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      />
    </>
  );
}
