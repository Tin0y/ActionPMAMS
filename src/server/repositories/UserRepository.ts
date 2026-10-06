import { UserAccount } from '../../types';
import { INITIAL_USER_ACCOUNTS } from '../../data/initialData';

export class UserRepository {
  private users: Map<string, UserAccount> = new Map();

  constructor() {
    this.seedDefaults();
  }

  private seedDefaults() {
    this.users.clear();
    for (const u of INITIAL_USER_ACCOUNTS) {
      this.users.set(u.id, { ...u });
    }
  }

  public findAll(): UserAccount[] {
    return Array.from(this.users.values());
  }

  public findById(id: string): UserAccount | undefined {
    return this.users.get(id);
  }

  public findByEmail(email: string): UserAccount | undefined {
    return Array.from(this.users.values()).find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public save(user: UserAccount): UserAccount {
    this.users.set(user.id, { ...user });
    return { ...user };
  }

  public deleteById(id: string): boolean {
    return this.users.delete(id);
  }
}

export const userRepository = new UserRepository();
