import {
  getNextFocus,
  getTimelineForDate,
  getTomorrowPreview,
} from "../data/selectors";
import { applyPlannerDerivedState } from "./plannerDerivedState";
import type {
  DependencyPolicyAction,
  DependencyFlowResolution,
  ImmediateImpactSummary,
  PlannerConsequence,
} from "../types/domain";
import type { Dependencia, PlannerData } from "../types/planner";
import { addDays } from "../utils/date";
import { formatDateShort } from "../utils/format";

function countFutureImpactedBlocks(
  data: PlannerData,
  params: { dependencyId?: string; trabalhoId?: string; blocoId?: string },
) {
  const dependency = params.dependencyId
    ? data.dependencias.find((item) => item.id === params.dependencyId)
    : undefined;
  const trabalhoId = params.trabalhoId ?? dependency?.trabalhoId;
  const blocoId = params.blocoId ?? dependency?.blocoId;

  if (!trabalhoId) {
    return 0;
  }

  const targetBlock = blocoId
    ? data.blocos.find((item) => item.id === blocoId)
    : undefined;

  return data.alocacoes.filter((allocation) => {
    const block = data.blocos.find((item) => item.id === allocation.blocoId);
    if (!block) {
      return false;
    }

    if (block.trabalhoId !== trabalhoId) {
      return false;
    }

    if (!targetBlock) {
      return true;
    }

    return block.sequencia > targetBlock.sequencia;
  }).length;
}

function buildDependencySummary(consequences: PlannerConsequence[]): ImmediateImpactSummary {
  const primary = consequences[0];
  return {
    headline: "Dependência atualizada",
    details: consequences.map((item) => item.detail).slice(0, 3),
    recommendedAction: consequences.find((item) => item.type === "focus_changed")
      ? "Próxima ação: retomar o foco que voltou a ficar elegível."
      : consequences.find((item) => item.type === "dependency_opened")
        ? "Próxima ação: revisar a política sugerida para os slots futuros."
        : undefined,
    contextTag: primary
      ? {
          label: primary.title,
          tone: primary.tone,
        }
      : {
          label: "Dependência",
          tone: "neutral",
        },
  };
}

function buildDependencyPolicy(params: {
  impactedFutureBlocks: number;
  isWorkAtRisk?: boolean;
}) {
  const { impactedFutureBlocks, isWorkAtRisk } = params;

  if (impactedFutureBlocks === 0) {
    return {
      title: "Liberar slots futuros",
      detail: "Sem efeito dominó relevante no horizonte curto.",
      tone: "opportunity" as const,
    };
  }

  if (isWorkAtRisk) {
    return {
      title: "Manter reserva",
      detail: "Evita perder continuidade assim que a dependência for liberada.",
      tone: "warning" as const,
    };
  }

  return {
    title: "Reavaliar slots futuros",
    detail: `Bloqueio impacta ${impactedFutureBlocks} bloco${impactedFutureBlocks === 1 ? "" : "s"} futuro${impactedFutureBlocks === 1 ? "" : "s"}.`,
    tone: "warning" as const,
  };
}

function getImpactedFutureAllocations(data: PlannerData, dependency: Dependencia) {
  const targetBlock = dependency.blocoId
    ? data.blocos.find((item) => item.id === dependency.blocoId)
    : undefined;

  return data.alocacoes
    .filter((allocation) => {
      const block = data.blocos.find((item) => item.id === allocation.blocoId);
      if (!block || block.trabalhoId !== dependency.trabalhoId) {
        return false;
      }

      if (!targetBlock) {
        return allocation.dataPlanejada >= dependency.dataPrevistaLiberacao;
      }

      return block.sequencia > targetBlock.sequencia;
    })
    .sort((first, second) => {
      const dateDiff = first.dataPlanejada.localeCompare(second.dataPlanejada);
      if (dateDiff !== 0) {
        return dateDiff;
      }

      const firstIndex = data.slots.findIndex((slot) => slot.id === first.slotId);
      const secondIndex = data.slots.findIndex((slot) => slot.id === second.slotId);
      return firstIndex - secondIndex;
    });
}

