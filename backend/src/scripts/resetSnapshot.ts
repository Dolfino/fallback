import {
  getPlannerSnapshotFilePath,
  resetPlannerPersistence,
} from "../state/plannerPersistence";

const { snapshot, adapter } = await resetPlannerPersistence();

console.log(
  [
    "Planner snapshot resetado.",
    adapter.kind === "postgres"
      ? `Persistência: ${adapter.label}`
      : `Arquivo: ${getPlannerSnapshotFilePath()}`,
    `Data operacional: ${snapshot.plannerData.dataOperacional}`,
  ].join("\n"),
);

await adapter.close();
