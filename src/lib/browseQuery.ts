/** Cache catalogue metadata only; never apply this to payments or access checks. */
export const browseQueryOptions = {
  staleTime: 2 * 60 * 1000,
  gcTime: 10 * 60 * 1000,
  refetchOnWindowFocus: false,
  retry: 1,
} as const;

/** Bound read-only requests so a stalled connection offers a retry, not an endless loader. */
export function browseReadSignal(): AbortSignal {
  return AbortSignal.timeout(15_000);
}