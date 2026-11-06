import { Router, Response } from 'express';
import { optionRepository } from '../repositories/OptionRepository';
import { ApiResponse } from '../entities/types';
import { SystemDropdownOption } from '../../src/types';
import {
  AuthenticatedRequest,
  requireAdmin,
  requireAuth
} from '../services/AuthService';
import { rejectImpersonationAttempt } from '../services/AuthorizationService';

export const optionController = Router();

// Require authenticated session for all option endpoints
optionController.use(requireAuth);

// GET all options (supports filtering by category & activeOnly)
optionController.get('/', (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res)) return;

  const category = req.query.category as string | undefined;
  const activeOnly = req.query.activeOnly === 'true';
  const list = optionRepository.getAll(category, activeOnly);

  const response: ApiResponse<SystemDropdownOption[]> = {
    timestamp: new Date().toISOString(),
    status: 200,
    success: true,
    message: `Retrieved ${list.length} dropdown options`,
    data: list
  };
  return res.status(200).json(response);
});

// GET option by ID
optionController.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res)) return;

  const opt = optionRepository.getById(req.params.id);
  if (!opt) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      success: false,
      message: `Option "${req.params.id}" not found`,
      data: null
    });
  }

  const response: ApiResponse<SystemDropdownOption> = {
    timestamp: new Date().toISOString(),
    status: 200,
    success: true,
    message: 'Option retrieved successfully',
    data: opt
  };
  return res.status(200).json(response);
});

// POST create option - Admin only
optionController.post('/', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res)) return;

  try {
    const body = req.body;
    if (!body.category || !body.label) {
      return res.status(400).json({
        timestamp: new Date().toISOString(),
        status: 400,
        success: false,
        message: 'Category and Label are required fields',
        data: null
      });
    }

    const created = await optionRepository.create({
      id: body.id || `opt_${body.category}_${Date.now().toString(36)}`,
      category: body.category,
      label: body.label.trim(),
      value: (body.value || body.label).trim(),
      description: body.description || '',
      order: body.order ? Number(body.order) : 0,
      isActive: body.isActive !== false,
      isSystemProtected: Boolean(body.isSystemProtected),
      metadata: body.metadata || {}
    });

    const response: ApiResponse<SystemDropdownOption> = {
      timestamp: new Date().toISOString(),
      status: 201,
      success: true,
      message: `Created dropdown option "${created.label}"`,
      data: created
    };
    return res.status(201).json(response);
  } catch (err: any) {
    return res.status(500).json({
      timestamp: new Date().toISOString(),
      status: 500,
      success: false,
      message: `Error creating option: ${err.message}`,
      data: null
    });
  }
});

// PUT update option - Admin only
optionController.put('/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res)) return;

  try {
    const updated = await optionRepository.update(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({
        timestamp: new Date().toISOString(),
        status: 404,
        success: false,
        message: `Option "${req.params.id}" not found`,
        data: null
      });
    }

    const response: ApiResponse<SystemDropdownOption> = {
      timestamp: new Date().toISOString(),
      status: 200,
      success: true,
      message: `Updated option "${updated.label}"`,
      data: updated
    };
    return res.status(200).json(response);
  } catch (err: any) {
    return res.status(500).json({
      timestamp: new Date().toISOString(),
      status: 500,
      success: false,
      message: `Error updating option: ${err.message}`,
      data: null
    });
  }
});

// DELETE option - Admin only
optionController.delete('/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res)) return;

  try {
    const success = await optionRepository.delete(req.params.id);
    if (!success) {
      return res.status(404).json({
        timestamp: new Date().toISOString(),
        status: 404,
        success: false,
        message: `Option "${req.params.id}" not found`,
        data: null
      });
    }

    const response: ApiResponse<{ id: string }> = {
      timestamp: new Date().toISOString(),
      status: 200,
      success: true,
      message: `Option "${req.params.id}" removed successfully`,
      data: { id: req.params.id }
    };
    return res.status(200).json(response);
  } catch (err: any) {
    return res.status(400).json({
      timestamp: new Date().toISOString(),
      status: 400,
      success: false,
      message: err.message,
      data: null
    });
  }
});

// POST reorder options - Admin only
optionController.post('/reorder', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res)) return;

  try {
    const { category, orderedIds } = req.body;
    if (!category || !Array.isArray(orderedIds)) {
      return res.status(400).json({
        timestamp: new Date().toISOString(),
        status: 400,
        success: false,
        message: 'category and orderedIds array are required',
        data: null
      });
    }

    await optionRepository.reorder(category, orderedIds);

    const response: ApiResponse<{ category: string }> = {
      timestamp: new Date().toISOString(),
      status: 200,
      success: true,
      message: `Reordered options for category "${category}"`,
      data: { category }
    };
    return res.status(200).json(response);
  } catch (err: any) {
    return res.status(500).json({
      timestamp: new Date().toISOString(),
      status: 500,
      success: false,
      message: `Error reordering options: ${err.message}`,
      data: null
    });
  }
});
