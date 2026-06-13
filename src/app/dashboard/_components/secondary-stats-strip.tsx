export type StatTone = "neutral" | "teal" | "amber" | "rose";

export interface MiniStat {
  label: string;
  value: string;
  hint?: string;
  tone?: StatTone;
}

function toneClass(tone?: StatTone): string {
  switch (tone) {
    case "teal":
      return "text-[var(--teal-text)]";
    case "amber":
      return "text-[#fcd34d]";
    case "rose":
      return "text-[#fda4af]";
    default:
      return "text-[var(--text-1)]";
  }
}

export function SecondaryStatsStrip({ stats }: { stats: MiniStat[] }) {
  return (
    <div className="dash-fade-up stg-5 grid grid-cols-2 gap-px overflow-hidden rounded-[12px] border border-[var(--border)] bg-[var(--border)] sm:grid-cols-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className="flex flex-col justify-center gap-1 bg-[var(--bg-0)] px-5 py-3.5 transition-colors hover:bg-[rgba(255,255,255,0.02)]"
        >
          <div className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-[var(--text-3)]">
            {s.label}
          </div>
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-[20px] font-semibold tracking-[-0.022em] tabular-nums ${toneClass(s.tone)}`}
            >
              {s.value}
            </span>
            {s.hint && (
              <span className="truncate text-xs text-[var(--text-3)]">
                {s.hint}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
