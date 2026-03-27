import type { ReviewFlowState } from "../../../src/types/domain";
import type { PlannerData } from "../../../src/types/planner";
import {
  createSeedPlannerSnapshot,
  type PlannerPersistenceAdapter,
  type PlannerStoreSnapshot,
} from "./plannerPersistence";

export class PlannerStore {
  private plannerData: PlannerData;
  private reviewFlowState: ReviewFlowState;
  private readonly persistence: PlannerPersistenceAdapter;

  constructor(
    initialSnapshot: PlannerStoreSnapshot = createSeedPlannerSnapshot(),
    options: { persistence: PlannerPersistenceAdapter },
  ) {
    this.plannerData = structuredClone(initialSnapshot.plannerData);
    this.reviewFlowState = structuredClone(initialSnapshot.reviewFlowState);
    this.persistence = options.persistence;
  }

  read(): PlannerData {
    return structuredClone(this.plannerData);
  }

  readReviewState(): ReviewFlowState {
    return structuredClone(this.reviewFlowState);
  }

  readSnapshot() {
    return {
      plannerData: this.read(),
      reviewFlowState: this.readReviewState(),
    };
  }

  async replaceSnapshot(nextSnapshot: PlannerStoreSnapshot) {
    this.plannerData = structuredClone(nextSnapshot.plannerData);
    this.reviewFlowState = structuredClone(nextSnapshot.reviewFlowState);
    await this.persist();
  }

  async write(nextData: PlannerData) {
    this.plannerData = structuredClone(nextData);
    await this.persist();
  }

  async writeReviewState(nextState: ReviewFlowState) {
    this.reviewFlowState = structuredClone(nextState);
    await this.persist();
  }

  async reset() {
    await this.replaceSnapshot(createSeedPlannerSnapshot());
  }

  private async persist() {
    await this.persistence.save({
      plannerData: this.plannerData,
      reviewFlowState: this.reviewFlowState,
    });
  }
}
