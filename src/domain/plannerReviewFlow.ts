import {
  getImmediateImpactSummary,
  getShortHorizonDates,
  getShortHorizonLoad,
  getUpcomingPressurePoints,
} from "../data/selectors";
import type {
  ImmediateImpactSummary,
  PlannerConsequence,
  ReviewAction,
  ReviewFlowResolution,
  ReviewFlowState,
  ReviewItemView,
  ReviewOption,
  ReviewTradeoff,
  ReviewTradeoffCode,
  SystemFeedback,
} from "../types/domain";
import type { PlannerData } from "../types/planner";
import { formatDateShort } from "../utils/format";

function createEmptyReviewState(): ReviewFlowState {
  return {
    activeAllocationIds: [],
    decisions: {},
  };
}

function uniqueAllocationIds(items: string[]) {
  return [...new Set(items)];
}

function createTradeoff(params: {
  code: ReviewTradeoffCode;
  frees: number;
  date: string;
  referenceDate: string;
}): ReviewTradeoff {
  const { code, frees, date, referenceDate } = params;

  switch (code) {
    case "uses_idle_window":
      return {
        code,
        label: "Usa janela ociosa",
        effect: "Ocupa a próxima capacidade útil.",
        tone: "positive",
      };
    case "preserve_tomorrow_capacity":
      return {
        code,
        label: "Preserva amanhã",
        effect: "Mantém folga útil no próximo dia.",
        tone: "positive",
      };
    case "reduce_short_horizon_pressure":
      return {
        code,
        label: "Reduz pressão",
        effect: "Alivia o horizonte curto.",
        tone: "positive",
      };
    case "avoid_critical_conflict":
      return {
        code,
        label: "Evita conflito crítico",
        effect: "Não disputa slot com bloco sensível.",
        tone: "positive",
      };
    case "increase_tomorrow_load":
      return {
        code,
        label: "Carrega amanhã",
        effect: "Aumenta a carga do próximo dia em 1 bloco.",
        tone: "warning",
      };
    case "pushes_pressure_forward":
      return {
        code,
        label: "Empurra pressão",
        effect: `Joga pressão para ${formatDateShort(date)}.`,
        tone: "warning",
      };
    case "lowest_deadline_impact":
    default:
      return {
        code: "lowest_deadline_impact",
        label: "Menor impacto no prazo",
        effect:
          date === referenceDate
            ? "Cabe ainda hoje sem abrir atraso novo."
            : `Usa ${frees} slot${frees === 1 ? "" : "s"} livre${frees === 1 ? "" : "s"} com menor impacto.`,
        tone: "neutral",
      };
  }
}

