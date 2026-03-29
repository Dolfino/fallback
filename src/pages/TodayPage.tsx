import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Focus,
  LockKeyhole,
  PlayCircle,
  Timer,
  TriangleAlert,
} from "lucide-react";
import {
  getBlockingItems,
  getSuggestionsForSlot,
  getTimelineForDate,
} from "../data/selectors";
import type { OperationalSignal } from "../data/selectors";
import type { PlannerController } from "../hooks/usePlannerState";
import { formatDateShort } from "../utils/format";
import { RightDetailPanel } from "../components/domain/RightDetailPanel";
import { TimelineDayView } from "../components/domain/TimelineDayView";
import { HorizonPressurePanel } from "../components/domain/HorizonPressurePanel";
import { PriorityBadge } from "../components/ui/PriorityBadge";
import { StatusBadge } from "../components/ui/StatusBadge";

function signalStyles(tone: OperationalSignal["tone"]) {
  const styles = {
    critical: "border-danger/20 bg-danger-soft text-danger-ink",
    warning: "border-warn/20 bg-warn-soft text-warn-ink",
    opportunity: "border-accent/20 bg-accent-soft text-accent-ink",
    focus: "border-shell/10 bg-shell text-white",
  };

  return styles[tone];
}

function impactTagStyles(
  tone: NonNullable<NonNullable<PlannerController["impactSummary"]>["contextTag"]>["tone"],
) {
  const styles = {
    neutral: "bg-slate-100 text-slate-700",
    success: "bg-emerald-100 text-emerald-800",
    warning: "bg-warn-soft text-warn-ink",
    critical: "bg-danger-soft text-danger-ink",
    opportunity: "bg-accent-soft text-accent-ink",
  };

  return styles[tone];
}

function SignalCard({
  signal,
  onSelect,
}: {
  signal: OperationalSignal;
  onSelect: (slotId?: string) => void;
}) {
  return (
    <button
      className={`rounded-[28px] border p-4 text-left shadow-panel transition ${signalStyles(signal.tone)}`}
      onClick={() => onSelect(signal.slotId)}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] opacity-70">Sinal operacional</p>
          <h3 className="mt-2 text-base font-semibold tracking-tight">{signal.title}</h3>
        </div>
        {signal.cta ? <ArrowUpRight className="mt-1 h-4 w-4 opacity-70" /> : null}
      </div>
      <p className="mt-3 text-sm leading-6 opacity-90">{signal.detail}</p>
      {signal.cta ? <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em]">{signal.cta}</p> : null}
    </button>
  );
}

function DecisionMetric({
  label,
  value,
  meta,
  icon,
}: {
  label: string;
  value: string | number;
  meta: string;
  icon: ReactNode;
}) {
  return (
    <article className="rounded-[28px] border border-black/5 bg-white p-4 shadow-panel">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
          <p className="mt-2 text-sm text-slate-500">{meta}</p>
        </div>
        <div className="rounded-2xl bg-slate-100 p-3 text-slate-600">{icon}</div>
      </div>
    </article>
  );
}