function moveFutureAllocationsAfterRelease(data: PlannerData, dependency: Dependencia) {
  const impacted = getImpactedFutureAllocations(data, dependency);
  if (!impacted.length) {
    return data;
  }

  const movableIds = new Set(impacted.map((item) => item.id));
  const usedByDate = new Map<string, Set<string>>();

  data.diasSemana.forEach((date) => {
    usedByDate.set(
      date,
      new Set(
        data.alocacoes
          .filter((allocation) => allocation.dataPlanejada === date && !movableIds.has(allocation.id))
          .map((allocation) => allocation.slotId),
      ),
    );
  });

  const releaseIndex = Math.max(0, data.diasSemana.findIndex((date) => date === dependency.dataPrevistaLiberacao));
  const nextAssignments = new Map<string, { date: string; slotId: string }>();

  impacted.forEach((allocation) => {
    const currentDateIndex = data.diasSemana.findIndex((date) => date === allocation.dataPlanejada);
    const startIndex = Math.max(releaseIndex, currentDateIndex);

    for (let dateIndex = startIndex; dateIndex < data.diasSemana.length; dateIndex += 1) {
      const date = data.diasSemana[dateIndex];
      const usedSlots = usedByDate.get(date) ?? new Set<string>();
      const freeSlot = data.slots.find((slot) => !usedSlots.has(slot.id));

      if (!freeSlot) {
        continue;
      }

      usedSlots.add(freeSlot.id);
      usedByDate.set(date, usedSlots);
      nextAssignments.set(allocation.id, { date, slotId: freeSlot.id });
      break;
    }
  });

  return {
    ...data,
    alocacoes: data.alocacoes.map((allocation) => {
      const reassignment = nextAssignments.get(allocation.id);
      if (!reassignment) {
        return allocation;
      }

      return {
        ...allocation,
        dataPlanejada: reassignment.date,
        slotId: reassignment.slotId,
        statusAlocacao: "remarcado" as const,
        origemAlocacao: "replanejamento" as const,
      };
    }),
    blocos: data.blocos.map((block) =>
      impacted.some((allocation) => allocation.blocoId === block.id)
        ? {
            ...block,
            foiRemarcado: true,
            motivoRemanejamento: "Slots futuros liberados por política de dependência.",
          }
        : block,
    ),
  };
}

function buildDependencyResolutionResult(params: {
  nextData: PlannerData;
  referenceDate: string;
  workId?: string;
  dependencyId: string;
  impactedFutureBlocks: number;
  primaryConsequence: PlannerConsequence;
  beforeTomorrowRiskCount: number;
}) {
  const { nextData, referenceDate, workId, dependencyId, impactedFutureBlocks, primaryConsequence, beforeTomorrowRiskCount } = params;
  const work = workId ? nextData.trabalhos.find((item) => item.id === workId) : undefined;
  const afterTomorrow = getTomorrowPreview(nextData, referenceDate);
  const nextFocus = getNextFocus(nextData, referenceDate);
  const timeline = getTimelineForDate(nextData, referenceDate);
  const workSlot = timeline.find((item) => item.trabalho?.id === work?.id && item.alocacao);
  const consequences: PlannerConsequence[] = [primaryConsequence];

  if (impactedFutureBlocks > 0 && primaryConsequence.type === "risk_reduced") {
    consequences.push({
      id: `dependency-future-${dependencyId}`,
      type: "capacity_opened",
      tone: "opportunity",
      title: "Impacto futuro liberado",
      detail: `${impactedFutureBlocks} bloco${impactedFutureBlocks === 1 ? "" : "s"} futuro${impactedFutureBlocks === 1 ? "" : "s"} deixam de ficar travados por esse bloqueio.`,
      workId: work?.id,
      date: referenceDate,
    });
  }

  if (impactedFutureBlocks > 0 && primaryConsequence.type === "dependency_opened") {
    const policy = buildDependencyPolicy({
      impactedFutureBlocks,
      isWorkAtRisk: work?.emRisco,
    });

    consequences.push({
      id: `dependency-policy-${dependencyId}`,
      type: "reschedule_suggested",
      tone: policy.tone,
      title: policy.title,
      detail: policy.detail,
      workId: work?.id,
      date: referenceDate,
    });
  }

  if (afterTomorrow.novoRiscoCount < beforeTomorrowRiskCount) {
    consequences.push({
      id: `dependency-tomorrow-${dependencyId}`,
      type: "risk_reduced",
      tone: "success",
      title: "Amanhã menos pressionado",
      detail: "A leitura do próximo dia ficou menos carregada depois da liberação.",
      date: afterTomorrow.data,
    });
  }

  if (afterTomorrow.novoRiscoCount > beforeTomorrowRiskCount) {
    consequences.push({
      id: `dependency-tomorrow-up-${dependencyId}`,
      type: "risk_increased",
      tone: "warning",
      title: "Risco entrou no horizonte",
      detail: "A dependência passou a pressionar amanhã e o próximo dia útil.",
      date: afterTomorrow.data,
    });
  }

  if (nextFocus?.trabalho?.id === work?.id) {
    consequences.push({
      id: `dependency-focus-${dependencyId}`,
      type: primaryConsequence.type === "risk_reduced" ? "focus_changed" : "pressure_detected",
      tone: primaryConsequence.type === "risk_reduced" ? "opportunity" : "warning",
      title:
        primaryConsequence.type === "risk_reduced"
          ? "Foco voltou a ser elegível"
          : "Foco ficou pressionado",
      detail:
        primaryConsequence.type === "risk_reduced"
          ? `${work?.titulo} pode voltar para a frente ainda em ${formatDateShort(referenceDate)}.`
          : `${work?.titulo} segue na fila, mas agora depende de liberação externa.`,
      slotId: nextFocus.slot.id,
      workId: work?.id,
      date: referenceDate,
    });
  }

  const impactSummary = buildDependencySummary(consequences);

  return {
    nextData,
    uiPatch: {
      nextSlotId: nextFocus?.slot.id ?? workSlot?.slot.id,
      nextWorkId: nextFocus?.trabalho?.id ?? work?.id,
      openDetailPanel: true,
      slotFeedback: workSlot
        ? {
            slotId: workSlot.slot.id,
            label: primaryConsequence.type === "risk_reduced" ? "Elegível novamente" : "Bloqueado",
            tone: primaryConsequence.type === "risk_reduced" ? "success" : "critical",
          }
        : null,
    },
    consequences,
    impactSummary,
    systemFeedback: {
      title: primaryConsequence.title,
      detail: impactSummary.recommendedAction
        ? `${primaryConsequence.detail} ${impactSummary.recommendedAction}`
        : primaryConsequence.detail,
      tone: primaryConsequence.tone,
      contextTag: impactSummary.contextTag,
    },
  } satisfies DependencyFlowResolution;
}

