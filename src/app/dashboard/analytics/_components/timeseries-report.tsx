"use client";

import { useCallback, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getStoreTimeseries } from "@/lib/store-analytics-api";
import {
  formatStoreValue,
  metricLabel,
  STORE_METRICS,
  type StoreMetric,
} from "@/lib/store-analytics";
import type { StoreDateRange, StorePlatform } from "@/types/store-analytics";
import {
  EmptyReport,
  Freshness,
  ReportSection,
  useStoreReport,
} from "./report-primitives";

function SeriesData({
  platform,
  range,
  metric,
  territory,
}: {
  platform: StorePlatform;
  range: StoreDateRange;
  metric: StoreMetric;
  territory: string;
}) {
  const { data, error } = useStoreReport(
    useCallback(
      (signal: AbortSignal) =>
        getStoreTimeseries(platform, metric, range, territory, signal),
      [platform, metric, range, territory],
    ),
  );
  const points = data?.dataThrough
    ? [...(data.points ?? [])].sort((a, b) =>
        a.metricDate.localeCompare(b.metricDate),
      )
    : [];
  return (
    <ReportSection
      title={`${metricLabel(platform, metric)} · ${territory || "All territories"}`}
      error={error}
      loading={!data && !error}
    >
      <Freshness date={data?.dataThrough} />
      {!points.length ? (
        <EmptyReport>
          {data?.dataThrough
            ? "No observations for this metric, date range, and territory. Try another selection."
            : "No data yet. Daily observations will appear after a successful import."}
        </EmptyReport>
      ) : (
        <div className="max-h-80 overflow-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">
              Daily observations. Missing dates are not treated as zero.
            </caption>
            <thead className="sticky top-0 bg-[var(--bg-0)]">
              <tr className="text-left text-xs text-[var(--text-3)]">
                <th className="py-3 font-medium">Date</th>
                <th className="py-3 text-right font-medium">
                  {metricLabel(platform, metric)}
                </th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr
                  key={point.metricDate}
                  className="border-t border-[var(--border)]"
                >
                  <th
                    scope="row"
                    className="py-2.5 text-left font-mono text-xs font-normal"
                  >
                    {point.metricDate}
                  </th>
                  <td className="py-2.5 text-right font-mono tabular-nums">
                    {formatStoreValue(point.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-[var(--text-3)]">
        Only reported dates are shown. Missing dates do not mean zero activity.
      </p>
    </ReportSection>
  );
}

export function TimeseriesReport({
  platform,
  range,
}: {
  platform: StorePlatform;
  range: StoreDateRange;
}) {
  const initialMetric =
    platform === "APPLE" ? "FIRST_TIME_DOWNLOADS" : "DAILY_USER_INSTALLS";
  const [metric, setMetric] = useState<StoreMetric>(initialMetric);
  const [territory, setTerritory] = useState("");
  const [query, setQuery] = useState({
    metric: initialMetric as StoreMetric,
    territory: "",
    revision: 0,
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery({
      metric,
      territory: territory.trim().toUpperCase(),
      revision: query.revision + 1,
    });
  }
  return (
    <div className="space-y-5">
      <h3 className="text-base font-semibold">Daily activity</h3>
      <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1 basis-52 space-y-2">
          <label
            htmlFor="store-metric"
            className="text-xs text-[var(--text-3)]"
          >
            Metric
          </label>
          <select
            id="store-metric"
            value={metric}
            onChange={(event) => setMetric(event.target.value as StoreMetric)}
            className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-0)] px-3 text-sm focus-visible:outline-2 focus-visible:outline-[var(--teal)]"
          >
            {STORE_METRICS[platform].map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="w-40 space-y-2">
          <label
            htmlFor="store-territory"
            className="text-xs text-[var(--text-3)]"
          >
            Territory (optional)
          </label>
          <Input
            id="store-territory"
            placeholder="All territories"
            value={territory}
            onChange={(event) => setTerritory(event.target.value.toUpperCase())}
            maxLength={2}
            pattern="[A-Za-z]{2}"
            title="Two-letter country code, for example LB"
          />
        </div>
        <Button type="submit" variant="outline">
          Apply metric
        </Button>
      </form>
      <SeriesData
        key={`${query.metric}-${query.territory}-${query.revision}`}
        platform={platform}
        range={range}
        metric={query.metric}
        territory={query.territory}
      />
    </div>
  );
}
