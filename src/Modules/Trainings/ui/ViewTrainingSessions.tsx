"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDuration, FormatParticipants } from "@/utils/TansformWords";
import { format } from "date-fns";
import {
  CalendarDays,
  Clock,
  Loader2Icon,
  MapPin,
  MoreHorizontalIcon,
  Plus,
  Search,
  Trash2,
  Pencil,
  Eye,
  ClipboardCheck,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DeleteTrainingSession } from "../Server/DeleteTrainingSession";
import { Sweetalert } from "@/utils/Alerts/Sweetalert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDebounce } from "@/utils/Debounce";
import { useIsMobile } from "@/hooks/use-mobile";

// use your existing type
import { GetAllTrainingSessionsQueryType } from "../Assesments/Types";
import Paginator from "@/utils/Paginator";

type Meta = {
  total: number;
  page: number;
  pageSize: number;
  search: string;
};

interface Props {
  data: GetAllTrainingSessionsQueryType[];
  meta: Meta;
}

function buildSessionsUrl(opts: {
  page: number;
  pageSize: number;
  search: string;
}) {
  const sp = new URLSearchParams();
  sp.set("page", String(opts.page));
  sp.set("pageSize", String(opts.pageSize));
  if (opts.search.trim()) sp.set("search", opts.search.trim());
  return `/training/sessions?${sp.toString()}`;
}

