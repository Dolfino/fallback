import { applyPlannerDerivedState } from "./plannerDerivedState";
import type {
  DependencyFlowResolution,
  PlannerRequestInput,
  PlannerWorkInput,
  PlannerWorkUpdateInput,
} from "../types/domain";
import type { Bloco, PlannerData, Solicitacao, Trabalho } from "../types/planner";

function createEntityId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getEstimatedBlockCount(durationMin: number, blockMin: number) {
  return Math.max(1, Math.ceil(durationMin / blockMin));
}

function createWorkBlock(params: {
  workId: string;
  sequence: number;
  totalBlocks: number;
  blockMin: number;
  allowsPullForward: boolean;
}) {
  return {
    id: createEntityId(`bloco-${params.workId}-${params.sequence}`),
    trabalhoId: params.workId,
    sequencia: params.sequence,
    totalBlocos: params.totalBlocks,
    duracaoPlanejadaMin: params.blockMin,
    duracaoRealizadaMin: 0,
    status: "planejado" as const,
    elegivelAntecipacao: params.allowsPullForward,
    foiAntecipado: false,
    foiRemarcado: false,
  };
}

function sumStageMinutes(input: PlannerWorkUpdateInput | PlannerWorkInput) {
  return input.etapas.reduce(
    (total, etapa) => total + Math.max(0, Number(etapa.duracaoEstimadaMin) || 0),
    0,
  );
}

function normalizeStages(input: PlannerWorkUpdateInput | PlannerWorkInput) {
  return input.etapas
    .map((etapa) => ({
      ...etapa,
      titulo: etapa.titulo.trim(),
      descricao: etapa.descricao.trim(),
      duracaoEstimadaMin: Math.max(0, Number(etapa.duracaoEstimadaMin) || 0),
    }))
    .filter((etapa) => etapa.titulo || etapa.descricao || etapa.duracaoEstimadaMin > 0);
}

function hasAttachedIssueOrDependency(data: PlannerData, blockId: string) {
  const hasIssue = data.issues.some((item) => item.blocoId === blockId);
  const hasDependency = data.dependencias.some((item) => item.blocoId === blockId);

  return hasIssue || hasDependency;
}

function isProtectedAllocationStatus(status: PlannerData["alocacoes"][number]["statusAlocacao"]) {
  return ["em_execucao", "parcial", "concluido", "bloqueado"].includes(status);
}

function isCommittedBlock(data: PlannerData, block: Bloco) {
  const allocations = data.alocacoes.filter((item) => item.blocoId === block.id);
  const hasProtectedAllocation = allocations.some((item) =>
    isProtectedAllocationStatus(item.statusAlocacao),
  );

  return (
    block.status !== "planejado" ||
    block.duracaoRealizadaMin > 0 ||
    hasProtectedAllocation ||
    hasAttachedIssueOrDependency(data, block.id)
  );
}

export interface PlannerWorkUpdateValidationError {
  code: "not_found" | "validation_failed";
  message: string;
  field?: string;
  detail?: string;
  targetId?: string;
}

export function validatePlannerWorkUpdate(params: {
  data: PlannerData;
  workId: string;
  input: PlannerWorkUpdateInput;
}): PlannerWorkUpdateValidationError | null {
  const { data, input, workId } = params;
  const trabalho = data.trabalhos.find((item) => item.id === workId);

  if (!trabalho) {
    return {
      code: "not_found",
      message: "Trabalho não encontrado para atualização.",
      targetId: workId,
    };
  }

  if (!input.titulo.trim()) {
    return {
      code: "validation_failed",
      message: "input.titulo é obrigatório.",
      field: "input.titulo",
    };
  }

  if (!input.prazoData) {
    return {
      code: "validation_failed",
      message: "input.prazoData é obrigatório.",
      field: "input.prazoData",
    };
  }

  if (input.duracaoEstimadaMin < trabalho.blocoMinimoMin) {
    return {
      code: "validation_failed",
      message: `A duração estimada precisa ser de pelo menos ${trabalho.blocoMinimoMin} min.`,
      field: "input.duracaoEstimadaMin",
    };
  }

  const normalizedStages = normalizeStages(input);
  const stageMinutes = normalizedStages.reduce(
    (total, etapa) => total + etapa.duracaoEstimadaMin,
    0,
  );

  if (stageMinutes > input.duracaoEstimadaMin) {
    return {
      code: "validation_failed",
      message: "A soma das etapas não pode ultrapassar o tempo estimado do trabalho.",
      field: "input.etapas",
      detail: `Etapas somam ${stageMinutes} min para um estimado de ${input.duracaoEstimadaMin} min.`,
    };
  }

  if (
    normalizedStages.some(
      (etapa) => (etapa.descricao || etapa.duracaoEstimadaMin > 0) && !etapa.titulo,
    )
  ) {
    return {
      code: "validation_failed",
      message: "Cada etapa preenchida precisa ter um título.",
      field: "input.etapas",
    };
  }

  const currentBlocks = data.blocos.filter((item) => item.trabalhoId === workId);
  const committedBlockCount = currentBlocks.filter((item) => isCommittedBlock(data, item)).length;
  const targetBlockCount = getEstimatedBlockCount(
    input.duracaoEstimadaMin,
    trabalho.blocoMinimoMin,
  );

  if (targetBlockCount < committedBlockCount) {
    return {
      code: "validation_failed",
      message: "O estimado não pode ficar menor que os blocos já comprometidos deste trabalho.",
      field: "input.duracaoEstimadaMin",
      detail: `O trabalho já exige pelo menos ${committedBlockCount} bloco(s) de ${trabalho.blocoMinimoMin} min.`,
    };
  }

  return null;
}

