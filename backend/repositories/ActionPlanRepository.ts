import { ActionPlanFolder } from '../../src/types';
import { INITIAL_ACTION_PLAN_FOLDERS } from '../../src/data/initialData';

export class ActionPlanRepository {
  private folders: Map<string, ActionPlanFolder> = new Map();

  constructor() {
    this.seedDefaults();
  }

  private seedDefaults() {
    this.folders.clear();
    for (const f of INITIAL_ACTION_PLAN_FOLDERS) {
      this.folders.set(f.id, { ...f });
    }
  }

  public findAll(): ActionPlanFolder[] {
    return Array.from(this.folders.values());
  }

  public findById(id: string): ActionPlanFolder | undefined {
    return this.folders.get(id);
  }

  public save(folder: ActionPlanFolder): ActionPlanFolder {
    this.folders.set(folder.id, { ...folder });
    return { ...folder };
  }
}

export const actionPlanRepository = new ActionPlanRepository();
