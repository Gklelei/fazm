import { redirect } from "next/navigation";

/** Old address of the staff page. */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  redirect(`/staff/${(await params).id}`);
}
