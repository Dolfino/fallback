import {
  getShortHorizonLoad,
  getTodayDecisionSummary,
  getTomorrowPreview,
  getUpcomingPressurePoints,
} from "../data/selectors";
import { executePlannerCommand } from "../domain/plannerEngine";
import {
  applyDependencyPolicy as applyDependencyPolicyFlow,
  openPlannerDependency,
  resolvePlannerDependency,
} from "../domain/plannerDependencyFlow";
import {
  buildDependencyApplication,
  buildExecutionApplication,
  buildReviewResolutionApplication,
  type PlannerOperationApplication,
} from "../domain/plannerOperationApplier";
import {
  buildReviewItems,
  getSuggestedReviewOption,
  resolveReviewAction,
} from "../domain/plannerReviewFlow";
import {
  createPlannerRequest,
  createPlannerWork,
} from "../domain/plannerIntake";
import type {
  CreatePlannerRequestRequest,
  CreatePlannerWorkRequest,
  ExecutePlannerCommandRequest,
  PlannerAppOperationError,
  PlannerAppOperationKind,
  PlannerAppOperationResponse,
  PlannerAppQueryKind,
  PlannerAppQueryResponse,
  PlannerAppRequestMeta,
  PlannerAppStateSnapshot,
  PlannerShortHorizonSnapshot,
  ResolvePlannerReviewRequest,
} from "./plannerAppContracts";
import type { PlannerAppPort } from "./plannerAppPort";

function toCommandContext(state: PlannerAppStateSnapshot) {
  return {
    plannerData: state.plannerData,
    selectedDate: state.selectedDate,
    selectedSlotId: state.selectedSlotId,
    selectedWorkId: state.selectedWorkId,
    isDetailPanelOpen: state.isDetailPanelOpen,
  };
}

function createOperationError(params: {
  meta: PlannerAppRequestMeta;
  operation: PlannerAppOperationKind;
  code: string;
  message: string;
  retryable?: boolean;
  targetId?: string;
  detail?: string;
}): PlannerAppOperationResponse {
  const error: PlannerAppOperationError = {
    code: params.code,
    message: params.message,
    operation: params.operation,
    retryable: params.retryable ?? true,
    context: {
      targetId: params.targetId,
      detail: params.detail,
    },
  };

  return {
    ok: false,
    kind: params.operation,
    error,
    meta: params.meta,
  };
}

function createOperationSuccess(params: {
  meta: PlannerAppRequestMeta;
  operation: PlannerAppOperationKind;
  application: PlannerOperationApplication;
}) {
  return {
    ok: true as const,
    kind: params.operation,
    application: params.application,
    meta: params.meta,
  };
}

function createQuerySuccess<TData>(params: {
  meta: PlannerAppRequestMeta;
  kind: PlannerAppQueryKind;
  data: TData;
}): PlannerAppQueryResponse<TData> {
  return {
    ok: true,
    kind: params.kind,
    data: params.data,
    meta: params.meta,
  };
}

async function executeLocalCommand(
  request: ExecutePlannerCommandRequest,
): Promise<PlannerAppOperationResponse> {
  const execution = executePlannerCommand({
    command: request.command,
    context: toCommandContext(request.state),
    payload: request.payload,
  });

  if (!execution) {
    return createOperationError({
      meta: request.meta,
      operation: request.command,
      code: "command_rejected",
      message: "A operação não gerou transição aplicável.",
      targetId: "allocationId" in request.payload ? request.payload.allocationId : undefined,
    });
  }

  return createOperationSuccess({
    meta: request.meta,
    operation: request.command,
    application: buildExecutionApplication(execution),
  });
}

async function resolveLocalReview(
  request: ResolvePlannerReviewRequest,
): Promise<PlannerAppOperationResponse> {
  const resolution = resolveReviewAction({
    data: request.state.plannerData,
    referenceDate: request.state.selectedDate,
    state: request.state.reviewFlowState,
    allocationId: request.allocationId,
    action: request.action,
    option: request.option,
  });

  if (!resolution) {
    return createOperationError({
      meta: request.meta,
      operation: "resolve_review",
      code: "review_not_available",
      message: "A revisão não está mais disponível para este item.",
      targetId: request.allocationId,
    });
  }

  const followUpExecution = resolution.followUpCommand
    ? executePlannerCommand({
        command: resolution.followUpCommand.command,
        context: toCommandContext(request.state),
        payload: resolution.followUpCommand.payload,
      })
    : undefined;

  return createOperationSuccess({
    meta: request.meta,
    operation: "resolve_review",
    application: buildReviewResolutionApplication(
      resolution,
      followUpExecution ?? undefined,
    ),
  });
}