export function createPlannerWork(params: {
  data: PlannerData;
  referenceDate: string;
  input: PlannerWorkInput;
}): DependencyFlowResolution {
  const { data, referenceDate, input } = params;
  const estimatedBlocks = getEstimatedBlockCount(input.duracaoEstimadaMin, input.blocoMinimoMin);
  const workId = createEntityId("trabalho");
  const normalizedStages = normalizeStages(input);

  const newWork: Trabalho = {
    id: workId,
    titulo: input.titulo,
    descricao: input.descricao,
    etapas: normalizedStages,
    categoria: "Novo trabalho",
    solicitante: input.solicitante,
    area: input.area,
    clienteProjeto: input.clienteProjeto,
    duracaoEstimadaMin: input.duracaoEstimadaMin,
    duracaoRealizadaMin: 0,
    prazoData: input.prazoData,
    dataInicioMinima: input.dataInicioMinima,
    prioridade: input.prioridade,
    status: "na_fila",
    fragmentavel: input.fragmentavel,
    blocoMinimoMin: input.blocoMinimoMin,
    permiteAntecipacao: input.permiteAntecipacao,
    exigeSequencia: input.exigeSequencia,
    percentualConclusao: 0,
    emRisco: false,
    observacoes: input.observacoes,
  };

  const newBlocks: Bloco[] = Array.from({ length: estimatedBlocks }, (_, index) =>
    createWorkBlock({
      workId,
      sequence: index + 1,
      totalBlocks: estimatedBlocks,
      blockMin: input.blocoMinimoMin,
      allowsPullForward: input.permiteAntecipacao,
    }),
  );

  const nextData = applyPlannerDerivedState(
    {
      ...data,
      trabalhos: [newWork, ...data.trabalhos],
      blocos: [...newBlocks, ...data.blocos],
    },
    referenceDate,
  );

  return {
    nextData,
    uiPatch: {
      nextWorkId: workId,
      openDetailPanel: true,
    },
    consequences: [
      {
        id: `work-created-${workId}`,
        type: "work_created",
        tone: "neutral",
        title: "Novo trabalho criado",
        detail: `${estimatedBlocks} blocos planejáveis foram adicionados à fila.`,
        workId,
      },
    ],
    impactSummary: {
      headline: "Novo trabalho entrou na carteira",
      details: [
        `${input.titulo} foi criado com ${estimatedBlocks} bloco${estimatedBlocks === 1 ? "" : "s"} planejável${estimatedBlocks === 1 ? "" : "eis"}.`,
      ],
      recommendedAction: "Próxima ação: revisar o detalhe do trabalho e decidir quando puxar o primeiro bloco.",
    },
    systemFeedback: {
      title: "Novo trabalho criado",
      detail: `${estimatedBlocks} blocos planejáveis foram adicionados à fila.`,
      tone: "neutral",
    },
  };
}

export function createPlannerRequest(params: {
  data: PlannerData;
  input: PlannerRequestInput;
}): DependencyFlowResolution {
  const { data, input } = params;
  const request: Solicitacao = {
    id: createEntityId("sol"),
    ...input,
    statusTriagem: "nova",
    decisao: null,
  };

  const nextData: PlannerData = {
    ...data,
    solicitacoes: [request, ...data.solicitacoes],
  };

  return {
    nextData,
    consequences: [
      {
        id: `request-created-${request.id}`,
        type: "request_created",
        tone: "neutral",
        title: "Solicitação registrada",
        detail: "A demanda entrou na triagem e ainda não consome agenda fixa.",
      },
    ],
    impactSummary: {
      headline: "Nova solicitação entrou na triagem",
      details: [
        `${input.tituloInicial} foi registrada para análise de capacidade e priorização.`,
      ],
    },
    systemFeedback: {
      title: "Solicitação registrada",
      detail: "A demanda entrou na triagem e ainda não consome agenda fixa.",
      tone: "neutral",
    },
  };
}

