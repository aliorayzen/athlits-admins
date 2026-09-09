import { apiClient } from "@/lib/api-client";
import {
  STORE_METRICS,
  validateStoreRange,
  type StoreMetric,
} from "@/lib/store-analytics";
import type {
  StoreDateRange,
  StoreImportStatus,
  StorePlatform,
  StoreQuality,
  StoreSummary,
  StoreTimeseries,
} from "@/types/store-analytics";

const BASE = "/api/admin/v1/store-analytics";

async function readStoreReport<T>(
  path: string,
  params: object,
  signal?: AbortSignal,
): Promise<T> {
  // Null-omitting envelopes may contain only `data`, so unwrap explicitly here.
  const { data: envelope } = await apiClient.get<{ data: T }>(
    `${BASE}/${path}`,
    {
      params,
      signal,
      timeout: 30_000,
      preserveEnvelope: true,
    },
  );
  if (!envelope || !("data" in envelope) || envelope.data == null) {
    throw new Error("The store report response was incomplete. Please retry.");
  }
  return envelope.data;
}

function checkRange(range: StoreDateRange) {
  const error = validateStoreRange(range);
  if (error) throw new Error(error);
}

export function getStoreSummary(range: StoreDateRange, signal?: AbortSignal) {
  checkRange(range);
  return readStoreReport<StoreSummary>("summary", range, signal);
}

export function getStoreQuality(
  platform: StorePlatform,
  range: StoreDateRange,
  signal?: AbortSignal,
) {
  checkRange(range);
  return readStoreReport<StoreQuality>(
    "quality",
    { platform, ...range },
    signal,
  );
}

export function getStoreTimeseries(
  platform: StorePlatform,
  metric: StoreMetric,
  range: StoreDateRange,
  territory?: string,
  signal?: AbortSignal,
) {
  checkRange(range);
  if (!STORE_METRICS[platform].some(([key]) => key === metric))
    throw new Error("Choose a metric for the selected store.");
  return readStoreReport<StoreTimeseries>(
    "timeseries",
    { platform, metric, ...range, ...(territory ? { territory } : {}) },
    signal,
  );
}

export function getStoreImportStatus(signal?: AbortSignal) {
  return readStoreReport<StoreImportStatus>("import-status", {}, signal);
}
