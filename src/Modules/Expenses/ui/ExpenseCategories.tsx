"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CreateExpenseCategory from "./CreateExpenseCategory";
import { GetExpenseCategoriesQuery } from "../Types";
import { Button } from "@/components/ui/button";
import { Loader2Icon, Trash2Icon } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useMemo, useState } from "react";
import {
  DeleteExpenseCategory,
  UpdateExpenseCategoryStatus,
} from "../Server/CreateExpenseCategory";
import { Sweetalert } from "@/utils/Alerts/Sweetalert";
import EditExpenseCategoryDialog from "./EditExpenseCategory";

type Row = GetExpenseCategoriesQuery & { checked: boolean };

const ExpenseCategories = ({ data }: { data: GetExpenseCategoriesQuery[] }) => {
  const [delId, setDelId] = useState("");
  const [savingId, setSavingId] = useState<string>("");

  const initialRows = useMemo<Row[]>(
    () =>
      data.map((item) => ({
        ...item,
        checked: item.status === "ACTIVE",
      })),
    [data],
  );

  const [rows, setRows] = useState<Row[]>(initialRows);

  const setRowChecked = (id: string, checked: boolean) => {
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
  };

  const handleToggleStatus = async (id: string, checked: boolean) => {
    if (savingId) return;

    const nextStatus = checked ? "ACTIVE" : "INACTIVE";

    const prev = rows.find((r) => r.id === id);
    const prevChecked = prev?.checked ?? false;

    setSavingId(id);
    setRowChecked(id, checked);

    const result = await UpdateExpenseCategoryStatus({
      id,
      status: nextStatus,
    });

    if (!result.success) {
      setRowChecked(id, prevChecked);

      Sweetalert({
        icon: "error",
        text: result.message,
        title: "Update failed",
      });
    } else {
      Sweetalert({
        icon: "success",
        text: result.message,
        title: "Success!",
      });
    }

    setSavingId("");
  };

  const hanldeDelteCategories = async (id: string) => {
    setDelId(id);
    const result = await DeleteExpenseCategory({ id });

    if (result.success) {
      Sweetalert({
        icon: "success",
        text: result.message,
        title: "Success!",
      });

      // remove row locally (since revalidate will update on next navigation anyway)
      setRows((prev) => prev.filter((r) => r.id !== id));
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
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle className="text-lg font-semibold">
          Expense Categories
        </CardTitle>

        <div className="flex items-center gap-2">
          <CreateExpenseCategory />
        </div>
      </CardHeader>

      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-12">#</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="w-32">Status</TableHead>
              <TableHead className="text-right w-28">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.length === 0 ? (
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
                <TableRow key={item.id} className="hover:bg-muted/30">
                  <TableCell className="text-muted-foreground">
                    {idx + 1}
                  </TableCell>

                  <TableCell className="font-medium">{item.name}</TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={item.checked}
                        disabled={savingId === item.id}
                        onCheckedChange={(checked) =>
                          handleToggleStatus(item.id, checked)
                        }
                        aria-label={`Toggle ${item.name} status`}
                      />
                      {savingId === item.id ? (
                        <Loader2Icon className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <EditExpenseCategoryDialog category={item} />

                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete category"
                        disabled={delId === item.id}
                        onClick={() => hanldeDelteCategories(item.id)}
                      >
                        {delId === item.id ? (
                          <Loader2Icon className="animate-spin w-4 h-4" />
                        ) : (
                          <Trash2Icon className="h-4 w-4 text-red-600" />
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

export default ExpenseCategories;
