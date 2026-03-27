import { getNextFocus } from "../data/selectors";
import type {
  PlannerCommandContext,
  PlannerCommandName,
  PlannerCommandPayloadMap,
  PlannerTransition,
} from "../types/domain";
import type { PlannerData } from "../types/planner";
import { addDays } from "../utils/date";
import { clampPlannerDate, getNextFreeSlot } from "./plannerDerivedState";

function findAllocationBundle(data: PlannerData, allocationId: string) {
  const allocation = data.alocacoes.find((item) => item.id === allocationId);
  const bloco = allocation ? data.blocos.find((item) => item.id === allocation.blocoId) : undefined;
  const trabalho = bloco ? data.trabalhos.find((item) => item.id === bloco.trabalhoId) : undefined;

  return { allocation, bloco, trabalho };
}

function moveAllocationToTarget(
  data: PlannerData,
  allocationId: string,
  targetDate: string,
  targetSlotId: string,
  reason: string,
): PlannerData {
  const { allocation } = findAllocationBundle(data, allocationId);
  if (!allocation) {
    return data;
  }

  return {
    ...data,
    alocacoes: data.alocacoes.map((item) =>
      item.id === allocationId
        ? {
            ...item,
            dataPlanejada: targetDate,
            slotId: targetSlotId,
            statusAlocacao: "remarcado",
            origemAlocacao: "replanejamento",
          }
        : item,
    ),
    blocos: data.blocos.map((bloco) =>
      bloco.id === allocation.blocoId
        ? {
            ...bloco,
            foiRemarcado: true,
            motivoRemanejamento: reason,
          }
        : bloco,
    ),
  };
}

type CommandHandler<K extends PlannerCommandName> = (
  context: PlannerCommandContext,
  payload: PlannerCommandPayloadMap[K],
) => PlannerTransition | null;

