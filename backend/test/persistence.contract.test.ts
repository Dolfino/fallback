import { afterEach, describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import type { FastifyInstance } from "fastify";
import {
  createTempSnapshotFilePath,
  createTestServerForSnapshot,
  loadTestSnapshot,
} from "./testUtils";
import {
  createSeedPlannerSnapshot,
  loadPlannerSnapshot,
  resetPlannerSnapshot,
  savePlannerSnapshot,
} from "../src/state/plannerPersistence";

describe("planner snapshot persistence", () => {
  const apps: FastifyInstance[] = [];

  afterEach(async () => {
    while (apps.length) {
      const app = apps.pop();
      if (app) {
        await app.close();
      }
    }
  });

  it("loads a valid persisted snapshot on boot", async () => {
    const snapshotFilePath = createTempSnapshotFilePath();
    const seed = createSeedPlannerSnapshot();
    seed.plannerData.trabalhos = seed.plannerData.trabalhos.map((item) =>
      item.id === "relatorio-mensal"
        ? {
            ...item,
            titulo: "Consolidar relatório mensal persistido",
          }
        : item,
    );
    savePlannerSnapshot(seed, snapshotFilePath);

    const app = await createTestServerForSnapshot(snapshotFilePath);
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/planner/reviews?referenceDate=2026-03-23",
    });
    const payload = response.json();
    const item = payload.data.items.find(
      (entry: { allocationId: string }) => entry.allocationId === "aloc-8",
    );

    expect(response.statusCode).toBe(200);
    expect(item).toBeTruthy();
    expect(item.title).toBe("Consolidar relatório mensal persistido");
    expect(item.status).toBe("remarcado");
  });

  it("falls back to seed when the snapshot does not exist", () => {
    const snapshotFilePath = createTempSnapshotFilePath();
    const result = loadPlannerSnapshot(snapshotFilePath);

    expect(result.source).toBe("seed");
    expect(result.warning).toBeUndefined();
    expect(result.snapshot.plannerData.dataOperacional).toBe("2026-03-23");
  });

  it("falls back to seed with warning when the snapshot is corrupted", () => {
    const snapshotFilePath = createTempSnapshotFilePath();
    writeFileSync(snapshotFilePath, "{ invalid-json", "utf-8");

    const result = loadPlannerSnapshot(snapshotFilePath);

    expect(result.source).toBe("seed");
    expect(result.warning).toContain("Falha ao ler snapshot persistido");
    expect(result.snapshot.reviewFlowState.activeAllocationIds).toEqual([]);
  });

  it("persists mutation results to the snapshot file", async () => {
    const snapshotFilePath = createTempSnapshotFilePath();
    resetPlannerSnapshot(snapshotFilePath);
    const app = await createTestServerForSnapshot(snapshotFilePath);
    apps.push(app);

    const mutate = await app.inject({
      method: "POST",
      url: "/planner/operations/start-block",
      payload: {
        allocationId: "aloc-11",
        context: { referenceDate: "2026-03-23" },
      },
    });

    const persisted = loadTestSnapshot(snapshotFilePath);
    const allocation = persisted.plannerData.alocacoes.find((item) => item.id === "aloc-11");

    expect(mutate.statusCode).toBe(200);
    expect(allocation?.statusAlocacao).toBe("em_execucao");
  });

  it("preserves mutated state across restart", async () => {
    const snapshotFilePath = createTempSnapshotFilePath();
    resetPlannerSnapshot(snapshotFilePath);

    const firstApp = await createTestServerForSnapshot(snapshotFilePath);
    apps.push(firstApp);

    const mutate = await firstApp.inject({
      method: "POST",
      url: "/planner/operations/auto-replan",
      payload: {
        context: { referenceDate: "2026-03-23" },
      },
    });
    expect(mutate.statusCode).toBe(200);

    await firstApp.close();
    apps.pop();

    const secondApp = await createTestServerForSnapshot(snapshotFilePath);
    apps.push(secondApp);

    const response = await secondApp.inject({
      method: "GET",
      url: "/planner/reviews?referenceDate=2026-03-23",
    });
    const payload = response.json();
    const item = payload.data.items.find((entry: { allocationId: string }) => entry.allocationId === "aloc-3");

    expect(response.statusCode).toBe(200);
    expect(item).toBeTruthy();
    expect(item.date).toBe("2026-03-24");
    expect(item.currentSlotId).toBe("slot-13");
    expect(item.status).toBe("remarcado");
  });

  it("expands legacy snapshots to the current operational horizon on boot", () => {
    const snapshotFilePath = createTempSnapshotFilePath();
    const seed = createSeedPlannerSnapshot();
    seed.plannerData.diasSemana = seed.plannerData.diasSemana.slice(0, 5);
    savePlannerSnapshot(seed, snapshotFilePath);

    const loaded = loadPlannerSnapshot(snapshotFilePath);

    expect(loaded.source).toBe("persisted");
    expect(loaded.snapshot.plannerData.diasSemana).toHaveLength(10);
    expect(loaded.snapshot.plannerData.diasSemana[0]).toBe("2026-03-23");
    expect(loaded.snapshot.plannerData.diasSemana[9]).toBe("2026-04-03");
  });

  it("reset/reseed restores the base snapshot", () => {
    const snapshotFilePath = createTempSnapshotFilePath();
    const seed = createSeedPlannerSnapshot();
    seed.plannerData.alocacoes = seed.plannerData.alocacoes.map((item) =>
      item.id === "aloc-11" ? { ...item, statusAlocacao: "em_execucao" } : item,
    );
    savePlannerSnapshot(seed, snapshotFilePath);

    resetPlannerSnapshot(snapshotFilePath);
    const resetState = loadTestSnapshot(snapshotFilePath);
    const allocation = resetState.plannerData.alocacoes.find((item) => item.id === "aloc-11");

    expect(allocation?.statusAlocacao).toBe("planejado");
    expect(resetState.reviewFlowState.activeAllocationIds).toEqual([]);
  });
});
