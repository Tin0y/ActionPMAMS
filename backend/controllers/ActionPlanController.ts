import { Router, Request, Response } from 'express';
import { actionPlanRepository } from '../repositories/ActionPlanRepository';
import { ApiResponse } from '../entities/types';
import { ActionPlanFolder } from '../../src/types';

export const actionPlanController = Router();

actionPlanController.get('/', (_req: Request, res: Response) => {
  const folders = actionPlanRepository.findAll();
  const response: ApiResponse<ActionPlanFolder[]> = {
    timestamp: new Date().toISOString(),
    status: 200,
    success: true,
    message: `Retrieved ${folders.length} action plan repositories`,
    data: folders
  };
  return res.status(200).json(response);
});

actionPlanController.get('/:id', (req: Request, res: Response) => {
  const folder = actionPlanRepository.findById(req.params.id);
  if (!folder) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      success: false,
      message: `Action plan ${req.params.id} not found.`
    });
  }
  return res.status(200).json({
    timestamp: new Date().toISOString(),
    status: 200,
    success: true,
    message: 'Action plan retrieved',
    data: folder
  });
});

actionPlanController.post('/', (req: Request, res: Response) => {
  const saved = actionPlanRepository.save(req.body);
  return res.status(201).json({
    timestamp: new Date().toISOString(),
    status: 201,
    success: true,
    message: 'Action plan created',
    data: saved
  });
});
