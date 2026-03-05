"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Paginator from "./Paginator";

type Props = {
  page: number;
  limit: number;
  total: number;
  pageSizeOptions?: number[];
};

export default function ServerPagination({
  page,
  limit,
  total,
  pageSizeOptions,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePageSizeChange = (newLimit: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("limit", newLimit.toString());
    params.set("page", "1"); // Reset to page 1 on limit change
    router.push(`${pathname}?${params.toString()}`);
  };

  // Skip rendering if total is 0 (optional based on UX preference, but empty states are good to show empty pagination or simply no pagination)
  if (total === 0) return null;

  return (
    <Paginator
      page={page}
      pageSize={limit}
      total={total}
      pageSizeOptions={pageSizeOptions}
      onPageChange={handlePageChange}
      onPageSizeChange={handlePageSizeChange}
    />
  );
}
