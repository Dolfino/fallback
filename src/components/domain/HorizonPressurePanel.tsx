import type { PressurePoint, ShortHorizonLoadDay } from "../../data/selectors";
import { formatDateShort } from "../../utils/format";

interface HorizonPressurePanelProps {
  load: ShortHorizonLoadDay[];
  points: PressurePoint[];
  title?: string;
  subtitle?: string;
  onSelectPoint?: (point: PressurePoint) => void;
}

function pressureStyles(level: ShortHorizonLoadDay["pressureLevel"]) {
  const styles = {
    stable: "border-slate-200 bg-slate-50 text-slate-700",
    watch: "border-warn/20 bg-warn-soft text-warn-ink",
    critical: "border-danger/20 bg-danger-soft text-danger-ink",
  };

  return styles[level];
}

export function HorizonPressurePanel({
  load,
  points,
  title = "Pressão do horizonte",
  subtitle = "Leitura curta dos próximos 2 a 3 dias.",
  onSelectPoint,
}: HorizonPressurePanelProps) {
  return (
    <section className="rounded-[32px] border border-black/5 bg-white p-5 shadow-panel">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Horizonte curto</p>
          <h3 className="mt-2 text-lg font-semibold tracking-tight text-slate-900">{title}</h3>
          <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {load.map((day) => (
          <div
            key={day.date}
            className={`rounded-3xl border px-4 py-4 ${pressureStyles(day.pressureLevel)}`}
          >
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] opacity-70">
              {formatDateShort(day.date)}
            </p>
            <p className="mt-2 text-sm font-semibold">
              {day.ocupados} ocupados · {day.livres} livres
            </p>
            <p className="mt-2 text-sm opacity-90">
              {day.riskCount} em risco · {day.blockedCount} bloqueados
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {points.length ? (
          points.slice(0, 3).map((point) => (
            <button
              key={point.id}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm transition hover:border-slate-300 hover:bg-white"
              onClick={() => onSelectPoint?.(point)}
              type="button"
            >
              <p className="font-semibold text-slate-900">{point.title}</p>
              <p className="mt-1 text-slate-600">
                {formatDateShort(point.date)} • {point.detail}
              </p>
            </button>
          ))
        ) : (
          <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-500">
            Sem pressão relevante no horizonte curto.
          </div>
        )}
      </div>
    </section>
  );
}
