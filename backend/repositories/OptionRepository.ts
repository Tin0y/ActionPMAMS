import { SystemDropdownOption } from '../../src/types';
import { INITIAL_DROPDOWN_OPTIONS } from '../../src/data/initialData';
import { query, executeRawSql, sqlEscape } from '../database';

export class OptionRepository {
  private options: Map<string, SystemDropdownOption> = new Map();
  private isLoaded = false;

  constructor() {
    this.seedDefaults();
    this.loadFromDatabase().catch(err => {
      console.warn('[OptionRepository] Failed initial DB load, using defaults:', err.message);
    });
  }

  private seedDefaults() {
    for (const opt of INITIAL_DROPDOWN_OPTIONS) {
      this.options.set(opt.id, { ...opt });
    }
  }

  public async loadFromDatabase(): Promise<void> {
    try {
      const rows = await query<any>(`
        SELECT 
          id,
          category,
          label,
          value,
          description,
          display_order as "order",
          is_active as "isActive",
          is_system_protected as "isSystemProtected",
          metadata,
          created_at::text as "createdAt",
          updated_at::text as "updatedAt"
        FROM apmams.system_dropdown_options
        ORDER BY category, display_order ASC, label ASC
      `);

      if (rows && rows.length > 0) {
        this.options.clear();
        for (const row of rows) {
          if (row.id === 'opt_off_3' || row.value === 'OSA' || row.label === 'OSA') {
            continue;
          }
          this.options.set(row.id, {
            id: row.id,
            category: row.category,
            label: row.label,
            value: row.value,
            description: row.description || '',
            order: Number(row.order) || 0,
            isActive: Boolean(row.isActive),
            isSystemProtected: Boolean(row.isSystemProtected),
            metadata: row.metadata || {},
            createdAt: row.createdAt,
            updatedAt: row.updatedAt
          });
        }
        this.isLoaded = true;
        console.log(`[OptionRepository] Loaded ${this.options.size} dropdown options from PostgreSQL.`);

        // Ensure newly introduced system option categories (e.g. timeframe_week) exist when upgrading an existing DB
        const hasWeekCategory = rows.some((r: any) => r.category === 'timeframe_week');
        if (!hasWeekCategory) {
          const weekSeeds = INITIAL_DROPDOWN_OPTIONS.filter(o => o.category === 'timeframe_week');
          await this.persistSeedsToDb(weekSeeds);
          for (const seed of weekSeeds) {
            if (!this.options.has(seed.id)) {
              this.options.set(seed.id, { ...seed });
            }
          }
        }
      } else {
        // Table empty, persist default seeds
        await this.persistSeedsToDb();
      }
    } catch (err: any) {
      console.warn('[OptionRepository] DB query failed, relying on defaults:', err.message);
    }
  }

  private async persistSeedsToDb(seeds: SystemDropdownOption[] = INITIAL_DROPDOWN_OPTIONS) {
    for (const opt of seeds) {
      try {
        await executeRawSql(`
          INSERT INTO apmams.system_dropdown_options (
            id, category, label, value, description, display_order, is_active, is_system_protected, metadata
          ) VALUES (
            ${sqlEscape(opt.id)},
            ${sqlEscape(opt.category)},
            ${sqlEscape(opt.label)},
            ${sqlEscape(opt.value)},
            ${sqlEscape(opt.description || '')},
            ${opt.order || 0},
            ${opt.isActive !== false ? 'TRUE' : 'FALSE'},
            ${opt.isSystemProtected ? 'TRUE' : 'FALSE'},
            ${sqlEscape(opt.metadata || {})}
          ) ON CONFLICT (id) DO NOTHING;
        `);
      } catch (e) {
        // ignore seed collision
      }
    }
  }

  public getAll(category?: string, activeOnly = false): SystemDropdownOption[] {
    let list = Array.from(this.options.values()).filter(o => o.id !== 'opt_off_3' && o.value !== 'OSA' && o.label !== 'OSA');
    if (category && category !== 'ALL') {
      list = list.filter(o => o.category === category);
    }
    if (activeOnly) {
      list = list.filter(o => o.isActive !== false);
    }
    return list.sort((a, b) => (a.order - b.order) || a.label.localeCompare(b.label));
  }

  public getById(id: string): SystemDropdownOption | undefined {
    return this.options.get(id);
  }

