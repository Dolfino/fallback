import {
  getBlockingItems,
  getCapacitySummary,
  getSuggestionsForSlot,
  getSummaryForDate,
  getTimelineForDate,
  getUpcomingDeliveries,
  getWeekMatrix,
} from "../data/selectors";
import type { PlannerController } from "../hooks/usePlannerState";
import { RightDetailPanel } from "../components/domain/RightDetailPanel";
import { WeekGrid } from "../components/domain/WeekGrid";
import { SummaryCard } from "../components/ui/SummaryCard";
import { WorkItemCard } from "../components/domain/WorkItemCard";

export function WeekPage({ controller }: { controller: PlannerController }) {
  const rows = getWeekMatrix(controller.plannerData, controller.weekFilters);
  const capacity = getCapacitySummary(controller.plannerData);
  const selectedTimeline = getTimelineForDate(controller.plannerData, controller.selectedDate);
  const selectedItem = selectedTimeline.find((item) => item.slot.id === controller.selectedSlotId);
  const history = controller.plannerData.registros.filter(
    (registro) => registro.alocacaoId === selectedItem?.alocacao?.id,
  );
  const suggestions = selectedItem
    ? getSuggestionsForSlot(controller.plannerData, controller.selectedDate, selectedItem.slot.id)
    : [];
  const selectedReviewItem = selectedItem?.alocacao
    ? controller.rescheduleReviewItems.find((item) => item.allocationId === selectedItem.alocacao?.id)
    : undefined;
  const rescheduleSuggestion = selectedItem?.alocacao
    ? controller.getRescheduleSuggestion(selectedItem.alocacao.id)
    : undefined;
  const deliveries = getUpcomingDeliveries(controller.plannerData);
  const blockingContext = selectedItem?.dependencia
    ? getBlockingItems(controller.plannerData).find(
        (entry) => entry.dependencia.id === selectedItem.dependencia?.id,
      )
    : undefined;

  return (
    <div className={`grid h-full gap-5 ${controller.isDetailPanelOpen ? "grid-cols-[300px_minmax(0,1fr)_360px]" : "grid-cols-[300px_minmax(0,1fr)]"}`}>
      <div className="scrollbar-thin space-y-5 overflow-y-auto pr-1">
        <section className="rounded-[32px] border border-black/5 bg-white p-5 shadow-panel">
          <h3 className="text-lg font-semibold tracking-tight text-slate-900">Filtros</h3>
          <div className="mt-4 space-y-3">
            <select
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
              onChange={(event) =>
                controller.setWeekFilters((current) => ({ ...current, prioridade: event.target.value as typeof current.prioridade }))
              }
              value={controller.weekFilters.prioridade}
            >
              <option value="todas">Todas prioridades</option>
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
              <option value="critica">Crítica</option>
            </select>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
              onChange={(event) =>
                controller.setWeekFilters((current) => ({ ...current, status: event.target.value as typeof current.status }))
              }
              value={controller.weekFilters.status}
            >
              <option value="todos">Todos status</option>
              <option value="planejado">Planejado</option>
              <option value="em_execucao">Em execução</option>
              <option value="bloqueado">Bloqueado</option>
              <option value="parcial">Parcial</option>
              <option value="remarcado">Remarcado</option>
              <option value="antecipado">Antecipado</option>
            </select>
            <label className="flex items-center justify-between rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
              <span className="text-sm font-medium text-slate-700">Apenas trabalhos em risco</span>
              <input
                checked={controller.weekFilters.apenasRisco}
                onChange={(event) =>
                  controller.setWeekFilters((current) => ({ ...current, apenasRisco: event.target.checked }))
                }
                type="checkbox"
              />
            </label>
          </div>
        </section>

        <SummaryCard label="Capacidade livre" meta="semana atual" value={capacity.livreLabel} />
        <SummaryCard label="Capacidade ocupada" meta="blocos já comprometidos" value={capacity.ocupadosLabel} />

        <section className="space-y-4">
          {deliveries.map((trabalho) => (
            <WorkItemCard key={trabalho.id} onOpen={(workId) => {
              controller.selectWork(workId);
              controller.navigate("work-detail");
            }} trabalho={trabalho} />
          ))}
        </section>
      </div>

      <WeekGrid
        onSelectCell={(date, slotId) => controller.selectSlot(slotId, date)}
        rows={rows}
        selectedKey={`${controller.selectedDate}-${controller.selectedSlotId}`}
      />

      {controller.isDetailPanelOpen ? (
        <RightDetailPanel
          actionsDisabled={controller.isOperationPending}
          blockingContext={blockingContext}
          history={history}
          impactSummary={controller.impactSummary}
          item={selectedItem}
          onOpenWork={(workId) => {
            controller.selectWork(workId);
            controller.navigate("work-detail");
          }}
          onAcceptReview={controller.applyRescheduleReview}
          onDeferReview={controller.deferRescheduleReview}
          onIgnoreReview={controller.ignoreRescheduleReview}
          onPullSuggestion={(allocationId) => controller.pullForwardBlock(allocationId, controller.selectedSlotId)}
          onStatusChange={(allocationId, status) => controller.updateAllocationStatus(allocationId, status)}
          recentConsequences={controller.recentConsequences}
          reviewItem={selectedReviewItem}
          rescheduleSuggestion={rescheduleSuggestion}
          suggestions={suggestions}
        />
      ) : null}
    </div>
  );
}