const commandHandlers: {
  [K in PlannerCommandName]: CommandHandler<K>;
} = {
  start_block(context, payload) {
    const { allocation, bloco, trabalho } = findAllocationBundle(context.plannerData, payload.allocationId);
    if (!allocation) {
      return null;
    }

    return {
      command: "start_block",
      nextData: {
        ...context.plannerData,
        alocacoes: context.plannerData.alocacoes.map((item) =>
          item.id === payload.allocationId ? { ...item, statusAlocacao: "em_execucao" } : item,
        ),
        blocos: context.plannerData.blocos.map((item) =>
          item.id === allocation.blocoId ? { ...item, status: "em_execucao" } : item,
        ),
      },
      uiPatch: {
        nextSlotId: allocation.slotId,
        nextWorkId: trabalho?.id ?? bloco?.trabalhoId,
        openDetailPanel: true,
        slotFeedback: {
          slotId: allocation.slotId,
          label: "Em execução",
          tone: "opportunity",
        },
      },
      sourceSlotId: allocation.slotId,
    };
  },
  complete_block(context, payload) {
    const { allocation, bloco, trabalho } = findAllocationBundle(context.plannerData, payload.allocationId);
    if (!allocation || !bloco) {
      return null;
    }

    return {
      command: "complete_block",
      nextData: {
        ...context.plannerData,
        alocacoes: context.plannerData.alocacoes.map((item) =>
          item.id === payload.allocationId ? { ...item, statusAlocacao: "concluido" } : item,
        ),
        blocos: context.plannerData.blocos.map((item) =>
          item.id === allocation.blocoId
            ? {
                ...item,
                status: "concluido",
                duracaoRealizadaMin: item.duracaoPlanejadaMin,
              }
            : item,
        ),
      },
      uiPatch: {
        nextSlotId: allocation.slotId,
        nextWorkId: trabalho?.id,
        openDetailPanel: true,
        slotFeedback: {
          slotId: allocation.slotId,
          label: "Concluído agora",
          tone: "success",
        },
      },
      sourceSlotId: allocation.slotId,
    };
  },
  mark_block_partial(context, payload) {
    const { allocation, bloco, trabalho } = findAllocationBundle(context.plannerData, payload.allocationId);
    if (!allocation || !bloco) {
      return null;
    }

    return {
      command: "mark_block_partial",
      nextData: {
        ...context.plannerData,
        alocacoes: context.plannerData.alocacoes.map((item) =>
          item.id === payload.allocationId ? { ...item, statusAlocacao: "parcial" } : item,
        ),
        blocos: context.plannerData.blocos.map((item) =>
          item.id === allocation.blocoId
            ? {
                ...item,
                status: "parcial",
                duracaoRealizadaMin: Math.max(
                  item.duracaoRealizadaMin,
                  Math.floor(item.duracaoPlanejadaMin * 0.5),
                ),
              }
            : item,
        ),
      },
      uiPatch: {
        nextSlotId: allocation.slotId,
        nextWorkId: trabalho?.id,
        openDetailPanel: true,
        slotFeedback: {
          slotId: allocation.slotId,
          label: "Saldo pendente",
          tone: "warning",
        },
      },
      sourceSlotId: allocation.slotId,
      reviewAllocationIds: [allocation.id],
    };
  },
  block_allocation(context, payload) {
    const { allocation, bloco, trabalho } = findAllocationBundle(context.plannerData, payload.allocationId);
    if (!allocation || !bloco) {
      return null;
    }

    return {
      command: "block_allocation",
      nextData: {
        ...context.plannerData,
        alocacoes: context.plannerData.alocacoes.map((item) =>
          item.id === payload.allocationId ? { ...item, statusAlocacao: "bloqueado" } : item,
        ),
        blocos: context.plannerData.blocos.map((item) =>
          item.id === allocation.blocoId ? { ...item, status: "bloqueado" } : item,
        ),
      },
      uiPatch: {
        nextSlotId: allocation.slotId,
        nextWorkId: trabalho?.id,
        openDetailPanel: true,
        slotFeedback: {
          slotId: allocation.slotId,
          label: "Bloqueado",
          tone: "critical",
        },
      },
      sourceSlotId: allocation.slotId,
      reviewAllocationIds: [allocation.id],
    };
  },
  reschedule_block(context, payload) {
    const { allocation, trabalho } = findAllocationBundle(context.plannerData, payload.allocationId);
    if (!allocation) {
      return null;
    }

    const fallbackDate = clampPlannerDate(
      addDays(context.selectedDate, 1),
      context.plannerData.diasSemana,
    );
    const targetDate = clampPlannerDate(payload.targetDate ?? fallbackDate, context.plannerData.diasSemana);
    const nextSlot =
      payload.targetSlotId
        ? context.plannerData.slots.find((slot) => slot.id === payload.targetSlotId)
        : getNextFreeSlot(context.plannerData, targetDate);

    if (!nextSlot) {
      return null;
    }

    return {
      command: "reschedule_block",
      nextData: moveAllocationToTarget(
        context.plannerData,
        payload.allocationId,
        targetDate,
        nextSlot.id,
        payload.reason ?? "Replanejado por revisão assistida.",
      ),
      uiPatch: {
        nextSlotId: allocation.slotId,
        nextWorkId: trabalho?.id,
        openDetailPanel: true,
        slotFeedback: {
          slotId: allocation.slotId,
          label: "Slot liberado",
          tone: "opportunity",
        },
      },
      sourceSlotId: allocation.slotId,
      targetSlotId: nextSlot.id,
      reviewAllocationIds: [allocation.id],
    };
  },
  pull_forward_block(context, payload) {
    const { allocation, trabalho } = findAllocationBundle(context.plannerData, payload.allocationId);
    if (!allocation) {
      return null;
    }

    return {
      command: "pull_forward_block",
      nextData: {
        ...context.plannerData,
        alocacoes: context.plannerData.alocacoes.map((item) =>
          item.id === payload.allocationId
            ? {
                ...item,
                dataPlanejada: context.selectedDate,
                slotId: payload.slotId,
                statusAlocacao: "antecipado",
                origemAlocacao: "antecipacao",
              }
            : item,
        ),
        blocos: context.plannerData.blocos.map((item) =>
          item.id === allocation.blocoId ? { ...item, foiAntecipado: true } : item,
        ),
      },
      uiPatch: {
        nextSlotId: payload.slotId,
        nextWorkId: trabalho?.id,
        openDetailPanel: true,
        slotFeedback: {
          slotId: payload.slotId,
          label: "Antecipado",
          tone: "opportunity",
        },
      },
      targetSlotId: payload.slotId,
    };
  },
  toggle_detail_panel(context, payload) {
    return {
      command: "toggle_detail_panel",
      nextData: context.plannerData,
      uiPatch: {
        openDetailPanel: payload.nextOpen,
      },
    };
  },
  select_next_focus(context) {
    const nextFocus = getNextFocus(context.plannerData, context.selectedDate);
    if (!nextFocus) {
      return null;
    }

    return {
      command: "select_next_focus",
      nextData: context.plannerData,
      uiPatch: {
        nextSlotId: nextFocus.slot.id,
        nextWorkId: nextFocus.trabalho?.id,
        openDetailPanel: true,
      },
      targetSlotId: nextFocus.slot.id,
    };
  },
  auto_replan_day(context) {
    const targetDate = clampPlannerDate(
      addDays(context.selectedDate, 1),
      context.plannerData.diasSemana,
    );
    const pending = context.plannerData.alocacoes.filter(
      (item) =>
        item.dataPlanejada === context.selectedDate &&
        ["planejado", "parcial", "remarcado"].includes(item.statusAlocacao),
    );
    const usedSlots = new Set(
      context.plannerData.alocacoes
        .filter((item) => item.dataPlanejada === targetDate)
        .map((item) => item.slotId),
    );
    const freeSlots = context.plannerData.slots.filter((slot) => !usedSlots.has(slot.id));
    let freeIndex = 0;
    const movedAllocationIds: string[] = [];

    const nextData: PlannerData = {
      ...context.plannerData,
      alocacoes: context.plannerData.alocacoes.map((alocacao) => {
        const shouldMove = pending.find((item) => item.id === alocacao.id);
        const nextSlot = freeSlots[freeIndex];

        if (!shouldMove || !nextSlot) {
          return alocacao;
        }

        movedAllocationIds.push(alocacao.id);
        freeIndex += 1;
        return {
          ...alocacao,
          dataPlanejada: targetDate,
          slotId: nextSlot.id,
          statusAlocacao: "remarcado",
          origemAlocacao: "replanejamento",
        };
      }),
      blocos: context.plannerData.blocos.map((bloco) =>
        movedAllocationIds.some((id) =>
          context.plannerData.alocacoes.find((alocacao) => alocacao.id === id)?.blocoId === bloco.id,
        )
          ? {
              ...bloco,
              foiRemarcado: true,
              motivoRemanejamento: "Remarcado no fechamento automático do dia.",
            }
          : bloco,
      ),
    };

    return {
      command: "auto_replan_day",
      nextData,
      uiPatch: {
        openDetailPanel: context.isDetailPanelOpen,
      },
      reviewAllocationIds: movedAllocationIds,
    };
  },
};

export function runPlannerCommand<K extends PlannerCommandName>(
  command: K,
  context: PlannerCommandContext,
  payload: PlannerCommandPayloadMap[K],
) {
  return commandHandlers[command](context, payload);
}
