import { AlertTriangle, Lightbulb } from "lucide-react";

interface AlertListProps {
  title: string;
  items: string[];
  tone?: "alert" | "tip";
}

export function AlertList({ title, items, tone = "alert" }: AlertListProps) {
  const Icon = tone === "alert" ? AlertTriangle : Lightbulb;
  const iconStyle =
    tone === "alert"
      ? "bg-danger-soft text-danger-ink"
      : "bg-accent-soft text-accent-ink";

  return (
    <section className="rounded-3xl border border-black/5 bg-white p-5 shadow-panel">
      <div className="mb-4 flex items-center gap-3">
        <div className={`rounded-2xl p-2 ${iconStyle}`}>
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item} className="rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-600">
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}
