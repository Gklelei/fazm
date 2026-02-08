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
} from "lucide-react";

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

function normalizeStatus(raw?: string) {
  const s = (raw ?? "").trim().toUpperCase();
  if (s === "DEACTIVATED" || s === "SUSPEND") return "SUSPENDED";
  return s || "PENDING";
}

const AthletesData = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [deletingId, setDeletingId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  const debouncedSearchValue = useDebounce(searchQuery, 1000);

  const {
    data,
    isError,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = UseGetAllAthletes({
    search: debouncedSearchValue,
  });

  const { ref, inView } = useInView();

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const athletes = useMemo(() => {
    return data?.pages.flatMap((page) => page.allAthletes) || [];
  }, [data?.pages]);

  async function handleDeleteAthlete(id: string) {
    setDeletingId(id);
    const result = await DeleteAthlete(id);

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
    id,
    status,
  }: {
    id: string;
    status: "PENDING" | "ACTIVE" | "SUSPENDED";
  }) => {
    const result = await UpdateAthleteStatus({ athleteId: id, status });

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
      <div className="p-8 text-center text-red-500 bg-red-50 rounded-lg border border-red-100">
        <p className="font-semibold">Error loading athletes data.</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          Retry Connection
        </Button>
      </div>
    );
  }

  if (athletes.length === 0 && !debouncedSearchValue) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <Card className="w-full max-w-md text-center border-dashed">
          <CardContent className="pt-10 pb-10">
            <div className="bg-muted/50 rounded-full w-20 h-20 mx-auto flex items-center justify-center mb-6">
              <UserPlus className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-2">No Athletes Yet</h3>
            <p className="text-muted-foreground mb-8 max-w-xs mx-auto">
              Get started by registering the first athlete to your roster.
            </p>
            <Button onClick={() => router.push("/users/players/create")}>
              <UserPlus className="h-4 w-4 mr-2" />
              Register First Athlete
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-1 md:p-2">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Athlete Roster</h1>
          <p className="text-muted-foreground">
            Manage your team, track statuses, and update profiles.
          </p>
        </div>
        <Button onClick={() => router.push("/users/players/create")}>
          <UserPlus className="h-4 w-4 mr-2" /> Register Athlete
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b mb-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, ID, or position..."
                className="pl-10 pr-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery !== debouncedSearchValue && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-12.5">#</TableHead>
                  <TableHead className="w-20">Photo</TableHead>
                  <TableHead>Athlete Info</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {athletes.length > 0 ? (
                  athletes.map((athlete, index) => {
                    const normalizedStatus = normalizeStatus(athlete.status);
                    const statusConfig =
                      statusOptions.find((s) => s.value === normalizedStatus) ||
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
                            name={`${athlete.firstName} ${athlete.lastName}`}
                            size={40}
                            url={athlete.profilePIcture || ""}
                            className="border-2 border-white shadow-sm"
                          />
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold text-sm">
                              {athlete.firstName} {athlete.lastName}
                            </span>
                            <span className="text-xs text-muted-foreground truncate max-w-37.5">
                              {athlete.email || "No email provided"}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {athlete.positions.map((pos, idx) => (
                              <Badge
                                key={idx}
                                variant="secondary"
                                className="font-normal text-[10px] px-1.5"
                              >
                                {pos}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>

                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className={cn(
                                  "h-7 gap-1 border text-[11px] font-medium transition-colors focus:ring-0",
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
                                Change Status
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {statusOptions.map((option) => (
                                <DropdownMenuItem
                                  key={option.value}
                                  onClick={() =>
                                    handleChangeAthleteStatus({
                                      id: athlete.athleteId,
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
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(
                                    `/users/players/user-profile/${athlete.athleteId}`,
                                  )
                                }
                              >
                                <Eye className="mr-2 h-4 w-4" /> View Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(
                                    `/users/players/edit/${athlete.athleteId}`,
                                  )
                                }
                              >
                                <PenIcon className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600 focus:bg-red-50"
                                disabled={deletingId === athlete.athleteId}
                                onClick={() =>
                                  handleDeleteAthlete(athlete.athleteId)
                                }
                              >
                                {deletingId === athlete.athleteId ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2Icon className="mr-2 h-4 w-4" />
                                )}
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  // 3. Search Results Empty State (Row inside the table)
                  <TableRow>
                    <TableCell colSpan={7} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="bg-muted p-4 rounded-full">
                          <XCircle className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                          <p className="font-semibold text-lg">
                            No matches found
                          </p>
                          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                            We couldn&apos;t find any athletes matching
                            {debouncedSearchValue}. Try checking your spelling
                            or using different keywords.
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSearchQuery("")}
                          className="mt-2"
                        >
                          Clear Search and Show All
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Loading / End of List Indicator */}
          {athletes.length > 0 && (
            <div
              ref={ref}
              className="h-20 w-full flex justify-center items-center"
            >
              {isFetchingNextPage ? (
                <div className="flex items-center gap-2 text-primary font-medium">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Loading more athletes...</span>
                </div>
              ) : !hasNextPage && debouncedSearchValue ? (
                <p className="text-muted-foreground text-sm italic">
                  Showing all results for {debouncedSearchValue}
                </p>
              ) : !hasNextPage ? (
                <p className="text-muted-foreground text-sm italic">
                  You&apos;ve reached the end of the roster.
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
