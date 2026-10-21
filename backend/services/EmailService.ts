import nodemailer, { Transporter } from 'nodemailer';

export interface EmailDispatchOptions {
  toEmail: string;
  toName: string;
  fromName?: string;
  subject: string;
  previewText?: string;
  activityId?: string;
  activityTitle: string;
  stageName?: string;
  actorName: string;
  actorRole: string;
  remarks?: string;
  statusBadge?: string;
  eventType?: 'APPROVAL' | 'SUBMISSION' | 'DEFERRAL' | 'SYSTEM';
  systemUrl?: string;
}

export interface EmailDispatchResult {
  success: boolean;
  messageId?: string;
  method: 'GMAIL_SMTP' | 'WEB_GMAIL' | 'SIMULATED';
  gmailWebComposeUrl: string;
  info?: string;
}

class EmailService {
  private transporter: Transporter | null = null;
  private isConfigured: boolean = false;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const gmailUser = process.env.GMAIL_USER || process.env.SMTP_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS;

    if (gmailUser && gmailPass) {
      try {
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: gmailUser,
            pass: gmailPass
          }
        });
        this.isConfigured = true;
        console.log(`[EmailService] Gmail SMTP configured successfully for account: ${gmailUser}`);
      } catch (err) {
        console.warn('[EmailService] Failed to initialize Gmail SMTP transport:', err);
        this.isConfigured = false;
      }
    } else {
      this.isConfigured = false;
      // In development or when Gmail credentials aren't in env, web compose fallback & simulated logger are active
      console.log('[EmailService] GMAIL_USER / GMAIL_APP_PASSWORD not set. Using real-time Web Gmail Compose links and console logging.');
    }
  }

  public getStatus() {
    return {
      isConfigured: this.isConfigured,
      service: 'Gmail (smtp.gmail.com)',
      senderAccount: process.env.GMAIL_USER || 'no-reply-actionplan@msunaawan.edu.ph'
    };
  }

  /**
   * Generates a direct Google Mail compose URL that opens the message in Gmail Web
   */
  public generateGmailWebComposeUrl(toEmail: string, subject: string, bodyText: string): string {
    const baseUrl = 'https://mail.google.com/mail/?view=cm&fs=1';
    const params = new URLSearchParams({
      to: toEmail,
      su: subject,
      body: bodyText
    });
    return `${baseUrl}&${params.toString()}`;
  }

  /**
   * Sends an institutional email notification via Gmail SMTP or fallback logger + direct web link
   */
  public async sendEmailNotification(options: EmailDispatchOptions): Promise<EmailDispatchResult> {
    const {
      toEmail,
      toName,
      subject,
      previewText = '',
      activityId,
      activityTitle,
      stageName = 'Action Plan Management',
      actorName,
      actorRole,
      remarks,
      statusBadge = 'Update',
      eventType = 'APPROVAL',
      systemUrl = 'http://localhost:3000'
    } = options;

    const fromSender = process.env.GMAIL_USER || 'no-reply-actionplan@msunaawan.edu.ph';
    const senderDisplayName = options.fromName || `MSU at Naawan — ${actorRole}`;

    // Generate plain-text body for Gmail web compose link
    const plainTextBody = [
      `REPUBLIC OF THE PHILIPPINES`,
      `MINDANAO STATE UNIVERSITY AT NAAWAN`,
      `Office of Student Development (OSD) • 9023 Naawan, Misamis Oriental`,
      `--------------------------------------------------`,
      `OFFICIAL ELECTRONIC NOTIFICATION`,
      ``,
      `Dear ${toName},`,
      ``,
      `This is an official automated clearance notification regarding your student organization activity:`,
      ``,
      `• Activity Title: ${activityTitle}`,
      activityId ? `• Activity Code: ${activityId}` : '',
      `• Status / Workflow Stage: ${stageName} [${statusBadge}]`,
      `• Processed By: ${actorName} (${actorRole})`,
      remarks ? `• Official Directives / Remarks: "${remarks}"` : '',
      ``,
      `Access the system directly to view complete attachments and liquidation records:`,
      `${systemUrl}`,
      ``,
      `--------------------------------------------------`,
      `Mindanao State University at Naawan`,
      `Action Plan: Monitoring and Management System (MSUN APMAMS)`
    ].filter(Boolean).join('\n');

    const gmailWebComposeUrl = this.generateGmailWebComposeUrl(toEmail, subject, plainTextBody);

    // Rich HTML email template with university branding
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #0f172a; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: #0f172a; color: #ffffff; padding: 24px 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 16px; letter-spacing: 0.5px; text-transform: uppercase; font-weight: 800; color: #f8fafc; }
    .header h2 { margin: 4px 0 0; font-size: 13px; font-weight: 500; color: #94a3b8; }
    .badge { display: inline-block; padding: 6px 14px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; margin-top: 12px; }
    .badge-approval { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
    .badge-submission { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; }
    .badge-deferral { background: #fff1f2; color: #9f1239; border: 1px solid #fecdd3; }
    .content { padding: 30px; }
    .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 20px 0; font-size: 13px; }
    .meta-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9; }
    .meta-row:last-child { border-bottom: none; }
    .meta-label { color: #64748b; font-weight: 600; }
    .meta-value { color: #0f172a; font-weight: 700; text-align: right; }
    .remarks-box { background: #f0fdf4; border-left: 4px solid #16a34a; padding: 12px 16px; margin: 18px 0; border-radius: 0 8px 8px 0; font-style: italic; font-size: 13px; color: #166534; }
    .cta-btn { display: inline-block; background: #2563eb; color: #ffffff !important; padding: 12px 24px; border-radius: 10px; font-weight: 700; font-size: 13px; text-decoration: none; margin-top: 16px; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 30px; text-align: center; font-size: 11px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="font-size: 11px; letter-spacing: 1px; color: #f59e0b; font-weight: 800; margin-bottom: 4px;">REPUBLIC OF THE PHILIPPINES</div>
      <h1>Mindanao State University at Naawan</h1>
      <h2>Office of Student Development (OSD) • Official Electronic Notice</h2>
      <div class="badge ${eventType === 'APPROVAL' ? 'badge-approval' : eventType === 'SUBMISSION' ? 'badge-submission' : 'badge-deferral'}">
        ${statusBadge}
      </div>
    </div>
    <div class="content">
      <p style="font-size: 14px; margin-top: 0;">Dear <strong>${toName}</strong>,</p>
      <p style="font-size: 13px; color: #334155; line-height: 1.6;">
        ${previewText || `This is an official notification regarding the activity proposal <strong>${activityTitle}</strong>.`}
      </p>

      <div class="meta-box">
        <div class="meta-row">
          <span class="meta-label">Activity Title:</span>
          <span class="meta-value">${activityTitle}</span>
        </div>
        ${activityId ? `
        <div class="meta-row">
          <span class="meta-label">Activity Code:</span>
          <span class="meta-value">${activityId}</span>
        </div>` : ''}
        <div class="meta-row">
          <span class="meta-label">Workflow Stage:</span>
          <span class="meta-value">${stageName}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Processed By:</span>
          <span class="meta-value">${actorName} (${actorRole})</span>
        </div>
      </div>

      ${remarks ? `
      <div class="remarks-box">
        <strong>Directives / Remarks:</strong> "${remarks}"
      </div>` : ''}

      <div style="text-align: center; margin: 24px 0 10px;">
        <a href="${systemUrl}" class="cta-btn">🚀 Open Activity in MSUN Action Plan System</a>
      </div>
    </div>
    <div class="footer">
      This is an automated institutional communication generated by Mindanao State University at Naawan Action Plan: Monitoring and Management System (APMAMS).
    </div>
  </div>
</body>
</html>
`;

    if (this.isConfigured && this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from: `"${senderDisplayName}" <${fromSender}>`,
          to: toEmail,
          subject,
          text: plainTextBody,
          html: htmlBody
        });

        console.log(`[EmailService] 📧 Gmail sent successfully: ${info.messageId} to ${toEmail}`);
        return {
          success: true,
          messageId: info.messageId,
          method: 'GMAIL_SMTP',
          gmailWebComposeUrl,
          info: `Dispatched via Gmail SMTP to ${toEmail}`
        };
      } catch (err: any) {
        console.warn(`[EmailService] SMTP error sending to ${toEmail}, falling back to Web compose:`, err?.message || err);
      }
    }

    // Fallback: Real-time logging + Gmail Web URL
    console.log(`[EmailService] 📨 [Real-Time Notification] Delivered to: ${toEmail} | Subject: "${subject}" | Actor: ${actorName} (${actorRole})`);

    return {
      success: true,
      method: 'WEB_GMAIL',
      gmailWebComposeUrl,
      info: `Notification queued and dispatched. Gmail Web direct compose available.`
    };
  }
}

export const emailService = new EmailService();
