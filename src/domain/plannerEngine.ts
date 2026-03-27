import {
  deriveConsequencesFromTransition,
  getImmediateImpactSummary,
} from "../data/selectors";
import type {
  PlannerCommandContext,
  PlannerCommandExecution,
  PlannerCommandName,
  PlannerCommandPayloadMap,
} from "../types/domain";
import { applyPlannerDerivedState } from "./plannerDerivedState";
import { runPlannerCommand } from "./plannerCommands";

export function executePlannerCommand<K extends PlannerCommandName>(params: {
  command: K;
  context: PlannerCommandContext;
  payload: PlannerCommandPayloadMap[K];
}): PlannerCommandExecution | null {
  const { command, context, payload } = params;

  const draftTransition = runPlannerCommand(command, context, payload);
  if (!draftTransition) {
    return null;
  }

  const transitionDate = draftTransition.uiPatch.nextDate ?? context.selectedDate;
  const nextData = applyPlannerDerivedState(draftTransition.nextData, transitionDate);
  const finalizedTransition = {
    ...draftTransition,
    nextData,
  };

  const consequences = deriveConsequencesFromTransition({
    command,
    beforeData: context.plannerData,
    afterData: nextData,
    referenceDate: context.selectedDate,
    sourceSlotId: finalizedTransition.sourceSlotId,
    targetSlotId: finalizedTransition.targetSlotId,
    reviewAllocationIds: finalizedTransition.reviewAllocationIds,
  });
  const impactSummary = getImmediateImpactSummary({
    command,
    consequences,
    afterData: nextData,
    referenceDate: context.selectedDate,
  });

  return {
    transition: finalizedTransition,
    consequences,
    impactSummary,
  };
}
