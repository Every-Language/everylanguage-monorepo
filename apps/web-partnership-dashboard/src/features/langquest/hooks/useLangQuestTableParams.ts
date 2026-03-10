'use client';

import { useCallback, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

const FILTER_ALL = '__all__';

const PARAM_KEYS = {
  search: 'q',
  template: 'template',
  versification_template: 'versification_template',
  private: 'private',
  visible: 'visible',
  active: 'active',
  page: 'page',
  pageSize: 'pageSize',
} as const;

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;

export function useLangQuestTableParams(): {
  searchTerm: string;
  filters: Record<string, string>;
  page: number;
  pageSize: number;
  onSearchTermChange: (value: string) => void;
  onFilterChange: (key: string, value: string) => void;
  onClearFilters: () => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
} {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const searchTerm = searchParams.get(PARAM_KEYS.search) ?? '';
  const filters = useMemo(
    () => ({
      template: searchParams.get(PARAM_KEYS.template) ?? FILTER_ALL,
      versification_template:
        searchParams.get(PARAM_KEYS.versification_template) ?? '',
      private: searchParams.get(PARAM_KEYS.private) ?? FILTER_ALL,
      visible: searchParams.get(PARAM_KEYS.visible) ?? FILTER_ALL,
      active: searchParams.get(PARAM_KEYS.active) ?? FILTER_ALL,
    }),
    [searchParams]
  );
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
        if (value === null || value === '' || value === FILTER_ALL) {
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
      setParams({ [PARAM_KEYS.search]: value || null });
    },
    [setParams]
  );

  const onFilterChange = useCallback(
    (key: string, value: string) => {
      const paramKey =
        key === 'private'
          ? PARAM_KEYS.private
          : key === 'visible'
            ? PARAM_KEYS.visible
            : key === 'active'
              ? PARAM_KEYS.active
              : key === 'template'
                ? PARAM_KEYS.template
                : key === 'versification_template'
                  ? PARAM_KEYS.versification_template
                  : key;
      setParams({ [paramKey]: value === FILTER_ALL ? null : value });
    },
    [setParams]
  );

  const onClearFilters = useCallback(() => {
    setParams({
      [PARAM_KEYS.search]: null,
      [PARAM_KEYS.template]: null,
      [PARAM_KEYS.versification_template]: null,
      [PARAM_KEYS.private]: null,
      [PARAM_KEYS.visible]: null,
      [PARAM_KEYS.active]: null,
      [PARAM_KEYS.page]: null,
    });
  }, [setParams]);

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
    filters,
    page,
    pageSize,
    onSearchTermChange,
    onFilterChange,
    onClearFilters,
    onPageChange,
    onPageSizeChange,
  };
}
