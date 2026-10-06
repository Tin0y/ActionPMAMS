import { Router } from 'express';
import { activityController } from './controllers/ActivityController';
import { actionPlanController } from './controllers/ActionPlanController';
import { organizationController } from './controllers/OrganizationController';
import { userController } from './controllers/UserController';

export const apiRouter = Router();

apiRouter.use('/activities', activityController);
apiRouter.use('/action-plans', actionPlanController);
apiRouter.use('/organizations', organizationController);
apiRouter.use('/users', userController);

export { 
  activityController, 
  actionPlanController, 
  organizationController, 
  userController 
};
