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
import { useTransition } from "react";
import { Loader2Spinner } from "@/utils/Alerts/Loader2Spinner";
import { DrillsSchema, DrillsSchemaType } from "../Validation";
import { CreateDrills } from "../Server/Drills";
import { UseUtilsContext } from "@/Modules/Context/UtilsContext";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { toast } from "sonner";

const Drills = () => {
  const [isPending, startTransition] = useTransition();
  const { data } = UseUtilsContext();

  const form = useForm<DrillsSchemaType>({
    resolver: zodResolver(DrillsSchema),
    defaultValues: {
      description: "",
      name: "",
    },
  });

  const handleSubmit = async (payload: DrillsSchemaType) => {
    startTransition(async () => {
      const results = await CreateDrills(payload);
      if (results.success) {
        toast.success(results.message);
        form.reset();
      } else {
        toast.error(results.message);
      }
    });
  };

  const drills = data?.drills ?? [];

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

            {/* CREATE DIALOG */}
            <Dialog>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">Create drill</Button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create a drill</DialogTitle>
                  <DialogDescription>
                    Add a drill name and an optional description.
                  </DialogDescription>
                </DialogHeader>

                <Separator />

                <div className="pt-2">
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(handleSubmit)}
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
                          onClick={() =>
                            form.reset({ name: "", description: "" })
                          }
                          disabled={isPending}
                        >
                          Reset
                        </Button>
                        <Button type="submit" disabled={isPending}>
                          {isPending ? <Loader2Spinner /> : "Create drill"}
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

        {/* TABLE */}
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
                          {/* VIEW DIALOG */}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                aria-label="View"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-lg">
                              <DialogHeader>
                                <DialogTitle>{d.name}</DialogTitle>
                                <DialogDescription>
                                  Drill details
                                </DialogDescription>
                              </DialogHeader>
                              <Separator />
                              <div className="space-y-3 pt-2 text-sm">
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Name
                                  </p>
                                  <p className="font-medium">{d.name}</p>
                                </div>

                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Description
                                  </p>
                                  <p className="text-muted-foreground">
                                    {d.description?.trim()
                                      ? d.description
                                      : "—"}
                                  </p>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>

                          {/* EDIT DIALOG (UI ONLY) */}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                aria-label="Edit"
                              >
                                <Pen className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-lg">
                              <DialogHeader>
                                <DialogTitle>Edit drill</DialogTitle>
                                <DialogDescription>
                                  UI only (no functionality wired).
                                </DialogDescription>
                              </DialogHeader>
                              <Separator />
                              <div className="pt-3 space-y-4">
                                <div className="space-y-2">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Drill name
                                  </p>
                                  <Input defaultValue={d.name} />
                                </div>
                                <div className="space-y-2">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Description
                                  </p>
                                  <Textarea
                                    className="min-h-24 resize-none"
                                    defaultValue={d.description ?? ""}
                                  />
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button variant="outline" type="button">
                                    Cancel
                                  </Button>
                                  <Button type="button">Save</Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>

                          {/* DELETE (UI ONLY) */}
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Delete"
                            type="button"
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
    </div>
  );
};

export default Drills;
