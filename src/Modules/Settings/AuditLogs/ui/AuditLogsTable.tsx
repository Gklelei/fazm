"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  TerminalSquare,
  Eye,
} from "lucide-react";
import { FetchAuditLogsType } from "../Types";
import ExportDropdown from "@/utils/ExportDropdown";

export default function AuditLogsTable({
  initialData,
}: {
  initialData: FetchAuditLogsType[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const filteredData = initialData.filter((log) => {
    const q = searchQuery.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      log.resource.toLowerCase().includes(q) ||
      (log.userId && log.userId.toLowerCase().includes(q)) ||
      (log.user?.name && log.user.name.toLowerCase().includes(q)) ||
      (log.details && log.details.toLowerCase().includes(q))
    );
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredData.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  const getActionBadgeColor = (action: string) => {
    if (action.includes("CREATE") || action.includes("ADD"))
      return "bg-emerald-500/10 text-emerald-600";
    if (action.includes("DELETE") || action.includes("REMOVE"))
      return "bg-red-500/10 text-red-600";
    if (action.includes("UPDATE") || action.includes("EDIT"))
      return "bg-blue-500/10 text-blue-600";
    return "bg-slate-500/10 text-slate-600";
  };

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <TerminalSquare className="h-5 w-5 text-primary" />
            System Audit Logs
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Tracking all major mutations and administrative actions across the
            academy.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <ExportDropdown
            filename="Audit_Logs"
            headers={[
              "Timestamp",
              "Action",
              "Resource",
              "User",
              "Email",
              "Details",
            ]}
            rows={filteredData.map((log) => [
              format(new Date(log.createdAt), "MMM d, yyyy HH:mm:ss"),
              log.action,
              log.resource,
              log.user?.name || "System",
              log.user?.email || "",
              log.details || "",
            ])}
          />
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search action, resource, or user ID..."
              className="pl-9 h-9 w-full"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-0">
        <div className="rounded-md border bg-card/50 overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[180px]">Timestamp</TableHead>
                <TableHead className="w-[200px]">Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>User / Actor</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentItems.length > 0 ? (
                currentItems.map((log) => (
                  <TableRow key={log.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.createdAt), "MMM d, yyyy HH:mm:ss")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`font-mono text-[10px] tracking-wider uppercase ${getActionBadgeColor(log.action)}`}
                      >
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      {log.resource}
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.user ? (
                        <div className="flex flex-col">
                          <span className="font-medium">{log.user.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {log.user.email}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">
                          System / Root
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1 text-xs"
                          >
                            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                            Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="text-xl flex items-center gap-2">
                              System Log Details
                              <Badge
                                variant="outline"
                                className={getActionBadgeColor(log.action)}
                              >
                                {log.action}
                              </Badge>
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="font-medium text-muted-foreground">
                                  Resource
                                </p>
                                <p>{log.resource}</p>
                              </div>
                              <div>
                                <p className="font-medium text-muted-foreground">
                                  Timestamp
                                </p>
                                <p className="font-mono">
                                  {format(new Date(log.createdAt), "PPpp")}
                                </p>
                              </div>
                              <div>
                                <p className="font-medium text-muted-foreground">
                                  User / Actor
                                </p>
                                <p>
                                  {log.user
                                    ? `${log.user.name} (${log.user.email})`
                                    : "System / Root"}
                                </p>
                              </div>
                              <div>
                                <p className="font-medium text-muted-foreground">
                                  Actor ID
                                </p>
                                <p className="font-mono text-xs">
                                  {log.userId || "N/A"}
                                </p>
                              </div>
                            </div>

                            {/* Relational Context Section */}
                            {(log.athlete ||
                              log.invoice ||
                              log.training ||
                              log.batch ||
                              log.drill) && (
                              <div className="mt-4 pt-4 border-t">
                                <p className="font-medium text-muted-foreground mb-2">
                                  Affected Entities
                                </p>
                                <div className="grid grid-cols-2 gap-4 text-sm bg-muted/20 p-3 rounded-md border">
                                  {log.athlete && (
                                    <div>
                                      <p className="text-muted-foreground text-xs">
                                        Athlete
                                      </p>
                                      <p className="font-medium">
                                        {log.athlete.firstName}{" "}
                                        {log.athlete.lastName}
                                      </p>
                                      <p className="text-xs font-mono">
                                        {log.athlete.athleteId}
                                      </p>
                                    </div>
                                  )}
                                  {log.invoice && (
                                    <div>
                                      <p className="text-muted-foreground text-xs">
                                        Invoice
                                      </p>
                                      <p className="font-medium">
                                        {log.invoice.invoiceNumber}
                                      </p>
                                      <p className="text-xs">
                                        {log.invoice.type}
                                      </p>
                                    </div>
                                  )}
                                  {log.training && (
                                    <div>
                                      <p className="text-muted-foreground text-xs">
                                        Training
                                      </p>
                                      <p className="font-medium">
                                        {log.training.name}
                                      </p>
                                      <p className="text-xs">
                                        {format(
                                          new Date(log.training.date),
                                          "PPP",
                                        )}
                                      </p>
                                    </div>
                                  )}
                                  {log.batch && (
                                    <div>
                                      <p className="text-muted-foreground text-xs">
                                        Batch
                                      </p>
                                      <p className="font-medium">
                                        {log.batch.name}
                                      </p>
                                    </div>
                                  )}
                                  {log.drill && (
                                    <div>
                                      <p className="text-muted-foreground text-xs">
                                        Drill
                                      </p>
                                      <p className="font-medium">
                                        {log.drill.name}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            <div className="mt-4">
                              <p className="font-medium text-muted-foreground mb-2">
                                Payload / Description
                              </p>
                              <div className="bg-muted/50 p-4 rounded-lg overflow-x-auto text-xs font-mono">
                                <pre className="whitespace-pre-wrap break-words">
                                  {(() => {
                                    try {
                                      // Attempt to pretty-print JSON if it is a JSON string
                                      if (
                                        log.details &&
                                        (log.details.startsWith("{") ||
                                          log.details.startsWith("["))
                                      ) {
                                        const parsed = JSON.parse(log.details);
                                        return JSON.stringify(parsed, null, 2);
                                      }
                                      return (
                                        log.details || "No payload provided."
                                      );
                                    } catch (e) {
                                      return (
                                        log.details || "No payload provided."
                                      );
                                    }
                                  })()}
                                </pre>
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-32 text-center text-muted-foreground"
                  >
                    No audit logs found matching your search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Showing{" "}
              <span className="font-medium text-foreground">
                {startIndex + 1}
              </span>{" "}
              to{" "}
              <span className="font-medium text-foreground">
                {Math.min(startIndex + itemsPerPage, filteredData.length)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">
                {filteredData.length}
              </span>{" "}
              logs
            </p>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Previous Page</span>
              </Button>
              <div className="text-sm font-medium px-2">
                Page {currentPage} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Next Page</span>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
