import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import {
  getShortHorizonLoad,
  getTodayDecisionSummary,
  getTomorrowPreview,
  getUpcomingPressurePoints,
} from "../../../src/data/selectors";
import {
  applyDependencyPolicy as applyPlannerDependencyPolicy,
  openPlannerDependency,
  resolvePlannerDependency,
} from "../../../src/domain/plannerDependencyFlow";
import { executePlannerCommand } from "../../../src/domain/plannerEngine";
import {
  createPlannerRequest,
  createPlannerWork,
} from "../../../src/domain/plannerIntake";
import {
  buildExecutionApplication,
  buildReviewResolutionApplication,
  createSystemFeedback,
  type PlannerOperationApplication,
} from "../../../src/domain/plannerOperationApplier";
import {
  buildReviewItems,
  getSuggestedReviewOption,
  queueReviewItems,
  resolveReviewAction,
} from "../../../src/domain/plannerReviewFlow";
import type {
  ApplyDependencyPolicyHttpRequest,
  AutoReplanDayHttpRequest,
  AutoReplanWeekHttpRequest,
  CompleteBlockHttpRequest,
  ConfirmDayClosingHttpRequest,
  CreateRequestHttpRequest,
  CreateWorkHttpRequest,
  DaySummaryHttpResponse,
  MarkBlockPartialHttpRequest,
  OpenDependencyHttpRequest,
  PullForwardBlockHttpRequest,
  RemoteApiSuccess,
  RemotePlannerOperationResult,
  RescheduleBlockHttpRequest,
  RescheduleSuggestionHttpResponse,
  ResolveDependencyHttpRequest,
  ResolveReviewHttpRequest,
  ReviewItemsHttpResponse,
  ShortHorizonHttpResponse,
  StartBlockHttpRequest,
} from "../../../src/application/remoteContracts";
import type {
  PlannerCommandContext,
  ReviewAction,
} from "../../../src/types/domain";
import type { PlannerData } from "../../../src/types/planner";
import { ApiError } from "../errors/apiError";
import { PlannerStore } from "../state/plannerStore";

function createMeta(requestId: string) {
  return {
    requestId,
    issuedAt: new Date().toISOString(),
  };
}

function createSuccess<TData>(requestId: string, data: TData): RemoteApiSuccess<TData> {
  return {
    ok: true,
    meta: createMeta(requestId),
    data,
  };
}

function resolveReferenceDate(
  data: PlannerData,
  candidate: string | undefined,
  operation: string,
  field = "referenceDate",
) {
  if (!candidate) {
    return data.dataOperacional;
  }

  if (data.diasSemana.includes(candidate)) {
    return candidate;
  }

  throw new ApiError({
    statusCode: 400,
    code: "validation_failed",
    message: `A data ${candidate} está fora da semana operacional disponível.`,
    operation,
    context: {
      field,
      detail: `Valores aceitos nesta semana: ${data.diasSemana.join(", ")}.`,
    },
  });
}

function buildCommandContext(params: {
  data: PlannerData;
  referenceDate: string;
  allocationId: string;
  selectedSlotId?: string;
  selectedWorkId?: string;
}): PlannerCommandContext {
  const allocation = params.data.alocacoes.find((item) => item.id === params.allocationId);
  if (!allocation) {
    throw new ApiError({
      statusCode: 404,
      code: "not_found",
      message: "Alocação não encontrada.",
      operation: "complete_block",
      context: {
        targetId: params.allocationId,
      },
    });
  }

  const block = params.data.blocos.find((item) => item.id === allocation.blocoId);

  return {
    plannerData: params.data,
    selectedDate: params.referenceDate,
    selectedSlotId: params.selectedSlotId ?? allocation.slotId,
    selectedWorkId: params.selectedWorkId ?? block?.trabalhoId ?? "",
    isDetailPanelOpen: true,
  };
}

function buildPlannerBaseContext(params: {
  data: PlannerData;
  referenceDate: string;
  selectedSlotId?: string;
  selectedWorkId?: string;
  isDetailPanelOpen?: boolean;
}): PlannerCommandContext {
  return {
    plannerData: params.data,
    selectedDate: params.referenceDate,
    selectedSlotId: params.selectedSlotId ?? "",
    selectedWorkId: params.selectedWorkId ?? "",
    isDetailPanelOpen: params.isDetailPanelOpen ?? true,
  };
}

