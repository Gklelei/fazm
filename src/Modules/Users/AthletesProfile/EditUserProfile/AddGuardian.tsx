"use client";

import { useForm } from "react-hook-form";
import {
  AthleteGuardianSchema,
  AthleteGuardianSchemaType,
} from "../../AthletesOnboarding/validation/AthleteGuardian";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { Form } from "@/components/ui/form";
import AthletesGuardian from "../../AthletesOnboarding/client/Components/AthletesGuardian";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useTransition } from "react";
import { AddAthleteGuardian } from "./Server/AddAthleteGuardian";
import { Loader2Spinner } from "@/utils/Alerts/Loader2Spinner";
import { toast } from "sonner";

type Props = {
  athleteId?: string;
};

const AddGuardian = ({ athleteId }: Props) => {
  const [isPending, startTransition] = useTransition();

  const form = useForm<AthleteGuardianSchemaType>({
    resolver: zodResolver(AthleteGuardianSchema),
    defaultValues: {
      guardianEmail: "",
      guardianFullNames: "",
      guardianPhoneNumber: "",
      guardianRelationShip: "",
    },
  });

  async function handleSubmit(data: AthleteGuardianSchemaType) {
    startTransition(async () => {
      const result = await AddAthleteGuardian(data, athleteId!);

      if (result.success) {
        toast.success(result.message);
        form.reset();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5 h-8 text-xs">
          <UserPlus className="h-3.5 w-3.5" />
          Add Guardian
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Guardian</DialogTitle>
          <DialogDescription>
            Enter guardian details for emergency contact and communication.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id="add-guardian-form"
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6 py-4"
          >
            <AthletesGuardian />

            <DialogFooter className="pt-4">
              <div className="flex w-full gap-2">
                <Button
                  variant="outline"
                  type="button"
                  className="flex-1"
                  onClick={() => form.reset()}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="add-guardian-form"
                  className="flex-1"
                  disabled={isPending}
                >
                  {isPending ? <Loader2Spinner /> : "Save Guardian"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddGuardian;
