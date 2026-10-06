import { StudentOrganization } from '../../types';
import { ORGANIZATIONS } from '../../data/initialData';

export class OrganizationRepository {
  private orgs: Map<string, StudentOrganization> = new Map();

  constructor() {
    this.seedDefaults();
  }

  private seedDefaults() {
    this.orgs.clear();
    for (const org of ORGANIZATIONS) {
      this.orgs.set(org.id, { ...org });
    }
  }

  public findAll(): StudentOrganization[] {
    return Array.from(this.orgs.values());
  }

  public findById(id: string): StudentOrganization | undefined {
    return this.orgs.get(id);
  }

  public save(org: StudentOrganization): StudentOrganization {
    this.orgs.set(org.id, { ...org });
    return { ...org };
  }
}

export const organizationRepository = new OrganizationRepository();
