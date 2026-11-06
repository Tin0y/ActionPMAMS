import { ActionPlanTemplate } from '../../src/types';
import { INITIAL_ACTION_PLAN_TEMPLATES } from '../../src/data/initialData';
import { query, executeRawSql, sqlEscape } from '../database';

export class TemplateRepository {
  private templates: Map<string, ActionPlanTemplate> = new Map();
  private isLoaded = false;

  constructor() {
    this.seedDefaults();
    this.loadFromDatabase().catch(err => {
      console.warn('[TemplateRepository] Failed initial DB load, using defaults:', err.message);
    });
  }

  private seedDefaults() {
    for (const t of INITIAL_ACTION_PLAN_TEMPLATES) {
      this.templates.set(t.id, { ...t });
    }
  }

  public async loadFromDatabase(): Promise<void> {
    try {
      const rows = await query<any>(`
        SELECT 
          id,
          name,
          description,
          version,
          is_default as "isDefault",
          header_title as "headerTitle",
          header_subtitle as "headerSubTitle",
          header_color as "headerColor",
          header_text_color as "headerTextColor",
          sub_header_color as "subHeaderColor",
          sub_header_text_color as "subHeaderTextColor",
          footer_label as "footerLabel",
          budget_calculation_rule as "budgetCalculationRule",
          columns,
          status,
          allow_text_wrap as "allowTextWrap",
          show_borders as "showBorders",
          created_at::text as "createdAt",
          updated_at::text as "updatedAt"
        FROM apmams.action_plan_templates
        ORDER BY is_default DESC, template_id ASC;
      `);

      if (rows && rows.length > 0) {
        for (const row of rows) {
          const existing = this.templates.get(row.id) || {} as ActionPlanTemplate;
          this.templates.set(row.id, {
            ...existing,
            ...row,
            id: row.id,
            name: row.name || existing.name,
            version: Number(row.version ?? existing.version ?? 1),
            isDefault: Boolean(row.isDefault),
            headerTitle: row.headerTitle || existing.headerTitle || 'PLAN OF ACTIVITIES',
            headerSubTitle: row.headerSubTitle || existing.headerSubTitle || '[ORGANIZATION NAME]',
            headerColor: row.headerColor || existing.headerColor || '#800000',
            headerTextColor: row.headerTextColor || existing.headerTextColor || '#FFFFFF',
            subHeaderColor: row.subHeaderColor || existing.subHeaderColor || '#FCE5CD',
            subHeaderTextColor: row.subHeaderTextColor || existing.subHeaderTextColor || '#1E293B',
            footerLabel: row.footerLabel || existing.footerLabel || '',
            budgetCalculationRule: row.budgetCalculationRule || existing.budgetCalculationRule || 'SUM_ALL',
            columns: Array.isArray(row.columns) ? row.columns : (existing.columns || []),
            status: row.status || existing.status || 'Published',
            allowTextWrap: row.allowTextWrap !== false,
            showBorders: row.showBorders !== false,
            createdAt: row.createdAt || existing.createdAt || new Date().toISOString(),
            updatedAt: row.updatedAt || existing.updatedAt || new Date().toISOString()
          });
        }
        this.isLoaded = true;
        console.log(`[TemplateRepository] Loaded ${rows.length} templates from PostgreSQL.`);
      }
    } catch (err: any) {
      console.warn('[TemplateRepository] loadFromDatabase error:', err.message);
    }
  }

  public findAll(): ActionPlanTemplate[] {
    return Array.from(this.templates.values());
  }

  public findById(id: string): ActionPlanTemplate | undefined {
    return this.templates.get(id);
  }

