"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GetAllSubsQueryType } from "../Type/Subs";
import CreateSubscriptions from "./CreateSubscriptions";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, Trash2Icon, Loader2Icon } from "lucide-react";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { archiveSubscriptionPlan } from "../Server/EditSubscriptionFees";
import { Sweetalert } from "@/utils/Alerts/Sweetalert";
import EditSubscriptionForm from "./EditSubscriptionForm";

const ViewSubscriptions = ({ data }: { data: GetAllSubsQueryType[] }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [frequencyFilter, setFrequencyFilter] = useState<string>("all");
  const [delId, setDelId] = useState("");

  // Filter data based on search and filters
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // Search filter
      const matchesSearch =
        searchTerm === "" ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && item.isActive) ||
        (statusFilter === "inactive" && !item.isActive);

      // Frequency filter
      const matchesFrequency =
        frequencyFilter === "all" || item.interval === frequencyFilter;

      return matchesSearch && matchesStatus && matchesFrequency;
    });
  }, [data, searchTerm, statusFilter, frequencyFilter]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Format date
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-KE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Get status badge color
  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge variant="default" className="bg-green-500 hover:bg-green-600">
        Active
      </Badge>
    ) : (
      <Badge variant="secondary">Inactive</Badge>
    );
  };

  // Get frequency label
  const getFrequencyLabel = (interval: string) => {
    const labels: Record<string, string> = {
      YEARLY: "Yearly",
      MONTHLY: "Monthly",
      WEEKLY: "Weekly",
      DAILY: "Daily",
    };
    return labels[interval] || interval;
  };

  const handleDelete = async (id: string) => {
    setDelId(id);

    const result = await archiveSubscriptionPlan(id);

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
        title: "An error has occurred",
      });
    }

    setDelId("");
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl font-semibold">
              Subscription Plans
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Manage all subscription plans and fees
            </p>
          </div>
          <CreateSubscriptions />
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-3 mt-4">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search plans by name, description, or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2">
            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-35">
                <div className="flex items-center gap-2">
                  <Filter className="h-3.5 w-3.5" />
                  <SelectValue placeholder="Status" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            {/* Frequency Filter */}
            <Select value={frequencyFilter} onValueChange={setFrequencyFilter}>
              <SelectTrigger className="w-35">
                <div className="flex items-center gap-2">
                  <Filter className="h-3.5 w-3.5" />
                  <SelectValue placeholder="Frequency" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Frequencies</SelectItem>
                <SelectItem value="YEARLY">Yearly</SelectItem>
                <SelectItem value="MONTHLY">Monthly</SelectItem>
                <SelectItem value="WEEKLY">Weekly</SelectItem>
                <SelectItem value="DAILY">Daily</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Filters Button */}
            {(searchTerm ||
              statusFilter !== "all" ||
              frequencyFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setFrequencyFilter("all");
                }}
                className="h-10"
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Results Summary */}
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-muted-foreground">
            Showing {filteredData.length} of {data.length} subscription plans
          </p>
          {filteredData.length === 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
                setFrequencyFilter("all");
              }}
            >
              Clear all filters
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Code</TableHead>
                <TableHead className="hidden lg:table-cell">
                  Description
                </TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length > 0 ? (
                filteredData.map((item, idx) => (
                  <TableRow key={item.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{idx + 1}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-muted-foreground md:hidden">
                          {item.code}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {item.code}
                      </code>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell max-w-xs truncate">
                      {item.description || (
                        <span className="text-muted-foreground italic">
                          No description
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(item.amount)}
                    </TableCell>
                    <TableCell>{getFrequencyLabel(item.interval)}</TableCell>
                    <TableCell>{getStatusBadge(item.isActive)}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {formatDate(item.createdAt)}
                    </TableCell>
                    <TableCell>
                      <EditSubscriptionForm data={data} id={item.id} />
                      <Button
                        variant={"ghost"}
                        disabled={delId === item.id}
                        onClick={() => handleDelete(item.id)}
                      >
                        {delId === item.id ? (
                          <Loader2Icon className="mr-2 animate-spin h-5 w-5" />
                        ) : (
                          <Trash2Icon className="text-red-600" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <p className="text-muted-foreground">
                        No subscription plans found
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {searchTerm ||
                        statusFilter !== "all" ||
                        frequencyFilter !== "all"
                          ? "Try adjusting your filters"
                          : "Create your first subscription plan"}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Quick Stats */}
        {filteredData.length > 0 && (
          <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-muted-foreground">Active:</span>
              <span className="font-medium">
                {filteredData.filter((item) => item.isActive).length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-muted"></div>
              <span className="text-muted-foreground">Inactive:</span>
              <span className="font-medium">
                {filteredData.filter((item) => !item.isActive).length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Total value:</span>
              <span className="font-medium">
                {formatCurrency(
                  filteredData.reduce((sum, item) => sum + item.amount, 0),
                )}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ViewSubscriptions;
