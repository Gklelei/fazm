"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { UseGetAllAthletes } from "../../Api/FetchAllAthletes";
import { DeleteAthlete } from "../../Server/DeleteAthlete";

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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

import {
  Eye,
  Filter,
  Loader2,
  MoreVertical,
  PenIcon,
  Search,
  Trash2Icon,
  UserPlus,
  CheckCircle2,
  Clock4,
  Ban,
} from "lucide-react";
import { UpdateAthleteStatus } from "../../Server/EditAthleteStatus";

const positions = ["Forward", "Midfielder", "Defender", "Goalkeeper"] as const;

const statusOptions = [
  { value: "PENDING", label: "Pending", Icon: Clock4 },
  { value: "ACTIVE", label: "Active", Icon: CheckCircle2 },
  { value: "SUSPENDED", label: "Suspended", Icon: Ban },
] as const;

function normalizeStatus(raw?: string) {
  const s = (raw ?? "").trim().toUpperCase();
  if (s === "DEACTIVATED") return "SUSPENDED";
  if (s === "SUSPEND") return "SUSPENDED";
  return s || "PENDING";
}

const AthletesData = () => {
  const { data, isError, isLoading } = UseGetAllAthletes();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [deletingId, setDeletingId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState<string>("All Positions");

  async function handleDeleteAthlete(id: string) {
    setDeletingId(id);
    const result = await DeleteAthlete(id);

    if (result.status === "SUCCESS") {
      Sweetalert({
        icon: "success",
        text: result.successMessage || "Athlete deleted",
        title: "Success!",
      });

      await queryClient.invalidateQueries({ queryKey: ["all-athletes"] });
    } else {
      Sweetalert({
        icon: "error",
        text: result.errorMessage || "Failed to delete athlete",
        title: "An error has occurred",
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
    setDeletingId(id);
    const result = await UpdateAthleteStatus({ athleteId: id, status });

    if (result.success) {
      await queryClient.invalidateQueries({ queryKey: ["all-athletes"] });
      Sweetalert({
        icon: "success",
        text: result.message,
        title: "Success!",
      });
    } else {
      Sweetalert({
        icon: "error",
        text: result.message,
        title: "An error has occurred",
      });
    }
  };

  const filteredData = useMemo(() => {
    if (!data) return [];

    const q = searchQuery.trim().toLowerCase();

    return data.filter((athlete) => {
      const fullName = `${athlete.firstName ?? ""} ${athlete.lastName ?? ""}`
        .trim()
        .toLowerCase();

      const athleteId = (athlete.athleteId ?? "").toLowerCase();

      // handle both `position` and `positions` since your code uses both
      const pos = (athlete.position ?? athlete.positions ?? "")
        .toString()
        .toLowerCase();

      const matchesSearch =
        !q ||
        fullName.includes(q) ||
        athleteId.includes(q) ||
        (pos ? pos.includes(q) : false);

      const matchesPosition =
        positionFilter === "All Positions" ||
        (athlete.position ?? athlete.positions) === positionFilter;

      return matchesSearch && matchesPosition;
    });
  }, [data, searchQuery, positionFilter]);

  if (isLoading) return <PageLoader />;
  if (isError) return <div>Error loading athletes.</div>;

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Athletes Found</h3>
          <p className="text-muted-foreground mb-6">
            Add your first athlete to get started.
          </p>
          <Button onClick={() => router.push("/users/players/create")}>
            <UserPlus className="h-4 w-4 mr-2" />
            Register First Athlete
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-2xl font-bold">
              Athletes Roster
            </CardTitle>
            <CardDescription>
              Manage and view all registered athletes in your program
            </CardDescription>
          </div>

          <Button
            className="sm:w-auto w-full"
            onClick={() => router.push("/users/players/create")}
          >
            <UserPlus className="h-4 w-4 mr-2" /> Register New Athlete
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Search + Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, ID, or position..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="sm:w-auto w-full">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Filter by Position</DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={() => setPositionFilter("All Positions")}
                  className={
                    positionFilter === "All Positions" ? "font-medium" : ""
                  }
                >
                  All Positions
                </DropdownMenuItem>

                {positions.map((pos) => (
                  <DropdownMenuItem
                    key={pos}
                    onClick={() => setPositionFilter(pos)}
                    className={positionFilter === pos ? "font-medium" : ""}
                  >
                    {pos}
                  </DropdownMenuItem>
                ))}

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={() => {
                    setSearchQuery("");
                    setPositionFilter("All Positions");
                  }}
                >
                  Clear Filters
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Table */}
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-15">#</TableHead>
                  <TableHead className="w-17.5">Photo</TableHead>
                  <TableHead>Athlete</TableHead>
                  <TableHead className="w-40">Position</TableHead>
                  <TableHead className="w-45">Status</TableHead>
                  <TableHead className="w-45">Athlete ID</TableHead>
                  <TableHead className="w-20 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredData.length > 0 ? (
                  filteredData.map((athlete, index: number) => {
                    const normalizedStatus = normalizeStatus(athlete.status);
                    const pos =
                      athlete.position ?? athlete.positions ?? "Not specified";

                    return (
                      <TableRow key={athlete.id} className="hover:bg-muted/40">
                        <TableCell className="text-muted-foreground">
                          {index + 1}
                        </TableCell>

                        <TableCell>
                          <ProfileImage
                            name={`${athlete.firstName ?? ""}${athlete.lastName ?? ""}`}
                            size={34}
                            url={athlete.profilePIcture || ""}
                          />
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-col leading-tight">
                            <span className="font-medium">
                              {athlete.firstName} {athlete.lastName}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {athlete.email || "—"}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant="outline"
                            className="whitespace-nowrap"
                          >
                            {pos}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          {/* Status dropdown - correct structure */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-full justify-between"
                              >
                                <span className="truncate">
                                  {statusOptions.find(
                                    (s) => s.value === normalizedStatus,
                                  )?.label ?? normalizedStatus}
                                </span>
                                <MoreVertical className="h-4 w-4 opacity-70" />
                              </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="start" className="w-52">
                              <DropdownMenuLabel>Status</DropdownMenuLabel>
                              <DropdownMenuSeparator />

                              {statusOptions.map(({ value, label, Icon }) => (
                                <DropdownMenuItem
                                  key={value}
                                  onClick={() => {
                                    handleChangeAthleteStatus({
                                      id: athlete.id,
                                      status: value,
                                    });
                                  }}
                                  className="flex items-center gap-2"
                                >
                                  <Icon className="h-4 w-4" />
                                  <span>{label}</span>

                                  {normalizedStatus === value ? (
                                    <span className="ml-auto text-xs text-muted-foreground">
                                      Current
                                    </span>
                                  ) : null}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>

                        <TableCell>
                          <code className="inline-flex rounded bg-muted px-2 py-1 font-mono text-xs font-semibold">
                            {athlete.athleteId || "N/A"}
                          </code>
                        </TableCell>

                        <TableCell className="text-right">
                          {/* Actions dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem
                                className="flex items-center gap-2"
                                onClick={() =>
                                  router.push(
                                    `/users/players/user-profile/${athlete.athleteId}`,
                                  )
                                }
                              >
                                <Eye className="h-4 w-4" />
                                View
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                className="flex items-center gap-2"
                                onClick={() =>
                                  router.push(
                                    `/users/players/edit/${athlete.athleteId}`,
                                  )
                                }
                              >
                                <PenIcon className="h-4 w-4" />
                                Edit
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                className="flex items-center gap-2"
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
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-10 text-muted-foreground"
                    >
                      No athletes found matching filters.
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
