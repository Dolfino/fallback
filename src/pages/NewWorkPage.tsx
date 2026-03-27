import { addDays } from "../utils/date";
import { formatDateShort, formatMinutes } from "../utils/format";
import type { PlannerController } from "../hooks/usePlannerState";
import { getCapacitySummary, getTimelineForDate } from "../data/selectors";
import { NewWorkForm } from "../components/domain/NewWorkForm";
import { SummaryCard } from "../components/ui/SummaryCard";

export function NewWorkPage({ controller }: { controller: PlannerController }) {
  const capacity = getCapacitySummary(controller.plannerData);
  const days = controller.plannerData.diasSemana.map((date) => {
    const timeline = getTimelineForDate(controller.plannerData, date);
    const freeMin = timeline.filter((item) => !item.alocacao).length * 25;
    return { date, freeMin };
  });

  const simulateForecast = (minutes: number) => {
    let remaining = minutes;
    const target = days.find((day) => {
      remaining -= day.freeMin;
      return remaining <= 0;
    });

    return target ? formatDateShort(target.date) : "requer ajuste de capacidade";
  };

  return (
    <div className="grid h-full grid-cols-[minmax(0,1fr)_340px] gap-5">
      <div className="scrollbar-thin overflow-y-auto pr-1">
        <NewWorkForm
          defaultDeadline={addDays(controller.selectedDate, 3)}
          defaultStartDate={controller.selectedDate}
          onSubmit={controller.addWork}
          simulateForecast={simulateForecast}
        />
      </div>

      <div className="scrollbar-thin space-y-5 overflow-y-auto">
        <SummaryCard label="Capacidade livre na semana" meta="sem proteção" value={capacity.livreLabel} />
        <SummaryCard label="Capacidade planejável" meta="reservas já descontadas" value={capacity.planejavelLabel} />
        <section className="rounded-[32px] border border-black/5 bg-white p-5 shadow-panel">
          <h3 className="text-lg font-semibold tracking-tight text-slate-900">Leitura rápida de agenda</h3>
          <div className="mt-4 space-y-3">
            {days.map((day) => (
              <div key={day.date} className="rounded-3xl bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-slate-700">{formatDateShort(day.date)}</span>
                  <span className="text-sm font-semibold text-accent-ink">{formatMinutes(day.freeMin)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