  public async create(option: SystemDropdownOption): Promise<SystemDropdownOption> {
    const now = new Date().toISOString();
    const clean: SystemDropdownOption = {
      ...option,
      id: option.id || `opt_${option.category}_${Date.now().toString(36)}`,
      order: option.order ?? (this.getAll(option.category).length + 1),
      isActive: option.isActive !== false,
      isSystemProtected: Boolean(option.isSystemProtected),
      createdAt: now,
      updatedAt: now
    };

    this.options.set(clean.id, clean);

    try {
      await executeRawSql(`
        INSERT INTO apmams.system_dropdown_options (
          id, category, label, value, description, display_order, is_active, is_system_protected, metadata, created_at, updated_at
        ) VALUES (
          ${sqlEscape(clean.id)},
          ${sqlEscape(clean.category)},
          ${sqlEscape(clean.label)},
          ${sqlEscape(clean.value)},
          ${sqlEscape(clean.description || '')},
          ${clean.order},
          ${clean.isActive ? 'TRUE' : 'FALSE'},
          ${clean.isSystemProtected ? 'TRUE' : 'FALSE'},
          ${sqlEscape(clean.metadata || {})},
          ${sqlEscape(now)},
          ${sqlEscape(now)}
        ) ON CONFLICT (id) DO UPDATE SET
          label = EXCLUDED.label,
          value = EXCLUDED.value,
          description = EXCLUDED.description,
          display_order = EXCLUDED.display_order,
          is_active = EXCLUDED.is_active,
          updated_at = EXCLUDED.updated_at;
      `);
    } catch (err: any) {
      this.options.delete(clean.id);
      console.error('[OptionRepository] DB insert error:', err.message);
      throw err;
    }

    return clean;
  }

  public async update(id: string, updates: Partial<SystemDropdownOption>): Promise<SystemDropdownOption | null> {
    let existing = this.options.get(id);
    if (!existing) {
      await this.loadFromDatabase();
      existing = this.options.get(id);
    }
    if (!existing) return null;

    const now = new Date().toISOString();
    const updated: SystemDropdownOption = {
      ...existing,
      ...updates,
      id: existing.id, // prevent changing id
      isSystemProtected: existing.isSystemProtected, // preserve protection
      updatedAt: now
    };

    this.options.set(id, updated);

    try {
      await executeRawSql(`
        UPDATE apmams.system_dropdown_options SET
          label = ${sqlEscape(updated.label)},
          value = ${sqlEscape(updated.value)},
          description = ${sqlEscape(updated.description || '')},
          display_order = ${updated.order},
          is_active = ${updated.isActive ? 'TRUE' : 'FALSE'},
          updated_at = ${sqlEscape(now)}
        WHERE id = ${sqlEscape(id)};
      `);
    } catch (err: any) {
      this.options.set(id, existing);
      console.error('[OptionRepository] DB update error:', err.message);
      throw err;
    }

    return updated;
  }

  public async delete(id: string): Promise<boolean> {
    let existing = this.options.get(id);
    if (!existing) {
      await this.loadFromDatabase();
      existing = this.options.get(id);
    }
    if (!existing) return false;
    if (existing.isSystemProtected) {
      throw new Error(`Cannot delete protected system option: ${existing.label}`);
    }

    this.options.delete(id);

    try {
      await executeRawSql(`DELETE FROM apmams.system_dropdown_options WHERE id = ${sqlEscape(id)};`);
    } catch (err: any) {
      this.options.set(id, existing);
      console.error('[OptionRepository] DB delete error:', err.message);
      throw err;
    }

    return true;
  }

  public async reorder(category: string, orderedIds: string[]): Promise<void> {
    const statements: string[] = [];
    const snapshots = new Map<string, SystemDropdownOption>();

    for (let i = 0; i < orderedIds.length; i++) {
      const id = orderedIds[i];
      const opt = this.options.get(id);
      if (opt && opt.category === category) {
        snapshots.set(id, { ...opt });
        opt.order = i + 1;
        opt.updatedAt = new Date().toISOString();
        statements.push(`
          UPDATE apmams.system_dropdown_options 
          SET display_order = ${opt.order}, updated_at = CURRENT_TIMESTAMP 
          WHERE id = ${sqlEscape(id)};
        `);
      }
    }

    if (statements.length === 0) return;

    try {
      await executeRawSql(`BEGIN;\n${statements.join('\n')}\nCOMMIT;`);
    } catch (err: any) {
      for (const [id, prev] of snapshots.entries()) {
        this.options.set(id, prev);
      }
      console.error('[OptionRepository] DB reorder error:', err.message);
      throw err;
    }
  }
}

export const optionRepository = new OptionRepository();

