import { Activity } from '../../types';
import { INITIAL_ACTIVITIES, getWorkflowTimelineForOrg } from '../../data/initialData';

export class ActivityRepository {
  private activities: Map<string, Activity> = new Map();

  constructor() {
    this.seedDefaults();
  }

  private seedDefaults() {
    this.activities.clear();
    for (const act of INITIAL_ACTIVITIES) {
      const cloned: Activity = JSON.parse(JSON.stringify(act));
      this.activities.set(cloned.id, cloned);
    }
  }

  public findAll(filter?: { orgId?: string; fiscalYear?: string; status?: string }): Activity[] {
    let list = Array.from(this.activities.values());
    if (filter?.orgId && filter.orgId !== 'ALL') {
      list = list.filter(a => a.orgId.toUpperCase() === filter.orgId!.toUpperCase());
    }
    if (filter?.fiscalYear) {
      list = list.filter(a => a.fiscalYear === filter.fiscalYear);
    }
    if (filter?.status) {
      list = list.filter(a => a.status === filter.status);
    }
    return list;
  }

  public findById(id: string): Activity | undefined {
    return this.activities.get(id);
  }

  public save(activity: Activity): Activity {
    this.activities.set(activity.id, { ...activity });
    return { ...activity };
  }

  public deleteById(id: string): boolean {
    return this.activities.delete(id);
  }

  public resetAllToStageOne(): Activity[] {
    this.seedDefaults();
    return this.findAll();
  }
}

export const activityRepository = new ActivityRepository();
