import type {
  Alocacao,
  Bloco,
  Dependencia,
  PlannerData,
  Prioridade,
  Slot,
  SlotStatus,
  Trabalho,
} from "../types/planner";
import type {
  ImmediateImpactSummary,
  PlannerCommandName,
  PlannerConsequence,
} from "../types/domain";
import type { WeekFilters } from "../types/ui";
import { getDateDiffInDays, isAfterDate } from "../utils/date";
import { formatDateShort, formatMinutes } from "../utils/format";

export interface TimelineSlotItem {
  slot: Slot;
  alocacao?: Alocacao;
  bloco?: Bloco;
  trabalho?: Trabalho;
  dependencia?: Dependencia;
  statusVisual: SlotStatus;
  riskLevel: "healthy" | "watch" | "urgent" | "blocked";
  riskReason?: string;
}

export interface SuggestionItem {
  alocacao: Alocacao;
  bloco: Bloco;
  trabalho: Trabalho;
  impacto: string;
  impactoCurto: string;
  resumo: string;
}

export interface OperationalSignal {
  id: string;
  tone: "critical" | "warning" | "opportunity" | "focus";
  title: string;
  detail: string;
  cta?: string;
  slotId?: string;
}

export interface TodayDecisionSummary {
  totalSlots: number;
  ocupados: number;
  livres: number;
  concluidos: number;
  pendentes: number;
  riscos: number;
  bloqueados: number;
  emExecucao: number;
  capacidadeLivreMin: number;
  capacidadeConsumidaMin: number;
  capacidadeLivreLabel: string;
  capacidadeConsumidaLabel: string;
  proximoFoco?: TimelineSlotItem;
  slotLivreUtil?: TimelineSlotItem;
  sugestaoPrincipal?: SuggestionItem;
  sinais: OperationalSignal[];
  alertas: string[];
  sugestoes: string[];
}

export interface TomorrowPreview {
  data: string;
  focoInicial?: TimelineSlotItem;
  pendenciasRemarcadas: TimelineSlotItem[];
  novoRiscoCount: number;
  slotLivreUtil?: TimelineSlotItem;
  sugestaoPrincipal?: SuggestionItem;
  ocupados: number;
  livres: number;
  cargaLabel: string;
  horizonLoad: ShortHorizonLoadDay[];
  pressurePoints: PressurePoint[];
}

export interface ShortHorizonLoadDay {
  date: string;
  ocupados: number;
  livres: number;
  riskCount: number;
  blockedCount: number;
  pressureLevel: "stable" | "watch" | "critical";
}

export interface PressurePoint {
  id: string;
  date: string;
  slotId: string;
  title: string;
  detail: string;
  tone: "warning" | "critical";
}

export interface DependencyPolicySummary {
  action: "manter_reserva" | "liberar_slots_futuros";
  label: string;
  effect: string;
  horizonNote: string;
}

function buildMaps(data: PlannerData) {
  return {
    blocos: new Map(data.blocos.map((item) => [item.id, item])),
    trabalhos: new Map(data.trabalhos.map((item) => [item.id, item])),
    dependencias: data.dependencias,
  };
}

function describeDependencyPolicy(params: {
  action: "manter_reserva" | "liberar_slots_futuros";
  impactedFutureBlocks: number;
  isWorkAtRisk: boolean;
}): DependencyPolicySummary {
  const { action, impactedFutureBlocks, isWorkAtRisk } = params;

  if (action === "manter_reserva") {
    return {
      action,
      label: "Manter reserva",
      effect:
        impactedFutureBlocks > 0
          ? "Blocos futuros seguem protegidos."
          : "Reserva mantida para retomada.",
      horizonNote: isWorkAtRisk
        ? "Preserva capacidade crítica no horizonte curto."
        : "Evita abrir lacunas antes da liberação.",
    };
  }

  return {
    action,
    label: "Liberar slots futuros",
    effect:
      impactedFutureBlocks > 0
        ? "Amanhã ficou mais livre."
        : "Slots futuros liberados sem conflito.",
    horizonNote: isWorkAtRisk
      ? "Pressão migra para o horizonte curto."
      : "Abre capacidade para outros trabalhos.",
  };
}

export function getShortHorizonDates(data: PlannerData, referenceDate: string, count = 3) {
  const startIndex = data.diasSemana.findIndex((date) => date === referenceDate);
  const safeIndex = startIndex >= 0 ? startIndex : 0;
  return data.diasSemana.slice(safeIndex, safeIndex + count);
}

export function getRemainingHorizonDates(data: PlannerData, referenceDate: string) {
  const startIndex = data.diasSemana.findIndex((date) => date === referenceDate);
  const safeIndex = startIndex >= 0 ? startIndex : 0;
  return data.diasSemana.slice(safeIndex);
}

export function isWorkOperationallyVisible(trabalho: Trabalho) {
  return trabalho.status !== "concluido" && trabalho.percentualConclusao < 100;
}

