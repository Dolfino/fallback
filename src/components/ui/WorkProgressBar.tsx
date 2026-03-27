interface WorkProgressBarProps {
  value: number;
}

export function WorkProgressBar({ value }: WorkProgressBarProps) {
  return (
    <div className="space-y-1">
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent to-emerald-500"
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <p className="text-[11px] font-medium text-slate-500">{value}% do trabalho concluído</p>
    </div>
  );
}
