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
  PenBox,
  Trash2Icon,
  TriangleAlertIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Props {
  data: GetStaffType[];
}

const ROLES = ["COACH", "ADMIN", "DOCTOR"];

const ViewAllStaff = ({ data }: Props) => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  console.log(roleFilter);

  const filteredData = useMemo(() => {
    if (!data) return [];
    const normalizedQuery = searchQuery.toLowerCase().trim();
    return data.filter((i) => {
      const matchesSearch = i.fullNames.toLowerCase().includes(normalizedQuery); // i.role.toLowerCase().includes(normalizedQuery);
      // const matchesRole = roleFilter ? i.role === roleFilter : true;
      return matchesSearch;
    });
  }, [data, searchQuery]);

  return (
    <Card className="space-y-4">
      <CardHeader className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <CardTitle>All System Users</CardTitle>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-start sm:items-center">
          <Button
            type="button"
            onClick={() => router.push("/users/staff/create")}
          >
            Create User
          </Button>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Input
              placeholder="Search by name or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="button" onClick={() => setSearchQuery("")}>
              Clear
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Role Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setRoleFilter("")}>
                  All Roles
                </DropdownMenuItem>
                {ROLES.map((role) => (
                  <DropdownMenuItem
                    key={role}
                    onClick={() => setRoleFilter(role)}
                  >
                    {role}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {data.length === 0 ? (
          <EmptyData />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Staff</TableHead>
                <TableHead>Phone number</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((staff, i) => (
                <TableRow key={staff.staffId}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell className="flex items-center gap-2">
                    <ProfileAvatar
                      name={staff.fullNames}
                      url={staff.user.image || ""}
                    />
                    <div className="flex flex-col">
                      <span>{staff.fullNames}</span>
                      <small className="text-muted-foreground">
                        {staff.user.email}
                      </small>
                    </div>
                  </TableCell>
                  <TableCell>
                    {staff.phoneNumber === "null" ? "-" : staff.phoneNumber}
                  </TableCell>
                  <TableCell>{staff.user.email}</TableCell>
                  {/* <TableCell>{staff.role}</TableCell> */}
                  <TableCell>
                    <Button variant={"ghost"} className="size-10">
                      <Eye />
                    </Button>
                    <Button variant={"ghost"} className="size-10">
                      <PenBox />
                    </Button>
                    <Button variant={"ghost"} className="text-red-600 size-10">
                      <Trash2Icon />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

function EmptyData() {
  const router = useRouter();
  return (
    <Card>
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <TriangleAlertIcon />
          </EmptyMedia>
          <EmptyTitle>No Users Yet!</EmptyTitle>
          <EmptyDescription>
            You haven&apos;t created any users yet.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => router.push("/users/staff/create")}
            >
              Create User
            </Button>
          </div>
        </EmptyContent>
      </Empty>
    </Card>
  );
}

export default ViewAllStaff;