function priorityWeight(priority: Prioridade) {
  const weights: Record<Prioridade, number> = {
    baixa: 1,
    media: 2,
    alta: 3,
    critica: 4,
  };

  return weights[priority];
}

function statusWeight(status: SlotStatus) {
  const weights: Record<SlotStatus, number> = {
    livre: 0,
    planejado: 2,
    em_execucao: 5,
    concluido: 0,
    parcial: 4,
    bloqueado: 3,
    remarcado: 1,
    antecipado: 2,
  };

  return weights[status];
}

export function getTimelineForDate(data: PlannerData, date: string): TimelineSlotItem[] {
  const maps = buildMaps(data);
  const alocacoesDoDia = new Map(
    data.alocacoes
      .filter((alocacao) => alocacao.dataPlanejada === date)
      .map((alocacao) => [alocacao.slotId, alocacao]),
  );

  return data.slots.map((slot) => {
    const alocacao = alocacoesDoDia.get(slot.id);
    const bloco = alocacao ? maps.blocos.get(alocacao.blocoId) : undefined;
    const trabalho = bloco ? maps.trabalhos.get(bloco.trabalhoId) : undefined;
    const dependencia = bloco
      ? maps.dependencias.find(
          (item) =>
            item.trabalhoId === bloco.trabalhoId &&
            (!item.blocoId || item.blocoId === bloco.id) &&
            item.status !== "liberada",
        )
      : undefined;

    const daysToDeadline = trabalho ? getDateDiffInDays(date, trabalho.prazoData) : 99;
    const riskLevel: TimelineSlotItem["riskLevel"] = dependencia
      ? "blocked"
      : trabalho?.emRisco || (trabalho && daysToDeadline <= 0)
        ? "urgent"
        : trabalho && daysToDeadline <= 1 && itemRequiresAttention(alocacao?.statusAlocacao)
          ? "watch"
          : "healthy";
    const riskReason = dependencia
      ? `Aguardando ${dependencia.responsavelExterno}`
      : trabalho?.emRisco
        ? "Prazo em risco"
        : trabalho && daysToDeadline <= 0
          ? "Prazo no dia"
          : trabalho && daysToDeadline <= 1 && itemRequiresAttention(alocacao?.statusAlocacao)
            ? "Janela apertada"
            : undefined;

    return {
      slot,
      alocacao,
      bloco,
      trabalho,
      dependencia,
      statusVisual: alocacao?.statusAlocacao ?? "livre",
      riskLevel,
      riskReason,
    };
  });
}

function itemRequiresAttention(status?: SlotStatus) {
  if (!status) {
    return false;
  }

  return ["planejado", "em_execucao", "parcial", "remarcado", "antecipado"].includes(status);
}

export function getSummaryForDate(data: PlannerData, date: string) {
  const timeline = getTimelineForDate(data, date);
  const ocupados = timeline.filter((item) => item.alocacao);
  const livres = timeline.length - ocupados.length;
  const concluidos = ocupados.filter((item) => item.statusVisual === "concluido").length;
  const pendentes = ocupados.filter((item) =>
    ["planejado", "em_execucao", "parcial", "remarcado", "antecipado"].includes(item.statusVisual),
  ).length;
  const riscos = ocupados.filter((item) => item.trabalho?.emRisco).length;
  const proximoFoco = ocupados.find((item) =>
    ["em_execucao", "planejado", "parcial", "remarcado", "antecipado"].includes(item.statusVisual),
  );

  const alertas = [
    ...timeline
      .filter((item) => item.statusVisual === "bloqueado" && item.trabalho)
      .map((item) => `${item.trabalho?.titulo} está bloqueado por dependência externa.`),
    ...timeline
      .filter((item) => item.trabalho?.emRisco)
      .slice(0, 2)
      .map((item) => `${item.trabalho?.titulo} segue em risco de prazo.`),
  ].slice(0, 4);

  const sugestoes = [
    "Puxar um bloco elegível para o próximo slot livre.",
    "Fechar a proposta da Acme antes do almoço reduz risco imediato.",
    "Reservar a Agenda 12 para absorver remarcações do período da tarde.",
  ];

  return {
    totalSlots: timeline.length,
    ocupados: ocupados.length,
    livres,
    concluidos,
    pendentes,
    riscos,
    proximoFoco,
    alertas,
    sugestoes,
  };
}

export function getNextFocus(data: PlannerData, date: string) {
  const timeline = getTimelineForDate(data, date);

  return [...timeline]
    .filter(
      (item) =>
        item.alocacao &&
        item.trabalho &&
        ["em_execucao", "parcial", "planejado", "antecipado", "remarcado"].includes(item.statusVisual),
    )
    .sort((first, second) => {
      const firstScore =
        statusWeight(first.statusVisual) * 10 +
        priorityWeight(first.trabalho!.prioridade) * 8 +
        (first.trabalho!.emRisco ? 5 : 0) -
        getDateDiffInDays(date, first.trabalho!.prazoData);
      const secondScore =
        statusWeight(second.statusVisual) * 10 +
        priorityWeight(second.trabalho!.prioridade) * 8 +
        (second.trabalho!.emRisco ? 5 : 0) -
        getDateDiffInDays(date, second.trabalho!.prazoData);

      return secondScore - firstScore;
    })[0];
}

