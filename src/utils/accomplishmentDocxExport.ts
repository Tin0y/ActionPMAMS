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
  convertInchesToTwip
} from 'docx';
import { Activity, ActivityAccomplishmentForm } from '../types';
import { getMsunHeaderBytes, getMsunFooterBytes } from './msunHeaderFooter';
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
  const defaultAccomplishmentRows = [
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
      spacing: { before: 0, after: 100 },
      children: [
        new ImageRun({
          data: headerBytes,
          transformation: { width: 590, height: 126 },
          type: 'png'
        })
      ]
    })
  ] : [];

  const footerChildren: (Paragraph | Table)[] = footerBytes.length > 0 ? [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 80, after: 0 },
      children: [
        new ImageRun({
          data: footerBytes,
          transformation: { width: 590, height: 68 },
          type: 'png'
        })
      ]
    })
  ] : [];

  // Table borders styling helper
  const blackBorders = {
    top: { style: BorderStyle.SINGLE, size: 8, color: '000000' },
    bottom: { style: BorderStyle.SINGLE, size: 8, color: '000000' },
    left: { style: BorderStyle.SINGLE, size: 8, color: '000000' },
    right: { style: BorderStyle.SINGLE, size: 8, color: '000000' }
  };

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
                new TextRun({ text: 'Proposed Budget:  ', font: 'Arial', bold: true, size: 18 }),
                new TextRun({ text: budgetFormatted, font: 'Arial', size: 18, bold: true, underline: {} })
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
                new TextRun({ text: `Included in the POE Year  ${poeYear}   `, font: 'Arial', bold: true, size: 18 }),
                new TextRun({ text: 'Yes  ', font: 'Arial', bold: true, size: 18 }),
                new TextRun({ text: isPoeIncluded ? '☑  ' : '☐  ', font: 'Arial', size: 20 }),
                new TextRun({ text: 'No  ', font: 'Arial', bold: true, size: 18 }),
                new TextRun({ text: !isPoeIncluded ? '☑' : '☐', font: 'Arial', size: 20 })
              ]
            }),
            new Paragraph({
              spacing: { before: 20, after: 30 },
              children: [
                new TextRun({ text: 'Email Add.: ', font: 'Arial', bold: true, size: 18 }),
                new TextRun({ text: email, font: 'Arial', size: 18, color: '002060', underline: {} })
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
  const tableRows: TableRow[] = [
    // Header Row 1: Objective No, Expected Output, Actual Accomplishment, Rating Group
    new TableRow({
      children: [
        new TableCell({
          width: { size: 12, type: WidthType.PERCENTAGE },
          borders: blackBorders,
          rowSpan: 2,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 60, after: 60 },
              children: [
                new TextRun({ text: 'OBJECTIVE\nNO.', font: 'Arial', bold: true, size: 16 })
              ]
            })
          ]
        }),
        new TableCell({
          width: { size: 30, type: WidthType.PERCENTAGE },
          borders: blackBorders,
          rowSpan: 2,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 60, after: 60 },
              children: [
                new TextRun({ text: 'EXPECTED OUTPUT', font: 'Arial', bold: true, size: 16 })
              ]
            })
          ]
        }),
        new TableCell({
          width: { size: 36, type: WidthType.PERCENTAGE },
          borders: blackBorders,
          rowSpan: 2,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 60, after: 60 },
              children: [
                new TextRun({ text: 'ACTUAL ACCOMPLISHMENT', font: 'Arial', bold: true, size: 16 })
              ]
            })
          ]
        }),
        new TableCell({
          width: { size: 22, type: WidthType.PERCENTAGE },
          borders: blackBorders,
          columnSpan: 4,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 40, after: 40 },
              children: [
                new TextRun({ text: 'ACCOMPLISHMENT\nRATING SCALE', font: 'Arial', bold: true, size: 15 })
              ]
            })
          ]
        })
      ]
    }),
    // Header Row 2: Columns 4, 3, 2, 1
    new TableRow({
      children: [
        new TableCell({
          width: { size: 5.5, type: WidthType.PERCENTAGE },
          borders: blackBorders,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 20, after: 20 },
              children: [new TextRun({ text: '4', font: 'Arial', bold: true, size: 16 })]
            })
          ]
        }),
        new TableCell({
          width: { size: 5.5, type: WidthType.PERCENTAGE },
          borders: blackBorders,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 20, after: 20 },
              children: [new TextRun({ text: '3', font: 'Arial', bold: true, size: 16 })]
            })
          ]
        }),
        new TableCell({
          width: { size: 5.5, type: WidthType.PERCENTAGE },
          borders: blackBorders,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 20, after: 20 },
              children: [new TextRun({ text: '2', font: 'Arial', bold: true, size: 16 })]
            })
          ]
        }),
        new TableCell({
          width: { size: 5.5, type: WidthType.PERCENTAGE },
          borders: blackBorders,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 20, after: 20 },
              children: [new TextRun({ text: '1', font: 'Arial', bold: true, size: 16 })]
            })
          ]
        })
      ]
    })
  ];

  // Data rows for Section C
  accomplishmentRows.forEach((row) => {
    const is4 = row.rating === '4';
    const is3 = row.rating === '3';
    const is2 = row.rating === '2';
    const is1 = row.rating === '1';

    tableRows.push(
      new TableRow({
        children: [
          new TableCell({
            width: { size: 12, type: WidthType.PERCENTAGE },
            borders: blackBorders,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 40, after: 40 },
                children: [
                  new TextRun({ text: String(row.objectiveNo), font: 'Arial', bold: true, size: 17 })
                ]
              })
            ]
          }),
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            borders: blackBorders,
            children: [
              new Paragraph({
                spacing: { before: 40, after: 40 },
                children: [
                  new TextRun({ text: row.expectedOutput, font: 'Arial', size: 17 })
                ]
              })
            ]
          }),
          new TableCell({
            width: { size: 36, type: WidthType.PERCENTAGE },
            borders: blackBorders,
            children: [
              new Paragraph({
                spacing: { before: 40, after: 40 },
                children: [
                  new TextRun({ text: row.actualAccomplishment, font: 'Arial', size: 17 })
                ]
              })
            ]
          }),
          new TableCell({
            width: { size: 5.5, type: WidthType.PERCENTAGE },
            borders: blackBorders,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 40, after: 40 },
                children: [new TextRun({ text: is4 ? '✔' : '', font: 'Arial', bold: true, size: 18 })]
              })
            ]
          }),
          new TableCell({
            width: { size: 5.5, type: WidthType.PERCENTAGE },
            borders: blackBorders,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 40, after: 40 },
                children: [new TextRun({ text: is3 ? '✔' : '', font: 'Arial', bold: true, size: 18 })]
              })
            ]
          }),
          new TableCell({
            width: { size: 5.5, type: WidthType.PERCENTAGE },
            borders: blackBorders,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 40, after: 40 },
                children: [new TextRun({ text: is2 ? '✔' : '', font: 'Arial', bold: true, size: 18 })]
              })
            ]
          }),
          new TableCell({
            width: { size: 5.5, type: WidthType.PERCENTAGE },
            borders: blackBorders,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 40, after: 40 },
                children: [new TextRun({ text: is1 ? '✔' : '', font: 'Arial', bold: true, size: 18 })]
              })
            ]
          })
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

  // Row 5: Section D: Photo Documentation (Box integrated into cell)
  const photoDocxTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: blackBorders,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: blackBorders,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 80, after: 30 },
                children: [
                  new TextRun({ text: '📷 [Photo 1: Activity Setup & Opening]', font: 'Arial', italics: true, size: 16 }),
                  new TextRun({ text: '               ', size: 16 }),
                  new TextRun({ text: '📷 [Photo 2: Interactive Proceedings & Attendees]', font: 'Arial', italics: true, size: 16 })
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 60, after: 80 },
                children: [
                  new TextRun({ text: '📷 [Photo 3: Participant Engagement & Documentation]', font: 'Arial', italics: true, size: 16 }),
                  new TextRun({ text: '               ', size: 16 }),
                  new TextRun({ text: '📷 [Photo 4: Evaluation & Closing Ceremony]', font: 'Arial', italics: true, size: 16 })
                ]
              })
            ]
          })
        ]
      })
    ]
  });

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
              children: [new TextRun({ text: 'D.   Photo Documentation', font: 'Arial', bold: true, size: 20 })]
            }),
            photoDocxTable
          ]
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
              top: convertInchesToTwip(0.6),
              bottom: convertInchesToTwip(0.65),
              left: convertInchesToTwip(0.6),
              right: convertInchesToTwip(0.6)
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
