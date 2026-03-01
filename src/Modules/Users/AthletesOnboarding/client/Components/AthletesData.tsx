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
import { statusData } from "../../validation/data";

// --- Types & Constants ---

type AthleteRow = {
  id: string;
  athleteId: string;
  firstName: string;
  middleName: string;
  lastName: string;
  age?: number;
  email?: string | null;
  profilePIcture?: string | null; // Note: kept strictly as per your API response
  positions: string[];
  status: string;
};

const statusOptions = [
  {
    value: "PENDING",
    label: "Pending",
    Icon: Clock4,
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

// --- Helper Functions ---

function normalizeStatus(raw?: string) {
  const s = (raw ?? "").trim().toUpperCase();
  if (s === "DEACTIVATED" || s === "SUSPEND") return "SUSPENDED";
  return s || "PENDING";
}

function fullName(a: AthleteRow) {
  return [a.firstName, a.middleName, a.lastName].filter(Boolean).join(" ");
}

const ageText = (age?: number) => {
  if (!age) return "—";
  return age === 1 ? "1 year" : `${age} years`;
};

// --- Sub-Components ---

// 1. Reusable Action Menu (View, Edit, Delete, Status Change)
const AthleteActionMenu = ({
  athlete,
  onDelete,
  onStatusChange,
  isDeleting,
}: {
  athlete: AthleteRow;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  isDeleting: boolean;
}) => {
  const router = useRouter();

  return (
    <DropdownMenuContent align="end" className="w-48">
      <DropdownMenuItem
        onClick={() =>
          router.push(`/users/players/user-profile/${athlete.athleteId}`)
        }
        className="gap-2 cursor-pointer"
      >
        <Eye className="h-4 w-4" /> View profile
      </DropdownMenuItem>

      <DropdownMenuItem
        onClick={() => router.push(`/users/players/edit/${athlete.athleteId}`)}
        className="gap-2 cursor-pointer"
      >
        <PenIcon className="h-4 w-4" /> Edit details
      </DropdownMenuItem>

      <DropdownMenuSeparator />
      <DropdownMenuLabel className="text-xs text-muted-foreground">
        Update Status
      </DropdownMenuLabel>

      {statusOptions.map((option) => (
        <DropdownMenuItem
          key={option.value}
          onClick={() => onStatusChange(athlete.athleteId, option.value)}
          className="gap-2 text-xs cursor-pointer"
        >
          <option.Icon className={cn("h-4 w-4", option.color.split(" ")[0])} />
          {option.label}
        </DropdownMenuItem>
      ))}

      <DropdownMenuSeparator />

      <DropdownMenuItem
        className="text-red-600 focus:bg-red-50 gap-2 cursor-pointer"
        disabled={isDeleting}
        onClick={() => onDelete(athlete.athleteId)}
      >
        {isDeleting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2Icon className="h-4 w-4" />
        )}
        Delete Athlete
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
};

// 2. Reusable Status Badge/Button
const StatusBadge = ({
  status,
  athleteId,
  onChange,
}: {
  status: string;
  athleteId: string;
  onChange: (id: string, s: string) => void;
}) => {
  const normalized = normalizeStatus(status);
  const config =
    statusOptions.find((s) => s.value === normalized) || statusOptions[0];
  const Icon = config.Icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-7 gap-1.5 border text-[11px] font-medium transition-colors",
            config.color,
          )}
        >
          <Icon className="w-3.5 h-3.5" />
          {config.label}
          <ChevronDown className="w-3 h-3 opacity-50 ml-0.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel className="text-xs">Set Status</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {statusOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => onChange(athleteId, option.value)}
            className="gap-2 text-xs cursor-pointer"
          >
            <option.Icon
              className={cn("w-4 h-4", option.color.split(" ")[0])}
            />
            <span>{option.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// 3. Mobile Card Component
const AthleteMobileCard = ({
  athlete,
  deletingId,
  onDelete,
  onStatusChange,
}: {
  athlete: AthleteRow;
  deletingId: string;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, s: string) => void;
}) => {
  const router = useRouter();

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-4">
        {/* Top Row: Info & Actions */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <ProfileImage
              name={fullName(athlete)}
              size={48}
              url={athlete.profilePIcture || ""}
              className="border shadow-sm shrink-0"
            />
            <div className="min-w-0 space-y-1">
              <p className="font-semibold leading-tight truncate">
                {fullName(athlete)}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{ageText(athlete.age)}</span>
                <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                <span className="truncate max-w-[120px]">
                  {athlete.email || "No email"}
                </span>
              </div>

              {/* Positions Badges */}
              <div className="flex flex-wrap gap-1 mt-1.5">
                {athlete.positions?.length ? (
                  athlete.positions.slice(0, 3).map((pos, idx) => (
                    <Badge
                      key={`${athlete.id}-${pos}-${idx}`}
                      variant="secondary"
                      className="text-[10px] h-5 px-1.5 font-normal"
                    >
                      {pos}
                    </Badge>
                  ))
                ) : (
                  <span className="text-[10px] text-muted-foreground">
                    No positions
                  </span>
                )}
                {athlete.positions?.length > 3 && (
                  <Badge variant="outline" className="text-[10px] h-5">
                    +{athlete.positions.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <AthleteActionMenu
              athlete={athlete}
              onDelete={onDelete}
              onStatusChange={onStatusChange}
              isDeleting={deletingId === athlete.athleteId}
            />
          </DropdownMenu>
        </div>

        <Separator />

        {/* Middle Row: ID & Status */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">
              Athlete ID
            </span>
            <code className="bg-muted/50 px-2 py-1 rounded text-xs font-mono">
              {athlete.athleteId}
            </code>
          </div>

          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">
              Status
            </span>
            <StatusBadge
              status={athlete.status}
              athleteId={athlete.athleteId}
              onChange={onStatusChange}
            />
          </div>
        </div>

        {/* Bottom Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 h-9"
            onClick={() =>
              router.push(`/users/players/user-profile/${athlete.athleteId}`)
            }
          >
            <Eye className="h-3.5 w-3.5" />
            View
          </Button>
          <Button
            size="sm"
            className="gap-2 h-9"
            onClick={() =>
              router.push(`/users/players/edit/${athlete.athleteId}`)
            }
          >
            <PenIcon className="h-3.5 w-3.5" />
            Edit
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// 4. Desktop Row Component
const AthleteTableRow = ({
  athlete,
  index,
  deletingId,
  onDelete,
  onStatusChange,
}: {
  athlete: AthleteRow;
  index: number;
  deletingId: string;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, s: string) => void;
}) => {
  return (
    <TableRow className="group hover:bg-muted/30 transition-colors">
      <TableCell className="text-muted-foreground font-medium text-xs w-12">
        {index + 1}
      </TableCell>

      <TableCell className="w-16">
        <ProfileImage
          name={fullName(athlete)}
          size={38}
          url={athlete.profilePIcture || ""}
          className="border shadow-sm"
        />
      </TableCell>

      <TableCell>
        <div className="flex flex-col">
          <span className="font-semibold text-sm text-foreground">
            {fullName(athlete)}
          </span>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{ageText(athlete.age)}</span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span className="truncate max-w-[180px]">
              {athlete.email || "No email"}
            </span>
          </div>
        </div>
      </TableCell>

      <TableCell>
        <div className="flex flex-wrap gap-1.5">
          {athlete.positions?.length ? (
            athlete.positions.slice(0, 4).map((pos, idx) => (
              <Badge
                key={`${athlete.id}-${pos}-${idx}`}
                variant="secondary"
                className="font-normal text-[10px] px-1.5 h-5"
              >
                {pos}
              </Badge>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
          {athlete.positions?.length > 4 && (
            <span className="text-[10px] text-muted-foreground self-center">
              +{athlete.positions.length - 4}
            </span>
          )}
        </div>
      </TableCell>

      <TableCell>
        <StatusBadge
          status={athlete.status}
          athleteId={athlete.athleteId}
          onChange={onStatusChange}
        />
      </TableCell>

      <TableCell>
        <code className="bg-muted/50 px-1.5 py-0.5 rounded text-[10px] font-mono text-muted-foreground">
          {athlete.athleteId}
        </code>
      </TableCell>

      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <AthleteActionMenu
            athlete={athlete}
            onDelete={onDelete}
            onStatusChange={onStatusChange}
            isDeleting={deletingId === athlete.athleteId}
          />
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
};

// --- Main Component ---

const AthletesData = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const [deletingId, setDeletingId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchValue = useDebounce(searchQuery, 800);

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

  const handleChangeAthleteStatus = async (
    athleteId: string,
    rawStatus: string,
  ) => {
    // Cast string to union type expected by update function
    const status = rawStatus as "PENDING" | "ACTIVE" | "SUSPENDED";
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
      <div className="p-8 text-center rounded-lg border bg-background">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full border bg-muted/40">
          <XCircle className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="font-semibold">Couldn’t load athletes</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Check your connection and try again.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Button variant="outline" onClick={() => refetch()} className="gap-2">
            <RefreshCcw className="h-4 w-4" /> Retry
          </Button>
          <Button
            onClick={() => router.push("/users/players/create")}
            className="gap-2"
          >
            <UserPlus className="h-4 w-4" /> Register athlete
          </Button>
        </div>
      </div>
    );
  }

  const showEmpty =
    athletes.length === 0 && !debouncedSearchValue && !isRefetching;

  if (showEmpty) {
    return (
      <div className="flex items-center justify-center py-20">
        <Card className="w-full max-w-md text-center border-dashed shadow-none">
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
              <UserPlus className="h-4 w-4" /> Register first athlete
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
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
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
          className="gap-2 shadow-sm"
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
              {/* Optional: Filter by status dropdown can go here if needed later */}
            </div>

            {debouncedSearchValue ? (
              <Button
                variant="ghost"
                onClick={() => setSearchQuery("")}
                className="gap-2 text-muted-foreground hover:text-foreground"
              >
                <XCircle className="h-4 w-4" /> Clear filters
              </Button>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            {debouncedSearchValue && (
              <p className="mt-2 text-xs text-muted-foreground">
                Showing results for{" "}
                <span className="font-medium text-foreground">
                  {debouncedSearchValue}
                </span>
              </p>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-4 px-2 md:px-6">
          {showNoMatches ? (
            <div className="rounded-lg border border-dashed p-12 text-center">
              <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full border bg-muted/40">
                <XCircle className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-semibold text-lg">No athletes matched</p>
              <p className="mt-1 text-sm text-muted-foreground">
                We couldn&apos;t find anyone matching {debouncedSearchValue}
              </p>
              <Button
                variant="outline"
                onClick={() => setSearchQuery("")}
                className="mt-6 gap-2"
              >
                Clear search
              </Button>
            </div>
          ) : isMobile ? (
            <div className="grid gap-3">
              {athletes.map((athlete) => (
                <AthleteMobileCard
                  key={athlete.id}
                  athlete={athlete}
                  deletingId={deletingId}
                  onDelete={handleDeleteAthlete}
                  onStatusChange={handleChangeAthleteStatus}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-12 text-xs font-semibold">
                      #
                    </TableHead>
                    <TableHead className="w-[80px]">Photo</TableHead>
                    <TableHead>Athlete Details</TableHead>
                    <TableHead>Positions</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {athletes.map((athlete, index) => (
                    <AthleteTableRow
                      key={athlete.id}
                      index={index}
                      athlete={athlete}
                      deletingId={deletingId}
                      onDelete={handleDeleteAthlete}
                      onStatusChange={handleChangeAthleteStatus}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Infinite loader */}
          {athletes.length > 0 && (
            <div
              ref={ref}
              className="h-24 w-full flex justify-center items-center"
            >
              {isFetchingNextPage ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium bg-muted/30 px-4 py-2 rounded-full">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading more athletes…</span>
                </div>
              ) : !hasNextPage && debouncedSearchValue ? (
                <p className="text-muted-foreground text-xs">
                  End of search results
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
