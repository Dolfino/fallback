import { access } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { FastifyInstance } from "fastify";
import type { ViteDevServer } from "vite";
import { createServer as createViteServer } from "vite";
import { afterEach, describe, expect, it } from "vitest";
import {
  createTempSnapshotFilePath,
  createTestServerForSnapshot,
  startTestServer,
} from "../../../backend/test/testUtils";
import { savePlannerSnapshot } from "../../../backend/src/state/plannerPersistence";
import { createMockPlannerData } from "../../data/mockData";
import { applyPlannerDerivedState } from "../../domain/plannerDerivedState";
import { createEmptyReviewState } from "../../domain/plannerReviewFlow";

const execFileAsync = promisify(execFile);
const browserCandidates = [
  process.env.PLANNER_UI_SMOKE_BROWSER_BIN,
  "/snap/bin/chromium",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
].filter((candidate): candidate is string => Boolean(candidate));

function getServerUrl(server: ViteDevServer) {
  const address = server.httpServer?.address();

  if (!address || typeof address === "string") {
    throw new Error("Não foi possível determinar a porta do frontend de smoke test.");
  }

  return `http://127.0.0.1:${(address as AddressInfo).port}`;
}

async function resolveBrowserBinary() {
  for (const candidate of browserCandidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next browser candidate.
    }
  }

  throw new Error(
    "Nenhum navegador compatível foi encontrado. Defina PLANNER_UI_SMOKE_BROWSER_BIN ou instale Chromium.",
  );
}

function restoreEnvVar(name: "VITE_PLANNER_ADAPTER" | "VITE_PLANNER_API_BASE_URL" | "VITE_PLANNER_API_TIMEOUT_MS", value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}

describe("planner remote UI smoke", () => {
  let app: FastifyInstance | null = null;
  let viteServer: ViteDevServer | null = null;
  const originalEnv = {
    VITE_PLANNER_ADAPTER: process.env.VITE_PLANNER_ADAPTER,
    VITE_PLANNER_API_BASE_URL: process.env.VITE_PLANNER_API_BASE_URL,
    VITE_PLANNER_API_TIMEOUT_MS: process.env.VITE_PLANNER_API_TIMEOUT_MS,
  };

  afterEach(async () => {
    restoreEnvVar("VITE_PLANNER_ADAPTER", originalEnv.VITE_PLANNER_ADAPTER);
    restoreEnvVar("VITE_PLANNER_API_BASE_URL", originalEnv.VITE_PLANNER_API_BASE_URL);
    restoreEnvVar("VITE_PLANNER_API_TIMEOUT_MS", originalEnv.VITE_PLANNER_API_TIMEOUT_MS);

    if (viteServer) {
      await viteServer.close();
      viteServer = null;
    }

    if (app) {
      await app.close();
      app = null;
    }
  });

  it("boots the remote UI and reaches the backend endpoints through a real browser", async () => {
    const snapshotFilePath = createTempSnapshotFilePath();
    const smokeTitle = `Smoke remoto ${Date.now()}`;
    const requestedUrls: string[] = [];
    const statusByUrl = new Map<string, number[]>();
    const currentData = createMockPlannerData(new Date());
    const smokeSnapshot = {
      plannerData: applyPlannerDerivedState(currentData, currentData.dataOperacional),
      reviewFlowState: createEmptyReviewState(),
    };
    const smokeWork = smokeSnapshot.plannerData.trabalhos.find((entry) => entry.id === "proposta-acme");

    if (!smokeWork) {
      throw new Error("O trabalho base proposta-acme não foi encontrado para o smoke test.");
    }

    smokeWork.titulo = smokeTitle;
    savePlannerSnapshot(smokeSnapshot, snapshotFilePath);

    app = await createTestServerForSnapshot(snapshotFilePath);
    app.addHook("onResponse", async (request, reply) => {
      requestedUrls.push(request.url);
      const statuses = statusByUrl.get(request.url) ?? [];
      statuses.push(reply.statusCode);
      statusByUrl.set(request.url, statuses);
    });

    const backendUrl = await startTestServer(app);

    process.env.VITE_PLANNER_ADAPTER = "remote";
    process.env.VITE_PLANNER_API_BASE_URL = backendUrl;
    process.env.VITE_PLANNER_API_TIMEOUT_MS = "5000";

    viteServer = await createViteServer({
      logLevel: "error",
      server: {
        host: "127.0.0.1",
        port: 0,
      },
    });
    await viteServer.listen();

    const browserBinary = await resolveBrowserBinary();
    const frontendUrl = getServerUrl(viteServer);
    const { stdout } = await execFileAsync(
      browserBinary,
      [
        "--headless",
        "--disable-gpu",
        "--run-all-compositor-stages-before-draw",
        "--virtual-time-budget=8000",
        "--dump-dom",
        frontendUrl,
      ],
      {
        env: process.env,
        maxBuffer: 12 * 1024 * 1024,
        timeout: 20_000,
      },
    );

    expect(stdout).toContain("Centro de controle");
    expect(stdout).toContain(smokeTitle);
    expect(requestedUrls.some((url) => url.includes("/api/planner/days/") && url.includes("/summary"))).toBe(true);
    expect(requestedUrls.some((url) => url.startsWith("/api/planner/horizon"))).toBe(true);
    expect(requestedUrls.some((url) => url.startsWith("/api/planner/reviews?"))).toBe(true);
    expect(statusByUrl.get(requestedUrls.find((url) => url.includes("/api/planner/days/") && url.includes("/summary")) ?? "")?.includes(200)).toBe(true);
  }, 30_000);
});