  public save(template: ActionPlanTemplate): ActionPlanTemplate {
    const existing = this.templates.get(template.id);
    const now = new Date().toISOString();
    
    // If modifying an already published template and columns or structure changed, bump version
    let version = template.version || 1;
    if (existing && existing.status === 'Published' && template.status === 'Published') {
      const changed = JSON.stringify(existing.columns) !== JSON.stringify(template.columns);
      if (changed) {
        version = existing.version + 1;
      }
    }

    const saved: ActionPlanTemplate = {
      ...template,
      version,
      updatedAt: now,
      createdAt: template.createdAt || existing?.createdAt || now
    };

    this.templates.set(saved.id, saved);

    // Asynchronously persist to PostgreSQL
    const sql = `
      INSERT INTO apmams.action_plan_templates (
        id, name, description, version, is_default, header_title, header_subtitle,
        header_color, header_text_color, sub_header_color, sub_header_text_color,
        footer_label, budget_calculation_rule, columns, status, allow_text_wrap, show_borders,
        updated_at
      ) VALUES (
        ${sqlEscape(saved.id)},
        ${sqlEscape(saved.name)},
        ${sqlEscape(saved.description || '')},
        ${saved.version},
        ${saved.isDefault ? 'TRUE' : 'FALSE'},
        ${sqlEscape(saved.headerTitle)},
        ${sqlEscape(saved.headerSubTitle || '[ORGANIZATION NAME]')},
        ${sqlEscape(saved.headerColor)},
        ${sqlEscape(saved.headerTextColor)},
        ${sqlEscape(saved.subHeaderColor || '#FCE5CD')},
        ${sqlEscape(saved.subHeaderTextColor || '#1E293B')},
        ${sqlEscape(saved.footerLabel || '')},
        ${sqlEscape(saved.budgetCalculationRule || 'SUM_ALL')},
        ${sqlEscape(saved.columns)},
        ${sqlEscape(saved.status)},
        ${saved.allowTextWrap !== false ? 'TRUE' : 'FALSE'},
        ${saved.showBorders !== false ? 'TRUE' : 'FALSE'},
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        version = EXCLUDED.version,
        is_default = EXCLUDED.is_default,
        header_title = EXCLUDED.header_title,
        header_subtitle = EXCLUDED.header_subtitle,
        header_color = EXCLUDED.header_color,
        header_text_color = EXCLUDED.header_text_color,
        sub_header_color = EXCLUDED.sub_header_color,
        sub_header_text_color = EXCLUDED.sub_header_text_color,
        footer_label = EXCLUDED.footer_label,
        budget_calculation_rule = EXCLUDED.budget_calculation_rule,
        columns = EXCLUDED.columns,
        status = EXCLUDED.status,
        allow_text_wrap = EXCLUDED.allow_text_wrap,
        show_borders = EXCLUDED.show_borders,
        updated_at = NOW();
    `;

    executeRawSql(sql).catch(err => {
      console.warn('[TemplateRepository] DB save failed:', err.message);
    });

    return saved;
  }

  public duplicate(id: string, newName?: string): ActionPlanTemplate | null {
    const source = this.templates.get(id);
    if (!source) return null;

    const newId = `TEMPLATE-${Date.now().toString(36).toUpperCase()}`;
    const duplicated: ActionPlanTemplate = {
      ...JSON.parse(JSON.stringify(source)),
      id: newId,
      name: newName || `Copy of ${source.name}`,
      version: 1,
      isDefault: false,
      status: 'Draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return this.save(duplicated);
  }

  public publish(id: string): ActionPlanTemplate | null {
    const existing = this.templates.get(id);
    if (!existing) return null;

    const published: ActionPlanTemplate = {
      ...existing,
      status: 'Published',
      updatedAt: new Date().toISOString()
    };

    return this.save(published);
  }

  public delete(id: string): boolean {
    const existing = this.templates.get(id);
    if (!existing) return false;
    if (existing.isDefault || id === 'TEMPLATE-MSUN-DEFAULT') {
      throw new Error('Cannot delete default system template');
    }
    this.templates.delete(id);

    const sql = `DELETE FROM apmams.action_plan_templates WHERE id = ${sqlEscape(id)}`;
    executeRawSql(sql).catch(err => {
      console.warn(`[TemplateRepository] DB delete failed:`, err.message);
    });
    return true;
  }
}

export const templateRepository = new TemplateRepository();