function buildOperationResult(data: RemotePlannerOperationResult) {
  return data;
}

function fromApplicationToRemoteResult(
  application: PlannerOperationApplication,
  fallbackData: PlannerData,
): RemotePlannerOperationResult {
  return {
    nextData: application.nextData ?? fallbackData,
    uiPatch:
      application.nextDate ||
      application.nextSlotId ||
      application.nextWorkId ||
      typeof application.openDetailPanel === "boolean" ||
      application.slotFeedback !== undefined
        ? {
            nextDate: application.nextDate,
            nextSlotId: application.nextSlotId,
            nextWorkId: application.nextWorkId,
            openDetailPanel: application.openDetailPanel,
            slotFeedback: application.slotFeedback ?? null,
          }
        : undefined,
    consequences: application.consequences,
    impactSummary: application.impactSummary,
    systemFeedback: application.systemFeedback,
    reviewFlowState: application.reviewFlowState,
  };
}

function parseQueryValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function getQueryRecord(request: FastifyRequest) {
  return (request.query ?? {}) as Record<string, unknown>;
}

function readContextBody<TBody extends { context?: { referenceDate?: string; selectedSlotId?: string; selectedWorkId?: string } }>(
  request: FastifyRequest,
) {
  return (request.body ?? {}) as TBody;
}

function resolveAction(value: unknown): ReviewAction | undefined {
  return value === "accept" || value === "defer" || value === "ignore" ? value : undefined;
}

function resolveNextReviewState(
  currentState: ReturnType<PlannerStore["readReviewState"]>,
  application: PlannerOperationApplication,
) {
  if (application.reviewFlowState) {
    return application.reviewFlowState;
  }

  if (application.queueReviewIds?.length) {
    return queueReviewItems(currentState, application.queueReviewIds);
  }

  return currentState;
}

