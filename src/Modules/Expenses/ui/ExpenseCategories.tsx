"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CreateExpenseCategory from "./CreateExpenseCategory";
import { GetExpenseCategoriesQuery } from "../Types";
import { Button } from "@/components/ui/button";
import { ArrowLeft, PenBoxIcon, Trash2Icon } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";

const ExpenseCategories = ({ data }: { data: GetExpenseCategoriesQuery[] }) => {
  const [rows, setRows] = useState(
    data.map((item) => ({
      ...item,
      checked: item.status === "ACTIVE",
    })),
  );

  const toggleStatus = (id: string, checked: boolean) => {
    const status = checked ? "ACTIVE" : "INACTIVE";
    setRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              checked,
              status: checked ? "ACTIVE" : "INACTIVE",
            }
          : row,
      ),
    );

    console.log(status);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>Expense Categories</CardTitle>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <CreateExpenseCategory />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground py-8"
                >
                  No expense categories found
                </TableCell>
              </TableRow>
            ) : (
              rows.map((item, idx) => (
                <TableRow key={item.id}>
                  <TableCell>{idx + 1}</TableCell>

                  <TableCell className="font-medium">{item.name}</TableCell>

                  <TableCell>
                    <Switch
                      checked={item.checked}
                      onCheckedChange={(checked) =>
                        toggleStatus(item.id, checked)
                      }
                      aria-label={`Toggle ${item.name} status`}
                    />
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Edit category"
                      >
                        <PenBoxIcon className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete category"
                      >
                        <Trash2Icon className="h-4 w-4 text-red-600" />
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

export default ExpenseCategories;