export function getSuggestionsForSlot(
  data: PlannerData,
  currentDate: string,
  slotId: string,
): SuggestionItem[] {
  const timeline = getTimelineForDate(data, currentDate);
  const currentItem = timeline.find((item) => item.slot.id === slotId);

  if (!currentItem || currentItem.alocacao) {
    return [];
  }

  const maps = buildMaps(data);

  return data.alocacoes
    .filter((alocacao) => isAfterDate(alocacao.dataPlanejada, currentDate))
    .map((alocacao) => {
      const bloco = maps.blocos.get(alocacao.blocoId);
      const trabalho = bloco ? maps.trabalhos.get(bloco.trabalhoId) : undefined;
      const dependencia = bloco
        ? data.dependencias.find(
            (item) =>
              item.status === "bloqueando" &&
              item.trabalhoId === bloco.trabalhoId &&
              (!item.blocoId || item.blocoId === bloco.id),
          )
        : undefined;

      if (!bloco || !trabalho || dependencia) {
        return null;
      }

      if (!bloco.elegivelAntecipacao || !trabalho.permiteAntecipacao) {
        return null;
      }

      return {
        alocacao,
        bloco,
        trabalho,
        impacto: `Adianta conclusão em ${Math.max(1, getDateDiffInDays(currentDate, alocacao.dataPlanejada))} dia`,
        impactoCurto: `Adianta ${Math.max(1, getDateDiffInDays(currentDate, alocacao.dataPlanejada))} dia`,
        resumo: `${formatDateShort(alocacao.dataPlanejada)} • bloco ${bloco.sequencia}/${bloco.totalBlocos}`,
      };
    })
    .filter((item): item is SuggestionItem => Boolean(item))
    .sort((first, second) => {
      const firstScore =
        priorityWeight(first.trabalho.prioridade) * 10 +
        (first.trabalho.emRisco ? 6 : 0) -
        getDateDiffInDays(currentDate, first.trabalho.prazoData);
      const secondScore =
        priorityWeight(second.trabalho.prioridade) * 10 +
        (second.trabalho.emRisco ? 6 : 0) -
        getDateDiffInDays(currentDate, second.trabalho.prazoData);

      return secondScore - firstScore;
    })
    .slice(0, 3);
}

