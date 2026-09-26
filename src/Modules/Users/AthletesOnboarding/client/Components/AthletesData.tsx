"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";

import { UseGetAllAthletes } from "../../Api/FetchAllAthletes";
import { DeleteAthlete } from "../../Server/DeleteAthlete";
import { UpdateAthleteStatus } from "../../Server/EditAthleteStatus";
import { useDebounce } from "@/utils/Debounce";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";

import { PageLoader } from "@/utils/Alerts/PageLoader";
import { Sweetalert } from "@/utils/Alerts/Sweetalert";

import { Loader2, UserPlus, XCircle, RefreshCcw, Users } from "lucide-react";

import { AthleteRow } from "./athlete-utils";
import AthletesDesktopTable from "./AthletesDesktopTable";
import AthletesMobileCard from "./AthletesMobileCard";
import AthletesFilterBar from "./AthletesFilterBar";
import ExportDropdown from "@/utils/ExportDropdown";
import { fullName, ageText } from "./athlete-utils";

const AthletesData = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const [deletingId, setDeletingId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchValue = useDebounce(searchQuery, 800);

  const isSearching = searchQuery.trim() !== debouncedSearchValue.trim();

  const {
    data,
    isError,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isRefetching,
    refetch,
  } = UseGetAllAthletes({ search: debouncedSearchValue });

  const { ref, inView } = useInView({ rootMargin: "300px" });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const athletes: AthleteRow[] = useMemo(() => {
    const flat: AthleteRow[] = data?.pages.flatMap((p) => p.allAthletes) ?? [];
    const map = new Map<string, AthleteRow>();
    for (const a of flat) map.set(a.id, a);
    return Array.from(map.values());
  }, [data?.pages]);

  async function handleDeleteAthlete(athleteId: string) {
    setDeletingId(athleteId);
    const result = await DeleteAthlete(athleteId);

    if (result.status === "SUCCESS") {
      Sweetalert({
        icon: "success",
        text: result.successMessage || "Athlete deleted",
        title: "Deleted",
      });
      await queryClient.invalidateQueries({ queryKey: ["all-athletes"] });
    } else {
      Sweetalert({
        icon: "error",
        text: result.errorMessage || "Failed to delete",
        title: "Error",
      });
    }

    setDeletingId("");
  }

  const handleChangeAthleteStatus = async ({
    athleteId,
    status,
  }: {
    athleteId: string;
    status: "PENDING" | "ACTIVE" | "SUSPENDED";
  }) => {
    const result = await UpdateAthleteStatus({ athleteId, status });

    if (result.success) {
      await queryClient.invalidateQueries({ queryKey: ["all-athletes"] });
      Sweetalert({
        icon: "success",
        text: `Athlete marked as ${status.toLowerCase()}`,
        title: "Status Updated",
      });
    } else {
      Sweetalert({
        icon: "error",
        text: result.message,
        title: "Update Failed",
      });
    }
  };

  if (isLoading && !isFetchingNextPage) return <PageLoader />;

  if (isError) {
    return (
      <div className="p-8 text-center rounded-lg border">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full border bg-muted/40">
          <XCircle className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="font-semibold">Couldn’t load athletes</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Check your connection and try again.
        </p>

        <div className="mt-4 flex justify-center gap-2">
          <Button variant="outline" onClick={() => refetch()} className="gap-2">
            <RefreshCcw className="h-4 w-4" />
            Retry
          </Button>
          <Button
            onClick={() => router.push("/players/create")}
            className="gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Register athlete
          </Button>
        </div>
      </div>
    );
  }

  const showEmpty =
    athletes.length === 0 && !debouncedSearchValue && !isRefetching;
  const showNoMatches = athletes.length === 0 && !!debouncedSearchValue;

  if (showEmpty) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <Card className="w-full max-w-md text-center border-dashed">
          <CardContent className="pt-10 pb-10">
            <div className="bg-muted/50 rounded-full w-20 h-20 mx-auto flex items-center justify-center mb-6">
              <Users className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-2">Your roster is empty</h3>
            <p className="text-muted-foreground mb-8 max-w-xs mx-auto">
              Add athletes to start tracking profiles, positions, and account
              status.
            </p>
            <Button
              onClick={() => router.push("/players/create")}
              className="gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Register first athlete
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-1 md:p-2">
      <AthletesFilterBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        debouncedSearchValue={debouncedSearchValue}
        isSearching={isSearching}
        isRefetching={isRefetching}
      />

      <Card>
        <CardContent className="pt-4">
          <div className="flex justify-end mb-4">
            <ExportDropdown
              filename="Athletes"
              headers={[
                "Athlete ID",
                "Name",
                "Email",
                "Positions",
                "Age",
                "Status",
              ]}
              rows={athletes.map((a) => [
                a.athleteId,
                fullName(a),
                a.email || "",
                a.positions.join(", "),
                ageText(a.age),
                a.status,
              ])}
              fetchAllUrl="/api/export?resource=athletes"
              filterFn={(a: AthleteRow) =>
                [a.firstName, a.middleName, a.lastName, a.athleteId]
                  .filter(Boolean)
                  .join(" ")
                  .toLowerCase()
                  .includes(debouncedSearchValue.toLowerCase())
              }
              mapRow={(a: AthleteRow) => [
                a.athleteId,
                [a.firstName, a.middleName, a.lastName]
                  .filter(Boolean)
                  .join(" "),
                a.email || "",
                (a.positions || []).join(", "),
                ageText(a.age),
                a.status,
              ]}
            />
          </div>
          {showNoMatches ? (
            <div className="rounded-lg border border-dashed p-10 text-center">
              <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full border bg-muted/40">
                <XCircle className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-semibold">No athletes matched your search</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try a different name or ID.
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSearchQuery("")}
                  className="gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  Clear search
                </Button>
                <Button
                  onClick={() => router.push("/players/create")}
                  className="gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  Register athlete
                </Button>
              </div>
            </div>
          ) : isMobile ? (
            <div className="grid gap-3">
              {athletes.map((athlete) => (
                <AthletesMobileCard
                  key={athlete.id}
                  athlete={athlete}
                  deletingId={deletingId}
                  handleDeleteAthlete={handleDeleteAthlete}
                  handleChangeAthleteStatus={handleChangeAthleteStatus}
                />
              ))}
            </div>
          ) : (
            <AthletesDesktopTable
              athletes={athletes}
              deletingId={deletingId}
              handleDeleteAthlete={handleDeleteAthlete}
              handleChangeAthleteStatus={handleChangeAthleteStatus}
            />
          )}

          {athletes.length > 0 && (
            <div
              ref={ref}
              className="h-20 w-full flex justify-center items-center mt-4"
            >
              {isFetchingNextPage ? (
                <div className="flex items-center gap-2 text-muted-foreground font-medium">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Loading more athletes…</span>
                </div>
              ) : !hasNextPage && debouncedSearchValue ? (
                <p className="text-muted-foreground text-sm italic">
                  Showing all results for{" "}
                  <span className="font-medium">{debouncedSearchValue}</span>
                </p>
              ) : !hasNextPage ? (
                <p className="text-muted-foreground text-sm italic">
                  You&apos;ve reached the end.
                </p>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AthletesData;