function buildReviewOptions(
  data: PlannerData,
  referenceDate: string,
  allocationId: string,
  count = 3,
): ReviewOption[] {
  const allocation = data.alocacoes.find((item) => item.id === allocationId);
  const block = data.blocos.find((item) => item.id === allocation?.blocoId);
  const work = data.trabalhos.find((item) => item.id === block?.trabalhoId);

  if (!allocation || !block || !work) {
    return [];
  }

  const dates = getShortHorizonDates(data, referenceDate, 3).filter((date) => date >= referenceDate);
  const load = getShortHorizonLoad(data, referenceDate, 3);
  const pressurePoints = getUpcomingPressurePoints(data, referenceDate, 6);
  const originalSlotIndex = data.slots.findIndex((slot) => slot.id === allocation.slotId);

  return dates
    .flatMap((date) => {
      const usedSlots = new Set(
        data.alocacoes
          .filter((item) => item.id !== allocation.id && item.dataPlanejada === date)
          .map((item) => item.slotId),
      );

      return data.slots
        .filter((slot) => !usedSlots.has(slot.id))
        .filter((slot) => !(date === allocation.dataPlanejada && slot.id === allocation.slotId))
        .filter((slot) => {
          if (date !== referenceDate) {
            return true;
          }

          const slotIndex = data.slots.findIndex((candidate) => candidate.id === slot.id);
          return slotIndex > originalSlotIndex;
        })
        .map<ReviewOption>((slot) => {
          const loadInfo = load.find((item) => item.date === date);
          const frees = loadInfo?.livres ?? 0;
          const pressureLevel = loadInfo?.pressureLevel ?? "stable";
          const hasPressureForWork = pressurePoints.some((point) => point.title === work.titulo);

          let tradeoffCode: ReviewTradeoffCode = "lowest_deadline_impact";
          if (date === referenceDate) {
            tradeoffCode = "uses_idle_window";
          } else if (pressureLevel === "stable" && frees >= 3) {
            tradeoffCode = "preserve_tomorrow_capacity";
          } else if (pressureLevel === "watch") {
            tradeoffCode = "increase_tomorrow_load";
          } else if (pressureLevel === "critical" || hasPressureForWork) {
            tradeoffCode = "pushes_pressure_forward";
          }

          const tradeoff = createTradeoff({
            code: tradeoffCode,
            frees,
            date,
            referenceDate,
          });

          return {
            id: `${allocation.id}-${date}-${slot.id}`,
            date,
            slotId: slot.id,
            slotLabel: `${slot.nome} às ${slot.horaInicio}`,
            pressureLevel,
            decisionRationale:
              date === referenceDate
                ? `Mantém ${work.titulo} no fluxo do dia sem abrir conflito novo.`
                : `Reposiciona ${work.titulo} para ${formatDateShort(date)} com leitura de carga mais clara.`,
            impactSummary:
              tradeoff.code === "increase_tomorrow_load"
                ? "Aumenta a carga de amanhã em 1 bloco."
                : tradeoff.code === "pushes_pressure_forward"
                  ? `Empurra risco para ${formatDateShort(date)}.`
                  : tradeoff.code === "preserve_tomorrow_capacity"
                    ? "Preserva a capacidade útil de amanhã."
                    : tradeoff.code === "uses_idle_window"
                      ? "Ocupa a próxima janela livre sem travar a sequência."
                      : "Reduz o impacto imediato sobre o prazo.",
            tradeoff,
            isSuggested: false,
          };
        });
    })
    .sort((first, second) => {
      const pressureWeight = { stable: 0, watch: 1, critical: 2 };
      const dateDiff = first.date.localeCompare(second.date);
      if (dateDiff !== 0) {
        return dateDiff;
      }

      return pressureWeight[first.pressureLevel] - pressureWeight[second.pressureLevel];
    })
    .slice(0, count)
    .map((option, index) => ({
      ...option,
      isSuggested: index === 0,
    }));
}

function findPressureNote(data: PlannerData, referenceDate: string, workTitle: string) {
  return getUpcomingPressurePoints(data, referenceDate, 4).find((point) => point.title === workTitle)?.detail;
}

function buildComparisonNote(item: {
  suggestedOption?: ReviewOption;
  acceptedOption?: ReviewOption;
  reviewStatus: ReviewItemView["reviewStatus"];
}) {
  if (item.reviewStatus === "accepted" && item.acceptedOption) {
    if (item.suggestedOption && item.acceptedOption.id !== item.suggestedOption.id) {
      return `Escolha aceita: ${item.acceptedOption.tradeoff.effect}`;
    }

    return `Sugestão confirmada: ${item.acceptedOption.impactSummary}`;
  }

  if (item.reviewStatus === "deferred") {
    return "Decisão adiada sem remover a sugestão da frente.";
  }

  if (item.reviewStatus === "ignored") {
    return "Sugestão retirada da frente temporariamente.";
  }

  return undefined;
}

export function queueReviewItems(
  state: ReviewFlowState | undefined,
  allocationIds?: string[],
): ReviewFlowState {
  const current = state ?? createEmptyReviewState();
  if (!allocationIds?.length) {
    return current;
  }

  return {
    ...current,
    activeAllocationIds: uniqueAllocationIds([...current.activeAllocationIds, ...allocationIds]),
    decisions: allocationIds.reduce<ReviewFlowState["decisions"]>((acc, allocationId) => {
      if (acc[allocationId]) {
        return acc;
      }

      return {
        ...acc,
        [allocationId]: {
          status: "pending",
        },
      };
    }, current.decisions),
  };
}