export function getTodayDecisionSummary(data: PlannerData, date: string): TodayDecisionSummary {
  const timeline = getTimelineForDate(data, date);
  const ocupados = timeline.filter((item) => item.alocacao);
  const livres = timeline.filter((item) => !item.alocacao);
  const concluidos = ocupados.filter((item) => item.statusVisual === "concluido");
  const pendentes = ocupados.filter((item) =>
    ["planejado", "em_execucao", "parcial", "remarcado", "antecipado"].includes(item.statusVisual),
  );
  const bloqueados = ocupados.filter((item) => item.statusVisual === "bloqueado");
  const emExecucao = ocupados.filter((item) => item.statusVisual === "em_execucao");
  const riscos = ocupados.filter((item) => item.trabalho?.emRisco);
  const proximoFoco = getNextFocus(data, date);
  const slotLivreUtil = livres.find((item) => getSuggestionsForSlot(data, date, item.slot.id).length > 0);
  const sugestaoPrincipal = slotLivreUtil
    ? getSuggestionsForSlot(data, date, slotLivreUtil.slot.id)[0]
    : undefined;
  const capacidadeLivreMin = livres.length * 25;
  const capacidadeConsumidaMin = ocupados.length * 25;

  const sinais: OperationalSignal[] = [];

  if (proximoFoco?.trabalho && proximoFoco.bloco) {
    sinais.push({
      id: "next-focus",
      tone: "focus",
      title: `Agora: ${proximoFoco.trabalho.titulo}`,
      detail: `${proximoFoco.slot.horaInicio} • bloco ${proximoFoco.bloco.sequencia}/${proximoFoco.bloco.totalBlocos} • prazo ${formatDateShort(proximoFoco.trabalho.prazoData)}`,
      cta: proximoFoco.statusVisual === "em_execucao" ? "Retomar execução" : "Abrir foco",
      slotId: proximoFoco.slot.id,
    });
  }

  if (bloqueados[0]?.trabalho) {
    sinais.push({
      id: "blocked",
      tone: "critical",
      title: "Bloqueio ativo",
      detail: `${bloqueados[0].trabalho.titulo} aguarda retorno de dependência externa.`,
      cta: "Rever bloqueio",
      slotId: bloqueados[0].slot.id,
    });
  }

  if (slotLivreUtil && sugestaoPrincipal) {
    sinais.push({
      id: "free-slot",
      tone: "opportunity",
      title: `${slotLivreUtil.slot.nome} está livre`,
      detail: `${slotLivreUtil.slot.horaInicio} pode puxar ${sugestaoPrincipal.trabalho.titulo}. ${sugestaoPrincipal.impactoCurto}.`,
      cta: "Usar slot",
      slotId: slotLivreUtil.slot.id,
    });
  }

  if (riscos[0]?.trabalho) {
    sinais.push({
      id: "risk",
      tone: "warning",
      title: "Prazo em risco",
      detail: `${riscos[0].trabalho.titulo} ainda exige atenção antes do fim do dia.`,
      cta: "Priorizar",
      slotId: riscos[0].slot.id,
    });
  }

  const alertas = [
    ...bloqueados.slice(0, 1).map((item) => `${item.trabalho?.titulo} segue bloqueado.`),
    ...riscos.slice(0, 2).map((item) => `${item.trabalho?.titulo} pede atenção por prazo.`),
    ...(slotLivreUtil && sugestaoPrincipal
      ? [`${slotLivreUtil.slot.nome} tem oportunidade de antecipar ${sugestaoPrincipal.trabalho.titulo}.`]
      : []),
  ].slice(0, 4);

  const sugestoes = [
    sugestaoPrincipal
      ? `Puxar ${sugestaoPrincipal.trabalho.titulo} para ${slotLivreUtil?.slot.nome} adianta a fila.`
      : "Sem antecipações críticas agora.",
    proximoFoco?.trabalho?.prioridade === "critica"
      ? `Fechar ${proximoFoco.trabalho.titulo} primeiro reduz o maior risco do dia.`
      : "Concluir o próximo foco antes de absorver novas demandas mantém a cadência.",
    bloqueados.length
      ? "Revisar bloqueios no meio do dia evita carregar pendências para amanhã."
      : "Sem bloqueios ativos críticos neste momento.",
  ];

  return {
    totalSlots: timeline.length,
    ocupados: ocupados.length,
    livres: livres.length,
    concluidos: concluidos.length,
    pendentes: pendentes.length,
    riscos: riscos.length,
    bloqueados: bloqueados.length,
    emExecucao: emExecucao.length,
    capacidadeLivreMin,
    capacidadeConsumidaMin,
    capacidadeLivreLabel: formatMinutes(capacidadeLivreMin),
    capacidadeConsumidaLabel: formatMinutes(capacidadeConsumidaMin),
    proximoFoco,
    slotLivreUtil,
    sugestaoPrincipal,
    sinais,
    alertas,
    sugestoes,
  };
}

export function getWorkTimeline(data: PlannerData, trabalhoId: string) {
  const blocos = data.blocos.filter((bloco) => bloco.trabalhoId === trabalhoId);

  return blocos.map((bloco) => ({
    bloco,
    alocacao: data.alocacoes.find((item) => item.blocoId === bloco.id),
  }));
}

export function getCapacitySummary(data: PlannerData, dates = data.diasSemana) {
  const totalSlots = data.slots.length * dates.length;
  const ocupados = data.alocacoes.filter((item) => dates.includes(item.dataPlanejada)).length;
  const protegidos = dates.length * 3;
  const totalMin = totalSlots * 25;
  const ocupadosMin = ocupados * 25;
  const protegidosMin = protegidos * 25;
  const planejavelMin = totalMin - protegidosMin;
  const livreMin = Math.max(planejavelMin - ocupadosMin, 0);

  return {
    totalMin,
    protegidosMin,
    planejavelMin,
    ocupadosMin,
    livreMin,
    totalLabel: formatMinutes(totalMin),
    protegidosLabel: formatMinutes(protegidosMin),
    planejavelLabel: formatMinutes(planejavelMin),
    ocupadosLabel: formatMinutes(ocupadosMin),
    livreLabel: formatMinutes(livreMin),
  };
}

export function getWeekMatrix(data: PlannerData, filters: WeekFilters, dates = data.diasSemana) {
  const maps = buildMaps(data);

  return data.slots.map((slot) => ({
    slot,
    cells: dates.map((date) => {
      const alocacao = data.alocacoes.find(
        (item) => item.dataPlanejada === date && item.slotId === slot.id,
      );
      const bloco = alocacao ? maps.blocos.get(alocacao.blocoId) : undefined;
      const trabalho = bloco ? maps.trabalhos.get(bloco.trabalhoId) : undefined;

      if (!alocacao || !bloco || !trabalho) {
        return { date, slot, alocacao: undefined, bloco: undefined, trabalho: undefined, hidden: false };
      }

      const hiddenByPriority =
        filters.prioridade !== "todas" && trabalho.prioridade !== filters.prioridade;
      const hiddenByStatus =
        filters.status !== "todos" && alocacao.statusAlocacao !== filters.status;
      const hiddenByRisk = filters.apenasRisco && !trabalho.emRisco;

      return {
        date,
        slot,
        alocacao,
        bloco,
        trabalho,
        hidden: hiddenByPriority || hiddenByStatus || hiddenByRisk,
      };
    }),
  }));
}

