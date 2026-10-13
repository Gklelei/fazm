"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Trash } from "lucide-react";
import ServerPagination from "@/components/shared/ServerPagination";
import { useMemo, useState } from "react";
import { GetExpensesQueryType } from "@/features/expenses/queries";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { VoidExpenses } from "@/features/expenses/actions/expenses";
import { Sweetalert } from "@/lib/alerts";
import CreateExpenses from "@/features/expenses/components/CreateExpenses";
import EditExpenseForm from "@/features/expenses/components/EditExpensesForm";
import { formatCurrency } from "@/lib/format";
import ExportDropdown from "@/components/shared/ExportDropdown";

interface Props {
  expenses: GetExpensesQueryType[];
  page: number;
  limit: number;
  total: number;
}

const ExpensesPage = ({ expenses, page, limit, total }: Props) => {
  const [query, setQuery] = useState("");
  const [delId, setDelId] = useState("");

  const filteredExpenses = useMemo(() => {
    return expenses.filter((i) =>
      i.name.toLowerCase().includes(query.toLowerCase()),
    );
  }, [expenses, query]);

  const handleDelete = async (id: string) => {
    setDelId(id);

    const result = await VoidExpenses(id);

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
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Money the academy spends, by category — kit, pitch hire, transport and the rest."
        actions={
          <>
            <ExportDropdown
              filename="Expenses"
              headers={["#", "Title", "Amount", "Description", "Date"]}
              rows={filteredExpenses.map((e, idx) => [
                String(idx + 1),
                e.name,
                formatCurrency(e.amount),
                e.description || "—",
                format(new Date(e.date), "dd MMM yyyy"),
              ])}
              fetchAllUrl={`/api/export?resource=expenses${
                query ? `&query=${encodeURIComponent(query)}` : ""
              }`}
              filterFn={(e: GetExpensesQueryType) =>
                e.name.toLowerCase().includes(query.toLowerCase())
              }
              mapRow={(e: GetExpensesQueryType, i: number) => [
                String(i + 1),
                e.name,
                formatCurrency(e.amount),
                e.description || "—",
                format(new Date(e.date), "dd MMM yyyy"),
              ]}
            />
            <CreateExpenses />
          </>
        }
      />
      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="border-b p-4">
          <div className="relative max-w-sm">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              aria-label="Search expenses"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search expenses"
              className="pl-9"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-12">#</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>amount</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-40">Date</TableHead>
                <TableHead className="w-28 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredExpenses.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground py-10"
                  >
                    No expenses found
                  </TableCell>
                </TableRow>
              ) : (
                filteredExpenses.map((e, idx) => (
                  <TableRow key={e.id} className="hover:bg-muted/30">
                    <TableCell className="text-muted-foreground">
                      {idx + 1}
                    </TableCell>

                    <TableCell className="font-medium">{e.name}</TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(e.amount)}
                    </TableCell>

                    <TableCell className="text-muted-foreground truncate max-w-75">
                      {e.description || "—"}
                    </TableCell>

                    <TableCell className="text-muted-foreground">
                      {format(new Date(e.date), "dd MMM yyyy")}
                    </TableCell>

                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <EditExpenseForm expenses={expenses} id={e.id} />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive"
                          disabled={delId === e.id}
                          onClick={() => handleDelete(e.id)}
                        >
                          {delId === e.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Trash size={16} />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <div className="p-4 border-t">
            <ServerPagination page={page} limit={limit} total={total} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpensesPage;