export function buildReviewItems(params: {
  data: PlannerData;
  referenceDate: string;
  state: ReviewFlowState;
}): ReviewItemView[] {
  const { data, referenceDate, state } = params;
  const focusSet = new Set(state.activeAllocationIds);
  const baseAllocationIds = data.alocacoes
    .filter(
      (item) =>
        (item.dataPlanejada === referenceDate &&
          ["parcial", "bloqueado", "planejado", "remarcado", "antecipado"].includes(item.statusAlocacao)) ||
        focusSet.has(item.id),
    )
    .map((item) => item.id);

  return uniqueAllocationIds(baseAllocationIds)
    .map<ReviewItemView | null>((allocationId) => {
      const allocation = data.alocacoes.find((item) => item.id === allocationId);
      const bloco = data.blocos.find((item) => item.id === allocation?.blocoId);
      const trabalho = data.trabalhos.find((item) => item.id === bloco?.trabalhoId);
      if (!allocation || !bloco || !trabalho) {
        return null;
      }

      const slot = data.slots.find((item) => item.id === allocation.slotId);
      if (!slot) {
        return null;
      }

      const dependency = data.dependencias.find(
        (item) =>
          item.trabalhoId === trabalho.id &&
          (!item.blocoId || item.blocoId === bloco.id) &&
          item.status !== "liberada",
      );
      const options = buildReviewOptions(data, referenceDate, allocation.id, 3);
      const suggestedOption = options[0];
      const decision = state.decisions[allocation.id];
      const acceptedOption = decision?.chosenOption;
      const reviewStatus = decision?.status ?? "pending";

      const item: ReviewItemView = {
        allocationId: allocation.id,
        workId: trabalho.id,
        title: trabalho.titulo,
        date: allocation.dataPlanejada,
        currentSlotId: slot.id,
        currentSlotLabel: `${slot.nome} às ${slot.horaInicio}`,
        status: allocation.statusAlocacao,
        saldoRestanteMin: Math.max(bloco.duracaoPlanejadaMin - bloco.duracaoRealizadaMin, 0),
        motivo: dependency
          ? `Aguardando ${dependency.responsavelExterno}`
          : allocation.statusAlocacao === "parcial"
            ? "Ficou parcial e abriu saldo pendente."
            : allocation.statusAlocacao === "remarcado"
              ? "Já foi remarcado e ainda pede confirmação."
              : allocation.statusAlocacao === "antecipado"
                ? "Foi antecipado e ainda pode exigir ajuste fino."
                : allocation.statusAlocacao === "bloqueado"
                  ? "Bloqueio ativo pressiona o restante da cadeia."
                  : "Não executado dentro da janela original.",
        pressureNote: findPressureNote(data, referenceDate, trabalho.titulo),
        suggestedOption,
        acceptedOption,
        alternatives: options,
        reviewStatus,
      };

      return {
        ...item,
        comparisonNote: buildComparisonNote(item),
      };
    })
    .filter((item): item is ReviewItemView => Boolean(item))
    .sort((first, second) => {
      const firstScore = (first.suggestedOption ? 0 : 10) + (first.status === "bloqueado" ? 0 : 1);
      const secondScore = (second.suggestedOption ? 0 : 10) + (second.status === "bloqueado" ? 0 : 1);
      return firstScore - secondScore;
    });
}

export function getSuggestedReviewOption(
  data: PlannerData,
  referenceDate: string,
  allocationId: string,
) {
  return buildReviewOptions(data, referenceDate, allocationId, 1)[0];
}

function createReviewFeedback(
  title: string,
  detail: string,
  tone: SystemFeedback["tone"],
  contextTag?: SystemFeedback["contextTag"],
): SystemFeedback {
  return { title, detail, tone, contextTag };
}

function createReviewImpactSummary(
  headline: string,
  details: string[],
  recommendedAction?: string,
  contextTag?: ImmediateImpactSummary["contextTag"],
): ImmediateImpactSummary {
  return {
    headline,
    details,
    recommendedAction,
    contextTag,
  };
}

