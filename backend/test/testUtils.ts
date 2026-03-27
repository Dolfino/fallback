import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { FastifyInstance } from "fastify";
import { buildServer } from "../src/app";
import {
  loadPlannerSnapshot,
  resetPlannerSnapshot,
  type PlannerStoreSnapshot,
} from "../src/state/plannerPersistence";
import type { PlannerAppStateSnapshot } from "../../src/application/plannerAppPort";

export function createTempSnapshotFilePath() {
  const dir = mkdtempSync(join(tmpdir(), "planner-contract-"));
  return join(dir, "planner-state.json");
}

export async function createTestServer() {
  const snapshotFilePath = createTempSnapshotFilePath();
  resetPlannerSnapshot(snapshotFilePath);
  const app = await createTestServerForSnapshot(snapshotFilePath);

  return {
    app,
    snapshotFilePath,
  };
}

export async function createTestServerForSnapshot(snapshotFilePath: string) {
  const app = await buildServer({
    logger: false,
    snapshotFilePath,
  });
  return app;
}

export function loadTestSnapshot(snapshotFilePath: string): PlannerStoreSnapshot {
  return loadPlannerSnapshot(snapshotFilePath).snapshot;
}

export function createStateSnapshot(
  snapshot: PlannerStoreSnapshot,
  overrides?: Partial<PlannerAppStateSnapshot>,
): PlannerAppStateSnapshot {
  return {
    plannerData: snapshot.plannerData,
    reviewFlowState: snapshot.reviewFlowState,
    selectedDate: snapshot.plannerData.dataOperacional,
    selectedSlotId: "",
    selectedWorkId: "",
    isDetailPanelOpen: false,
    ...overrides,
  };
}

export async function startTestServer(app: FastifyInstance) {
  await app.listen({ port: 0, host: "127.0.0.1" });
  const address = app.server.address();

  if (!address || typeof address === "string") {
    throw new Error("Não foi possível determinar a porta do servidor de teste.");
  }

  return `http://127.0.0.1:${address.port}`;
}
