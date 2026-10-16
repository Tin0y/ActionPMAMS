import { Activity, ActivityAccomplishmentForm, AccomplishmentRow } from '../types';
import { MSUN_HEADER_IMG, MSUN_FOOTER_IMG } from './msunHeaderFooter';
import { getAccomplishmentControlNo } from './accomplishmentDocxExport';

export { 
  downloadAccomplishmentAsDocx, 
  generateAccomplishmentDocxBlob, 
  getAccomplishmentControlNo 
} from './accomplishmentDocxExport';

import {
  type SignatoryDetails,
  cleanPersonName,
  resolvePreparedBySignatory,
  resolveReviewedBySignatory,
  resolveRecordedBySignatory
} from './accomplishmentSignatories';

export {
  type SignatoryDetails,
  cleanPersonName,
  resolvePreparedBySignatory,
  resolveReviewedBySignatory,
  resolveRecordedBySignatory
};

/**
 * Generates a complete, standalone, printable HTML document for the official
 * Mindanao State University at Naawan Activity Accomplishment Report
 * matching the visual reference format (e.g. MSUN-OME-ACRPT-003-2026-REV00).
 */
export function generateAccomplishmentHtml(
  activity: Activity, 
  formOverrides?: Partial<ActivityAccomplishmentForm>
): string {
  const form: Partial<ActivityAccomplishmentForm> = {
    ...(activity.accomplishmentForm || {}),
    ...(formOverrides || {})
  };

  const title = form.activityTitle || activity.title || activity.programActivity || 'Seniors Week 2026';
  const controlNo = getAccomplishmentControlNo(activity, form);
  const officeCode = form.officeCode || activity.orgId || 'OSD';
  const unitCollege = form.unitCollege || activity.orgId || 'OVCSAS';
  const department = form.department || (activity.orgId === 'SSC' ? 'OSD' : 'Bachelor of Science in Information Technology');
  const datePrepared = form.datePrepared || 'June 10, 2026';
  const venue = form.venue || activity.venue || 'MSUN';
  const budget = Number(form.proposedBudget ?? activity.budget ?? activity.amount ?? 227725);
  const budgetFormatted = `₱${budget.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const budgetSource = form.budgetSource || activity.fundSource || 'Personal Funds & OVCSAS Fund 01';
  const dateImpl = form.dateOfImplementation || activity.startDate || 'July 13, 2026 - July 17, 2026';
  const resultCode = form.resultCode || 'None';
  const email = form.emailAddress || `${(activity.orgId || 'osd').toLowerCase()}@msunaawan.edu.ph`;
  const duration = form.durationDays || '5 days';
  const poeYear = form.pdbYear || '2026';
  const isPoeIncluded = form.pdbIncluded !== false;

  // Section A: Objectives
  const defaultObjectives = [
    'To provide graduating students with a meaningful and memorable celebration before their graduation.',
    'To strengthen camaraderie, unity, and fellowship among the members of Batch LUMINARA, Class of 2026.',
    'To promote student engagement, wellness, and appreciation through various recreational, social, and recognition activities.'
  ];
  const objectives = form.objectives && form.objectives.length > 0 ? form.objectives : defaultObjectives;

  // Section B: Narrative Report
  const defaultNarrative = `The Senior Students' Society (SenSSo) successfully conducted Seniors' Week 2026 from July 13 to July 17, 2026, in celebration of the graduating students of Batch LUMINARA, Class of 2026. The week-long celebration was organized to recognize the achievements, perseverance, and growth of the graduating students as they prepared to conclude their academic journey at Mindanao State University at Naawan. It also aimed to provide opportunities for graduating students to create meaningful memories, strengthen friendships, and foster camaraderie through various recreational, social, and recognition activities.

The celebration officially commenced on July 13, 2026, with the SenSSo Fun Run, which gathered graduating students, university employees, alumni, and other members of the university community in promoting physical wellness and healthy living. This was followed by a Zumba session, encouraging participants to remain active while enjoying the festive atmosphere. The morning activities continued with Larong Lahi, featuring traditional Filipino games such as Chinese Garter, Tug of War, Big Volleyball, and Tigsu2x. These activities promoted teamwork, sportsmanship, cooperation, and strengthened camaraderie among the participants.

On July 14 and 15, 2026, the university conducted a Job Fair and Pre-Employment Orientation in collaboration with the Office of Student Welfare (OSW) and SenSSo Officers. These activities equipped graduating students with essential knowledge and opportunities for employment after graduation. Representatives from various agencies and companies provided career opportunities, employment information, and guidance on preparing for the workforce, allowing students to gain valuable insights as they transitioned from academic life to professional careers.

On July 16, 2026, the graduating students participated in the Batch Pictorial, which was conducted according to the scheduled time slots of each college. This activity served as an important milestone for the graduating class, allowing students to commemorate their academic journey through their official graduation photographs. On the same day, the Releasing of Togas was facilitated to ensure that graduating students received their academic regalia in preparation for the upcoming commencement exercises. The distribution was carried out in an organized manner according to the designated schedule for each college.

The final day of the celebration, July 17, 2026, focused on graduation preparations and the culminating celebration. The TOGA Distribution was completed to accommodate students who had not yet claimed their academic attire. The graduating students also participated in OLMAK 2026, which provided an opportunity for fellowship and reflection before graduation. The week concluded with the much-awaited Seniors' Night 2026: 'Grad Ball: Midnight Blue,' where graduating students gathered for an evening of recognition, celebration, and fellowship. The event featured entertainment, interactive activities, and memorable moments that celebrated the accomplishments and shared experiences of Batch LUMINARA.

Overall, Seniors' Week 2026 successfully achieved its objectives of providing graduating students with a meaningful and memorable celebration before graduation, strengthening unity and fellowship among the members of Batch LUMINARA, and promoting student engagement, wellness, and appreciation through various activities. The active participation of the graduating class, together with the support of the university administration, partner offices, faculty members, and SenSSo Officers, contributed to the successful implementation of the week-long celebration.

The activity resulted in increased interaction, collaboration, and camaraderie among graduating students while creating lasting memories and reinforcing a strong sense of pride, appreciation, and belonging. More importantly, Seniors' Week 2026 served as a fitting culmination of the students' undergraduate journey, leaving Batch LUMINARA with meaningful experiences that they will cherish as they move forward into the next chapter of their lives.`;
  const narrativeReport = form.narrativeReport || defaultNarrative;

  // Section C: Accomplishment Rows
  const defaultAccomplishmentRows: AccomplishmentRow[] = [
    {
      objectiveNo: 1,
      expectedOutput: 'Creation of lasting memories and a stronger sense of pride, appreciation, and belonging among the graduating students.',
      actualAccomplishment: "Seniors' Week 2026 was successfully conducted through a series of activities, including the Fun Run, Larong Lahi, Batch Pictorial, TOGA distribution, OLMAK 2026, and Seniors' Night, providing graduating students with a memorable and meaningful celebration before graduation.",
      rating: '4'
    },
    {
      objectiveNo: 2,
      expectedOutput: 'Increased interaction, collaboration, and camaraderie among graduating students.',
      actualAccomplishment: 'The recreational, social, and fellowship activities encouraged teamwork, active participation, and interaction among graduating students, fostering stronger camaraderie, unity, and lasting friendships within Batch LUMINARA.',
      rating: '4'
    },
    {
      objectiveNo: 3,
      expectedOutput: "Successful implementation of Seniors' Week activities with active participation from the graduating class and university community.",
      actualAccomplishment: 'The scheduled activities were successfully implemented with the support of the SenSSo Officers and university offices, achieving active participation from graduating students and promoting wellness, engagement, appreciation, and preparedness for graduation and employment.',
      rating: '4'
    }
  ];
  const accomplishmentRows = form.accomplishmentRows && form.accomplishmentRows.length > 0
    ? form.accomplishmentRows.map((r, i) => ({
        objectiveNo: r.objectiveNo || i + 1,
        expectedOutput: r.expectedOutput || '',
        actualAccomplishment: r.actualAccomplishment || '',
        rating: r.rating?.toString().charAt(0) || '4'
      }))
    : defaultAccomplishmentRows;

  // Section E: Evaluation Summary
  const defaultEvaluation = 'The evaluation of Seniors Week 2026 yielded an overall positive result, with 163 respondents expressing high satisfaction with the activity. Participants found the activity informative, relevant, meaningful, and well-organized. The activity assessment received strong positive feedback, particularly in terms of organization, relevance of topics, and increased knowledge and understanding. The venue and food services were also generally satisfactory, although some concerns were raised regarding ventilation, comfort, and facility conditions. Overall, the activity was considered successful and memorable, with participants commending the dedication, teamwork, and efforts of the organizers.';
  const evaluationSummary = form.summaryOfEvaluations || defaultEvaluation;

  // Section F: Remarks / Comments / Suggestions
  const defaultRemarks = 'Participants described Seniors Week 2026 as a successful, enjoyable, informative, and meaningful activity. They commended the officers and organizers for their dedication, teamwork, and hard work. Suggestions included improving venue ventilation by providing additional fans or air-conditioning, providing cold water and foldable fans, and installing a ceiling cover or tarp to address concerns regarding birds and droppings. Participants also suggested inviting resource speakers with extensive professional experience, offering more webinars for those unable to attend in person, ensuring equal attention to participants seated at the back, and providing additional tables.';
  const remarksComments = form.remarksComments || defaultRemarks;

  // Section G: Next Steps / Plan of Action
  const defaultNextSteps = 'The organizers shall consider the recommendations and feedback gathered from the evaluation in the planning and implementation of future Seniors Week activities. Improvements shall focus on enhancing venue ventilation and comfort, ensuring a cleaner and more conducive event environment, providing adequate hydration and seating facilities, and exploring the provision of additional participant amenities such as fans. Future programs shall also consider inviting experienced and engaging resource speakers, offering online or hybrid participation options when appropriate, and ensuring inclusive engagement and equal attention to all participants. The positive practices in organization, teamwork, and program implementation shall likewise be sustained and further improved in succeeding activities.';
  const nextStepsPlanOfAction = form.nextStepsPlanOfAction || defaultNextSteps;

  // Signatories (Clean names, position displayed under name without parentheses)
  const preparedSignatory = resolvePreparedBySignatory(
    form.preparedByName, 
    form.preparedByTitle, 
    activity.proposedBy, 
    activity.orgId
  );
  const reviewedSignatory = resolveReviewedBySignatory(
    form.reviewedByName, 
    form.reviewedByTitle, 
    activity.adviserName, 
    activity.orgId
  );
  const recordedSignatory = resolveRecordedBySignatory(
    form.recordedByName, 
    form.recordedByTitle
  );

  // Photo Documentation (Section D)
  const photos = form.photoFiles && form.photoFiles.length > 0
    ? form.photoFiles.slice(0, 4)
    : [
        'Photo 1: SenSSo Fun Run & Zumba Wellness Activity',
        'Photo 2: Larong Lahi Traditional Sports Competition',
        'Photo 3: Pre-Employment Orientation & Job Fair',
        "Photo 4: Grad Ball 'Midnight Blue' Culminating Fellowship"
      ];

  // Build Objectives HTML
  const objectivesHtml = objectives.map((obj, i) => `
    <div style="margin-bottom: 6px; padding-left: 18px; text-indent: -18px;">
      ${i + 1}. &nbsp;${escapeHtml(obj)}
    </div>
  `).join('');

  // Build Narrative HTML
  const narrativeParagraphs = narrativeReport.split('\n\n').filter(Boolean);
  const narrativeHtml = (narrativeParagraphs.length ? narrativeParagraphs : [narrativeReport]).map(p => `
    <p style="margin: 0 0 10px 0; text-align: justify; text-justify: inter-word; text-indent: 24px; line-height: 1.45;">
      ${escapeHtml(p)}
    </p>
  `).join('');

  // Build Accomplishment Table Rows
  const tableRowsHtml = accomplishmentRows.map(row => {
    const r = String(row.rating).trim().charAt(0);
    return `
      <tr>
        <td style="border: 1px solid #000; padding: 6px 4px; text-align: center; vertical-align: top; font-weight: bold;">
          ${row.objectiveNo || ''}
        </td>
        <td style="border: 1px solid #000; padding: 6px 8px; vertical-align: top; text-align: justify; line-height: 1.35;">
          ${escapeHtml(row.expectedOutput)}
        </td>
        <td style="border: 1px solid #000; padding: 6px 8px; vertical-align: top; text-align: justify; line-height: 1.35;">
          ${escapeHtml(row.actualAccomplishment)}
        </td>
        <td style="border: 1px solid #000; padding: 6px 4px; text-align: center; vertical-align: middle; font-weight: bold; font-size: 13px;">
          ${r === '4' ? '✔' : ''}
        </td>
        <td style="border: 1px solid #000; padding: 6px 4px; text-align: center; vertical-align: middle; font-weight: bold; font-size: 13px;">
          ${r === '3' ? '✔' : ''}
        </td>
        <td style="border: 1px solid #000; padding: 6px 4px; text-align: center; vertical-align: middle; font-weight: bold; font-size: 13px;">
          ${r === '2' ? '✔' : ''}
        </td>
        <td style="border: 1px solid #000; padding: 6px 4px; text-align: center; vertical-align: middle; font-weight: bold; font-size: 13px;">
          ${r === '1' ? '✔' : ''}
        </td>
      </tr>
    `;
  }).join('');

  // Build Photo Grid HTML
  const photoGridHtml = photos.map((p, idx) => `
    <div style="border: 1px solid #94a3b8; border-radius: 4px; background: #f8fafc; padding: 8px; text-align: center; display: flex; flex-direction: column; justify-content: center; min-height: 140px;">
      <div style="font-size: 28px; color: #64748b; margin-bottom: 6px;">📷</div>
      <div style="font-size: 9.5px; font-weight: 600; color: #1e293b; line-height: 1.3;">
        ${escapeHtml(p)}
      </div>
      <div style="font-size: 8px; color: #64748b; margin-top: 3px;">Activity Photo Document #${idx + 1}</div>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(controlNo)} - Activity Accomplishment Report</title>
  <style>
    /* ── Page setup ── */
    @page {
      size: A4 portrait;
      margin: 10mm 12mm 10mm 12mm;
    }

    *, *::before, *::after {
      box-sizing: border-box;
    }

    html, body {
      font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
      color: #000000;
      background: #ffffff;
      font-size: 9.5pt;
      line-height: 1.35;
      margin: 0;
      padding: 0;
      width: 100%;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* ── Main Document Layout Table (Repeats Header & Footer cleanly on every page) ── */
    table.doc-layout-table {
      width: 100%;
      max-width: 100%;
      table-layout: fixed;
      border: none !important;
      border-collapse: collapse;
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    table.doc-layout-table > thead {
      display: table-header-group;
    }
    table.doc-layout-table > tfoot {
      display: table-footer-group;
    }
    table.doc-layout-table > tbody {
      display: table-row-group;
    }
    table.doc-layout-table > thead > tr > td,
    table.doc-layout-table > tfoot > tr > td,
    table.doc-layout-table > tbody > tr > td {
      border: none !important;
      padding: 0;
      vertical-align: top;
      box-sizing: border-box;
    }

    .header-banner-box {
      width: 100%;
      text-align: center;
      margin-bottom: 6px;
    }
    .header-banner-box img.header-banner {
      width: 100%;
      height: auto;
      max-height: 40mm;
      display: block;
      object-fit: contain;
    }

    .footer-banner-box {
      width: 100%;
      text-align: center;
      margin: 0 auto;
    }
    .footer-banner-box img.footer-banner {
      width: 100%;
      height: auto;
      max-height: 22mm;
      display: block;
      object-fit: contain;
      margin: 0 auto;
    }

    /* Print Fixed Footer: anchors firmly to the footer area at the bottom of EVERY page */
    .print-fixed-footer {
      display: none;
    }

    .doc-footer-spacer {
      border: none !important;
      padding: 0 !important;
      margin: 0 !important;
    }
    .footer-spacer-block {
      height: 0;
      display: none;
    }

    /* Screen Footer Banner */
    .screen-footer-banner {
      display: block;
      margin-top: 24px;
      width: 100%;
      text-align: center;
    }

    .triplicate-notice {
      text-align: right;
      font-size: 7.5pt;
      font-style: italic;
      color: #334155;
      line-height: 1.25;
      margin-top: 4px;
      margin-bottom: 8px;
    }
    .doc-title {
      text-align: center;
      font-size: 11pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 6px 0 10px 0;
    }

    /* ── Unified Master Accomplishment Form Table (Every section is a row) ── */
    table.accomplishment-main-form-table {
      width: 100%;
      max-width: 100%;
      table-layout: fixed;
      border-collapse: collapse;
      border: 1px solid #000000;
      margin-bottom: 8px;
      font-size: 9pt;
      box-sizing: border-box;
    }
    table.accomplishment-main-form-table > tbody > tr > td {
      border: 1px solid #000000;
      padding: 5px 6px;
      vertical-align: top;
      box-sizing: border-box;
      word-break: break-word;
      overflow-wrap: break-word;
    }
    .accomplishment-section-header {
      font-size: 9.5pt;
      font-weight: bold;
      margin-bottom: 4px;
      text-transform: uppercase;
    }

    /* ── Integrated Inner Table for Section C Ratings ── */
    table.ratings-inner-table {
      width: 100%;
      max-width: 100%;
      table-layout: fixed;
      border-collapse: collapse;
      border: 1px solid #000000;
      margin-top: 4px;
      margin-bottom: 6px;
      font-size: 8.5pt;
      box-sizing: border-box;
    }
    table.ratings-inner-table th, table.ratings-inner-table td {
      border: 1px solid #000000;
      padding: 4px 5px;
      vertical-align: top;
      box-sizing: border-box;
      word-break: break-word;
      overflow-wrap: break-word;
    }
    table.ratings-inner-table th {
      background-color: #f8fafc;
      font-weight: bold;
      text-align: center;
      vertical-align: middle;
    }
    .rating-legend {
      font-size: 8pt;
      line-height: 1.35;
      margin-top: 4px;
      margin-bottom: 4px;
      color: #1e293b;
    }
    .photo-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-top: 4px;
      margin-bottom: 4px;
    }

    /* ── Signatories Block (Outside Table) ── */
    table.signatories-table {
      width: 100%;
      max-width: 100%;
      table-layout: fixed;
      border: none !important;
      border-collapse: collapse;
      margin-top: 24px;
      margin-bottom: 12px;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      box-sizing: border-box;
    }
    table.signatories-table td {
      border: none !important;
      box-sizing: border-box;
    }
    .sig-role-title {
      font-size: 8.5pt;
      color: #334155;
      margin-bottom: 30px;
    }
    .sig-name {
      font-weight: bold;
      text-decoration: underline;
      text-align: center;
      text-transform: uppercase;
      font-size: 9.5pt;
    }
    .sig-position {
      font-size: 8.5pt;
      text-align: center;
      color: #334155;
      margin-top: 2px;
    }

    @media print {
      .no-print { display: none !important; }
      .page-break { page-break-after: always; }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        background: #ffffff !important;
      }
      .page-sheet {
        width: 100% !important;
        max-width: 100% !important;
        min-height: auto !important;
        margin: 0 !important;
        padding: 0 1px !important;
        background: transparent !important;
        box-shadow: none !important;
        box-sizing: border-box !important;
      }
      .screen-footer-banner {
        display: none !important;
      }
      .print-fixed-footer {
        display: block !important;
        position: fixed !important;
        bottom: 0 !important;
        left: 0 !important;
        right: 0 !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        background: transparent !important;
        text-align: center !important;
        z-index: 9999 !important;
      }
      .print-fixed-footer .footer-banner-box {
        margin: 0 auto !important;
      }
      .print-fixed-footer img.footer-banner {
        width: 100% !important;
        height: auto !important;
        max-height: 22mm !important;
        display: block !important;
        object-fit: contain !important;
        margin: 0 auto !important;
      }
      .doc-layout-table > thead {
        display: table-header-group !important;
      }
      .doc-layout-table > thead tr,
      .doc-layout-table > thead td {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .doc-layout-table > tfoot,
      table.accomplishment-main-form-table > tfoot {
        display: table-footer-group !important;
      }
      .doc-footer-spacer {
        border: none !important;
        padding: 0 !important;
        margin: 0 !important;
        background: transparent !important;
        height: 28mm !important;
      }
      .footer-spacer-block {
        display: block !important;
        height: 28mm !important;
        width: 100% !important;
      }
      .section-row-avoid-break {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .section-row-avoid-break > td {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      table.accomplishment-main-form-table {
        width: 100% !important;
        max-width: 100% !important;
        table-layout: fixed !important;
        border-collapse: collapse !important;
        box-sizing: border-box !important;
      }
      table.accomplishment-main-form-table > tfoot > tr > td {
        border: none !important;
        padding: 0 !important;
        margin: 0 !important;
        background: transparent !important;
      }
      table.ratings-inner-table {
        width: 100% !important;
        max-width: 100% !important;
        table-layout: fixed !important;
        box-sizing: border-box !important;
      }
      table.signatories-table {
        width: 100% !important;
        max-width: 100% !important;
        table-layout: fixed !important;
        border: none !important;
        border-collapse: collapse !important;
        box-sizing: border-box !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        margin-top: 20px !important;
        margin-bottom: 28mm !important;
      }
      table.signatories-table tr {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    }

    @media screen {
      body {
        padding: 24px 16px;
        background: #e2e8f0;
      }
      .page-sheet {
        width: 210mm;
        max-width: 210mm;
        min-height: 297mm;
        box-sizing: border-box;
        margin: 0 auto;
        background: #ffffff;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        padding: 10mm 12mm;
      }
      .print-fixed-footer {
        display: none !important;
      }
      .doc-layout-table > tfoot,
      table.accomplishment-main-form-table > tfoot {
        display: none !important;
      }
      .screen-footer-banner {
        display: block !important;
      }
    }
  </style>
</head>
<body>

  <!-- Print fixed footer: anchored firmly in the footer area of EVERY page in print / PDF -->
  <div class="print-fixed-footer">
    <div class="footer-banner-box">
      <img src="${MSUN_FOOTER_IMG}" class="footer-banner" alt="Mindanao State University at Naawan" />
    </div>
  </div>

  <div class="page-sheet">
    <table class="doc-layout-table">
      <thead>
        <tr>
          <td class="doc-header-cell">
            <div class="header-banner-box">
              <img src="${MSUN_HEADER_IMG}" class="header-banner" alt="Mindanao State University at Naawan" />
            </div>
          </td>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="doc-body-cell">
            <div id="page-content">
              <!-- Triplicate Notice -->
              <div class="triplicate-notice">
              <div style="font-weight: bold; font-style: normal; color: #000;">${escapeHtml(controlNo)}</div>
              <div>Print in A4. Produced in TRIPLICATE. One Copy for OME.</div>
              <div>A copy for the office conducting the activity.</div>
              <div>And a copy for admin document attachment.</div>
              <div>Follow the order of signatories for the process flow.</div>
            </div>

            <!-- Document Main Title -->
            <div class="doc-title">
              ACTIVITY ACCOMPLISHMENT REPORT
            </div>

            <!-- Unified Master Accomplishment Form Table (Every section is a row; inner tables integrated in row cells) -->
            <table class="accomplishment-main-form-table">
      <tbody>
        <!-- Row 1: Administrative Specifications (2 Columns) -->
        <tr class="section-row-avoid-break">
          <!-- Left Column -->
          <td style="width: 50%; box-sizing: border-box; word-break: break-word; vertical-align: top;">
            <div style="margin-bottom: 4px;"><strong>Activity Title:</strong> &nbsp;<u>${escapeHtml(title)}</u></div>
            <div style="margin-bottom: 4px;"><strong>Office Code:</strong> &nbsp;<u>${escapeHtml(officeCode)}</u></div>
            <div style="margin-bottom: 4px;"><strong>Unit/College:</strong> &nbsp;<u>${escapeHtml(unitCollege)}</u></div>
            <div style="margin-bottom: 4px;"><strong>Department:</strong> &nbsp;<u>${escapeHtml(department)}</u></div>
            <div style="margin-bottom: 4px;"><strong>Result Code/OPCR/IPCR Code:</strong> &nbsp;<u>${escapeHtml(resultCode)}</u></div>
            <div style="margin-bottom: 4px;"><strong>Date of Implementation:</strong> &nbsp;<u>${escapeHtml(dateImpl)}</u></div>
          </td>

          <!-- Right Column -->
          <td style="width: 50%; box-sizing: border-box; word-break: break-word; vertical-align: top;">
            <div style="margin-bottom: 4px;"><strong>Date Prepared:</strong> &nbsp;<u>${escapeHtml(datePrepared)}</u></div>
            <div style="margin-bottom: 4px;"><strong>Venue:</strong> &nbsp;<u>${escapeHtml(venue)}</u></div>
            <div style="margin-bottom: 4px;"><strong>Proposed Budget:</strong> &nbsp;<u>${escapeHtml(budgetFormatted)}</u></div>
            <div style="margin-bottom: 4px;"><strong>Budget Source:</strong> &nbsp;<u>${escapeHtml(budgetSource)}</u></div>
            <div style="margin-bottom: 4px;">
              <strong>Included in POE Year ${escapeHtml(poeYear)}:</strong> &nbsp;
              <span>[${isPoeIncluded ? 'X' : '&nbsp;'}] Yes</span> &nbsp;&nbsp;
              <span>[${!isPoeIncluded ? 'X' : '&nbsp;'}] No</span>
            </div>
            <div style="margin-bottom: 4px; word-break: break-all;"><strong>Email Add.:</strong> &nbsp;<u>${escapeHtml(email)}</u></div>
            <div style="margin-bottom: 4px;"><strong>Duration:</strong> &nbsp;<u>${escapeHtml(String(duration))}</u></div>
          </td>
        </tr>

        <!-- Row 2: Section A: Objectives -->
        <tr class="section-row-avoid-break">
          <td colspan="2" style="box-sizing: border-box; word-break: break-word; vertical-align: top;">
            <div class="accomplishment-section-header">A. OBJECTIVE/S</div>
            <div style="margin-top: 4px; margin-bottom: 4px;">
              ${objectivesHtml}
            </div>
          </td>
        </tr>

        <!-- Row 3: Section B: Narrative Report -->
        <tr>
          <td colspan="2" style="box-sizing: border-box; word-break: break-word; vertical-align: top;">
            <div class="accomplishment-section-header">B. NARRATIVE REPORT</div>
            <div style="margin-top: 4px; margin-bottom: 4px;">
              ${narrativeHtml}
            </div>
          </td>
        </tr>

        <!-- Row 4: Section C: Actual Accomplishment and Rating (Inner table integrated into cell) -->
        <tr class="section-row-avoid-break">
          <td colspan="2" style="box-sizing: border-box; word-break: break-word; vertical-align: top;">
            <div class="accomplishment-section-header">C. ACTUAL ACCOMPLISHMENT AND RATING</div>
            <table class="ratings-inner-table">
              <thead>
                <tr>
                  <th rowspan="2" style="width: 10%;">OBJECTIVE NO.</th>
                  <th rowspan="2" style="width: 38%;">EXPECTED OUTPUT</th>
                  <th rowspan="2" style="width: 40%;">ACTUAL ACCOMPLISHMENT</th>
                  <th colspan="4" style="width: 12%;">ACCOMPLISHMENT RATING SCALE</th>
                </tr>
                <tr>
                  <th style="width: 3%;">4</th>
                  <th style="width: 3%;">3</th>
                  <th style="width: 3%;">2</th>
                  <th style="width: 3%;">1</th>
                </tr>
              </thead>
              <tbody>
                ${tableRowsHtml}
              </tbody>
            </table>

            <!-- Rating Scale Legend -->
            <div class="rating-legend">
              <strong>Accomplishment Rating Scale:</strong><br/>
              4 - Fully Achieved &nbsp;&nbsp;&nbsp;&nbsp; 3 - Largely Achieved &nbsp;&nbsp;&nbsp;&nbsp; 2 - Partially Achieved &nbsp;&nbsp;&nbsp;&nbsp; 1 - Not Achieved
            </div>
          </td>
        </tr>

        <!-- Row 5: Section D: Photo Documentation (Integrated into cell) -->
        <tr class="section-row-avoid-break">
          <td colspan="2" style="box-sizing: border-box; word-break: break-word; vertical-align: top;">
            <div class="accomplishment-section-header">D. PHOTO DOCUMENTATION</div>
            <div class="photo-grid">
              ${photoGridHtml}
            </div>
          </td>
        </tr>

        <!-- Row 6: Section E: Summary of Evaluation -->
        <tr class="section-row-avoid-break">
          <td colspan="2" style="box-sizing: border-box; word-break: break-word; vertical-align: top;">
            <div class="accomplishment-section-header">E. SUMMARY OF EVALUATION</div>
            <p style="text-align: justify; text-justify: inter-word; line-height: 1.45; margin: 4px 0 6px 0;">
              ${escapeHtml(evaluationSummary)}
            </p>
          </td>
        </tr>

        <!-- Row 7: Section F: Remarks / Comments / Suggestions -->
        <tr class="section-row-avoid-break">
          <td colspan="2" style="box-sizing: border-box; word-break: break-word; vertical-align: top;">
            <div class="accomplishment-section-header">F. REMARKS / COMMENTS / SUGGESTIONS</div>
            <p style="text-align: justify; text-justify: inter-word; line-height: 1.45; margin: 4px 0 6px 0;">
              ${escapeHtml(remarksComments)}
            </p>
          </td>
        </tr>

        <!-- Row 8: Section G: Next Steps / Plan of Action -->
        <tr class="section-row-avoid-break">
          <td colspan="2" style="box-sizing: border-box; word-break: break-word; vertical-align: top;">
            <div class="accomplishment-section-header">G. NEXT STEPS / PLAN OF ACTION</div>
            <p style="text-align: justify; text-justify: inter-word; line-height: 1.45; margin: 4px 0 6px 0;">
              ${escapeHtml(nextStepsPlanOfAction)}
            </p>
          </td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2" class="doc-footer-spacer">
            <div class="footer-spacer-block"></div>
          </td>
        </tr>
      </tfoot>
    </table>

    <!-- Signatories Block (Outside the master table as requested) -->
    <table class="signatories-table">
      <tbody>
        <tr>
          <!-- (1) Prepared by -->
          <td style="width: 50%; vertical-align: top; padding: 10px 16px;">
            <div class="sig-role-title">Prepared by:</div>
            <div class="sig-name">${escapeHtml(preparedSignatory.name)}</div>
            <div class="sig-position">${escapeHtml(preparedSignatory.position)}</div>
          </td>

          <!-- (2) Reviewed by -->
          <td style="width: 50%; vertical-align: top; padding: 10px 16px;">
            <div class="sig-role-title">Reviewed by:</div>
            <div class="sig-name">${escapeHtml(reviewedSignatory.name)}</div>
            <div class="sig-position">${escapeHtml(reviewedSignatory.position)}</div>
          </td>
        </tr>
        <tr>
          <!-- (3) Recorded by (Centered across columns) -->
          <td colspan="2" style="text-align: center; padding-top: 20px; padding-bottom: 8px;">
            <div style="max-width: 320px; margin: 0 auto; text-align: center;">
              <div class="sig-role-title" style="text-align: left;">Recorded by:</div>
              <div class="sig-name">${escapeHtml(recordedSignatory.name)}</div>
              <div class="sig-position">${escapeHtml(recordedSignatory.position)}</div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
            <!-- end #page-content -->
            </div>
          </td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <td class="doc-footer-spacer">
            <div class="footer-spacer-block"></div>
          </td>
        </tr>
      </tfoot>
    </table>

    <!-- Screen footer: shown at bottom of paper sheet in browser screen mode -->
    <div class="screen-footer-banner">
      <div class="footer-banner-box">
        <img src="${MSUN_FOOTER_IMG}" class="footer-banner" alt="Mindanao State University at Naawan" />
      </div>
    </div>
  </div>

</body>
</html>`;
}

function escapeHtml(text: unknown): string {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Downloads the official Activity Accomplishment Report as a standalone HTML file.
 */
export function downloadAccomplishmentAsHtml(
  activity: Activity, 
  formOverrides?: Partial<ActivityAccomplishmentForm>
): void {
  const rawHtml = generateAccomplishmentHtml(activity, formOverrides);
  const controlNo = getAccomplishmentControlNo(activity, formOverrides);

  // Top banner for user convenience when opened in a browser
  const interactiveBanner = `
  <div class="no-print" style="position: sticky; top: 0; z-index: 9999; background: #0f172a; color: #ffffff; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #3b82f6; font-family: sans-serif; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
    <div>
      <strong style="font-size: 14px; display: block;">MSUN Activity Accomplishment Report — Official Document</strong>
      <span style="font-size: 11px; color: #94a3b8;">${escapeHtml(controlNo)} &bull; Mindanao State University at Naawan</span>
    </div>
    <div style="display: flex; gap: 10px;">
      <button onclick="window.print()" style="background: #F59E0B; color: #002060; border: none; padding: 8px 18px; border-radius: 8px; font-weight: bold; font-size: 12px; cursor: pointer;">
        🖨️ Print Report
      </button>
      <button onclick="window.close()" style="background: #334155; color: #ffffff; border: none; padding: 8px 14px; border-radius: 8px; font-size: 12px; cursor: pointer;">
        Close
      </button>
    </div>
  </div>
  `;
  const htmlContent = rawHtml.replace('<body>', '<body>' + interactiveBanner);

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeFilename = `${controlNo}_Activity_Accomplishment_Report.html`.replace(/[^a-zA-Z0-9_-]/g, '_');
  a.href = url;
  a.download = safeFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * Downloads the official Activity Accomplishment Report as a PDF by opening a print-ready iframe or window.
 */
export async function downloadAccomplishmentAsPdf(
  activity: Activity,
  formOverrides?: Partial<ActivityAccomplishmentForm>
): Promise<void> {
  const htmlContent = generateAccomplishmentHtml(activity, formOverrides);

  const printScript = `
    <script>
      window.addEventListener('load', function() {
        setTimeout(function() { window.print(); }, 400);
      });
    <\/script>
  `;
  const printableHtml = htmlContent.replace('</head>', printScript + '</head>');

  const blob = new Blob([printableHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const win = window.open(url, '_blank', 'width=900,height=700');
  if (!win) {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(printableHtml);
      doc.close();
      setTimeout(() => {
        try { iframe.contentWindow?.print(); } catch { /* ignore */ }
        setTimeout(() => {
          if (document.body.contains(iframe)) document.body.removeChild(iframe);
          URL.revokeObjectURL(url);
        }, 30000);
      }, 600);
    }
    return;
  }

  const cleanup = () => URL.revokeObjectURL(url);
  win.addEventListener('afterprint', cleanup);
  setTimeout(cleanup, 300000);
}

/**
 * Triggers reliable native browser printing of the Activity Accomplishment Report.
 */
export function printAccomplishmentDocument(
  activity: Activity, 
  formOverrides?: Partial<ActivityAccomplishmentForm>
): void {
  const htmlContent = generateAccomplishmentHtml(activity, formOverrides);

  try {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 30000);
        } catch (innerErr) {
          console.warn('Iframe print restricted, triggering fallback window print:', innerErr);
          try {
            const win = window.open('', '_blank');
            if (win) {
              win.document.open();
              win.document.write(htmlContent);
              win.document.close();
              win.focus();
              win.print();
            } else {
              window.print();
            }
          } catch {
            downloadAccomplishmentAsPdf(activity, formOverrides);
          }
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }
      }, 400);
      return;
    }
  } catch (err) {
    console.warn('Dedicated iframe creation failed, falling back:', err);
  }

  try {
    const win = window.open('', '_blank');
    if (win) {
      win.document.open();
      win.document.write(htmlContent);
      win.document.close();
      win.focus();
      win.print();
    } else {
      window.print();
    }
  } catch {
    downloadAccomplishmentAsPdf(activity, formOverrides);
  }
}
