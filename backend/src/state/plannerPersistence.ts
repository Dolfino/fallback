import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool, type PoolConfig } from "pg";
import { createMockPlannerData } from "../../../src/data/mockData";
import { applyPlannerDerivedState } from "../../../src/domain/plannerDerivedState";
import { createEmptyReviewState } from "../../../src/domain/plannerReviewFlow";
import type { ReviewFlowState } from "../../../src/types/domain";
import type { PlannerData } from "../../../src/types/planner";

export interface PlannerStoreSnapshot {
  plannerData: PlannerData;
  reviewFlowState: ReviewFlowState;
}

export interface PersistedPlannerSnapshot extends PlannerStoreSnapshot {
  version: 1;
  savedAt: string;
}

export interface PlannerSnapshotLoadResult {
  snapshot: PlannerStoreSnapshot;
  source: "persisted" | "seed";
  filePath: string;
  warning?: string;
}

export interface PlannerPersistenceAdapter {
  kind: "snapshot" | "postgres";
  label: string;
  save(snapshot: PlannerStoreSnapshot): Promise<void>;
  reset(): Promise<PlannerStoreSnapshot>;
  close(): Promise<void>;
}

export interface PlannerPersistenceBootstrap {
  snapshot: PlannerStoreSnapshot;
  source: "persisted" | "seed";
  warning?: string;
  adapter: PlannerPersistenceAdapter;
}

export interface PlannerPersistenceOptions {
  snapshotFilePath?: string;
  databaseUrl?: string;
}

const operationalHorizonDays = 10;

const currentDir = dirname(fileURLToPath(import.meta.url));
const defaultDataDir = resolve(currentDir, "../../data");
const defaultSnapshotFilePath = resolve(defaultDataDir, "planner-state.json");
const seedReferenceDate = new Date("2026-03-23T12:00:00.000Z");
const postgresStateTable = "planner_backend_state";

export const PLANNER_SEED_REFERENCE_DATE = "2026-03-23";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPersistedPlannerSnapshot(value: unknown): value is PersistedPlannerSnapshot {
  if (!isObject(value)) {
    return false;
  }

  return value.version === 1 && isObject(value.plannerData) && isObject(value.reviewFlowState);
}

function normalizePlannerDataHorizon(data: PlannerData) {
  if (data.diasSemana.length >= operationalHorizonDays) {
    return {
      ...data,
      issues: data.issues ?? [],
      fechamentosOperacionais: data.fechamentosOperacionais ?? [],
    };
  }

  const regenerated = createMockPlannerData(new Date(`${data.dataOperacional}T12:00:00.000Z`));
  return applyPlannerDerivedState(
    {
      ...data,
      diasSemana: regenerated.diasSemana,
      issues: data.issues ?? [],
      fechamentosOperacionais: data.fechamentosOperacionais ?? [],
    },
    data.dataOperacional,
  );
}

function normalizeLoadedSnapshot(snapshot: PlannerStoreSnapshot): PlannerStoreSnapshot {
  return {
    plannerData: normalizePlannerDataHorizon(structuredClone(snapshot.plannerData)),
    reviewFlowState: structuredClone(snapshot.reviewFlowState),
  };
}

function resolveSnapshotFilePath(filePath?: string) {
  return filePath ?? process.env.PLANNER_BACKEND_SNAPSHOT_FILE ?? defaultSnapshotFilePath;
}

function resolveDatabaseUrl(databaseUrl?: string) {
  return databaseUrl ?? process.env.PLANNER_BACKEND_DATABASE_URL;
}

function shouldUsePostgres(options: PlannerPersistenceOptions = {}) {
  if (options.snapshotFilePath) {
    return false;
  }

  return Boolean(resolveDatabaseUrl(options.databaseUrl));
}

