"use client";
import React, { useMemo, useState } from "react";
import { GuardiansResponseType } from "../types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ProfileAvatar from "@/utils/profile/ProfileAvatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FilterIcon, RotateCcw } from "lucide-react";
import { UseUtilsContext } from "@/Modules/Context/UtilsContext";

interface Props {
  data: GuardiansResponseType[];
  noOfGuarddians: number;
}

const ViewAllGuardins = ({ data, noOfGuarddians }: Props) => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const { data: Utils } = UseUtilsContext();

  const filteredData = useMemo(() => {
    if (!data) return [];
    const query = searchQuery.toLowerCase();

    return data.filter((item) => {
      const firstName = item.athlete?.firstName || "";
      const middleName = item.athlete?.middleName || "";
      const lastName = item.athlete?.lastName || "";
      const athleteFullName =
        `${firstName}${middleName}${lastName}`.toLowerCase();

      return (
        (item.fullNames || "").toLowerCase().includes(query) ||
        athleteFullName.includes(query) ||
        (item.relationship || "").toLowerCase().includes(query) ||
        (item.athlete?.batches?.name || "").toLowerCase().includes(query)
      );
    });
  }, [data, searchQuery]);

  return (
    <Card className="w-full shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold">
              All Athlete Guardians
            </CardTitle>
            <CardDescription className="mt-1">
              {noOfGuarddians} guardians registered across all athletes
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Toolbar Area */}
        <div className="flex flex-wrap items-center gap-3 p-4 border-t">
          <div className="relative flex-1 min-w-75">
            <Input
              placeholder="Search guardian, athlete, or relationship..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <FilterIcon className="w-4 h-4" />
                  Filter By Batch
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Select Batch</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {Utils?.batches.map((i, idx) => (
                  <DropdownMenuItem
                    key={idx}
                    onClick={() => setSearchQuery(i.name)}
                  >
                    {i.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {searchQuery && (
              <Button
                variant="ghost"
                onClick={() => setSearchQuery("")}
                className="flex items-center gap-2 text-muted-foreground"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Table Area */}
        <div className="border-t">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-15 text-center">#</TableHead>
                <TableHead>Guardian Name</TableHead>
                <TableHead>Contact Information</TableHead>
                <TableHead>Assigned Athlete</TableHead>
                <TableHead>Relationship</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredData.length > 0 ? (
                filteredData.map((item, i) => {
                  const athleteName = [
                    item.athlete.firstName,
                    item.athlete.middleName,
                    item.athlete.lastName,
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <TableRow
                      key={item.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <TableCell className="text-center text-muted-foreground">
                        {i + 1}
                      </TableCell>

                      <TableCell>
                        <span className="font-semibold block">
                          {item.fullNames}
                        </span>
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium">
                            {item.email}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {item.phoneNumber}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-3">
                          <ProfileAvatar
                            name={athleteName}
                            url={item.athlete.profilePIcture ?? ""}
                          />
                          <div className="flex flex-col">
                            <span className="text-sm font-medium leading-none">
                              {athleteName}
                            </span>
                            {item.athlete.batches?.name && (
                              <span className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
                                {item.athlete.batches.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                          {item.relationship}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No guardians found matching your search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ViewAllGuardins;
