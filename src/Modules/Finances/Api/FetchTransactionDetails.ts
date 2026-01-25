import { Prisma } from "@/generated/prisma/client";
import { useQuery } from "@tanstack/react-query";

export const query = {
  include: {
    athlete: {
      select: {
        firstName: true,
        lastName: true,
        profilePIcture: true,
      },
    },
    invoice: true,
  },
} satisfies Prisma.FinanceFindManyArgs;

export type getFinanceDetails = Prisma.FinanceGetPayload<typeof query>;

export const UseFetchTransactionDetails = (id: string) => {
  return useQuery<getFinanceDetails>({
    queryKey: ["FINANCE_TRANSACTION_DETAILS", id],
    queryFn: async () => {
      const response = await fetch(`/api/finance/transaction/record/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch transaction details");
      }
      return response.json();
    },
    enabled: false,
    staleTime: 1000 * 60 * 5,
  });
};
