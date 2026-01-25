"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { UseGetAllAthletes } from "../../Api/FetchAllAthletes";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Eye,
  Filter,
  Loader2,
  PenIcon,
  Search,
  Trash2Icon,
  UserPlus,
} from "lucide-react";
import { PageLoader } from "@/utils/Alerts/PageLoader";
import ProfileImage from "@/utils/profile/ProfileAvatar";
import { DeleteAthlete } from "../../Server/DeleteAthlete";
import { useQueryClient } from "@tanstack/react-query";
import { Sweetalert } from "@/utils/Alerts/Sweetalert";

const positions = ["Forward", "Midfielder", "Defender", "Goalkeeper"];

const AthletesData = () => {
  const { data, isError, isLoading } = UseGetAllAthletes();
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string>("");
  const queryClient = useQueryClient();

  async function handleDeleteAthlete(id: string) {
    setDeletingId(id);
    const result = await DeleteAthlete(id);

    if (result.status === "SUCCESS") {
      Sweetalert({
        icon: "success",
        text: result.successMessage || "Athlete deleted",
        title: "Success!",
      });

      await queryClient.invalidateQueries({
        queryKey: ["all-athletes"],
      });
    } else if (result.status === "ERROR") {
      Sweetalert({
        icon: "error",
        text: result.errorMessage || "Failed to deleted athlete",
        title: "An error has occurred",
      });
    }

    setDeletingId("");
  }

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [positionFilter, setPositionFilter] = useState<string>("All Positions");

  const filteredData = useMemo(() => {
    if (!data) return [];

    return data.filter((athlete) => {
      const fullName = `${athlete.firstName} ${athlete.lastName}`.toLowerCase();
      const matchesSearch =
        fullName.includes(searchQuery.toLowerCase()) ||
        athlete.athleteId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (athlete.position?.toLowerCase().includes(searchQuery.toLowerCase()) ??
          false);

      const matchesPosition =
        positionFilter === "All Positions" ||
        athlete.position === positionFilter;

      return matchesSearch && matchesPosition;
    });
  }, [data, searchQuery, positionFilter]);

  if (isLoading) return <PageLoader />;
  if (isError) return <div>Error loading athletes.</div>;
  if (!data || data.length === 0)
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
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search athletes by name, ID, or position..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="sm:w-auto w-full">
                  <Filter className="h-4 w-4 mr-2" /> Filters
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Filter by Position</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setPositionFilter("All Positions")}
                  className={
                    positionFilter === "All Positions" ? "font-bold" : ""
                  }
                >
                  All Positions
                </DropdownMenuItem>
                {positions.map((pos) => (
                  <DropdownMenuItem
                    key={pos}
                    onClick={() => setPositionFilter(pos)}
                    className={positionFilter === pos ? "font-bold" : ""}
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
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Photo</TableHead>
                  <TableHead>Athlete Details</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Athlete ID</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length > 0 ? (
                  filteredData.map((athlete, index) => (
                    <TableRow key={athlete.id} className="hover:bg-muted/50">
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <ProfileImage
                          name={`${athlete.firstName}${athlete.lastName} `}
                          size={30}
                          url={athlete.profilePIcture || ""}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {athlete.firstName} {athlete.lastName}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {athlete.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {athlete.positions || "Not specified"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                          {athlete.athleteId || "N/A"}
                        </code>
                      </TableCell>
                      <TableCell className="text-right flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            router.push(
                              `/users/players/user-profile/${athlete.athleteId}`
                            )
                          }
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Edit"
                          onClick={() =>
                            router.push(
                              `/users/players/edit/${athlete.athleteId}`
                            )
                          }
                        >
                          <PenIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={deletingId === athlete.athleteId}
                          onClick={() => handleDeleteAthlete(athlete.athleteId)}
                        >
                          {deletingId === athlete.athleteId ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Trash2Icon className="h-4 w-4 mr-2 text-red-600" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-6 text-muted-foreground"
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