function buildNewDependency(params: {
  data: PlannerData;
  allocationId: string;
  referenceDate: string;
}) {
  const { data, allocationId, referenceDate } = params;
  const allocation = data.alocacoes.find((item) => item.id === allocationId);
  const block = data.blocos.find((item) => item.id === allocation?.blocoId);
  const work = data.trabalhos.find((item) => item.id === block?.trabalhoId);

  if (!allocation || !block || !work) {
    return null;
  }

  const existing = data.dependencias.find(
    (item) =>
      item.trabalhoId === work.id &&
      (!item.blocoId || item.blocoId === block.id) &&
      item.status !== "liberada",
  );

  const dependency: Dependencia = existing ?? {
    id: `dep-${allocation.id}`,
    trabalhoId: work.id,
    blocoId: block.id,
    tipo: "retorno_cliente",
    descricao: `Aguardando retorno externo para seguir com ${work.titulo}.`,
    status: "bloqueando",
    responsavelExterno: work.solicitante || "Outro setor",
    dataPrevistaLiberacao: addDays(referenceDate, 1),
  };

  return {
    allocation,
    block,
    work,
    dependency,
    isExisting: Boolean(existing),
  };
}

export function openPlannerDependency(params: {
  data: PlannerData;
  referenceDate: string;
  allocationId: string;
}): DependencyFlowResolution | null {
  const { data, referenceDate, allocationId } = params;
  const payload = buildNewDependency({ data, allocationId, referenceDate });
  if (!payload) {
    return null;
  }

  const beforeTomorrow = getTomorrowPreview(data, referenceDate);
  const impactedFutureBlocks = countFutureImpactedBlocks(data, {
    trabalhoId: payload.work.id,
    blocoId: payload.block.id,
  });
  const nextData = applyPlannerDerivedState(
    {
      ...data,
      dependencias: payload.isExisting
        ? data.dependencias.map((item) =>
            item.id === payload.dependency.id ? { ...item, status: "bloqueando" } : item,
          )
        : [payload.dependency, ...data.dependencias],
      alocacoes: data.alocacoes.map((item) =>
        item.id === allocationId ? { ...item, statusAlocacao: "bloqueado" } : item,
      ),
      blocos: data.blocos.map((item) =>
        item.id === payload.block.id ? { ...item, status: "bloqueado" } : item,
      ),
    },
    referenceDate,
  );

  return buildDependencyResolutionResult({
    nextData,
    referenceDate,
    workId: payload.work.id,
    dependencyId: payload.dependency.id,
    impactedFutureBlocks,
    beforeTomorrowRiskCount: beforeTomorrow.novoRiscoCount,
    primaryConsequence: {
      id: `dependency-open-${payload.dependency.id}`,
      type: "dependency_opened",
      tone: "critical",
      title: "Bloqueio aberto",
      detail: impactedFutureBlocks > 0
        ? `Bloqueio aberto: impacta ${impactedFutureBlocks} bloco${impactedFutureBlocks === 1 ? "" : "s"} futuro${impactedFutureBlocks === 1 ? "" : "s"}.`
        : "Bloqueio aberto sem efeito dominó relevante no horizonte curto.",
      workId: payload.work.id,
      slotId: payload.allocation.slotId,
      date: referenceDate,
    },
  });
}

