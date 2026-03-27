import {
  ArrowUpRight,
  Check,
  Clock3,
  Lock,
  Play,
  SquareArrowOutUpRight,
  TimerReset,
} from "lucide-react";
import type { SuggestionItem, TimelineSlotItem } from "../../data/selectors";
import type { ReviewItemView, ReviewOption } from "../../types/domain";
import type { RegistroExecucao } from "../../types/planner";
import { formatDateShort, formatMinutes, formatWeekday } from "../../utils/format";
import { HighlightedText } from "../ui/HighlightedText";
import { PriorityBadge } from "../ui/PriorityBadge";
import { StatusBadge } from "../ui/StatusBadge";
import { WorkProgressBar } from "../ui/WorkProgressBar";
import { RescheduleReviewPanel } from "./RescheduleReviewPanel";

interface AgendaDetailPanelProps {
  contextDate: string;
  item?: TimelineSlotItem;
  history: RegistroExecucao[];
  suggestions: SuggestionItem[];
  actionsDisabled?: boolean;
  rescheduleSuggestion?: ReviewOption;
  reviewItem?: ReviewItemView;
  searchTerm?: string;
  onStatusChange: (
    allocationId: string,
    status: "em_execucao" | "concluido" | "parcial" | "bloqueado" | "remarcado",
  ) => void;
  onPullSuggestion: (allocationId: string) => void;
  onOpenWork: (workId: string) => void;
  onAcceptReview: (allocationId: string, target?: ReviewOption) => void;
  onDeferReview: (allocationId: string) => void;
  onIgnoreReview: (allocationId: string) => void;
}

function Metric({
  label,
  value,
  query,
}: {
  label: string;
  value: string;
  query?: string;
}) {
  return (
    <div className="rounded-3xl bg-slate-50 p-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <HighlightedText
        className="mt-2 block text-sm font-semibold text-slate-900"
        query={query}
        text={value}
      />
    </div>
  );
}

