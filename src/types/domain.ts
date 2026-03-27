import type { PlannerData } from "./planner";
import type { EtapaTrabalho, Prioridade } from "./planner";

export type PlannerCommandName =
  | "start_block"
  | "complete_block"
  | "mark_block_partial"
  | "block_allocation"
  | "reschedule_block"
  | "pull_forward_block"
  | "toggle_detail_panel"
  | "select_next_focus"
  | "auto_replan_day";

export type PlannerConsequenceType =
  | "work_created"
  | "request_created"
  | "focus_changed"
  | "slot_freed"
  | "risk_increased"
  | "risk_reduced"
  | "pending_created"
  | "tomorrow_loaded"
  | "block_pulled_forward"
  | "dependency_opened"
  | "reschedule_suggested"
  | "capacity_opened"
  | "pressure_detected"
  | "completion_progressed";

export type PlannerConsequenceTone =
  | "neutral"
  | "success"
  | "warning"
  | "critical"
  | "opportunity";

export interface PlannerConsequence {
  id: string;
  type: PlannerConsequenceType;
  tone: PlannerConsequenceTone;
  title: string;
  detail: string;
  slotId?: string;
  date?: string;
  workId?: string;
}

export interface ImmediateImpactSummary {
  headline: string;
  details: string[];
  recommendedAction?: string;
  contextTag?: {
    label: string;
    tone: PlannerConsequenceTone;
  };
}

export interface PlannerWorkInput {
  titulo: string;
  descricao: string;
  etapas: EtapaTrabalho[];
  duracaoEstimadaMin: number;
  prazoData: string;
  prioridade: Prioridade;
  dataInicioMinima: string;
  fragmentavel: boolean;
  blocoMinimoMin: number;
  exigeSequencia: boolean;
  permiteAntecipacao: boolean;
  solicitante: string;
  area: string;
  clienteProjeto: string;
  observacoes: string;
}

export interface PlannerRequestInput {
  tituloInicial: string;
  descricaoInicial: string;
  solicitante: string;
  area: string;
  prazoSugerido: string;
  urgenciaInformada: Prioridade;
  esforcoEstimadoInicialMin: number;
}

export interface SystemFeedback {
  title: string;
  detail: string;
  tone: "neutral" | "success" | "warning" | "critical" | "opportunity";
  contextTag?: ImmediateImpactSummary["contextTag"];
}

export interface SlotFeedback {
  slotId: string;
  label: string;
  tone: "success" | "warning" | "critical" | "opportunity";
}

export interface PlannerCommandContext {
  plannerData: PlannerData;
  selectedDate: string;
  selectedSlotId: string;
  selectedWorkId: string;
  isDetailPanelOpen: boolean;
}

export interface PlannerCommandPayloadMap {
  start_block: { allocationId: string };
  complete_block: { allocationId: string };
  mark_block_partial: { allocationId: string };
  block_allocation: { allocationId: string };
  reschedule_block: {
    allocationId: string;
    targetDate?: string;
    targetSlotId?: string;
    reason?: string;
  };
  pull_forward_block: { allocationId: string; slotId: string };
  toggle_detail_panel: { nextOpen: boolean };
  select_next_focus: Record<string, never>;
  auto_replan_day: Record<string, never>;
}

export interface PlannerTransitionUiPatch {
  nextDate?: string;
  nextSlotId?: string;
  nextWorkId?: string;
  openDetailPanel?: boolean;
  slotFeedback?: SlotFeedback | null;
}

export interface PlannerTransition {
  command: PlannerCommandName;
  nextData: PlannerData;
  uiPatch: PlannerTransitionUiPatch;
  sourceSlotId?: string;
  targetSlotId?: string;
  reviewAllocationIds?: string[];
}

export interface PlannerCommandExecution {
  transition: PlannerTransition;
  consequences: PlannerConsequence[];
  impactSummary: ImmediateImpactSummary;
}

export type RescheduleReviewStatus = "pending" | "accepted" | "deferred" | "ignored";

export type ReviewTradeoffCode =
  | "lowest_deadline_impact"
  | "preserve_tomorrow_capacity"
  | "uses_idle_window"
  | "reduce_short_horizon_pressure"
  | "increase_tomorrow_load"
  | "pushes_pressure_forward"
  | "avoid_critical_conflict";

export interface ReviewTradeoff {
  code: ReviewTradeoffCode;
  label: string;
  effect: string;
  tone: "positive" | "warning" | "neutral";
}

export interface ReviewOption {
  id: string;
  date: string;
  slotId: string;
  slotLabel: string;
  pressureLevel: "stable" | "watch" | "critical";
  decisionRationale: string;
  impactSummary: string;
  tradeoff: ReviewTradeoff;
  isSuggested: boolean;
}

export interface ReviewDecisionState {
  status: RescheduleReviewStatus;
  acceptedOptionId?: string;
  chosenOption?: ReviewOption;
}

export interface ReviewFlowState {
  activeAllocationIds: string[];
  decisions: Record<string, ReviewDecisionState>;
}

export interface ReviewItemView {
  allocationId: string;
  workId: string;
  title: string;
  date: string;
  currentSlotId: string;
  currentSlotLabel: string;
  status: string;
  saldoRestanteMin: number;
  motivo: string;
  pressureNote?: string;
  suggestedOption?: ReviewOption;
  acceptedOption?: ReviewOption;
  alternatives: ReviewOption[];
  reviewStatus: RescheduleReviewStatus;
  comparisonNote?: string;
}

export type ReviewAction = "accept" | "defer" | "ignore";

export interface ReviewFlowResolution {
  nextState: ReviewFlowState;
  followUpCommand?: {
    command: "reschedule_block";
    payload: {
      allocationId: string;
      targetDate: string;
      targetSlotId: string;
      reason: string;
    };
  };
  consequences: PlannerConsequence[];
  impactSummary: ImmediateImpactSummary;
  systemFeedback: SystemFeedback;
}

export interface DependencyFlowResolution {
  nextData: PlannerData;
  uiPatch?: PlannerTransitionUiPatch;
  consequences: PlannerConsequence[];
  impactSummary: ImmediateImpactSummary;
  systemFeedback: SystemFeedback;
}

export type DependencyPolicyAction = "manter_reserva" | "liberar_slots_futuros";
