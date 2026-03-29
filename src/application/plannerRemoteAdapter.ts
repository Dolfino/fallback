import type {
  ApplyDependencyPolicyRequest,
  CreatePlannerIssueRequest,
  CreatePlannerRequestRequest,
  CreatePlannerWorkRequest,
  ExecutePlannerCommandRequest,
  PlannerAppOperationError,
  PlannerAppOperationKind,
  PlannerAppOperationResponse,
  PlannerAppQueryKind,
  PlannerAppQueryResponse,
  PlannerRemoteSnapshot,
  PlannerShortHorizonSnapshot,
  LoadRemoteSnapshotQueryRequest,
  ResolvePlannerReviewRequest,
  ReviewItemsQueryRequest,
  TodaySummaryQueryRequest,
  RescheduleSuggestionQueryRequest,
  OpenPlannerDependencyRequest,
  ResolvePlannerDependencyRequest,
  UpdatePlannerIssueRequest,
  UpdatePlannerWorkRequest,
} from "./plannerAppContracts";
import type { PlannerAppPort } from "./plannerAppPort";
import { createRemoteClient, type RemoteClientFailure } from "./remoteClient";
import {
  plannerApiRoutes,
  type ApplyDependencyPolicyHttpRequest,
  type AutoReplanDayHttpRequest,
  type AutoReplanWeekHttpRequest,
  type CompleteBlockHttpRequest,
  type ConfirmDayClosingHttpRequest,
  type CreateIssueHttpRequest,
  type CreateRequestHttpRequest,
  type CreateWorkHttpRequest,
  type DaySummaryHttpResponse,
  type MarkBlockPartialHttpRequest,
  type OpenDependencyHttpRequest,
  type PullForwardBlockHttpRequest,
  type RemoteOperationContext,
  type RemotePlannerOperationResult,
  type RemoteSnapshotHttpResponse,
  type RescheduleBlockHttpRequest,
  type ResolveDependencyHttpRequest,
  type ResolveReviewHttpRequest,
  type RescheduleSuggestionHttpResponse,
  type ReviewItemsHttpResponse,
  type ShortHorizonHttpResponse,
  type StartBlockHttpRequest,
  type UpdateIssueHttpRequest,
  type UpdateWorkHttpRequest,
} from "./remoteContracts";
import type {
  PlannerOperationApplication,
} from "../domain/plannerOperationApplier";
import type { TodayDecisionSummary } from "../data/selectors";
import type { PlannerCommandPayloadMap, ReviewItemView, ReviewOption } from "../types/domain";

export interface PlannerRemoteAdapterConfig {
  baseUrl?: string;
  timeoutMs?: number;
}

function toRemoteContext(request: {
  state: {
    selectedDate: string;
    selectedSlotId: string;
    selectedWorkId: string;
  };
}): RemoteOperationContext {
  return {
    referenceDate: request.state.selectedDate,
    selectedSlotId: request.state.selectedSlotId,
    selectedWorkId: request.state.selectedWorkId,
  };
}

function mapRemoteFailure(
  failure: RemoteClientFailure,
  kind: PlannerAppOperationKind | PlannerAppQueryKind,
): PlannerAppOperationError {
  return {
    code: failure.error.code,
    message: failure.error.message,
    operation: kind,
    retryable: failure.error.retryable,
    context: {
      targetId: failure.error.context?.targetId,
      detail:
        failure.error.context?.detail ??
        (failure.status ? `HTTP ${failure.status}` : undefined),
    },
  };
}

function toOperationApplication(
  result: RemotePlannerOperationResult,
): PlannerOperationApplication {
  return {
    nextData: result.nextData,
    nextDate: result.uiPatch?.nextDate,
    nextSlotId: result.uiPatch?.nextSlotId,
    nextWorkId: result.uiPatch?.nextWorkId,
    openDetailPanel: result.uiPatch?.openDetailPanel,
    slotFeedback: result.uiPatch?.slotFeedback ?? null,
    consequences: result.consequences,
    impactSummary: result.impactSummary,
    systemFeedback: result.systemFeedback,
    reviewFlowState: result.reviewFlowState,
  };
}

