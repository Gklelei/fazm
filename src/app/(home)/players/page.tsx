import type { Metadata } from "next";
import AthletesRoster from "@/features/athletes/components/AthletesRoster";
import { listAthletes } from "@/features/athletes/queries/list";

export const metadata: Metadata = { title: "Athletes" };

export default async function Page() {
  // Seeds react-query with the unfiltered first page — the same call the
  // client makes — so the roster renders without a loading round-trip.
  const firstPage = await listAthletes({});
  return (
    <AthletesRoster
      initialData={{
        pages: [JSON.parse(JSON.stringify(firstPage))],
        pageParams: [""],
      }}
    />
  );
}
