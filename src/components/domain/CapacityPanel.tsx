import { useMemo, useState } from "react";
import { HighlightedText } from "../ui/HighlightedText";
import { formatDateLong, formatDateShort, formatMinutes } from "../../utils/format";

interface CapacityPanelProps {
  days: Array<{ date: string; freeMin: number }>;
  searchTerm?: string;
  summary: {
    totalLabel: string;
    protegidosLabel: string;
    planejavelLabel: string;
    ocupadosLabel: string;
    livreLabel: string;
  };
}

export function CapacityPanel({ days, searchTerm, summary }: CapacityPanelProps) {
  const [duration, setDuration] = useState(90);
  const [deadline, setDeadline] = useState(days[days.length - 1]?.date ?? "");

  const simulation = useMemo(() => {
    let total = 0;
    const fitDay = days.find((day) => {
      total += day.freeMin;
      return total >= duration;
    });

    const cabe = Boolean(fitDay && deadline >= fitDay.date);

    return {
      cabe,
      inicio: days.find((day) => day.freeMin > 0)?.date,
      termino: fitDay?.date,
    };
  }, [days, deadline, duration]);

  return (
    <div className="grid grid-cols-[1.2fr_0.8fr] gap-5">
      <section className="rounded-[32px] border border-black/5 bg-white p-5 shadow-panel">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Capacidade operacional</h2>
        <div className="mt-5 grid grid-cols-5 gap-3">
          {[
            { label: "Total", value: summary.totalLabel },
            { label: "Protegida", value: summary.protegidosLabel },
            { label: "Planejável", value: summary.planejavelLabel },
            { label: "Ocupada", value: summary.ocupadosLabel },
            { label: "Livre", value: summary.livreLabel },
          ].map((metric) => (
            <div key={metric.label} className="rounded-3xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{metric.label}</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{metric.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 space-y-3">
          {days.length ? (
            days.map((day) => (
              <div key={day.date} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <HighlightedText
                      className="text-sm font-semibold text-slate-900"
                      query={searchTerm}
                      text={formatDateLong(day.date)}
                    />
                    <p className="text-xs text-slate-500">
                      <HighlightedText query={searchTerm} text={formatDateShort(day.date)} /> · capacidade livre por dia
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-accent-ink">{formatMinutes(day.freeMin)}</p>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(day.freeMin / 4, 100)}%` }} />
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              Nenhum dia encontrado para esta busca.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[32px] border border-black/5 bg-white p-5 shadow-panel">
        <h3 className="text-lg font-semibold tracking-tight text-slate-900">Simulador rápido</h3>
        <div className="mt-4 space-y-4">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Duração do novo trabalho</span>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-accent"
              min={25}
              onChange={(event) => setDuration(Number(event.target.value))}
              step={5}
              type="number"
              value={duration}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Prazo</span>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-accent"
              onChange={(event) => setDeadline(event.target.value)}
              type="date"
              value={deadline}
            />
          </label>

          <div className={`rounded-3xl p-4 ${simulation.cabe ? "bg-accent-soft text-accent-ink" : "bg-danger-soft text-danger-ink"}`}>
            <p className="text-sm font-semibold">{simulation.cabe ? "Cabe na capacidade atual" : "Não cabe sem replanejar"}</p>
            <p className="mt-2 text-sm">
              Início simulado: {simulation.inicio ? formatDateShort(simulation.inicio) : "sem espaço"}.
            </p>
            <p className="text-sm">
              Término simulado: {simulation.termino ? formatDateShort(simulation.termino) : "sem previsão"}.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
