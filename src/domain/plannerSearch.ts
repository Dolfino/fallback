import { getTimelineForDate } from "../data/selectors";
import type { PlannerData } from "../types/planner";
import { formatDateShort } from "../utils/format";

export interface PlannerGlobalSearchResult {
  id: string;
  kind: "work" | "dependency" | "request" | "schedule";
  title: string;
  subtitle: string;
  detail: string;
  workId?: string;
  dependencyId?: string;
  requestId?: string;
  date?: string;
  slotId?: string;
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
  const requestResults = data.solicitacoes
    .map((request) => {
      const score = createSearchScore(
        [
          request.tituloInicial,
          request.descricaoInicial,
          request.solicitante,
          request.area,
          request.statusTriagem,
          request.decisao ?? undefined,
          request.prazoSugerido,
          formatDateShort(request.prazoSugerido),
        ],
        tokens,
      );

      if (!score) {
        return null;
      }

      return {
        score,
        result: {
          id: `request-${request.id}`,
          kind: "request" as const,
          title: request.tituloInicial,
          subtitle: `Solicitação · ${request.solicitante}`,
          detail: `${request.area} · prazo ${formatDateShort(request.prazoSugerido)}`,
          requestId: request.id,
          date: request.prazoSugerido,
        },
      };
    })
    .filter(Boolean);

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

  const scheduleResults = data.diasSemana
    .flatMap((date) =>
      getTimelineForDate(data, date).map((entry) => ({
        date,
        entry,
      })),
    )
    .map(({ date, entry }) => {
      const score = createSearchScore(
        [
          entry.slot.nome,
          entry.slot.horaInicio,
          entry.slot.horaFim,
          `${entry.slot.horaInicio} ${entry.slot.horaFim}`,
          date,
          formatDateShort(date),
          entry.trabalho?.titulo,
          entry.trabalho?.clienteProjeto,
          entry.trabalho?.categoria,
          entry.trabalho?.area,
          entry.statusVisual,
        ],
        tokens,
      );

      if (!score) {
        return null;
      }

      const title = `${entry.slot.nome} · ${formatDateShort(date)} · ${entry.slot.horaInicio}`;
      const subtitle = entry.trabalho
        ? `Agenda · ${entry.trabalho.titulo}`
        : "Agenda livre";
      const detail = entry.trabalho
        ? `${entry.trabalho.clienteProjeto} · ${entry.slot.horaInicio} - ${entry.slot.horaFim}`
        : `${entry.slot.tipo} · ${entry.slot.horaInicio} - ${entry.slot.horaFim}`;

      return {
        score,
        result: {
          id: `schedule-${date}-${entry.slot.id}`,
          kind: "schedule" as const,
          title,
          subtitle,
          detail,
          date,
          slotId: entry.slot.id,
          workId: entry.trabalho?.id,
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

  return [...workResults, ...dependencyResults, ...requestResults, ...scheduleResults]
    .sort((left, right) => {
      if (right!.score !== left!.score) {
        return right!.score - left!.score;
      }

      return left!.result.title.localeCompare(right!.result.title, "pt-BR");
    })
    .slice(0, limit)
    .map((entry) => entry!.result);
}
