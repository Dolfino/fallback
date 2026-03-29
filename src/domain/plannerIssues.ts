import { applyPlannerDerivedState } from "./plannerDerivedState";
import type {
  DependencyFlowResolution,
  PlannerIssueInput,
  PlannerIssueUpdateInput,
} from "../types/domain";
import type { IssueTrabalho, PlannerData } from "../types/planner";

function createEntityId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createPlannerIssue(params: {
  data: PlannerData;
  referenceDate: string;
  input: PlannerIssueInput;
}): DependencyFlowResolution | null {
  const { data, input, referenceDate } = params;
  const trabalho = data.trabalhos.find((item) => item.id === input.trabalhoId);

  if (!trabalho) {
    return null;
  }

  const etapaExiste = !input.etapaId || trabalho.etapas?.some((etapa) => etapa.id === input.etapaId);
  if (!etapaExiste) {
    return null;
  }

  const issue: IssueTrabalho = {
    id: createEntityId("issue"),
    trabalhoId: input.trabalhoId,
    etapaId: input.etapaId,
    blocoId: input.blocoId,
    alocacaoId: input.alocacaoId,
    tipo: input.tipo,
    status: "aberta",
    titulo: input.titulo.trim(),
    descricao: input.descricao.trim(),
    createdAt: new Date().toISOString(),
  };

  const nextData = applyPlannerDerivedState(
    {
      ...data,
      issues: [issue, ...data.issues],
    },
    referenceDate,
  );

  return {
    nextData,
    uiPatch: {
      nextWorkId: trabalho.id,
      openDetailPanel: true,
    },
    consequences: [
      {
        id: `issue-created-${issue.id}`,
        type: "issue_created",
        tone: issue.tipo === "problema" ? "warning" : "neutral",
        title: issue.tipo === "problema" ? "Problema registrado" : "Tarefa registrada",
        detail: `${issue.titulo} foi vinculada ao trabalho ${trabalho.titulo}.`,
        workId: trabalho.id,
      },
    ],
    impactSummary: {
      headline:
        issue.tipo === "problema"
          ? "Novo problema registrado no trabalho"
          : "Nova tarefa registrada no trabalho",
      details: [
        issue.etapaId
          ? `${issue.titulo} entrou vinculada a uma etapa interna.`
          : `${issue.titulo} entrou sem milestone específico.`,
      ],
      recommendedAction:
        issue.tipo === "problema"
          ? "Próxima ação: avaliar se o problema exige bloqueio, remarcação ou tratamento dentro do bloco atual."
          : "Próxima ação: usar a issue para registrar o desdobramento encontrado durante a execução do bloco.",
    },
    systemFeedback: {
      title: issue.tipo === "problema" ? "Problema registrado" : "Tarefa registrada",
      detail: `${issue.titulo} foi anexada ao contexto do trabalho atual.`,
      tone: issue.tipo === "problema" ? "warning" : "neutral",
    },
  };
}

export function updatePlannerIssue(params: {
  data: PlannerData;
  referenceDate: string;
  issueId: string;
  input: PlannerIssueUpdateInput;
}): DependencyFlowResolution | null {
  const { data, input, issueId, referenceDate } = params;
  const issue = data.issues.find((item) => item.id === issueId);

  if (!issue) {
    return null;
  }

  const trabalho = data.trabalhos.find((item) => item.id === issue.trabalhoId);
  if (!trabalho) {
    return null;
  }

  const etapaExiste = !input.etapaId || trabalho.etapas?.some((etapa) => etapa.id === input.etapaId);
  if (!etapaExiste) {
    return null;
  }

  const nextData = applyPlannerDerivedState(
    {
      ...data,
      issues: data.issues.map((item) =>
        item.id === issueId
          ? {
              ...item,
              etapaId: input.etapaId,
              tipo: input.tipo,
              titulo: input.titulo.trim(),
              descricao: input.descricao.trim(),
            }
          : item,
      ),
    },
    referenceDate,
  );

  return {
    nextData,
    uiPatch: {
      nextWorkId: trabalho.id,
      openDetailPanel: true,
    },
    consequences: [
      {
        id: `issue-updated-${issueId}`,
        type: "issue_created",
        tone: "neutral",
        title: "Issue atualizada",
        detail: `${input.titulo.trim()} foi atualizada no trabalho ${trabalho.titulo}.`,
        workId: trabalho.id,
      },
    ],
    impactSummary: {
      headline: "Issue atualizada",
      details: [
        input.etapaId
          ? `${input.titulo.trim()} segue vinculada a uma etapa interna.`
          : `${input.titulo.trim()} ficou sem milestone específico.`,
      ],
    },
    systemFeedback: {
      title: "Issue atualizada",
      detail: `${input.titulo.trim()} foi atualizada no trabalho atual.`,
      tone: "neutral",
    },
  };
}
