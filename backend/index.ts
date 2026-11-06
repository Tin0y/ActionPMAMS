import { Router } from 'express';
import { activityController } from './controllers/ActivityController';
import { activityRepository } from './repositories/ActivityRepository';
import { checkVenueAvailability } from '../src/utils/conflictDetection';
import { actionPlanController } from './controllers/ActionPlanController';
import { organizationController } from './controllers/OrganizationController';
import { userController } from './controllers/UserController';
import { authController } from './controllers/AuthController';
import { notificationController } from './controllers/NotificationController';
import { fiscalYearController } from './controllers/FiscalYearController';
import { templateController } from './controllers/TemplateController';
import { optionController } from './controllers/OptionController';
import { AuthenticatedRequest, requireAuth } from './services/AuthService';
import { rejectImpersonationAttempt } from './services/AuthorizationService';
import {
  applySecurityHeaders,
  corsMiddleware,
  csrfProtection,
  sanitizeErrorResponse
} from './middleware/securityMiddleware';

export const apiRouter = Router();

// Apply Enterprise Security Controls across all API routes
apiRouter.use(applySecurityHeaders);
apiRouter.use(corsMiddleware);
apiRouter.use(csrfProtection);

apiRouter.use('/activities', activityController);

apiRouter.get('/venues/availability', requireAuth, (req: AuthenticatedRequest, res) => {
  if (rejectImpersonationAttempt(req, res)) return;

  const { venue, date, timeRange } = req.query;
  const allActs = activityRepository.findAll();
  const result = checkVenueAvailability(
    typeof venue === 'string' ? venue : '',
    typeof date === 'string' ? date : '',
    allActs,
    typeof timeRange === 'string' ? timeRange : undefined
  );
  return res.status(200).json({
    timestamp: new Date().toISOString(),
    status: 200,
    success: true,
    data: result
  });
});

apiRouter.use('/action-plans', actionPlanController);
apiRouter.use('/organizations', organizationController);
apiRouter.use('/auth', authController);
apiRouter.use('/users', userController);
apiRouter.use('/notifications', notificationController);
apiRouter.use('/fiscal-years', fiscalYearController);
apiRouter.use('/templates', templateController);
apiRouter.use('/options', optionController);

// Global sanitized production error handler
apiRouter.use(sanitizeErrorResponse);

export { 
  activityController, 
  actionPlanController, 
  organizationController, 
  userController,
  notificationController,
  fiscalYearController,
  templateController,
  optionController
};