export const plannerRoutes: FastifyPluginAsync<{ store: PlannerStore }> = async (fastify, options) => {
  const { store } = options;

  fastify.get("/health", async (request, reply) => {
    reply.send({
      ok: true,
      meta: createMeta(request.id),
      data: {
        status: "ok",
      },
    });
  });

  fastify.get("/api/planner/state", async (request, reply) => {
    const snapshot = store.readSnapshot();

    reply.send(
      createSuccess(request.id, {
        plannerData: snapshot.plannerData,
        reviewFlowState: snapshot.reviewFlowState,
      }),
    );
  });

  const handleDaySummary = async (
    request: FastifyRequest,
    reply: FastifyReply,
    forcedDate?: string,
  ) => {
    const data = store.read();
    const query = getQueryRecord(request);
    const referenceDate = resolveReferenceDate(
      data,
      forcedDate ?? parseQueryValue(query.referenceDate),
      "get_today_summary",
    );
    const summary: DaySummaryHttpResponse = {
      summary: getTodayDecisionSummary(data, referenceDate),
    };

    reply.send(createSuccess(request.id, summary));
  };

  fastify.get("/planner/day-summary", async (request, reply) => {
    await handleDaySummary(request, reply);
  });

  fastify.get("/api/planner/days/:date/summary", async (request, reply) => {
    const params = request.params as { date?: string };
    await handleDaySummary(request, reply, params.date);
  });

  const handleShortHorizon = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => {
    const data = store.read();
    const query = getQueryRecord(request);
    const referenceDate = resolveReferenceDate(
      data,
      parseQueryValue(query.referenceDate),
      "get_short_horizon",
    );
    const rawDays = parseQueryValue(query.days);
    const days = rawDays ? Number(rawDays) : 3;

    if (Number.isNaN(days) || days < 1 || days > 10) {
      throw new ApiError({
        statusCode: 400,
        code: "validation_failed",
        message: "O parâmetro days precisa estar entre 1 e 10.",
        operation: "get_short_horizon",
        context: {
          field: "days",
        },
      });
    }

    const snapshot: ShortHorizonHttpResponse = {
      snapshot: {
        load: getShortHorizonLoad(data, referenceDate, days),
        pressurePoints: getUpcomingPressurePoints(data, referenceDate, Math.max(4, days * 2)),
        tomorrow: getTomorrowPreview(data, referenceDate),
      },
    };

    reply.send(createSuccess(request.id, snapshot));
  };

  fastify.get("/planner/short-horizon", async (request, reply) => {
    await handleShortHorizon(request, reply);
  });

  fastify.get("/api/planner/horizon", async (request, reply) => {
    await handleShortHorizon(request, reply);
  });

  const handleReviewItems = async (request: FastifyRequest, reply: FastifyReply) => {
    const snapshot = store.readSnapshot();
    const query = getQueryRecord(request);
    const referenceDate = resolveReferenceDate(
      snapshot.plannerData,
      parseQueryValue(query.referenceDate),
      "get_review_items",
    );
    const items: ReviewItemsHttpResponse = {
      items: buildReviewItems({
        data: snapshot.plannerData,
        referenceDate,
        state: snapshot.reviewFlowState,
      }),
    };

    reply.send(createSuccess(request.id, items));
  };

  fastify.get("/planner/reviews", async (request, reply) => {
    await handleReviewItems(request, reply);
  });

  fastify.get("/api/planner/reviews", async (request, reply) => {
    await handleReviewItems(request, reply);
  });

  const handleRescheduleSuggestion = async (
    request: FastifyRequest,
    reply: FastifyReply,
    allocationIdOverride?: string,
  ) => {
    const query = getQueryRecord(request);
    const allocationId =
      allocationIdOverride ?? parseQueryValue(query.allocationId);

    if (!allocationId) {
      throw new ApiError({
        statusCode: 400,
        code: "validation_failed",
        message: "allocationId é obrigatório.",
        operation: "get_reschedule_suggestion",
        context: { field: "allocationId" },
      });
    }

    const snapshot = store.readSnapshot();
    const referenceDate = resolveReferenceDate(
      snapshot.plannerData,
      parseQueryValue(query.referenceDate),
      "get_reschedule_suggestion",
    );
    const suggestion: RescheduleSuggestionHttpResponse = {
      suggestion: getSuggestedReviewOption(
        snapshot.plannerData,
        referenceDate,
        allocationId,
      ),
    };

    reply.send(createSuccess(request.id, suggestion));
  };

  fastify.get("/planner/reviews/:allocationId/suggestion", async (request, reply) => {
    const params = request.params as { allocationId?: string };
    await handleRescheduleSuggestion(request, reply, params.allocationId);
  });

  fastify.get("/api/planner/reviews/:allocationId/suggestion", async (request, reply) => {
    const params = request.params as { allocationId?: string };
    await handleRescheduleSuggestion(request, reply, params.allocationId);
  });

  fastify.get("/planner/reviews/suggestion", async (request, reply) => {
    await handleRescheduleSuggestion(request, reply);
  });

  fastify.get("/api/planner/days/:date/next-focus", async (request, reply) => {
    const params = request.params as { date?: string };
    const snapshot = store.readSnapshot();
    const referenceDate = resolveReferenceDate(
      snapshot.plannerData,
      params.date,
      "select_next_focus",
      "date",
    );
    const execution = executePlannerCommand({
      command: "select_next_focus",
      context: buildPlannerBaseContext({
        data: snapshot.plannerData,
        referenceDate,
        isDetailPanelOpen: true,
      }),
      payload: {},
    });

    if (!execution) {
      throw new ApiError({
        statusCode: 409,
        code: "invalid_state",
        message: "Não foi possível determinar o próximo foco para a data informada.",
        operation: "select_next_focus",
      });
    }

    const application = buildExecutionApplication(execution);
    reply.send(
      createSuccess(
        request.id,
        buildOperationResult(fromApplicationToRemoteResult(application, snapshot.plannerData)),
      ),
    );
  });

  const handleCompleteBlock = async (
    request: FastifyRequest,
    reply: FastifyReply,
    allocationIdOverride?: string,
  ) => {
    const body = (request.body ?? {}) as Partial<CompleteBlockHttpRequest> & {
      allocationId?: string;
    };
    const allocationId = allocationIdOverride ?? body.allocationId;

    if (!allocationId) {
      throw new ApiError({
        statusCode: 400,
        code: "validation_failed",
        message: "allocationId é obrigatório.",
        operation: "complete_block",
        context: {
          field: "allocationId",
        },
      });
    }

    if (!body.context?.referenceDate) {
      throw new ApiError({
        statusCode: 400,
        code: "validation_failed",
        message: "context.referenceDate é obrigatório.",
        operation: "complete_block",
        context: {
          field: "context.referenceDate",
        },
      });
    }

    const currentData = store.read();
    const referenceDate = resolveReferenceDate(
      currentData,
      body.context.referenceDate,
      "complete_block",
    );
    const context = buildCommandContext({
      data: currentData,
      referenceDate,
      allocationId,
      selectedSlotId: body.context.selectedSlotId,
      selectedWorkId: body.context.selectedWorkId,
    });
    const execution = executePlannerCommand({
      command: "complete_block",
      context,
      payload: {
        allocationId,
      },
    });

    if (!execution) {
      throw new ApiError({
        statusCode: 409,
        code: "invalid_state",
        message: "A conclusão não gerou transição aplicável.",
        operation: "complete_block",
        context: {
          targetId: allocationId,
        },
      });
    }

    await store.write(execution.transition.nextData);

    const result = buildOperationResult({
      nextData: execution.transition.nextData,
      uiPatch: execution.transition.uiPatch,
      consequences: execution.consequences,
      impactSummary: execution.impactSummary,
      systemFeedback: createSystemFeedback(
        execution.consequences,
        execution.impactSummary,
      ),
    });

    reply.send(createSuccess(request.id, result));
  };

  fastify.post("/planner/operations/complete-block", async (request, reply) => {
    await handleCompleteBlock(request, reply);
  });

  fastify.post("/api/planner/blocks/:allocationId/actions/complete", async (request, reply) => {
    const params = request.params as { allocationId?: string };
    await handleCompleteBlock(request, reply, params.allocationId);
  });

  const executeOperationalCommand = async <TBody extends { context?: { referenceDate?: string; selectedSlotId?: string; selectedWorkId?: string } }>(
    params: {
      request: FastifyRequest;
      reply: FastifyReply;
      operation:
        | "start_block"
        | "mark_block_partial"
        | "reschedule_block"
        | "pull_forward_block"
        | "confirm_day_closing"
        | "auto_replan_day"
        | "auto_replan_week";
      allocationId?: string;
      payload: Record<string, unknown>;
      context: TBody["context"];
    },
  ) => {
    const requiresAllocationId =
      params.operation !== "auto_replan_day" &&
      params.operation !== "auto_replan_week" &&
      params.operation !== "confirm_day_closing";

    if (requiresAllocationId && !params.allocationId) {
      throw new ApiError({
        statusCode: 400,
        code: "validation_failed",
        message: "allocationId é obrigatório.",
        operation: params.operation,
        context: { field: "allocationId" },
      });
    }

    if (!params.context?.referenceDate) {
      throw new ApiError({
        statusCode: 400,
        code: "validation_failed",
        message: "context.referenceDate é obrigatório.",
        operation: params.operation,
        context: { field: "context.referenceDate" },
      });
    }

    const snapshot = store.readSnapshot();
    const referenceDate = resolveReferenceDate(
      snapshot.plannerData,
      params.context.referenceDate,
      params.operation,
    );
    const commandContext =
      params.operation === "auto_replan_day" ||
      params.operation === "auto_replan_week" ||
      params.operation === "confirm_day_closing"
        ? buildPlannerBaseContext({
            data: snapshot.plannerData,
            referenceDate,
            selectedSlotId: params.context.selectedSlotId,
            selectedWorkId: params.context.selectedWorkId,
          })
        : buildCommandContext({
            data: snapshot.plannerData,
            referenceDate,
            allocationId: params.allocationId as string,
            selectedSlotId: params.context.selectedSlotId,
            selectedWorkId: params.context.selectedWorkId,
          });
    const execution = executePlannerCommand({
      command: params.operation,
      context: commandContext,
      payload: {
        ...(params.allocationId ? { allocationId: params.allocationId } : {}),
        ...params.payload,
      } as never,
    });

    if (!execution) {
      throw new ApiError({
        statusCode: 409,
        code: "invalid_state",
        message: "A operação não gerou transição aplicável.",
        operation: params.operation,
        context: { targetId: params.allocationId },
      });
    }

    const application = buildExecutionApplication(execution);
    const nextData = application.nextData ?? snapshot.plannerData;
    const nextReviewState = resolveNextReviewState(
      snapshot.reviewFlowState,
      application,
    );

    await store.replaceSnapshot({
      plannerData: nextData,
      reviewFlowState: nextReviewState,
    });

    params.reply.send(
      createSuccess(
        params.request.id,
        buildOperationResult(fromApplicationToRemoteResult(application, nextData)),
      ),
    );
  };

  fastify.post("/planner/operations/start-block", async (request, reply) => {
    const body = readContextBody<StartBlockHttpRequest & { allocationId?: string }>(request);
    await executeOperationalCommand({
      request,
      reply,
      operation: "start_block",
      allocationId: body.allocationId,
      payload: {},
      context: body.context,
    });
  });

  fastify.post("/api/planner/blocks/:allocationId/actions/start", async (request, reply) => {
    const params = request.params as { allocationId?: string };
    const body = readContextBody<StartBlockHttpRequest>(request);
    await executeOperationalCommand({
      request,
      reply,
      operation: "start_block",
      allocationId: params.allocationId,
      payload: {},
      context: body.context,
    });
  });

  fastify.post("/planner/operations/mark-partial", async (request, reply) => {
    const body = readContextBody<MarkBlockPartialHttpRequest & { allocationId?: string }>(request);
    await executeOperationalCommand({
      request,
      reply,
      operation: "mark_block_partial",
      allocationId: body.allocationId,
      payload: {},
      context: body.context,
    });
  });

  fastify.post("/api/planner/blocks/:allocationId/actions/partial", async (request, reply) => {
    const params = request.params as { allocationId?: string };
    const body = readContextBody<MarkBlockPartialHttpRequest>(request);
    await executeOperationalCommand({
      request,
      reply,
      operation: "mark_block_partial",
      allocationId: params.allocationId,
      payload: {},
      context: body.context,
    });
  });

  fastify.post("/planner/operations/reschedule", async (request, reply) => {
    const body = readContextBody<RescheduleBlockHttpRequest & { allocationId?: string }>(request);
    await executeOperationalCommand({
      request,
      reply,
      operation: "reschedule_block",
      allocationId: body.allocationId,
      payload: {
        targetDate: body.targetDate,
        targetSlotId: body.targetSlotId,
        reason: body.reason,
      },
      context: body.context,
    });
  });

  fastify.post("/api/planner/blocks/:allocationId/actions/reschedule", async (request, reply) => {
    const params = request.params as { allocationId?: string };
    const body = readContextBody<RescheduleBlockHttpRequest>(request);
    await executeOperationalCommand({
      request,
      reply,
      operation: "reschedule_block",
      allocationId: params.allocationId,
      payload: {
        targetDate: body.targetDate,
        targetSlotId: body.targetSlotId,
        reason: body.reason,
      },
      context: body.context,
    });
  });

  fastify.post("/planner/operations/pull-forward", async (request, reply) => {
    const body = readContextBody<PullForwardBlockHttpRequest & { allocationId?: string }>(request);

    if (!body.slotId) {
      throw new ApiError({
        statusCode: 400,
        code: "validation_failed",
        message: "slotId é obrigatório.",
        operation: "pull_forward_block",
        context: { field: "slotId" },
      });
    }

    await executeOperationalCommand({
      request,
      reply,
      operation: "pull_forward_block",
      allocationId: body.allocationId,
      payload: {
        slotId: body.slotId,
      },
      context: body.context,
    });
  });

  fastify.post("/api/planner/blocks/:allocationId/actions/pull-forward", async (request, reply) => {
    const params = request.params as { allocationId?: string };
    const body = readContextBody<PullForwardBlockHttpRequest>(request);

    if (!body.slotId) {
      throw new ApiError({
        statusCode: 400,
        code: "validation_failed",
        message: "slotId é obrigatório.",
        operation: "pull_forward_block",
        context: { field: "slotId" },
      });
    }

    await executeOperationalCommand({
      request,
      reply,
      operation: "pull_forward_block",
      allocationId: params.allocationId,
      payload: {
        slotId: body.slotId,
      },
      context: body.context,
    });
  });

  fastify.post("/planner/operations/auto-replan", async (request, reply) => {
    const body = readContextBody<AutoReplanDayHttpRequest>(request);
    await executeOperationalCommand({
      request,
      reply,
      operation: "auto_replan_day",
      payload: {},
      context: body.context,
    });
  });

  fastify.post("/planner/operations/confirm-close", async (request, reply) => {
    const body = readContextBody<ConfirmDayClosingHttpRequest>(request);
    await executeOperationalCommand({
      request,
      reply,
      operation: "confirm_day_closing",
      payload: {},
      context: body.context,
    });
  });

  fastify.post("/api/planner/days/:date/actions/confirm-close", async (request, reply) => {
    const params = request.params as { date?: string };
    const body = readContextBody<ConfirmDayClosingHttpRequest>(request);
    await executeOperationalCommand({
      request,
      reply,
      operation: "confirm_day_closing",
      payload: {},
      context: {
        ...body.context,
        referenceDate: body.context?.referenceDate ?? params.date,
      },
    });
  });

  fastify.post("/api/planner/days/:date/actions/auto-replan", async (request, reply) => {
    const params = request.params as { date?: string };
    const body = readContextBody<AutoReplanDayHttpRequest>(request);
    await executeOperationalCommand({
      request,
      reply,
      operation: "auto_replan_day",
      payload: {},
      context: {
        ...body.context,
        referenceDate: body.context?.referenceDate ?? params.date,
      },
    });
  });

  fastify.post("/planner/operations/auto-replan-week", async (request, reply) => {
    const body = readContextBody<AutoReplanWeekHttpRequest>(request);
    await executeOperationalCommand({
      request,
      reply,
      operation: "auto_replan_week",
      payload: {},
      context: body.context,
    });
  });

  fastify.post("/api/planner/weeks/:date/actions/auto-replan", async (request, reply) => {
    const params = request.params as { date?: string };
    const body = readContextBody<AutoReplanWeekHttpRequest>(request);
    await executeOperationalCommand({
      request,
      reply,
      operation: "auto_replan_week",
      payload: {},
      context: {
        ...body.context,
        referenceDate: body.context?.referenceDate ?? params.date,
      },
    });
  });

  const handleResolveReview = async (
    request: FastifyRequest,
    reply: FastifyReply,
    allocationIdOverride?: string,
  ) => {
    const body = readContextBody<ResolveReviewHttpRequest & { allocationId?: string }>(request);
    const allocationId = allocationIdOverride ?? body.allocationId;
    const action = resolveAction(body.action);

    if (!allocationId) {
      throw new ApiError({
        statusCode: 400,
        code: "validation_failed",
        message: "allocationId é obrigatório.",
        operation: "resolve_review",
        context: { field: "allocationId" },
      });
    }

    if (!body.context?.referenceDate) {
      throw new ApiError({
        statusCode: 400,
        code: "validation_failed",
        message: "context.referenceDate é obrigatório.",
        operation: "resolve_review",
        context: { field: "context.referenceDate" },
      });
    }

    if (!action) {
      throw new ApiError({
        statusCode: 400,
        code: "validation_failed",
        message: "action deve ser accept, defer ou ignore.",
        operation: "resolve_review",
        context: { field: "action" },
      });
    }

    const snapshot = store.readSnapshot();
    const referenceDate = resolveReferenceDate(
      snapshot.plannerData,
      body.context.referenceDate,
      "resolve_review",
    );
    const reviewItem = buildReviewItems({
      data: snapshot.plannerData,
      referenceDate,
      state: snapshot.reviewFlowState,
    }).find((item) => item.allocationId === allocationId);
    const selectedOption = body.option
      ? reviewItem?.alternatives.find(
          (option) =>
            option.id === body.option?.id ||
            (option.date === body.option?.date && option.slotId === body.option?.slotId),
        )
      : undefined;

    if (body.option && !selectedOption) {
      throw new ApiError({
        statusCode: 409,
        code: "domain_conflict",
        message: "A alternativa escolhida não está mais disponível para esta revisão.",
        operation: "resolve_review",
        context: { targetId: allocationId },
      });
    }

    const resolution = resolveReviewAction({
      data: snapshot.plannerData,
      referenceDate,
      state: snapshot.reviewFlowState,
      allocationId,
      action,
      option: selectedOption,
    });

    if (!resolution) {
      throw new ApiError({
        statusCode: 409,
        code: "invalid_state",
        message: "A revisão não está disponível para este item.",
        operation: "resolve_review",
        context: { targetId: allocationId },
      });
    }

    const followUpExecution = resolution.followUpCommand
      ? executePlannerCommand({
          command: resolution.followUpCommand.command,
          context: buildCommandContext({
            data: snapshot.plannerData,
            referenceDate,
            allocationId,
            selectedSlotId: body.context.selectedSlotId,
            selectedWorkId: body.context.selectedWorkId,
          }),
          payload: resolution.followUpCommand.payload,
        })
      : undefined;
    const application = buildReviewResolutionApplication(
      resolution,
      followUpExecution ?? undefined,
    );
    const nextData = application.nextData ?? snapshot.plannerData;
    const nextReviewState = application.reviewFlowState ?? snapshot.reviewFlowState;

    await store.replaceSnapshot({
      plannerData: nextData,
      reviewFlowState: nextReviewState,
    });

    reply.send(
      createSuccess(
        request.id,
        buildOperationResult(fromApplicationToRemoteResult(application, nextData)),
      ),
    );
  };

  fastify.post("/planner/reviews/resolve", async (request, reply) => {
    await handleResolveReview(request, reply);
  });

  fastify.post("/api/planner/reviews/:allocationId/resolution", async (request, reply) => {
    const params = request.params as { allocationId?: string };
    await handleResolveReview(request, reply, params.allocationId);
  });

  const handleCreateWork = async (request: FastifyRequest, reply: FastifyReply) => {
    const body = readContextBody<CreateWorkHttpRequest>(request);

    if (!body.context?.referenceDate) {
      throw new ApiError({
        statusCode: 400,
        code: "validation_failed",
        message: "context.referenceDate é obrigatório.",
        operation: "create_work",
        context: { field: "context.referenceDate" },
      });
    }

    if (!body.input?.titulo?.trim()) {
      throw new ApiError({
        statusCode: 400,
        code: "validation_failed",
        message: "input.titulo é obrigatório.",
        operation: "create_work",
        context: { field: "input.titulo" },
      });
    }

    const currentData = store.read();
    const referenceDate = resolveReferenceDate(
      currentData,
      body.context.referenceDate,
      "create_work",
    );
    const resolution = createPlannerWork({
      data: currentData,
      referenceDate,
      input: body.input,
    });

    await store.write(resolution.nextData);
    reply.send(createSuccess(request.id, buildOperationResult(resolution)));
  };

  fastify.post("/planner/works", async (request, reply) => {
    await handleCreateWork(request, reply);
  });

  fastify.post("/api/planner/works", async (request, reply) => {
    await handleCreateWork(request, reply);
  });

  const handleCreateRequest = async (request: FastifyRequest, reply: FastifyReply) => {
    const body = readContextBody<CreateRequestHttpRequest>(request);

    if (!body.context?.referenceDate) {
      throw new ApiError({
        statusCode: 400,
        code: "validation_failed",
        message: "context.referenceDate é obrigatório.",
        operation: "create_request",
        context: { field: "context.referenceDate" },
      });
    }

    if (!body.input?.tituloInicial?.trim()) {
      throw new ApiError({
        statusCode: 400,
        code: "validation_failed",
        message: "input.tituloInicial é obrigatório.",
        operation: "create_request",
        context: { field: "input.tituloInicial" },
      });
    }

    const currentData = store.read();
    resolveReferenceDate(
      currentData,
      body.context.referenceDate,
      "create_request",
    );
    const resolution = createPlannerRequest({
      data: currentData,
      input: body.input,
    });

    await store.write(resolution.nextData);
    reply.send(createSuccess(request.id, buildOperationResult(resolution)));
  };

  fastify.post("/planner/requests", async (request, reply) => {
    await handleCreateRequest(request, reply);
  });

  fastify.post("/api/planner/requests", async (request, reply) => {
    await handleCreateRequest(request, reply);
  });

  const handleOpenDependency = async (request: FastifyRequest, reply: FastifyReply) => {
    const body = readContextBody<OpenDependencyHttpRequest>(request);

    if (!body.allocationId) {
      throw new ApiError({
        statusCode: 400,
        code: "validation_failed",
        message: "allocationId é obrigatório.",
        operation: "open_dependency",
        context: { field: "allocationId" },
      });
    }

    if (!body.context?.referenceDate) {
      throw new ApiError({
        statusCode: 400,
        code: "validation_failed",
        message: "context.referenceDate é obrigatório.",
        operation: "open_dependency",
        context: { field: "context.referenceDate" },
      });
    }

    const currentData = store.read();
    const referenceDate = resolveReferenceDate(
      currentData,
      body.context.referenceDate,
      "open_dependency",
    );
    const resolution = openPlannerDependency({
      data: currentData,
      referenceDate,
      allocationId: body.allocationId,
    });

    if (!resolution) {
      throw new ApiError({
        statusCode: 409,
        code: "invalid_state",
        message: "Não foi possível abrir a dependência para este item.",
        operation: "open_dependency",
        context: { targetId: body.allocationId },
      });
    }

    await store.write(resolution.nextData);

    reply.send(createSuccess(request.id, buildOperationResult(resolution)));
  };

  fastify.post("/planner/dependencies/open", async (request, reply) => {
    await handleOpenDependency(request, reply);
  });

  fastify.post("/api/planner/dependencies/open", async (request, reply) => {
    await handleOpenDependency(request, reply);
  });

  const handleResolveDependency = async (
    request: FastifyRequest,
    reply: FastifyReply,
    dependencyIdOverride?: string,
  ) => {
    const body = readContextBody<ResolveDependencyHttpRequest & { dependencyId?: string }>(request);
    const dependencyId = dependencyIdOverride ?? body.dependencyId;

    if (!dependencyId) {
      throw new ApiError({
        statusCode: 400,
        code: "validation_failed",
        message: "dependencyId é obrigatório.",
        operation: "resolve_dependency",
        context: { field: "dependencyId" },
      });
    }

    if (!body.context?.referenceDate) {
      throw new ApiError({
        statusCode: 400,
        code: "validation_failed",
        message: "context.referenceDate é obrigatório.",
        operation: "resolve_dependency",
        context: { field: "context.referenceDate" },
      });
    }

    const currentData = store.read();
    const referenceDate = resolveReferenceDate(
      currentData,
      body.context.referenceDate,
      "resolve_dependency",
    );
    const resolution = resolvePlannerDependency({
      data: currentData,
      referenceDate,
      dependencyId,
    });

    if (!resolution) {
      throw new ApiError({
        statusCode: 404,
        code: "not_found",
        message: "Dependência não encontrada.",
        operation: "resolve_dependency",
        context: { targetId: dependencyId },
      });
    }

    await store.write(resolution.nextData);
    reply.send(createSuccess(request.id, buildOperationResult(resolution)));
  };

  fastify.post("/planner/dependencies/:id/resolve", async (request, reply) => {
    const params = request.params as { id?: string };
    await handleResolveDependency(request, reply, params.id);
  });

  fastify.post("/api/planner/dependencies/:id/resolve", async (request, reply) => {
    const params = request.params as { id?: string };
    await handleResolveDependency(request, reply, params.id);
  });

  const handleApplyDependencyPolicy = async (
    request: FastifyRequest,
    reply: FastifyReply,
    dependencyIdOverride?: string,
  ) => {
    const body = readContextBody<ApplyDependencyPolicyHttpRequest & { dependencyId?: string }>(request);
    const dependencyId = dependencyIdOverride ?? body.dependencyId;

    if (!dependencyId) {
      throw new ApiError({
        statusCode: 400,
        code: "validation_failed",
        message: "dependencyId é obrigatório.",
        operation: "apply_dependency_policy",
        context: { field: "dependencyId" },
      });
    }

    if (!body.context?.referenceDate) {
      throw new ApiError({
        statusCode: 400,
        code: "validation_failed",
        message: "context.referenceDate é obrigatório.",
        operation: "apply_dependency_policy",
        context: { field: "context.referenceDate" },
      });
    }

    if (body.action !== "manter_reserva" && body.action !== "liberar_slots_futuros") {
      throw new ApiError({
        statusCode: 400,
        code: "validation_failed",
        message: "action deve ser manter_reserva ou liberar_slots_futuros.",
        operation: "apply_dependency_policy",
        context: { field: "action" },
      });
    }

    const currentData = store.read();
    const referenceDate = resolveReferenceDate(
      currentData,
      body.context.referenceDate,
      "apply_dependency_policy",
    );
    const resolution = applyPlannerDependencyPolicy({
      data: currentData,
      referenceDate,
      dependencyId,
      action: body.action,
    });

    if (!resolution) {
      throw new ApiError({
        statusCode: 404,
        code: "not_found",
        message: "Dependência não encontrada para aplicar política.",
        operation: "apply_dependency_policy",
        context: { targetId: dependencyId },
      });
    }

    await store.write(resolution.nextData);
    reply.send(createSuccess(request.id, buildOperationResult(resolution)));
  };

  fastify.post("/planner/dependencies/:id/policy", async (request, reply) => {
    const params = request.params as { id?: string };
    await handleApplyDependencyPolicy(request, reply, params.id);
  });

  fastify.post("/api/planner/dependencies/:id/policy", async (request, reply) => {
    const params = request.params as { id?: string };
    await handleApplyDependencyPolicy(request, reply, params.id);
  });
};
