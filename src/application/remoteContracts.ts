import type { TodayDecisionSummary } from "../data/selectors";
import type {
  ImmediateImpactSummary,
  PlannerConsequence,
  PlannerIssueInput,
  PlannerIssueUpdateInput,
  PlannerRequestInput,
  PlannerTransitionUiPatch,
  PlannerWorkInput,
  PlannerWorkUpdateInput,
  ReviewFlowState,
  ReviewItemView,
  ReviewOption,
  SystemFeedback,
  DependencyPolicyAction,
} from "../types/domain";
import type { PlannerData } from "../types/planner";
import type { PlannerShortHorizonSnapshot } from "./plannerAppContracts";

export const plannerApiRoutes = {
  getStateSnapshot: () => "/api/planner/state",
  startBlock: (allocationId: string) => `/api/planner/blocks/${allocationId}/actions/start`,
  completeBlock: (allocationId: string) => `/api/planner/blocks/${allocationId}/actions/complete`,
  markBlockPartial: (allocationId: string) => `/api/planner/blocks/${allocationId}/actions/partial`,
  rescheduleBlock: (allocationId: string) => `/api/planner/blocks/${allocationId}/actions/reschedule`,
  pullForwardBlock: (allocationId: string) => `/api/planner/blocks/${allocationId}/actions/pull-forward`,
  confirmDayClosing: (referenceDate: string) => `/api/planner/days/${referenceDate}/actions/confirm-close`,
  autoReplanDay: (referenceDate: string) => `/api/planner/days/${referenceDate}/actions/auto-replan`,
  autoReplanWeek: (referenceDate: string) => `/api/planner/weeks/${referenceDate}/actions/auto-replan`,
  resolveReview: (allocationId: string) => `/api/planner/reviews/${allocationId}/resolution`,
  openDependency: () => "/api/planner/dependencies/open",
  resolveDependency: (dependencyId: string) => `/api/planner/dependencies/${dependencyId}/resolve`,
  applyDependencyPolicy: (dependencyId: string) =>
    `/api/planner/dependencies/${dependencyId}/policy`,
  createWork: () => "/api/planner/works",
  updateWork: (workId: string) => `/api/planner/works/${workId}`,
  createIssue: () => "/api/planner/issues",
  updateIssue: (issueId: string) => `/api/planner/issues/${issueId}`,
  createRequest: () => "/api/planner/requests",
  getDaySummary: (referenceDate: string) => `/api/planner/days/${referenceDate}/summary`,
  getShortHorizon: () => "/api/planner/horizon",
  getReviewItems: () => "/api/planner/reviews",
  getRescheduleSuggestion: (allocationId: string) =>
    `/api/planner/reviews/${allocationId}/suggestion`,
  getNextFocus: (referenceDate: string) => `/api/planner/days/${referenceDate}/next-focus`,
} as const;

export interface RemoteRequestMeta {
  requestId: string;
  issuedAt: string;
}

export interface RemoteOperationContext {
  referenceDate: string;
  selectedSlotId?: string;
  selectedWorkId?: string;
}

export interface RemotePlannerOperationResult {
  nextData: PlannerData;
  uiPatch?: PlannerTransitionUiPatch;
  consequences: PlannerConsequence[];
  impactSummary: ImmediateImpactSummary;
  systemFeedback: SystemFeedback;
  reviewFlowState?: ReviewFlowState;
}

export interface RemoteApiSuccess<TData> {
  ok: true;
  meta: RemoteRequestMeta;
  data: TData;
}

export interface RemoteApiError {
  ok: false;
  meta: RemoteRequestMeta;
  error: {
    code:
      | "validation_failed"
      | "domain_conflict"
      | "invalid_state"
      | "not_found"
      | "temporarily_unavailable"
      | "internal_error";
    message: string;
    operation: string;
    retryable: boolean;
    context?: {
      targetId?: string;
      detail?: string;
      field?: string;
    };
  };
}

export type RemoteApiResponse<TData> = RemoteApiSuccess<TData> | RemoteApiError;

export interface StartBlockHttpRequest {
  context: RemoteOperationContext;
}

export interface CompleteBlockHttpRequest {
  context: RemoteOperationContext;
}

export interface MarkBlockPartialHttpRequest {
  context: RemoteOperationContext;
}

export interface RescheduleBlockHttpRequest {
  context: RemoteOperationContext;
  targetDate?: string;
  targetSlotId?: string;
  reason?: string;
}

export interface PullForwardBlockHttpRequest {
  context: RemoteOperationContext;
  slotId: string;
}

export interface ConfirmDayClosingHttpRequest {
  context: RemoteOperationContext;
}

export interface AutoReplanDayHttpRequest {
  context: RemoteOperationContext;
}

export interface AutoReplanWeekHttpRequest {
  context: RemoteOperationContext;
}

export interface ResolveReviewHttpRequest {
  context: RemoteOperationContext;
  action: "accept" | "defer" | "ignore";
  option?: Pick<ReviewOption, "id" | "date" | "slotId">;
}

export interface OpenDependencyHttpRequest {
  context: RemoteOperationContext;
  allocationId: string;
}

export interface ResolveDependencyHttpRequest {
  context: RemoteOperationContext;
}

export interface ApplyDependencyPolicyHttpRequest {
  context: RemoteOperationContext;
  action: DependencyPolicyAction;
}

export interface CreateWorkHttpRequest {
  context: RemoteOperationContext;
  input: PlannerWorkInput;
}

export interface UpdateWorkHttpRequest {
  context: RemoteOperationContext;
  input: PlannerWorkUpdateInput;
}

export interface CreateIssueHttpRequest {
  context: RemoteOperationContext;
  input: PlannerIssueInput;
}

export interface UpdateIssueHttpRequest {
  context: RemoteOperationContext;
  input: PlannerIssueUpdateInput;
}

export interface CreateRequestHttpRequest {
  context: RemoteOperationContext;
  input: PlannerRequestInput;
}

export interface DaySummaryHttpResponse {
  summary: TodayDecisionSummary;
}

export interface RemoteSnapshotHttpResponse {
  plannerData: PlannerData;
  reviewFlowState: ReviewFlowState;
}

export interface ShortHorizonHttpResponse {
  snapshot: PlannerShortHorizonSnapshot;
}

export interface ReviewItemsHttpResponse {
  items: ReviewItemView[];
}

export interface RescheduleSuggestionHttpResponse {
  suggestion?: ReviewOption;
}
