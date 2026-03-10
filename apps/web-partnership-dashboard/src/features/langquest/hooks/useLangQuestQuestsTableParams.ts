'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

const PARAM_KEYS = {
  search: 'q',
  page: 'page',
  pageSize: 'pageSize',
} as const;

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;

export function useLangQuestQuestsTableParams(): {
  searchTerm: string;
  page: number;
  pageSize: number;
  onSearchTermChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
} {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const searchTerm = searchParams.get(PARAM_KEYS.search) ?? '';
  const page = Math.max(
    1,
    parseInt(searchParams.get(PARAM_KEYS.page) ?? String(DEFAULT_PAGE), 10) ||
      DEFAULT_PAGE
  );
  const pageSize = (() => {
    const p = parseInt(
      searchParams.get(PARAM_KEYS.pageSize) ?? String(DEFAULT_PAGE_SIZE),
      10
    );
    return p >= 10 && p <= 100 ? p : DEFAULT_PAGE_SIZE;
  })();

  const setParams = useCallback(
    (updates: Record<string, string | number | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === '') {
          next.delete(key);
        } else {
          next.set(key, String(value));
        }
      });
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams]
  );

  const onSearchTermChange = useCallback(
    (value: string) => {
      setParams({
        [PARAM_KEYS.search]: value || null,
        [PARAM_KEYS.page]: null,
      });
    },
    [setParams]
  );

  const onPageChange = useCallback(
    (p: number) => {
      setParams({ [PARAM_KEYS.page]: p <= 1 ? null : p });
    },
    [setParams]
  );

  const onPageSizeChange = useCallback(
    (size: number) => {
      setParams({
        [PARAM_KEYS.pageSize]: size === DEFAULT_PAGE_SIZE ? null : size,
        [PARAM_KEYS.page]: null,
      });
    },
    [setParams]
  );

  return {
    searchTerm,
    page,
    pageSize,
    onSearchTermChange,
    onPageChange,
    onPageSizeChange,
  };
}
