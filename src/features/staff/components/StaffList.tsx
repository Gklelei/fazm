"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useInfiniteQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { Loader2, RefreshCcw, Search, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadMore } from "@/components/shared/LoadMore";
import ExportDropdown from "@/components/shared/ExportDropdown";
import { useDebounce } from "@/hooks/use-debounce";
import { useIsMobile } from "@/hooks/use-mobile";
import { ROLE_LABEL } from "@/lib/roles";
import { useAuthSession } from "@/providers/SessionProvider";
import type { StaffPage, StaffRow } from "../queries/list";
import { StaffCard, StaffTable } from "./StaffTable";

const ALL = "all";
const ACCESS = [
  { value: "role:COACH", label: "Coaches" },
  { value: "role:ADMIN", label: "Admins" },
  { value: "role:FINANCE", label: "Finance" },
  { value: "role:DOCTOR", label: "Medical" },
  { value: "role:SUPER_ADMIN", label: "Super admins" },
  { value: "none", label: "No sign-in" },
];

const signIn = (s: StaffRow) => (s.user && !s.user.isArchived ? ROLE_LABEL[s.user.role] : "No sign-in");
const exportRow = (s: StaffRow, i: number) => [
  String(i + 1),
  s.staffId,
  s.fullNames,
  s.jobTitle ?? "",
  signIn(s),
  s.batches.map((b) => b.name).join(", "),
  s.phoneNumber,
  s.email ?? "",
  s.startDate ? new Date(s.startDate).toLocaleDateString("en-GB") : "",
];

export function StaffList({ initial }: { initial: StaffPage }) {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { user } = useAuthSession();
  const [search, setSearch] = useState("");
  const [access, setAccess] = useState("");
  const q = useDebounce(search, 300).trim();
  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set("search", q);
    if (access) p.set("access", access);
    return p.toString();
  }, [q, access]);
  const filtered = !!params;

  const { data, isPending, isError, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage, refetch } = useInfiniteQuery({
    queryKey: ["staff", params],
    queryFn: async ({ pageParam }): Promise<StaffPage> => {
      const p = new URLSearchParams(params);
      if (pageParam) p.set("cursor", pageParam);
      const res = await fetch(`/api/staff?${p}`);
      if (!res.ok) throw new Error("Couldn't load staff");
      return res.json();
    },
    initialPageParam: "",
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialData: params ? undefined : ({ pages: [initial], pageParams: [""] } as InfiniteData<StaffPage, string>),
  });
  const staff = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);
  const changed = () => void queryClient.invalidateQueries({ queryKey: ["staff"] });
  const clear = () => {
    setSearch("");
    setAccess("");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff"
        description="Coaches and everyone else who works at the academy."
        actions={
          <>
            <ExportDropdown<StaffRow>
              filename="Staff"
              headers={["#", "Staff ID", "Name", "Job", "Sign-in", "Batches", "Phone", "Email", "Started"]}
              rows={staff.map(exportRow)}
              fetchAllUrl={`/api/export?resource=staff&${params}`}
              mapRow={exportRow}
            />
            <Button asChild>
              <Link href="/staff/create">
                <UserPlus /> Add staff
              </Link>
            </Button>
          </>
        }
      />

      <section className="overflow-hidden rounded-lg border bg-card">
        <div className="grid gap-3 border-b p-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              aria-label="Search staff"
              placeholder="Search name, ID, phone or job"
              className="pr-9 pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {isFetching && !isFetchingNextPage && (
              <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Sign-in</Label>
            <Select value={access || ALL} onValueChange={(v) => setAccess(v === ALL ? "" : v)}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Everyone</SelectItem>
                {ACCESS.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {filtered && (
            <Button variant="ghost" onClick={clear} className="justify-self-start">
              <X /> Clear
            </Button>
          )}
        </div>

        {isPending ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        ) : isError ? (
          <div className="grid place-items-center gap-3 px-4 py-14 text-center">
            <p className="font-medium">The staff list didn&apos;t load.</p>
            <p className="text-sm text-muted-foreground">Check your connection, then try again.</p>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCcw /> Try again
            </Button>
          </div>
        ) : staff.length === 0 ? (
          <div className="grid place-items-center gap-3 px-4 py-14 text-center">
            {filtered ? (
              <>
                <p className="font-medium">No one matches.</p>
                <Button variant="outline" onClick={clear}>
                  Clear filters
                </Button>
              </>
            ) : (
              <>
                <p className="font-medium">No staff yet.</p>
                <Button asChild>
                  <Link href="/staff/create">
                    <UserPlus /> Add staff
                  </Link>
                </Button>
              </>
            )}
          </div>
        ) : (
          <>
            {isMobile ? (
              <div className="divide-y">
                {staff.map((s) => (
                  <StaffCard key={s.id} staff={s} meId={user.id} onChanged={changed} />
                ))}
              </div>
            ) : (
              <StaffTable staff={staff} meId={user.id} onChanged={changed} />
            )}
            <LoadMore
              shown={staff.length}
              total={data?.pages[0]?.total}
              noun={["person", "people"]}
              hasNextPage={!!hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              fetchNextPage={fetchNextPage}
            />
          </>
        )}
      </section>
    </div>
  );
}
