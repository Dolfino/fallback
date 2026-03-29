import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  CircleDashed,
  Clock3,
  Lock,
  MoveRight,
  Play,
  SquareArrowOutUpRight,
  TimerReset,
  TriangleAlert,
} from "lucide-react";
import type { SuggestionItem, TimelineSlotItem } from "../../data/selectors";
import type {
  ImmediateImpactSummary,
  PlannerConsequence,
  PlannerIssueInput,
  ReviewItemView,
  ReviewOption,
} from "../../types/domain";
import type { RegistroExecucao } from "../../types/planner";
import { formatDateShort, formatMinutes } from "../../utils/format";
import { PriorityBadge } from "../ui/PriorityBadge";
import { StatusBadge } from "../ui/StatusBadge";
import { WorkProgressBar } from "../ui/WorkProgressBar";
import { RescheduleReviewPanel } from "./RescheduleReviewPanel";

interface RightDetailPanelProps {
  item?: TimelineSlotItem;
  blockingContext?: {
    politicaResumo?: {
      action: "manter_reserva" | "liberar_slots_futuros";
      label: string;
      effect: string;
      horizonNote: string;
    };
  };
  suggestions: SuggestionItem[];
  history: RegistroExecucao[];
  impactSummary: ImmediateImpactSummary | null;
  actionsDisabled?: boolean;
  onStatusChange: (
    allocationId: string,
    status: "em_execucao" | "concluido" | "parcial" | "bloqueado" | "remarcado",
  ) => void;
  onPullSuggestion: (allocationId: string) => void;
  onOpenWork: (workId: string) => void;
  recentConsequences: PlannerConsequence[];
  rescheduleSuggestion?: ReviewOption;
  reviewItem?: ReviewItemView;
  onCreateIssue: (input: PlannerIssueInput) => void;
  onAcceptReview: (allocationId: string, target?: ReviewOption) => void;
  onDeferReview: (allocationId: string) => void;
  onIgnoreReview: (allocationId: string) => void;
}

function ReadLine({
  title,
  value,
  tone = "default",
}: {
  title: string;
  value: string;
  tone?: "default" | "risk" | "opportunity";
}) {
  const tones = {
    default: "border-slate-200 bg-slate-50 text-slate-700",
    risk: "border-danger/15 bg-danger-soft text-danger-ink",
    opportunity: "border-accent/15 bg-accent-soft text-accent-ink",
  };

  return (
    <div className={`rounded-3xl border px-4 py-4 ${tones[tone]}`}>
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] opacity-70">{title}</p>
      <p className="mt-2 text-sm font-semibold leading-6">{value}</p>
    </div>
  );
}

function KeyHint({ children }: { children: string }) {
  return (
    <kbd className="rounded-md border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
      {children}
    </kbd>
  );
}

