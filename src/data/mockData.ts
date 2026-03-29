import type {
  Alocacao,
  Bloco,
  Dependencia,
  PlannerData,
  RegistroExecucao,
  Slot,
  Solicitacao,
  Trabalho,
} from "../types/planner";
import { addDays, getBusinessDays, getOperationalDate } from "../utils/date";

const SLOT_BLUEPRINTS: Array<Pick<Slot, "nome" | "horaInicio" | "horaFim" | "duracaoMin" | "tipo" | "perfil">> = [
  { nome: "Agenda 01", horaInicio: "08:00", horaFim: "08:25", duracaoMin: 25, tipo: "foco", perfil: "profundo" },
  { nome: "Agenda 02", horaInicio: "08:30", horaFim: "08:55", duracaoMin: 25, tipo: "foco", perfil: "profundo" },
  { nome: "Agenda 03", horaInicio: "09:00", horaFim: "09:25", duracaoMin: 25, tipo: "operacional", perfil: "resposta" },
  { nome: "Agenda 04", horaInicio: "09:30", horaFim: "09:55", duracaoMin: 25, tipo: "buffer", perfil: "coordenacao" },
  { nome: "Agenda 05", horaInicio: "10:10", horaFim: "10:35", duracaoMin: 25, tipo: "cliente", perfil: "revisao" },
  { nome: "Agenda 06", horaInicio: "10:40", horaFim: "11:05", duracaoMin: 25, tipo: "foco", perfil: "profundo" },
  { nome: "Agenda 07", horaInicio: "11:10", horaFim: "11:35", duracaoMin: 25, tipo: "foco", perfil: "profundo" },
  { nome: "Agenda 08", horaInicio: "11:40", horaFim: "12:05", duracaoMin: 25, tipo: "buffer", perfil: "coordenacao" },
  { nome: "Agenda 09", horaInicio: "13:20", horaFim: "13:45", duracaoMin: 25, tipo: "operacional", perfil: "revisao" },
  { nome: "Agenda 10", horaInicio: "13:50", horaFim: "14:15", duracaoMin: 25, tipo: "foco", perfil: "profundo" },
  { nome: "Agenda 11", horaInicio: "14:20", horaFim: "14:45", duracaoMin: 25, tipo: "foco", perfil: "profundo" },
  { nome: "Agenda 12", horaInicio: "14:50", horaFim: "15:15", duracaoMin: 25, tipo: "buffer", perfil: "coordenacao" },
  { nome: "Agenda 13", horaInicio: "15:30", horaFim: "15:55", duracaoMin: 25, tipo: "foco", perfil: "profundo" },
  { nome: "Agenda 14", horaInicio: "16:00", horaFim: "16:25", duracaoMin: 25, tipo: "operacional", perfil: "resposta" },
  { nome: "Agenda 15", horaInicio: "16:30", horaFim: "16:55", duracaoMin: 25, tipo: "buffer", perfil: "coordenacao" },
  { nome: "Agenda 16", horaInicio: "17:00", horaFim: "17:25", duracaoMin: 25, tipo: "cliente", perfil: "revisao" },
];

function createSlots(): Slot[] {
  return SLOT_BLUEPRINTS.map((slot, index) => ({
    id: `slot-${index + 1}`,
    ...slot,
    status: "livre",
  }));
}

function createWork(trabalho: Trabalho) {
  return trabalho;
}

function createBlocks(trabalhoId: string, totalBlocos: number): Bloco[] {
  return Array.from({ length: totalBlocos }, (_, index) => ({
    id: `bloco-${trabalhoId}-${index + 1}`,
    trabalhoId,
    sequencia: index + 1,
    totalBlocos,
    duracaoPlanejadaMin: 25,
    duracaoRealizadaMin: 0,
    status: "planejado",
    elegivelAntecipacao: true,
    foiAntecipado: false,
    foiRemarcado: false,
  }));
}

