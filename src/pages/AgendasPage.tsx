import { useDeferredValue, useMemo, useState } from "react";
import {
  getRemainingHorizonDates,
  getSuggestionsForSlot,
  getTimelineForDate,
} from "../data/selectors";
import type { PlannerController } from "../hooks/usePlannerState";
import { formatMinutes } from "../utils/format";
import { AgendaDetailPanel } from "../components/domain/AgendaDetailPanel";
import { AgendaItemCard } from "../components/domain/AgendaItemCard";
import { ChoiceChips, ListControlsSection } from "../components/ui/ListControls";
import { SearchField } from "../components/ui/SearchField";
import { SummaryCard } from "../components/ui/SummaryCard";

export function AgendasPage({ controller }: { controller: PlannerController }) {
  const [scope, setScope] = useState<"day" | "week">("day");
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | "occupied" | "free" | "risk">("all");
  const [sortMode, setSortMode] = useState<"time" | "priority" | "risk">("time");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const visibleDates = getRemainingHorizonDates(controller.plannerData, controller.selectedDate);
  const agendaEntries = useMemo(
    () =>
      (scope === "day" ? [controller.selectedDate] : visibleDates).flatMap((date) =>
        getTimelineForDate(controller.plannerData, date).map((item) => ({
          date,
          item,
          suggestions: getSuggestionsForSlot(controller.plannerData, date, item.slot.id),
        })),
      ),
    [controller.plannerData, controller.selectedDate, scope, visibleDates],
  );
  const filteredEntries = useMemo(
    () =>
      agendaEntries.filter((entry) => {
        if (visibilityFilter === "occupied") {
          return Boolean(entry.item.alocacao);
        }

        if (visibilityFilter === "free") {
          return !entry.item.alocacao;
        }

        if (visibilityFilter === "risk") {
          return (
            entry.item.riskLevel !== "healthy" ||
            Boolean(entry.item.dependencia) ||
            Boolean(entry.item.trabalho?.emRisco)
          );
        }

        const query = deferredSearch.trim().toLowerCase();
        if (!query) {
          return true;
        }

        return [
          entry.item.slot.nome,
          `${entry.item.slot.horaInicio} ${entry.item.slot.horaFim}`,
          entry.item.trabalho?.titulo,
          entry.item.trabalho?.clienteProjeto,
          entry.item.trabalho?.categoria,
        ]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(query));
      }),
    [agendaEntries, deferredSearch, visibilityFilter],
  );
  const sortedEntries = useMemo(() => {
    const priorityWeight = {
      critica: 4,
      alta: 3,
      media: 2,
      baixa: 1,
    } as const;

    const riskWeight = {
      blocked: 3,
      urgent: 2,
      watch: 1,
      healthy: 0,
    } as const;

    return [...filteredEntries].sort((first, second) => {
      if (sortMode === "priority") {
        const priorityDiff =
          (priorityWeight[second.item.trabalho?.prioridade ?? "baixa"] ?? 0) -
          (priorityWeight[first.item.trabalho?.prioridade ?? "baixa"] ?? 0);

        if (priorityDiff !== 0) {
          return priorityDiff;
        }
      }

      if (sortMode === "risk") {
        const riskDiff =
          (riskWeight[second.item.riskLevel] ?? 0) - (riskWeight[first.item.riskLevel] ?? 0);

        if (riskDiff !== 0) {
          return riskDiff;
        }

        const blockedDiff = Number(Boolean(second.item.dependencia)) - Number(Boolean(first.item.dependencia));
        if (blockedDiff !== 0) {
          return blockedDiff;
        }
      }

      if (first.date !== second.date) {
        return first.date.localeCompare(second.date);
      }

      return first.item.slot.horaInicio.localeCompare(second.item.slot.horaInicio);
    });
  }, [filteredEntries, sortMode]);
  const activeEntry =
    sortedEntries.find(
      (entry) => entry.date === controller.selectedDate && entry.item.slot.id === controller.selectedSlotId,
    ) ?? sortedEntries[0];
  const selectedItem = activeEntry?.item;
  const history = controller.plannerData.registros.filter(
    (registro) => registro.alocacaoId === selectedItem?.alocacao?.id,
  );
  const suggestions = activeEntry?.suggestions ?? [];
  const selectedReviewItem = selectedItem?.alocacao
    ? controller.rescheduleReviewItems.find((item) => item.allocationId === selectedItem.alocacao?.id)
    : undefined;
  const rescheduleSuggestion = selectedItem?.alocacao
    ? controller.getRescheduleSuggestion(selectedItem.alocacao.id)
    : undefined;
  const occupied = agendaEntries.filter((entry) => entry.item.alocacao).length;
  const free = agendaEntries.length - occupied;
  const pending = agendaEntries.filter((entry) =>
    ["planejado", "em_execucao", "parcial", "remarcado", "antecipado"].includes(entry.item.statusVisual),
  ).length;
  const riskCount = agendaEntries.filter(
    (entry) =>
      entry.item.riskLevel !== "healthy" ||
      Boolean(entry.item.dependencia) ||
      Boolean(entry.item.trabalho?.emRisco),
  ).length;
  const scopeDates = scope === "day" ? 1 : visibleDates.length;
  const freeCapacityLabel = formatMinutes(free * 25);
  const filterLabels = {
    all: "todas",
    occupied: "ocupadas",
    free: "livres",
    risk: "com risco",
  } as const;
  const sortLabels = {
    time: "horário",
    priority: "prioridade",
    risk: "risco primeiro",
  } as const;

  return (
    <div className="grid h-full grid-cols-[360px_minmax(0,1fr)] gap-5">
      <div className="scrollbar-thin space-y-5 overflow-y-auto pr-1">
        <section className="rounded-[32px] border border-black/5 bg-white p-5 shadow-panel">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                {scope === "day" ? "Agendas do dia" : "Agendas do horizonte"}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Trabalhos por agenda</h2>
              <p className="mt-2 text-sm text-slate-500">
                Leia cada agenda como uma janela operacional com trabalho alocado, risco e capacidade de encaixe.
              </p>
            </div>

            <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
              <button
                className={`rounded-2xl px-3 py-2 text-sm font-medium transition ${
                  scope === "day" ? "bg-white text-shell shadow-sm" : "text-slate-500"
                }`}
                onClick={() => setScope("day")}
                type="button"
              >
                Dia
              </button>
              <button
                className={`rounded-2xl px-3 py-2 text-sm font-medium transition ${
                  scope === "week" ? "bg-white text-shell shadow-sm" : "text-slate-500"
                }`}
                onClick={() => setScope("week")}
                type="button"
              >
                Horizonte
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <SummaryCard label="Ocupadas" meta="com trabalho alocado" value={String(occupied)} />
            <SummaryCard label="Livres" meta="janelas utilizáveis" value={String(free)} />
            <SummaryCard
              label="Pendentes"
              meta={scope === "day" ? "pedem avanço hoje" : "pedem avanço no horizonte"}
              value={String(pending)}
            />
            <SummaryCard
              label="Capacidade livre"
              meta={scopeDates === 1 ? "na data selecionada" : "no horizonte visível"}
              value={freeCapacityLabel}
            />
          </div>

          <ListControlsSection label="Busca rápida">
            <SearchField
              label="Busca rápida"
              onChange={setSearch}
              placeholder="Buscar agenda, trabalho ou projeto"
              value={search}
            />
          </ListControlsSection>

          <ListControlsSection label="Filtro">
            <ChoiceChips
              onChange={setVisibilityFilter}
              options={[
                { id: "all", label: `Todas • ${agendaEntries.length}` },
                { id: "occupied", label: `Ocupadas • ${occupied}` },
                { id: "free", label: `Livres • ${free}` },
                { id: "risk", label: `Com risco • ${riskCount}` },
              ]}
              value={visibilityFilter}
            />
          </ListControlsSection>

          <ListControlsSection label="Ordenação">
            <ChoiceChips
              onChange={setSortMode}
              options={[
                { id: "time", label: "Horário" },
                { id: "priority", label: "Prioridade" },
                { id: "risk", label: "Risco primeiro" },
              ]}
              value={sortMode}
            />
          </ListControlsSection>

          <p className="text-xs text-slate-500">
            {sortedEntries.length} {sortedEntries.length === 1 ? "agenda visível" : "agendas visíveis"} · filtro{" "}
            {filterLabels[visibilityFilter]} · ordem {sortLabels[sortMode]}
          </p>
        </section>

        <section className="space-y-4">
          {sortedEntries.length ? (
            sortedEntries.map((entry) => (
              <AgendaItemCard
                key={`${entry.date}-${entry.item.slot.id}`}
                date={entry.date}
                isSelected={entry.date === activeEntry?.date && entry.item.slot.id === activeEntry.item.slot.id}
                item={entry.item}
                onOpen={() => controller.selectSlot(entry.item.slot.id, entry.date)}
                searchTerm={search}
                showDate={scope === "week"}
                suggestions={entry.suggestions}
              />
            ))
          ) : (
            <div className="rounded-[32px] border border-dashed border-slate-200 bg-white px-5 py-6 text-sm text-slate-500 shadow-panel">
              Nenhuma agenda encontrada para este filtro ou busca. Ajuste a visão para voltar a enxergar as janelas operacionais.
            </div>
          )}
        </section>
      </div>

      <div className="scrollbar-thin overflow-y-auto pr-1">
        <AgendaDetailPanel
          actionsDisabled={controller.isOperationPending}
          contextDate={activeEntry?.date ?? controller.selectedDate}
          history={history}
          item={selectedItem}
          onAcceptReview={controller.applyRescheduleReview}
          onDeferReview={controller.deferRescheduleReview}
          onIgnoreReview={controller.ignoreRescheduleReview}
          onOpenWork={(workId) => {
            controller.selectWork(workId);
            controller.navigate("work-detail");
          }}
          onPullSuggestion={(allocationId) =>
            controller.pullForwardBlock(allocationId, selectedItem?.slot.id ?? controller.selectedSlotId)
          }
          onStatusChange={(allocationId, status) => controller.updateAllocationStatus(allocationId, status)}
          rescheduleSuggestion={rescheduleSuggestion}
          reviewItem={selectedReviewItem}
          searchTerm={search}
          suggestions={suggestions}
        />
      </div>
    </div>
  );
}