export function RightDetailPanel({
  item,
  blockingContext,
  suggestions,
  history,
  impactSummary,
  actionsDisabled,
  onStatusChange,
  onPullSuggestion,
  onOpenWork,
  recentConsequences,
  rescheduleSuggestion,
  reviewItem,
  onCreateIssue,
  onAcceptReview,
  onDeferReview,
  onIgnoreReview,
}: RightDetailPanelProps) {
  const allocation = item?.alocacao;
  const trabalho = item?.trabalho;
  const bloco = item?.bloco;
  const [issueDraft, setIssueDraft] = useState<{
    tipo: "tarefa" | "problema";
    etapaId: string;
    titulo: string;
    descricao: string;
  }>({
    tipo: "tarefa",
    etapaId: "",
    titulo: "",
    descricao: "",
  });

  const completedBlocks =
    trabalho && bloco
      ? Math.max(0, Math.round((trabalho.percentualConclusao / 100) * bloco.totalBlocos))
      : 0;
  const remainingBlocks = bloco ? Math.max(bloco.totalBlocos - completedBlocks, 0) : 0;
  const remainingMinutes = bloco
    ? Math.max(bloco.duracaoPlanejadaMin - bloco.duracaoRealizadaMin, 0)
    : 0;
  const nextBestAction = item?.dependencia
    ? "Acompanhar liberação e evitar reservar mais slots até confirmação."
    : item?.statusVisual === "parcial"
      ? "Retomar este bloco antes de abrir novos itens para não fragmentar contexto."
      : item?.statusVisual === "em_execucao"
        ? "Manter execução até concluir este bloco ou registrar parcial com saldo claro."
      : item?.statusVisual === "remarcado"
          ? "Confirmar novo encaixe para não perder rastreabilidade do dia."
          : "Este é o próximo candidato natural de execução.";
  const visibleConsequences = recentConsequences.filter((consequence, index, collection) => {
    if (
      impactSummary?.contextTag?.label &&
      consequence.title.toLowerCase() === impactSummary.contextTag.label.toLowerCase()
    ) {
      return false;
    }

    if (impactSummary?.details.includes(consequence.detail)) {
      return false;
    }

    if (
      impactSummary?.recommendedAction &&
      consequence.detail.toLowerCase() === impactSummary.recommendedAction.toLowerCase()
    ) {
      return false;
    }

    return (
      collection.findIndex(
        (item) =>
          item.title.toLowerCase() === consequence.title.toLowerCase() &&
          item.detail.toLowerCase() === consequence.detail.toLowerCase(),
      ) === index
    );
  });
  const handleIssueSubmit = () => {
    if (!trabalho || !bloco || !allocation || !issueDraft.titulo.trim()) {
      return;
    }

    onCreateIssue({
      trabalhoId: trabalho.id,
      etapaId: issueDraft.etapaId || undefined,
      blocoId: bloco.id,
      alocacaoId: allocation.id,
      tipo: issueDraft.tipo,
      titulo: issueDraft.titulo.trim(),
      descricao: issueDraft.descricao.trim(),
    });

    setIssueDraft({
      tipo: "tarefa",
      etapaId: issueDraft.etapaId,
      titulo: "",
      descricao: "",
    });
  };

  return (
    <aside className="scrollbar-thin min-h-0 space-y-5 overflow-y-auto">
      <section className="rounded-[32px] border border-black/5 bg-white p-5 shadow-panel">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Painel operacional</p>

        {!item ? (
          <div className="mt-5 rounded-3xl bg-slate-50 p-6 text-sm text-slate-500">
            Selecione um slot na timeline para abrir leitura operacional e ações rápidas.
          </div>
        ) : !allocation || !trabalho || !bloco ? (
          <div className="mt-5 space-y-5">
            <div>
              <StatusBadge status="livre" />
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
                {item.slot.nome} está livre
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {item.slot.horaInicio} - {item.slot.horaFim}. Esta janela pode absorver antecipação ou remarcação sem abrir um fluxo novo.
              </p>
            </div>

            <ReadLine
              title="Leitura principal"
              tone="opportunity"
              value={
                suggestions[0]
                  ? `${suggestions[0].trabalho.titulo} é o melhor encaixe agora. ${suggestions[0].impacto}.`
                  : "Sem blocos elegíveis para antecipação neste slot."
              }
            />

            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Melhores opções</p>
              <div className="mt-3 space-y-3">
                {suggestions.length ? (
                  suggestions.map((suggestion, index) => (
                    <div
                      key={suggestion.alocacao.id}
                      className={`rounded-[28px] border p-4 ${
                        index === 0
                          ? "border-accent/20 bg-accent-soft"
                          : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            {index === 0 ? (
                              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-accent-ink">
                                Melhor encaixe
                              </span>
                            ) : null}
                            <PriorityBadge prioridade={suggestion.trabalho.prioridade} />
                          </div>
                          <h4 className="mt-3 text-base font-semibold tracking-tight text-slate-900">
                            {suggestion.trabalho.titulo}
                          </h4>
                          <p className="mt-2 text-sm text-slate-600">{suggestion.resumo}</p>
                        </div>
                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                          {suggestion.impactoCurto}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                        <ReadLine title="Impacto" tone="opportunity" value={suggestion.impacto} />
                        <ReadLine
                          title="Próxima decisão"
                          value="Confirmar antecipação e liberar esse ganho agora."
                        />
                      </div>

                      <button
                        className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-shell px-4 py-2.5 text-sm font-medium text-white"
                        onClick={() => onPullSuggestion(suggestion.alocacao.id)}
                        type="button"
                      >
                        Puxar para este slot
                        <ArrowUpRight className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="rounded-3xl bg-slate-50 px-4 py-4 text-sm text-slate-500">
                    Este slot está livre, mas não há bloco elegível para antecipação no momento.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={item.statusVisual} />
                <PriorityBadge prioridade={trabalho.prioridade} />
              </div>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{trabalho.titulo}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {bloco.sequencia}/{bloco.totalBlocos} em {item.slot.nome}. {item.slot.horaInicio} - {item.slot.horaFim}.
              </p>
            </div>

            <ReadLine
              title="Leitura principal"
              tone={item.dependencia || trabalho.emRisco ? "risk" : "default"}
              value={
                item.dependencia
                  ? `Bloqueado por ${item.dependencia.responsavelExterno}. Não vale insistir antes da liberação.`
                  : remainingBlocks > 0
                    ? `Faltam ${remainingBlocks} bloco${remainingBlocks === 1 ? "" : "s"} para concluir este trabalho.`
                    : "Este trabalho já está na reta final."
              }
            />

            <div className="grid grid-cols-2 gap-3">
              <ReadLine title="Prazo" value={`Prazo ${formatDateShort(trabalho.prazoData)}`} tone={trabalho.emRisco ? "risk" : "default"} />
              <ReadLine title="Saldo restante" value={`${formatMinutes(remainingMinutes)} neste bloco`} />
              <ReadLine title="Já concluído" value={`${completedBlocks} bloco${completedBlocks === 1 ? "" : "s"} concluído${completedBlocks === 1 ? "" : "s"}`} />
              <ReadLine title="Origem" value={allocation.origemAlocacao.replace("_", " ")} />
            </div>

            <div className="rounded-3xl border border-black/5 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Progresso e prazo</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {trabalho.emRisco ? "Sensível a prazo" : "Dentro da cadência planejada"}
                  </p>
                </div>
                <Clock3 className="h-4 w-4 text-slate-400" />
              </div>
              <div className="mt-4">
                <WorkProgressBar value={trabalho.percentualConclusao} />
              </div>
            </div>

            {item.dependencia ? (
              <ReadLine
                title="Dependência / risco"
                tone="risk"
                value={`Aguardando retorno de ${item.dependencia.responsavelExterno}. Liberação prevista em ${formatDateShort(item.dependencia.dataPrevistaLiberacao)}.`}
              />
            ) : trabalho.emRisco ? (
              <ReadLine
                title="Dependência / risco"
                tone="risk"
                value="Este trabalho está em risco de prazo. Fechar este bloco agora reduz exposição até o fim do dia."
              />
            ) : null}

            {item.dependencia && blockingContext?.politicaResumo ? (
              <ReadLine
                title="Política aplicada"
                tone={blockingContext.politicaResumo.action === "liberar_slots_futuros" ? "opportunity" : "default"}
                value={`${blockingContext.politicaResumo.label}. ${blockingContext.politicaResumo.effect} ${blockingContext.politicaResumo.horizonNote}`}
              />
            ) : null}

            <ReadLine title="Próxima melhor ação" tone="opportunity" value={nextBestAction} />

            {rescheduleSuggestion ? (
              <ReadLine
                title="Menor impacto para remarcar"
                tone="opportunity"
                value={`${rescheduleSuggestion.slotLabel} em ${formatDateShort(rescheduleSuggestion.date)}. ${rescheduleSuggestion.tradeoff.effect}`}
              />
            ) : null}

            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Ações rápidas</p>
              {actionsDisabled ? (
                <p className="mt-2 text-sm text-slate-500">Operação em andamento. Evite duplicar a ação.</p>
              ) : null}
              <div className="mt-3 grid grid-cols-2 gap-2">
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
                  <KeyHint>C</KeyHint>
                </button>
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={actionsDisabled}
                  onClick={() => onStatusChange(allocation.id, "parcial")}
                  type="button"
                >
                  <CircleDashed className="h-4 w-4" />
                  Registrar parcial
                  <KeyHint>P</KeyHint>
                </button>
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={actionsDisabled}
                  onClick={() => onStatusChange(allocation.id, "bloqueado")}
                  type="button"
                >
                  <Lock className="h-4 w-4" />
                  Bloquear
                  <KeyHint>B</KeyHint>
                </button>
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={actionsDisabled}
                  onClick={() => onStatusChange(allocation.id, "remarcado")}
                  type="button"
                >
                  <MoveRight className="h-4 w-4" />
                  Remarcar
                  <KeyHint>R</KeyHint>
                </button>
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700"
                  onClick={() => onOpenWork(trabalho.id)}
                  type="button"
                >
                  <SquareArrowOutUpRight className="h-4 w-4" />
                  Abrir trabalho
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-black/5 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Registrar issue</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    Capture tarefa ou problema descoberto durante este bloco.
                  </p>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                  bloco {bloco.sequencia}/{bloco.totalBlocos}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-[140px_minmax(0,1fr)] gap-3">
                  <label className="space-y-2">
                    <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Tipo</span>
                    <select
                      className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none"
                      onChange={(event) =>
                        setIssueDraft((current) => ({
                          ...current,
                          tipo: event.target.value as "tarefa" | "problema",
                        }))
                      }
                      value={issueDraft.tipo}
                    >
                      <option value="tarefa">Tarefa</option>
                      <option value="problema">Problema</option>
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Milestone</span>
                    <select
                      className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none"
                      onChange={(event) =>
                        setIssueDraft((current) => ({
                          ...current,
                          etapaId: event.target.value,
                        }))
                      }
                      value={issueDraft.etapaId}
                    >
                      <option value="">Sem milestone específico</option>
                      {trabalho.etapas?.map((etapa) => (
                        <option key={etapa.id} value={etapa.id}>
                          {etapa.titulo}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="space-y-2">
                  <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Título</span>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none"
                    onChange={(event) =>
                      setIssueDraft((current) => ({
                        ...current,
                        titulo: event.target.value,
                      }))
                    }
                    placeholder="Ex.: Ajustar dependência do cronograma"
                    value={issueDraft.titulo}
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Contexto</span>
                  <textarea
                    className="min-h-[88px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none"
                    onChange={(event) =>
                      setIssueDraft((current) => ({
                        ...current,
                        descricao: event.target.value,
                      }))
                    }
                    placeholder="Descreva a tarefa descoberta ou o problema encontrado neste bloco."
                    value={issueDraft.descricao}
                  />
                </label>

                <button
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-shell px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={actionsDisabled || !issueDraft.titulo.trim()}
                  onClick={handleIssueSubmit}
                  type="button"
                >
                  Registrar issue
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Histórico curto</p>
                <TimerReset className="h-4 w-4 text-slate-400" />
              </div>
              <div className="mt-3 space-y-2">
                {history.length ? (
                  history.map((registro) => (
                    <div key={registro.id} className="rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-600">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-slate-800">{registro.resultado}</span>
                        <span>{formatMinutes(registro.minutosRealizados)}</span>
                      </div>
                      {registro.motivo ? <p className="mt-2 text-xs text-slate-500">{registro.motivo}</p> : null}
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-500">
                    Ainda sem histórico adicional para este slot.
                  </div>
                )}
              </div>
            </div>

            {suggestions.length ? (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <TriangleAlert className="mt-0.5 h-4 w-4 text-slate-500" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Se este bloco fechar cedo, ainda dá para puxar outra frente hoje.
                    </p>
                    <p className="mt-2 text-sm text-slate-600">{suggestions[0].impacto}</p>
                  </div>
                </div>
              </div>
            ) : null}

            {visibleConsequences.length ? (
              <div className="rounded-3xl border border-black/5 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Consequências em cadeia</p>
                <div className="mt-3 space-y-2">
                  {visibleConsequences.slice(0, 3).map((consequence) => (
                    <div key={consequence.id} className="rounded-2xl bg-white px-3 py-3 text-sm text-slate-700">
                      <p className="font-semibold text-slate-900">{consequence.title}</p>
                      <p className="mt-1 text-slate-600">{consequence.detail}</p>
                    </div>
                  ))}
                </div>
                {impactSummary?.recommendedAction ? (
                  <div className="mt-3 rounded-2xl border border-accent/15 bg-accent-soft px-3 py-3 text-sm font-medium text-accent-ink">
                    {impactSummary.recommendedAction}
                  </div>
                ) : null}
              </div>
            ) : null}

            {reviewItem ? (
              <RescheduleReviewPanel
                compact
                items={[reviewItem]}
                onAccept={onAcceptReview}
                onDefer={onDeferReview}
                onIgnore={onIgnoreReview}
                onOpenWork={onOpenWork}
                subtitle="Revise este encaixe sem sair do detalhe operacional."
                title="Revisão deste item"
              />
            ) : null}
          </div>
        )}
      </section>
    </aside>
  );
}
