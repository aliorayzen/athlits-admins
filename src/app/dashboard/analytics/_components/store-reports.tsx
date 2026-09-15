"use client";

import { useCallback } from "react";
import {
  getStoreImportStatus,
  getStoreQuality,
  getStoreSummary,
} from "@/lib/store-analytics-api";
import {
  formatStoreValue,
  metricLabel,
  STORE_NAMES,
} from "@/lib/store-analytics";
import type { StoreDateRange, StorePlatform } from "@/types/store-analytics";
import {
  EmptyReport,
  Freshness,
  ReportSection,
  useStoreReport,
} from "./report-primitives";

export function SummaryReport({
  platform,
  range,
}: {
  platform: StorePlatform;
  range: StoreDateRange;
}) {
  const { data, error } = useStoreReport(
    useCallback(
      (signal: AbortSignal) => getStoreSummary(range, signal),
      [range],
    ),
  );
  const summary = data?.platforms?.find((item) => item.platform === platform);
  return (
    <ReportSection
      title={`${STORE_NAMES[platform]} summary`}
      error={error}
      loading={!data && !error}
    >
      <Freshness date={summary?.dataThrough} />
      {!summary?.dataThrough ? (
        <EmptyReport>
          No data yet. Store reports appear after the first successful import.
          Daily imports require configured store credentials.
        </EmptyReport>
      ) : !summary.metrics?.length ? (
        <EmptyReport>
          No metrics reported for this date range. Try an earlier or wider
          range.
        </EmptyReport>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-3)]">
                <th className="py-3 font-medium">Metric</th>
                <th className="py-3 text-right font-medium">Reported total</th>
              </tr>
            </thead>
            <tbody>
              {summary.metrics.map((metric) => (
                <tr
                  key={metric.metricKey}
                  className="border-b border-[var(--border)] last:border-0"
                >
                  <th
                    scope="row"
                    className="py-3 text-left font-normal text-[var(--text-2)]"
                  >
                    {metricLabel(platform, metric.metricKey)}
                  </th>
                  <td className="py-3 text-right font-mono tabular-nums">
                    {formatStoreValue(metric.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs leading-5 text-[var(--text-3)]">
        Totals are supplied by {STORE_NAMES[platform]}. Store measurements
        differ and are not combined. Use quality for the latest rating.
      </p>
    </ReportSection>
  );
}

export function QualityReport({
  platform,
  range,
}: {
  platform: StorePlatform;
  range: StoreDateRange;
}) {
  const { data, error } = useStoreReport(
    useCallback(
      (signal: AbortSignal) => getStoreQuality(platform, range, signal),
      [platform, range],
    ),
  );
  return (
    <ReportSection title="Quality" error={error} loading={!data && !error}>
      <Freshness date={data?.dataThrough} />
      <dl className="grid gap-6 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-[var(--text-3)]">Latest rating</dt>
          <dd className="mt-2 font-mono text-xl tabular-nums">
            {formatStoreValue(
              data?.dataThrough ? data.latestRating : undefined,
            )}
          </dd>
          {data?.dataThrough && data.latestRatingDate && (
            <dd className="mt-1 text-xs text-[var(--text-3)]">
              As of {data.latestRatingDate}
            </dd>
          )}
        </div>
        <div>
          <dt className="text-sm text-[var(--text-3)]">
            Crashes in selected range
          </dt>
          <dd className="mt-2 font-mono text-xl tabular-nums">
            {formatStoreValue(data?.dataThrough ? data.crashTotal : undefined)}
          </dd>
        </div>
      </dl>
    </ReportSection>
  );
}

export function ImportReport({ platform }: { platform: StorePlatform }) {
  const { data, error } = useStoreReport(
    useCallback((signal: AbortSignal) => getStoreImportStatus(signal), []),
  );
  const imports =
    data?.imports?.filter((item) => item.platform === platform) ?? [];
  return (
    <ReportSection
      title="Import status"
      error={error}
      loading={!data && !error}
    >
      <p className="text-xs text-[var(--text-3)]">
        Latest import records for {STORE_NAMES[platform]}, independent of the
        selected report dates.
      </p>
      {!imports.length ? (
        <EmptyReport>
          No imports yet. Imports run daily once store credentials are
          configured.
        </EmptyReport>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-xs text-[var(--text-3)]">
                {[
                  "Processing date",
                  "Source",
                  "Status",
                  "Rows",
                  "Imported at / error",
                ].map((label) => (
                  <th key={label} className="px-2 py-3 font-medium first:pl-0">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {imports.map((item, index) => (
                <tr
                  key={`${item.sourceType}-${item.processingDate}-${index}`}
                  className="border-b border-[var(--border)] last:border-0"
                >
                  <td className="py-3 pr-2 font-mono text-xs">
                    {item.processingDate ?? "Not reported"}
                  </td>
                  <td className="p-2 text-xs">
                    {item.sourceType ?? "Not reported"}
                  </td>
                  <td className="p-2">
                    <span
                      className={
                        item.status === "SUCCEEDED"
                          ? "text-[var(--green-text)]"
                          : item.status === "FAILED"
                            ? "text-[var(--red-text)]"
                            : "text-[var(--amber-text)]"
                      }
                    >
                      {item.status ?? "Not reported"}
                    </span>
                  </td>
                  <td className="p-2 font-mono tabular-nums">
                    {item.rowCount == null
                      ? "Not reported"
                      : formatStoreValue(item.rowCount)}
                  </td>
                  <td className="p-2 text-xs text-[var(--text-3)]">
                    <span>{item.importedAt ?? "Not reported"}</span>
                    {item.errorCode && (
                      <span className="mt-1 block text-[var(--red-text)]">
                        {item.errorCode}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ReportSection>
  );
}
