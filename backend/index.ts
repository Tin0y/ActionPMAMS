import { Router } from 'express';
import { activityController } from './controllers/ActivityController';
import { actionPlanController } from './controllers/ActionPlanController';
import { organizationController } from './controllers/OrganizationController';
import { userController } from './controllers/UserController';
import { notificationController } from './controllers/NotificationController';

export const apiRouter = Router();

apiRouter.use('/activities', activityController);
apiRouter.use('/action-plans', actionPlanController);
apiRouter.use('/organizations', organizationController);
apiRouter.use('/users', userController);
apiRouter.use('/notifications', notificationController);

export { 
  activityController, 
  actionPlanController, 
  organizationController, 
  userController,
  notificationController
};