export function applyDependencyPolicy(params: {
  data: PlannerData;
  referenceDate: string;
  dependencyId: string;
  action: DependencyPolicyAction;
}): DependencyFlowResolution | null {
  const { data, referenceDate, dependencyId, action } = params;
  const dependency = data.dependencias.find((item) => item.id === dependencyId);
  if (!dependency) {
    return null;
  }

  const beforeTomorrow = getTomorrowPreview(data, referenceDate);
  const impactedFutureBlocks = countFutureImpactedBlocks(data, { dependencyId });
  const policyData =
    action === "liberar_slots_futuros"
      ? moveFutureAllocationsAfterRelease(data, dependency)
      : data;
  const nextData = applyPlannerDerivedState(
    {
      ...policyData,
      dependencias: policyData.dependencias.map((item) =>
        item.id === dependencyId ? { ...item, politicaAplicada: action } : item,
      ),
    },
    referenceDate,
  );

  return buildDependencyResolutionResult({
    nextData,
    referenceDate,
    workId: dependency.trabalhoId,
    dependencyId,
    impactedFutureBlocks,
    beforeTomorrowRiskCount: beforeTomorrow.novoRiscoCount,
    primaryConsequence: {
      id: `dependency-policy-${dependencyId}-${action}`,
      type: action === "liberar_slots_futuros" ? "capacity_opened" : "pressure_detected",
      tone: action === "liberar_slots_futuros" ? "opportunity" : "warning",
      title: action === "liberar_slots_futuros" ? "Libera slots futuros" : "Mantém reserva",
      detail:
        action === "liberar_slots_futuros"
          ? "Slots futuros foram liberados e as próximas retomadas saíram da frente."
          : "Blocos futuros seguem protegidos para retomada assim que a dependência cair.",
      workId: dependency.trabalhoId,
      date: referenceDate,
    },
  });
}

export function resolvePlannerDependency(params: {
  data: PlannerData;
  referenceDate: string;
  dependencyId: string;
}): DependencyFlowResolution | null {
  const { data, referenceDate, dependencyId } = params;
  const dependency = data.dependencias.find((item) => item.id === dependencyId);
  if (!dependency) {
    return null;
  }

  const impactedFutureBlocks = countFutureImpactedBlocks(data, { dependencyId });
  const beforeTomorrow = getTomorrowPreview(data, referenceDate);

  const nextData = applyPlannerDerivedState(
    {
      ...data,
      dependencias: data.dependencias.map((item) =>
        item.id === dependencyId ? { ...item, status: "liberada" } : item,
      ),
    },
    referenceDate,
  );

  return buildDependencyResolutionResult({
    nextData,
    referenceDate,
    workId: dependency.trabalhoId,
    dependencyId,
    impactedFutureBlocks,
    beforeTomorrowRiskCount: beforeTomorrow.novoRiscoCount,
    primaryConsequence: {
      id: `dependency-resolved-${dependencyId}`,
      type: "risk_reduced",
      tone: "success",
      title: "Dependência resolvida",
      detail: data.trabalhos.find((item) => item.id === dependency.trabalhoId)
        ? `${data.trabalhos.find((item) => item.id === dependency.trabalhoId)?.titulo} volta a ficar elegível no fluxo operacional.`
        : "A dependência foi liberada e o trabalho volta para a fila útil.",
      workId: dependency.trabalhoId,
      date: referenceDate,
    },
  });
}
