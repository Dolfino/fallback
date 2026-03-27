import type { ReactNode } from "react";

interface SummaryCardProps {
  label: string;
  value: string | number;
  meta?: string;
  icon?: ReactNode;
}

export function SummaryCard({ label, value, meta, icon }: SummaryCardProps) {
  return (
    <article className="rounded-3xl border border-black/5 bg-white p-4 shadow-panel">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
          {meta ? <p className="mt-2 text-sm text-slate-500">{meta}</p> : null}
        </div>
        {icon ? <div className="rounded-2xl bg-slate-100 p-3 text-slate-600">{icon}</div> : null}
      </div>
    </article>
  );
}
