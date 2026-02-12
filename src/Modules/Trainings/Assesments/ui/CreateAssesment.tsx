"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { cn } from "@/lib/utils";
import { Sweetalert } from "@/utils/Alerts/Sweetalert";
import { saveAssessment } from "../server/CreateAssesment";

import {
  ArrowLeftCircle,
  Search,
  Target,
  Save,
  Users,
  Loader2,
} from "lucide-react";

type Metric = { id: string; label: string };
type Section = { id: string; name: string; metrics: Metric[] };

type Athlete = {
  athleteId: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
};

type Draft = {
  scores: Record<string, string>;
  comments: Record<string, string>;
  isDirty: boolean;
};

type ListFilter = "ALL" | "PENDING" | "COMPLETED";

type Props = {
  trainingId: string;
  coachId: string;
  athletes: Athlete[];
  metrics: Section[];
  existingByAthlete: Record<
    string,
    {
      assessmentId: string;
      responses: Record<string, { grade: string; comment: string }>;
    }
  >;
};

const GRADES = [
  { value: "1", label: "1 - BELOW_STANDARD" },
  { value: "2", label: "2 - NEEDS_WORK" },
  { value: "3", label: "3 - GOOD" },
  { value: "4", label: "4 - VERY_GOOD" },
  { value: "5", label: "5 - EXCELLENT" },
] as const;

