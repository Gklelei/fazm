"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Target, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMemo, useState } from "react";
import { saveAssessment } from "../server/CreateAssesment";
import {
  AssesmentAthleteQueryType,
  GetAssesmentMetricsQueryType,
} from "../Types";

type Props = {
  athletes: AssesmentAthleteQueryType;
  metrics: GetAssesmentMetricsQueryType[];
};

const CreateAssesment = ({ athletes, metrics }: Props) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(
    () => athletes.athletes?.[0]?.athleteId || null,
  );

  const [scores, setScores] = useState<Record<string, string>>({});
  const [metricComments, setMetricComments] = useState<Record<string, string>>(
    {},
  );

  const filteredAthletes = useMemo(() => {
    return athletes.athletes.filter((athlete) => {
      const name =
        `${athlete.firstName} ${athlete.lastName} ${athlete.middleName || ""}`.toLowerCase();
      return name.includes(searchQuery.toLowerCase());
    });
  }, [athletes.athletes, searchQuery]);

  const handleAthleteSwitch = (newId: string) => {
    if (newId === selectedAthleteId) return;
    setSelectedAthleteId(newId);
    setScores({});
    setMetricComments({});
  };

  const selectedAthlete = useMemo(() => {
    return (
      filteredAthletes.find((a) => a.athleteId === selectedAthleteId) ||
      filteredAthletes[0] ||
      null
    );
  }, [filteredAthletes, selectedAthleteId]);

  const handleSave = async () => {
    if (!selectedAthlete) return;
    // IMPORTANT: Check if you need to pass athlete.id (UUID) or athlete.athleteId based on your FK fix
    const result = await saveAssessment({
      athleteId: selectedAthleteId!,
      trainingId: athletes.id,
      coachId: athletes.staffId,
      scores,
      metricComments,
    });

    if (result.status === "SUCCESS") alert("Saved!");
  };

  return (
    <div className="mx-auto max-w-6xl p-3">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Target className="h-5 w-5" /> Athlete Assessment
          </CardTitle>
          <CardDescription>
            Select an athlete and record individual metric scores and comments
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* ATHLETE LIST */}
            <div className="lg:col-span-1 space-y-3">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8 h-9"
                  placeholder="Search athlete"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <ScrollArea className="h-105 pr-2">
                <div className="space-y-2">
                  {filteredAthletes.map((athlete) => {
                    const isActive =
                      selectedAthlete?.athleteId === athlete.athleteId;
                    return (
                      <Card
                        key={athlete.athleteId}
                        onClick={() => handleAthleteSwitch(athlete.athleteId)}
                        className={`cursor-pointer ${isActive ? "border-primary bg-primary/5" : ""}`}
                      >
                        <CardContent className="p-2 flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium">
                              {athlete.firstName} {athlete.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              ID: {athlete.athleteId}
                            </p>
                          </div>
                          {isActive && (
                            <Badge className="text-xs">Active</Badge>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* ASSESSMENT FORM */}
            <div className="lg:col-span-2 space-y-4">
              {!selectedAthlete ? (
                <div className="p-6 text-center text-muted-foreground">
                  No athlete selected
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between bg-muted/40 p-3 rounded-md">
                    <p className="font-medium">
                      {selectedAthlete.firstName} {selectedAthlete.lastName}
                    </p>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={Object.keys(scores).length === 0}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                  </div>

                  <div key={selectedAthlete.athleteId}>
                    <Tabs defaultValue={metrics[0]?.id}>
                      <TabsList className="grid grid-cols-2 md:grid-cols-4">
                        {metrics.map((m) => (
                          <TabsTrigger key={m.id} value={m.id}>
                            {m.name}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      {metrics.map((category) => (
                        <TabsContent key={category.id} value={category.id}>
                          <Card>
                            <CardContent className="space-y-6 pt-4">
                              {category.metrics.map((metric) => (
                                <div key={metric.id} className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium">
                                      {metric.label}
                                    </p>
                                    <Select
                                      value={scores[metric.id] ?? ""}
                                      onValueChange={(val) =>
                                        setScores((p) => ({
                                          ...p,
                                          [metric.id]: val,
                                        }))
                                      }
                                    >
                                      <SelectTrigger className="w-32 h-8">
                                        <SelectValue placeholder="Grade" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {[1, 2, 3, 4, 5].map((g) => (
                                          <SelectItem key={g} value={String(g)}>
                                            {g}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  {/* INDIVIDUAL COMMENT INPUT */}
                                  <Input
                                    className="h-8 text-xs"
                                    placeholder={`Comment for ${metric.label}...`}
                                    value={metricComments[metric.id] ?? ""}
                                    onChange={(e) =>
                                      setMetricComments((p) => ({
                                        ...p,
                                        [metric.id]: e.target.value,
                                      }))
                                    }
                                  />
                                  <Separator />
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        </TabsContent>
                      ))}
                    </Tabs>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateAssesment;
