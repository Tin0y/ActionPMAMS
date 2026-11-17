import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  WidthType,
  BorderStyle,
  Header,
  Footer,
  ImageRun,
  ShadingType,
  VerticalAlign,
  convertInchesToTwip
} from 'docx';
import { Activity, ActivityAccomplishmentForm } from '../types';
import { getMsunHeaderBytes, getMsunFooterBytes } from './msunHeaderFooter';
import { getAttachmentName, getAttachmentUrl } from '../services/fileService';
import { fetchImageForDocx, isImageAttachment } from './docxImageHelper';
import {
  resolvePreparedBySignatory,
  resolveReviewedBySignatory,
  resolveRecordedBySignatory
} from './accomplishmentSignatories';

/**
 * Resolves the official Control Code matching MSUN standard:
 * e.g., MSUN-CBIT-ACRPT-001-2026-REV00 or user-provided
 */
export function getAccomplishmentControlNo(
  activity?: Activity | null,
  form?: Partial<ActivityAccomplishmentForm>
): string {
  if (form?.controlNumber && form.controlNumber.trim()) {
    return form.controlNumber.trim();
  }
  const org = (activity?.orgId || 'CBIT').toUpperCase();
  const rawId = activity?.id ? String(activity.id).replace(/\D/g, '').slice(-3) : '001';
  const idNum = (rawId || '001').padStart(3, '0');
  const year = activity?.fiscalYear ? activity.fiscalYear.replace(/\D/g, '') || '2026' : '2026';
  return `MSUN-${org}-ACRPT-${idNum}-${year}-REV00`;
}

/**
 * Generates an official Microsoft Word (.docx) document Blob for the Activity Accomplishment Report,
 * exactly matching the 5 reference images.
 */