export function getDailyClosingGroups(data: PlannerData, date: string) {
  const timeline = getTimelineForDate(data, date);

  const buildItem = (item: TimelineSlotItem) => ({
    ...item,
    saldoRestanteMin: item.bloco
      ? Math.max(item.bloco.duracaoPlanejadaMin - item.bloco.duracaoRealizadaMin, 0)
      : 0,
    motivo: item.dependencia
      ? `Aguardando ${item.dependencia.responsavelExterno}`
      : item.statusVisual === "parcial"
        ? "Execução parcial no slot"
        : item.statusVisual === "remarcado"
          ? "Já sofreu replanejamento ao longo do dia"
          : item.statusVisual === "antecipado"
            ? "Foi puxado de outra data"
            : item.statusVisual === "planejado"
              ? "Não executado dentro da janela prevista"
              : undefined,
    sugestaoRemarcacao: item.trabalho?.permiteAntecipacao
      ? "Primeiro slot livre de amanhã"
      : "Revisar manualmente na próxima rodada",
  });

  return {
    concluidos: timeline.filter((item) => item.statusVisual === "concluido").map(buildItem),
    parciais: timeline.filter((item) => item.statusVisual === "parcial").map(buildItem),
    naoExecutados: timeline
      .filter((item) => ["planejado", "remarcado", "antecipado"].includes(item.statusVisual))
      .map(buildItem),
    bloqueados: timeline.filter((item) => item.statusVisual === "bloqueado").map(buildItem),
  };
}

export function getDailyClosingSummary(data: PlannerData, date: string) {
  const groups = getDailyClosingGroups(data, date);
  const replanejaveis =
    groups.parciais.length + groups.naoExecutados.length + groups.bloqueados.length;

  return {
    concluidos: groups.concluidos.length,
    parciais: groups.parciais.length,
    naoExecutados: groups.naoExecutados.length,
    bloqueados: groups.bloqueados.length,
    replanejaveis,
    mensagem:
      replanejaveis > 0
        ? `${replanejaveis} bloco${replanejaveis === 1 ? "" : "s"} ainda pedem encaixe para amanhã.`
        : "Dia encerrado sem pendências abertas.",
  };
}

export function getTomorrowPreview(data: PlannerData, date: string): TomorrowPreview {
  const nextDate = data.diasSemana.find((item) => isAfterDate(item, date)) ?? date;
  const timeline = getTimelineForDate(data, nextDate);
  const focoInicial = getNextFocus(data, nextDate);
  const pendenciasRemarcadas = timeline.filter((item) => item.statusVisual === "remarcado");
  const slotLivreUtil = timeline.find((item) => !item.alocacao && getSuggestionsForSlot(data, nextDate, item.slot.id).length > 0);
  const sugestaoPrincipal = slotLivreUtil
    ? getSuggestionsForSlot(data, nextDate, slotLivreUtil.slot.id)[0]
    : undefined;
  const ocupados = timeline.filter((item) => item.alocacao).length;
  const livres = timeline.length - ocupados;
  const novoRiscoCount = timeline.filter((item) => item.riskLevel === "urgent" || item.riskLevel === "blocked").length;
  const horizonLoad = getShortHorizonLoad(data, nextDate);
  const pressurePoints = getUpcomingPressurePoints(data, nextDate);

  return {
    data: nextDate,
    focoInicial,
    pendenciasRemarcadas,
    novoRiscoCount,
    slotLivreUtil,
    sugestaoPrincipal,
    ocupados,
    livres,
    cargaLabel: `${ocupados}/${timeline.length} slots já comprometidos`,
    horizonLoad,
    pressurePoints,
  };
}

export function getShortHorizonLoad(data: PlannerData, referenceDate: string, count = 3): ShortHorizonLoadDay[] {
  return getShortHorizonDates(data, referenceDate, count).map((date) => {
    const timeline = getTimelineForDate(data, date);
    const ocupados = timeline.filter((item) => item.alocacao).length;
    const livres = timeline.length - ocupados;
    const blockedCount = timeline.filter((item) => item.riskLevel === "blocked").length;
    const riskCount = timeline.filter((item) =>
      item.riskLevel === "urgent" || item.riskLevel === "blocked",
    ).length;
    const pressureLevel: ShortHorizonLoadDay["pressureLevel"] =
      blockedCount > 0 || riskCount >= 3
        ? "critical"
        : riskCount >= 1 || livres <= 2
          ? "watch"
          : "stable";

    return {
      date,
      ocupados,
      livres,
      riskCount,
      blockedCount,
      pressureLevel,
    };
  });
}

