import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { db } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import ViewTrainingSessions from "@/Modules/Trainings/ui/ViewTrainingSessions";
import { GetAllTrainingSessionsQuery } from "@/Modules/Trainings/Assesments/Types";
import { Prisma } from "@/generated/prisma/client";

function toInt(v: unknown, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string; search?: string }>;
}) {
  const sp = await searchParams;

  const page = Math.max(1, toInt(sp.page, 1));
  const pageSize = Math.min(50, Math.max(5, toInt(sp.pageSize, 10)));
  const search = (sp.search ?? "").trim();

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) notFound();

  const role = session.user.role as string | undefined;
  const userId = session.user.id as string;

  const where: Prisma.trainingWhereInput = {
    isArchived: false,

    ...(search
      ? {
          OR: [
            {
              name: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            {
              description: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            {
              batch: {
                name: {
                  contains: search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            },
            {
              location: {
                name: {
                  contains: search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            },
          ],
        }
      : {}),

    ...(role === "COACH"
      ? {
          coach: {
            user: {
              id: userId,
            },
          },
        }
      : {}),
  };

  const [total, items] = await db.$transaction([
    db.training.count({ where }),
    db.training.findMany({
      ...GetAllTrainingSessionsQuery,
      where,
      orderBy: { date: "desc" },
      take: pageSize,
      skip: (page - 1) * pageSize,
    }),
  ]);

  return (
    <ViewTrainingSessions
      data={items}
      meta={{ total, page, pageSize, search }}
    />
  );
}