export function createMockPlannerData(referenceDate = new Date()): PlannerData {
  const dataOperacional = getOperationalDate(referenceDate);
  const diasSemana = getBusinessDays(dataOperacional, 10);
  const hoje = dataOperacional;
  const amanha = addDays(hoje, 1);
  const depois = addDays(hoje, 2);
  const quinta = addDays(hoje, 3);
  const sexta = addDays(hoje, 4);

  const slots = createSlots();

  const trabalhos: Trabalho[] = [
    createWork({
      id: "relatorio-mensal",
      titulo: "Consolidar relatório mensal de operações",
      descricao: "Fechar o pacote executivo com indicadores, notas gerenciais e revisão final do material que segue para diretoria.",
      categoria: "Relatórios",
      solicitante: "Diretoria de Operações",
      area: "Operações",
      clienteProjeto: "Comitê Executivo",
      duracaoEstimadaMin: 200,
      duracaoRealizadaMin: 75,
      prazoData: quinta,
      dataInicioMinima: hoje,
      prioridade: "alta",
      status: "em_execucao",
      fragmentavel: true,
      blocoMinimoMin: 25,
      permiteAntecipacao: true,
      exigeSequencia: true,
      percentualConclusao: 38,
      emRisco: true,
      observacoes: "Depende de fechamento de números de atendimento até o meio da tarde.",
    }),
    createWork({
      id: "proposta-acme",
      titulo: "Responder proposta comercial da Acme",
      descricao: "Ajustar contrapartidas, revisar anexos e devolver proposta consolidada para aprovação ainda hoje.",
      categoria: "Comercial",
      solicitante: "Equipe Comercial",
      area: "Pré-vendas",
      clienteProjeto: "Acme",
      duracaoEstimadaMin: 75,
      duracaoRealizadaMin: 35,
      prazoData: hoje,
      dataInicioMinima: hoje,
      prioridade: "critica",
      status: "parcial",
      fragmentavel: true,
      blocoMinimoMin: 25,
      permiteAntecipacao: false,
      exigeSequencia: true,
      percentualConclusao: 47,
      emRisco: true,
      observacoes: "Se não fechar hoje, impacta aprovação do contrato amanhã cedo.",
    }),
    createWork({
      id: "contrato-atlas",
      titulo: "Revisão contratual do projeto Atlas",
      descricao: "Conferir cláusulas de SLA, ajustar vigência e devolver minuta para o jurídico do cliente.",
      categoria: "Jurídico",
      solicitante: "PMO",
      area: "Operações",
      clienteProjeto: "Atlas",
      duracaoEstimadaMin: 50,
      duracaoRealizadaMin: 0,
      prazoData: amanha,
      dataInicioMinima: hoje,
      prioridade: "alta",
      status: "bloqueado",
      fragmentavel: true,
      blocoMinimoMin: 25,
      permiteAntecipacao: false,
      exigeSequencia: true,
      percentualConclusao: 0,
      emRisco: true,
      observacoes: "Aguardando validação externa do jurídico do cliente.",
    }),
    createWork({
      id: "kpi-semanal",
      titulo: "Atualizar painel semanal de KPIs",
      descricao: "Revisar indicadores operacionais, garantir consistência e publicar snapshot para liderança.",
      categoria: "BI",
      solicitante: "Liderança de Operações",
      area: "Analytics",
      clienteProjeto: "Painel Interno",
      duracaoEstimadaMin: 100,
      duracaoRealizadaMin: 50,
      prazoData: sexta,
      dataInicioMinima: hoje,
      prioridade: "media",
      status: "em_execucao",
      fragmentavel: true,
      blocoMinimoMin: 25,
      permiteAntecipacao: true,
      exigeSequencia: false,
      percentualConclusao: 50,
      emRisco: false,
      observacoes: "Blocos podem ser puxados para janelas livres sem prejuízo de contexto.",
    }),
    createWork({
      id: "crm-legado",
      titulo: "Limpeza de pendências do CRM legado",
      descricao: "Ajustar inconsistências de campos, normalizar etapas e preparar lote para importação.",
      categoria: "Dados",
      solicitante: "Operações Comerciais",
      area: "Operações",
      clienteProjeto: "CRM Interno",
      duracaoEstimadaMin: 125,
      duracaoRealizadaMin: 0,
      prazoData: sexta,
      dataInicioMinima: amanha,
      prioridade: "baixa",
      status: "planejado",
      fragmentavel: true,
      blocoMinimoMin: 25,
      permiteAntecipacao: true,
      exigeSequencia: false,
      percentualConclusao: 0,
      emRisco: false,
      observacoes: "Boa opção para preencher capacidade livre sem travar entregas principais.",
    }),
    createWork({
      id: "campanhas-marketing-digital",
      titulo: "Campanhas de marketing digital",
      descricao: "Planejamento das próximas campanhas digitais, incluindo cronograma, ideação, análise histórica, definição de público-alvo e KPIs.",
      categoria: "Marketing",
      solicitante: "Marketing",
      area: "Marketing",
      clienteProjeto: "Campanhas Digitais",
      duracaoEstimadaMin: 275,
      duracaoRealizadaMin: 0,
      prazoData: sexta,
      dataInicioMinima: amanha,
      prioridade: "media",
      status: "planejado",
      fragmentavel: true,
      blocoMinimoMin: 25,
      permiteAntecipacao: true,
      exigeSequencia: false,
      percentualConclusao: 0,
      emRisco: false,
      observacoes: "Trabalho organizado em etapas internas para orientar a preparação das próximas campanhas.",
      etapas: [
        {
          id: "cronograma",
          titulo: "Planejamento de Cronograma",
          descricao: "Estabelecer um cronograma para a implementação das novas campanhas, incluindo prazos e responsáveis.",
          duracaoEstimadaMin: 50,
        },
        {
          id: "brainstorming",
          titulo: "Brainstorming de Novas Ideias",
          descricao: "Gerar propostas criativas para futuras campanhas com base nas tendências do mercado.",
          duracaoEstimadaMin: 50,
        },
        {
          id: "analise-resultados",
          titulo: "Análise de Resultados",
          descricao: "Revisar métricas das últimas campanhas para identificar pontos fortes e áreas de melhoria.",
          duracaoEstimadaMin: 75,
        },
        {
          id: "publico-alvo",
          titulo: "Definição de Público-Alvo",
          descricao: "Delimitar perfis de clientes a serem abordados nas próximas campanhas para maximizar o impacto.",
          duracaoEstimadaMin: 50,
        },
        {
          id: "kpis",
          titulo: "Definição de KPIs",
          descricao: "Identificar e formalizar indicadores-chave de desempenho para medir o sucesso das futuras ações de marketing.",
          duracaoEstimadaMin: 50,
        },
      ],
    }),
    createWork({
      id: "comite-operacoes",
      titulo: "Preparar material do comitê de operações",
      descricao: "Montar pauta, coletar decisões em aberto e consolidar encaminhamentos da semana.",
      categoria: "Governança",
      solicitante: "Head de Operações",
      area: "Governança",
      clienteProjeto: "Comitê de Operações",
      duracaoEstimadaMin: 100,
      duracaoRealizadaMin: 0,
      prazoData: depois,
      dataInicioMinima: hoje,
      prioridade: "media",
      status: "planejado",
      fragmentavel: true,
      blocoMinimoMin: 25,
      permiteAntecipacao: true,
      exigeSequencia: false,
      percentualConclusao: 0,
      emRisco: false,
      observacoes: "Pode ser diluído ao longo da semana, mas precisa estar fechado até quarta.",
    }),
  ];

  const blocos = [
    ...createBlocks("relatorio-mensal", 8),
    ...createBlocks("proposta-acme", 3),
    ...createBlocks("contrato-atlas", 2),
    ...createBlocks("kpi-semanal", 4),
    ...createBlocks("crm-legado", 5),
    ...createBlocks("campanhas-marketing-digital", 11),
    ...createBlocks("comite-operacoes", 4),
  ];

  const blocoMap = new Map(blocos.map((bloco) => [bloco.id, bloco]));

  const updateBlock = (blockId: string, partial: Partial<Bloco>) => {
    const block = blocoMap.get(blockId);
    if (block) {
      Object.assign(block, partial);
    }
  };

  updateBlock("bloco-relatorio-mensal-1", { status: "concluido", duracaoRealizadaMin: 25 });
  updateBlock("bloco-relatorio-mensal-2", { status: "concluido", duracaoRealizadaMin: 25 });
  updateBlock("bloco-relatorio-mensal-3", { status: "planejado" });
  updateBlock("bloco-relatorio-mensal-4", { status: "planejado" });
  updateBlock("bloco-relatorio-mensal-5", {
    status: "planejado",
    foiRemarcado: true,
    motivoRemanejamento: "Reposicionado após reunião emergencial da manhã.",
  });
  updateBlock("bloco-relatorio-mensal-6", { status: "planejado" });
  updateBlock("bloco-proposta-acme-1", { status: "em_execucao", duracaoRealizadaMin: 15, elegivelAntecipacao: false });
  updateBlock("bloco-proposta-acme-2", { status: "parcial", duracaoRealizadaMin: 10, elegivelAntecipacao: false });
  updateBlock("bloco-contrato-atlas-1", { status: "bloqueado", elegivelAntecipacao: false });
  updateBlock("bloco-kpi-semanal-1", { status: "concluido", duracaoRealizadaMin: 25 });
  updateBlock("bloco-kpi-semanal-2", { status: "concluido", duracaoRealizadaMin: 25 });
  updateBlock("bloco-kpi-semanal-3", { status: "planejado", foiAntecipado: true });

  const alocacoes: Alocacao[] = [
    { id: "aloc-1", blocoId: "bloco-kpi-semanal-1", dataPlanejada: hoje, slotId: "slot-1", statusAlocacao: "concluido", origemAlocacao: "planejamento_inicial" },
    { id: "aloc-2", blocoId: "bloco-proposta-acme-1", dataPlanejada: hoje, slotId: "slot-2", statusAlocacao: "em_execucao", origemAlocacao: "planejamento_inicial" },
    { id: "aloc-3", blocoId: "bloco-proposta-acme-2", dataPlanejada: hoje, slotId: "slot-3", statusAlocacao: "parcial", origemAlocacao: "planejamento_inicial" },
    { id: "aloc-4", blocoId: "bloco-contrato-atlas-1", dataPlanejada: hoje, slotId: "slot-5", statusAlocacao: "bloqueado", origemAlocacao: "planejamento_inicial" },
    { id: "aloc-5", blocoId: "bloco-relatorio-mensal-3", dataPlanejada: hoje, slotId: "slot-6", statusAlocacao: "planejado", origemAlocacao: "planejamento_inicial" },
    { id: "aloc-6", blocoId: "bloco-relatorio-mensal-4", dataPlanejada: hoje, slotId: "slot-7", statusAlocacao: "planejado", origemAlocacao: "planejamento_inicial" },
    { id: "aloc-7", blocoId: "bloco-kpi-semanal-2", dataPlanejada: hoje, slotId: "slot-9", statusAlocacao: "concluido", origemAlocacao: "planejamento_inicial" },
    { id: "aloc-8", blocoId: "bloco-relatorio-mensal-5", dataPlanejada: hoje, slotId: "slot-10", statusAlocacao: "remarcado", origemAlocacao: "replanejamento" },
    { id: "aloc-9", blocoId: "bloco-comite-operacoes-1", dataPlanejada: hoje, slotId: "slot-11", statusAlocacao: "planejado", origemAlocacao: "planejamento_inicial" },
    { id: "aloc-10", blocoId: "bloco-relatorio-mensal-6", dataPlanejada: hoje, slotId: "slot-13", statusAlocacao: "planejado", origemAlocacao: "planejamento_inicial" },
    { id: "aloc-11", blocoId: "bloco-comite-operacoes-2", dataPlanejada: hoje, slotId: "slot-14", statusAlocacao: "planejado", origemAlocacao: "planejamento_inicial" },
    { id: "aloc-12", blocoId: "bloco-kpi-semanal-3", dataPlanejada: hoje, slotId: "slot-15", statusAlocacao: "antecipado", origemAlocacao: "antecipacao" },
    { id: "aloc-13", blocoId: "bloco-proposta-acme-3", dataPlanejada: hoje, slotId: "slot-16", statusAlocacao: "planejado", origemAlocacao: "planejamento_inicial" },
    { id: "aloc-14", blocoId: "bloco-relatorio-mensal-7", dataPlanejada: amanha, slotId: "slot-2", statusAlocacao: "planejado", origemAlocacao: "planejamento_inicial" },
    { id: "aloc-15", blocoId: "bloco-relatorio-mensal-8", dataPlanejada: amanha, slotId: "slot-3", statusAlocacao: "planejado", origemAlocacao: "planejamento_inicial" },
    { id: "aloc-16", blocoId: "bloco-crm-legado-1", dataPlanejada: amanha, slotId: "slot-4", statusAlocacao: "planejado", origemAlocacao: "planejamento_inicial" },
    { id: "aloc-17", blocoId: "bloco-crm-legado-2", dataPlanejada: amanha, slotId: "slot-5", statusAlocacao: "planejado", origemAlocacao: "planejamento_inicial" },
    { id: "aloc-18", blocoId: "bloco-comite-operacoes-3", dataPlanejada: amanha, slotId: "slot-8", statusAlocacao: "planejado", origemAlocacao: "planejamento_inicial" },
    { id: "aloc-19", blocoId: "bloco-contrato-atlas-2", dataPlanejada: amanha, slotId: "slot-10", statusAlocacao: "planejado", origemAlocacao: "planejamento_inicial" },
    { id: "aloc-20", blocoId: "bloco-kpi-semanal-4", dataPlanejada: amanha, slotId: "slot-12", statusAlocacao: "planejado", origemAlocacao: "planejamento_inicial" },
    { id: "aloc-21", blocoId: "bloco-crm-legado-3", dataPlanejada: depois, slotId: "slot-6", statusAlocacao: "planejado", origemAlocacao: "planejamento_inicial" },
    { id: "aloc-22", blocoId: "bloco-crm-legado-4", dataPlanejada: depois, slotId: "slot-11", statusAlocacao: "planejado", origemAlocacao: "planejamento_inicial" },
    { id: "aloc-23", blocoId: "bloco-crm-legado-5", dataPlanejada: quinta, slotId: "slot-5", statusAlocacao: "planejado", origemAlocacao: "planejamento_inicial" },
    { id: "aloc-24", blocoId: "bloco-comite-operacoes-4", dataPlanejada: depois, slotId: "slot-14", statusAlocacao: "planejado", origemAlocacao: "planejamento_inicial" },
    { id: "aloc-25", blocoId: "bloco-campanhas-marketing-digital-1", dataPlanejada: amanha, slotId: "slot-1", statusAlocacao: "planejado", origemAlocacao: "planejamento_inicial" },
    { id: "aloc-26", blocoId: "bloco-campanhas-marketing-digital-2", dataPlanejada: amanha, slotId: "slot-6", statusAlocacao: "planejado", origemAlocacao: "planejamento_inicial" },
    { id: "aloc-27", blocoId: "bloco-campanhas-marketing-digital-3", dataPlanejada: amanha, slotId: "slot-7", statusAlocacao: "planejado", origemAlocacao: "planejamento_inicial" },
    { id: "aloc-28", blocoId: "bloco-campanhas-marketing-digital-4", dataPlanejada: amanha, slotId: "slot-9", statusAlocacao: "planejado", origemAlocacao: "planejamento_inicial" },
    { id: "aloc-29", blocoId: "bloco-campanhas-marketing-digital-5", dataPlanejada: amanha, slotId: "slot-11", statusAlocacao: "planejado", origemAlocacao: "planejamento_inicial" },
    { id: "aloc-30", blocoId: "bloco-campanhas-marketing-digital-6", dataPlanejada: depois, slotId: "slot-1", statusAlocacao: "planejado", origemAlocacao: "planejamento_inicial" },
    { id: "aloc-31", blocoId: "bloco-campanhas-marketing-digital-7", dataPlanejada: depois, slotId: "slot-2", statusAlocacao: "planejado", origemAlocacao: "planejamento_inicial" },
    { id: "aloc-32", blocoId: "bloco-campanhas-marketing-digital-8", dataPlanejada: depois, slotId: "slot-4", statusAlocacao: "planejado", origemAlocacao: "planejamento_inicial" },
    { id: "aloc-33", blocoId: "bloco-campanhas-marketing-digital-9", dataPlanejada: depois, slotId: "slot-7", statusAlocacao: "planejado", origemAlocacao: "planejamento_inicial" },
    { id: "aloc-34", blocoId: "bloco-campanhas-marketing-digital-10", dataPlanejada: quinta, slotId: "slot-1", statusAlocacao: "planejado", origemAlocacao: "planejamento_inicial" },
    { id: "aloc-35", blocoId: "bloco-campanhas-marketing-digital-11", dataPlanejada: quinta, slotId: "slot-2", statusAlocacao: "planejado", origemAlocacao: "planejamento_inicial" },
  ];

  const dependencias: Dependencia[] = [
    {
      id: "dep-1",
      trabalhoId: "contrato-atlas",
      blocoId: "bloco-contrato-atlas-1",
      tipo: "validacao_juridica",
      descricao: "Minuta aguarda retorno do jurídico do cliente antes de avançar para revisão final.",
      status: "bloqueando",
      responsavelExterno: "Marina Lopes",
      dataPrevistaLiberacao: amanha,
    },
    {
      id: "dep-2",
      trabalhoId: "relatorio-mensal",
      blocoId: "bloco-relatorio-mensal-6",
      tipo: "aprovacao",
      descricao: "Aprovação de números consolidados pelo time de atendimento.",
      status: "pendente",
      responsavelExterno: "Coordenação de Atendimento",
      dataPrevistaLiberacao: hoje,
    },
  ];

  const registros: RegistroExecucao[] = [
    { id: "reg-1", alocacaoId: "aloc-1", dataExecucao: hoje, minutosRealizados: 25, resultado: "concluido" },
    { id: "reg-2", alocacaoId: "aloc-2", dataExecucao: hoje, minutosRealizados: 15, resultado: "parcial", motivo: "Ajuste comercial ainda em andamento." },
    { id: "reg-3", alocacaoId: "aloc-3", dataExecucao: hoje, minutosRealizados: 10, resultado: "parcial", motivo: "Aguardando anexos corretos." },
    { id: "reg-4", alocacaoId: "aloc-7", dataExecucao: hoje, minutosRealizados: 25, resultado: "concluido" },
  ];

  const solicitacoes: Solicitacao[] = [
    {
      id: "sol-1",
      tituloInicial: "Levantamento rápido para comitê de clientes",
      descricaoInicial: "Precisamos consolidar um resumo de backlog por cliente até quarta para apresentação executiva.",
      solicitante: "Comercial",
      area: "Pré-vendas",
      prazoSugerido: depois,
      urgenciaInformada: "alta",
      esforcoEstimadoInicialMin: 90,
      statusTriagem: "em_triagem",
      decisao: "avaliar_capacidade",
    },
    {
      id: "sol-2",
      tituloInicial: "Atualizar base de SLA do projeto Orion",
      descricaoInicial: "Carga simples de novos parâmetros no modelo de monitoramento.",
      solicitante: "CS",
      area: "Operações",
      prazoSugerido: quinta,
      urgenciaInformada: "media",
      esforcoEstimadoInicialMin: 50,
      statusTriagem: "qualificada",
      decisao: "virar_trabalho",
    },
    {
      id: "sol-3",
      tituloInicial: "Mapear retrabalho do fluxo de cobrança",
      descricaoInicial: "Pedido exploratório para entender causas de reabertura.",
      solicitante: "Financeiro",
      area: "Analytics",
      prazoSugerido: sexta,
      urgenciaInformada: "baixa",
      esforcoEstimadoInicialMin: 120,
      statusTriagem: "nova",
      decisao: null,
    },
  ];

  return {
    dataOperacional,
    diasSemana,
    slots,
    trabalhos,
    blocos: Array.from(blocoMap.values()),
    alocacoes,
    dependencias,
    registros,
    issues: [],
    solicitacoes,
    fechamentosOperacionais: [],
  };
}