export async function generateAccomplishmentDocxBlob(
  activity: Activity,
  formOverrides?: Partial<ActivityAccomplishmentForm>
): Promise<Blob> {
  const form: Partial<ActivityAccomplishmentForm> = {
    ...(activity.accomplishmentForm || {}),
    ...(formOverrides || {})
  };

  const hasActiveAccomplishmentForm = Boolean(formOverrides || activity.accomplishmentForm);
  const title = form.activityTitle || activity?.designForm?.activityTitle || activity?.programActivity || activity?.title || 'Activity Accomplishment Report';
  const isSeniorsWeekSample = !hasActiveAccomplishmentForm && (title || '').toLowerCase().includes('seniors');
  const controlNo = getAccomplishmentControlNo(activity, form);
  const officeCode = form.officeCode || activity?.designForm?.officeCode || `OVCSAS-OSD-${activity.orgId || 'SSC'}`;
  const unitCollege = form.unitCollege || activity?.designForm?.unitCollege || activity.orgId || '—';
  const department = form.department || activity?.designForm?.department || (isSeniorsWeekSample ? (activity.orgId === 'SSC' ? 'OSD' : 'Bachelor of Science in Information Technology') : '—');
  const datePrepared = form.datePrepared || activity.accomplishmentForm?.submittedDate || (isSeniorsWeekSample ? 'June 10, 2026' : new Date().toISOString().split('T')[0]);
  const venue = form.venue || activity?.designForm?.venue || activity.venue || '—';
  const budget = Number(form.proposedBudget ?? activity?.designForm?.proposedBudget ?? activity.budget ?? activity.amount ?? (isSeniorsWeekSample ? 227725 : 0));
  const budgetFormatted = `₱${budget.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const actualBudget = Number(form.actualBudget ?? form.proposedBudget ?? activity?.designForm?.proposedBudget ?? activity.budget ?? 0);
  const actualBudgetFormatted = `₱${actualBudget.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const budgetSource = form.budgetSource || activity?.designForm?.budgetSource || activity.fundSource || (isSeniorsWeekSample ? 'Personal Funds & OVCSAS Fund 01' : '—');
  const dateImpl = form.dateOfImplementation || activity?.designForm?.dateImplementation || activity.startDate || (isSeniorsWeekSample ? 'July 13, 2026 - July 17, 2026' : '—');
  const resultCode = form.resultCode || activity?.designForm?.resultCode || 'None';
  const email = form.emailAddress || activity?.designForm?.emailAddress || `${(activity.orgId || 'osd').toLowerCase()}@msunaawan.edu.ph`;
  const rawDuration = form.durationDays ?? activity?.designForm?.durationDays ?? (isSeniorsWeekSample ? 5 : 1);
  const durationStr = String(rawDuration).trim();
  const duration = durationStr
    ? (/day/i.test(durationStr) ? durationStr : `${durationStr} ${Number(durationStr) === 1 ? 'day' : 'days'}`)
    : '1 day';
  const poeYear = form.pdbYear || activity?.designForm?.includedInPdsYear || '2026';
  const isPoeIncluded = form.pdbIncluded !== false;

  // Section A: Objectives
  const defaultObjectives = [
    'To provide graduating students with a meaningful and memorable celebration before their graduation.',
    'To strengthen camaraderie, unity, and fellowship among the members of Batch LUMINARA, Class of 2026.',
    'To promote student engagement, wellness, and appreciation through various recreational, social, and recognition activities.'
  ];
  const filledObjectives = (form.objectives || []).filter(Boolean);
  const objectives = filledObjectives.length > 0
    ? filledObjectives
    : (isSeniorsWeekSample ? defaultObjectives : ['None specified']);

  // Section B: Narrative Report
  const defaultNarrative = `The Senior Students' Society (SenSSo) successfully conducted Seniors' Week 2026 from July 13 to July 17, 2026, in celebration of the graduating students of Batch LUMINARA, Class of 2026. The week-long celebration was organized to recognize the achievements, perseverance, and growth of the graduating students as they prepared to conclude their academic journey at Mindanao State University at Naawan. It also aimed to provide opportunities for graduating students to create meaningful memories, strengthen friendships, and foster camaraderie through various recreational, social, and recognition activities.

The celebration officially commenced on July 13, 2026, with the SenSSo Fun Run, which gathered graduating students, university employees, alumni, and other members of the university community in promoting physical wellness and healthy living. This was followed by a Zumba session, encouraging participants to remain active while enjoying the festive atmosphere. The morning activities continued with Larong Lahi, featuring traditional Filipino games such as Chinese Garter, Tug of War, Big Volleyball, and Tigsu2x. These activities promoted teamwork, sportsmanship, cooperation, and strengthened camaraderie among the participants.

On July 14 and 15, 2026, the university conducted a Job Fair and Pre-Employment Orientation in collaboration with the Office of Student Welfare (OSW) and SenSSo Officers. These activities equipped graduating students with essential knowledge and opportunities for employment after graduation. Representatives from various agencies and companies provided career opportunities, employment information, and guidance on preparing for the workforce, allowing students to gain valuable insights as they transitioned from academic life to professional careers.

On July 16, 2026, the graduating students participated in the Batch Pictorial, which was conducted according to the scheduled time slots of each college. This activity served as an important milestone for the graduating class, allowing students to commemorate their academic journey through their official graduation photographs. On the same day, the Releasing of Togas was facilitated to ensure that graduating students received their academic regalia in preparation for the upcoming commencement exercises. The distribution was carried out in an organized manner according to the designated schedule for each college.

The final day of the celebration, July 17, 2026, focused on graduation preparations and the culminating celebration. The TOGA Distribution was completed to accommodate students who had not yet claimed their academic attire. The graduating students also participated in OLMAK 2026, which provided an opportunity for fellowship and reflection before graduation. The week concluded with the much-awaited Seniors' Night 2026: 'Grad Ball: Midnight Blue,' where graduating students gathered for an evening of recognition, celebration, and fellowship. The event featured entertainment, interactive activities, and memorable moments that celebrated the accomplishments and shared experiences of Batch LUMINARA.

Overall, Seniors' Week 2026 successfully achieved its objectives of providing graduating students with a meaningful and memorable celebration before graduation, strengthening unity and fellowship among the members of Batch LUMINARA, and promoting student engagement, wellness, and appreciation through various activities. The active participation of the graduating class, together with the support of the university administration, partner offices, faculty members, and SenSSo Officers, contributed to the successful implementation of the week-long celebration.

The activity resulted in increased interaction, collaboration, and camaraderie among graduating students while creating lasting memories and reinforcing a strong sense of pride, appreciation, and belonging. More importantly, Seniors' Week 2026 served as a fitting culmination of the students' undergraduate journey, leaving Batch LUMINARA with meaningful experiences that they will cherish as they move forward into the next chapter of their lives.`;
  const narrativeReport = form.narrativeReport?.trim()
    ? form.narrativeReport
    : (isSeniorsWeekSample ? defaultNarrative : 'No narrative report provided.');

  // Section C: Accomplishment Rows
  const defaultAccomplishmentRows = [
    {
      objectiveNo: 1,
      objective: 'Provide graduating students with a meaningful celebration',
      expectedOutput: 'Creation of lasting memories and a stronger sense of pride, appreciation, and belonging among the graduating students.',
      actualAccomplishment: "Seniors' Week 2026 was successfully conducted through a series of activities, including the Fun Run, Larong Lahi, Batch Pictorial, TOGA distribution, OLMAK 2026, and Seniors' Night, providing graduating students with a memorable and meaningful celebration before graduation.",
      rating: '4'
    },
    {
      objectiveNo: 2,
      objective: 'Strengthen camaraderie, unity, and fellowship',
      expectedOutput: 'Increased interaction, collaboration, and camaraderie among graduating students.',
      actualAccomplishment: 'The recreational, social, and fellowship activities encouraged teamwork, active participation, and interaction among graduating students, fostering stronger camaraderie, unity, and lasting friendships within Batch LUMINARA.',
      rating: '4'
    },
    {
      objectiveNo: 3,
      objective: 'Promote student engagement, wellness, and appreciation',
      expectedOutput: "Successful implementation of Seniors' Week activities with active participation from the graduating class and university community.",
      actualAccomplishment: 'The scheduled activities were successfully implemented with the support of the SenSSo Officers and university offices, achieving active participation from graduating students and promoting wellness, engagement, appreciation, and preparedness for graduation and employment.',
      rating: '4'
    }
  ];
  const accomplishmentRows = form.accomplishmentRows && form.accomplishmentRows.length > 0
    ? form.accomplishmentRows.map((r, i) => ({
        objectiveNo: r.objectiveNo || i + 1,
        objective: r.objective || '',
        expectedOutput: r.expectedOutput || '',
        actualAccomplishment: r.actualAccomplishment || '',
        rating: r.rating ? r.rating.toString().charAt(0) : ''
      }))
    : (isSeniorsWeekSample
      ? defaultAccomplishmentRows
      : [{ objectiveNo: 1, objective: 'No accomplishment rows added.', expectedOutput: '—', actualAccomplishment: '—', rating: '' }]
    );

  // Section D: Photo Documentation
  const photos = form.photoFiles && form.photoFiles.length > 0
    ? form.photoFiles.map(p => ({
        name: getAttachmentName(p),
        url: getAttachmentUrl(p)
      }))
    : (isSeniorsWeekSample
      ? [
          { name: 'Photo 1: Activity Setup & Opening', url: '' },
          { name: 'Photo 2: Interactive Proceedings & Attendees', url: '' },
          { name: 'Photo 3: Participant Engagement & Documentation', url: '' },
          { name: 'Photo 4: Evaluation & Closing Ceremony', url: '' }
        ]
      : []
    );

  // Section E: Evaluation Summary
  const defaultEvaluation = 'The evaluation of Seniors Week 2026 yielded an overall positive result, with 163 respondents expressing high satisfaction with the activity. Participants found the activity informative, relevant, meaningful, and well-organized. The activity assessment received strong positive feedback, particularly in terms of organization, relevance of topics, and increased knowledge and understanding. The venue and food services were also generally satisfactory, although some concerns were raised regarding ventilation, comfort, and facility conditions. Overall, the activity was considered successful and memorable, with participants commending the dedication, teamwork, and efforts of the organizers.';
  const evaluationSummary = form.summaryOfEvaluations?.trim()
    ? form.summaryOfEvaluations
    : (isSeniorsWeekSample ? defaultEvaluation : 'None specified');

  // Section F: Remarks / Comments / Suggestions
  const defaultRemarks = 'Participants described Seniors Week 2026 as a successful, enjoyable, informative, and meaningful activity. They commended the officers and organizers for their dedication, teamwork, and hard work. Suggestions included improving venue ventilation by providing additional fans or air-conditioning, providing cold water and foldable fans, and installing a ceiling cover or tarp to address concerns regarding birds and droppings. Participants also suggested inviting resource speakers with extensive professional experience, offering more webinars for those unable to attend in person, ensuring equal attention to participants seated at the back, and providing additional tables.';
  const remarksComments = form.remarksComments?.trim()
    ? form.remarksComments
    : (isSeniorsWeekSample ? defaultRemarks : 'None specified');

  // Section G: Next Steps / Plan of Action
  const defaultNextSteps = 'The organizers shall consider the recommendations and feedback gathered from the evaluation in the planning and implementation of future Seniors Week activities. Improvements shall focus on enhancing venue ventilation and comfort, ensuring a cleaner and more conducive event environment, providing adequate hydration and seating facilities, and exploring the provision of additional participant amenities such as fans. Future programs shall also consider inviting experienced and engaging resource speakers, offering online or hybrid participation options when appropriate, and ensuring inclusive engagement and equal attention to all participants. The positive practices in organization, teamwork, and program implementation shall likewise be sustained and further improved in succeeding activities.';
  const nextStepsPlanOfAction = form.nextStepsPlanOfAction?.trim()
    ? form.nextStepsPlanOfAction
    : (isSeniorsWeekSample ? defaultNextSteps : 'None specified');

  // Section H: Official Verification & Supporting Documents
  const verificationDocs = [
    { label: 'Scanned DAD (Approved)', file: form.scannedDadFile || '', url: form.scannedDadUrl || '', emptyText: 'Not uploaded' },
    { label: 'Special Order (SO)', file: form.specialOrderFile || '', url: form.specialOrderUrl || '', emptyText: 'Not uploaded' },
    { label: 'Attendance Sheet', file: form.attendanceFile || '', url: form.attendanceUrl || '', emptyText: 'Not uploaded' },
    { label: 'Program Flow', file: form.programFlowFile || '', url: form.programFlowUrl || '', emptyText: 'None attached' }
  ];
  const supportingAttachments = (form.attachments || []).map(att => ({
    name: getAttachmentName(att),
    url: getAttachmentUrl(att)
  }));

  // Signatories (Clean names, position displayed under name without parentheses)
  const preparedSig = resolvePreparedBySignatory(
    form.preparedByName,
    form.preparedByTitle,
    activity?.proposedBy,
    activity?.orgId
  );
  const reviewedSig = resolveReviewedBySignatory(
    form.reviewedByName,
    form.reviewedByTitle,
    activity?.adviserName,
    activity?.orgId
  );
  const recordedSig = resolveRecordedBySignatory(
    form.recordedByName,
    form.recordedByTitle
  );
  const preparedByName = preparedSig.name;
  const preparedByTitle = preparedSig.position;
  const reviewedByName = reviewedSig.name;
  const reviewedByTitle = reviewedSig.position;
  const recordedByName = recordedSig.name;
  const recordedByTitle = recordedSig.position;

  // Fetch Institutional Header and Footer image bytes
  const headerBytes = await getMsunHeaderBytes();
  const footerBytes = await getMsunFooterBytes();

  const headerChildren: (Paragraph | Table)[] = headerBytes.length > 0 ? [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 80 },
      children: [
        new ImageRun({
          data: headerBytes,
          transformation: { width: 660, height: 141 },
          type: 'png'
        })
      ]
    })
  ] : [];

  const footerChildren: (Paragraph | Table)[] = footerBytes.length > 0 ? [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 60, after: 0 },
      children: [
        new ImageRun({
          data: footerBytes,
          transformation: { width: 660, height: 76 },
          type: 'png'
        })
      ]
    })
  ] : [];

  // Table borders & padding helpers matching PDF A4 layout
  const blackBorders = {
    top: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
    bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
    left: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
    right: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
    insideHorizontal: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
    insideVertical: { style: BorderStyle.SINGLE, size: 6, color: '000000' }
  };
  const cardBorders = {
    top: { style: BorderStyle.SINGLE, size: 4, color: '94A3B8' },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: '94A3B8' },
    left: { style: BorderStyle.SINGLE, size: 4, color: '94A3B8' },
    right: { style: BorderStyle.SINGLE, size: 4, color: '94A3B8' }
  };
  const noBorders = {
    top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    insideVertical: { style: BorderStyle.NONE, size: 0, color: 'auto' }
  };
  const cellMargins = { top: 75, bottom: 75, left: 100, right: 100 };

  const bodyChildren: (Paragraph | Table)[] = [];

  // Triplicate subheader notice (right-aligned)
  bodyChildren.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 20, after: 10 },
      children: [
        new TextRun({ text: controlNo, font: 'Arial', bold: true, size: 16, color: '1e293b' })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 0, after: 0 },
      children: [
        new TextRun({ text: 'Print in A4.', font: 'Arial', italics: true, size: 14, color: '475569' })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 0, after: 0 },
      children: [
        new TextRun({ text: 'Produced in TRIPLICATE. One Copy for OME.', font: 'Arial', italics: true, size: 14, color: '475569' })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 0, after: 0 },
      children: [
        new TextRun({ text: 'A copy for the office conducting the activity.', font: 'Arial', italics: true, size: 14, color: '475569' })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 0, after: 0 },
      children: [
        new TextRun({ text: 'And a copy for admin document attachment.', font: 'Arial', italics: true, size: 14, color: '475569' })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 0, after: 80 },
      children: [
        new TextRun({ text: 'Follow the order of signatories for the process flow.', font: 'Arial', italics: true, size: 14, color: '475569' })
      ]
    })
  );

  // Document Title
  bodyChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 80, after: 140 },
      children: [
        new TextRun({ text: 'ACTIVITY ACCOMPLISHMENT REPORT', font: 'Arial', bold: true, size: 24 })
      ]
    })
  );  // ── UNIFIED MASTER ACCOMPLISHMENT FORM TABLE ──
  const masterTableRows: TableRow[] = [];

  // Row 1: Administrative Specifications (2 Columns)
  masterTableRows.push(
    new TableRow({
      children: [
        // Left Column
        new TableCell({
          width: { size: 50, type: WidthType.PERCENTAGE },
          borders: blackBorders,
          children: [
            new Paragraph({
              spacing: { before: 40, after: 30 },
              children: [
                new TextRun({ text: 'Activity Title:  ', font: 'Arial', bold: true, size: 18 }),
                new TextRun({ text: title, font: 'Arial', size: 18, bold: true })
              ]
            }),
            new Paragraph({
              spacing: { before: 20, after: 30 },
              children: [
                new TextRun({ text: 'Office Code:     ', font: 'Arial', bold: true, size: 18 }),
                new TextRun({ text: officeCode, font: 'Arial', size: 18, underline: {} })
              ]
            }),
            new Paragraph({
              spacing: { before: 20, after: 30 },
              children: [
                new TextRun({ text: 'Unit / College:  ', font: 'Arial', bold: true, size: 18 }),
                new TextRun({ text: unitCollege, font: 'Arial', size: 18, underline: {} })
              ]
            }),
            new Paragraph({
              spacing: { before: 20, after: 30 },
              children: [
                new TextRun({ text: 'Department:      ', font: 'Arial', bold: true, size: 18 }),
                new TextRun({ text: department, font: 'Arial', size: 18, underline: {} })
              ]
            }),
            new Paragraph({
              spacing: { before: 20, after: 30 },
              children: [
                new TextRun({ text: 'Result Code / OPCR|IPCR Code: ', font: 'Arial', bold: true, size: 18 }),
                new TextRun({ text: resultCode || 'None', font: 'Arial', size: 18, underline: {} })
              ]
            }),
            new Paragraph({
              spacing: { before: 20, after: 40 },
              children: [
                new TextRun({ text: 'Date of Implementation: ', font: 'Arial', bold: true, size: 18 }),
                new TextRun({ text: dateImpl, font: 'Arial', size: 18, underline: {} })
              ]
            })
          ]
        }),
        // Right Column
        new TableCell({
          width: { size: 50, type: WidthType.PERCENTAGE },
          borders: blackBorders,
          children: [
            new Paragraph({
              spacing: { before: 40, after: 30 },
              children: [
                new TextRun({ text: 'Date Prepared:  ', font: 'Arial', bold: true, size: 18 }),
                new TextRun({ text: datePrepared, font: 'Arial', size: 18, underline: {} })
              ]
            }),
            new Paragraph({
              spacing: { before: 20, after: 30 },
              children: [
                new TextRun({ text: 'Venue:  ', font: 'Arial', bold: true, size: 18 }),
                new TextRun({ text: venue, font: 'Arial', size: 18, underline: {} })
              ]
            }),
            new Paragraph({
              spacing: { before: 20, after: 30 },
              children: [
                new TextRun({ text: 'Proposed Budget (DAD):  ', font: 'Arial', bold: true, size: 18 }),
                new TextRun({ text: budgetFormatted, font: 'Arial', size: 18, bold: true, underline: {} })
              ]
            }),
            new Paragraph({
              spacing: { before: 20, after: 30 },
              children: [
                new TextRun({ text: 'Actual Budget Spent (ACRPT):  ', font: 'Arial', bold: true, size: 18 }),
                new TextRun({ text: actualBudgetFormatted, font: 'Arial', size: 18, bold: true, underline: {} })
              ]
            }),
            new Paragraph({
              spacing: { before: 20, after: 30 },
              children: [
                new TextRun({ text: 'Budget Source:  ', font: 'Arial', bold: true, size: 18 }),
                new TextRun({ text: budgetSource, font: 'Arial', size: 18, underline: {} })
              ]
            }),
            new Paragraph({
              spacing: { before: 20, after: 30 },
              children: [
                new TextRun({ text: `Included in POE Year ${poeYear}:  `, font: 'Arial', bold: true, size: 18 }),
                new TextRun({ text: `[${isPoeIncluded ? 'X' : ' '}] Yes   `, font: 'Arial', size: 18 }),
                new TextRun({ text: `[${!isPoeIncluded ? 'X' : ' '}] No`, font: 'Arial', size: 18 })
              ]
            }),
            new Paragraph({
              spacing: { before: 20, after: 30 },
              children: [
                new TextRun({ text: 'Email Add.: ', font: 'Arial', bold: true, size: 18 }),
                new TextRun({ text: email, font: 'Arial', size: 18, color: '000000', underline: {} })
              ]
            }),
            new Paragraph({
              spacing: { before: 20, after: 40 },
              children: [
                new TextRun({ text: 'Duration (in days): ', font: 'Arial', bold: true, size: 18, italics: true }),
                new TextRun({ text: String(duration), font: 'Arial', size: 18, underline: {} })
              ]
            })
          ]
        })
      ]
    })
  );

  // Row 2: Section A: OBJECTIVE/S
  masterTableRows.push(
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 2,
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: blackBorders,
          children: [
            new Paragraph({
              spacing: { before: 40, after: 30 },
              children: [new TextRun({ text: 'A.   OBJECTIVE/S', font: 'Arial', bold: true, size: 20 })]
            }),
            ...objectives.map((obj, idx) => new Paragraph({
              spacing: { before: 20, after: 20 },
              indent: { left: 400 },
              children: [
                new TextRun({ text: `${idx + 1}.  `, font: 'Arial', bold: true, size: 18 }),
                new TextRun({ text: obj, font: 'Arial', size: 18 })
              ]
            }))
          ]
        })
      ]
    })
  );

  // Row 3: Section B: NARRATIVE REPORT
  const narrativeParagraphs = narrativeReport.split('\n\n').filter(Boolean);
  masterTableRows.push(
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 2,
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: blackBorders,
          children: [
            new Paragraph({
              spacing: { before: 40, after: 30 },
              children: [new TextRun({ text: 'B.   NARRATIVE REPORT', font: 'Arial', bold: true, size: 20 })]
            }),
            ...narrativeParagraphs.map(para => new Paragraph({
              spacing: { before: 30, after: 40 },
              alignment: AlignmentType.JUSTIFIED,
              indent: { firstLine: 400 },
              children: [new TextRun({ text: para.trim(), font: 'Arial', size: 18 })]
            }))
          ]
        })
      ]
    })
  );

  // Section C Accomplishment Table Header Rows
  const ratingHeaderShading = { type: ShadingType.CLEAR, fill: 'F8FAFC' };
  const tableRows: TableRow[] = [
    // Header Row 1: Objective, Expected Output, Actual Accomplishment, Rating Group
    new TableRow({
      children: [
        new TableCell({
          width: { size: 18, type: WidthType.PERCENTAGE },
          borders: blackBorders,
          shading: ratingHeaderShading,
          verticalAlign: VerticalAlign.CENTER,
          margins: cellMargins,
          rowSpan: 2,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 40, after: 40 },
              children: [
                new TextRun({ text: 'OBJECTIVE', font: 'Arial', bold: true, size: 16 })
              ]
            })
          ]
        }),
        new TableCell({
          width: { size: 35, type: WidthType.PERCENTAGE },
          borders: blackBorders,
          shading: ratingHeaderShading,
          verticalAlign: VerticalAlign.CENTER,
          margins: cellMargins,
          rowSpan: 2,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 40, after: 40 },
              children: [
                new TextRun({ text: 'EXPECTED OUTPUT', font: 'Arial', bold: true, size: 16 })
              ]
            })
          ]
        }),
        new TableCell({
          width: { size: 35, type: WidthType.PERCENTAGE },
          borders: blackBorders,
          shading: ratingHeaderShading,
          verticalAlign: VerticalAlign.CENTER,
          margins: cellMargins,
          rowSpan: 2,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 40, after: 40 },
              children: [
                new TextRun({ text: 'ACTUAL ACCOMPLISHMENT', font: 'Arial', bold: true, size: 16 })
              ]
            })
          ]
        }),
        new TableCell({
          width: { size: 12, type: WidthType.PERCENTAGE },
          borders: blackBorders,
          shading: ratingHeaderShading,
          verticalAlign: VerticalAlign.CENTER,
          margins: cellMargins,
          columnSpan: 4,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 20, after: 0 },
              children: [
                new TextRun({ text: 'ACCOMPLISHMENT', font: 'Arial', bold: true, size: 14 })
              ]
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 0, after: 20 },
              children: [
                new TextRun({ text: 'RATING SCALE', font: 'Arial', bold: true, size: 14 })
              ]
            })
          ]
        })
      ]
    }),
    // Header Row 2: Columns 4, 3, 2, 1
    new TableRow({
      children: ['4', '3', '2', '1'].map(num =>
        new TableCell({
          width: { size: 3, type: WidthType.PERCENTAGE },
          borders: blackBorders,
          shading: ratingHeaderShading,
          verticalAlign: VerticalAlign.CENTER,
          margins: { top: 40, bottom: 40, left: 40, right: 40 },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 10, after: 10 },
              children: [new TextRun({ text: num, font: 'Arial', bold: true, size: 16 })]
            })
          ]
        })
      )
    })
  ];

  // Data rows for Section C
  accomplishmentRows.forEach((row) => {
    const is4 = row.rating === '4';
    const is3 = row.rating === '3';
    const is2 = row.rating === '2';
    const is1 = row.rating === '1';
    const objectiveCellText = row.objective ? `${row.objectiveNo}. ${row.objective}` : String(row.objectiveNo);

    tableRows.push(
      new TableRow({
        children: [
          new TableCell({
            width: { size: 18, type: WidthType.PERCENTAGE },
            borders: blackBorders,
            margins: cellMargins,
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { before: 20, after: 20 },
                children: [
                  new TextRun({ text: objectiveCellText, font: 'Arial', bold: true, size: 17 })
                ]
              })
            ]
          }),
          new TableCell({
            width: { size: 35, type: WidthType.PERCENTAGE },
            borders: blackBorders,
            margins: cellMargins,
            children: [
              new Paragraph({
                alignment: AlignmentType.JUSTIFIED,
                spacing: { before: 20, after: 20 },
                children: [
                  new TextRun({ text: row.expectedOutput, font: 'Arial', size: 17 })
                ]
              })
            ]
          }),
          new TableCell({
            width: { size: 35, type: WidthType.PERCENTAGE },
            borders: blackBorders,
            margins: cellMargins,
            children: [
              new Paragraph({
                alignment: AlignmentType.JUSTIFIED,
                spacing: { before: 20, after: 20 },
                children: [
                  new TextRun({ text: row.actualAccomplishment, font: 'Arial', size: 17 })
                ]
              })
            ]
          }),
          ...[is4, is3, is2, is1].map(checked =>
            new TableCell({
              width: { size: 3, type: WidthType.PERCENTAGE },
              borders: blackBorders,
              verticalAlign: VerticalAlign.CENTER,
              margins: { top: 40, bottom: 40, left: 40, right: 40 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 20, after: 20 },
                  children: [new TextRun({ text: checked ? '✔' : '', font: 'Arial', bold: true, size: 18 })]
                })
              ]
            })
          )
        ]
      })
    );
  });

  const ratingsTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: blackBorders,
    rows: tableRows
  });

  // Row 4: Section C: ACTUAL ACCOMPLISHMENT AND RATING (Inner ratings table integrated into cell)
  masterTableRows.push(
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 2,
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: blackBorders,
          children: [
            new Paragraph({
              spacing: { before: 40, after: 30 },
              children: [new TextRun({ text: 'C.   Actual Accomplishment and Rating:', font: 'Arial', bold: true, size: 20 })]
            }),
            ratingsTable,
            new Paragraph({
              spacing: { before: 40, after: 20 },
              children: [
                new TextRun({ text: 'Accomplishment Rating Scale:  ', font: 'Arial', italics: true, bold: true, size: 16 }),
                new TextRun({ text: '4 - Fully Achieved     3 - Largely Achieved     2 - Partially Achieved     1 - Not Achieved', font: 'Arial', size: 16 })
              ]
            })
          ]
        })
      ]
    })
  );

  // Row 5: Section D: Photo Documentation (2-column embedded photo grid matching PDF/Preview)
  const resolvedPhotos = await Promise.all(
    photos.map(async (p) => ({
      ...p,
      image: p.url ? await fetchImageForDocx(p.url, 250, 170) : null
    }))
  );

  const photoChildren: (Paragraph | Table)[] = [
    new Paragraph({
      spacing: { before: 40, after: 60 },
      children: [new TextRun({ text: 'D.   PHOTO DOCUMENTATION', font: 'Arial', bold: true, size: 19 })]
    })
  ];

  if (resolvedPhotos.length > 0) {
    const buildPhotoCell = (
      item: (typeof resolvedPhotos)[number] | null,
      idx: number
    ): TableCell => {
      if (!item) {
        return new TableCell({
          width: { size: 50, type: WidthType.PERCENTAGE },
          borders: noBorders,
          children: [new Paragraph({ children: [] })]
        });
      }

      const cardChildren: Paragraph[] = [];
      if (item.image) {
        cardChildren.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 40, after: 60 },
            children: [
              new ImageRun({
                data: item.image.data,
                transformation: { width: item.image.width, height: item.image.height },
                type: item.image.type
              })
            ]
          })
        );
      } else {
        cardChildren.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 120, after: 80 },
            children: [
              new TextRun({ text: '[Photo preview unavailable]', font: 'Arial', italics: true, size: 16, color: '64748B' })
            ]
          })
        );
      }

      cardChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 20, after: 10 },
          children: [
            new TextRun({ text: item.name, font: 'Arial', bold: true, size: 16, color: '1E293B' })
          ]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 40 },
          children: [
            new TextRun({ text: `Activity Photo Document #${idx + 1}`, font: 'Arial', size: 14, color: '64748B' })
          ]
        })
      );

      return new TableCell({
        width: { size: 50, type: WidthType.PERCENTAGE },
        borders: cardBorders,
        shading: { type: ShadingType.CLEAR, fill: 'F8FAFC' },
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 80, bottom: 80, left: 100, right: 100 },
        children: cardChildren
      });
    };

    const photoGridRows: TableRow[] = [];
    for (let i = 0; i < resolvedPhotos.length; i += 2) {
      photoGridRows.push(
        new TableRow({
          cantSplit: true,
          children: [
            buildPhotoCell(resolvedPhotos[i], i),
            buildPhotoCell(resolvedPhotos[i + 1] ?? null, i + 1)
          ]
        })
      );
    }

    photoChildren.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: noBorders,
        rows: photoGridRows
      })
    );
  } else {
    photoChildren.push(
      new Paragraph({
        spacing: { before: 20, after: 30 },
        children: [new TextRun({ text: 'No photo documentation uploaded.', font: 'Arial', italics: true, size: 18, color: '475569' })]
      })
    );
  }

  masterTableRows.push(
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 2,
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: blackBorders,
          margins: cellMargins,
          children: photoChildren
        })
      ]
    })
  );

  // Row 6: Section E: Summary of Evaluation
  masterTableRows.push(
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 2,
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: blackBorders,
          children: [
            new Paragraph({
              spacing: { before: 40, after: 30 },
              children: [new TextRun({ text: 'E.   Summary of Evaluation', font: 'Arial', bold: true, size: 20 })]
            }),
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              spacing: { before: 20, after: 30 },
              children: [new TextRun({ text: evaluationSummary, font: 'Arial', size: 18 })]
            })
          ]
        })
      ]
    })
  );

  // Row 7: Section F: Remarks / Comments / Suggestions
  masterTableRows.push(
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 2,
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: blackBorders,
          children: [
            new Paragraph({
              spacing: { before: 40, after: 30 },
              children: [new TextRun({ text: 'F.   Remarks / Comments / Suggestions', font: 'Arial', bold: true, size: 20 })]
            }),
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              spacing: { before: 20, after: 30 },
              children: [new TextRun({ text: remarksComments, font: 'Arial', size: 18 })]
            })
          ]
        })
      ]
    })
  );

  // Row 8: Section G: Next Steps / Plan of Action
  masterTableRows.push(
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 2,
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: blackBorders,
          children: [
            new Paragraph({
              spacing: { before: 40, after: 30 },
              children: [new TextRun({ text: 'G.   Next Steps / Plan of Action', font: 'Arial', bold: true, size: 20 })]
            }),
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              spacing: { before: 20, after: 30 },
              children: [new TextRun({ text: nextStepsPlanOfAction, font: 'Arial', size: 18 })]
            })
          ]
        })
      ]
    })
  );

  // Row 9: Section H: Official Verification & Supporting Documents (2x2 Grid + Supporting Attachments)
  const resolvedSupportingAttachments = await Promise.all(
    supportingAttachments.map(async (att) => ({
      ...att,
      image:
        att.url && isImageAttachment(att.name, att.url)
          ? await fetchImageForDocx(att.url, 260, 175)
          : null
    }))
  );

  const verificationGridRows: TableRow[] = [];
  for (let i = 0; i < verificationDocs.length; i += 2) {
    verificationGridRows.push(
      new TableRow({
        children: [verificationDocs[i], verificationDocs[i + 1]].map((doc) =>
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
              left: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
              right: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' }
            },
            shading: { type: ShadingType.CLEAR, fill: 'F8FAFC' },
            margins: { top: 60, bottom: 60, left: 90, right: 90 },
            children: [
              new Paragraph({
                spacing: { before: 10, after: 10 },
                children: [
                  new TextRun({ text: `${doc.label}: `, font: 'Arial', bold: true, size: 17 }),
                  new TextRun({
                    text: doc.file || doc.emptyText,
                    font: 'Arial',
                    bold: Boolean(doc.file),
                    italics: !doc.file,
                    size: 17,
                    color: doc.file ? '000000' : '64748B'
                  })
                ]
              })
            ]
          })
        )
      })
    );
  }

  const sectionHChildren: (Paragraph | Table)[] = [
    new Paragraph({
      spacing: { before: 40, after: 40 },
      children: [new TextRun({ text: 'H.   OFFICIAL VERIFICATION & SUPPORTING DOCUMENTS', font: 'Arial', bold: true, size: 19 })]
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: noBorders,
      rows: verificationGridRows
    }),
    new Paragraph({
      spacing: { before: 60, after: 20 },
      children: [
        new TextRun({ text: `Supporting Attachments (${resolvedSupportingAttachments.length}):`, font: 'Arial', bold: true, size: 17 })
      ]
    })
  ];

  if (resolvedSupportingAttachments.length > 0) {
    for (const att of resolvedSupportingAttachments) {
      sectionHChildren.push(
        new Paragraph({
          spacing: { before: 15, after: att.image ? 25 : 15 },
          indent: { left: convertInchesToTwip(0.2) },
          children: [
            new TextRun({ text: `• ${att.name}`, font: 'Arial', size: 17, color: '000000' })
          ]
        })
      );
      if (att.image) {
        sectionHChildren.push(
          new Paragraph({
            spacing: { before: 20, after: 50 },
            indent: { left: convertInchesToTwip(0.35) },
            children: [
              new ImageRun({
                data: att.image.data,
                transformation: { width: att.image.width, height: att.image.height },
                type: att.image.type
              })
            ]
          })
        );
      }
    }
  } else {
    sectionHChildren.push(
      new Paragraph({
        spacing: { before: 10, after: 20 },
        indent: { left: convertInchesToTwip(0.2) },
        children: [new TextRun({ text: 'None attached.', font: 'Arial', italics: true, size: 17, color: '64748B' })]
      })
    );
  }

  masterTableRows.push(
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 2,
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: blackBorders,
          margins: cellMargins,
          children: sectionHChildren
        })
      ]
    })
  );

  // Push Unified Master Accomplishment Form Table
  bodyChildren.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: blackBorders,
      rows: masterTableRows
    })
  );

  // Signatories Section (Outside of Master Table as requested)
  bodyChildren.push(
    new Paragraph({
      spacing: { before: 240, after: 40 },
      children: []
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE }
      },
      rows: [
        // Row 1: Prepared by & Reviewed by
        new TableRow({
          children: [
            // (1) Prepared by
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE }
              },
              children: [
                new Paragraph({
                  spacing: { before: 40, after: 80 },
                  children: [new TextRun({ text: 'Prepared by:', font: 'Arial', size: 18, color: '334155' })]
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 60, after: 20 },
                  children: [new TextRun({ text: preparedByName, font: 'Arial', bold: true, underline: {}, size: 19 })]
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 40 },
                  children: [new TextRun({ text: preparedByTitle, font: 'Arial', size: 17, color: '334155' })]
                })
              ]
            }),
            // (2) Reviewed by
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE }
              },
              children: [
                new Paragraph({
                  spacing: { before: 40, after: 80 },
                  children: [new TextRun({ text: 'Reviewed by:', font: 'Arial', size: 18, color: '334155' })]
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 60, after: 20 },
                  children: [new TextRun({ text: reviewedByName, font: 'Arial', bold: true, underline: {}, size: 19 })]
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 40 },
                  children: [new TextRun({ text: reviewedByTitle, font: 'Arial', size: 17, color: '334155' })]
                })
              ]
            })
          ]
        }),
        // Row 2: (3) Recorded by (Centered below)
        new TableRow({
          children: [
            new TableCell({
              width: { size: 100, type: WidthType.PERCENTAGE },
              columnSpan: 2,
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE }
              },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 140, after: 60 },
                  children: [new TextRun({ text: 'Recorded by:', font: 'Arial', size: 18, color: '334155' })]
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 40, after: 20 },
                  children: [new TextRun({ text: recordedByName, font: 'Arial', bold: true, underline: {}, size: 19 })]
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 60 },
                  children: [new TextRun({ text: recordedByTitle, font: 'Arial', size: 17, color: '334155' })]
                })
              ]
            })
          ]
        })
      ]
    })
  );

  // Document construction
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 }, // A4 Portrait (210mm x 297mm)
            margin: {
              top: convertInchesToTwip(0.45),
              bottom: convertInchesToTwip(0.5),
              left: convertInchesToTwip(0.47),
              right: convertInchesToTwip(0.47)
            }
          }
        },
        headers: {
          default: new Header({
            children: headerChildren
          })
        },
        footers: {
          default: new Footer({
            children: footerChildren
          })
        },
        children: bodyChildren
      }
    ]
  });

  return await Packer.toBlob(doc);
}

/**
 * Triggers direct browser download of the generated .docx file.
 */
export async function downloadAccomplishmentAsDocx(
  activity: Activity,
  formOverrides?: Partial<ActivityAccomplishmentForm>
): Promise<void> {
  const blob = await generateAccomplishmentDocxBlob(activity, formOverrides);
  const controlNo = getAccomplishmentControlNo(activity, formOverrides);
  const safeFilename = `${controlNo}_Activity_Accomplishment_Report.docx`.replace(/[^a-zA-Z0-9_-]/g, '_');

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safeFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
