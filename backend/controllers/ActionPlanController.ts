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

actionPlanController.get('/fetch-google-sheet', async (req: Request, res: Response) => {
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
});

actionPlanController.post('/fetch-google-sheet', async (req: Request, res: Response) => {
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

