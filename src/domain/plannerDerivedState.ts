import type {
  Bloco,
  PlannerData,
  Slot,
  StatusTrabalho,
  Trabalho,
} from "../types/planner";
import { getDateDiffInDays } from "../utils/date";

export function clampPlannerDate(date: string, allowedDates: string[]) {
  if (allowedDates.includes(date)) {
    return date;
  }

  return allowedDates[0];
}

export function getNextFreeSlot(data: PlannerData, date: string): Slot | undefined {
  const usedSlots = new Set(
    data.alocacoes.filter((item) => item.dataPlanejada === date).map((item) => item.slotId),
  );

  return data.slots.find((slot) => !usedSlots.has(slot.id));
}

export function applyPlannerDerivedState(data: PlannerData, currentDate: string): PlannerData {
  const blocksByWork = new Map<string, Bloco[]>();
  data.blocos.forEach((bloco) => {
    const current = blocksByWork.get(bloco.trabalhoId) ?? [];
    current.push(bloco);
    blocksByWork.set(bloco.trabalhoId, current);
  });

  const trabalhos = data.trabalhos.map<Trabalho>((trabalho) => {
    const blocos = blocksByWork.get(trabalho.id) ?? [];
    const dependencias = data.dependencias.filter(
      (dependencia) => dependencia.trabalhoId === trabalho.id && dependencia.status !== "liberada",
    );
    const duracaoRealizadaMin = blocos.reduce((total, bloco) => total + bloco.duracaoRealizadaMin, 0);
    const duracaoPlanejadaMin = blocos.reduce((total, bloco) => total + bloco.duracaoPlanejadaMin, 0);
    const percentualConclusao = duracaoPlanejadaMin
      ? Math.min(100, Math.round((duracaoRealizadaMin / duracaoPlanejadaMin) * 100))
      : trabalho.percentualConclusao;
    const hasBlocked =
      dependencias.some((item) => item.status === "bloqueando") ||
      blocos.some((bloco) => bloco.status === "bloqueado");
    const hasInProgress = blocos.some((bloco) => bloco.status === "em_execucao");
    const hasPartial = blocos.some((bloco) => bloco.status === "parcial");
    const allDone = blocos.length > 0 && blocos.every((bloco) => bloco.status === "concluido");
    const remainingBlocks = blocos.filter((bloco) => bloco.status !== "concluido").length;
    const daysToDeadline = getDateDiffInDays(currentDate, trabalho.prazoData);

    let status: StatusTrabalho = trabalho.status;

    if (allDone) {
      status = "concluido";
    } else if (hasBlocked) {
      status = "bloqueado";
    } else if (hasInProgress) {
      status = "em_execucao";
    } else if (hasPartial) {
      status = "parcial";
    } else if (remainingBlocks > 0) {
      status = "planejado";
    }

    const emRisco =
      status !== "concluido" &&
      (hasBlocked ||
        (daysToDeadline <= 0 && remainingBlocks > 0) ||
        (daysToDeadline <= 1 && remainingBlocks >= 2) ||
        (trabalho.prioridade === "critica" && remainingBlocks > 0));

    return {
      ...trabalho,
      duracaoRealizadaMin,
      percentualConclusao,
      status,
      emRisco,
    };
  });

  return { ...data, trabalhos };
}
