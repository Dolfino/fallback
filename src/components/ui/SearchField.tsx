import { Search } from "lucide-react";

interface SearchFieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}

export function SearchField({
  label,
  placeholder,
  value,
  onChange,
}: SearchFieldProps) {
  return (
    <label className="block space-y-2.5">
      <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
        {label}
      </span>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-accent focus:bg-white"
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          value={value}
        />
      </div>
    </label>
  );
}
