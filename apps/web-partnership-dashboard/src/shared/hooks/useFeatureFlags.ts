'use client';

import { env } from '@/lib/env';

/**
 * Hook to check if donate feature is enabled
 * @returns true if donate feature is enabled, false otherwise
 */
export function useDonateEnabled(): boolean {
  return env.NEXT_PUBLIC_ENABLE_DONATE;
}

/**
 * Hook to check if projects feature is enabled
 * @returns true if projects feature is enabled, false otherwise
 */
export function useProjectsEnabled(): boolean {
  return env.NEXT_PUBLIC_ENABLE_PROJECTS;
}

/**
 * Hook to check if operations feature is enabled
 * @returns true if operations feature is enabled, false otherwise
 */
export function useOperationsEnabled(): boolean {
  return env.NEXT_PUBLIC_ENABLE_OPERATIONS;
}
