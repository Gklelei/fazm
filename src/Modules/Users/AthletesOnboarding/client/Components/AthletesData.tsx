"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { UseGetAllAthletes } from "../../Api/FetchAllAthletes";
import { DeleteAthlete } from "../../Server/DeleteAthlete";
import { UpdateAthleteStatus } from "../../Server/EditAthleteStatus";

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
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";

import { PageLoader } from "@/utils/Alerts/PageLoader";
import ProfileImage from "@/utils/profile/ProfileAvatar";
import { Sweetalert } from "@/utils/Alerts/Sweetalert";

import {
  Eye,
  Filter,
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
} from "lucide-react";
import { cn } from "@/lib/utils"; // Assuming you have a cn utility, if not use template literals

// --- Constants & Helpers ---

const positions = ["Forward", "Midfielder", "Defender", "Goalkeeper"] as const;

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

// --- Main Component ---

const AthletesData = () => {
  const { data, isError, isLoading } = UseGetAllAthletes();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [deletingId, setDeletingId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState<string>("All Positions");

  // --- Handlers ---

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
    // Optimistic UI could go here, but we'll wait for server response
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

  // --- Filter Logic ---

  const filteredData = useMemo(() => {
    if (!data) return [];
    const q = searchQuery.trim().toLowerCase();

    return data.filter((athlete) => {
      const fullName = `${athlete.firstName ?? ""} ${athlete.lastName ?? ""}`
        .trim()
        .toLowerCase();
      const athleteId = (athlete.athleteId ?? "").toLowerCase();
      const pos = (athlete.position ?? athlete.positions ?? "")
        .toString()
        .toLowerCase();

      const matchesSearch =
        !q || fullName.includes(q) || athleteId.includes(q) || pos.includes(q);
      const matchesPosition =
        positionFilter === "All Positions" ||
        (athlete.position ?? athlete.positions) === positionFilter;

      return matchesSearch && matchesPosition;
    });
  }, [data, searchQuery, positionFilter]);

  if (isLoading) return <PageLoader />;
  if (isError)
    return (
      <div className="p-8 text-center text-red-500">
        Error loading athletes data.
      </div>
    );

  // --- Empty State (No Data at all) ---
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-125">
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
      {/* Page Header */}
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
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            {/* Search Input */}
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, ID, or position..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto border-dashed"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  {positionFilter === "All Positions"
                    ? "Filter by Position"
                    : positionFilter}
                  {positionFilter !== "All Positions" && (
                    <Badge
                      variant="secondary"
                      className="ml-2 px-1 h-5 rounded-sm"
                    >
                      1
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Filter Position</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={positionFilter === "All Positions"}
                  onCheckedChange={() => setPositionFilter("All Positions")}
                >
                  All Positions
                </DropdownMenuCheckboxItem>
                {positions.map((pos) => (
                  <DropdownMenuCheckboxItem
                    key={pos}
                    checked={positionFilter === pos}
                    onCheckedChange={() => setPositionFilter(pos)}
                  >
                    {pos}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
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
                {filteredData.length > 0 ? (
                  filteredData.map((athlete, index) => {
                    const normalizedStatus = normalizeStatus(athlete.status);
                    const statusConfig =
                      statusOptions.find((s) => s.value === normalizedStatus) ||
                      statusOptions[0];

                    const StatusIcon = statusConfig.Icon;

                    return (
                      <TableRow key={athlete.id} className="group">
                        <TableCell className="text-muted-foreground font-medium">
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
                            <span className="text-xs text-muted-foreground">
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
                                className="font-normal"
                              >
                                {pos}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>

                        {/* Status Dropdown Trigger */}
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className={cn(
                                  "h-7 gap-1 border text-xs font-medium transition-colors focus:ring-0",
                                  statusConfig.color,
                                )}
                              >
                                <StatusIcon className="w-3.5 h-3.5" />
                                {statusConfig.label}
                                <ChevronDown className="w-3 h-3 opacity-50 ml-1" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuLabel>
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
                                  className="gap-2"
                                >
                                  <option.Icon
                                    className={cn(
                                      "w-4 h-4",
                                      option.color.split(" ")[0],
                                    )}
                                  />
                                  <span>{option.label}</span>
                                  {normalizedStatus === option.value && (
                                    <CheckCircle2 className="w-3 h-3 ml-auto opacity-50" />
                                  )}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>

                        <TableCell>
                          <code className="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono text-muted-foreground">
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
                                <MoreHorizontal className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
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
                                Details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600 focus:bg-red-50"
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
                                Delete Athlete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <p>No athletes found matching {searchQuery}</p>
                        <Button
                          variant="link"
                          onClick={() => {
                            setSearchQuery("");
                            setPositionFilter("All Positions");
                          }}
                          className="h-auto p-0 text-primary"
                        >
                          Clear filters
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AthletesData;