export function updatePlannerWork(params: {
  data: PlannerData;
  referenceDate: string;
  workId: string;
  input: PlannerWorkUpdateInput;
}): DependencyFlowResolution | null {
  const { data, input, referenceDate, workId } = params;
  const trabalho = data.trabalhos.find((item) => item.id === workId);

  if (!trabalho || validatePlannerWorkUpdate({ data, workId, input })) {
    return null;
  }

  const normalizedStages = normalizeStages(input);
  const currentBlocks = data.blocos
    .filter((item) => item.trabalhoId === workId)
    .sort((left, right) => left.sequencia - right.sequencia);
  const targetBlockCount = getEstimatedBlockCount(
    input.duracaoEstimadaMin,
    trabalho.blocoMinimoMin,
  );
  const committedBlockIds = new Set(
    currentBlocks
      .filter((item) => isCommittedBlock(data, item))
      .map((item) => item.id),
  );
  const committedCount = committedBlockIds.size;
  const optionalToKeep = Math.max(0, targetBlockCount - committedCount);
  let optionalKept = 0;

  const keptBlocks = currentBlocks.filter((item) => {
    if (committedBlockIds.has(item.id)) {
      return true;
    }

    if (optionalKept < optionalToKeep) {
      optionalKept += 1;
      return true;
    }

    return false;
  });

  const removedBlockIds = new Set(
    currentBlocks
      .filter((item) => !keptBlocks.some((kept) => kept.id === item.id))
      .map((item) => item.id),
  );

  const addedBlocks = Array.from(
    { length: Math.max(0, targetBlockCount - keptBlocks.length) },
    (_, index) =>
      createWorkBlock({
        workId,
        sequence: keptBlocks.length + index + 1,
        totalBlocks: targetBlockCount,
        blockMin: trabalho.blocoMinimoMin,
        allowsPullForward: trabalho.permiteAntecipacao,
      }),
  );

  const nextWorkBlocks = [...keptBlocks, ...addedBlocks].map((item, index, collection) => ({
    ...item,
    sequencia: index + 1,
    totalBlocos: collection.length,
  }));

  const nextData = applyPlannerDerivedState(
    {
      ...data,
      trabalhos: data.trabalhos.map((item) =>
        item.id === workId
          ? {
              ...item,
              titulo: input.titulo.trim(),
              descricao: input.descricao.trim(),
              prazoData: input.prazoData,
              duracaoEstimadaMin: input.duracaoEstimadaMin,
              etapas: normalizedStages,
            }
          : item,
      ),
      blocos: [
        ...data.blocos.filter((item) => item.trabalhoId !== workId),
        ...nextWorkBlocks,
      ],
      alocacoes: data.alocacoes.filter((item) => !removedBlockIds.has(item.blocoId)),
    },
    referenceDate,
  );

  const stageMinutes = sumStageMinutes(input);
  const deltaBlocks = nextWorkBlocks.length - currentBlocks.length;
  const effortDetail =
    deltaBlocks > 0
      ? `${deltaBlocks} novo(s) bloco(s) foram adicionados ao trabalho.`
      : deltaBlocks < 0
        ? `${Math.abs(deltaBlocks)} bloco(s) livres foram removidos do trabalho.`
        : "A quantidade de blocos foi mantida.";

  return {
    nextData,
    uiPatch: {
      nextWorkId: workId,
      openDetailPanel: true,
    },
    consequences: [
      {
        id: `work-updated-${workId}`,
        type: "work_created",
        tone: "neutral",
        title: "Trabalho atualizado",
        detail: effortDetail,
        workId,
      },
    ],
    impactSummary: {
      headline: "Trabalho atualizado",
      details: [
        `${input.titulo.trim()} agora tem prazo ${input.prazoData} e estimado de ${input.duracaoEstimadaMin} min.`,
        `Etapas somam ${stageMinutes} min e deixam ${Math.max(0, input.duracaoEstimadaMin - stageMinutes)} min livres no estimado.`,
      ],
    },
    systemFeedback: {
      title: "Trabalho atualizado",
      detail: effortDetail,
      tone: "neutral",
    },
  };
}
