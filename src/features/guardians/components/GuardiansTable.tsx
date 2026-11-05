"use client";
import { PageHeader } from "@/components/shared/PageHeader";
import React, { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import ServerPagination from "@/components/shared/ServerPagination";
import { GuardiansResponseType } from "@/features/guardians/queries";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ProfileAvatar from "@/components/shared/ProfileAvatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RotateCcw, Search } from "lucide-react";
import ExportDropdown from "@/components/shared/ExportDropdown";
import { photoOf } from "@/features/athletes/lib/photo";
import { useDebounce } from "@/hooks/use-debounce";
import { useProgramme } from "@/providers/ProgrammeContext";

interface Props {
  data: GuardiansResponseType[];
  noOfGuarddians: number;
  page: number;
  limit: number;
}

const ALL = "all";
const athleteNameOf = (a: GuardiansResponseType["athlete"]) =>
  [a.firstName, a.middleName, a.lastName].filter(Boolean).join(" ");

const ViewAllGuardins = ({ data, noOfGuarddians, page, limit }: Props) => {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { batches } = useProgramme();
  const [pending, start] = useTransition();
  const [search, setSearch] = useState(params.get("search") ?? "");
  const debounced = useDebounce(search, 400);
  const batchId = params.get("batchId") ?? "";

  // Filters live in the URL; the server filters, counts and pages
  const push = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("page");
    start(() => router.replace(`${pathname}?${next}`));
  };

  useEffect(() => {
    if (debounced.trim() !== (params.get("search") ?? "")) push({ search: debounced.trim() });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to typing
  }, [debounced]);

  const filtered = !!(params.get("search") || batchId);
  const exportQuery = new URLSearchParams({ resource: "guardians" });
  if (params.get("search")) exportQuery.set("search", params.get("search")!);
  if (batchId) exportQuery.set("batchId", batchId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Guardians"
        description={`${noOfGuarddians} parents and guardians${filtered ? " match" : " across the roster"}, with the athletes they're responsible for.`}
        actions={
          <ExportDropdown<GuardiansResponseType>
            filename="Guardians"
            headers={["#", "Guardian Name", "Email", "Phone", "Athlete", "Relationship"]}
            rows={[]}
            fetchAllUrl={`/api/export?${exportQuery}`}
            mapRow={(item, i) => [
              String(i + 1),
              item.fullNames,
              item.email ?? "",
              item.phoneNumber,
              athleteNameOf(item.athlete),
              item.relationship,
            ]}
          />
        }
      />
      <Card className="gap-0 overflow-hidden py-0">
        <CardContent className="p-0">
          {/* Toolbar Area */}
          <div className="flex flex-wrap items-center gap-3 border-t p-4">
            <div className="relative min-w-60 flex-1">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                aria-label="Search guardians"
                placeholder="Search guardian, phone, athlete or relationship"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pr-9 pl-9"
              />
              {pending && (
                <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>

            <Select value={batchId || ALL} onValueChange={(v) => push({ batchId: v === ALL ? "" : v })}>
              <SelectTrigger aria-label="Batch" className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value={ALL}>All batches</SelectItem>
                {batches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {filtered && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearch("");
                  push({ search: "", batchId: "" });
                }}
                className="flex items-center gap-2 text-muted-foreground"
              >
                <RotateCcw className="size-4" />
                Reset
              </Button>
            )}
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
                {data.length > 0 ? (
                  data.map((item, i) => {
                    const athleteName = athleteNameOf(item.athlete);

                    return (
                      <TableRow
                        key={item.id}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <TableCell className="text-center text-muted-foreground">
                          {(page - 1) * limit + i + 1}
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
                              url={photoOf(item.athlete)}
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
                      {filtered ? "No guardians match. Try another search or batch." : "No guardians yet."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="p-4 border-t">
            <ServerPagination
              page={page}
              limit={limit}
              total={noOfGuarddians}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ViewAllGuardins;