export function resolveReviewAction(params: {
  data: PlannerData;
  referenceDate: string;
  state: ReviewFlowState;
  allocationId: string;
  action: ReviewAction;
  option?: ReviewOption;
}): ReviewFlowResolution | null {
  const { data, referenceDate, state, allocationId, action } = params;
  const items = buildReviewItems({ data, referenceDate, state });
  const item = items.find((entry) => entry.allocationId === allocationId);

  if (!item) {
    return null;
  }

  if (action === "accept") {
    const chosenOption = params.option ?? item.suggestedOption;
    if (!chosenOption) {
      return null;
    }

    const nextState: ReviewFlowState = {
      ...state,
      decisions: {
        ...state.decisions,
        [allocationId]: {
          status: "accepted",
          acceptedOptionId: chosenOption.id,
          chosenOption,
        },
      },
    };

    return {
      nextState,
      followUpCommand: {
        command: "reschedule_block",
        payload: {
          allocationId,
          targetDate: chosenOption.date,
          targetSlotId: chosenOption.slotId,
          reason: "Remarcado por revisão assistida.",
        },
      },
      consequences: [
        {
          id: `review-accept-${allocationId}`,
          type: "reschedule_suggested",
          tone: "success",
          title: "Remarcação confirmada",
          detail: `${chosenOption.slotLabel} foi aceito. ${chosenOption.tradeoff.effect}`,
        },
        {
          id: `review-impact-${allocationId}`,
          type:
            chosenOption.tradeoff.tone === "warning" ? "risk_increased" : "risk_reduced",
          tone: chosenOption.tradeoff.tone === "warning" ? "warning" : "success",
          title:
            chosenOption.tradeoff.tone === "warning"
              ? "Tradeoff assumido"
              : "Tradeoff favorável",
          detail: chosenOption.impactSummary,
        },
      ],
      impactSummary: createReviewImpactSummary(
        "Escolha de remarcação registrada",
        [chosenOption.tradeoff.effect, chosenOption.impactSummary],
        `Próxima ação: acompanhar ${item.title} em ${chosenOption.slotLabel}.`,
        {
          label: chosenOption.tradeoff.label,
          tone: chosenOption.tradeoff.tone === "warning" ? "warning" : "success",
        },
      ),
      systemFeedback: createReviewFeedback(
        "Remarcação revisada",
        `${chosenOption.slotLabel} confirmado. ${chosenOption.tradeoff.effect}`,
        chosenOption.tradeoff.tone === "warning" ? "warning" : "success",
        {
          label: chosenOption.tradeoff.label,
          tone: chosenOption.tradeoff.tone === "warning" ? "warning" : "success",
        },
      ),
    };
  }

  if (action === "defer") {
    const nextState: ReviewFlowState = {
      ...state,
      decisions: {
        ...state.decisions,
        [allocationId]: {
          ...state.decisions[allocationId],
          status: "deferred",
        },
      },
    };
    const consequence: PlannerConsequence = {
      id: `review-deferred-${allocationId}`,
      type: "reschedule_suggested",
      tone: "warning",
      title: "Revisão adiada",
      detail: "O item continua monitorado, mas a decisão ficou para o próximo momento útil.",
    };

    return {
      nextState,
      consequences: [consequence],
      impactSummary: getImmediateImpactSummary({
        command: "reschedule_block",
        consequences: [consequence],
        afterData: data,
        referenceDate,
      }),
      systemFeedback: createReviewFeedback(
        "Remarcação adiada",
        "O item continua monitorado, mas a decisão ficou para o próximo momento útil.",
        "warning",
        {
          label: "Revisão",
          tone: "warning",
        },
      ),
    };
  }

  const nextState: ReviewFlowState = {
    ...state,
    decisions: {
      ...state.decisions,
      [allocationId]: {
        ...state.decisions[allocationId],
        status: "ignored",
      },
    },
  };

  return {
    nextState,
    consequences: [
      {
        id: `review-ignored-${allocationId}`,
        type: "reschedule_suggested",
        tone: "neutral",
        title: "Revisão retirada da frente",
        detail: "A sugestão saiu da frente por agora sem alterar a agenda corrente.",
      },
    ],
    impactSummary: createReviewImpactSummary(
      "Revisão removida da frente",
      ["O item continua no horizonte, mas saiu da fila ativa de revisão assistida."],
      undefined,
      {
        label: "Revisão",
        tone: "neutral",
      },
    ),
    systemFeedback: createReviewFeedback(
      "Remarcação ignorada",
      "A sugestão saiu da frente por agora sem alterar a agenda corrente.",
      "neutral",
      {
        label: "Revisão",
        tone: "neutral",
      },
    ),
  };
}

export { createEmptyReviewState };
