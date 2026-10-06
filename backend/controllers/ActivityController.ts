import { Router, Request, Response } from 'express';
import { activityRepository } from '../repositories/ActivityRepository';
import { userRepository } from '../repositories/UserRepository';
import { workflowService } from '../services/WorkflowService';
import { ApiResponse, WorkflowAdvanceDTO, ExternalClearanceDTO, RevisionRequestDTO } from '../entities/types';
import { Activity } from '../../src/types';

export const activityController = Router();

/**
 * GET /api/activities
 * Spring Boot equivalent: @GetMapping
 */
activityController.get('/', (req: Request, res: Response) => {
  const { orgId, fiscalYear, status } = req.query;
  const activities = activityRepository.findAll({
    orgId: typeof orgId === 'string' ? orgId : undefined,
    fiscalYear: typeof fiscalYear === 'string' ? fiscalYear : undefined,
    status: typeof status === 'string' ? status : undefined
  });

  const response: ApiResponse<Activity[]> = {
    timestamp: new Date().toISOString(),
    status: 200,
    success: true,
    message: `Retrieved ${activities.length} activities`,
    data: activities
  };
  return res.status(200).json(response);
});

/**
 * GET /api/activities/:id
 * Spring Boot equivalent: @GetMapping("/{id}")
 */
activityController.get('/:id', (req: Request, res: Response) => {
  const activity = activityRepository.findById(req.params.id);
  if (!activity) {
    const errorResponse: ApiResponse = {
      timestamp: new Date().toISOString(),
      status: 404,
      success: false,
      message: `Activity with id "${req.params.id}" not found`
    };
    return res.status(404).json(errorResponse);
  }

  const response: ApiResponse<Activity> = {
    timestamp: new Date().toISOString(),
    status: 200,
    success: true,
    message: 'Activity retrieved successfully',
    data: activity
  };
  return res.status(200).json(response);
});

/**
 * POST /api/activities
 * Spring Boot equivalent: @PostMapping
 */
activityController.post('/', (req: Request, res: Response) => {
  const body = req.body as Activity;
  if (!body.title || !body.orgId) {
    return res.status(400).json({
      timestamp: new Date().toISOString(),
      status: 400,
      success: false,
      message: 'Validation failed: Title and Organization are required.'
    });
  }

  if (!body.timeline || body.timeline.length === 0) {
    body.timeline = workflowService.getStagesForOrg(body.orgId);
  }

  const saved = activityRepository.save(body);
  return res.status(201).json({
    timestamp: new Date().toISOString(),
    status: 201,
    success: true,
    message: `Activity "${saved.title}" created successfully with ${workflowService.isCollege(saved.orgId) ? '4-stage College' : '3-stage Non-College'} workflow.`,
    data: saved
  });
});

/**
 * PUT /api/activities/:id
 * Spring Boot equivalent: @PutMapping("/{id}")
 */
activityController.put('/:id', (req: Request, res: Response) => {
  const existing = activityRepository.findById(req.params.id);
  if (!existing) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      success: false,
      message: `Activity ${req.params.id} not found.`
    });
  }

  const updated = activityRepository.save({
    ...existing,
    ...req.body,
    id: req.params.id
  });

  return res.status(200).json({
    timestamp: new Date().toISOString(),
    status: 200,
    success: true,
    message: 'Activity updated successfully',
    data: updated
  });
});

/**
 * POST /api/activities/:id/advance
 * Spring Boot equivalent: @PostMapping("/{id}/advance")
 * Enforces proper routing per organization:
 * - Non-College (SSC, KAABAG, SENSSO, TME): Org Pres -> Org Adviser -> OSD Director
 * - College (CBIT, CELS, CFMS, CESS): Org Pres -> Org Adviser -> College Dean -> OSD Director
 */
activityController.post('/:id/advance', (req: Request, res: Response) => {
  const activity = activityRepository.findById(req.params.id);
  if (!activity) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      success: false,
      message: `Activity ${req.params.id} not found.`
    });
  }

  const payload = req.body as WorkflowAdvanceDTO;
  const user = userRepository.findById(payload.userId);
  if (!user) {
    return res.status(401).json({
      timestamp: new Date().toISOString(),
      status: 401,
      success: false,
      message: 'Unauthorized: User account not found. Please log in.'
    });
  }

  const result = workflowService.advanceStep(activity, user, payload.stepId, payload.remarks);
  if (!result.success || !result.updatedActivity) {
    return res.status(result.statusCode).json({
      timestamp: new Date().toISOString(),
      status: result.statusCode,
      success: false,
      message: result.message
    });
  }

  const saved = activityRepository.save(result.updatedActivity);
  return res.status(200).json({
    timestamp: new Date().toISOString(),
    status: 200,
    success: true,
    message: result.message,
    data: saved
  });
});

