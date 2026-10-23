"use client";

import Link from "next/link";
import { useEffect, useRef, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { SETTINGS_TABS, type ListTab, type SettingsTab } from "../lib/tabs";

const GROUPS = [...new Set(SETTINGS_TABS.map((t) => t.group))];

/** Settings sections, kept in the URL so a view can be linked or reloaded. A side menu on wide screens, a scrolling row on phones. */
export function SettingsNav({ tab, counts, hide = [] }: { tab: SettingsTab; counts: Record<ListTab, number>; hide?: SettingsTab[] }) {
  const nav = useRef<HTMLElement>(null);
  // Phones: keep the open section in view in the scrolling row
  useEffect(() => {
    nav.current?.querySelector("[aria-current=page]")?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [tab]);
  return (
    <nav ref={nav} aria-label="Settings sections" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 lg:sticky lg:top-20 lg:self-start lg:overflow-visible">
      <div className="inline-flex gap-1 rounded-lg bg-muted p-1 lg:flex lg:flex-col lg:gap-4 lg:bg-transparent lg:p-0">
        {GROUPS.map((g) => (
          <div key={g} className="contents lg:block lg:space-y-0.5">
            <p className="hidden px-3 pb-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase lg:block">{g}</p>
            {SETTINGS_TABS.filter((t) => t.group === g && !hide.includes(t.key)).map((t) => (
              <Link
                key={t.key}
                href={`/settings?tab=${t.key}`}
                scroll={false}
                aria-current={tab === t.key ? "page" : undefined}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground lg:py-2 lg:hover:bg-muted",
                  tab === t.key && "bg-background text-foreground shadow-sm lg:bg-primary/10 lg:text-primary lg:shadow-none lg:hover:bg-primary/10",
                )}
              >
                {t.label}
                {t.list && <span className="tabular text-xs text-muted-foreground">{counts[t.key]}</span>}
              </Link>
            ))}
          </div>
        ))}
      </div>
    </nav>
  );
}

/** "Show archived" for the list sections, in the URL like the section. */
export function ArchivedSwitch({ showArchived, archivedCount }: { showArchived: boolean; archivedCount: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  return (
    <label className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
      {pending && <Loader2 className="size-3.5 animate-spin" />}
      Show archived
      {archivedCount > 0 && <span className="tabular">({archivedCount})</span>}
      <Switch
        checked={showArchived}
        onCheckedChange={(on) =>
          start(() => {
            const next = new URLSearchParams(params);
            if (on) next.set("archived", "1");
            else next.delete("archived");
            router.replace(`${pathname}?${next}`, { scroll: false });
          })
        }
      />
    </label>
  );
}
