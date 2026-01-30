"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Trash } from "lucide-react";
import { useMemo, useState } from "react";
import { GetExpensesQueryType } from "../Types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { VoidExpenses } from "../Server/CreateExpense";
import { Sweetalert } from "@/utils/Alerts/Sweetalert";
import CreateExpenses from "./CreateExpenses";
import EditExpenseForm from "./EditExpensesForm";

interface Props {
  expenses: GetExpensesQueryType[];
}

const ExpensesPage = ({ expenses }: Props) => {
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
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Expenses</CardTitle>

          <CreateExpenses />
        </div>

        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search expenses by name…"
          className="max-w-sm"
        />
      </CardHeader>

      <CardContent>
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
                  <TableCell className="font-medium">KES {e.amount}</TableCell>

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
      </CardContent>
    </Card>
  );
};

export default ExpensesPage;