function toOperationSuccess(
  kind: PlannerAppOperationKind,
  requestMeta: { requestId: string; issuedAt: string },
  result: RemotePlannerOperationResult,
): PlannerAppOperationResponse {
  return {
    ok: true,
    kind,
    meta: requestMeta,
    application: toOperationApplication(result),
  };
}

function toOperationFailure(
  kind: PlannerAppOperationKind,
  requestMeta: { requestId: string; issuedAt: string },
  failure: RemoteClientFailure,
): PlannerAppOperationResponse {
  return {
    ok: false,
    kind,
    meta: requestMeta,
    error: mapRemoteFailure(failure, kind),
  };
}

function toQuerySuccess<TData>(
  kind: PlannerAppQueryKind,
  requestMeta: { requestId: string; issuedAt: string },
  data: TData,
): PlannerAppQueryResponse<TData> {
  return {
    ok: true,
    kind,
    meta: requestMeta,
    data,
  };
}

function toQueryFailure<TData>(
  kind: PlannerAppQueryKind,
  requestMeta: { requestId: string; issuedAt: string },
  failure: RemoteClientFailure,
): PlannerAppQueryResponse<TData> {
  return {
    ok: false,
    kind,
    meta: requestMeta,
    error: mapRemoteFailure(failure, kind),
  };
}

