import type {
  ApplyDependencyPolicyRequest,
  CreatePlannerRequestRequest,
  CreatePlannerWorkRequest,
  ExecutePlannerCommandRequest,
  OpenPlannerDependencyRequest,
  PlannerAppOperationResponse,
  PlannerAppQueryResponse,
  PlannerShortHorizonSnapshot,
  ShortHorizonQueryRequest,
  RescheduleSuggestionQueryRequest,
  ResolvePlannerDependencyRequest,
  ResolvePlannerReviewRequest,
  ReviewItemsQueryRequest,
  TodaySummaryQueryRequest,
} from "./plannerAppContracts";
import type {
  ReviewItemView,
  ReviewOption,
} from "../types/domain";
import type { TodayDecisionSummary } from "../data/selectors";

export interface PlannerAppPort {
  mode: "local" | "remote";
  executeCommand<K extends ExecutePlannerCommandRequest["command"]>(
    request: ExecutePlannerCommandRequest<K>,
  ): Promise<PlannerAppOperationResponse>;
  resolveReview(
    request: ResolvePlannerReviewRequest,
  ): Promise<PlannerAppOperationResponse>;
  openDependency(
    request: OpenPlannerDependencyRequest,
  ): Promise<PlannerAppOperationResponse>;
  resolveDependency(
    request: ResolvePlannerDependencyRequest,
  ): Promise<PlannerAppOperationResponse>;
  applyDependencyPolicy(
    request: ApplyDependencyPolicyRequest,
  ): Promise<PlannerAppOperationResponse>;
  createWork(
    request: CreatePlannerWorkRequest,
  ): Promise<PlannerAppOperationResponse>;
  createRequest(
    request: CreatePlannerRequestRequest,
  ): Promise<PlannerAppOperationResponse>;
  getTodaySummary(
    request: TodaySummaryQueryRequest,
  ): Promise<PlannerAppQueryResponse<TodayDecisionSummary>>;
  getShortHorizon(
    request: ShortHorizonQueryRequest,
  ): Promise<PlannerAppQueryResponse<PlannerShortHorizonSnapshot>>;
  getReviewItems(
    request: ReviewItemsQueryRequest,
  ): Promise<PlannerAppQueryResponse<ReviewItemView[]>>;
  getRescheduleSuggestion(
    request: RescheduleSuggestionQueryRequest,
  ): Promise<PlannerAppQueryResponse<ReviewOption | undefined>>;
}

export type { PlannerAppStateSnapshot } from "./plannerAppContracts";
