import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tabs } from "@radix-ui/react-tabs";
import React from "react";
import TrainingLocations from "./TrainingLocations";
import Drills from "./Drills";
import BatchWithSessionsForm from "../Batches/Ui/CreateBatch";

const CreateUtils = () => {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">System Utilities</h1>
        <p className="text-sm text-muted-foreground">
          Manage reusable system configurations
        </p>
      </div>

      <Tabs defaultValue="batch" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="batch">Batches</TabsTrigger>
          <TabsTrigger value="training_location">Locations</TabsTrigger>
          <TabsTrigger value="training_drills">Drills</TabsTrigger>
        </TabsList>

        <TabsContent value="batch" className="pt-4">
          <BatchWithSessionsForm />
        </TabsContent>

        <TabsContent value="training_location" className="pt-4">
          <TrainingLocations />
        </TabsContent>

        <TabsContent value="training_drills" className="pt-4">
          <Drills />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CreateUtils;
