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
import { useTransition } from "react";
import { Loader2Spinner } from "@/utils/Alerts/Loader2Spinner";
import {
  TrainingLocationSchema,
  TrainingLocationSchemaType,
} from "../Validation";
import { CreateTrainingLocations } from "../Server/TrainingLocations";
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
import { Eye, Pen, Trash2Icon, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const TrainingLocations = () => {
  const [isPending, startTransition] = useTransition();
  const { data } = UseUtilsContext();
  const router = useRouter();

  const form = useForm<TrainingLocationSchemaType>({
    resolver: zodResolver(TrainingLocationSchema),
    defaultValues: { name: "" },
  });

  const handleSubmit = async (payload: TrainingLocationSchemaType) => {
    startTransition(async () => {
      const results = await CreateTrainingLocations(payload);

      if (results.success) {
        router.refresh();
        toast.success(results.message);

        form.reset({ name: "" });
      } else {
        toast.error(results.message);
      }
    });
  };

  const locations = data?.locations ?? [];

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

            {/* CREATE DIALOG */}
            <Dialog>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">Create location</Button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create a location</DialogTitle>
                  <DialogDescription>
                    Add a location name. Keep it short and recognizable.
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
                          onClick={() => form.reset({ name: "" })}
                          disabled={isPending}
                        >
                          Reset
                        </Button>

                        <Button type="submit" disabled={isPending}>
                          {isPending ? <Loader2Spinner /> : "Create location"}
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
                          {/* VIEW */}
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
                            <DialogContent className="sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle>Location details</DialogTitle>
                                <DialogDescription>
                                  Basic information about this location.
                                </DialogDescription>
                              </DialogHeader>
                              <Separator />
                              <div className="pt-3 space-y-2 text-sm">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                  Name
                                </p>
                                <p className="font-medium">{loc.name}</p>
                              </div>
                            </DialogContent>
                          </Dialog>

                          {/* EDIT (UI only) */}
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
                            <DialogContent className="sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle>Edit location</DialogTitle>
                                <DialogDescription>
                                  UI only (no functionality wired).
                                </DialogDescription>
                              </DialogHeader>
                              <Separator />
                              <div className="pt-3 space-y-4">
                                <div className="space-y-2">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Location name
                                  </p>
                                  <Input defaultValue={loc.name} />
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

                          {/* DELETE (UI only) */}
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

export default TrainingLocations;