export function createPlannerRemoteAdapter(
  config: PlannerRemoteAdapterConfig = {},
): PlannerAppPort {
  const client = createRemoteClient({
    baseUrl: config.baseUrl,
    defaultTimeoutMs: config.timeoutMs,
  });

  return {
    mode: "remote",
    async loadRemoteSnapshot(
      request: LoadRemoteSnapshotQueryRequest,
    ): Promise<PlannerAppQueryResponse<PlannerRemoteSnapshot>> {
      const response = await client.request<RemoteSnapshotHttpResponse>({
        path: plannerApiRoutes.getStateSnapshot(),
        method: "GET",
      });

      return response.ok
        ? toQuerySuccess("load_remote_snapshot", request.meta, response.data)
        : toQueryFailure("load_remote_snapshot", request.meta, response);
    },
    async executeCommand<K extends ExecutePlannerCommandRequest["command"]>(
      request: ExecutePlannerCommandRequest<K>,
    ): Promise<PlannerAppOperationResponse> {
      switch (request.command) {
        case "start_block": {
          const payload = request.payload as PlannerCommandPayloadMap["start_block"];
          const body: StartBlockHttpRequest = {
            context: toRemoteContext(request),
          };
          const response = await client.request<RemotePlannerOperationResult>({
            path: plannerApiRoutes.startBlock(payload.allocationId),
            method: "POST",
            body,
          });
          return response.ok
            ? toOperationSuccess("start_block", request.meta, response.data)
            : toOperationFailure("start_block", request.meta, response);
        }
        case "complete_block": {
          const payload = request.payload as PlannerCommandPayloadMap["complete_block"];
          const body: CompleteBlockHttpRequest = {
            context: toRemoteContext(request),
          };
          const response = await client.request<RemotePlannerOperationResult>({
            path: plannerApiRoutes.completeBlock(payload.allocationId),
            method: "POST",
            body,
          });
          return response.ok
            ? toOperationSuccess("complete_block", request.meta, response.data)
            : toOperationFailure("complete_block", request.meta, response);
        }
        case "mark_block_partial": {
          const payload = request.payload as PlannerCommandPayloadMap["mark_block_partial"];
          const body: MarkBlockPartialHttpRequest = {
            context: toRemoteContext(request),
          };
          const response = await client.request<RemotePlannerOperationResult>({
            path: plannerApiRoutes.markBlockPartial(payload.allocationId),
            method: "POST",
            body,
          });
          return response.ok
            ? toOperationSuccess("mark_block_partial", request.meta, response.data)
            : toOperationFailure("mark_block_partial", request.meta, response);
        }
        case "reschedule_block": {
          const payload = request.payload as PlannerCommandPayloadMap["reschedule_block"];
          const body: RescheduleBlockHttpRequest = {
            context: toRemoteContext(request),
            targetDate: payload.targetDate,
            targetSlotId: payload.targetSlotId,
            reason: payload.reason,
          };
          const response = await client.request<RemotePlannerOperationResult>({
            path: plannerApiRoutes.rescheduleBlock(payload.allocationId),
            method: "POST",
            body,
          });
          return response.ok
            ? toOperationSuccess("reschedule_block", request.meta, response.data)
            : toOperationFailure("reschedule_block", request.meta, response);
        }
        case "pull_forward_block": {
          const payload = request.payload as PlannerCommandPayloadMap["pull_forward_block"];
          const body: PullForwardBlockHttpRequest = {
            context: toRemoteContext(request),
            slotId: payload.slotId,
          };
          const response = await client.request<RemotePlannerOperationResult>({
            path: plannerApiRoutes.pullForwardBlock(payload.allocationId),
            method: "POST",
            body,
          });
          return response.ok
            ? toOperationSuccess("pull_forward_block", request.meta, response.data)
            : toOperationFailure("pull_forward_block", request.meta, response);
        }
        case "confirm_day_closing": {
          const body: ConfirmDayClosingHttpRequest = {
            context: toRemoteContext(request),
          };
          const response = await client.request<RemotePlannerOperationResult>({
            path: plannerApiRoutes.confirmDayClosing(request.state.selectedDate),
            method: "POST",
            body,
          });
          return response.ok
            ? toOperationSuccess("confirm_day_closing", request.meta, response.data)
            : toOperationFailure("confirm_day_closing", request.meta, response);
        }
        case "auto_replan_day": {
          const body: AutoReplanDayHttpRequest = {
            context: toRemoteContext(request),
          };
          const response = await client.request<RemotePlannerOperationResult>({
            path: plannerApiRoutes.autoReplanDay(request.state.selectedDate),
            method: "POST",
            body,
          });
          return response.ok
            ? toOperationSuccess("auto_replan_day", request.meta, response.data)
            : toOperationFailure("auto_replan_day", request.meta, response);
        }
        case "auto_replan_week": {
          const body: AutoReplanWeekHttpRequest = {
            context: toRemoteContext(request),
          };
          const response = await client.request<RemotePlannerOperationResult>({
            path: plannerApiRoutes.autoReplanWeek(request.state.selectedDate),
            method: "POST",
            body,
          });
          return response.ok
            ? toOperationSuccess("auto_replan_week", request.meta, response.data)
            : toOperationFailure("auto_replan_week", request.meta, response);
        }
        case "select_next_focus": {
          const response = await client.request<RemotePlannerOperationResult>({
            path: plannerApiRoutes.getNextFocus(request.state.selectedDate),
            method: "GET",
          });
          return response.ok
            ? toOperationSuccess("select_next_focus", request.meta, response.data)
            : toOperationFailure("select_next_focus", request.meta, response);
        }
        case "block_allocation": {
          const payload = request.payload as PlannerCommandPayloadMap["block_allocation"];
          const body: OpenDependencyHttpRequest = {
            context: toRemoteContext(request),
            allocationId: payload.allocationId,
          };
          const response = await client.request<RemotePlannerOperationResult>({
            path: plannerApiRoutes.openDependency(),
            method: "POST",
            body,
          });
          return response.ok
            ? toOperationSuccess("block_allocation", request.meta, response.data)
            : toOperationFailure("block_allocation", request.meta, response);
        }
        case "toggle_detail_panel":
          {
            const payload = request.payload as PlannerCommandPayloadMap["toggle_detail_panel"];
          return {
            ok: true,
            kind: "toggle_detail_panel",
            meta: request.meta,
            application: {
              nextDate: request.state.selectedDate,
              nextSlotId: request.state.selectedSlotId,
              nextWorkId: request.state.selectedWorkId,
              openDetailPanel: payload.nextOpen,
              slotFeedback: null,
              consequences: [],
              impactSummary: {
                headline: "Painel lateral alternado",
                details: [
                  payload.nextOpen
                    ? "Painel contextual reaberto."
                    : "Painel contextual recolhido.",
                ],
              },
              systemFeedback: {
                title: "Painel lateral alternado",
                detail: payload.nextOpen
                  ? "Painel contextual reaberto."
                  : "Painel contextual recolhido.",
                tone: "neutral",
              },
            },
          };
          }
      }
    },

    async resolveReview(
      request: ResolvePlannerReviewRequest,
    ): Promise<PlannerAppOperationResponse> {
      const body: ResolveReviewHttpRequest = {
        context: toRemoteContext(request),
        action: request.action,
        option: request.option
          ? {
              id: request.option.id,
              date: request.option.date,
              slotId: request.option.slotId,
            }
          : undefined,
      };
      const response = await client.request<RemotePlannerOperationResult>({
        path: plannerApiRoutes.resolveReview(request.allocationId),
        method: "POST",
        body,
      });

      return response.ok
        ? toOperationSuccess("resolve_review", request.meta, response.data)
        : toOperationFailure("resolve_review", request.meta, response);
    },

    async createWork(
      request: CreatePlannerWorkRequest,
    ): Promise<PlannerAppOperationResponse> {
      const body: CreateWorkHttpRequest = {
        context: toRemoteContext(request),
        input: request.input,
      };
      const response = await client.request<RemotePlannerOperationResult>({
        path: plannerApiRoutes.createWork(),
        method: "POST",
        body,
      });

      return response.ok
        ? toOperationSuccess("create_work", request.meta, response.data)
        : toOperationFailure("create_work", request.meta, response);
    },

    async updateWork(
      request: UpdatePlannerWorkRequest,
    ): Promise<PlannerAppOperationResponse> {
      const body: UpdateWorkHttpRequest = {
        context: toRemoteContext(request),
        input: request.input,
      };
      const response = await client.request<RemotePlannerOperationResult>({
        path: plannerApiRoutes.updateWork(request.workId),
        method: "PATCH",
        body,
      });

      return response.ok
        ? toOperationSuccess("update_work", request.meta, response.data)
        : toOperationFailure("update_work", request.meta, response);
    },

    async createIssue(
      request: CreatePlannerIssueRequest,
    ): Promise<PlannerAppOperationResponse> {
      const body: CreateIssueHttpRequest = {
        context: toRemoteContext(request),
        input: request.input,
      };
      const response = await client.request<RemotePlannerOperationResult>({
        path: plannerApiRoutes.createIssue(),
        method: "POST",
        body,
      });

      return response.ok
        ? toOperationSuccess("create_issue", request.meta, response.data)
        : toOperationFailure("create_issue", request.meta, response);
    },

    async updateIssue(
      request: UpdatePlannerIssueRequest,
    ): Promise<PlannerAppOperationResponse> {
      const body: UpdateIssueHttpRequest = {
        context: toRemoteContext(request),
        input: request.input,
      };
      const response = await client.request<RemotePlannerOperationResult>({
        path: plannerApiRoutes.updateIssue(request.issueId),
        method: "PATCH",
        body,
      });

      return response.ok
        ? toOperationSuccess("update_issue", request.meta, response.data)
        : toOperationFailure("update_issue", request.meta, response);
    },

    async createRequest(
      request: CreatePlannerRequestRequest,
    ): Promise<PlannerAppOperationResponse> {
      const body: CreateRequestHttpRequest = {
        context: toRemoteContext(request),
        input: request.input,
      };
      const response = await client.request<RemotePlannerOperationResult>({
        path: plannerApiRoutes.createRequest(),
        method: "POST",
        body,
      });

      return response.ok
        ? toOperationSuccess("create_request", request.meta, response.data)
        : toOperationFailure("create_request", request.meta, response);
    },

    async openDependency(
      request: OpenPlannerDependencyRequest,
    ): Promise<PlannerAppOperationResponse> {
      const body: OpenDependencyHttpRequest = {
        context: toRemoteContext(request),
        allocationId: request.allocationId,
      };
      const response = await client.request<RemotePlannerOperationResult>({
        path: plannerApiRoutes.openDependency(),
        method: "POST",
        body,
      });

      return response.ok
        ? toOperationSuccess("open_dependency", request.meta, response.data)
        : toOperationFailure("open_dependency", request.meta, response);
    },

    async resolveDependency(
      request: ResolvePlannerDependencyRequest,
    ): Promise<PlannerAppOperationResponse> {
      const body: ResolveDependencyHttpRequest = {
        context: toRemoteContext(request),
      };
      const response = await client.request<RemotePlannerOperationResult>({
        path: plannerApiRoutes.resolveDependency(request.dependencyId),
        method: "POST",
        body,
      });

      return response.ok
        ? toOperationSuccess("resolve_dependency", request.meta, response.data)
        : toOperationFailure("resolve_dependency", request.meta, response);
    },

    async applyDependencyPolicy(
      request: ApplyDependencyPolicyRequest,
    ): Promise<PlannerAppOperationResponse> {
      const body: ApplyDependencyPolicyHttpRequest = {
        context: toRemoteContext(request),
        action: request.action,
      };
      const response = await client.request<RemotePlannerOperationResult>({
        path: plannerApiRoutes.applyDependencyPolicy(request.dependencyId),
        method: "POST",
        body,
      });

      return response.ok
        ? toOperationSuccess("apply_dependency_policy", request.meta, response.data)
        : toOperationFailure("apply_dependency_policy", request.meta, response);
    },

    async getTodaySummary(
      request: TodaySummaryQueryRequest,
    ): Promise<PlannerAppQueryResponse<TodayDecisionSummary>> {
      const response = await client.request<DaySummaryHttpResponse>({
        path: plannerApiRoutes.getDaySummary(request.state.selectedDate),
        method: "GET",
        query: {
          selectedSlotId: request.state.selectedSlotId,
          selectedWorkId: request.state.selectedWorkId,
        },
      });

      return response.ok
        ? toQuerySuccess("get_today_summary", request.meta, response.data.summary)
        : toQueryFailure("get_today_summary", request.meta, response);
    },

    async getShortHorizon(
      request,
    ): Promise<PlannerAppQueryResponse<PlannerShortHorizonSnapshot>> {
      const response = await client.request<ShortHorizonHttpResponse>({
        path: plannerApiRoutes.getShortHorizon(),
        method: "GET",
        query: {
          referenceDate: request.state.selectedDate,
          days: request.days ?? 3,
        },
      });

      return response.ok
        ? toQuerySuccess("get_short_horizon", request.meta, response.data.snapshot)
        : toQueryFailure("get_short_horizon", request.meta, response);
    },

    async getReviewItems(
      request: ReviewItemsQueryRequest,
    ): Promise<PlannerAppQueryResponse<ReviewItemView[]>> {
      const response = await client.request<ReviewItemsHttpResponse>({
        path: plannerApiRoutes.getReviewItems(),
        method: "GET",
        query: {
          referenceDate: request.state.selectedDate,
        },
      });

      return response.ok
        ? toQuerySuccess("get_review_items", request.meta, response.data.items)
        : toQueryFailure("get_review_items", request.meta, response);
    },

    async getRescheduleSuggestion(
      request: RescheduleSuggestionQueryRequest,
    ): Promise<PlannerAppQueryResponse<ReviewOption | undefined>> {
      const response = await client.request<RescheduleSuggestionHttpResponse>({
        path: plannerApiRoutes.getRescheduleSuggestion(request.allocationId),
        method: "GET",
        query: {
          referenceDate: request.state.selectedDate,
        },
      });

      return response.ok
        ? toQuerySuccess(
            "get_reschedule_suggestion",
            request.meta,
            response.data.suggestion,
          )
        : toQueryFailure("get_reschedule_suggestion", request.meta, response);
    },
  };
}
