import type { Dispatch, SetStateAction } from "react";
import type {
  DependencyFlowResolution,
  ImmediateImpactSummary,
  PlannerCommandExecution,
  PlannerConsequence,
  ReviewFlowResolution,
  ReviewFlowState,
  SlotFeedback,
  SystemFeedback,
} from "../types/domain";
import type { PlannerData } from "../types/planner";
import { queueReviewItems } from "./plannerReviewFlow";

export interface PlannerOperationApplication {
  nextData?: PlannerData;
  nextDate?: string;
  nextSlotId?: string;
  nextWorkId?: string;
  openDetailPanel?: boolean;
  slotFeedback?: SlotFeedback | null;
  consequences: PlannerConsequence[];
  impactSummary: ImmediateImpactSummary;
  systemFeedback: SystemFeedback;
  queueReviewIds?: string[];
  reviewFlowState?: ReviewFlowState;
}

export interface PlannerOperationSetters {
  setPlannerData: Dispatch<SetStateAction<PlannerData>>;
  setSelectedDate: Dispatch<SetStateAction<string>>;
  setSelectedSlotId: Dispatch<SetStateAction<string>>;
  setSelectedWorkId: Dispatch<SetStateAction<string>>;
  setIsDetailPanelOpen: Dispatch<SetStateAction<boolean>>;
  setSlotFeedback: Dispatch<SetStateAction<SlotFeedback | null>>;
  setRecentConsequences: Dispatch<SetStateAction<PlannerConsequence[]>>;
  setImpactSummary: Dispatch<SetStateAction<ImmediateImpactSummary | null>>;
  setSystemFeedback: Dispatch<SetStateAction<SystemFeedback>>;
  setReviewFlowState: Dispatch<SetStateAction<ReviewFlowState>>;
}

export function createSystemFeedback(
  consequences: PlannerConsequence[],
  impactSummary: ImmediateImpactSummary,
): SystemFeedback {
  const primary = consequences[0];

  if (primary) {
    return {
      title: primary.title,
      detail: impactSummary.recommendedAction
        ? `${primary.detail} ${impactSummary.recommendedAction}`
        : primary.detail,
      tone: primary.tone,
      contextTag: impactSummary.contextTag,
    };
  }

  return {
    title: impactSummary.headline,
    detail: impactSummary.details[0] ?? "Contexto operacional atualizado.",
    tone: "neutral",
    contextTag: impactSummary.contextTag,
  };
}

export function applyPlannerOperationState(
  setters: PlannerOperationSetters,
  application: PlannerOperationApplication,
) {
  if (application.nextData) {
    setters.setPlannerData(application.nextData);
  }

  setters.setRecentConsequences(application.consequences);
  setters.setImpactSummary(application.impactSummary);
  setters.setSystemFeedback(application.systemFeedback);
  setters.setSlotFeedback(application.slotFeedback ?? null);

  if (application.queueReviewIds?.length) {
    setters.setReviewFlowState((current) => queueReviewItems(current, application.queueReviewIds));
  }

  if (application.reviewFlowState) {
    setters.setReviewFlowState(application.reviewFlowState);
  }

  if (application.nextDate) {
    setters.setSelectedDate(application.nextDate);
  }
  if (application.nextSlotId) {
    setters.setSelectedSlotId(application.nextSlotId);
  }
  if (application.nextWorkId) {
    setters.setSelectedWorkId(application.nextWorkId);
  }
  if (typeof application.openDetailPanel === "boolean") {
    setters.setIsDetailPanelOpen(application.openDetailPanel);
  }
}

export function buildExecutionApplication(
  execution: PlannerCommandExecution,
  overrides?: {
    prependConsequences?: PlannerConsequence[];
    impactSummary?: ImmediateImpactSummary;
    systemFeedback?: SystemFeedback;
    reviewFlowState?: ReviewFlowState;
  },
): PlannerOperationApplication {
  const uiPatch = execution.transition.uiPatch;
  const consequences = [...(overrides?.prependConsequences ?? []), ...execution.consequences].slice(0, 4);
  const impactSummary = overrides?.impactSummary ?? execution.impactSummary;

  return {
    nextData: execution.transition.nextData,
    nextDate: uiPatch.nextDate,
    nextSlotId: uiPatch.nextSlotId,
    nextWorkId: uiPatch.nextWorkId,
    openDetailPanel: uiPatch.openDetailPanel,
    slotFeedback: uiPatch.slotFeedback ?? null,
    consequences,
    impactSummary,
    systemFeedback: overrides?.systemFeedback ?? createSystemFeedback(consequences, impactSummary),
    queueReviewIds: execution.transition.reviewAllocationIds,
    reviewFlowState: overrides?.reviewFlowState,
  };
}

export function buildReviewResolutionApplication(
  resolution: ReviewFlowResolution,
  followUpExecution?: PlannerCommandExecution,
): PlannerOperationApplication {
  if (!followUpExecution) {
    return {
      consequences: resolution.consequences,
      impactSummary: resolution.impactSummary,
      systemFeedback: resolution.systemFeedback,
      reviewFlowState: resolution.nextState,
    };
  }

  return buildExecutionApplication(followUpExecution, {
    prependConsequences: resolution.consequences,
    impactSummary: resolution.impactSummary,
    systemFeedback: resolution.systemFeedback,
    reviewFlowState: resolution.nextState,
  });
}

export function buildDependencyApplication(
  resolution: DependencyFlowResolution,
): PlannerOperationApplication {
  return {
    nextData: resolution.nextData,
    nextDate: resolution.uiPatch?.nextDate,
    nextSlotId: resolution.uiPatch?.nextSlotId,
    nextWorkId: resolution.uiPatch?.nextWorkId,
    openDetailPanel: resolution.uiPatch?.openDetailPanel,
    slotFeedback: resolution.uiPatch?.slotFeedback ?? null,
    consequences: resolution.consequences,
    impactSummary: resolution.impactSummary,
    systemFeedback: resolution.systemFeedback,
  };
}