export function TodayPage({ controller }: { controller: PlannerController }) {
  const timeline = getTimelineForDate(controller.plannerData, controller.selectedDate);
  const decision = controller.getTodaySummary();
  const selectedItem = timeline.find((item) => item.slot.id === controller.selectedSlotId);
  const suggestionMap = Object.fromEntries(
    timeline.map((item) => [item.slot.id, getSuggestionsForSlot(controller.plannerData, controller.selectedDate, item.slot.id)]),
  );
  const history = controller.plannerData.registros.filter(
    (registro) => registro.alocacaoId === selectedItem?.alocacao?.id,
  );
  const selectedReviewItem = selectedItem?.alocacao
    ? controller.rescheduleReviewItems.find((item) => item.allocationId === selectedItem.alocacao?.id)
    : undefined;
  const rescheduleSuggestion = selectedItem?.alocacao
    ? controller.getRescheduleSuggestion(selectedItem.alocacao.id)
    : undefined;
  const nextFocus = decision.proximoFoco;
  const nextFocusAction =
    nextFocus?.statusVisual === "em_execucao" ? "Retomar agora" : "Abrir e iniciar";
  const shortHorizon = controller.getShortHorizonSnapshot();
  const horizonLoad = shortHorizon.load;
  const pressurePoints = shortHorizon.pressurePoints;
  const blockingContext = selectedItem?.dependencia
    ? getBlockingItems(controller.plannerData).find(
        (entry) => entry.dependencia.id === selectedItem.dependencia?.id,
      )
    : undefined;
  const showImpactContextTag =
    controller.impactSummary?.contextTag &&
    controller.systemFeedback?.contextTag?.label.toLowerCase() !==
      controller.impactSummary.contextTag.label.toLowerCase();
  const visibleImpactDetails = controller.impactSummary
    ? controller.impactSummary.details.filter(
        (detail, index, collection) =>
          detail.toLowerCase() !== controller.systemFeedback?.detail.toLowerCase() &&
          collection.findIndex((item) => item.toLowerCase() === detail.toLowerCase()) === index,
      )
    : [];

  return (
    <div className={`grid h-full gap-5 ${controller.isDetailPanelOpen ? "grid-cols-[minmax(0,1fr)_380px]" : "grid-cols-[1fr]"}`}>
      <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-5">
        <section className="rounded-[36px] border border-black/5 bg-white p-6 shadow-panel">
          <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)] gap-5">
            <div className="rounded-[32px] bg-shell p-6 text-white">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-white/55">Próximo foco</p>
              {nextFocus?.trabalho && nextFocus.bloco ? (
                <>
                  <div className="mt-4 flex items-center gap-2">
                    <StatusBadge status={nextFocus.statusVisual} />
                    <PriorityBadge prioridade={nextFocus.trabalho.prioridade} />
                  </div>
                  <h2 className="mt-4 text-3xl font-semibold tracking-tight">{nextFocus.trabalho.titulo}</h2>
                  <div className="mt-5 grid grid-cols-4 gap-3 text-sm">
                    <div className="rounded-3xl bg-white/8 p-3">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-white/55">Horário</p>
                      <p className="mt-2 font-semibold">
                        {nextFocus.slot.horaInicio} - {nextFocus.slot.horaFim}
                      </p>
                    </div>
                    <div className="rounded-3xl bg-white/8 p-3">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-white/55">Bloco</p>
                      <p className="mt-2 font-semibold">
                        {nextFocus.bloco.sequencia}/{nextFocus.bloco.totalBlocos}
                      </p>
                    </div>
                    <div className="rounded-3xl bg-white/8 p-3">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-white/55">Prazo</p>
                      <p className="mt-2 font-semibold">{formatDateShort(nextFocus.trabalho.prazoData)}</p>
                    </div>
                    <div className="rounded-3xl bg-white/8 p-3">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-white/55">Estado</p>
                      <p className="mt-2 font-semibold">{nextFocus.statusVisual.replace("_", " ")}</p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <button
                      className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-shell"
                      onClick={() => controller.selectSlot(nextFocus.slot.id)}
                      type="button"
                    >
                      <PlayCircle className="h-4 w-4" />
                      {nextFocusAction}
                    </button>
                    <p className="text-sm text-white/70">
                      {nextFocus.trabalho.emRisco
                        ? "Item em risco. Resolver agora reduz pressão do restante do dia."
                        : "Este é o melhor ponto de continuidade para manter a cadência operacional."}
                    </p>
                  </div>
                </>
              ) : (
                <div className="mt-4 rounded-3xl bg-white/8 p-5 text-sm text-white/70">
                  Nenhum foco prioritário encontrado para hoje.
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {decision.sinais.map((signal) => (
                <SignalCard
                  key={signal.id}
                  onSelect={(slotId) => {
                    if (slotId) {
                      controller.selectSlot(slotId);
                    }
                  }}
                  signal={signal}
                />
              ))}
            </div>
          </div>
        </section>

        <div className="grid min-h-0 grid-cols-[320px_minmax(0,1fr)] gap-5">
          <div className="scrollbar-thin space-y-4 overflow-y-auto pr-1">
            <section className="rounded-[32px] border border-black/5 bg-white p-5 shadow-panel">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Leitura do dia</p>
                  <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">Painel de decisão</h3>
                </div>
                <Focus className="h-5 w-5 text-slate-400" />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <DecisionMetric
                  icon={<Clock3 className="h-4 w-4" />}
                  label="Capacidade livre"
                  meta={`${decision.livres} slot${decision.livres === 1 ? "" : "s"} ainda utilizável`}
                  value={decision.capacidadeLivreLabel}
                />
                <DecisionMetric
                  icon={<Timer className="h-4 w-4" />}
                  label="Capacidade consumida"
                  meta={`${decision.ocupados} slots já comprometidos`}
                  value={decision.capacidadeConsumidaLabel}
                />
                <DecisionMetric
                  icon={<AlertTriangle className="h-4 w-4" />}
                  label="Em risco"
                  meta="pedem prioridade antes do fim do dia"
                  value={decision.riscos}
                />
                <DecisionMetric
                  icon={<LockKeyhole className="h-4 w-4" />}
                  label="Bloqueados"
                  meta="dependência externa ou trava ativa"
                  value={decision.bloqueados}
                />
              </div>
            </section>

            <section className="rounded-[32px] border border-black/5 bg-white p-5 shadow-panel">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Alertas do dia</p>
                  <h3 className="mt-2 text-lg font-semibold tracking-tight text-slate-900">Onde a atenção precisa ir</h3>
                </div>
                <TriangleAlert className="h-5 w-5 text-danger" />
              </div>

              <div className="mt-4 space-y-3">
                {decision.alertas.map((alerta) => (
                  <div key={alerta} className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                    {alerta}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] border border-black/5 bg-white p-5 shadow-panel">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Aproveitar folga</p>
                  <h3 className="mt-2 text-lg font-semibold tracking-tight text-slate-900">Slot livre útil</h3>
                </div>
                <ArrowUpRight className="h-5 w-5 text-accent" />
              </div>

              {decision.slotLivreUtil && decision.sugestaoPrincipal ? (
                <button
                  className="mt-4 w-full rounded-[28px] border border-accent/20 bg-accent-soft p-4 text-left text-accent-ink"
                  onClick={() => controller.selectSlot(decision.slotLivreUtil!.slot.id)}
                  type="button"
                >
                  <p className="text-sm font-semibold">
                    {decision.slotLivreUtil.slot.nome} • {decision.slotLivreUtil.slot.horaInicio}
                  </p>
                  <p className="mt-2 text-sm">
                    Puxar {decision.sugestaoPrincipal.trabalho.titulo} para agora {decision.sugestaoPrincipal.impactoCurto.toLowerCase()}.
                  </p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em]">
                    Abrir sugestão
                  </p>
                </button>
              ) : (
                <div className="mt-4 rounded-[28px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                  Nenhum slot livre com antecipação útil neste momento.
                </div>
              )}
            </section>

            <section className="rounded-[32px] border border-black/5 bg-white p-5 shadow-panel">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Orientações rápidas</p>
                  <h3 className="mt-2 text-lg font-semibold tracking-tight text-slate-900">Próximas decisões</h3>
                </div>
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="space-y-3">
                {decision.sugestoes.map((sugestao) => (
                  <div key={sugestao} className="rounded-3xl bg-slate-50 px-4 py-4 text-sm text-slate-600">
                    {sugestao}
                  </div>
                ))}
              </div>
            </section>

            {controller.impactSummary ? (
              <section className="rounded-[32px] border border-black/5 bg-white p-5 shadow-panel">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Impacto em cadeia</p>
                    {showImpactContextTag ? (
                      <span
                        className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${impactTagStyles(controller.impactSummary.contextTag!.tone)}`}
                      >
                        {controller.impactSummary.contextTag!.label}
                      </span>
                    ) : null}
                    <h3 className="mt-2 text-lg font-semibold tracking-tight text-slate-900">
                      {controller.impactSummary.headline}
                    </h3>
                  </div>
                  <ArrowUpRight className="h-5 w-5 text-slate-400" />
                </div>
                <div className="space-y-3">
                  {visibleImpactDetails.map((detail) => (
                    <div key={detail} className="rounded-3xl bg-slate-50 px-4 py-4 text-sm text-slate-700">
                      {detail}
                    </div>
                  ))}
                  {controller.impactSummary.recommendedAction ? (
                    <div className="rounded-3xl border border-accent/15 bg-accent-soft px-4 py-4 text-sm font-medium text-accent-ink">
                      {controller.impactSummary.recommendedAction}
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}

            <HorizonPressurePanel
              load={horizonLoad}
              onSelectPoint={(point) => controller.selectSlot(point.slotId, point.date)}
              points={pressurePoints}
              subtitle="Mostra onde hoje, amanhã e o próximo dia já pressionam a fila."
              title="Pressões dos próximos dias"
            />
          </div>

          <TimelineDayView
            items={timeline}
            onSelectSlot={(slotId) => controller.selectSlot(slotId)}
            selectedSlotId={controller.selectedSlotId}
            suggestionMap={suggestionMap}
            slotFeedback={controller.slotFeedback}
          />
        </div>
      </div>

      {controller.isDetailPanelOpen ? (
        <RightDetailPanel
          actionsDisabled={controller.isOperationPending}
          history={history}
          impactSummary={controller.impactSummary}
          item={selectedItem}
          blockingContext={blockingContext}
          onCreateIssue={controller.addIssue}
          onOpenWork={(workId) => {
            controller.selectWork(workId);
            controller.navigate("work-detail");
          }}
          onAcceptReview={controller.applyRescheduleReview}
          onDeferReview={controller.deferRescheduleReview}
          onIgnoreReview={controller.ignoreRescheduleReview}
          onPullSuggestion={(allocationId) => controller.pullForwardBlock(allocationId, controller.selectedSlotId)}
          onStatusChange={(allocationId, status) => controller.updateAllocationStatus(allocationId, status)}
          reviewItem={selectedReviewItem}
          rescheduleSuggestion={rescheduleSuggestion}
          recentConsequences={controller.recentConsequences}
          suggestions={selectedItem ? suggestionMap[selectedItem.slot.id] ?? [] : []}
        />
      ) : null}
    </div>
  );
}
