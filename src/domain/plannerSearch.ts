import type { PlannerData } from "../types/planner";

export interface PlannerGlobalSearchResult {
  id: string;
  kind: "work" | "dependency";
  title: string;
  subtitle: string;
  detail: string;
  workId?: string;
  dependencyId?: string;
}

function normalizeForSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function createSearchScore(values: Array<string | undefined>, tokens: string[]) {
  const haystack = normalizeForSearch(values.filter(Boolean).join(" | "));

  if (!tokens.length) {
    return 0;
  }

  if (!tokens.every((token) => haystack.includes(token))) {
    return 0;
  }

  return tokens.reduce((score, token) => {
    if (haystack.startsWith(token)) {
      return score + 45;
    }

    if (haystack.includes(` ${token}`)) {
      return score + 25;
    }

    return score + 12;
  }, haystack.includes(tokens.join(" ")) ? 30 : 0);
}

export function searchPlannerData(
  data: PlannerData,
  query: string,
  limit = 8,
): PlannerGlobalSearchResult[] {
  const normalizedQuery = normalizeForSearch(query.trim());

  if (!normalizedQuery) {
    return [];
  }

  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const dependencyResults = data.dependencias
    .map((dependency) => {
      const work = data.trabalhos.find((item) => item.id === dependency.trabalhoId);
      const score = createSearchScore(
        [
          dependency.descricao,
          dependency.tipo,
          dependency.responsavelExterno,
          dependency.politicaAplicada,
          work?.titulo,
          work?.clienteProjeto,
        ],
        tokens,
      );

      if (!score) {
        return null;
      }

      return {
        score,
        result: {
          id: `dependency-${dependency.id}`,
          kind: "dependency" as const,
          title: dependency.descricao,
          subtitle: `Bloqueio · ${work?.titulo ?? "Trabalho relacionado"}`,
          detail: `${dependency.tipo} · responsável ${dependency.responsavelExterno}`,
          workId: dependency.trabalhoId,
          dependencyId: dependency.id,
        },
      };
    })
    .filter(Boolean);

  const workResults = data.trabalhos
    .map((work) => {
      const score = createSearchScore(
        [
          work.titulo,
          work.descricao,
          work.clienteProjeto,
          work.categoria,
          work.area,
          work.solicitante,
          work.observacoes,
        ],
        tokens,
      );

      if (!score) {
        return null;
      }

      return {
        score,
        result: {
          id: `work-${work.id}`,
          kind: "work" as const,
          title: work.titulo,
          subtitle: `${work.clienteProjeto} · ${work.area}`,
          detail: `${work.categoria} · prazo ${work.prazoData}`,
          workId: work.id,
        },
      };
    })
    .filter(Boolean);

  return [...workResults, ...dependencyResults]
    .sort((left, right) => {
      if (right!.score !== left!.score) {
        return right!.score - left!.score;
      }

      return left!.result.title.localeCompare(right!.result.title, "pt-BR");
    })
    .slice(0, limit)
    .map((entry) => entry!.result);
}
