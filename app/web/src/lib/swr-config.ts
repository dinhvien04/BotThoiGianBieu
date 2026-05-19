"use client";

import type { SWRConfiguration } from "swr";

/**
 * Global SWR config: dedup, không revalidate tự động khi focus (đỡ flicker),
 * retry 2 lần với backoff cho lỗi mạng tạm thời.
 */
export const swrConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateIfStale: true,
  shouldRetryOnError: true,
  errorRetryCount: 2,
  errorRetryInterval: 2000,
  dedupingInterval: 2000,
};
