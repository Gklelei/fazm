"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  Clipboard,
  ClipboardCheck,
  Search,
  MoreHorizontal,
  Trash2,
  TicketPercent,
  CalendarIcon,
  InfinityIcon,
  Loader2Icon,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { GetCouponsQueryType } from "../Types/Index";
import CreateCoupons from "./CreateCoupons";
import { formatCurrency } from "@/utils/TansformWords";
import { DeleteCouponsAction } from "../Server/CouponsAction";
import { Sweetalert } from "@/utils/Alerts/Sweetalert";

interface Props {
  coupons: GetCouponsQueryType[];
}

const Coupons = ({ coupons }: Props) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [delId, setDelId] = useState("");

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    const result = await DeleteCouponsAction(id);
    setDelId(id);
    if (result.success) {
      Sweetalert({
        icon: "success",
        text: result.message,
        title: "Success!",
      });
      setDelId("");
    } else {
      Sweetalert({
        icon: "error",
        text: result.message,
        title: "An error has occurred",
      });
    }
    setDelId("");
  };

  const filteredCoupons = useMemo(() => {
    return coupons.filter((coupon) =>
      coupon.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [coupons, searchQuery]);

  return (
    <Card className="shadow-md border-muted/40">
      <CardHeader className="space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 pb-6">
        <div className="space-y-1">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <TicketPercent className="h-6 w-6 text-primary" />
            Coupons & Discounts
          </CardTitle>
          <CardDescription>
            Manage promo codes and automatic discounts for athletes.
          </CardDescription>
        </div>
        <div className="flex w-full items-center justify-between gap-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search coupons..."
              className="pl-9 w-50 lg:w-75"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <CreateCoupons />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-45">Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Validity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCoupons.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No coupons found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCoupons.map((coupon) => (
                  <TableRow key={coupon.id} className="hover:bg-muted/5">
                    {/* CODE COLUMN */}
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2 group">
                        <span className="font-mono text-sm bg-muted px-2 py-1 rounded border">
                          {coupon.name}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleCopy(coupon.name, coupon.id)}
                        >
                          {copiedId === coupon.id ? (
                            <ClipboardCheck className="h-3 w-3 text-green-600" />
                          ) : (
                            <Clipboard className="h-3 w-3 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </TableCell>

                    {/* DISCOUNT COLUMN */}
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-primary">
                          {coupon.discountType === "PERCENTAGE"
                            ? `${coupon.value}% OFF`
                            : `-${formatCurrency(Number(coupon.value))}`}
                        </span>
                        <span className="text-xs text-muted-foreground capitalize">
                          {coupon.interval.toLowerCase()}
                        </span>
                      </div>
                    </TableCell>

                    {/* USAGE COLUMN */}
                    <TableCell>
                      <div className="text-sm">
                        <span className="font-medium">{coupon.timesUsed}</span>
                        <span className="text-muted-foreground mx-1">/</span>
                        <span className="text-muted-foreground">
                          {coupon.usageLimit && coupon.usageLimit > 0 ? (
                            coupon.usageLimit
                          ) : (
                            <InfinityIcon className="h-3 w-3 inline" />
                          )}
                        </span>
                      </div>
                    </TableCell>

                    {/* VALIDITY COLUMN */}
                    <TableCell>
                      <div className="flex flex-col text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3" />
                          {format(new Date(coupon.startDate), "MMM d, yyyy")}
                        </span>
                        {coupon.expiryDate && (
                          <span className="text-xs text-red-400">
                            Expires{" "}
                            {format(new Date(coupon.expiryDate), "MMM d")}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* STATUS COLUMN */}
                    <TableCell>
                      <Badge
                        variant={coupon.status === 1 ? "default" : "secondary"}
                        className={
                          coupon.status === 1
                            ? "bg-green-600 hover:bg-green-700"
                            : ""
                        }
                      >
                        {coupon.status === 1 ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>

                    {/* ACTIONS COLUMN */}
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          asChild
                          disabled={delId === coupon.id}
                        >
                          {delId === coupon.id ? (
                            <Loader2Icon className="animate-spin size-4" />
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          )}
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => handleCopy(coupon.name, coupon.id)}
                          >
                            <Clipboard className="mr-2 h-4 w-4" /> Copy Code
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <CreateCoupons coupon={coupon} id={coupon.id} />
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => handleDeleteCoupon(coupon.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Deactivate
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default Coupons;
