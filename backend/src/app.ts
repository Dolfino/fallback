import Fastify from "fastify";
import cors from "@fastify/cors";
import { plannerRoutes } from "./routes/plannerRoutes";
import { ApiError, createErrorEnvelope } from "./errors/apiError";
import { PlannerStore } from "./state/plannerStore";
import { loadPlannerPersistence } from "./state/plannerPersistence";

export interface BuildServerOptions {
  logger?: boolean;
  snapshotFilePath?: string;
  databaseUrl?: string;
}

export async function buildServer(options: BuildServerOptions = {}) {
  const app = Fastify({
    logger: options.logger ?? true,
  });
  const loadedSnapshot = await loadPlannerPersistence({
    snapshotFilePath: options.snapshotFilePath,
    databaseUrl: options.databaseUrl,
  });
  const store = new PlannerStore(loadedSnapshot.snapshot, {
    persistence: loadedSnapshot.adapter,
  });

  await app.register(cors, {
    origin: true,
  });

  if (loadedSnapshot.warning) {
    app.log.warn(loadedSnapshot.warning);
  }

  app.log.info(
    {
      source: loadedSnapshot.source,
      persistence: loadedSnapshot.adapter.kind,
      target: loadedSnapshot.adapter.label,
    },
    "Planner state loaded",
  );

  app.addHook("onClose", async () => {
    await loadedSnapshot.adapter.close();
  });

  app.setErrorHandler((error, request, reply) => {
    const apiError =
      error instanceof ApiError
        ? error
        : new ApiError({
            statusCode: 500,
            code: "internal_error",
            message: "Erro interno ao processar a operação.",
            operation: "internal_error",
            retryable: false,
            context: {
              detail: error instanceof Error ? error.message : "Erro desconhecido.",
            },
          });

    reply.status(apiError.statusCode).send(createErrorEnvelope(apiError, request.id));
  });

  await app.register(plannerRoutes, {
    prefix: "",
    store,
  });

  return app;
}
