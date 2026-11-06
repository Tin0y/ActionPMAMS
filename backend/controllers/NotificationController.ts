import { Router, Response } from 'express';
import { emailService, EmailDispatchOptions } from '../services/EmailService';
import {
  AuthenticatedRequest,
  requireAdmin,
  requireAuth
} from '../services/AuthService';
import { rejectImpersonationAttempt } from '../services/AuthorizationService';

export const notificationController = Router();

// Protect all notification routes with authenticated session
notificationController.use(requireAuth);

// Store connected SSE clients for real-time broadcast
interface SSEClient {
  id: string;
  res: Response;
  userId?: string;
  orgId?: string;
}

const sseClients: Map<string, SSEClient> = new Map();

/**
 * GET /api/notifications/stream
 * Server-Sent Events (SSE) endpoint providing live real-time notification push to authenticated clients
 */
notificationController.get('/stream', (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res)) return;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive'
  });

  const clientId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  // Derives client identity exclusively from the authenticated server session
  const userId = req.authUser?.id;
  const orgId = req.authUser?.orgId;

  sseClients.set(clientId, { id: clientId, res, userId, orgId });

  // Send initial connection acknowledgement
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', clientId, timestamp: new Date().toISOString() })}\n\n`);

  // Keep-alive heartbeat every 25 seconds to prevent browser timeouts
  const heartbeat = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch {
      clearInterval(heartbeat);
      sseClients.delete(clientId);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(clientId);
  });
});

/**
 * Broadcasts a real-time event to connected SSE clients
 */
export function broadcastNotification(event: {
  type: 'APPROVAL' | 'SUBMISSION' | 'DEFERRAL' | 'SYSTEM';
  title: string;
  message: string;
  activityId?: string;
  activityTitle?: string;
  actorName?: string;
  actorRole?: string;
  targetOrgId?: string;
  targetUserId?: string;
  timestamp: string;
  emailId?: string;
  gmailComposeUrl?: string;
}) {
  const payload = JSON.stringify({ type: 'NOTIFICATION', data: event });

  sseClients.forEach((client) => {
    try {
      // Check if client matches target org, user, or is global
      if (
        (!event.targetOrgId && !event.targetUserId) ||
        (event.targetOrgId && client.orgId && client.orgId.toUpperCase() === event.targetOrgId.toUpperCase()) ||
        (event.targetUserId && client.userId === event.targetUserId) ||
        (!client.orgId && !client.userId)
      ) {
        client.res.write(`data: ${payload}\n\n`);
      }
    } catch {
      sseClients.delete(client.id);
    }
  });
}

/**
 * POST /api/notifications/send-email
 * Dispatches an external notification via Gmail
 */
notificationController.post('/send-email', async (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res)) return;

  try {
    const payload = req.body as EmailDispatchOptions;

    if (!payload.toEmail || !payload.subject || !payload.activityTitle) {
      return res.status(400).json({
        success: false,
        message: 'toEmail, subject, and activityTitle are required fields.'
      });
    }

    const result = await emailService.sendEmailNotification(payload);

    return res.status(200).json({
      success: true,
      message: 'Email notification processed successfully.',
      data: result
    });
  } catch (error: any) {
    console.error('[NotificationController] Failed to send email:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Internal server error dispatching email.'
    });
  }
});

/**
 * POST /api/notifications/broadcast
 * Broadcasts a real-time notification across the website and optionally sends an external Gmail
 */
notificationController.post('/broadcast', async (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res)) return;

  try {
    const { notification, email } = req.body;

    if (!notification || !notification.title) {
      return res.status(400).json({
        success: false,
        message: 'Notification object is required.'
      });
    }

    let emailResult = null;
    if (email && email.toEmail) {
      emailResult = await emailService.sendEmailNotification(email);
    }

    const actor = req.authUser;
    // Broadcast over SSE to all live clients
    broadcastNotification({
      type: notification.type || 'SYSTEM',
      title: notification.title,
      message: notification.message,
      activityId: notification.activityId,
      activityTitle: notification.activityTitle,
      actorName: actor?.name || notification.actorName,
      actorRole: actor?.activeRole || actor?.role || notification.actorRole,
      targetOrgId: notification.targetOrgId,
      targetUserId: notification.userId,
      timestamp: notification.timestamp || new Date().toISOString(),
      emailId: notification.emailId,
      gmailComposeUrl: emailResult?.gmailWebComposeUrl
    });

    return res.status(200).json({
      success: true,
      message: 'Real-time notification broadcasted successfully.',
      connectedClientsCount: sseClients.size,
      emailResult
    });
  } catch (error: any) {
    console.error('[NotificationController] Broadcast error:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Error broadcasting notification.'
    });
  }
});

/**
 * GET /api/notifications/status
 * Restricted to System Administrator
 */
notificationController.get('/status', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res)) return;

  return res.status(200).json({
    status: 'ONLINE',
    connectedRealtimeClients: sseClients.size,
    gmail: emailService.getStatus()
  });
});