export function createPlannerLocalAdapter(): PlannerAppPort {
  return {
    mode: "local",
    executeCommand(request) {
      return executeLocalCommand(request);
    },

    resolveReview(request) {
      return resolveLocalReview(request);
    },

    async openDependency(request) {
      const resolution = openPlannerDependency({
        data: request.state.plannerData,
        referenceDate: request.state.selectedDate,
        allocationId: request.allocationId,
      });

      if (!resolution) {
        return createOperationError({
          meta: request.meta,
          operation: "open_dependency",
          code: "dependency_open_failed",
          message: "Não foi possível abrir o bloqueio para este bloco.",
          targetId: request.allocationId,
        });
      }

      return createOperationSuccess({
        meta: request.meta,
        operation: "open_dependency",
        application: buildDependencyApplication(resolution),
      });
    },

    async resolveDependency(request) {
      const resolution = resolvePlannerDependency({
        data: request.state.plannerData,
        referenceDate: request.state.selectedDate,
        dependencyId: request.dependencyId,
      });

      if (!resolution) {
        return createOperationError({
          meta: request.meta,
          operation: "resolve_dependency",
          code: "dependency_not_found",
          message: "A dependência não está mais disponível para resolução.",
          targetId: request.dependencyId,
        });
      }

      return createOperationSuccess({
        meta: request.meta,
        operation: "resolve_dependency",
        application: buildDependencyApplication(resolution),
      });
    },

    async applyDependencyPolicy(request) {
      const resolution = applyDependencyPolicyFlow({
        data: request.state.plannerData,
        referenceDate: request.state.selectedDate,
        dependencyId: request.dependencyId,
        action: request.action,
      });

      if (!resolution) {
        return createOperationError({
          meta: request.meta,
          operation: "apply_dependency_policy",
          code: "dependency_policy_unavailable",
          message: "A política não pôde ser aplicada a esta dependência.",
          targetId: request.dependencyId,
        });
      }

      return createOperationSuccess({
        meta: request.meta,
        operation: "apply_dependency_policy",
        application: buildDependencyApplication(resolution),
      });
    },

    async createWork(request: CreatePlannerWorkRequest) {
      const resolution = createPlannerWork({
        data: request.state.plannerData,
        referenceDate: request.state.selectedDate,
        input: request.input,
      });

      return createOperationSuccess({
        meta: request.meta,
        operation: "create_work",
        application: buildDependencyApplication(resolution),
      });
    },

    async createRequest(request: CreatePlannerRequestRequest) {
      const resolution = createPlannerRequest({
        data: request.state.plannerData,
        input: request.input,
      });

      return createOperationSuccess({
        meta: request.meta,
        operation: "create_request",
        application: buildDependencyApplication(resolution),
      });
    },

    async getTodaySummary(request) {
      return createQuerySuccess({
        meta: request.meta,
        kind: "get_today_summary",
        data: getTodayDecisionSummary(request.state.plannerData, request.state.selectedDate),
      });
    },

    async getShortHorizon(request) {
      const days = request.days ?? 3;
      const data: PlannerShortHorizonSnapshot = {
        load: getShortHorizonLoad(request.state.plannerData, request.state.selectedDate, days),
        pressurePoints: getUpcomingPressurePoints(
          request.state.plannerData,
          request.state.selectedDate,
          Math.max(4, days * 2),
        ),
        tomorrow: getTomorrowPreview(request.state.plannerData, request.state.selectedDate),
      };

      return createQuerySuccess({
        meta: request.meta,
        kind: "get_short_horizon",
        data,
      });
    },

    async getReviewItems(request) {
      return createQuerySuccess({
        meta: request.meta,
        kind: "get_review_items",
        data: buildReviewItems({
          data: request.state.plannerData,
          referenceDate: request.state.selectedDate,
          state: request.state.reviewFlowState,
        }),
      });
    },

    async getRescheduleSuggestion(request) {
      return createQuerySuccess({
        meta: request.meta,
        kind: "get_reschedule_suggestion",
        data: getSuggestedReviewOption(
          request.state.plannerData,
          request.state.selectedDate,
          request.allocationId,
        ),
      });
    },
  };
}
