"use client";

import Link from "next/link";
import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { SETTINGS_TABS, type SettingsTab } from "../lib/tabs";

/** Tabs and the archived switch, both kept in the URL so a view can be linked or reloaded. */
export function SettingsToolbar({
  tab,
  counts,
  showArchived,
  archivedCount,
}: {
  tab: SettingsTab;
  counts: Record<SettingsTab, number>;
  showArchived: boolean;
  archivedCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  const href = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    return `${pathname}?${next}`;
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <nav
        className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0"
        aria-label="Settings sections"
      >
        <div className="inline-flex rounded-lg bg-muted p-1">
          {SETTINGS_TABS.map((t) => (
            <Link
              key={t.key}
              href={href({ tab: t.key })}
              scroll={false}
              aria-current={tab === t.key ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground",
                tab === t.key && "bg-background text-foreground shadow-sm",
              )}
            >
              {t.key === "reasons" ? (
                <>
                  <span className="sm:hidden">Reasons</span>
                  <span className="hidden sm:inline">{t.label}</span>
                </>
              ) : (
                t.label
              )}
              <span className="tabular text-xs text-muted-foreground">
                {counts[t.key]}
              </span>
            </Link>
          ))}
        </div>
      </nav>

      <label className="flex items-center gap-2 self-end text-sm text-muted-foreground sm:self-auto">
        {pending && <Loader2 className="size-3.5 animate-spin" />}
        Show archived
        {archivedCount > 0 && (
          <span className="tabular">({archivedCount})</span>
        )}
        <Switch
          checked={showArchived}
          onCheckedChange={(on) =>
            start(() =>
              router.replace(href({ archived: on ? "1" : null }), {
                scroll: false,
              }),
            )
          }
        />
      </label>
    </div>
  );
}
