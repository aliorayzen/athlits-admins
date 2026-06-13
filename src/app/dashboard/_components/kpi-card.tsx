// KPI card + the four sparkline SVGs it composes. The sparks aren't reused
// outside KpiCard, so they live here rather than getting their own files.

export type ChipType = "up" | "down" | "flat";

interface KpiCardProps {
  label: string;
  value: string;
  currency?: string;
  delta?: string;
  deltaType?: ChipType;
  context?: string;
  spark: React.ReactNode;
  hero?: boolean;
  staggerClass: string;
}

export function KpiCard({
  label,
  value,
  currency,
  delta,
  deltaType = "flat",
  context,
  spark,
  hero,
  staggerClass,
}: KpiCardProps) {
  const chipClass =
    deltaType === "up"
      ? "bg-[var(--teal-subtle)] text-[var(--teal-text)] border-[rgba(0,212,170,0.22)]"
      : deltaType === "down"
        ? "bg-[rgba(244,63,94,0.08)] text-[#fda4af] border-[rgba(244,63,94,0.22)]"
        : "bg-[rgba(255,255,255,0.04)] text-[var(--text-3)] border-[var(--border)]";

  return (
    <div
      className={`dash-fade-up ${staggerClass} group relative overflow-hidden rounded-[14px] border px-[22px] py-[22px] transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(0,212,170,0.22)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.3)] ${
        hero
          ? "hero-shimmer border-[rgba(0,212,170,0.22)] bg-[linear-gradient(180deg,rgba(0,212,170,0.04),rgba(0,212,170,0.012))]"
          : "border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.008))]"
      }`}
    >
      <div className="pointer-events-none absolute right-0 top-0 h-[100px] w-[140px] bg-[radial-gradient(circle_at_100%_0%,rgba(0,212,170,0.08),transparent_70%)] opacity-60 transition-opacity group-hover:opacity-100" />
      <div className="relative">
        <div className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-[var(--text-3)]">
          {label}
        </div>
        <div
          className={`mt-3 flex items-baseline gap-2 font-semibold leading-none tabular-nums text-[var(--text-1)] ${
            hero
              ? "text-[52px] tracking-[-0.04em]"
              : "text-[34px] tracking-[-0.032em]"
          }`}
        >
          {currency && (
            <span className="text-[0.5em] font-medium tracking-[0.02em] text-[var(--text-3)]">
              {currency}
            </span>
          )}
          {value}
        </div>
        {(delta || context) && (
          <div className="mt-3 flex items-center gap-2.5">
            {delta && (
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums ${chipClass}`}
              >
                {deltaType === "up" && "▲ "}
                {deltaType === "down" && "▼ "}
                {deltaType === "flat" && "= "}
                {delta}
              </span>
            )}
            {context && (
              <span className="text-xs text-[var(--text-3)]">{context}</span>
            )}
          </div>
        )}
        <div className="relative mt-[18px] h-11">{spark}</div>
      </div>
    </div>
  );
}

export function HeroSpark() {
  return (
    <svg
      viewBox="0 0 220 50"
      preserveAspectRatio="none"
      className="h-full w-full overflow-visible"
    >
      <defs>
        <linearGradient id="kpi-hero-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00d4aa" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#00d4aa" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        className="chart-area"
        d="M0 38 L20 34 L40 30 L60 32 L80 26 L100 22 L120 24 L140 18 L160 14 L180 16 L200 10 L220 6 L220 50 L0 50 Z"
        fill="url(#kpi-hero-fill)"
      />
      <path
        className="spark-path"
        d="M0 38 L20 34 L40 30 L60 32 L80 26 L100 22 L120 24 L140 18 L160 14 L180 16 L200 10 L220 6"
        fill="none"
        stroke="#1de9b6"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BarSpark() {
  const bars = [
    [28, 14],
    [22, 20],
    [18, 24],
    [26, 16],
    [14, 28],
    [20, 22],
    [10, 32],
    [16, 26],
    [12, 30],
    [18, 24],
    [8, 34],
    [14, 28],
    [6, 36],
    [10, 32],
  ];
  return (
    <svg
      viewBox="0 0 180 44"
      preserveAspectRatio="none"
      className="h-full w-full overflow-visible"
    >
      <g fill="#1de9b6" opacity="0.85">
        {bars.map(([y, h], i) => (
          <rect
            key={i}
            className="spark-bar"
            x={2 + i * 12}
            y={y}
            width={8}
            height={h}
            rx={1.5}
            style={{ animationDelay: `${0.5 + i * 0.05}s` }}
          />
        ))}
      </g>
    </svg>
  );
}

export function FlatSpark() {
  return (
    <svg
      viewBox="0 0 180 44"
      preserveAspectRatio="none"
      className="h-full w-full overflow-visible"
    >
      <path
        className="spark-path"
        d="M2 22 L178 22"
        stroke="#1de9b6"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
        fill="none"
      />
      <circle cx="178" cy="22" r="3" fill="#1de9b6" className="chart-area" />
      <circle
        cx="178"
        cy="22"
        r="6"
        fill="#1de9b6"
        opacity="0.2"
        className="chart-area"
      />
    </svg>
  );
}

export function CurveSpark() {
  return (
    <svg
      viewBox="0 0 180 44"
      preserveAspectRatio="none"
      className="h-full w-full overflow-visible"
    >
      <path
        className="spark-path"
        d="M0 32 Q30 28 45 24 T90 20 T135 14 T180 10"
        fill="none"
        stroke="#1de9b6"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="180" cy="10" r="3" fill="#1de9b6" className="chart-area" />
    </svg>
  );
}