export function getUpcomingPressurePoints(
  data: PlannerData,
  referenceDate: string,
  count = 4,
): PressurePoint[] {
  return getShortHorizonDates(data, referenceDate, 3)
    .flatMap((date) =>
      getTimelineForDate(data, date)
        .filter((item) => item.alocacao && item.trabalho && item.riskLevel !== "healthy")
        .map<PressurePoint>((item) => ({
          id: `${date}-${item.slot.id}`,
          date,
          slotId: item.slot.id,
          title: item.trabalho!.titulo,
          detail: item.riskReason ?? "Pressão operacional no horizonte curto.",
          tone: item.riskLevel === "blocked" ? "critical" : "warning",
        })),
    )
    .slice(0, count);
}

export function getNextUsefulOpenSlot(
  data: PlannerData,
  referenceDate: string,
): { date: string; slotId: string; slotLabel: string; suggestion?: SuggestionItem; rationale: string } | undefined {
  const dates = getRemainingHorizonDates(data, referenceDate);

  for (const date of dates) {
    const timeline = getTimelineForDate(data, date);
    for (const item of timeline) {
      if (item.alocacao) {
        continue;
      }

      const suggestions = getSuggestionsForSlot(data, date, item.slot.id);
      if (suggestions.length > 0) {
        return {
          date,
          slotId: item.slot.id,
          slotLabel: `${item.slot.nome} às ${item.slot.horaInicio}`,
          suggestion: suggestions[0],
          rationale: `Janela útil para antecipar ${suggestions[0].trabalho.titulo}.`,
        };
      }
    }
  }

  return undefined;
}

export function getPullForwardCandidates(data: PlannerData, referenceDate: string) {
  const nextUsefulSlot = getNextUsefulOpenSlot(data, referenceDate);

  if (!nextUsefulSlot?.suggestion) {
    return [];
  }

  return getSuggestionsForSlot(data, nextUsefulSlot.date, nextUsefulSlot.slotId);
}