function createSnapshotAdapter(filePath?: string): PlannerPersistenceAdapter {
  const snapshotFilePath = resolveSnapshotFilePath(filePath);

  return {
    kind: "snapshot",
    label: snapshotFilePath,
    async save(snapshot) {
      savePlannerSnapshot(snapshot, snapshotFilePath);
    },
    async reset() {
      return resetPlannerSnapshot(snapshotFilePath);
    },
    async close() {
      return Promise.resolve();
    },
  };
}

function createPostgresPool(databaseUrl?: string) {
  const connectionString = resolveDatabaseUrl(databaseUrl);
  const config: PoolConfig = connectionString ? { connectionString } : {};
  return new Pool(config);
}

function createPostgresAdapterFromPool(pool: Pool): PlannerPersistenceAdapter {
  return {
    kind: "postgres",
    label: "postgres",
    async save(snapshot) {
      await upsertPostgresSnapshot(pool, snapshot);
    },
    async reset() {
      const snapshot = createSeedPlannerSnapshot();
      await upsertPostgresSnapshot(pool, snapshot);
      return snapshot;
    },
    async close() {
      await pool.end();
    },
  };
}

async function ensurePostgresSchema(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${postgresStateTable} (
      id INTEGER PRIMARY KEY,
      version INTEGER NOT NULL,
      saved_at TIMESTAMPTZ NOT NULL,
      payload JSONB NOT NULL
    )
  `);
}

async function upsertPostgresSnapshot(pool: Pool, snapshot: PlannerStoreSnapshot) {
  const persistedSnapshot = toPersistedPlannerSnapshot(snapshot);

  await pool.query(
    `
      INSERT INTO ${postgresStateTable} (id, version, saved_at, payload)
      VALUES (1, $1, $2, $3::jsonb)
      ON CONFLICT (id)
      DO UPDATE SET
        version = EXCLUDED.version,
        saved_at = EXCLUDED.saved_at,
        payload = EXCLUDED.payload
    `,
    [
      persistedSnapshot.version,
      persistedSnapshot.savedAt,
      JSON.stringify(persistedSnapshot),
    ],
  );
}

async function createPostgresAdapter(databaseUrl?: string): Promise<PlannerPersistenceAdapter> {
  const pool = createPostgresPool(databaseUrl);
  await ensurePostgresSchema(pool);
  return createPostgresAdapterFromPool(pool);
}

async function loadPostgresSnapshot(
  databaseUrl?: string,
): Promise<PlannerPersistenceBootstrap> {
  const pool = createPostgresPool(databaseUrl);

  try {
    await ensurePostgresSchema(pool);
    const adapter = createPostgresAdapterFromPool(pool);
    const result = await pool.query<{ payload: unknown }>(
      `SELECT payload FROM ${postgresStateTable} WHERE id = 1`,
    );
    const row = result.rows[0];

    if (!row) {
      const snapshot = await adapter.reset();
      return {
        snapshot,
        source: "seed",
        adapter,
      };
    }

    const payload = row.payload;
    if (!isPersistedPlannerSnapshot(payload)) {
      const snapshot = await adapter.reset();
      return {
        snapshot,
        source: "seed",
        warning: "Snapshot PostgreSQL inválido. Backend iniciou com seed limpa.",
        adapter,
      };
    }

    return {
      snapshot: normalizeLoadedSnapshot({
        plannerData: structuredClone(payload.plannerData),
        reviewFlowState: structuredClone(payload.reviewFlowState),
      }),
      source: "persisted",
      adapter,
    };
  } catch (error) {
    await pool.end();
    throw error;
  }
}

export function getPlannerSnapshotFilePath(filePath?: string) {
  return resolveSnapshotFilePath(filePath);
}

export function createSeedPlannerSnapshot(): PlannerStoreSnapshot {
  const raw = createMockPlannerData(seedReferenceDate);

  return {
    plannerData: applyPlannerDerivedState(raw, raw.dataOperacional),
    reviewFlowState: createEmptyReviewState(),
  };
}

export function toPersistedPlannerSnapshot(
  snapshot: PlannerStoreSnapshot,
): PersistedPlannerSnapshot {
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    plannerData: structuredClone(snapshot.plannerData),
    reviewFlowState: structuredClone(snapshot.reviewFlowState),
  };
}

export function loadPlannerSnapshot(filePath?: string): PlannerSnapshotLoadResult {
  const snapshotFilePath = resolveSnapshotFilePath(filePath);
  if (!existsSync(snapshotFilePath)) {
    return {
      snapshot: createSeedPlannerSnapshot(),
      source: "seed",
      filePath: snapshotFilePath,
    };
  }

  try {
    const raw = readFileSync(snapshotFilePath, "utf-8").trim();

    if (!raw) {
      return {
        snapshot: createSeedPlannerSnapshot(),
        source: "seed",
        filePath: snapshotFilePath,
        warning: "Snapshot persistido vazio. Backend iniciou com seed limpa.",
      };
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!isPersistedPlannerSnapshot(parsed)) {
      return {
        snapshot: createSeedPlannerSnapshot(),
        source: "seed",
        filePath: snapshotFilePath,
        warning: "Snapshot persistido inválido. Backend iniciou com seed limpa.",
      };
    }

    return {
      snapshot: normalizeLoadedSnapshot({
        plannerData: structuredClone(parsed.plannerData),
        reviewFlowState: structuredClone(parsed.reviewFlowState),
      }),
      source: "persisted",
      filePath: snapshotFilePath,
    };
  } catch (error) {
    return {
      snapshot: createSeedPlannerSnapshot(),
      source: "seed",
      filePath: snapshotFilePath,
      warning:
        error instanceof Error
          ? `Falha ao ler snapshot persistido: ${error.message}. Backend iniciou com seed limpa.`
          : "Falha ao ler snapshot persistido. Backend iniciou com seed limpa.",
    };
  }
}

export async function loadPlannerPersistence(
  options: PlannerPersistenceOptions = {},
): Promise<PlannerPersistenceBootstrap> {
  if (shouldUsePostgres(options)) {
    return loadPostgresSnapshot(options.databaseUrl);
  }

  const result = loadPlannerSnapshot(options.snapshotFilePath);
  return {
    snapshot: result.snapshot,
    source: result.source,
    warning: result.warning,
    adapter: createSnapshotAdapter(options.snapshotFilePath),
  };
}

export function savePlannerSnapshot(snapshot: PlannerStoreSnapshot, filePath?: string) {
  const snapshotFilePath = resolveSnapshotFilePath(filePath);
  mkdirSync(dirname(snapshotFilePath), { recursive: true });

  const persistedSnapshot = toPersistedPlannerSnapshot(snapshot);
  const tempPath = `${snapshotFilePath}.tmp`;

  writeFileSync(tempPath, JSON.stringify(persistedSnapshot, null, 2), "utf-8");
  renameSync(tempPath, snapshotFilePath);
}

export async function resetPlannerPersistence(
  options: PlannerPersistenceOptions = {},
) {
  if (shouldUsePostgres(options)) {
    const adapter = await createPostgresAdapter(options.databaseUrl);
    const snapshot = await adapter.reset();
    return {
      snapshot,
      adapter,
    };
  }

  return {
    snapshot: resetPlannerSnapshot(options.snapshotFilePath),
    adapter: createSnapshotAdapter(options.snapshotFilePath),
  };
}

export function resetPlannerSnapshot(filePath?: string) {
  const snapshot = createSeedPlannerSnapshot();
  savePlannerSnapshot(snapshot, filePath);
  return snapshot;
}

export function deletePlannerSnapshot(filePath?: string) {
  const snapshotFilePath = resolveSnapshotFilePath(filePath);
  if (existsSync(snapshotFilePath)) {
    unlinkSync(snapshotFilePath);
  }
}