/**
 * POST /api/activities/:id/defer
 * Replaces "Reject". Requires remark/reason. Marks status DEFERRED and returns to Organization.
 */
activityController.post('/:id/defer', (req: Request, res: Response) => {
  const activity = activityRepository.findById(req.params.id);
  if (!activity) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      success: false,
      message: `Activity ${req.params.id} not found.`
    });
  }

  const { userId, reason, stageId } = req.body;
  const user = userRepository.findById(userId);
  if (!user) {
    return res.status(401).json({
      timestamp: new Date().toISOString(),
      status: 401,
      success: false,
      message: 'Unauthorized: User account not found.'
    });
  }

  const result = workflowService.deferActivity(activity, user, reason, stageId);
  if (!result.success || !result.updatedActivity) {
    return res.status(result.statusCode).json({
      timestamp: new Date().toISOString(),
      status: result.statusCode,
      success: false,
      message: result.message
    });
  }

  const saved = activityRepository.save(result.updatedActivity);
  return res.status(200).json({
    timestamp: new Date().toISOString(),
    status: 200,
    success: true,
    message: result.message,
    data: saved
  });
});

/**
 * POST /api/activities/:id/resubmit
 * Allows organization user to resubmit a deferred activity after revision
 */
activityController.post('/:id/resubmit', (req: Request, res: Response) => {
  const activity = activityRepository.findById(req.params.id);
  if (!activity) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      success: false,
      message: `Activity ${req.params.id} not found.`
    });
  }

  const { userId, notes } = req.body;
  const user = userRepository.findById(userId);
  if (!user) {
    return res.status(401).json({
      timestamp: new Date().toISOString(),
      status: 401,
      success: false,
      message: 'Unauthorized: User account not found.'
    });
  }

  const result = workflowService.resubmitActivity(activity, user, notes);
  if (!result.success || !result.updatedActivity) {
    return res.status(result.statusCode).json({
      timestamp: new Date().toISOString(),
      status: result.statusCode,
      success: false,
      message: result.message
    });
  }

  const saved = activityRepository.save(result.updatedActivity);
  return res.status(200).json({
    timestamp: new Date().toISOString(),
    status: 200,
    success: true,
    message: result.message,
    data: saved
  });
});

/**
 * POST /api/activities/:id/external-clearance
 * Spring Boot equivalent: @PostMapping("/{id}/external-clearance")
 * Final executive approval by organization leadership once OVCSAS & Office of the Chancellor clear the proposal
 */
activityController.post('/:id/external-clearance', (req: Request, res: Response) => {
  const activity = activityRepository.findById(req.params.id);
  if (!activity) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      success: false,
      message: `Activity ${req.params.id} not found.`
    });
  }

  const payload = req.body as ExternalClearanceDTO;
  const user = userRepository.findById(payload.userId);
  if (!user) {
    return res.status(401).json({
      timestamp: new Date().toISOString(),
      status: 401,
      success: false,
      message: 'Unauthorized: User account not found.'
    });
  }

  const result = workflowService.confirmExternalClearance(activity, user);
  if (!result.success || !result.updatedActivity) {
    return res.status(result.statusCode).json({
      timestamp: new Date().toISOString(),
      status: result.statusCode,
      success: false,
      message: result.message
    });
  }

  const saved = activityRepository.save(result.updatedActivity);
  return res.status(200).json({
    timestamp: new Date().toISOString(),
    status: 200,
    success: true,
    message: result.message,
    data: saved
  });
});

/**
 * POST /api/activities/:id/revision
 * Spring Boot equivalent: @PostMapping("/{id}/revision")
 */
activityController.post('/:id/revision', (req: Request, res: Response) => {
  const activity = activityRepository.findById(req.params.id);
  if (!activity) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      success: false,
      message: `Activity ${req.params.id} not found.`
    });
  }

  const payload = req.body as RevisionRequestDTO;
  const user = userRepository.findById(payload.userId);
  if (!user) {
    return res.status(401).json({
      timestamp: new Date().toISOString(),
      status: 401,
      success: false,
      message: 'Unauthorized: User account not found.'
    });
  }

  const result = workflowService.requestRevision(activity, user, payload.reason);
  const saved = activityRepository.save(result.updatedActivity!);
  return res.status(200).json({
    timestamp: new Date().toISOString(),
    status: 200,
    success: true,
    message: result.message,
    data: saved
  });
});

/**
 * POST /api/activities/reset-stage-one
 * Spring Boot equivalent: @PostMapping("/reset-stage-one")
 */
activityController.post('/reset-stage-one', (_req: Request, res: Response) => {
  const resetList = activityRepository.resetAllToStageOne();
  return res.status(200).json({
    timestamp: new Date().toISOString(),
    status: 200,
    success: true,
    message: 'All activities successfully reset to Stage 1 with proper Non-College (3-stage) and College (4-stage) routing workflows.',
    data: resetList
  });
});