export default function ViewTrainingSessions({ data, meta }: Props) {
  const router = useRouter();
  const isMobile = useIsMobile();

  const [tId, setTid] = useState<string | undefined>(undefined);

  // search box -> URL param
  const [searchQuery, setSearchQuery] = useState(meta.search ?? "");
  const debounced = useDebounce(searchQuery, 600);

  // "search loading" UX (since you're doing router navigation + server fetch)
  const [isSearching, setIsSearching] = useState(false);

  // keep input in sync when user paginates or arrives with a URL search param
  useEffect(() => {
    setSearchQuery(meta.search ?? "");
    setIsSearching(false);
  }, [meta.search]);

  // push URL when debounced changes (page resets to 1)
  useEffect(() => {
    const next = debounced.trim();

    // if user is typing and we will navigate, show a lightweight "searching" state
    // only when the query is different from current server param
    if (next !== (meta.search ?? "")) setIsSearching(true);

    router.replace(
      buildSessionsUrl({ page: 1, pageSize: meta.pageSize, search: next }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const rowStartNumber = useMemo(
    () => (meta.page - 1) * meta.pageSize,
    [meta.page, meta.pageSize],
  );

  const hasSearch = Boolean((meta.search ?? "").trim());

  const emptyState = useMemo(() => {
    if (isSearching) {
      return {
        title: "Searching sessions…",
        description: "Hold on while we fetch matching results.",
        icon: <Loader2Icon className="h-5 w-5 animate-spin" />,
        cta: null,
      };
    }

    if (hasSearch) {
      return {
        title: "No matches found",
        description:
          "Try a different keyword. You can search by session name, batch, or location.",
        icon: <XCircle className="h-5 w-5" />,
        cta: (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSearchQuery("");
              router.replace(
                buildSessionsUrl({
                  page: 1,
                  pageSize: meta.pageSize,
                  search: "",
                }),
              );
            }}
          >
            Clear search
          </Button>
        ),
      };
    }

    return {
      title: "No training sessions yet",
      description:
        "Create your first session to schedule training, assign a coach, and add athletes from a batch.",
      icon: <CalendarDays className="h-5 w-5" />,
      cta: (
        <Button
          size="sm"
          onClick={() => router.push("/training/sessions/create")}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Create session
        </Button>
      ),
    };
  }, [hasSearch, isSearching, meta.pageSize, router]);

  const handleDelete = async (id: string) => {
    setTid(id);

    const result = await DeleteTrainingSession(id);

    Sweetalert(
      result.success
        ? { icon: "success", text: result.message, title: "Deleted" }
        : { icon: "error", text: result.message, title: "Delete failed" },
    );

    setTid(undefined);

    router.refresh();
  };

  const onPageChange = (p: number) => {
    router.push(
      buildSessionsUrl({
        page: p,
        pageSize: meta.pageSize,
        search: meta.search ?? "",
      }),
    );
  };

  const onPageSizeChange = (ps: number) => {
    router.push(
      buildSessionsUrl({ page: 1, pageSize: ps, search: meta.search ?? "" }),
    );
  };

  const headerSubtitle = hasSearch
    ? `Showing results for “${meta.search}”.`
    : "Create, review, and manage sessions. Coaches can access sessions assigned to them.";

  return (
    <Card className="w-full">
      <CardContent className="space-y-6 pt-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold leading-none">
                  Training Sessions
                </h2>
                {meta.total > 0 && !hasSearch ? (
                  <span className="text-xs text-muted-foreground">
                    ({meta.total.toLocaleString()} total)
                  </span>
                ) : null}
              </div>
              <p className="text-sm text-muted-foreground">{headerSubtitle}</p>
            </div>

            <Button
              onClick={() => router.push("/training/sessions/create")}
              type="button"
              className="gap-2 w-full sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              Create session
            </Button>
          </div>

          {/* Search */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  // immediate UX feedback while user types
                  if (e.target.value.trim() !== (meta.search ?? ""))
                    setIsSearching(true);
                }}
                placeholder="Search by session, batch, or location…"
                className="pl-9"
              />

              {isSearching ? (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2Icon className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : null}
            </div>

            <p className="text-xs text-muted-foreground">
              Updates automatically.
            </p>
          </div>
        </div>

        {/* Content */}
        {data.length === 0 ? (
          <div className="rounded-lg border p-8">
            <div className="flex flex-col items-center justify-center gap-3 text-center">
              <div className="rounded-full border p-2">{emptyState.icon}</div>
              <div className="space-y-1">
                <p className="font-medium">{emptyState.title}</p>
                <p className="text-sm text-muted-foreground max-w-md">
                  {emptyState.description}
                </p>
              </div>
              {emptyState.cta}
            </div>
          </div>
        ) : isMobile ? (
          // Mobile cards
          <div className="grid gap-3">
            {data.map((item, i) => {
              const rowNumber = rowStartNumber + i + 1;
              const deleting = tId === item.id;

              return (
                <Card key={item.id} className="overflow-hidden">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground tabular-nums">
                            #{rowNumber}
                          </span>
                          <Badge variant="outline" className="shrink-0">
                            {item.status}
                          </Badge>
                        </div>

                        <p className="mt-1 font-semibold leading-tight truncate">
                          {item.name}
                        </p>

                        <div className="mt-2 grid gap-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4" />
                            <span>
                              {format(new Date(item.date), "MMM dd, yyyy")}
                            </span>
                            <span className="text-muted-foreground/60">•</span>
                            <span>{format(new Date(item.date), "p")}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>{formatDuration(item.duration)}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span className="truncate">
                              {item.location.name}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <span className="text-xs text-muted-foreground">
                              Coach
                            </span>
                            <span className="text-sm text-foreground truncate max-w-[70%]">
                              {item.coach.fullNames}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              Athletes
                            </span>
                            <span className="text-sm text-foreground tabular-nums">
                              {FormatParticipants(item._count.athletes)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Actions"
                          >
                            <MoreHorizontalIcon className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/training/sessions/view/${item.id}`)
                            }
                            className="gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            View session
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/training/sessions/edit/${item.id}`)
                            }
                            className="gap-2"
                          >
                            <Pencil className="h-4 w-4" />
                            Edit session
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/assesments/${item.id}/mark`)
                            }
                            className="gap-2"
                          >
                            <ClipboardCheck className="h-4 w-4" />
                            Assessment
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() =>
                              router.push(
                                `/training/sessions/attendance/mark/${item.id}`,
                              )
                            }
                            className="gap-2"
                          >
                            <ClipboardCheck className="h-4 w-4" />
                            Mark attendance
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            disabled={deleting}
                            onClick={() => handleDelete(item.id)}
                            className="gap-2"
                          >
                            {deleting ? (
                              <>
                                <Loader2Icon className="h-4 w-4 animate-spin" />
                                Deleting…
                              </>
                            ) : (
                              <>
                                <Trash2 className="h-4 w-4" />
                                Delete session
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() =>
                          router.push(`/training/sessions/view/${item.id}`)
                        }
                      >
                        View
                      </Button>
                      <Button
                        className="w-full"
                        onClick={() =>
                          router.push(
                            `/training/sessions/attendance/mark/${item.id}`,
                          )
                        }
                      >
                        Attendance
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          // Desktop table
          <div className="overflow-x-auto rounded-lg border">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-12">#</TableHead>
                  <TableHead className="max-w-xs">Session</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Coach</TableHead>
                  <TableHead className="text-right">Athletes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {data.map((item, i) => {
                  const rowNumber = rowStartNumber + i + 1;

                  return (
                    <TableRow
                      key={item.id}
                      className="hover:bg-muted/40 transition-colors"
                    >
                      <TableCell className="text-muted-foreground">
                        {rowNumber}
                      </TableCell>

                      <TableCell className="font-medium truncate max-w-xs">
                        <div className="flex flex-col">
                          <span className="truncate">{item.name}</span>
                          <span className="text-xs text-muted-foreground">
                            Batch: {item.batch?.name ?? "—"}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col leading-tight">
                          <span>
                            {format(new Date(item.date), "MMM dd, yyyy")}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(item.date), "p")}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="text-right tabular-nums">
                        {formatDuration(item.duration)}
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline">{item.status}</Badge>
                      </TableCell>

                      <TableCell className="truncate">
                        {item.location.name}
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col leading-tight">
                          <span className="truncate">
                            {item.coach.fullNames}
                          </span>
                          <span className="text-xs text-muted-foreground truncate">
                            {item.coach.staffId}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="text-right tabular-nums">
                        {FormatParticipants(item._count.athletes)}
                      </TableCell>

                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Actions"
                            >
                              <MoreHorizontalIcon className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>

                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(
                                  `/training/sessions/view/${item.id}`,
                                )
                              }
                              className="gap-2"
                            >
                              <Eye className="h-4 w-4" />
                              View session
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() =>
                                router.push(
                                  `/training/sessions/edit/${item.id}`,
                                )
                              }
                              className="gap-2"
                            >
                              <Pencil className="h-4 w-4" />
                              Edit session
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() =>
                                router.push(`/assesments/${item.id}/mark`)
                              }
                              className="gap-2"
                            >
                              <ClipboardCheck className="h-4 w-4" />
                              Assessment
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() =>
                                router.push(
                                  `/training/sessions/attendance/mark/${item.id}`,
                                )
                              }
                              className="gap-2"
                            >
                              <ClipboardCheck className="h-4 w-4" />
                              Mark attendance
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              disabled={tId === item.id}
                              onClick={() => handleDelete(item.id)}
                              className="gap-2"
                            >
                              {tId === item.id ? (
                                <>
                                  <Loader2Icon className="h-4 w-4 animate-spin" />
                                  Deleting…
                                </>
                              ) : (
                                <>
                                  <Trash2 className="h-4 w-4" />
                                  Delete session
                                </>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Paginator */}
        <Paginator
          page={meta.page}
          pageSize={meta.pageSize}
          total={meta.total}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      </CardContent>
    </Card>
  );
}
