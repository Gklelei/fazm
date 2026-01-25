import { db } from "@/lib/prisma";

const page = async () => {
  const assesments = await db.assessment.findMany({
    include: {
      responses: true,
    },
  });
  return (
    <div>
      <pre>{JSON.stringify(assesments, null, 2)}</pre>
    </div>
  );
};

export default page;
