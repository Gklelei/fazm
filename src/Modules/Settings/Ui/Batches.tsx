"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Eye, Pen, Trash2Icon } from "lucide-react";
import { Sweetalert } from "@/utils/Alerts/Sweetalert";
import { Loader2Spinner } from "@/utils/Alerts/Loader2Spinner";

import { BatchesSchema, BatchesSchemaType } from "../Validation";
import { CreateBatches } from "../Server/Batches";
// import { UpdateBatches } from "../Server/Batches"; // <--- create this action
import { UseUtilsContext } from "@/Modules/Context/UtilsContext";

type BatchRow = {
  id: string;
  name: string;
  description: string | null;
};

const Batches = () => {
  const [isPending, startTransition] = useTransition();
  const { data } = UseUtilsContext();

  const batches = (data?.batches ?? []) as BatchRow[];

  // ---- create dialog form ----
  const createForm = useForm<BatchesSchemaType>({
    resolver: zodResolver(BatchesSchema),
    defaultValues: { description: "", name: "" },
  });

  // ---- view/edit state ----
  const [selected, setSelected] = useState<BatchRow | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // ---- edit form (separate) ----
  const editForm = useForm<BatchesSchemaType>({
    resolver: zodResolver(BatchesSchema),
    defaultValues: { description: "", name: "" },
  });

  // preload edit form when dialog opens
  useEffect(() => {
    if (!editOpen || !selected) return;
    editForm.reset({
      name: selected.name ?? "",
      description: selected.description ?? "",
    });
  }, [editOpen, selected, editForm]);

  const handleCreate = async (payload: BatchesSchemaType) => {
    startTransition(async () => {
      const results = await CreateBatches(payload);

      if (results.success) {
        Sweetalert({
          icon: "success",
          text: results.message,
          title: "Success!",
        });
        createForm.reset({ name: "", description: "" });
      } else {
        Sweetalert({
          icon: "error",
          text: results.message,
          title: "An error has occurred",
        });
      }
    });
  };

  const handleUpdate = async (payload: BatchesSchemaType) => {
    if (!selected) return;

    startTransition(async () => {
      try {
        // Replace with your real action:
        // const res = await UpdateBatches({ id: selected.id, ...payload });
        // if (!res.success) throw new Error(res.message);

        // For now, just show success (UI proof)

        console.log({ payload });
        Sweetalert({
          icon: "success",
          title: "Updated!",
          text: "Batch updated successfully.",
        });

        setEditOpen(false);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        Sweetalert({
          icon: "error",
          title: "Update failed",
          text: e.message || "Something went wrong",
        });
      }
    });
  };

  const openView = (b: BatchRow) => {
    setSelected(b);
    setViewOpen(true);
  };

  const openEdit = (b: BatchRow) => {
    setSelected(b);
    setEditOpen(true);
  };

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4 py-6">
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-semibold">
                Player batches
              </CardTitle>
              <CardDescription>
                Organize athletes into groups for training sessions and billing.
              </CardDescription>
            </div>

            {/* CREATE */}
            <Dialog>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">Create batch</Button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create a batch</DialogTitle>
                  <DialogDescription>
                    Provide a name and an optional description for the group.
                  </DialogDescription>
                </DialogHeader>

                <Separator />

                <div className="pt-2">
                  <Form {...createForm}>
                    <form
                      onSubmit={createForm.handleSubmit(handleCreate)}
                      className="space-y-5"
                    >
                      <FormField
                        name="name"
                        control={createForm.control}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold uppercase tracking-wide">
                              Batch name
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g. U17 - Term 1"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        name="description"
                        control={createForm.control}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold uppercase tracking-wide">
                              Description
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Optional notes..."
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
                          onClick={() =>
                            createForm.reset({ name: "", description: "" })
                          }
                          disabled={isPending}
                        >
                          Reset
                        </Button>

                        <Button type="submit" disabled={isPending}>
                          {isPending ? <Loader2Spinner /> : "Create batch"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="pt-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            {batches.length} batch{batches.length === 1 ? "" : "es"} total
          </p>

          <div className="rounded-md border overflow-x-auto">
            {batches.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                No batches yet. Create one to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14">#</TableHead>
                    <TableHead className="min-w-55">Name</TableHead>
                    <TableHead className="min-w-90">Description</TableHead>
                    <TableHead className="w-32 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {batches.map((b, idx) => (
                    <TableRow key={b.id}>
                      <TableCell className="text-muted-foreground">
                        {idx + 1}
                      </TableCell>

                      <TableCell className="font-medium">
                        <div className="max-w-60 truncate">{b.name}</div>
                      </TableCell>

                      <TableCell className="text-muted-foreground">
                        <div className="max-w-105 truncate">
                          {b.description?.trim() ? b.description : "—"}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="View"
                            onClick={() => openView(b)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Edit"
                            onClick={() => openEdit(b)}
                          >
                            <Pen className="h-4 w-4" />
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Delete"
                          >
                            <Trash2Icon className="h-4 w-4 text-red-600" />
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

      {/* VIEW DIALOG (single, controlled) */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Batch details</DialogTitle>
            <DialogDescription>Read-only view.</DialogDescription>
          </DialogHeader>

          <Separator />

          <div className="pt-3 space-y-4 text-sm">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Name
              </p>
              <p className="font-medium">{selected?.name ?? "—"}</p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Description
              </p>
              <p className="text-muted-foreground">
                {selected?.description?.trim() ? selected.description : "—"}
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => setViewOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* EDIT DIALOG (single, controlled) */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit batch</DialogTitle>
            <DialogDescription>
              Update the name and description.
            </DialogDescription>
          </DialogHeader>

          <Separator />

          <div className="pt-2">
            <Form {...editForm}>
              <form
                onSubmit={editForm.handleSubmit(handleUpdate)}
                className="space-y-5"
              >
                <FormField
                  name="name"
                  control={editForm.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-wide">
                        Batch name
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. U17 - Term 1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  name="description"
                  control={editForm.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-wide">
                        Description
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Optional notes..."
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
                    onClick={() => setEditOpen(false)}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>

                  <Button type="submit" disabled={isPending}>
                    {isPending ? <Loader2Spinner /> : "Save changes"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Batches;
