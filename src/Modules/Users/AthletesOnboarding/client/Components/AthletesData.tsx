"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";

import { UseGetAllAthletes } from "../../Api/FetchAllAthletes";
import { DeleteAthlete } from "../../Server/DeleteAthlete";
import { UpdateAthleteStatus } from "../../Server/EditAthleteStatus";
import { useDebounce } from "@/utils/Debounce";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { PageLoader } from "@/utils/Alerts/PageLoader";
import ProfileImage from "@/utils/profile/ProfileAvatar";
import { Sweetalert } from "@/utils/Alerts/Sweetalert";
import { cn } from "@/lib/utils";

import {
  Eye,
  Loader2,
  MoreHorizontal,
  PenIcon,
  Search,
  Trash2Icon,
  UserPlus,
  CheckCircle2,
  Clock4,
  Ban,
  ChevronDown,
  XCircle,
  RefreshCcw,
  Users,
  ShieldCheck,
} from "lucide-react";

const statusOptions = [
  {
    value: "PENDING",
    label: "Pending",
    Icon: Clock4,
    // keep your colors if you want; if not, remove these and use variants only
    color: "text-amber-600 bg-amber-100 border-amber-200",
  },
  {
    value: "ACTIVE",
    label: "Active",
    Icon: CheckCircle2,
    color: "text-emerald-600 bg-emerald-100 border-emerald-200",
  },
  {
    value: "SUSPENDED",
    label: "Suspended",
    Icon: Ban,
    color: "text-red-600 bg-red-100 border-red-200",
  },
] as const;

function normalizeStatus(raw?: string) {
  const s = (raw ?? "").trim().toUpperCase();
  if (s === "DEACTIVATED" || s === "SUSPEND") return "SUSPENDED";
  return s || "PENDING";
}

type AthleteRow = {
  id: string;
  athleteId: string;
  firstName: string;
  middleName: string;
  lastName: string;
  email?: string | null;
  profilePIcture?: string | null;
  positions: string[];
  status: string;
};

function fullName(a: AthleteRow) {
  return [a.firstName, a.middleName, a.lastName].filter(Boolean).join(" ");
}

