import { useRef } from "react";
import { formatDateShort, formatMinutes } from "../../utils/format";
import type { ReviewItemView, ReviewOption } from "../../types/domain";
import type { FechamentoOperacional } from "../../types/planner";
import { StatusBadge } from "../ui/StatusBadge";
import { HorizonPressurePanel } from "./HorizonPressurePanel";
import { RescheduleReviewPanel } from "./RescheduleReviewPanel";

type ClosingGroups = ReturnType<typeof import("../../data/selectors").getDailyClosingGroups>;
type TomorrowPreview = ReturnType<typeof import("../../data/selectors").getTomorrowPreview>;
type AppliedDependencyPolicies = ReturnType<typeof import("../../data/selectors").getAppliedDependencyPolicies>;

interface DailyClosingPanelProps {
  groups: ClosingGroups;
  onAutoReplan: () => void;
  onAutoReplanWeek: () => void;
  onConfirmClosing: () => void;
  tomorrow: TomorrowPreview;
  appliedPolicies: AppliedDependencyPolicies;
  reviewItems: ReviewItemView[];
  onAcceptReview: (allocationId: string, target?: ReviewOption) => void;
  onDeferReview: (allocationId: string) => void;
  onIgnoreReview: (allocationId: string) => void;
  onOpenWork: (workId: string) => void;
  carryoverCount: number;
  carryoverWorkCount: number;
  confirmedClosing?: FechamentoOperacional;
}

function renderGroup(
  title: string,
  items: Array<ClosingGroups["concluidos"][number]>,
) {
  return (
    <section className="rounded-[32px] border border-black/5 bg-white p-5 shadow-panel">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h3>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
          {items.length}
        </span>
      </div>

      <div className="space-y-3">
        {items.length ? (
          items.map((item) => (
            <div key={`${title}-${item.slot.id}`} className="rounded-3xl bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={item.statusVisual} />
                    <p className="text-xs text-slate-500">{item.slot.nome}</p>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{item.trabalho?.titulo ?? "Slot livre"}</p>
                </div>
                <span className="text-xs text-slate-500">
                  saldo {formatMinutes(item.saldoRestanteMin)}
                </span>
              </div>
              {item.motivo ? (
                <p className="mt-3 text-sm font-medium text-slate-700">{item.motivo}</p>
              ) : null}
              {item.sugestaoRemarcacao ? (
                <p className="mt-2 text-sm text-slate-600">Próximo encaixe sugerido: {item.sugestaoRemarcacao}</p>
              ) : null}
            </div>
          ))
        ) : (
          <div className="rounded-3xl bg-slate-50 px-4 py-4 text-sm text-slate-500">
            Sem itens nesta categoria.
          </div>
        )}
      </div>
    </section>
  );
}

