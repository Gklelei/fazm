"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GetStaffType } from "../types";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ProfileAvatar from "@/utils/profile/ProfileAvatar";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Eye,
  Filter,
  Loader2,
  Loader2Icon,
  PenBox,
  Search,
  Trash2Icon,
  TriangleAlertIcon,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AdminDeleteStaff } from "../Server/EditStaff";
import { Sweetalert } from "@/utils/Alerts/Sweetalert";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useDebounce } from "@/utils/Debounce";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import { PageLoader } from "@/utils/Alerts/PageLoader";

interface Props {
  initialData: {
    pages: Array<{ items: GetStaffType[]; nextCursor: number | null }>;
    pageParams: number[];
  };
}

const ROLES = ["COACH", "ADMIN", "DOCTOR"];

const ViewAllStaff = ({ initialData }: Props) => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showRoleFilter, setShowRoleFilter] = useState(false);
  const debounceSearch = useDebounce(searchQuery, 1000);
  const { ref, inView } = useInView();

  const { data, hasNextPage, isFetchingNextPage, isLoading, fetchNextPage } =
    useInfiniteQuery({
      queryKey: ["staff-list", debounceSearch],
      initialPageParam: 1,
      initialData: debounceSearch === "" ? initialData : undefined,
      queryFn: async ({ pageParam = 1 }) => {
        const res = await fetch(
          `/users/staff?page=${pageParam}&search=${debounceSearch}&role=${roleFilter}`,
        );
        return res.json();
      },
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    });

  const allStaff = useMemo(() => {
    return data?.pages.flatMap((staff) => staff.items) || [];
  }, [data?.pages]);

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, inView]);

  const handleUserDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const result = await AdminDeleteStaff({ staffId: id });

      if (result.success) {
        Sweetalert({
          icon: "success",
          text: result.message,
          title: "Success!",
        });
      } else {
        Sweetalert({
          icon: "error",
          text: result.message,
          title: "Error",
        });
      }
    } catch (error) {
      console.log(error);
      Sweetalert({
        icon: "error",
        text: "An unexpected error occurred",
        title: "Error",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setRoleFilter("");
  };

  if (isLoading && !isFetchingNextPage) return <PageLoader />;

  const activeFiltersCount = (searchQuery ? 1 : 0) + (roleFilter ? 1 : 0);

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <CardTitle className="text-2xl font-bold">
              All System Users
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Manage and view all staff members in the system
            </p>
          </div>

          <Button
            onClick={() => router.push("/users/staff/create")}
            className="w-full lg:w-auto"
          >
            Create New User
          </Button>
        </div>

        {/* Filters Section */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by name, email, phone, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <DropdownMenu
              open={showRoleFilter}
              onOpenChange={setShowRoleFilter}
            >
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Role
                  {roleFilter && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                      {roleFilter}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5 text-sm font-semibold">
                  Filter by Role
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setRoleFilter("")}
                  className={!roleFilter ? "bg-muted" : ""}
                >
                  All Roles
                </DropdownMenuItem>
                {ROLES.map((role) => (
                  <DropdownMenuItem
                    key={role}
                    onClick={() => setRoleFilter(role)}
                    className={roleFilter === role ? "bg-muted" : ""}
                  >
                    {role}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                onClick={clearAllFilters}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Clear ({activeFiltersCount})
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2">
          <span>Total: {allStaff.length} users</span>
          {activeFiltersCount > 0 && (
            <span>Filtered: {allStaff.length} users</span>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {allStaff.length === 0 ? (
          <EmptyData />
        ) : allStaff.length === 0 ? (
          <NoResults />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Staff Member</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="w-40">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allStaff.map((staff, index) => (
                  <TableRow key={staff.staffId} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <ProfileAvatar
                          name={staff.fullNames}
                          url={staff.user.image || ""}
                          className="h-10 w-10"
                        />
                        <div className="flex flex-col">
                          <span className="font-medium">{staff.fullNames}</span>
                          <span className="text-sm text-muted-foreground">
                            ID: {staff.staffId}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{staff.user.email}</span>
                        <span className="text-sm text-muted-foreground">
                          {staff.phoneNumber === "null" || !staff.phoneNumber
                            ? "No phone"
                            : staff.phoneNumber}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          staff.user.role === "ADMIN"
                            ? "default"
                            : staff.user.role === "DOCTOR"
                              ? "destructive"
                              : "secondary"
                        }
                        className="capitalize"
                      >
                        {staff.user.role.toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  router.push(
                                    `/users/staff/${staff.staffId}/view`,
                                  )
                                }
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View Details</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  router.push(`/users/staff/${staff.staffId}`)
                                }
                              >
                                <PenBox className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit User</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <AlertDialog>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    disabled={deletingId === staff.staffId}
                                  >
                                    {deletingId === staff.staffId ? (
                                      <Loader2Icon className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2Icon className="h-4 w-4" />
                                    )}
                                  </Button>
                                </AlertDialogTrigger>
                              </TooltipTrigger>
                              <TooltipContent>Delete User</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will
                                permanently delete{" "}
                                <span className="font-semibold">
                                  {staff.fullNames}
                                </span>{" "}
                                and remove their data from our servers.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleUserDelete(staff.staffId)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete User
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {allStaff.length > 0 && (
              <div
                ref={ref}
                className="h-20 w-full flex justify-center items-center"
              >
                {isFetchingNextPage ? (
                  <div className="flex items-center gap-2 text-primary font-medium">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Loading more athletes...</span>
                  </div>
                ) : !hasNextPage && debounceSearch ? (
                  <p className="text-muted-foreground text-sm italic">
                    Showing all results for {debounceSearch}
                  </p>
                ) : !hasNextPage ? (
                  <p className="text-muted-foreground text-sm italic">
                    You&apos;ve reached the end of the staff list.
                  </p>
                ) : null}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

function EmptyData() {
  const router = useRouter();
  return (
    <div className="py-12">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon" className="bg-muted">
            <TriangleAlertIcon className="h-8 w-8" />
          </EmptyMedia>
          <EmptyTitle>No Users Found</EmptyTitle>
          <EmptyDescription>
            Start by creating your first staff member to manage the system.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={() => router.push("/users/staff/create")}>
            Create First User
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}

function NoResults() {
  return (
    <div className="py-12 text-center">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon" className="bg-muted">
            <Search className="h-8 w-8" />
          </EmptyMedia>
          <EmptyTitle>No Matching Users</EmptyTitle>
          <EmptyDescription>
            Try adjusting your search or filter to find what you&apos;re looking
            for.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Clear Filters
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}

export default ViewAllStaff;