const AthletesData = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const [deletingId, setDeletingId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchValue = useDebounce(searchQuery, 800);

  // UX-only: “searching” indicator while debounce hasn’t caught up
  const isSearching = searchQuery.trim() !== debouncedSearchValue.trim();

  const {
    data,
    isError,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isRefetching,
    refetch,
  } = UseGetAllAthletes({ search: debouncedSearchValue });

  const { ref, inView } = useInView({ rootMargin: "300px" });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const athletes: AthleteRow[] = useMemo(() => {
    const flat: AthleteRow[] = data?.pages.flatMap((p) => p.allAthletes) ?? [];
    // defensive dedupe (prevents visual repeats if a page is refetched)
    const map = new Map<string, AthleteRow>();
    for (const a of flat) map.set(a.id, a);
    return Array.from(map.values());
  }, [data?.pages]);

  async function handleDeleteAthlete(athleteId: string) {
    setDeletingId(athleteId);

    const result = await DeleteAthlete(athleteId);

    if (result.status === "SUCCESS") {
      Sweetalert({
        icon: "success",
        text: result.successMessage || "Athlete deleted",
        title: "Deleted",
      });
      await queryClient.invalidateQueries({ queryKey: ["all-athletes"] });
    } else {
      Sweetalert({
        icon: "error",
        text: result.errorMessage || "Failed to delete",
        title: "Error",
      });
    }

    setDeletingId("");
  }

  const handleChangeAthleteStatus = async ({
    athleteId,
    status,
  }: {
    athleteId: string;
    status: "PENDING" | "ACTIVE" | "SUSPENDED";
  }) => {
    const result = await UpdateAthleteStatus({ athleteId, status });

    if (result.success) {
      await queryClient.invalidateQueries({ queryKey: ["all-athletes"] });
      Sweetalert({
        icon: "success",
        text: `Athlete marked as ${status.toLowerCase()}`,
        title: "Status Updated",
      });
    } else {
      Sweetalert({
        icon: "error",
        text: result.message,
        title: "Update Failed",
      });
    }
  };

  if (isLoading && !isFetchingNextPage) return <PageLoader />;

  if (isError) {
    return (
      <div className="p-8 text-center rounded-lg border">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full border bg-muted/40">
          <XCircle className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="font-semibold">Couldn’t load athletes</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Check your connection and try again.
        </p>

        <div className="mt-4 flex justify-center gap-2">
          <Button variant="outline" onClick={() => refetch()} className="gap-2">
            <RefreshCcw className="h-4 w-4" />
            Retry
          </Button>
          <Button
            onClick={() => router.push("/users/players/create")}
            className="gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Register athlete
          </Button>
        </div>
      </div>
    );
  }

  const showEmpty =
    athletes.length === 0 && !debouncedSearchValue && !isRefetching;

  if (showEmpty) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <Card className="w-full max-w-md text-center border-dashed">
          <CardContent className="pt-10 pb-10">
            <div className="bg-muted/50 rounded-full w-20 h-20 mx-auto flex items-center justify-center mb-6">
              <Users className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-2">Your roster is empty</h3>
            <p className="text-muted-foreground mb-8 max-w-xs mx-auto">
              Add athletes to start tracking profiles, positions, and account
              status.
            </p>
            <Button
              onClick={() => router.push("/users/players/create")}
              className="gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Register first athlete
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const showNoMatches = athletes.length === 0 && !!debouncedSearchValue;

  return (
    <div className="space-y-6 p-1 md:p-2">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-bold tracking-tight">
              Athlete Roster
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Search athletes, update status, and manage profiles.
          </p>
        </div>

        <Button
          onClick={() => router.push("/users/players/create")}
          className="gap-2"
        >
          <UserPlus className="h-4 w-4" /> Register athlete
        </Button>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or athlete ID…"
                className="pl-10 pr-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {(isSearching || isRefetching) && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>

            {debouncedSearchValue ? (
              <Button
                variant="outline"
                onClick={() => setSearchQuery("")}
                className="gap-2"
              >
                <XCircle className="h-4 w-4" />
                Clear
              </Button>
            ) : null}
          </div>

          {debouncedSearchValue ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Showing results for{" "}
              <span className="font-medium">{debouncedSearchValue}</span>
            </p>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              Tip: search works by name and athlete ID.
            </p>
          )}
        </CardHeader>

        <CardContent className="pt-4">
          {/* Empty search state */}
          {showNoMatches ? (
            <div className="rounded-lg border border-dashed p-10 text-center">
              <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full border bg-muted/40">
                <XCircle className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-semibold">No athletes matched your search</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try a different name or ID.
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSearchQuery("")}
                  className="gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  Clear search
                </Button>
                <Button
                  onClick={() => router.push("/users/players/create")}
                  className="gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  Register athlete
                </Button>
              </div>
            </div>
          ) : isMobile ? (
            /* Mobile cards */
            <div className="grid gap-3">
              {athletes.map((athlete) => {
                const normalized = normalizeStatus(athlete.status);
                const statusConfig =
                  statusOptions.find((s) => s.value === normalized) ||
                  statusOptions[0];
                const StatusIcon = statusConfig.Icon;

                return (
                  <Card key={athlete.id} className="overflow-hidden">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <ProfileImage
                            name={fullName(athlete)}
                            size={44}
                            url={athlete.profilePIcture || ""}
                            className="border shadow-sm"
                          />

                          <div className="min-w-0">
                            <p className="font-semibold leading-tight truncate">
                              {fullName(athlete)}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {athlete.email || "No email provided"}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {athlete.positions?.length ? (
                                athlete.positions
                                  .slice(0, 3)
                                  .map((pos, idx) => (
                                    <Badge
                                      key={`${athlete.id}-${pos}-${idx}`}
                                      variant="secondary"
                                      className="text-[10px] font-normal"
                                    >
                                      {pos}
                                    </Badge>
                                  ))
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  No positions
                                </span>
                              )}
                              {athlete.positions?.length > 3 ? (
                                <Badge
                                  variant="outline"
                                  className="text-[10px]"
                                >
                                  +{athlete.positions.length - 3}
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>

                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(
                                  `/users/players/user-profile/${athlete.athleteId}`,
                                )
                              }
                              className="gap-2"
                            >
                              <Eye className="h-4 w-4" /> View profile
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() =>
                                router.push(
                                  `/users/players/edit/${athlete.athleteId}`,
                                )
                              }
                              className="gap-2"
                            >
                              <PenIcon className="h-4 w-4" /> Edit
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuLabel className="text-xs">
                              Status
                            </DropdownMenuLabel>

                            {statusOptions.map((option) => (
                              <DropdownMenuItem
                                key={option.value}
                                onClick={() =>
                                  handleChangeAthleteStatus({
                                    athleteId: athlete.athleteId,
                                    status: option.value,
                                  })
                                }
                                className="gap-2 text-xs"
                              >
                                <option.Icon
                                  className={cn(
                                    "h-4 w-4",
                                    option.color.split(" ")[0],
                                  )}
                                />
                                {option.label}
                              </DropdownMenuItem>
                            ))}

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              className="text-red-600 focus:bg-red-50 gap-2"
                              disabled={deletingId === athlete.athleteId}
                              onClick={() =>
                                handleDeleteAthlete(athlete.athleteId)
                              }
                            >
                              {deletingId === athlete.athleteId ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2Icon className="h-4 w-4" />
                              )}
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between gap-3">
                        <code className="bg-muted px-2 py-1 rounded text-[11px] font-mono text-muted-foreground">
                          {athlete.athleteId}
                        </code>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className={cn(
                                "h-8 gap-2 text-xs font-medium",
                                statusConfig.color,
                              )}
                            >
                              <StatusIcon className="h-4 w-4" />
                              {statusConfig.label}
                              <ChevronDown className="h-3 w-3 opacity-60" />
                            </Button>
                          </DropdownMenuTrigger>

                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel className="text-xs">
                              Change status
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {statusOptions.map((option) => (
                              <DropdownMenuItem
                                key={option.value}
                                onClick={() =>
                                  handleChangeAthleteStatus({
                                    athleteId: athlete.athleteId,
                                    status: option.value,
                                  })
                                }
                                className="gap-2 text-xs"
                              >
                                <option.Icon
                                  className={cn(
                                    "h-4 w-4",
                                    option.color.split(" ")[0],
                                  )}
                                />
                                {option.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() =>
                            router.push(
                              `/users/players/user-profile/${athlete.athleteId}`,
                            )
                          }
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          className="gap-2"
                          onClick={() =>
                            router.push(
                              `/users/players/edit/${athlete.athleteId}`,
                            )
                          }
                        >
                          <PenIcon className="h-4 w-4" />
                          Edit
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            /* Desktop table */
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-12.5">#</TableHead>
                    <TableHead className="w-20">Photo</TableHead>
                    <TableHead>Athlete</TableHead>
                    <TableHead>Positions</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {athletes.map((athlete, index) => {
                    const normalized = normalizeStatus(athlete.status);
                    const statusConfig =
                      statusOptions.find((s) => s.value === normalized) ||
                      statusOptions[0];
                    const StatusIcon = statusConfig.Icon;

                    return (
                      <TableRow
                        key={athlete.id}
                        className="group hover:bg-muted/30 transition-colors"
                      >
                        <TableCell className="text-muted-foreground font-medium text-xs">
                          {index + 1}
                        </TableCell>

                        <TableCell>
                          <ProfileImage
                            name={fullName(athlete)}
                            size={40}
                            url={athlete.profilePIcture || ""}
                            className="border shadow-sm"
                          />
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold text-sm">
                              {fullName(athlete)}
                            </span>
                            <span className="text-xs text-muted-foreground truncate max-w-60">
                              {athlete.email || "No email provided"}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {athlete.positions?.length ? (
                              athlete.positions.map((pos, idx) => (
                                <Badge
                                  key={`${athlete.id}-${pos}-${idx}`}
                                  variant="secondary"
                                  className="font-normal text-[10px] px-1.5"
                                >
                                  {pos}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className={cn(
                                  "h-7 gap-1 border text-[11px] font-medium",
                                  statusConfig.color,
                                )}
                              >
                                <StatusIcon className="w-3.5 h-3.5" />
                                {statusConfig.label}
                                <ChevronDown className="w-3 h-3 opacity-50 ml-1" />
                              </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="start">
                              <DropdownMenuLabel className="text-xs">
                                Change status
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {statusOptions.map((option) => (
                                <DropdownMenuItem
                                  key={option.value}
                                  onClick={() =>
                                    handleChangeAthleteStatus({
                                      athleteId: athlete.athleteId,
                                      status: option.value,
                                    })
                                  }
                                  className="gap-2 text-xs"
                                >
                                  <option.Icon
                                    className={cn(
                                      "w-4 h-4",
                                      option.color.split(" ")[0],
                                    )}
                                  />
                                  <span>{option.label}</span>
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>

                        <TableCell>
                          <code className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono text-muted-foreground">
                            {athlete.athleteId}
                          </code>
                        </TableCell>

                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(
                                    `/users/players/user-profile/${athlete.athleteId}`,
                                  )
                                }
                                className="gap-2"
                              >
                                <Eye className="h-4 w-4" /> View profile
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(
                                    `/users/players/edit/${athlete.athleteId}`,
                                  )
                                }
                                className="gap-2"
                              >
                                <PenIcon className="h-4 w-4" /> Edit
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                className="text-red-600 focus:bg-red-50 gap-2"
                                disabled={deletingId === athlete.athleteId}
                                onClick={() =>
                                  handleDeleteAthlete(athlete.athleteId)
                                }
                              >
                                {deletingId === athlete.athleteId ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2Icon className="h-4 w-4" />
                                )}
                                Delete
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

          {/* Infinite loader */}
          {athletes.length > 0 && (
            <div
              ref={ref}
              className="h-20 w-full flex justify-center items-center"
            >
              {isFetchingNextPage ? (
                <div className="flex items-center gap-2 text-muted-foreground font-medium">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Loading more athletes…</span>
                </div>
              ) : !hasNextPage && debouncedSearchValue ? (
                <p className="text-muted-foreground text-sm italic">
                  Showing all results for{" "}
                  <span className="font-medium">{debouncedSearchValue}</span>
                </p>
              ) : !hasNextPage ? (
                <p className="text-muted-foreground text-sm italic">
                  You&apos;ve reached the end.
                </p>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AthletesData;