export function DailyClosingPanel({
  groups,
  onAutoReplan,
  onAutoReplanWeek,
  onConfirmClosing,
  tomorrow,
  appliedPolicies,
  reviewItems,
  onAcceptReview,
  onDeferReview,
  onIgnoreReview,
  onOpenWork,
  carryoverCount,
  carryoverWorkCount,
  confirmedClosing,
}: DailyClosingPanelProps) {
  const totalPendencias = groups.parciais.length + groups.naoExecutados.length + groups.bloqueados.length;
  const reviewPanelRef = useRef<HTMLElement | null>(null);
  const pendingReviewItems = reviewItems.filter((item) => item.reviewStatus === "pending");

  const focusReviewPanel = () => {
    reviewPanelRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <div className="space-y-5">
      <section className="rounded-[32px] border border-shell/10 bg-shell p-6 text-white shadow-panel">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/55">Controle do dia</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight">Fechamento operacional</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
          {totalPendencias
            ? `${totalPendencias} pendência${totalPendencias === 1 ? "" : "s"} ainda exigem decisão antes de encerrar o dia.`
            : "Tudo que estava em agenda para hoje já foi absorvido ou concluído."}
        </p>
      </section>

      <div className="grid grid-cols-2 gap-5">
        {renderGroup("Concluídos", groups.concluidos)}
        {renderGroup("Parciais", groups.parciais)}
        {renderGroup("Não executados", groups.naoExecutados)}
        {renderGroup("Bloqueados", groups.bloqueados)}
      </div>

      <section className="rounded-[32px] border border-black/5 bg-white p-5 shadow-panel">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Amanhã começa assim</p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">
              Continuidade operacional do próximo dia
            </h3>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
            {tomorrow.cargaLabel}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4">
          <div className="rounded-3xl bg-slate-50 p-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">Primeiro foco</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {tomorrow.focoInicial?.trabalho?.titulo ?? "Ainda sem foco dominante"}
            </p>
            {tomorrow.focoInicial ? (
              <p className="mt-2 text-sm text-slate-600">
                {tomorrow.focoInicial.slot.horaInicio} • {tomorrow.focoInicial.bloco?.sequencia}/{tomorrow.focoInicial.bloco?.totalBlocos}
              </p>
            ) : null}
          </div>

          <div className="rounded-3xl bg-slate-50 p-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">Novo risco</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {tomorrow.novoRiscoCount} item{tomorrow.novoRiscoCount === 1 ? "" : "s"} em atenção logo cedo
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Bloqueios e pendências de hoje já aparecem refletidos na leitura de amanhã.
            </p>
          </div>

          <div className="rounded-3xl bg-slate-50 p-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">Pendências remarcadas</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {tomorrow.pendenciasRemarcadas.length} bloco{tomorrow.pendenciasRemarcadas.length === 1 ? "" : "s"} já entraram no próximo dia
            </p>
            {tomorrow.pendenciasRemarcadas[0] ? (
              <p className="mt-2 text-sm text-slate-600">
                Primeiro encaixe remarcado: {tomorrow.pendenciasRemarcadas[0].trabalho?.titulo}.
              </p>
            ) : null}
          </div>

          <div className="rounded-3xl bg-slate-50 p-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">Slot livre útil</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {tomorrow.slotLivreUtil
                ? `${tomorrow.slotLivreUtil.slot.nome} às ${tomorrow.slotLivreUtil.slot.horaInicio}`
                : "Sem folga útil clara"}
            </p>
            {tomorrow.sugestaoPrincipal ? (
              <p className="mt-2 text-sm text-slate-600">{tomorrow.sugestaoPrincipal.impacto}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-5">
          <HorizonPressurePanel
            load={tomorrow.horizonLoad}
            points={tomorrow.pressurePoints}
            subtitle="Veja onde amanhã e o próximo dia já apertam antes de confirmar o fechamento."
            title="Pressões do horizonte"
          />
        </div>

        {appliedPolicies.length ? (
          <div className="mt-5 rounded-3xl border border-black/5 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
                  Políticas aplicadas hoje
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  Ajustes de dependência já refletidos no horizonte curto
                </p>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                {appliedPolicies.length}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {appliedPolicies.slice(0, 3).map((policy) => (
                <div key={policy.dependencyId} className="rounded-2xl bg-white px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{policy.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{policy.policy.label}</p>
                    </div>
                    <span className="text-xs text-slate-500">
                      {policy.impactCount} bloco{policy.impactCount === 1 ? "" : "s"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-slate-800">{policy.policy.effect}</p>
                  <p className="mt-1 text-sm text-slate-600">{policy.policy.horizonNote}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section ref={reviewPanelRef}>
        <RescheduleReviewPanel
          items={pendingReviewItems.length ? pendingReviewItems : reviewItems}
          onAccept={onAcceptReview}
          onDefer={onDeferReview}
          onIgnore={onIgnoreReview}
          onOpenWork={onOpenWork}
          subtitle={
            pendingReviewItems.length
              ? `${pendingReviewItems.length} item${pendingReviewItems.length === 1 ? "" : "s"} ainda pede${pendingReviewItems.length === 1 ? "" : "m"} decisão.`
              : "Compare sugerido e aceito sem sair do fluxo operacional."
          }
        />
      </section>

      <section className="rounded-[32px] border border-black/5 bg-white p-5 shadow-panel">
        {carryoverCount ? (
          <div className="mb-5 rounded-3xl border border-amber-200 bg-amber-50 px-4 py-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-amber-700">
              Pendências anteriores
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {carryoverCount} bloco{carryoverCount === 1 ? "" : "s"} ainda ficou{carryoverCount === 1 ? "" : "ram"} antes de {formatDateShort(tomorrow.data)}.
            </p>
            <p className="mt-2 text-sm text-slate-700">
              {carryoverWorkCount} trabalho{carryoverWorkCount === 1 ? "" : "s"} ainda precisa{carryoverWorkCount === 1 ? "" : "m"} entrar no novo horizonte.
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-slate-900">Encerrar dia operacional</h3>
            <p className="mt-2 text-sm text-slate-500">
              Revise o saldo pendente e feche o dia com o amanhã já encaminhado.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700"
              onClick={onAutoReplan}
              type="button"
            >
              Replanejar automaticamente
            </button>
            {carryoverCount ? (
              <button
                className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800"
                onClick={onAutoReplanWeek}
                type="button"
              >
                Trazer pendências anteriores
              </button>
            ) : null}
            <button
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={focusReviewPanel}
              disabled={!reviewItems.length}
              type="button"
            >
              Revisar remarcações
            </button>
            <button
              className="rounded-2xl bg-shell px-4 py-2 text-sm font-medium text-white"
              onClick={onConfirmClosing}
              type="button"
            >
              {confirmedClosing ? "Reconfirmar fechamento" : "Confirmar fechamento"}
            </button>
          </div>
        </div>
        {confirmedClosing ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            Fechamento registrado em {new Date(confirmedClosing.confirmedAt).toLocaleString("pt-BR")}. Pendentes: {confirmedClosing.pendingCount}. Bloqueados: {confirmedClosing.blockedCount}.
          </div>
        ) : null}
      </section>
    </div>
  );
}
