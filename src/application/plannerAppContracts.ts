import type {
  PressurePoint,
  ShortHorizonLoadDay,
  TodayDecisionSummary,
  TomorrowPreview,
} from "../data/selectors";
import type { PlannerOperationApplication } from "../domain/plannerOperationApplier";
import type {
  DependencyPolicyAction,
  PlannerIssueInput,
  PlannerIssueUpdateInput,
  PlannerRequestInput,
  PlannerCommandName,
  PlannerCommandPayloadMap,
  PlannerWorkInput,
  PlannerWorkUpdateInput,
  ReviewAction,
  ReviewFlowState,
  ReviewItemView,
  ReviewOption,
} from "../types/domain";
import type { PlannerData } from "../types/planner";

export type PlannerAppOperationKind =
  | PlannerCommandName
  | "create_work"
  | "update_work"
  | "create_issue"
  | "update_issue"
  | "create_request"
  | "resolve_review"
  | "open_dependency"
  | "resolve_dependency"
  | "apply_dependency_policy";

export type PlannerAppQueryKind =
  | "load_remote_snapshot"
  | "get_today_summary"
  | "get_short_horizon"
  | "get_review_items"
  | "get_reschedule_suggestion";

export interface PlannerAppRequestMeta {
  requestId: string;
  issuedAt: string;
}

export interface PlannerAppStateSnapshot {
  plannerData: PlannerData;
  selectedDate: string;
  selectedSlotId: string;
  selectedWorkId: string;
  isDetailPanelOpen: boolean;
  reviewFlowState: ReviewFlowState;
}

export interface PlannerShortHorizonSnapshot {
  load: ShortHorizonLoadDay[];
  pressurePoints: PressurePoint[];
  tomorrow: TomorrowPreview;
}

export interface PlannerAppOperationError {
  code: string;
  message: string;
  operation: PlannerAppOperationKind | PlannerAppQueryKind;
  retryable: boolean;
  context?: {
    targetId?: string;
    detail?: string;
  };
}

export interface ExecutePlannerCommandRequest<K extends PlannerCommandName = PlannerCommandName> {
  meta: PlannerAppRequestMeta;
  state: PlannerAppStateSnapshot;
  command: K;
  payload: PlannerCommandPayloadMap[K];
}

export interface ResolvePlannerReviewRequest {
  meta: PlannerAppRequestMeta;
  state: PlannerAppStateSnapshot;
  allocationId: string;
  action: ReviewAction;
  option?: ReviewOption;
}

export interface OpenPlannerDependencyRequest {
  meta: PlannerAppRequestMeta;
  state: PlannerAppStateSnapshot;
  allocationId: string;
}

export interface ResolvePlannerDependencyRequest {
  meta: PlannerAppRequestMeta;
  state: PlannerAppStateSnapshot;
  dependencyId: string;
}

export interface ApplyDependencyPolicyRequest {
  meta: PlannerAppRequestMeta;
  state: PlannerAppStateSnapshot;
  dependencyId: string;
  action: DependencyPolicyAction;
}

export interface CreatePlannerWorkRequest {
  meta: PlannerAppRequestMeta;
  state: PlannerAppStateSnapshot;
  input: PlannerWorkInput;
}

export interface UpdatePlannerWorkRequest {
  meta: PlannerAppRequestMeta;
  state: PlannerAppStateSnapshot;
  workId: string;
  input: PlannerWorkUpdateInput;
}

export interface CreatePlannerIssueRequest {
  meta: PlannerAppRequestMeta;
  state: PlannerAppStateSnapshot;
  input: PlannerIssueInput;
}

export interface UpdatePlannerIssueRequest {
  meta: PlannerAppRequestMeta;
  state: PlannerAppStateSnapshot;
  issueId: string;
  input: PlannerIssueUpdateInput;
}

export interface CreatePlannerRequestRequest {
  meta: PlannerAppRequestMeta;
  state: PlannerAppStateSnapshot;
  input: PlannerRequestInput;
}

export interface TodaySummaryQueryRequest {
  meta: PlannerAppRequestMeta;
  state: PlannerAppStateSnapshot;
}

export interface ShortHorizonQueryRequest {
  meta: PlannerAppRequestMeta;
  state: PlannerAppStateSnapshot;
  days?: number;
}

export interface ReviewItemsQueryRequest {
  meta: PlannerAppRequestMeta;
  state: PlannerAppStateSnapshot;
}

export interface RescheduleSuggestionQueryRequest {
  meta: PlannerAppRequestMeta;
  state: PlannerAppStateSnapshot;
  allocationId: string;
}

export interface LoadRemoteSnapshotQueryRequest {
  meta: PlannerAppRequestMeta;
  state: PlannerAppStateSnapshot;
}

export interface PlannerRemoteSnapshot {
  plannerData: PlannerData;
  reviewFlowState: ReviewFlowState;
}

export interface PlannerAppOperationSuccess {
  ok: true;
  kind: PlannerAppOperationKind;
  application: PlannerOperationApplication;
  meta: PlannerAppRequestMeta;
}

export interface PlannerAppOperationFailure {
  ok: false;
  kind: PlannerAppOperationKind;
  error: PlannerAppOperationError;
  meta: PlannerAppRequestMeta;
}

export type PlannerAppOperationResponse =
  | PlannerAppOperationSuccess
  | PlannerAppOperationFailure;

export interface PlannerAppQuerySuccess<TData> {
  ok: true;
  kind: PlannerAppQueryKind;
  data: TData;
  meta: PlannerAppRequestMeta;
}

export interface PlannerAppQueryFailure {
  ok: false;
  kind: PlannerAppQueryKind;
  error: PlannerAppOperationError;
  meta: PlannerAppRequestMeta;
}

export type PlannerAppQueryResponse<TData> =
  | PlannerAppQuerySuccess<TData>
  | PlannerAppQueryFailure;
