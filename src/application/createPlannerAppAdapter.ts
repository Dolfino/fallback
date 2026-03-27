import { createPlannerLocalAdapter } from "./plannerLocalAdapter";
import type { PlannerAppPort } from "./plannerAppPort";
import { createPlannerRemoteAdapter } from "./plannerRemoteAdapter";

export function createPlannerAppAdapter(): PlannerAppPort {
  const adapterMode = import.meta.env.VITE_PLANNER_ADAPTER ?? "local";

  if (adapterMode === "remote") {
    return createPlannerRemoteAdapter({
      baseUrl: import.meta.env.VITE_PLANNER_API_BASE_URL,
      timeoutMs: import.meta.env.VITE_PLANNER_API_TIMEOUT_MS
        ? Number(import.meta.env.VITE_PLANNER_API_TIMEOUT_MS)
        : undefined,
    });
  }

  return createPlannerLocalAdapter();
}
