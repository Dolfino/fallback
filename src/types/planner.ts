export type SlotStatus =
  | "livre"
  | "planejado"
  | "em_execucao"
  | "concluido"
  | "parcial"
  | "bloqueado"
  | "remarcado"
  | "antecipado";

export type SlotTipo = "foco" | "cliente" | "buffer" | "operacional";
export type SlotPerfil = "profundo" | "coordenacao" | "resposta" | "revisao";

export type Prioridade = "baixa" | "media" | "alta" | "critica";
export type StatusTrabalho =
  | "na_fila"
  | "planejado"
  | "em_execucao"
  | "parcial"
  | "bloqueado"
  | "concluido";

export type StatusBloco =
  | "planejado"
  | "em_execucao"
  | "concluido"
  | "parcial"
  | "bloqueado";

export type StatusAlocacao =
  | "planejado"
  | "em_execucao"
  | "concluido"
  | "parcial"
  | "bloqueado"
  | "remarcado"
  | "antecipado";

export type OrigemAlocacao =
  | "planejamento_inicial"
  | "replanejamento"
  | "antecipacao";

export type StatusDependencia = "pendente" | "liberada" | "bloqueando";
export type TipoDependencia =
  | "aprovacao"
  | "insumo_externo"
  | "retorno_cliente"
  | "validacao_juridica";

export type ResultadoExecucao =
  | "concluido"
  | "parcial"
  | "bloqueado"
  | "nao_executado";

export type StatusTriagem = "nova" | "em_triagem" | "qualificada" | "descartada";
export type DecisaoTriagem = "avaliar_capacidade" | "virar_trabalho" | "recusar" | null;

export interface Slot {
  id: string;
  nome: string;
  horaInicio: string;
  horaFim: string;
  duracaoMin: number;
  tipo: SlotTipo;
  perfil: SlotPerfil;
  status: SlotStatus;
}

export interface EtapaTrabalho {
  id: string;
  titulo: string;
  descricao: string;
  duracaoEstimadaMin: number;
}

export interface Trabalho {
  id: string;
  titulo: string;
  descricao: string;
  categoria: string;
  solicitante: string;
  area: string;
  clienteProjeto: string;
  duracaoEstimadaMin: number;
  duracaoRealizadaMin: number;
  prazoData: string;
  dataInicioMinima: string;
  prioridade: Prioridade;
  status: StatusTrabalho;
  fragmentavel: boolean;
  blocoMinimoMin: number;
  permiteAntecipacao: boolean;
  exigeSequencia: boolean;
  percentualConclusao: number;
  emRisco: boolean;
  observacoes?: string;
  etapas?: EtapaTrabalho[];
}

export interface Bloco {
  id: string;
  trabalhoId: string;
  sequencia: number;
  totalBlocos: number;
  duracaoPlanejadaMin: number;
  duracaoRealizadaMin: number;
  status: StatusBloco;
  elegivelAntecipacao: boolean;
  foiAntecipado: boolean;
  foiRemarcado: boolean;
  motivoRemanejamento?: string;
}

export interface Alocacao {
  id: string;
  blocoId: string;
  dataPlanejada: string;
  slotId: string;
  statusAlocacao: StatusAlocacao;
  origemAlocacao: OrigemAlocacao;
}

export interface Dependencia {
  id: string;
  trabalhoId: string;
  blocoId?: string;
  tipo: TipoDependencia;
  descricao: string;
  status: StatusDependencia;
  responsavelExterno: string;
  dataPrevistaLiberacao: string;
  politicaAplicada?: "manter_reserva" | "liberar_slots_futuros";
}

export interface RegistroExecucao {
  id: string;
  alocacaoId: string;
  dataExecucao: string;
  minutosRealizados: number;
  resultado: ResultadoExecucao;
  motivo?: string;
}

export interface Solicitacao {
  id: string;
  tituloInicial: string;
  descricaoInicial: string;
  solicitante: string;
  area: string;
  prazoSugerido: string;
  urgenciaInformada: Prioridade;
  esforcoEstimadoInicialMin: number;
  statusTriagem: StatusTriagem;
  decisao: DecisaoTriagem;
}

export interface FechamentoOperacional {
  date: string;
  confirmedAt: string;
  pendingCount: number;
  blockedCount: number;
  carryoverCount: number;
}

export interface PlannerData {
  dataOperacional: string;
  diasSemana: string[];
  slots: Slot[];
  trabalhos: Trabalho[];
  blocos: Bloco[];
  alocacoes: Alocacao[];
  dependencias: Dependencia[];
  registros: RegistroExecucao[];
  solicitacoes: Solicitacao[];
  fechamentosOperacionais?: FechamentoOperacional[];
}
