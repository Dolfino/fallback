import { applyPlannerDerivedState } from "./plannerDerivedState";
import type {
  DependencyFlowResolution,
  PlannerRequestInput,
  PlannerWorkInput,
} from "../types/domain";
import type { Bloco, PlannerData, Solicitacao, Trabalho } from "../types/planner";

function createEntityId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createPlannerWork(params: {
  data: PlannerData;
  referenceDate: string;
  input: PlannerWorkInput;
}): DependencyFlowResolution {
  const { data, referenceDate, input } = params;
  const estimatedBlocks = Math.max(1, Math.ceil(input.duracaoEstimadaMin / input.blocoMinimoMin));
  const workId = createEntityId("trabalho");

  const newWork: Trabalho = {
    id: workId,
    titulo: input.titulo,
    descricao: input.descricao,
    etapas: input.etapas,
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

  const newBlocks: Bloco[] = Array.from({ length: estimatedBlocks }, (_, index) => ({
    id: `bloco-${workId}-${index + 1}`,
    trabalhoId: workId,
    sequencia: index + 1,
    totalBlocos: estimatedBlocks,
    duracaoPlanejadaMin: input.blocoMinimoMin,
    duracaoRealizadaMin: 0,
    status: "planejado",
    elegivelAntecipacao: input.permiteAntecipacao,
    foiAntecipado: false,
    foiRemarcado: false,
  }));

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
