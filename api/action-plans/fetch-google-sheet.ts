import type { IncomingMessage, ServerResponse } from 'http';

export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const rawUrl = (req.query?.url as string) || (req.body?.url as string) || '';
    if (!rawUrl) {
      return res.status(400).json({ error: 'Missing Google Sheet URL' });
    }

    const match = rawUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (!match) {
      return res.status(400).json({ error: 'Invalid Google Sheet URL format. Could not extract spreadsheet ID.' });
    }

    const sheetId = match[1];
    const gidMatch = rawUrl.match(/[#&?]gid=([0-9]+)/);
    const gidParam = gidMatch ? `&gid=${gidMatch[1]}` : '';
    const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx${gidParam}`;

    const googleRes = await fetch(exportUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      },
      redirect: 'follow'
    });

    if (!googleRes.ok) {
      return res.status(googleRes.status).json({
        error: `Google Sheets responded with HTTP status ${googleRes.status}: ${googleRes.statusText}`
      });
    }

    const contentType = googleRes.headers.get('content-type') || '';
    const arrayBuffer = await googleRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // If Google returned HTML instead of XLSX (e.g. login prompt or access denied)
    const isHtml = contentType.includes('text/html') || 
                   (buffer.length >= 4 && buffer.slice(0, 4).toString().toLowerCase().includes('<'));
    
    if (isHtml) {
      return res.status(403).json({
        error: 'The Google Sheet is not publicly viewable. In Google Sheets, click Share and set General Access to "Anyone with the link can view".'
      });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="google_sheet_${sheetId}.xlsx"`);
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.status(200).send(buffer);
  } catch (err: any) {
    console.error('[Vercel Serverless Function] Error fetching Google Sheet:', err);
    return res.status(500).json({
      error: err?.message || 'Failed to download Google Sheet spreadsheet'
    });
  }
}