export default function CreateAssesment({
  trainingId,
  coachId,
  athletes,
  metrics,
  existingByAthlete,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState("");
  const [listFilter, setListFilter] = useState<ListFilter>("ALL");
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>(
    athletes?.[0]?.athleteId ?? "",
  );

  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => {
    const initial: Record<string, Draft> = {};
    for (const a of athletes) {
      const existing = existingByAthlete[a.athleteId]?.responses ?? {};
      initial[a.athleteId] = {
        scores: Object.fromEntries(
          Object.entries(existing).map(([mid, v]) => [mid, v.grade]),
        ),
        comments: Object.fromEntries(
          Object.entries(existing).map(([mid, v]) => [mid, v.comment]),
        ),
        isDirty: false,
      };
    }
    return initial;
  });

  /* ===========================
     STABLE DERIVED STATE
  =========================== */

  const completedSet = useMemo(() => {
    const set = new Set<string>();
    for (const [athleteId, d] of Object.entries(drafts)) {
      if (d && Object.keys(d.scores ?? {}).length > 0) {
        set.add(athleteId);
      }
    }
    return set;
  }, [drafts]);

  const counts = useMemo(() => {
    const completed = completedSet.size;
    const all = athletes.length;
    return { all, completed, pending: all - completed };
  }, [athletes.length, completedSet]);

  const filteredAthletes = useMemo(() => {
    const q = search.trim().toLowerCase();

    const base = !q
      ? athletes
      : athletes.filter((a) => {
          const full =
            `${a.firstName} ${a.lastName} ${a.middleName ?? ""} ${a.athleteId}`.toLowerCase();
          return full.includes(q);
        });

    if (listFilter === "ALL") return base;
    if (listFilter === "COMPLETED")
      return base.filter((a) => completedSet.has(a.athleteId));
    return base.filter((a) => !completedSet.has(a.athleteId));
  }, [athletes, search, listFilter, completedSet]);

  /* ===========================
     SELECTED ATHLETE
  =========================== */

  const selectedAthlete = useMemo(
    () => athletes.find((a) => a.athleteId === selectedAthleteId) ?? null,
    [athletes, selectedAthleteId],
  );

  const draft = drafts[selectedAthleteId] ?? {
    scores: {},
    comments: {},
    isDirty: false,
  };

  /* ===========================
     HANDLERS
  =========================== */

  const setScore = (metricId: string, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [selectedAthleteId]: {
        ...prev[selectedAthleteId],
        scores: { ...prev[selectedAthleteId].scores, [metricId]: value },
        isDirty: true,
      },
    }));
  };

  const setComment = (metricId: string, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [selectedAthleteId]: {
        ...prev[selectedAthleteId],
        comments: { ...prev[selectedAthleteId].comments, [metricId]: value },
        isDirty: true,
      },
    }));
  };

  const handleSave = () => {
    if (!selectedAthleteId) return;

    const payload = drafts[selectedAthleteId];
    if (!payload || Object.keys(payload.scores).length === 0) {
      Sweetalert({
        icon: "error",
        title: "Missing grades",
        text: "Add at least one grade before saving.",
      });
      return;
    }

    startTransition(async () => {
      const res = await saveAssessment({
        athleteId: selectedAthleteId,
        trainingId,
        coachId,
        scores: payload.scores,
        metricComments: payload.comments,
      });

      if (res.status === "SUCCESS") {
        Sweetalert({
          icon: "success",
          title: "Saved",
          text: res.successMessage || "Saved successfully.",
        });
        setDrafts((prev) => ({
          ...prev,
          [selectedAthleteId]: {
            ...prev[selectedAthleteId],
            isDirty: false,
          },
        }));
      } else {
        Sweetalert({
          icon: "error",
          title: "Failed",
          text: res.errorMessage || "Failed to save.",
        });
      }
    });
  };

  /* ===========================
     ATHLETE LIST COMPONENT
  =========================== */

  const AthleteList = (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-2 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-8 h-11"
          placeholder="Search athlete"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant={listFilter === "ALL" ? "default" : "outline"}
          className="flex-1"
          onClick={() => setListFilter("ALL")}
        >
          All ({counts.all})
        </Button>
        <Button
          size="sm"
          variant={listFilter === "PENDING" ? "default" : "outline"}
          className="flex-1"
          onClick={() => setListFilter("PENDING")}
        >
          Pending ({counts.pending})
        </Button>
        <Button
          size="sm"
          variant={listFilter === "COMPLETED" ? "default" : "outline"}
          className="flex-1"
          onClick={() => setListFilter("COMPLETED")}
        >
          Completed ({counts.completed})
        </Button>
      </div>

      <ScrollArea className="h-[60vh] lg:h-[70vh] pr-2">
        <div className="space-y-2">
          {filteredAthletes.map((a) => {
            const isActive = a.athleteId === selectedAthleteId;
            const isDone = completedSet.has(a.athleteId);

            return (
              <button
                key={a.athleteId}
                type="button"
                onClick={() => setSelectedAthleteId(a.athleteId)}
                className={cn(
                  "w-full rounded-lg border p-3 text-left transition",
                  "hover:bg-muted/40",
                  isActive && "border-primary bg-primary/5",
                )}
              >
                <div className="flex justify-between">
                  <div>
                    <div className="font-medium text-sm">
                      {a.firstName} {a.lastName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ID: {a.athleteId}
                    </div>
                  </div>

                  {isDone && (
                    <Badge className="text-[10px] bg-emerald-600 text-white">
                      Completed
                    </Badge>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );

  /* ===========================
     RENDER
  =========================== */

  return (
    <div className="mx-auto max-w-6xl p-3 pb-24 lg:pb-6">
      <Card>
        <CardHeader className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="w-fit px-0 text-muted-foreground"
          >
            <ArrowLeftCircle className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Target className="h-5 w-5" />
                Athlete Assessment
              </CardTitle>
              <CardDescription>Record and edit athlete scores.</CardDescription>
            </div>
            <Badge variant="secondary">
              {counts.completed}/{counts.all} done
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          <div className="lg:hidden mb-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between h-11"
                >
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {selectedAthlete
                      ? `${selectedAthlete.firstName} ${selectedAthlete.lastName}`
                      : "Select athlete"}
                  </span>
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[85vh]">
                <SheetHeader className="mb-4">
                  <SheetTitle>Select athlete</SheetTitle>
                </SheetHeader>
                {AthleteList}
              </SheetContent>
            </Sheet>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="hidden lg:block lg:col-span-1">{AthleteList}</div>

            <div className="lg:col-span-2 space-y-4">
              {!selectedAthlete ? (
                <div className="p-6 text-center text-muted-foreground">
                  No athlete selected
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center border rounded-lg p-3 bg-muted/30">
                    <div>
                      <div className="font-medium">
                        {selectedAthlete.firstName} {selectedAthlete.lastName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ID: {selectedAthlete.athleteId}
                      </div>
                    </div>
                    <Button size="sm" onClick={handleSave} disabled={isPending}>
                      {isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save
                    </Button>
                  </div>

                  {metrics.map((section) => (
                    <Card key={section.id}>
                      <CardHeader>
                        <CardTitle className="text-base">
                          {section.name}
                        </CardTitle>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        {section.metrics.map((metric) => (
                          <div key={metric.id} className="space-y-2">
                            <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
                              <div className="text-sm font-medium">
                                {metric.label}
                              </div>

                              <Select
                                value={draft.scores[metric.id] ?? ""}
                                onValueChange={(val) =>
                                  setScore(metric.id, val)
                                }
                              >
                                <SelectTrigger className="h-11 w-full sm:w-52">
                                  <SelectValue placeholder="Select grade" />
                                </SelectTrigger>
                                <SelectContent>
                                  {GRADES.map((g) => (
                                    <SelectItem key={g.value} value={g.value}>
                                      {g.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <Input
                              className="h-11 text-sm"
                              placeholder="Optional comment..."
                              value={draft.comments[metric.id] ?? ""}
                              onChange={(e) =>
                                setComment(metric.id, e.target.value)
                              }
                            />

                            <Separator />
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
