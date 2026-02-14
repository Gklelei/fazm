"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useMemo, useState, useTransition } from "react";
import { Loader2Spinner } from "@/utils/Alerts/Loader2Spinner";
import { DrillsSchema, DrillsSchemaType } from "../Validation";
import { CreateDrills, DeleteDrills, EditDrills } from "../Server/Drills";
import { UseUtilsContext } from "@/Modules/Context/UtilsContext";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, Loader2Icon, Pen, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

type Drill = {
  id: string;
  name: string;
  description?: string | null;
};

type DialogMode = "create" | "view" | "edit" | null;

const Drills = () => {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  const { data } = UseUtilsContext();
  const drills = useMemo(
    () => (data?.drills.filter((d) => d.voided !== 1) ?? []) as Drill[],
    [data],
  );

  const [delId, setDelId] = useState<string>("");
  const [mode, setMode] = useState<DialogMode>(null);
  const [selected, setSelected] = useState<Drill | null>(null);

  const isOpen = mode !== null;

  const form = useForm<DrillsSchemaType>({
    resolver: zodResolver(DrillsSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const closeDialog = () => {
    setMode(null);
    setSelected(null);
    form.reset({ name: "", description: "" });
  };

  const openCreate = () => {
    setSelected(null);
    setMode("create");
    form.reset({ name: "", description: "" });
  };

  const openView = (d: Drill) => {
    setSelected(d);
    setMode("view");
  };

  const openEdit = (d: Drill) => {
    setSelected(d);
    setMode("edit");
    form.reset({
      name: d.name ?? "",
      description: d.description ?? "",
    });
  };

  const onSubmit = async (payload: DrillsSchemaType) => {
    startTransition(async () => {
      const res =
        mode === "edit" && selected
          ? await EditDrills(payload, selected.id)
          : await CreateDrills(payload);

      if (res.success) {
        toast.success(res.message);
        await queryClient.invalidateQueries({ queryKey: ["utils"] });
        closeDialog();
      } else {
        toast.error(res.message);
      }
    });
  };

  const handleDelete = async (id: string) => {
    setDelId(id);

    const res = await DeleteDrills({ drillId: id });

    if (res.success) {
      toast.success(res.message);
      await queryClient.invalidateQueries({ queryKey: ["utils"] });
    } else {
      toast.error(res.message);
    }

    setDelId("");
  };

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4 py-6">
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-semibold">
                Training drills
              </CardTitle>
              <CardDescription>
                Create and manage drills used in training sessions.
              </CardDescription>
            </div>

            <Button className="w-full sm:w-auto" onClick={openCreate}>
              Create drill
            </Button>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="pt-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            {drills.length} drill{drills.length === 1 ? "" : "s"} total
          </p>

          <div className="rounded-md border overflow-x-auto">
            {drills.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                No drills yet. Create one to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14">#</TableHead>
                    <TableHead className="min-w-55">Name</TableHead>
                    <TableHead className="min-w-[320px]">Description</TableHead>
                    <TableHead className="w-28 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {drills.map((d, idx) => (
                    <TableRow key={d.id}>
                      <TableCell className="text-muted-foreground">
                        {idx + 1}
                      </TableCell>

                      <TableCell className="font-medium">{d.name}</TableCell>

                      <TableCell className="text-muted-foreground">
                        {d.description?.trim() ? d.description : "—"}
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="View"
                            onClick={() => openView(d)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Edit"
                            onClick={() => openEdit(d)}
                          >
                            <Pen className="h-4 w-4" />
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Delete"
                            type="button"
                            disabled={delId === d.id}
                            onClick={() => handleDelete(d.id)}
                          >
                            {delId === d.id ? (
                              <Loader2Icon className="animate-spin size-4" />
                            ) : (
                              <Trash2Icon className="h-4 w-4 text-red-600" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ONE DIALOG (create/view/edit) */}
      <Dialog open={isOpen} onOpenChange={(v) => (!v ? closeDialog() : null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {mode === "create" && "Create a drill"}
              {mode === "view" && (selected?.name ?? "Drill")}
              {mode === "edit" && "Edit drill"}
            </DialogTitle>

            {mode === "create" && (
              <DialogDescription>
                Add a drill name and an optional description.
              </DialogDescription>
            )}
            {mode === "view" && (
              <DialogDescription>Drill details</DialogDescription>
            )}
          </DialogHeader>

          <Separator />

          {mode === "view" ? (
            <div className="space-y-3 pt-2 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Name
                </p>
                <p className="font-medium">{selected?.name ?? "—"}</p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Description
                </p>
                <p className="text-muted-foreground">
                  {selected?.description?.trim() ? selected.description : "—"}
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <Button variant="outline" type="button" onClick={closeDialog}>
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <div className="pt-2">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-5"
                >
                  <FormField
                    name="name"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold uppercase tracking-wide">
                          Drill name
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. Passing triangles"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    name="description"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold uppercase tracking-wide">
                          Description
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Optional description..."
                            className="min-h-24 resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={closeDialog}
                      disabled={isPending}
                    >
                      Cancel
                    </Button>

                    <Button type="submit" disabled={isPending}>
                      {isPending ? (
                        <Loader2Spinner />
                      ) : mode === "edit" ? (
                        "Save changes"
                      ) : (
                        "Create drill"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Drills;
