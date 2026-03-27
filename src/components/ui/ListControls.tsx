import type { ReactNode } from "react";
import { SearchField } from "./SearchField";

interface ListControlsCardProps {
  children?: ReactNode;
  hint?: string;
  search?: {
    label: string;
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
  };
}

export function ListControlsCard({ children, hint, search }: ListControlsCardProps) {
  return (
    <section className="rounded-[32px] border border-black/5 bg-white p-5 shadow-panel">
      {search ? (
        <SearchField
          label={search.label}
          onChange={search.onChange}
          placeholder={search.placeholder}
          value={search.value}
        />
      ) : null}
      {hint ? <p className="mt-3 text-xs text-slate-500">{hint}</p> : null}
      {children ? (
        <div className={search || hint ? "mt-4 space-y-4 border-t border-slate-100 pt-4" : "space-y-4"}>{children}</div>
      ) : null}
    </section>
  );
}

export function ListControlsSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2.5">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <div>{children}</div>
    </div>
  );
}

interface ChoiceChipsProps<T extends string> {
  onChange: (value: T) => void;
  options: Array<{ id: T; label: string }>;
  value: T;
}

export function ChoiceChips<T extends string>({
  onChange,
  options,
  value,
}: ChoiceChipsProps<T>) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.id}
          className={`rounded-2xl border px-3 py-2 text-sm font-medium leading-none transition ${
            value === option.id
              ? "border-shell bg-shell text-white shadow-sm"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
          }`}
          onClick={() => onChange(option.id)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
