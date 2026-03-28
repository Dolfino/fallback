import { getNextFocus } from "../data/selectors";
import type {
  PlannerCommandContext,
  PlannerCommandName,
  PlannerCommandPayloadMap,
  PlannerTransition,
} from "../types/domain";
import type { PlannerData } from "../types/planner";
import { addDays } from "../utils/date";
import { clampPlannerDate, clampPlannerDateForward, getNextFreeSlot } from "./plannerDerivedState";

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

function allocationStatusWeight(status: PlannerData["alocacoes"][number]["statusAlocacao"]) {
  const weights = {
    parcial: 0,
    planejado: 1,
    remarcado: 2,
    antecipado: 3,
    em_execucao: 4,
    concluido: 5,
    bloqueado: 6,
  } as const;

  return weights[status] ?? 99;
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

    const fallbackDate = clampPlannerDateForward(
      addDays(context.selectedDate, 1),
      context.plannerData.diasSemana,
    );
    const targetDate = clampPlannerDateForward(
      payload.targetDate ?? fallbackDate,
      context.plannerData.diasSemana,
    );
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
  confirm_day_closing(context) {
    const pendingCount = context.plannerData.alocacoes.filter(
      (item) =>
        item.dataPlanejada === context.selectedDate &&
        ["planejado", "em_execucao", "parcial", "remarcado", "antecipado"].includes(item.statusAlocacao),
    ).length;
    const blockedCount = context.plannerData.alocacoes.filter(
      (item) => item.dataPlanejada === context.selectedDate && item.statusAlocacao === "bloqueado",
    ).length;
    const carryoverCount = context.plannerData.alocacoes.filter(
      (item) =>
        item.dataPlanejada < context.selectedDate &&
        ["planejado", "parcial", "remarcado"].includes(item.statusAlocacao),
    ).length;
    const nextDate = clampPlannerDateForward(addDays(context.selectedDate, 1), context.plannerData.diasSemana);
    const nextFocus = getNextFocus(context.plannerData, nextDate);
    const fechamento = {
      date: context.selectedDate,
      confirmedAt: new Date().toISOString(),
      pendingCount,
      blockedCount,
      carryoverCount,
    };
    const nextClosings = [
      ...(context.plannerData.fechamentosOperacionais ?? []).filter((entry) => entry.date !== context.selectedDate),
      fechamento,
    ].sort((first, second) => first.date.localeCompare(second.date));

    return {
      command: "confirm_day_closing",
      nextData: {
        ...context.plannerData,
        fechamentosOperacionais: nextClosings,
      },
      uiPatch: {
        nextDate,
        nextSlotId: nextFocus?.slot.id,
        nextWorkId: nextFocus?.trabalho?.id,
        openDetailPanel: true,
      },
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
    const targetDate = clampPlannerDateForward(
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
  auto_replan_week(context) {
    const targetDates = context.plannerData.diasSemana.filter((date) => date >= context.selectedDate);
    const slotIndexById = new Map(context.plannerData.slots.map((slot, index) => [slot.id, index]));
    const carryover = context.plannerData.alocacoes
      .filter(
        (item) =>
          item.dataPlanejada < context.selectedDate &&
          ["planejado", "parcial", "remarcado"].includes(item.statusAlocacao),
      )
      .sort((first, second) => {
        const statusDiff =
          allocationStatusWeight(first.statusAlocacao) - allocationStatusWeight(second.statusAlocacao);
        if (statusDiff !== 0) {
          return statusDiff;
        }

        const dateDiff = first.dataPlanejada.localeCompare(second.dataPlanejada);
        if (dateDiff !== 0) {
          return dateDiff;
        }

        return (slotIndexById.get(first.slotId) ?? 0) - (slotIndexById.get(second.slotId) ?? 0);
      });

    if (!carryover.length || !targetDates.length) {
      return null;
    }

    const usedSlotsByDate = new Map<string, Set<string>>();
    targetDates.forEach((date) => {
      usedSlotsByDate.set(
        date,
        new Set(
          context.plannerData.alocacoes
            .filter((item) => item.dataPlanejada === date)
            .map((item) => item.slotId),
        ),
      );
    });

    const targetAssignments = new Map<string, { date: string; slotId: string }>();
    const unresolvedAllocationIds: string[] = [];

    for (const allocation of carryover) {
      let assigned = false;

      for (const date of targetDates) {
        const usedSlots = usedSlotsByDate.get(date);
        const nextSlot = context.plannerData.slots.find((slot) => !usedSlots?.has(slot.id));

        if (!usedSlots || !nextSlot) {
          continue;
        }

        usedSlots.add(nextSlot.id);
        targetAssignments.set(allocation.id, {
          date,
          slotId: nextSlot.id,
        });
        assigned = true;
        break;
      }

      if (!assigned) {
        unresolvedAllocationIds.push(allocation.id);
      }
    }

    if (!targetAssignments.size) {
      return null;
    }

    const movedAllocationIds = [...targetAssignments.keys()];
    const nextData: PlannerData = {
      ...context.plannerData,
      alocacoes: context.plannerData.alocacoes.map((allocation) => {
        const target = targetAssignments.get(allocation.id);
        if (!target) {
          return allocation;
        }

        return {
          ...allocation,
          dataPlanejada: target.date,
          slotId: target.slotId,
          statusAlocacao: "remarcado",
          origemAlocacao: "replanejamento",
        };
      }),
      blocos: context.plannerData.blocos.map((block) =>
        movedAllocationIds.some((allocationId) =>
          context.plannerData.alocacoes.find((allocation) => allocation.id === allocationId)?.blocoId === block.id,
        )
          ? {
              ...block,
              foiRemarcado: true,
              motivoRemanejamento: "Carregado da semana anterior na abertura do novo horizonte.",
            }
          : block,
      ),
    };

    const firstMovedAllocationId = movedAllocationIds[0];
    const firstMovedTarget = firstMovedAllocationId ? targetAssignments.get(firstMovedAllocationId) : undefined;
    const firstMovedAllocation = firstMovedAllocationId
      ? context.plannerData.alocacoes.find((allocation) => allocation.id === firstMovedAllocationId)
      : undefined;
    const firstMovedBlock = firstMovedAllocation
      ? context.plannerData.blocos.find((block) => block.id === firstMovedAllocation.blocoId)
      : undefined;

    return {
      command: "auto_replan_week",
      nextData,
      uiPatch: {
        nextDate: context.selectedDate,
        nextSlotId: firstMovedTarget?.slotId,
        nextWorkId: firstMovedBlock?.trabalhoId,
        openDetailPanel: context.isDetailPanelOpen,
      },
      reviewAllocationIds: [...movedAllocationIds, ...unresolvedAllocationIds],
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
