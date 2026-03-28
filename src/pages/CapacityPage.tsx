import { useDeferredValue, useMemo, useState } from "react";
import { CapacityPanel } from "../components/domain/CapacityPanel";
import { ListControlsCard } from "../components/ui/ListControls";
import { getCapacitySummary, getRemainingHorizonDates, getTimelineForDate } from "../data/selectors";
import type { PlannerController } from "../hooks/usePlannerState";
import { formatDateLong, formatDateShort, formatWeekday } from "../utils/format";

export function CapacityPage({ controller }: { controller: PlannerController }) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const visibleDates = getRemainingHorizonDates(controller.plannerData, controller.selectedDate);
  const summary = getCapacitySummary(controller.plannerData, visibleDates);
  const days = visibleDates.map((date) => {
    const timeline = getTimelineForDate(controller.plannerData, date);
    return {
      date,
      freeMin: timeline.filter((item) => !item.alocacao).length * 25,
    };
  });

  const filteredDays = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    if (!query) {
      return days;
    }

    return days.filter((day) =>
      [formatDateLong(day.date), formatDateShort(day.date), formatWeekday(day.date)]
        .some((value) => value.toLowerCase().includes(query)),
    );
  }, [days, deferredSearch]);

  return (
    <div className="space-y-5">
      <ListControlsCard
        hint={`${filteredDays.length} ${filteredDays.length === 1 ? "dia visível" : "dias visíveis"} na leitura de capacidade`}
        search={{
          label: "Busca de capacidade",
          onChange: setSearch,
          placeholder: "Buscar dia ou data",
          value: search,
        }}
      />
      <CapacityPanel days={filteredDays} searchTerm={search} summary={summary} />
    </div>
  );
}
