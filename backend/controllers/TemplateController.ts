import { Router, Response } from 'express';
import { templateRepository } from '../repositories/TemplateRepository';
import { ApiResponse } from '../entities/types';
import { ActionPlanTemplate } from '../../src/types';
import {
  AuthenticatedRequest,
  requireAdmin,
  requireAuth
} from '../services/AuthService';
import { rejectImpersonationAttempt } from '../services/AuthorizationService';

export const templateController = Router();

// Require authenticated session for all template endpoints
templateController.use(requireAuth);

// GET all templates
templateController.get('/', (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res)) return;

  const templates = templateRepository.findAll();
  const response: ApiResponse<ActionPlanTemplate[]> = {
    timestamp: new Date().toISOString(),
    status: 200,
    success: true,
    message: `Retrieved ${templates.length} action plan templates`,
    data: templates
  };
  return res.status(200).json(response);
});

// GET template by ID
templateController.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res)) return;

  const template = templateRepository.findById(req.params.id);
  if (!template) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      success: false,
      message: `Template with ID "${req.params.id}" not found`
    });
  }
  return res.status(200).json({
    timestamp: new Date().toISOString(),
    status: 200,
    success: true,
    message: 'Template retrieved successfully',
    data: template
  });
});

// POST create new template - Admin only
templateController.post('/', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res)) return;

  try {
    const raw = req.body;
    if (!raw.name || !raw.columns || !Array.isArray(raw.columns)) {
      return res.status(400).json({
        timestamp: new Date().toISOString(),
        status: 400,
        success: false,
        message: 'Invalid template payload: name and columns array are required'
      });
    }

    const newId = raw.id || `TEMPLATE-${Date.now().toString(36).toUpperCase()}`;
    const toSave: ActionPlanTemplate = {
      id: newId,
      name: raw.name,
      description: raw.description || '',
      version: Number(raw.version || 1),
      isDefault: Boolean(raw.isDefault),
      headerTitle: raw.headerTitle || 'PLAN OF ACTIVITIES',
      headerSubTitle: raw.headerSubTitle || '[ORGANIZATION NAME]',
      headerColor: raw.headerColor || '#800000',
      headerTextColor: raw.headerTextColor || '#FFFFFF',
      subHeaderColor: raw.subHeaderColor || '#FCE5CD',
      subHeaderTextColor: raw.subHeaderTextColor || '#1E293B',
      footerLabel: raw.footerLabel || 'Total Projected Budget (excluding office supplies, allowances and wages)',
      budgetCalculationRule: raw.budgetCalculationRule || 'SUM_ALL',
      columns: raw.columns,
      status: raw.status || 'Draft',
      allowTextWrap: raw.allowTextWrap !== false,
      showBorders: raw.showBorders !== false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const saved = templateRepository.save(toSave);
    return res.status(201).json({
      timestamp: new Date().toISOString(),
      status: 201,
      success: true,
      message: 'Action plan template created successfully',
      data: saved
    });
  } catch (err: any) {
    return res.status(500).json({
      timestamp: new Date().toISOString(),
      status: 500,
      success: false,
      message: err.message || 'Failed to create template'
    });
  }
});

// PUT update template - Admin only
templateController.put('/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res)) return;

  try {
    const existing = templateRepository.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({
        timestamp: new Date().toISOString(),
        status: 404,
        success: false,
        message: `Template with ID "${req.params.id}" not found`
      });
    }

    const updated = templateRepository.save({
      ...existing,
      ...req.body,
      id: existing.id
    });

    return res.status(200).json({
      timestamp: new Date().toISOString(),
      status: 200,
      success: true,
      message: `Template "${updated.name}" updated successfully (Version ${updated.version})`,
      data: updated
    });
  } catch (err: any) {
    return res.status(500).json({
      timestamp: new Date().toISOString(),
      status: 500,
      success: false,
      message: err.message || 'Failed to update template'
    });
  }
});

// POST duplicate template - Admin only
templateController.post('/:id/duplicate', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res)) return;

  const duplicated = templateRepository.duplicate(req.params.id, req.body?.name);
  if (!duplicated) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      success: false,
      message: `Source template with ID "${req.params.id}" not found`
    });
  }

  return res.status(201).json({
    timestamp: new Date().toISOString(),
    status: 201,
    success: true,
    message: `Template duplicated successfully as "${duplicated.name}"`,
    data: duplicated
  });
});

// POST publish template - Admin only
templateController.post('/:id/publish', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res)) return;

  const published = templateRepository.publish(req.params.id);
  if (!published) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      success: false,
      message: `Template with ID "${req.params.id}" not found`
    });
  }

  return res.status(200).json({
    timestamp: new Date().toISOString(),
    status: 200,
    success: true,
    message: `Template "${published.name}" has been published (Version ${published.version})`,
    data: published
  });
});

// DELETE template - Admin only
templateController.delete('/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res)) return;

  try {
    const success = templateRepository.delete(req.params.id);
    if (!success) {
      return res.status(404).json({
        timestamp: new Date().toISOString(),
        status: 404,
        success: false,
        message: `Template with ID "${req.params.id}" not found`
      });
    }

    return res.status(200).json({
      timestamp: new Date().toISOString(),
      status: 200,
      success: true,
      message: 'Action plan template deleted successfully'
    });
  } catch (err: any) {
    return res.status(400).json({
      timestamp: new Date().toISOString(),
      status: 400,
      success: false,
      message: err.message || 'Failed to delete template'
    });
  }
});
