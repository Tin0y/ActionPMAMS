import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  Header,
  Footer,
  ImageRun,
  VerticalAlign,
  ShadingType,
  convertInchesToTwip
} from 'docx';
import { Activity, ActivityDesignForm } from '../types';
import { getMsunHeaderBytes, getMsunFooterBytes } from './msunHeaderFooter';
import { isCollegeOrg } from '../data/initialData';

/**
 * Standard table borders (thin black 0.5pt - 1pt)
 */
const TABLE_BORDERS = {
  top: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
  bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
  left: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
  right: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  insideVertical: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
};

const NO_BORDERS = {
  top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  insideVertical: { style: BorderStyle.NONE, size: 0, color: 'auto' },
};

/**
 * Generates an authentic DOCX Word Document reproducing the official
 * Mindanao State University at Naawan Detailed Activity Design (DAD) format
 * shown in the reference screenshots.
 */
export async function generateDadDocxBlob(
  activity: Activity,
  formOverrides?: Partial<ActivityDesignForm>
): Promise<Blob> {
  const form: Partial<ActivityDesignForm> = {
    ...(activity.designForm || {}),
    ...(formOverrides || {})
  };

  const isCollege = isCollegeOrg(activity.orgId);
  const isWelcomingSample = (activity.title || activity.programActivity || '').toLowerCase().includes('welcoming') || (form.activityTitle || '').toLowerCase().includes('welcoming');

  const title = form.activityTitle || activity.programActivity || activity.title || 'Detailed Activity Design';
  const controlNo = form.controlNumber || `MSUN-${activity.orgId || 'SSC'}-DAD-${activity.id || '001-2025-REV00'}`;
  const officeCode = form.officeCode || `OVCSAS-OSIPS-OSD-OSW-${activity.orgId || 'SSC'}`;
  const datePrepared = form.datePrepared || activity.submittedDate || 'July 25, 2025';
  const unitCollege = form.unitCollege || activity.orgId || (isCollege ? `${activity.orgId} College` : 'CBIT, CELS, CESS, CFMS');
  const department = form.department || (isCollege ? `${activity.orgId} Student Organizations` : 'Student Organizations & Services');
  const venue = form.venue || activity.venue || 'TSAC, Bandstand, FH, Court';
  const dateImpl = form.dateImplementation || activity.startDate || 'August 11-15, 2025';
  const budget = Number(form.proposedBudget ?? activity.budget ?? activity.amount ?? 10000);
  const budgetFormatted = `₱${budget.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const resultCode = form.resultCode || activity.strategicObjectives || 'OPCR-2027';
  const budgetSource = form.budgetSource || activity.fundSource || `${activity.orgId || 'SSC'} Funds`;
  const email = form.emailAddress || `${(activity.orgId || 'ssc').toLowerCase()}@msunaawan.edu.ph, osd@msunaawan.edu.ph`;
  const duration = form.durationDays || (activity.startDate && activity.endDate && activity.startDate === activity.endDate ? '1 Day' : '5 Days');
  
  const rationale = form.rationale || activity.description ||
    (isWelcomingSample
      ? 'Welcoming Week 2025 is more than just a tradition—it\'s a vibrant celebration of new beginnings and shared aspirations at MSU-Naawan. Designed to warmly usher in our first-year students and re-ignite the spirit of returning MSUans, this week-long festivity blends fun, culture, and purpose through dynamic activities, creative showcases, and meaningful connections. It\'s a chance to discover the heart of our campus life, meet inspiring student leaders, and embrace the unique MSUan identity that unites us all. This isn\'t just a welcome—it\'s a spark that sets the tone for an empowered, inclusive, and unforgettable school year ahead.'
      : `The proposed activity "${title}" is designed to advance the organizational mission of ${activity.orgId || 'the student organization'} and enrich the academic, leadership, and socio-cultural experience of MSU at Naawan students.`
    );

  const rawObjectives = form.objectives || activity.strategicObjectives;
  const objectives = (form.objectivesList?.filter(Boolean).length
    ? form.objectivesList.filter(Boolean)
    : (rawObjectives
      ? rawObjectives.split('\n').filter(Boolean)
      : (isWelcomingSample
        ? [
            'To foster a sense of belonging and inclusivity among new and returning students by creating a warm and engaging campus environment through planned welcoming activities and peer interactions.',
            'To introduce first-year students to the university\'s culture, values, and support systems through structured orientations, campus tours, and interactive sessions led by student leaders and offices.',
            'To promote student engagement and involvement by providing opportunities for recognized student organizations and university offices to showcase their roles, services, and initiatives.'
          ]
        : [
            `To successfully implement the core initiatives and objectives outlined for ${title}.`,
            'To encourage active student collaboration, skill development, and community engagement.',
            'To ensure transparent governance and documentation of student activities in MSU at Naawan.'
          ]
        )
      )
  );

  const rawOutputs = form.expectedOutput || activity.expectedOutput;
  const outputs = (form.expectedOutputsList?.filter(Boolean).length
    ? form.expectedOutputsList.filter(Boolean)
    : (rawOutputs
      ? rawOutputs.split('\n').filter(Boolean)
      : (isWelcomingSample
        ? [
            'Increased sense of connection and inclusion among students, as observed through active participation in welcoming activities, positive student feedback, and stronger peer-to-peer interactions.',
            'First-year students demonstrate familiarity with campus facilities, key offices, and support systems, as reflected in post-orientation assessments or feedback forms.',
            'Increased student interest and involvement in organizations and campus initiatives, as reflected in new member sign-ups, inquiries, and participation during organization fairs or showcase events.'
          ]
        : [
            `Full participation of targeted student cohort (${activity.targetParticipants || '200+'} students) in ${title}.`,
            'Documentation of accomplishments, attendee feedback ratings, and post-activity evaluations.',
            'Compliant liquidation and post-activity reporting submitted in accordance with university guidelines.'
          ]
        )
      )
  );

  const scheduleItems = form.scheduleItems?.length
    ? form.scheduleItems
    : (isWelcomingSample
      ? [
          { dateTime: '6:00AM – 7:00AM\n7:00AM – 7:30AM\n8:00AM – 10:00AM', activity: 'OPENING PROGRAM\n• Dance Exercise – Indak Kalaunan Performing Arts\n• Pamainit\n• Parade of Colleges – Officials, Deans, Coordinators, Faculty Members, and Students\n• Preliminaries – Koro Kaayad Kaligaon\n• Welcome Address – Ma\'am Arleen Uy\n• Intermission Number – MSUN Crimsons\n• Inspirational Message – Dr. Elnor Roa\n• College Cheering:\n  a) CBIT – All Societies and Executive Council w/ College Coordinator\n  b) CELS – All Societies and Executive Council w/ College Coordinator\n  c) CESS – All Societies and Executive Council w/ College Coordinator\n  d) CFMS – All Societies and Executive Council w/ College Coordinator\n• Special Number – MSUN Arnis Team\n• Closing Remarks – Ma\'am Rosevel Colegado\n• Official Opening of Booths & Organizations – MSUN Chancellor, Vice Chancellors, Deans, Coordinators, Faculty Members, Students\n\nEMCEES: Ms. Sandarka Langam & Mr. Frances Maliao', personInCharge: 'All SSC Officers, College Officers, and Organizations' },
          { dateTime: '1:00PM – 4:00PM', activity: 'CAMPUS TOUR FOR FRESHMEN STUDENTS\n• TSAC or Oval\n• MSUN Dorm\n• CFMS Building\n• Admin Building\n• E-Library\n• Student Lounge\n• Infirmary\n• NESB Building\n• MESC Building\n• CSE Building\n• IT Building\n• AVR\n• Research Division', personInCharge: 'All SSC Officers, College Officers, and Organizations' },
          { dateTime: '6:00PM – 8:30PM', activity: 'TARA, SHOW MO \'YAN, ARTE NATIN \'TO: A NIGHT OF TALENTS\n• Preliminaries – Audio-Visual Presentation\n• Welcoming Remarks – Ma\'am Arleen Uy\n• Message – Dr. Elnor Roa\n• Director\'s Speech – Ms. Sweet Kayla Hanasan\n• Reminders\n• "The Lagoon"\n• Closing Remarks – Ma\'am Nylette Jarales\n\nEMCEES: Ms. Ashly Joy Mercado', personInCharge: 'All SSC Officers, College Officers, and Organizations' },
          { dateTime: '8:00AM – 12:00NN', activity: 'DAY 2: CBIT GENERAL ASSEMBLY\n• Attendance\n• Preliminaries – Audio-Visual Presentation\n• Welcome Remarks\n• Oath-Taking and Introduction of Officers\n• Presentation of Activities for A.Y. 2025 - 2026\n• Open Forum\n• Recognition for Former College Officers', personInCharge: 'CBIT Executive Council' }
        ]
      : [
          {
            dateTime: `${activity.startDate || 'Day 1'}${activity.startTime ? ` (${activity.startTime} – ${activity.endTime || 'End'})` : ''}`,
            activity: `${activity.programActivity || activity.title || 'Official Program'}\n• Registration & Preliminaries\n• Opening Message & Presentation\n• Core Activity Implementation\n• Open Forum & Evaluation`,
            personInCharge: form.submittedBy || activity.proposedBy || `${activity.orgId || 'Organization'} Leadership`
          }
        ]
    );

  const participantsText = form.participantsText || (
    form.participants?.length
      ? form.participants.map(p => (typeof p === 'string' ? p : `${p.name} (${p.position})`)).join(', ')
      : (isWelcomingSample
        ? '• All Enrolled MSUN Students\n• MSUN-IDS Tabodagat Dance Troupe\n  1. Samantha Nicole C. Dadulo\n  2. Alyana Monica B. Colegado\n  3. Denise Carl D. Montejo\n  4. David Howard M. Dadole\n  5. Nicole P. Gaa\n  6. Juniel L. Entera\n  7. Jaiho A. Laguit\n  8. Lovelyn Dayrose Godelieve Pogoy\n• MSUN-IDS Universal Dancers\n  1. Safia F. Alinabon\n  2. Annalou Jane G. Abitona\n  3. Marianne Gelli B. Barrera\n  4. Julia Nelly R. Gabe\n  5. Zueweca L. Mercado\n  6. Angel Missy P. Sacala\n  7. Kinshin C. Yaun\n  8. Sophie Krisray Relativo\n  9. Jan Nina Micaela J. Naldo\n  10. Donna Marie C. Canitan\n  11. Keizsha Bryanna G. Gases'
        : `• Target Participants: ${activity.targetParticipants || 150} students\n• ${activity.orgId || 'Organization'} Officers and Members\n• Faculty Advisers, College Deans, and University Officials`
      )
  );

  const budgetItems = form.budgetaryRequirements?.length
    ? form.budgetaryRequirements
    : (isWelcomingSample
      ? [
          { item: '10', particulars: 'Cartolina (Yellow)', amount: 100, budgetSource },
          { item: '10', particulars: 'Cartolina (Blue)', amount: 100, budgetSource },
          { item: '10', particulars: 'Cartolina (Purple)', amount: 100, budgetSource },
          { item: '10', particulars: 'Cartolina (Green)', amount: 100, budgetSource },
          { item: '3', particulars: 'Illustration Board', amount: 105, budgetSource },
          { item: '2', particulars: 'Crepe Paper (Assorted Colors)', amount: 200, budgetSource },
          { item: '10', particulars: 'Photo Paper', amount: 450, budgetSource },
          { item: '10', particulars: 'Stick Glue', amount: 100, budgetSource },
          { item: '10', particulars: 'Double-Sided Tape', amount: 300, budgetSource },
          { item: '1', particulars: 'SSC Banner', amount: 800, budgetSource },
          { item: '50', particulars: 'Bantings: Charrol (White)', amount: 1500, budgetSource },
          { item: '6', particulars: 'Balloons (Assorted Colors)', amount: 420, budgetSource },
          { item: '5', particulars: 'Lace Blue', amount: 350, budgetSource },
          { item: '4', particulars: 'Ribbons (Yellow & Blue)', amount: 600, budgetSource },
          { item: '2', particulars: 'Tarpaulin (8x10)', amount: 2000, budgetSource },
          { item: '3', particulars: 'Straw Roll', amount: 255, budgetSource },
          { item: '50', particulars: 'Water', amount: 1250, budgetSource },
          { item: '1', particulars: 'Tire Wire', amount: 500, budgetSource }
        ]
      : [
          {
            item: '1',
            particulars: activity.lineItemBudget || `Program Materials and Logistics for ${title}`,
            amount: budget,
            budgetSource: budgetSource
          }
        ]
    );

  const totalCalculated = budgetItems.reduce((acc, b) => acc + (Number(b.amount) || 0), 0);
  const totalBudgetDisplay = `₱${totalCalculated.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const isActivityInCampus = (form.activityType || 'In-Campus') === 'In-Campus';

  const venueRows = form.venueRows?.length
    ? form.venueRows
    : (isWelcomingSample
      ? [
          { venue: 'Bandstand', specifiedDate: 'August 11 - 15, 2025', duration: '6:00AM – 9:00PM', remarks: '', signatureStatus: '' },
          { venue: 'Function House', specifiedDate: 'August 11 - 15, 2025', duration: '6:00AM – 9:00PM', remarks: '', signatureStatus: '' },
          { venue: 'MSUN Court', specifiedDate: 'August 11 - 15, 2025', duration: '6:00AM – 9:00PM', remarks: '', signatureStatus: '' },
          { venue: 'TSAC', specifiedDate: 'August 11 - 15, 2025', duration: '6:00AM – 9:00PM', remarks: '', signatureStatus: '' }
        ]
      : [
          {
            venue: venue,
            specifiedDate: dateImpl,
            duration: duration,
            remarks: 'Requisitioned for activity venue',
            signatureStatus: ''
          }
        ]
    );

  const campusFacilities = form.campusFacilities?.length
    ? form.campusFacilities
    : (isWelcomingSample
      ? [
          { quantity: 4, description: 'Long Tables', duration: '7:00AM – Onwards\n(August 5 – 15, 2025)', remarks: 'To be used at the side of the oval for college booths.', signatureStatus: '' },
          { quantity: 2, description: 'Long Tables', duration: '7:00AM – Onwards\n(August 12-14, 2025)', remarks: 'To be used at the General Assemblies', signatureStatus: '' },
          { quantity: 6, description: 'FH Tables (Mini tables)', duration: '7:00AM – Onwards\n(August 5 – 15, 2025)', remarks: 'To be used at the Court for organizational booths.', signatureStatus: '' },
          { quantity: 1, description: 'Sound System (8 microphones)', duration: '7:00AM – 9:00PM\n(August 11 – 15, 2025)', remarks: 'August 11 – Bandstand\nAugust 11 – FH (PM)\nAugust 12 to 14 - TSAC', signatureStatus: '' },
          { quantity: 5, description: 'Industrial Fans', duration: '7:00AM – 5:00PM\n(August 12 – 15, 2025)', remarks: 'To be used at TSAC (GA\'s)', signatureStatus: '' },
          { quantity: 200, description: 'Chairs', duration: '7:00AM – Onwards\n(August 12 – 15, 2025)', remarks: 'To be used at TSAC (GA\'s)', signatureStatus: '' },
          { quantity: 1, description: 'LED Wall', duration: '7:00AM – 8:00PM\n(August 11 – 15, 2025)', remarks: '', signatureStatus: '' },
          { quantity: 1, description: 'Drone', duration: '6:00AM – 12:00NN\n(August 11, 2025)', remarks: '', signatureStatus: '' },
          { quantity: 1, description: 'Power Supply', duration: '7:00AM – Onwards\n(August 8 – 15, 2025)', remarks: 'To be used at the side of the oval for college and orgs booths.', signatureStatus: '' },
          { quantity: 3, description: 'Tents', duration: '7:00AM – Onwards\n(August 5 – 15, 2025)', remarks: 'To be used at the side of the oval for college and orgs booths.', signatureStatus: '' }
        ]
      : [
          {
            quantity: 1,
            description: 'Sound System (Microphones & Speakers)',
            duration: duration,
            remarks: 'Sound system for venue',
            signatureStatus: ''
          },
          {
            quantity: 50,
            description: 'Monobloc Chairs',
            duration: duration,
            remarks: 'For student attendees',
            signatureStatus: ''
          }
        ]
    );

  const ALL_SDGS = [
    'SDG 1- No Poverty',
    'SDG 2- Zero Hunger',
    'SDG 3- Good Health and Well-being',
    'SDG 4- Quality Education',
    'SDG 5- Gender Equality',
    'SDG 6- Clean Water and Sanitation',
    'SDG 7- Affordable and Clean Energy',
    'SDG 8- Decent Work and Economic Growth',
    'SDG 9- Industry, Innovation and Infrastructure',
    'SDG 10- Reduced Inequalities',
    'SDG 11- Sustainable Cities and Communities',
    'SDG 12- Responsible Consumption and Production',
    'SDG 13- Climate Action',
    'SDG 14- Life Below Water',
    'SDG 15- Life on Land',
    'SDG 16- Peace, Justice and Strong Institutions',
    'SDG 17- Partnerships for the Goals'
  ];

  const userSdgs = form.sdgsAchieved || [];

  // Signatory Names
  const preparedByName = form.submittedBy || activity.proposedBy || 'JOHN NICOLE C. CABATINGAN';
  const preparedByRole = form.submittedByRole || (activity.proposedBy?.includes('(') ? activity.proposedBy.split('(')[1]?.replace(')', '') : `SSC ${activity.orgId || 'CFMS'} Senator, Planning and Development`);

  // -------------------------------------------------------------
  // BUILD WORD DOCUMENT HEADER & FOOTER (PICTURE 1 & PICTURE 2)
  // -------------------------------------------------------------
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

  // -------------------------------------------------------------
  // BUILD DOCUMENT BODY CONTENT (MATCHING SCREENSHOTS 1-8)
  // -------------------------------------------------------------
  const bodyChildren: (Paragraph | Table)[] = [];

  // Top subheader notice (right-aligned, triplicate statement from Screenshot 1)
  bodyChildren.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 40, after: 10 },
      children: [
        new TextRun({ text: controlNo, font: 'Arial', italics: true, size: 15, color: '475569' })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 0, after: 0 },
      children: [
        new TextRun({ text: 'Produced in TRIPLICATE. One Copy for OME.', font: 'Arial', italics: true, size: 15, color: '475569' })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 0, after: 0 },
      children: [
        new TextRun({ text: 'A copy for the office conducting the activity.', font: 'Arial', italics: true, size: 15, color: '475569' })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 0, after: 0 },
      children: [
        new TextRun({ text: 'And a copy for admin document attachment.', font: 'Arial', italics: true, size: 15, color: '475569' })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 0, after: 120 },
      children: [
        new TextRun({ text: 'Follow the order of signatories for the process flow.', font: 'Arial', italics: true, size: 15, color: '475569' })
      ]
    })
  );

  // Main Form Title: DETAILED ACTIVITY DESIGN
  bodyChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 60, after: 140 },
      children: [
        new TextRun({
          text: 'DETAILED ACTIVITY DESIGN',
          font: 'Arial',
          bold: true,
          size: 24, // 12pt
          color: '000000'
        })
      ]
    })
  );

  // -------------------------------------------------------------
  // 1. ADMINISTRATIVE SPECIFICATIONS TABLE (SCREENSHOTS 1 & 2)
  // -------------------------------------------------------------
  const departmentParagraphs: Paragraph[] = (!isWelcomingSample && form.department)
    ? [
        new Paragraph({
          spacing: { before: 0, after: 40 },
          children: [
            new TextRun({ text: 'Department:  ', font: 'Arial', bold: true, size: 19 }),
            new TextRun({ text: form.department, font: 'Arial', size: 19, underline: {} })
          ]
        })
      ]
    : [
        new Paragraph({
          spacing: { before: 0, after: 40 },
          children: [new TextRun({ text: 'Department:', font: 'Arial', bold: true, size: 19 })]
        }),
        new Paragraph({
          spacing: { before: 0, after: 20 },
          children: [new TextRun({ text: '•  CBIT', font: 'Arial', bold: true, size: 18 })]
        }),
    new Paragraph({
      spacing: { before: 0, after: 10 },
      indent: { left: convertInchesToTwip(0.2) },
      children: [new TextRun({ text: 'a) CBIT Executive Council\nb) Junior Marketing Association (JMA)\nc) Junior People Management Association of the Philippines (JPMAP)\nd) Society of Hotel and Restaurant Management Students (SOHRMS)\ne) Body of Information Technology Students (BITS)', font: 'Arial', size: 17 })]
    }),
    new Paragraph({
      spacing: { before: 40, after: 20 },
      children: [new TextRun({ text: '•  CELS', font: 'Arial', bold: true, size: 18 })]
    }),
    new Paragraph({
      spacing: { before: 0, after: 10 },
      indent: { left: convertInchesToTwip(0.2) },
      children: [new TextRun({ text: 'a) Agriculture, Forestry, and Environmental Sciences Student Organization (AFESSO)\nb) Forestry (Floresta) Society\nc) Student Institute of Noble Agronomist (SINAG)\nd) Environmental Science Society (ESS)\ne) Animal Science Student Society (ASSS)\nf) United Nursing Students\' Association (UNSA)', font: 'Arial', size: 17 })]
    }),
    new Paragraph({
      spacing: { before: 40, after: 20 },
      children: [new TextRun({ text: '•  CESS', font: 'Arial', bold: true, size: 18 })]
    }),
    new Paragraph({
      spacing: { before: 0, after: 10 },
      indent: { left: convertInchesToTwip(0.2) },
      children: [new TextRun({ text: 'a) United Neutral Innovative for CESS (UNICESS)\nb) Circle of English Majors (CEM)\nc) The Buddy of Science Educators (TBSE)\nd) Mathematics Educators Society Hub (MESH)\ne) Guild of Elementary Educators (GUEST)', font: 'Arial', size: 17 })]
    }),
    new Paragraph({
      spacing: { before: 40, after: 20 },
      children: [new TextRun({ text: '•  CFMS', font: 'Arial', bold: true, size: 18 })]
    }),
    new Paragraph({
      spacing: { before: 0, after: 10 },
      indent: { left: convertInchesToTwip(0.2) },
      children: [new TextRun({ text: 'a) Fisheries and Marine Science Students Executive Council\nb) School of Marine Fisheries and Technology Science Society (SMFTSS)\nc) Marine Science Society (MSS)', font: 'Arial', size: 17 })]
    }),
    new Paragraph({
      spacing: { before: 40, after: 20 },
      children: [new TextRun({ text: '•  ORGANIZATIONS', font: 'Arial', bold: true, size: 18 })]
    }),
    new Paragraph({
      spacing: { before: 0, after: 10 },
      indent: { left: convertInchesToTwip(0.2) },
      children: [new TextRun({ text: 'a) Indak Kalaunan Performing Arts (Cultural Dance)\nb) MSUN Crimsons (Modern Dance)\nc) MSUN Bantawan (Theater Arts)\nd) Koro Kaayad Kaligaon (Choir)\ne) Pahid Alampat (Visual Arts)\nf) The Marine Echo (Publication)\ng) Kaabag (Student-Peer Facilitators)\nh) MSUN Kingfishers (Varsity and Sports Club)', font: 'Arial', size: 17 })]
    })
  ];

  bodyChildren.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: TABLE_BORDERS,
      rows: [
        // Row 1: Title and Date Prepared
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  spacing: { before: 40, after: 40 },
                  children: [
                    new TextRun({ text: 'Activity Title:  ', font: 'Arial', bold: true, size: 19 }),
                    new TextRun({ text: title, font: 'Arial', size: 19, bold: true })
                  ]
                }),
                new Paragraph({
                  spacing: { before: 20, after: 40 },
                  children: [
                    new TextRun({ text: 'Office Code:     ', font: 'Arial', bold: true, size: 19 }),
                    new TextRun({ text: officeCode, font: 'Arial', size: 19, underline: {} })
                  ]
                }),
                new Paragraph({
                  spacing: { before: 20, after: 40 },
                  children: [
                    new TextRun({ text: 'Unit / College:  ', font: 'Arial', bold: true, size: 19 }),
                    new TextRun({ text: unitCollege, font: 'Arial', size: 19, underline: {} })
                  ]
                }),
                ...departmentParagraphs
              ]
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  spacing: { before: 40, after: 40 },
                  children: [
                    new TextRun({ text: 'Date Prepared:  ', font: 'Arial', bold: true, size: 19 }),
                    new TextRun({ text: datePrepared, font: 'Arial', size: 19, underline: {} })
                  ]
                }),
                new Paragraph({
                  spacing: { before: 20, after: 40 },
                  children: [
                    new TextRun({ text: 'Venue:  ', font: 'Arial', bold: true, size: 19 }),
                    new TextRun({ text: venue, font: 'Arial', size: 19, underline: {} })
                  ]
                }),
                new Paragraph({
                  spacing: { before: 20, after: 40 },
                  children: [
                    new TextRun({ text: 'Proposed Budget:  ', font: 'Arial', bold: true, size: 19 }),
                    new TextRun({ text: budgetFormatted, font: 'Arial', size: 19, bold: true, underline: {} })
                  ]
                }),
                new Paragraph({
                  spacing: { before: 20, after: 40 },
                  children: [
                    new TextRun({ text: 'Budget Source:  ', font: 'Arial', bold: true, size: 19 }),
                    new TextRun({ text: `${budgetFormatted} – ${budgetSource}`, font: 'Arial', size: 19, underline: {} })
                  ]
                }),
                new Paragraph({
                  spacing: { before: 40, after: 60 },
                  children: [
                    new TextRun({ text: 'Included in the POE Year:    ', font: 'Arial', bold: true, size: 19 }),
                    new TextRun({ text: 'Yes  ', font: 'Arial', bold: true, size: 19 }),
                    new TextRun({ text: form.includedInPdsStatus !== 'No' ? '☑  ' : '☐  ', font: 'Arial', size: 22 }),
                    new TextRun({ text: 'No  ', font: 'Arial', bold: true, size: 19 }),
                    new TextRun({ text: form.includedInPdsStatus === 'No' ? '☑' : '☐', font: 'Arial', size: 22 })
                  ]
                }),
                new Paragraph({
                  spacing: { before: 60, after: 40 },
                  children: [
                    new TextRun({ text: 'Result Code / OPCR/IPCR Code: ', font: 'Arial', bold: true, size: 18 }),
                    new TextRun({ text: resultCode || '_________________', font: 'Arial', size: 18, underline: {} })
                  ]
                }),
                new Paragraph({
                  spacing: { before: 40, after: 40 },
                  children: [
                    new TextRun({ text: 'Email Add.: ', font: 'Arial', bold: true, size: 18 }),
                    new TextRun({ text: email, font: 'Arial', size: 18, color: '002060', underline: {} })
                  ]
                }),
                new Paragraph({
                  spacing: { before: 40, after: 40 },
                  children: [
                    new TextRun({ text: 'Date of Implementation: ', font: 'Arial', bold: true, size: 18 }),
                    new TextRun({ text: dateImpl, font: 'Arial', size: 18, underline: {} })
                  ]
                }),
                new Paragraph({
                  spacing: { before: 40, after: 40 },
                  children: [
                    new TextRun({ text: 'Duration (in days): ', font: 'Arial', bold: true, size: 18, italics: true }),
                    new TextRun({ text: String(duration), font: 'Arial', size: 18, underline: {} })
                  ]
                })
              ]
            })
          ]
        })
      ]
    })
  );

  // -------------------------------------------------------------
  // SECTION A: RATIONALE
  // -------------------------------------------------------------
  bodyChildren.push(
    new Paragraph({
      spacing: { before: 180, after: 40 },
      children: [
        new TextRun({ text: 'A.    Rationale:', font: 'Arial', bold: true, size: 20 })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { before: 20, after: 120 },
      children: [
        new TextRun({ text: rationale, font: 'Arial', size: 19 })
      ]
    })
  );

  // -------------------------------------------------------------
  // SECTION B: OBJECTIVES
  // -------------------------------------------------------------
  bodyChildren.push(
    new Paragraph({
      spacing: { before: 120, after: 40 },
      children: [
        new TextRun({ text: 'B.    Objectives:', font: 'Arial', bold: true, size: 20 })
      ]
    })
  );
  objectives.forEach(obj => {
    bodyChildren.push(
      new Paragraph({
        spacing: { before: 20, after: 30 },
        indent: { left: convertInchesToTwip(0.25) },
        children: [
          new TextRun({ text: '▪  ', font: 'Arial', bold: true, size: 19 }),
          new TextRun({ text: obj, font: 'Arial', size: 19 })
        ]
      })
    );
  });

  // -------------------------------------------------------------
  // SECTION C: EXPECTED OUTPUT
  // -------------------------------------------------------------
  bodyChildren.push(
    new Paragraph({
      spacing: { before: 120, after: 40 },
      children: [
        new TextRun({ text: 'C.    Expected Output:', font: 'Arial', bold: true, size: 20 })
      ]
    })
  );
  outputs.forEach(out => {
    bodyChildren.push(
      new Paragraph({
        spacing: { before: 20, after: 30 },
        indent: { left: convertInchesToTwip(0.25) },
        children: [
          new TextRun({ text: '▪  ', font: 'Arial', bold: true, size: 19 }),
          new TextRun({ text: out, font: 'Arial', size: 19 })
        ]
      })
    );
  });

  // -------------------------------------------------------------
  // SECTION D: DETAIL OF ACTIVITIES (SCREENSHOTS 3 & 4)
  // -------------------------------------------------------------
  bodyChildren.push(
    new Paragraph({
      spacing: { before: 180, after: 40 },
      children: [
        new TextRun({ text: 'D.    Detail of Activities:', font: 'Arial', bold: true, size: 20 })
      ]
    }),
    new Paragraph({
      spacing: { before: 0, after: 60 },
      children: [
        new TextRun({ text: 'Program of Activities:', font: 'Arial', size: 18, italics: true })
      ]
    })
  );

  // Detail of Activities Table
  const scheduleTableRows = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'DATE/TIME', font: 'Arial', bold: true, size: 18 })] })]
        }),
        new TableCell({
          width: { size: 50, type: WidthType.PERCENTAGE },
          shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'ACTIVITY', font: 'Arial', bold: true, size: 18 })] })]
        }),
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'PERSON-IN-CHARGE', font: 'Arial', bold: true, size: 18 })] })]
        })
      ]
    }),
    ...scheduleItems.map((item: any) => {
      const activityLines: string[] = String(item.activity || '').split('\n');
      const activityParagraphs: Paragraph[] = activityLines.map((line: string) => {
        const isEmcee = line.toUpperCase().includes('EMCEE');
        const isHeading = line.toUpperCase() === line && line.length > 5 && !line.startsWith('•');
        return new Paragraph({
          spacing: { before: 15, after: 15 },
          children: [
            new TextRun({
              text: line,
              font: 'Arial',
              size: 17,
              bold: isHeading || isEmcee,
              highlight: isEmcee ? 'yellow' : undefined
            })
          ]
        });
      });

      return new TableRow({
        children: [
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            children: String(item.dateTime || '').split('\n').map((dt: string) => new Paragraph({ spacing: { before: 10, after: 10 }, children: [new TextRun({ text: dt, font: 'Arial', size: 17 })] }))
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: activityParagraphs
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ spacing: { before: 10, after: 10 }, children: [new TextRun({ text: item.personInCharge, font: 'Arial', size: 17 })] })]
          })
        ]
      });
    })
  ];

  bodyChildren.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: TABLE_BORDERS,
      rows: scheduleTableRows
    })
  );

  // -------------------------------------------------------------
  // SECTION E: PARTICIPANTS (SCREENSHOT 5)
  // -------------------------------------------------------------
  bodyChildren.push(
    new Paragraph({
      spacing: { before: 180, after: 40 },
      children: [
        new TextRun({ text: 'E.    Participants:', font: 'Arial', bold: true, size: 20 })
      ]
    })
  );

  participantsText.split('\n').forEach(line => {
    bodyChildren.push(
      new Paragraph({
        spacing: { before: 15, after: 15 },
        indent: { left: line.trim().startsWith('•') ? convertInchesToTwip(0.15) : convertInchesToTwip(0.35) },
        children: [
          new TextRun({ text: line, font: 'Arial', size: 18 })
        ]
      })
    );
  });

  // -------------------------------------------------------------
  // SECTION F: BUDGETARY REQUIREMENTS (SCREENSHOTS 5 & 6)
  // -------------------------------------------------------------
  bodyChildren.push(
    new Paragraph({
      spacing: { before: 180, after: 40 },
      children: [
        new TextRun({ text: 'F.    Budgetary Requirements:', font: 'Arial', bold: true, size: 20 })
      ]
    })
  );

  const budgetTableRows = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          width: { size: 15, type: WidthType.PERCENTAGE },
          shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'ITEM/S', font: 'Arial', bold: true, size: 18 })] })]
        }),
        new TableCell({
          width: { size: 45, type: WidthType.PERCENTAGE },
          shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'PARTICULARS', font: 'Arial', bold: true, size: 18 })] })]
        }),
        new TableCell({
          width: { size: 20, type: WidthType.PERCENTAGE },
          shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'AMOUNT', font: 'Arial', bold: true, size: 18 })] })]
        }),
        new TableCell({
          width: { size: 20, type: WidthType.PERCENTAGE },
          shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'BUDGET SOURCE', font: 'Arial', bold: true, size: 18 })] })]
        })
      ]
    }),
    ...budgetItems.map(item => {
      const amountFormatted = `₱${Number(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      return new TableRow({
        children: [
          new TableCell({
            width: { size: 15, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(item.item), font: 'Arial', size: 17 })] })]
          }),
          new TableCell({
            width: { size: 45, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: item.particulars, font: 'Arial', size: 17 })] })]
          }),
          new TableCell({
            width: { size: 20, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: amountFormatted, font: 'Arial', size: 17 })] })]
          }),
          new TableCell({
            width: { size: 20, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: item.budgetSource || budgetSource, font: 'Arial', size: 17 })] })]
          })
        ]
      });
    }),
    // TOTAL ROW
    new TableRow({
      children: [
        new TableCell({
          width: { size: 60, type: WidthType.PERCENTAGE },
          columnSpan: 2,
          shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'TOTAL:', font: 'Arial', bold: true, size: 19 })] })]
        }),
        new TableCell({
          width: { size: 20, type: WidthType.PERCENTAGE },
          shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: totalBudgetDisplay, font: 'Arial', bold: true, size: 19 })] })]
        }),
        new TableCell({
          width: { size: 20, type: WidthType.PERCENTAGE },
          shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [] })]
        })
      ]
    })
  ];

  bodyChildren.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: TABLE_BORDERS,
      rows: budgetTableRows
    })
  );

  // -------------------------------------------------------------
  // SECTION G: TYPE OF ACTIVITY & VENUES (SCREENSHOT 6)
  // -------------------------------------------------------------
  bodyChildren.push(
    new Paragraph({
      spacing: { before: 180, after: 40 },
      children: [
        new TextRun({ text: 'G.   Type of Activity:', font: 'Arial', bold: true, size: 20 })
      ]
    }),
    new Paragraph({
      spacing: { before: 20, after: 60 },
      indent: { left: convertInchesToTwip(0.4) },
      children: [
        new TextRun({ text: 'In-Campus  ', font: 'Arial', size: 19 }),
        new TextRun({ text: isActivityInCampus ? '☑          ' : '☐          ', font: 'Arial', size: 22 }),
        new TextRun({ text: 'Off-Campus  ', font: 'Arial', size: 19 }),
        new TextRun({ text: !isActivityInCampus ? '☑' : '☐', font: 'Arial', size: 22 })
      ]
    }),
    new Paragraph({
      spacing: { before: 40, after: 40 },
      children: [
        new TextRun({ text: 'Fill-out below for In-Campus Activity only:', font: 'Arial', italics: true, size: 18 })
      ]
    }),
    new Paragraph({
      spacing: { before: 20, after: 40 },
      children: [
        new TextRun({ text: 'Venue/s:', font: 'Arial', bold: true, size: 18 })
      ]
    })
  );

  const venueTableRows = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'VENUE', font: 'Arial', bold: true, size: 18 })] })]
        }),
        new TableCell({
          width: { size: 22, type: WidthType.PERCENTAGE },
          shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'SPECIFIED DATE', font: 'Arial', bold: true, size: 18 })] })]
        }),
        new TableCell({
          width: { size: 18, type: WidthType.PERCENTAGE },
          shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'DURATION', font: 'Arial', bold: true, size: 18 })] })]
        }),
        new TableCell({
          width: { size: 17, type: WidthType.PERCENTAGE },
          shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'REMARKS', font: 'Arial', bold: true, size: 18 })] })]
        }),
        new TableCell({
          width: { size: 18, type: WidthType.PERCENTAGE },
          shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'SIGNATURE', font: 'Arial', bold: true, size: 18 })] })]
        })
      ]
    }),
    ...venueRows.map(v => new TableRow({
      children: [
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: v.venue, font: 'Arial', size: 17 })] })]
        }),
        new TableCell({
          width: { size: 22, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: v.specifiedDate, font: 'Arial', size: 17 })] })]
        }),
        new TableCell({
          width: { size: 18, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: v.duration, font: 'Arial', size: 17 })] })]
        }),
        new TableCell({
          width: { size: 17, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: v.remarks || '', font: 'Arial', size: 17 })] })]
        }),
        new TableCell({
          width: { size: 18, type: WidthType.PERCENTAGE },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 80, after: 0 },
              children: [
                new TextRun({ text: v.signatureStatus ? v.signatureStatus : '_______________', font: 'Arial', size: 17 })
              ]
            })
          ]
        })
      ]
    }))
  ];

  bodyChildren.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: TABLE_BORDERS,
      rows: venueTableRows
    })
  );

  // -------------------------------------------------------------
  // CAMPUS FACILITIES TABLE (SCREENSHOT 7)
  // -------------------------------------------------------------
  bodyChildren.push(
    new Paragraph({
      spacing: { before: 140, after: 40 },
      children: [
        new TextRun({ text: 'Campus Facilities:', font: 'Arial', bold: true, size: 18 })
      ]
    })
  );

  const facilityTableRows = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          width: { size: 12, type: WidthType.PERCENTAGE },
          shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'QUANTITY', font: 'Arial', bold: true, size: 18 })] })]
        }),
        new TableCell({
          width: { size: 35, type: WidthType.PERCENTAGE },
          shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'DESCRIPTION', font: 'Arial', bold: true, size: 18 })] })]
        }),
        new TableCell({
          width: { size: 18, type: WidthType.PERCENTAGE },
          shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'DURATION', font: 'Arial', bold: true, size: 18 })] })]
        }),
        new TableCell({
          width: { size: 18, type: WidthType.PERCENTAGE },
          shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'REMARKS', font: 'Arial', bold: true, size: 18 })] })]
        }),
        new TableCell({
          width: { size: 17, type: WidthType.PERCENTAGE },
          shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'SIGNATURE', font: 'Arial', bold: true, size: 18 })] })]
        })
      ]
    }),
    ...campusFacilities.map(f => new TableRow({
      children: [
        new TableCell({
          width: { size: 12, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(f.quantity), font: 'Arial', size: 17 })] })]
        }),
        new TableCell({
          width: { size: 35, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: f.description, font: 'Arial', size: 17 })] })]
        }),
        new TableCell({
          width: { size: 18, type: WidthType.PERCENTAGE },
          children: String(f.duration || '').split('\n').map((d: string) => new Paragraph({ children: [new TextRun({ text: d, font: 'Arial', size: 17 })] }))
        }),
        new TableCell({
          width: { size: 18, type: WidthType.PERCENTAGE },
          children: String(f.remarks || '').split('\n').map((r: string) => new Paragraph({ children: [new TextRun({ text: r, font: 'Arial', size: 17 })] }))
        }),
        new TableCell({
          width: { size: 17, type: WidthType.PERCENTAGE },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 80, after: 0 },
              children: [
                new TextRun({ text: f.signatureStatus ? f.signatureStatus : '_______________', font: 'Arial', size: 17 })
              ]
            })
          ]
        })
      ]
    }))
  ];

  bodyChildren.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: TABLE_BORDERS,
      rows: facilityTableRows
    })
  );

  // -------------------------------------------------------------
  // SECTION H: SUSTAINABLE DEVELOPMENT GOALS (SDGs) (SCREENSHOT 7)
  // -------------------------------------------------------------
  bodyChildren.push(
    new Paragraph({
      spacing: { before: 180, after: 60 },
      children: [
        new TextRun({ text: 'H. Sustainable Development Goals Achieved', font: 'Arial', bold: true, size: 20 })
      ]
    })
  );

  // 2-column SDG checkboxes table
  const col1Sdgs = ALL_SDGS.slice(0, 9);
  const col2Sdgs = ALL_SDGS.slice(9);

  const sdgRows = col1Sdgs.map((sdg1, idx) => {
    const sdg2 = col2Sdgs[idx] || '';
    const isChecked1 = userSdgs.some(s => s.toLowerCase().includes(sdg1.toLowerCase().split('-')[0].trim()));
    const isChecked2 = sdg2 ? userSdgs.some(s => s.toLowerCase().includes(sdg2.toLowerCase().split('-')[0].trim())) : false;

    return new TableRow({
      children: [
        new TableCell({
          width: { size: 50, type: WidthType.PERCENTAGE },
          children: [
            new Paragraph({
              spacing: { before: 15, after: 15 },
              children: [
                new TextRun({ text: isChecked1 ? '☑  ' : '☐  ', font: 'Arial', size: 21, color: isChecked1 ? '002060' : '334155' }),
                new TextRun({ text: sdg1, font: 'Arial', size: 17, bold: isChecked1 })
              ]
            })
          ]
        }),
        new TableCell({
          width: { size: 50, type: WidthType.PERCENTAGE },
          children: [
            new Paragraph({
              spacing: { before: 15, after: 15 },
              children: sdg2 ? [
                new TextRun({ text: isChecked2 ? '☑  ' : '☐  ', font: 'Arial', size: 21, color: isChecked2 ? '002060' : '334155' }),
                new TextRun({ text: sdg2, font: 'Arial', size: 17, bold: isChecked2 })
              ] : []
            })
          ]
        })
      ]
    });
  });

  bodyChildren.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: TABLE_BORDERS,
      rows: sdgRows
    })
  );

  // -------------------------------------------------------------
  // SIGNATORIES & ENDORSEMENT ROUTING (SCREENSHOT 8)
  // 6 official signature blocks arranged in 2 columns
  // -------------------------------------------------------------
  bodyChildren.push(
    new Paragraph({
      spacing: { before: 240, after: 120 },
      children: []
    })
  );

  const signatoryTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: NO_BORDERS,
    rows: [
      // Row 1: (1) Prepared by & (4) Funds Cleared by
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                spacing: { before: 0, after: 180 },
                children: [new TextRun({ text: '(1)    Prepared by:', font: 'Arial', size: 18, color: '334155' })]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 20 },
                children: [new TextRun({ text: preparedByName.toUpperCase(), font: 'Arial', bold: true, size: 19, underline: {} })]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 160 },
                children: [new TextRun({ text: preparedByRole, font: 'Arial', size: 17, color: '334155' })]
              })
            ]
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                spacing: { before: 0, after: 180 },
                children: [new TextRun({ text: '(4)    Funds Cleared by:', font: 'Arial', size: 18, color: '334155' })]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 20 },
                children: [new TextRun({ text: 'RHODA D. PERPETUA, CPA', font: 'Arial', bold: true, size: 19, underline: {} })]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 160 },
                children: [new TextRun({ text: 'Vice Chancellor for Administration and Finance', font: 'Arial', size: 17, color: '334155' })]
              })
            ]
          })
        ]
      }),
      // Row 2: (2) Reviewed by & (5) Approved by
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                spacing: { before: 100, after: 180 },
                children: [new TextRun({ text: '(2)    Reviewed by:', font: 'Arial', size: 18, color: '334155' })]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 20 },
                children: [new TextRun({ text: 'SYLVIA C. LABIAL, RPM', font: 'Arial', bold: true, size: 19, underline: {} })]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 160 },
                children: [new TextRun({ text: 'Director, OSD', font: 'Arial', size: 17, color: '334155' })]
              })
            ]
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                spacing: { before: 100, after: 180 },
                children: [new TextRun({ text: '(5)    Approved by:', font: 'Arial', size: 18, color: '334155' })]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 20 },
                children: [new TextRun({ text: 'ELNOR C. ROA, PhD', font: 'Arial', bold: true, size: 19, underline: {} })]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 160 },
                children: [new TextRun({ text: 'Chancellor', font: 'Arial', size: 17, color: '334155' })]
              })
            ]
          })
        ]
      }),
      // Row 3: (3) Endorsed by & (6) Recorded by
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                spacing: { before: 100, after: 180 },
                children: [new TextRun({ text: '(3)    Endorsed by:', font: 'Arial', size: 18, color: '334155' })]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 20 },
                children: [new TextRun({ text: 'ARLEEN B. UY, MPA', font: 'Arial', bold: true, size: 19, underline: {} })]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 0 },
                children: [new TextRun({ text: 'Vice Chancellor for Student Affairs and Services', font: 'Arial', size: 17, color: '334155' })]
              })
            ]
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                spacing: { before: 100, after: 180 },
                children: [new TextRun({ text: '(6)    Recorded by:', font: 'Arial', size: 18, color: '334155' })]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 20 },
                children: [new TextRun({ text: 'RAFAEL J. VICENTE', font: 'Arial', bold: true, size: 19, underline: {} })]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 0 },
                children: [new TextRun({ text: 'Monitoring and Evaluation Personnel', font: 'Arial', size: 17, color: '334155' })]
              })
            ]
          })
        ]
      })
    ]
  });

  bodyChildren.push(signatoryTable);

  // -------------------------------------------------------------
  // ASSEMBLE DOCUMENT WITH HEADERS, FOOTERS AND MARGINS
  // -------------------------------------------------------------
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.65),
              bottom: convertInchesToTwip(0.7),
              left: convertInchesToTwip(0.65),
              right: convertInchesToTwip(0.65)
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
 * Downloads the official DAD document as a genuine Microsoft Word (.docx) file
 */
export async function downloadDadAsDocx(
  activity: Activity,
  formOverrides?: Partial<ActivityDesignForm>
): Promise<void> {
  const sanitizedTitle = (activity.title || activity.id || 'DAD_Form').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `MSUN_DAD_${sanitizedTitle}.docx`;

  const blob = await generateDadDocxBlob(activity, formOverrides);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
