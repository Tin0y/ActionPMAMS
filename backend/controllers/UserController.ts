import { Router, Request, Response } from 'express';
import { userRepository } from '../repositories/UserRepository';
import { ApiResponse } from '../entities/types';
import { UserAccount } from '../../src/types';

export const userController = Router();

userController.get('/', (_req: Request, res: Response) => {
  const users = userRepository.findAll();
  const response: ApiResponse<UserAccount[]> = {
    timestamp: new Date().toISOString(),
    status: 200,
    success: true,
    message: `Retrieved ${users.length} user accounts`,
    data: users
  };
  return res.status(200).json(response);
});

userController.get('/:id', (req: Request, res: Response) => {
  const user = userRepository.findById(req.params.id);
  if (!user) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      success: false,
      message: `User ${req.params.id} not found.`
    });
  }
  return res.status(200).json({
    timestamp: new Date().toISOString(),
    status: 200,
    success: true,
    message: 'User retrieved',
    data: user
  });
});

userController.post('/', (req: Request, res: Response) => {
  const saved = userRepository.save(req.body);
  return res.status(201).json({
    timestamp: new Date().toISOString(),
    status: 201,
    success: true,
    message: 'User created',
    data: saved
  });
});
