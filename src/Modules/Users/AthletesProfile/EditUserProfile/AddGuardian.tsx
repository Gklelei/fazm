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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useTransition } from "react";
import { AddAthleteGuardian } from "./Server/AddAthleteGuardian";
import { Sweetalert } from "@/utils/Alerts/Sweetalert";
import { Loader2Spinner } from "@/utils/Alerts/Loader2Spinner";

type Props = {
  athleteId?: string;
};

const AddGuardian = ({ athleteId }: Props) => {
  const [isPending, startTransistion] = useTransition();
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
    startTransistion(async () => {
      const result = await AddAthleteGuardian(data, athleteId!);

      if (result.success) {
        Sweetalert({
          icon: "success",
          text: result.message,
          title: "Success!",
        });
        form.reset();
      } else if (!result.success) {
        Sweetalert({
          icon: "error",
          text: result.message,
          title: "An error has occurred",
        });
      }
    });
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button size="sm" className="gap-1.5 h-8 text-xs">
          <UserPlus className="h-3.5 w-3.5" />
          Add Guardian
        </Button>
      </SheetTrigger>

      <SheetContent className="flex flex-col p-0 sm:max-w-lg">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>Add Guardian</SheetTitle>
          <SheetDescription>
            Enter guardian details for emergency contact and communication.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <Form {...form}>
            <form
              id="add-guardian-form"
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-6"
            >
              <AthletesGuardian />
            </form>
          </Form>
        </div>

        <SheetFooter className="px-6 py-4 border-t">
          <div className="flex w-full gap-2">
            <Button
              variant="outline"
              type="button"
              className="flex-1"
              onClick={() => form.reset()}
            >
              Cancel
            </Button>
            <Button type="submit" form="add-guardian-form" className="flex-1">
              {isPending ? <Loader2Spinner /> : "Save Guardian"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default AddGuardian;
