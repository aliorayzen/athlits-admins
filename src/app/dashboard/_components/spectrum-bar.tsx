export interface SpectrumSegment {
  label: string;
  value: number;
}

const TINTS = [
  "bg-[linear-gradient(135deg,rgba(0,212,170,0.55),rgba(0,212,170,0.3))] text-[#d6fff4]",
  "bg-[linear-gradient(135deg,rgba(0,212,170,0.38),rgba(0,212,170,0.2))] text-[#c6f6e8]",
  "bg-[linear-gradient(135deg,rgba(0,212,170,0.22),rgba(0,212,170,0.1))] text-[#b4e5d6]",
  "bg-[linear-gradient(135deg,rgba(120,135,150,0.3),rgba(120,135,150,0.12))] text-[#d5dde8]",
  "bg-[linear-gradient(135deg,rgba(80,90,105,0.3),rgba(80,90,105,0.12))] text-[#b0b8c2]",
];

export function SpectrumBar({ segments }: { segments: SpectrumSegment[] }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const tops = segments.slice(0, 5);
  const gridTemplate = tops
    .map((s) => `${Math.max(6, (s.value / total) * 100)}fr`)
    .join(" ");

  return (
    <div className="dash-fade-up stg-5 mb-6 rounded-[14px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.008))] px-6 pb-5 pt-[22px]">
      <div className="mb-3.5 flex items-end justify-between">
        <div className="text-[13.5px] font-medium text-[var(--text-1)]">
          Venues by city
          <span className="ml-1.5 text-xs font-normal text-[var(--text-4)]">
            distribution
          </span>
        </div>
        <div className="text-[20px] font-semibold tracking-[-0.022em] tabular-nums">
          {total}
          <span className="ml-1 text-[13px] font-normal text-[var(--text-3)]">
            total
          </span>
        </div>
      </div>

      <div
        className="mb-2.5 grid h-[58px] gap-1"
        style={{ gridTemplateColumns: gridTemplate }}
      >
        {tops.map((s, i) => (
          <div
            key={s.label}
            className={`spectrum-seg relative flex cursor-pointer flex-col justify-between rounded-lg px-3 py-2.5 transition-all duration-200 hover:z-[2] hover:scale-y-[1.06] hover:brightness-[1.18] ${TINTS[i]}`}
            style={{ animationDelay: `${0.08 + i * 0.08}s` }}
            title={`${s.label} — ${Math.round((s.value / total) * 100)}%`}
          >
            <div className="font-mono text-[10.5px] uppercase tracking-[0.06em] opacity-90">
              {s.label}
            </div>
            <div className="text-sm font-semibold tracking-[-0.012em] tabular-nums">
              {s.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