export function AgendaDetailPanel({
  contextDate,
  item,
  history,
  suggestions,
  actionsDisabled,
  rescheduleSuggestion,
  reviewItem,
  searchTerm,
  onStatusChange,
  onPullSuggestion,
  onOpenWork,
  onAcceptReview,
  onDeferReview,
  onIgnoreReview,
}: AgendaDetailPanelProps) {
  if (!item) {
    return (
      <section className="rounded-[32px] border border-black/5 bg-white p-6 shadow-panel">
        <p className="text-sm text-slate-500">Selecione uma agenda para ver o trabalho alocado e as ações disponíveis.</p>
      </section>
    );
  }

  const allocation = item.alocacao;
  const trabalho = item.trabalho;
  const bloco = item.bloco;

  if (!allocation || !trabalho || !bloco) {
    return (
      <section className="space-y-5">
        <article className="rounded-[32px] border border-black/5 bg-white p-6 shadow-panel">
          <div className="flex items-start justify-between gap-4">
            <div>
              <StatusBadge status="livre" />
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">{item.slot.nome}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {formatWeekday(contextDate)} • {formatDateShort(contextDate)} • {item.slot.horaInicio} - {item.slot.horaFim}. Esta agenda está livre e pode absorver antecipação ou remarcação.
              </p>
            </div>
            <div className="rounded-3xl bg-accent-soft px-4 py-3 text-sm font-medium text-accent-ink">
              {suggestions.length
                ? `${suggestions.length} opção${suggestions.length === 1 ? "" : "ões"} elegíveis`
                : "Sem sugestão agora"}
            </div>
          </div>
        </article>

        <article className="rounded-[32px] border border-black/5 bg-white p-6 shadow-panel">
          <h3 className="text-lg font-semibold tracking-tight text-slate-900">Melhores encaixes para esta agenda</h3>
          <div className="mt-4 space-y-3">
            {suggestions.length ? (
              suggestions.map((suggestion, index) => (
                <div key={suggestion.alocacao.id} className="rounded-3xl bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        {index === 0 ? (
                          <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-semibold text-accent-ink">
                            Melhor encaixe
                          </span>
                        ) : null}
                        <PriorityBadge prioridade={suggestion.trabalho.prioridade} />
                      </div>
                      <HighlightedText
                        className="mt-3 block text-base font-semibold tracking-tight text-slate-900"
                        query={searchTerm}
                        text={suggestion.trabalho.titulo}
                      />
                      <p className="mt-2 text-sm text-slate-600">{suggestion.resumo}</p>
                    </div>
                    <p className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                      {suggestion.impactoCurto}
                    </p>
                  </div>

                  <p className="mt-3 text-sm text-slate-600">{suggestion.impacto}</p>

                  <button
                    className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-shell px-4 py-2.5 text-sm font-medium text-white"
                    onClick={() => onPullSuggestion(suggestion.alocacao.id)}
                    type="button"
                  >
                    Puxar para esta agenda
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                </div>
              ))
            ) : (
              <div className="rounded-3xl bg-slate-50 px-4 py-4 text-sm text-slate-500">
                Nenhum bloco elegível para antecipação nesta agenda no momento.
              </div>
            )}
          </div>
        </article>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <article className="rounded-[32px] border border-black/5 bg-white p-6 shadow-panel">
        <div className="flex items-start justify-between gap-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={item.statusVisual} />
              <PriorityBadge prioridade={trabalho.prioridade} />
            </div>
            <HighlightedText
              className="mt-4 block text-3xl font-semibold tracking-tight text-slate-900"
              query={searchTerm}
              text={item.slot.nome}
            />
            <p className="mt-2 text-sm text-slate-500">
              {formatWeekday(contextDate)} • {formatDateShort(contextDate)} • {item.slot.horaInicio} - {item.slot.horaFim} • {trabalho.titulo}
            </p>
            <HighlightedText
              className="mt-4 block max-w-4xl text-sm leading-6 text-slate-600"
              query={searchTerm}
              text={trabalho.descricao}
            />
          </div>

          <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
            <p>Prazo {formatDateShort(trabalho.prazoData)}</p>
            <p className="mt-2">Origem {allocation.origemAlocacao.replace("_", " ")}</p>
            <p className="mt-2">Saldo {formatMinutes(Math.max(bloco.duracaoPlanejadaMin - bloco.duracaoRealizadaMin, 0))}</p>
          </div>
        </div>

        <div className="mt-5">
          <WorkProgressBar value={trabalho.percentualConclusao} />
        </div>
      </article>

      <div className="grid grid-cols-[1.05fr_0.95fr] gap-5">
        <div className="space-y-5">
          <article className="rounded-[32px] border border-black/5 bg-white p-6 shadow-panel">
            <h3 className="text-lg font-semibold tracking-tight text-slate-900">Leitura da agenda</h3>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Metric label="Bloco" value={`${bloco.sequencia}/${bloco.totalBlocos}`} />
              <Metric label="Projeto" query={searchTerm} value={trabalho.clienteProjeto} />
              <Metric label="Status" value={item.statusVisual.replace("_", " ")} />
              <Metric label="Estimado" value={formatMinutes(bloco.duracaoPlanejadaMin)} />
            </div>

            {item.dependencia ? (
              <div className="mt-4 rounded-3xl border border-danger/15 bg-danger-soft px-4 py-4 text-sm text-danger-ink">
                <p className="font-semibold">Dependência ativa</p>
                <p className="mt-2">
                  Aguardando {item.dependencia.responsavelExterno}. Liberação prevista em {formatDateShort(item.dependencia.dataPrevistaLiberacao)}.
                </p>
              </div>
            ) : rescheduleSuggestion ? (
              <div className="mt-4 rounded-3xl border border-accent/15 bg-accent-soft px-4 py-4 text-sm text-accent-ink">
                <p className="font-semibold">Menor impacto para remarcar</p>
                <p className="mt-2">
                  {rescheduleSuggestion.slotLabel} em {formatDateShort(rescheduleSuggestion.date)}. {rescheduleSuggestion.tradeoff.effect}
                </p>
              </div>
            ) : null}
          </article>

          <article className="rounded-[32px] border border-black/5 bg-white p-6 shadow-panel">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold tracking-tight text-slate-900">Ações rápidas</h3>
              {actionsDisabled ? <p className="text-sm text-slate-500">Operação em andamento</p> : null}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-shell px-3 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                disabled={actionsDisabled}
                onClick={() => onStatusChange(allocation.id, "em_execucao")}
                type="button"
              >
                <Play className="h-4 w-4" />
                Iniciar
              </button>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={actionsDisabled}
                onClick={() => onStatusChange(allocation.id, "concluido")}
                type="button"
              >
                <Check className="h-4 w-4" />
                Concluir
              </button>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={actionsDisabled}
                onClick={() => onStatusChange(allocation.id, "parcial")}
                type="button"
              >
                <TimerReset className="h-4 w-4" />
                Marcar parcial
              </button>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={actionsDisabled}
                onClick={() => onStatusChange(allocation.id, "bloqueado")}
                type="button"
              >
                <Lock className="h-4 w-4" />
                Bloquear
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700"
                onClick={() => onOpenWork(trabalho.id)}
                type="button"
              >
                Abrir trabalho
                <SquareArrowOutUpRight className="h-4 w-4" />
              </button>
            </div>
          </article>

          {reviewItem ? (
            <RescheduleReviewPanel
              compact
              items={[reviewItem]}
              onAccept={onAcceptReview}
              onDefer={onDeferReview}
              onIgnore={onIgnoreReview}
              onOpenWork={onOpenWork}
              subtitle="Confirme o melhor encaixe desta agenda sem sair da visão por slot."
              title="Revisão desta agenda"
            />
          ) : null}
        </div>

        <div className="space-y-5">
          <article className="rounded-[32px] border border-black/5 bg-white p-6 shadow-panel">
            <h3 className="text-lg font-semibold tracking-tight text-slate-900">Histórico curto</h3>
            <div className="mt-4 space-y-3">
              {history.length ? (
                history.map((registro) => (
                  <div key={registro.id} className="rounded-3xl bg-slate-50 p-4">
                    <HighlightedText
                      className="block text-sm font-semibold text-slate-900"
                      query={searchTerm}
                      text={registro.resultado}
                    />
                    <p className="mt-1 text-sm text-slate-600">
                      {formatMinutes(registro.minutosRealizados)} realizados
                    </p>
                    {registro.motivo ? (
                      <HighlightedText
                        className="mt-2 block text-xs text-slate-500"
                        query={searchTerm}
                        text={registro.motivo}
                      />
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="rounded-3xl bg-slate-50 px-4 py-4 text-sm text-slate-500">
                  Sem histórico registrado para esta agenda.
                </div>
              )}
            </div>
          </article>

          <article className="rounded-[32px] border border-black/5 bg-white p-6 shadow-panel">
            <h3 className="text-lg font-semibold tracking-tight text-slate-900">Leitura operacional</h3>
            <div className="mt-4 space-y-3">
              <Metric label="Agenda" query={searchTerm} value={item.slot.nome} />
              <Metric label="Horário" value={`${item.slot.horaInicio} - ${item.slot.horaFim}`} />
              <Metric label="Perfil" value={item.slot.perfil} />
              <Metric
                label="Próximo passo"
                query={searchTerm}
                value={
                  item.dependencia
                    ? "Acompanhar liberação antes de insistir nesta agenda."
                    : item.statusVisual === "parcial"
                      ? "Retomar antes de abrir novas frentes."
                      : "Usar esta agenda como ponto de continuidade."
                }
              />
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
