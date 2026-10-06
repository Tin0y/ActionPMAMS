import { Router, Request, Response } from 'express';
import { organizationRepository } from '../repositories/OrganizationRepository';
import { ApiResponse } from '../entities/types';
import { StudentOrganization } from '../../types';

export const organizationController = Router();

organizationController.get('/', (_req: Request, res: Response) => {
  const orgs = organizationRepository.findAll();
  const response: ApiResponse<StudentOrganization[]> = {
    timestamp: new Date().toISOString(),
    status: 200,
    success: true,
    message: `Retrieved ${orgs.length} student organizations`,
    data: orgs
  };
  return res.status(200).json(response);
});

organizationController.get('/:id', (req: Request, res: Response) => {
  const org = organizationRepository.findById(req.params.id);
  if (!org) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      success: false,
      message: `Organization ${req.params.id} not found.`
    });
  }
  return res.status(200).json({
    timestamp: new Date().toISOString(),
    status: 200,
    success: true,
    message: 'Organization retrieved',
    data: org
  });
});
