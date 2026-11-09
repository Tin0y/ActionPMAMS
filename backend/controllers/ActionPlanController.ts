import { Router, Response } from 'express';
import { actionPlanRepository } from '../repositories/ActionPlanRepository';
import { activityRepository } from '../repositories/ActivityRepository';
import { fiscalYearRepository } from '../repositories/FiscalYearRepository';
import { ApiResponse } from '../entities/types';
import { ActionPlanFolder } from '../../src/types';
import {
  AuthenticatedRequest,
  requireAdmin,
  requireAuth
} from '../services/AuthService';
import {
  rejectImpersonationAttempt,
  requireRoles
} from '../services/AuthorizationService';

export const actionPlanController = Router();

// Require authenticated session for all action-plan endpoints
actionPlanController.use(requireAuth);

actionPlanController.get('/', (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res)) return;

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

actionPlanController.get(
  '/fetch-google-sheet',
  requireRoles('ROLE_ORGANIZATION', 'ROLE_ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    if (rejectImpersonationAttempt(req, res)) return;

    try {
      const sheetUrl = (req.query.url as string) || '';
      if (!sheetUrl) {
        return res.status(400).json({ success: false, message: 'Missing Google Sheet URL' });
      }
      const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
      if (!match) {
        return res.status(400).json({ success: false, message: 'Invalid Google Sheet URL. Could not extract spreadsheet ID.' });
      }
      const sheetId = match[1];
      const gidMatch = sheetUrl.match(/[#&?]gid=([0-9]+)/);
      const gidParam = gidMatch ? `&gid=${gidMatch[1]}` : '';
      const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx${gidParam}`;
      const googleRes = await fetch(exportUrl);
      if (!googleRes.ok) {
        throw new Error(`Google Sheets responded with HTTP status ${googleRes.status}: ${googleRes.statusText}`);
      }
      const arrayBuf = await googleRes.arrayBuffer();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="google_sheet_${sheetId}.xlsx"`);
      return res.send(Buffer.from(arrayBuf));
    } catch (err: any) {
      console.error('[ActionPlanController] Error fetching Google Sheet:', err);
      return res.status(500).json({
        success: false,
        message: err?.message || 'Failed to fetch Google Sheet spreadsheet'
      });
    }
  }
);

actionPlanController.post(
  '/fetch-google-sheet',
  requireRoles('ROLE_ORGANIZATION', 'ROLE_ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    if (rejectImpersonationAttempt(req, res)) return;

    try {
      const sheetUrl = (req.body?.url as string) || '';
      if (!sheetUrl) {
        return res.status(400).json({ success: false, message: 'Missing Google Sheet URL in request body' });
      }
      const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
      if (!match) {
        return res.status(400).json({ success: false, message: 'Invalid Google Sheet URL. Could not extract spreadsheet ID.' });
      }
      const sheetId = match[1];
      const gidMatch = sheetUrl.match(/[#&?]gid=([0-9]+)/);
      const gidParam = gidMatch ? `&gid=${gidMatch[1]}` : '';
      const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx${gidParam}`;
      const googleRes = await fetch(exportUrl);
      if (!googleRes.ok) {
        throw new Error(`Google Sheets responded with HTTP status ${googleRes.status}: ${googleRes.statusText}`);
      }
      const arrayBuf = await googleRes.arrayBuffer();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="google_sheet_${sheetId}.xlsx"`);
      return res.send(Buffer.from(arrayBuf));
    } catch (err: any) {
      console.error('[ActionPlanController] Error fetching Google Sheet:', err);
      return res.status(500).json({
        success: false,
        message: err?.message || 'Failed to fetch Google Sheet spreadsheet'
      });
    }
  }
);

actionPlanController.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res)) return;

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

actionPlanController.post('/', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res)) return;

  const saved = actionPlanRepository.save(req.body);
  return res.status(201).json({
    timestamp: new Date().toISOString(),
    status: 201,
    success: true,
    message: 'Action plan created',
    data: saved
  });
});

// DELETE action plan folder - Admin only (only allowed if empty / not started)
actionPlanController.delete('/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res)) return;

  try {
    const target = actionPlanRepository.findById(req.params.id);
    const fyName = target?.fiscalYear || req.params.id;

    // Check if any activities exist in this action plan
    const fyDigits = fyName.replace(/\D/g, '');
    const hasActivities = activityRepository.findAll().some(a => {
      const actYear = (a.fiscalYear || '').replace(/\D/g, '');
      return (actYear && actYear === fyDigits) || (a.startDate && a.startDate.startsWith(fyDigits));
    });

    if (hasActivities) {
      return res.status(400).json({
        timestamp: new Date().toISOString(),
        status: 400,
        success: false,
        code: 'CANNOT_DELETE_NON_EMPTY_ACTION_PLAN',
        message: `Cannot delete action plan folder for "${fyName}": it already contains registered activities or proposals.`
      });
    }

    actionPlanRepository.deleteById(req.params.id);
    actionPlanRepository.deleteByFiscalYear(fyName);
    fiscalYearRepository.deleteById(fyName);

    return res.status(200).json({
      timestamp: new Date().toISOString(),
      status: 200,
      success: true,
      message: `Action plan folder for "${fyName}" deleted successfully.`
    });
  } catch (err: any) {
    return res.status(500).json({
      timestamp: new Date().toISOString(),
      status: 500,
      success: false,
      message: err.message || 'Failed to delete action plan folder'
    });
  }
});