export function deriveConsequencesFromTransition(params: {
  command: PlannerCommandName;
  beforeData: PlannerData;
  afterData: PlannerData;
  referenceDate: string;
  sourceSlotId?: string;
  targetSlotId?: string;
  reviewAllocationIds?: string[];
}): PlannerConsequence[] {
  const {
    command,
    beforeData,
    afterData,
    referenceDate,
    sourceSlotId,
    targetSlotId,
    reviewAllocationIds,
  } = params;
  const beforeToday = getTodayDecisionSummary(beforeData, referenceDate);
  const afterToday = getTodayDecisionSummary(afterData, referenceDate);
  const beforeTomorrow = getTomorrowPreview(beforeData, referenceDate);
  const afterTomorrow = getTomorrowPreview(afterData, referenceDate);
  const consequences: PlannerConsequence[] = [];
  const beforeCarryover = beforeData.alocacoes.filter(
    (item) =>
      item.dataPlanejada < referenceDate &&
      ["planejado", "parcial", "remarcado"].includes(item.statusAlocacao),
  ).length;
  const afterCarryover = afterData.alocacoes.filter(
    (item) =>
      item.dataPlanejada < referenceDate &&
      ["planejado", "parcial", "remarcado"].includes(item.statusAlocacao),
  ).length;

  if (afterToday.proximoFoco?.slot.id !== beforeToday.proximoFoco?.slot.id && afterToday.proximoFoco) {
    consequences.push({
      id: `focus-${afterToday.proximoFoco.slot.id}`,
      type: "focus_changed",
      tone: "neutral",
      title: "Próximo foco mudou",
      detail: `${afterToday.proximoFoco.trabalho?.titulo ?? "Novo foco"} assume a frente do dia.`,
      slotId: afterToday.proximoFoco.slot.id,
      date: referenceDate,
      workId: afterToday.proximoFoco.trabalho?.id,
    });
  }

  if (afterToday.livres > beforeToday.livres && sourceSlotId) {
    const timeline = getTimelineForDate(afterData, referenceDate);
    const slot = timeline.find((item) => item.slot.id === sourceSlotId)?.slot;
    consequences.push({
      id: `slot-freed-${sourceSlotId}`,
      type: "slot_freed",
      tone: "opportunity",
      title: "Slot liberado",
      detail: slot ? `${slot.nome} às ${slot.horaInicio} abriu oportunidade imediata.` : "Uma janela útil foi liberada.",
      slotId: sourceSlotId,
      date: referenceDate,
    });
  }

  if (afterToday.riscos > beforeToday.riscos || afterTomorrow.novoRiscoCount > beforeTomorrow.novoRiscoCount) {
    consequences.push({
      id: `risk-up-${command}`,
      type: "risk_increased",
      tone: "warning",
      title: "Pressão aumentou",
      detail: "A ação elevou o risco de curto prazo entre hoje e amanhã.",
      date: referenceDate,
    });
  }

  if (afterToday.riscos < beforeToday.riscos || afterTomorrow.novoRiscoCount < beforeTomorrow.novoRiscoCount) {
    consequences.push({
      id: `risk-down-${command}`,
      type: "risk_reduced",
      tone: "success",
      title: "Risco reduzido",
      detail: "A pressão operacional caiu no horizonte curto.",
      date: referenceDate,
    });
  }

  if (command === "mark_block_partial") {
    consequences.push({
      id: `pending-${sourceSlotId ?? "partial"}`,
      type: "pending_created",
      tone: "warning",
      title: "Saldo pendente criado",
      detail: "O bloco agora exige novo encaixe no horizonte curto.",
      slotId: sourceSlotId,
      date: referenceDate,
    });
  }

  if (command === "block_allocation") {
    consequences.push({
      id: `dependency-${sourceSlotId ?? "blocked"}`,
      type: "dependency_opened",
      tone: "critical",
      title: "Dependência aberta",
      detail: "O bloqueio passou a pressionar os blocos seguintes do mesmo trabalho.",
      slotId: sourceSlotId,
      date: referenceDate,
    });
  }

  if (command === "pull_forward_block") {
    consequences.push({
      id: `pulled-${targetSlotId ?? "forward"}`,
      type: "block_pulled_forward",
      tone: "opportunity",
      title: "Bloco antecipado",
      detail: "Uma entrega futura foi puxada para hoje e aliviou o horizonte curto.",
      slotId: targetSlotId,
      date: referenceDate,
    });
  }

  if (command === "confirm_day_closing") {
    consequences.push({
      id: `closing-${referenceDate}`,
      type: "completion_progressed",
      tone: "success",
      title: "Fechamento confirmado",
      detail: `O dia ${formatDateShort(referenceDate)} foi encerrado com o próximo foco já preparado.`,
      date: referenceDate,
    });
  }

  if (command === "reschedule_block" || command === "auto_replan_day") {
    consequences.push({
      id: `tomorrow-${command}`,
      type: "tomorrow_loaded",
      tone: "warning",
      title: "Amanhã foi recarregado",
      detail: `${afterTomorrow.pendenciasRemarcadas.length} pendência${afterTomorrow.pendenciasRemarcadas.length === 1 ? "" : "s"} já entram no próximo dia.`,
      date: afterTomorrow.data,
    });
  }

  if (command === "auto_replan_week") {
    const movedCarryover = Math.max(beforeCarryover - afterCarryover, 0);
    consequences.push({
      id: "week-carryover",
      type: "tomorrow_loaded",
      tone: "warning",
      title: "Nova semana carregada",
      detail: `${movedCarryover} pendência${movedCarryover === 1 ? "" : "s"} anterior${movedCarryover === 1 ? "" : "es"} entrou${movedCarryover === 1 ? "" : "ram"} no novo horizonte.`,
      date: referenceDate,
    });
  }

  const nextUsefulSlot = getNextUsefulOpenSlot(afterData, referenceDate);
  if (nextUsefulSlot) {
    consequences.push({
      id: `capacity-${nextUsefulSlot.slotId}`,
      type: "capacity_opened",
      tone: "opportunity",
      title: "Nova oportunidade de encaixe",
      detail: `${nextUsefulSlot.slotLabel} virou a melhor janela útil do horizonte curto.`,
      slotId: nextUsefulSlot.slotId,
      date: nextUsefulSlot.date,
    });
  }

  if (reviewAllocationIds?.length && (command === "mark_block_partial" || command === "block_allocation")) {
    consequences.push({
      id: `reschedule-${reviewAllocationIds[0]}`,
      type: "reschedule_suggested",
      tone: "neutral",
      title: "Remarcação sugerida",
      detail: "O saldo entrou na fila de revisão assistida com alternativas de menor impacto.",
    });
  }

  if (command === "complete_block") {
    consequences.push({
      id: `progress-${sourceSlotId ?? "complete"}`,
      type: "completion_progressed",
      tone: "success",
      title: "Conclusão avançou",
      detail: "O trabalho ficou mais próximo do fechamento e pode ter aliviado a fila seguinte.",
      slotId: sourceSlotId,
      date: referenceDate,
    });
  }

  const pressurePoints = getUpcomingPressurePoints(afterData, referenceDate, 1);
  if (pressurePoints[0]) {
    consequences.push({
      id: `pressure-${pressurePoints[0].id}`,
      type: "pressure_detected",
      tone: pressurePoints[0].tone === "critical" ? "critical" : "warning",
      title: "Ponto de pressão",
      detail: `${pressurePoints[0].title}: ${pressurePoints[0].detail}`,
      slotId: pressurePoints[0].slotId,
      date: pressurePoints[0].date,
    });
  }

  return consequences.slice(0, 5);
}

