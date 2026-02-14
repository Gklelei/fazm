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
import { Button } from "@/components/ui/button";
import { useMemo, useState, useTransition } from "react";
import { Loader2Spinner } from "@/utils/Alerts/Loader2Spinner";
import {
  TrainingLocationSchema,
  TrainingLocationSchemaType,
} from "../Validation";
import {
  CreateTrainingLocations,
  DeleteTrainingLocation,
  EditTrainingLocations,
} from "../Server/TrainingLocations";
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
import { Eye, Pen, Trash2Icon, MapPin, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

type Location = {
  id: string;
  name: string;
  voided?: number | null;
};

type Mode = "create" | "view" | "edit" | "delete" | null;

const TrainingLocations = () => {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  const { data } = UseUtilsContext();

  const locations = useMemo(() => {
    const raw = (data?.locations ?? []) as Location[];
    // Hide voided locations (recommended). Remove this filter if you want to show them.
    return raw.filter((l) => (l.voided ?? 0) === 0);
  }, [data]);

  const [mode, setMode] = useState<Mode>(null);
  const [selected, setSelected] = useState<Location | null>(null);
  const [delId, setDelId] = useState<string>("");

  const isOpen = mode !== null;

  const form = useForm<TrainingLocationSchemaType>({
    resolver: zodResolver(TrainingLocationSchema),
    defaultValues: { name: "" },
  });

  const close = () => {
    setMode(null);
    setSelected(null);
    form.reset({ name: "" });
  };

  const openCreate = () => {
    setSelected(null);
    setMode("create");
    form.reset({ name: "" });
  };

  const openView = (loc: Location) => {
    setSelected(loc);
    setMode("view");
  };

  const openEdit = (loc: Location) => {
    setSelected(loc);
    setMode("edit");
    form.reset({ name: loc.name ?? "" });
  };

  const openDelete = (loc: Location) => {
    setSelected(loc);
    setMode("delete");
  };

  const invalidateUtils = async () => {
    await queryClient.invalidateQueries({ queryKey: ["utils"] });
  };

  const onSubmit = async (payload: TrainingLocationSchemaType) => {
    startTransition(async () => {
      const res =
        mode === "edit" && selected
          ? await EditTrainingLocations(payload, selected.id)
          : await CreateTrainingLocations(payload);

      if (res.success) {
        toast.success(res.message);
        await invalidateUtils();
        close();
      } else {
        toast.error(res.message);
      }
    });
  };

  const confirmDelete = async () => {
    if (!selected) return;

    setDelId(selected.id);
    const res = await DeleteTrainingLocation(selected.id);

    if (res.success) {
      toast.success(res.message);
      await invalidateUtils();
      close();
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
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                Training locations
              </CardTitle>
              <CardDescription>
                Manage the locations where training sessions take place.
              </CardDescription>
            </div>

            <Button className="w-full sm:w-auto" onClick={openCreate}>
              Create location
            </Button>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="pt-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            {locations.length} location{locations.length === 1 ? "" : "s"} total
          </p>

          <div className="rounded-md border overflow-x-auto">
            {locations.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                No training locations yet. Create one to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14">#</TableHead>
                    <TableHead className="min-w-65">Name</TableHead>
                    <TableHead className="w-28 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {locations.map((loc, idx) => (
                    <TableRow key={loc.id}>
                      <TableCell className="text-muted-foreground">
                        {idx + 1}
                      </TableCell>

                      <TableCell className="font-medium">{loc.name}</TableCell>

                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="View"
                            onClick={() => openView(loc)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Edit"
                            onClick={() => openEdit(loc)}
                          >
                            <Pen className="h-4 w-4" />
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Delete"
                            type="button"
                            onClick={() => openDelete(loc)}
                            disabled={delId === loc.id}
                          >
                            {delId === loc.id ? (
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

      {/* ONE DIALOG: create/view/edit/delete */}
      <Dialog open={isOpen} onOpenChange={(v) => (!v ? close() : null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {mode === "create" && "Create a location"}
              {mode === "view" && "Location details"}
              {mode === "edit" && "Edit location"}
              {mode === "delete" && "Delete location"}
            </DialogTitle>

            {mode === "create" && (
              <DialogDescription>
                Add a location name. Keep it short and recognizable.
              </DialogDescription>
            )}
          </DialogHeader>

          <Separator />

          {/* VIEW */}
          {mode === "view" && (
            <div className="pt-3 space-y-2 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Name
              </p>
              <p className="font-medium">{selected?.name ?? "—"}</p>

              <div className="flex justify-end pt-4">
                <Button variant="outline" type="button" onClick={close}>
                  Close
                </Button>
              </div>
            </div>
          )}

          {/* DELETE CONFIRM */}
          {mode === "delete" && (
            <div className="pt-3 space-y-4">
              <div className="rounded-md border p-3 text-sm">
                <p className="text-muted-foreground">You’re deleting:</p>
                <p className="font-medium">{selected?.name ?? "—"}</p>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={close}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={confirmDelete}
                  disabled={isPending || !selected}
                >
                  {isPending ? <Loader2Spinner /> : "Delete"}
                </Button>
              </div>
            </div>
          )}

          {/* CREATE + EDIT FORM */}
          {(mode === "create" || mode === "edit") && (
            <div className="pt-3">
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
                          Location name
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. Main pitch, Gym hall, Field A"
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
                      onClick={close}
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
                        "Create location"
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

export default TrainingLocations;
