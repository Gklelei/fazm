"use client";

import { useState } from "react";
import {
  useQuery,
  useQueryClient,
  UseQueryOptions,
  QueryKey,
} from "@tanstack/react-query";
import { financeApi, ApiClientError } from "./apiClient";
import {
  FinanceQueryParams,
  FinanceResponse,
  Period,
  SortField,
  SortOrder,
} from "./types";

/**
 * Query key factory for consistent cache management
 */
export const financeKeys = {
  all: ["finance"] as const,
  lists: () => [...financeKeys.all, "list"] as const,
  list: (params: FinanceQueryParams) => [...financeKeys.lists(), params] as const,
};

/**
 * Main hook for fetching finance data with React Query
 */
export function useFinanceData(
  params: FinanceQueryParams = {},
  options?: Omit
    UseQueryOptions<FinanceResponse, ApiClientError, FinanceResponse, QueryKey>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: financeKeys.list(params),
    queryFn: () => financeApi.getFinanceData(params),
    staleTime: 1000 * 60 * 2, // 2 minutes - finance data should be fresh
    gcTime: 1000 * 60 * 10, // 10 minutes garbage collection
    retry: (failureCount, error) => {
      // Don't retry on 401/403
      if (error instanceof ApiClientError && error.status && [401, 403].includes(error.status)) {
        return false;
      }
      return failureCount < 2;
    },
    ...options,
  });
}

/**
 * Specific hooks for common use cases
 */
export function useWeeklyFinance(page: number = 1, limit: number = 10) {
  return useFinanceData(
    { period: "W", page, limit, sortBy: "createdAt", sortOrder: "desc" },
    {
      staleTime: 1000 * 60, // 1 minute for weekly data
    }
  );
}

export function useMonthlyFinance(page: number = 1, limit: number = 10) {
  return useFinanceData({
    period: "M",
    page,
    limit,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
}

export function useYearlyFinance(page: number = 1, limit: number = 10) {
  return useFinanceData({
    period: "Y",
    page,
    limit,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
}

/**
 * Advanced hook with built-in pagination controls
 */
export function useFinanceDataWithPagination(
  initialParams: Partial<FinanceQueryParams> = {}
) {
  const [params, setParams] = useState<FinanceQueryParams>({
    page: 1,
    limit: 10,
    sortBy: "createdAt",
    sortOrder: "desc",
    ...initialParams,
  });

  const query = useFinanceData(params);

  // Pagination actions
  const goToPage = (page: number) => {
    if (page < 1) return;
    setParams((prev) => ({ ...prev, page }));
  };

  const nextPage = () => {
    if (query.data?.transactions.meta.hasNextPage) {
      setParams((prev) => ({ ...prev, page: (prev.page || 1) + 1 }));
    }
  };

  const previousPage = () => {
    if (query.data?.transactions.meta.hasPreviousPage) {
      setParams((prev) => ({ ...prev, page: Math.max((prev.page || 1) - 1, 1) }));
    }
  };

  const firstPage = () => {
    setParams((prev) => ({ ...prev, page: 1 }));
  };

  const lastPage = () => {
    if (query.data?.transactions.meta.totalPages) {
      setParams((prev) => ({ ...prev, page: query.data!.transactions.meta.totalPages }));
    }
  };

  // Filter and sort actions
  const setLimit = (limit: number) => {
    setParams((prev) => ({ ...prev, limit, page: 1 }));
  };

  const setPeriod = (period: Period | undefined) => {
    setParams((prev) => ({ ...prev, period, page: 1 }));
  };

  const setSorting = (sortBy: SortField, sortOrder: SortOrder) => {
    setParams((prev) => ({ ...prev, sortBy, sortOrder }));
  };

  const resetFilters = () => {
    setParams({
      page: 1,
      limit: 10,
      sortBy: "createdAt",
      sortOrder: "desc",
    });
  };

  return {
    ...query,
    params,
    actions: {
      goToPage,
      nextPage,
      previousPage,
      firstPage,
      lastPage,
      setLimit,
      setPeriod,
      setSorting,
      resetFilters,
    },
  };
}

/**
 * Hook for prefetching data (improves UX)
 */
export function usePrefetchFinance() {
  const queryClient = useQueryClient();

  const prefetchPage = async (params: FinanceQueryParams) => {
    await queryClient.prefetchQuery({
      queryKey: financeKeys.list(params),
      queryFn: () => financeApi.getFinanceData(params),
      staleTime: 1000 * 60 * 2,
    });
  };

  const prefetchNextPage = async (
    currentParams: FinanceQueryParams,
    hasNextPage: boolean
  ) => {
    if (hasNextPage) {
      await prefetchPage({
        ...currentParams,
        page: (currentParams.page || 1) + 1,
      });
    }
  };

  const prefetchAdjacentPages = async (
    currentParams: FinanceQueryParams,
    meta: { hasNextPage: boolean; hasPreviousPage: boolean }
  ) => {
    const promises = [];
    
    if (meta.hasNextPage) {
      promises.push(
        prefetchPage({
          ...currentParams,
          page: (currentParams.page || 1) + 1,
        })
      );
    }
    
    if (meta.hasPreviousPage) {
      promises.push(
        prefetchPage({
          ...currentParams,
          page: (currentParams.page || 1) - 1,
        })
      );
    }

    await Promise.all(promises);
  };

  return {
    prefetchPage,
    prefetchNextPage,
    prefetchAdjacentPages,
  };
}

/**
 * Hook to invalidate finance data (useful after mutations)
 */
export function useInvalidateFinance() {
  const queryClient = useQueryClient();

  const invalidateAll = () => {
    return queryClient.invalidateQueries({
      queryKey: financeKeys.all,
    });
  };

  const invalidateList = () => {
    return queryClient.invalidateQueries({
      queryKey: financeKeys.lists(),
    });
  };

  return {
    invalidateAll,
    invalidateList,
  };
}