export function getImmediateImpactSummary(params: {
  command: PlannerCommandName;
  consequences: PlannerConsequence[];
  afterData: PlannerData;
  referenceDate: string;
}): ImmediateImpactSummary {
  const { command, consequences, afterData, referenceDate } = params;
  const tomorrow = getTomorrowPreview(afterData, referenceDate);
  const nextUsefulSlot = getNextUsefulOpenSlot(afterData, referenceDate);
  const topConsequences = consequences.slice(0, 3);

  const headlineMap: Record<PlannerCommandName, string> = {
    start_block: "Execução iniciada com contexto atualizado",
    complete_block: "Conclusão absorvida pelo restante da agenda",
    mark_block_partial: "Saldo criado e horizonte curto reavaliado",
    block_allocation: "Bloqueio propagado para o curto prazo",
    reschedule_block: "Remarcação aplicada com menor impacto local",
    pull_forward_block: "Antecipação aplicada e fila adiantada",
    confirm_day_closing: "Fechamento operacional confirmado",
    toggle_detail_panel: "Painel lateral alternado",
    select_next_focus: "Foco reordenado para a melhor continuidade",
    auto_replan_day: "Pendências redistribuídas para o próximo dia",
    auto_replan_week: "Pendências anteriores redistribuídas para a nova semana",
  };

  return {
    headline: headlineMap[command],
    details: topConsequences.map((item) => item.detail),
    recommendedAction:
      nextUsefulSlot?.suggestion
        ? `Próxima melhor ação: usar ${nextUsefulSlot.slotLabel} para ${nextUsefulSlot.suggestion.trabalho.titulo}.`
        : tomorrow.focoInicial?.trabalho
          ? `Próxima melhor ação: proteger ${tomorrow.focoInicial.trabalho.titulo} logo no início de amanhã.`
          : undefined,
  };
}

export function getBlockingItems(data: PlannerData) {
  const maps = buildMaps(data);

  return data.dependencias
    .filter((dependencia) => dependencia.status !== "liberada")
    .map((dependencia) => {
      const trabalho = maps.trabalhos.get(dependencia.trabalhoId);
      const bloco = dependencia.blocoId ? maps.blocos.get(dependencia.blocoId) : undefined;
      const impactoFuturo = data.alocacoes.filter((alocacao) => {
        if (!bloco) {
          return false;
        }
        const target = maps.blocos.get(alocacao.blocoId);
        return target?.trabalhoId === bloco.trabalhoId && target.sequencia > bloco.sequencia;
      }).length;
      const politicaSugerida =
        impactoFuturo > 0
          ? trabalho?.emRisco
            ? "Manter reserva dos próximos blocos"
            : "Reavaliar reserva dos slots futuros"
          : "Liberar slots futuros sem conflito";
      const efeitoCurto =
        impactoFuturo > 0
          ? `Bloqueio impacta ${impactoFuturo} bloco${impactoFuturo === 1 ? "" : "s"} futuro${impactoFuturo === 1 ? "" : "s"}.`
          : "Sem efeito dominó relevante no horizonte curto.";
      const politicaResumo = dependencia.politicaAplicada
        ? describeDependencyPolicy({
            action: dependencia.politicaAplicada,
            impactedFutureBlocks: impactoFuturo,
            isWorkAtRisk: Boolean(trabalho?.emRisco),
          })
        : undefined;

      return {
        dependencia,
        trabalho,
        bloco,
        impactoFuturo,
        politicaSugerida,
        efeitoCurto,
        politicaAplicada: dependencia.politicaAplicada,
        politicaResumo,
      };
    });
}

export function getAppliedDependencyPolicies(data: PlannerData) {
  const maps = buildMaps(data);

  return data.dependencias
    .filter(
      (dependencia) =>
        dependencia.status !== "liberada" && Boolean(dependencia.politicaAplicada),
    )
    .map((dependencia) => {
      const trabalho = maps.trabalhos.get(dependencia.trabalhoId);
      const bloco = dependencia.blocoId ? maps.blocos.get(dependencia.blocoId) : undefined;
      const impactoFuturo = data.alocacoes.filter((alocacao) => {
        if (!bloco) {
          return false;
        }

        const target = maps.blocos.get(alocacao.blocoId);
        return target?.trabalhoId === bloco.trabalhoId && target.sequencia > bloco.sequencia;
      }).length;
      const politicaResumo = describeDependencyPolicy({
        action: dependencia.politicaAplicada!,
        impactedFutureBlocks: impactoFuturo,
        isWorkAtRisk: Boolean(trabalho?.emRisco),
      });

      return {
        dependencyId: dependencia.id,
        workId: dependencia.trabalhoId,
        title: trabalho?.titulo ?? "Trabalho sem título",
        description: dependencia.descricao,
        impactCount: impactoFuturo,
        policy: politicaResumo,
      };
    });
}

export function getUpcomingDeliveries(data: PlannerData) {
  return [...data.trabalhos]
    .filter(isWorkOperationallyVisible)
    .sort((first, second) => first.prazoData.localeCompare(second.prazoData))
    .slice(0, 4);
}
