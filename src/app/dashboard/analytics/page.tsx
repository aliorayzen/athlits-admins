"use client";

import { useState, type FormEvent } from "react";
import {
  Apple,
  ArrowUpRight,
  BarChart3,
  Check,
  Play,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  defaultStoreRange,
  STORE_NAMES,
  validateStoreRange,
} from "@/lib/store-analytics";
import type { StorePlatform } from "@/types/store-analytics";
import {
  ImportReport,
  QualityReport,
  SummaryReport,
} from "./_components/store-reports";
import { TimeseriesReport } from "./_components/timeseries-report";

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [platform, setPlatform] = useState<StorePlatform | null>(null);
  const [range, setRange] = useState(defaultStoreRange);
  const [draft, setDraft] = useState(range);
  const [validation, setValidation] = useState<string>();
  const [revision, setRevision] = useState(0);

  if (user?.role !== "ADMIN")
    return (
      <div role="alert" className="p-6 text-sm text-[var(--text-2)]">
        Store analytics is available to administrators only.
      </div>
    );

  function applyRange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const error = validateStoreRange(draft);
    setValidation(error);
    if (error) return;
    setRange({ ...draft });
    setRevision((value) => value + 1);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 text-[var(--text-1)]">
      <header>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--teal-text)]">
          Analytics
        </p>
        <h1 className="text-[26px] font-semibold tracking-tight">
          Store analytics
        </h1>
        <p className="mt-2 max-w-prose text-sm leading-6 text-[var(--text-3)]">
          Select a store to explore acquisition, daily activity, and app
          quality. Reports can arrive several days after activity occurs.
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2" aria-label="Select a store">
        {(["GOOGLE_PLAY", "APPLE"] as const).map((store) => {
          const selected = platform === store;
          const Icon = store === "APPLE" ? Apple : Play;
          return (
            <button
              key={store}
              type="button"
              aria-pressed={selected}
              aria-controls="store-report"
              onClick={() => setPlatform(store)}
              className={`group rounded-xl border p-5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--teal)] ${selected ? "border-[var(--teal)] bg-[var(--teal-subtle)]" : "border-[var(--border)] bg-[var(--bg-1)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-2)]"}`}
            >
              <span className="flex items-center justify-between">
                <Icon
                  className="h-6 w-6 text-[var(--text-2)]"
                  aria-hidden="true"
                />
                {selected ? (
                  <Check
                    className="h-5 w-5 text-[var(--teal-text)]"
                    aria-hidden="true"
                  />
                ) : (
                  <ArrowUpRight
                    className="h-5 w-5 text-[var(--text-3)]"
                    aria-hidden="true"
                  />
                )}
              </span>
              <span className="mt-5 block text-lg font-semibold">
                {STORE_NAMES[store]}
              </span>
              <span className="mt-1 block text-sm text-[var(--text-3)]">
                {store === "APPLE"
                  ? "Discovery, downloads, and engagement"
                  : "User installs, active devices, and ratings"}
              </span>
              <span
                className={`mt-4 block text-xs font-medium ${selected ? "text-[var(--teal-text)]" : "text-[var(--text-3)]"}`}
              >
                {selected ? "Selected" : "View analytics"}
              </span>
            </button>
          );
        })}
      </div>
      <div id="store-report">
        {!platform ? (
          <div className="flex items-center gap-3 rounded-lg bg-[var(--bg-1)] p-6 text-sm text-[var(--text-3)]">
            <BarChart3 className="h-5 w-5 shrink-0" aria-hidden="true" />
            Choose Google Play or App Store to load its report.
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">
                {STORE_NAMES[platform]} report
              </h2>
              <Button
                variant="outline"
                onClick={() => setRevision((value) => value + 1)}
              >
                <RefreshCw className="h-4 w-4" />
                Refresh reports
              </Button>
            </div>
            <form onSubmit={applyRange} className="space-y-2">
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-2">
                  <label
                    htmlFor="store-from"
                    className="text-xs text-[var(--text-3)]"
                  >
                    From
                  </label>
                  <Input
                    id="store-from"
                    type="date"
                    required
                    value={draft.from}
                    onChange={(event) =>
                      setDraft({ ...draft, from: event.target.value })
                    }
                    aria-invalid={!!validation}
                    aria-describedby={
                      validation ? "store-range-error" : undefined
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="store-to"
                    className="text-xs text-[var(--text-3)]"
                  >
                    To
                  </label>
                  <Input
                    id="store-to"
                    type="date"
                    required
                    value={draft.to}
                    onChange={(event) =>
                      setDraft({ ...draft, to: event.target.value })
                    }
                    aria-invalid={!!validation}
                    aria-describedby={
                      validation ? "store-range-error" : undefined
                    }
                  />
                </div>
                <Button type="submit">Apply dates</Button>
              </div>
              {validation && (
                <p
                  id="store-range-error"
                  role="alert"
                  className="text-sm text-[var(--semantic-red)]"
                >
                  {validation}
                </p>
              )}
              <p className="text-xs text-[var(--text-3)]">
                Showing {range.from} to {range.to}, inclusive. Up to 366 days.
              </p>
            </form>
            <div
              key={`${platform}-${range.from}-${range.to}-${revision}`}
              className="space-y-8"
            >
              <div className="grid gap-8 lg:grid-cols-2">
                <SummaryReport platform={platform} range={range} />
                <QualityReport platform={platform} range={range} />
              </div>
              <TimeseriesReport platform={platform} range={range} />
              <ImportReport platform={platform} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
