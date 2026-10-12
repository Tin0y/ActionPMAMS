import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Activity, ActivityDesignForm } from '../types';
import { isCollegeOrg } from '../data/initialData';
import { MSUN_SEAL_SVG, MSUN_FOOTER_EMBLEM_SVG } from './msunLogos';
export { downloadDadAsDocx, generateDadDocxBlob } from './dadDocxExport';

/**
 * Generate a complete, standalone, printable HTML document for the official
 * Mindanao State University at Naawan Detailed Activity Design (DAD) form
 * matching the visual reference screenshots.
 */
export function generateDadHtml(activity: Activity, formOverrides?: Partial<ActivityDesignForm>): string {
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
          { dateTime: '6:00AM – 7:00AM<br/>7:00AM – 7:30AM<br/>8:00AM – 10:00AM', activity: '<strong>OPENING PROGRAM</strong><br/>• Dance Exercise – Indak Kalaunan Performing Arts<br/>• Pamainit<br/>• Parade of Colleges – Officials, Deans, Coordinators, Faculty Members, and Students<br/>• Preliminaries – Koro Kaayad Kaligaon<br/>• Welcome Address – Ma\'am Arleen Uy<br/>• Intermission Number – MSUN Crimsons<br/>• Inspirational Message – Dr. Elnor Roa<br/>• College Cheering:<br/>&nbsp;&nbsp;a) CBIT – All Societies and Executive Council w/ College Coordinator<br/>&nbsp;&nbsp;b) CELS – All Societies and Executive Council w/ College Coordinator<br/>&nbsp;&nbsp;c) CESS – All Societies and Executive Council w/ College Coordinator<br/>&nbsp;&nbsp;d) CFMS – All Societies and Executive Council w/ College Coordinator<br/>• Special Number – MSUN Arnis Team<br/>• Closing Remarks – Ma\'am Rosevel Colegado<br/>• Official Opening of Booths & Organizations – MSUN Chancellor, Vice Chancellors, Deans, Coordinators, Faculty Members, Students<br/><br/><span class="highlight-emcee">EMCEES: Ms. Sandarka Langam &amp; Mr. Frances Maliao</span>', personInCharge: 'All SSC Officers, College Officers, and Organizations' },
          { dateTime: '1:00PM – 4:00PM', activity: '<strong>CAMPUS TOUR FOR FRESHMEN STUDENTS</strong><br/>• TSAC or Oval<br/>• MSUN Dorm<br/>• CFMS Building<br/>• Admin Building<br/>• E-Library<br/>• Student Lounge<br/>• Infirmary<br/>• NESB Building<br/>• MESC Building<br/>• CSE Building<br/>• IT Building<br/>• AVR<br/>• Research Division', personInCharge: 'All SSC Officers, College Officers, and Organizations' },
          { dateTime: '6:00PM – 8:30PM', activity: '<strong>TARA, SHOW MO \'YAN, ARTE NATIN \'TO: A NIGHT OF TALENTS</strong><br/>• Preliminaries – Audio-Visual Presentation<br/>• Welcoming Remarks – Ma\'am Arleen Uy<br/>• Message – Dr. Elnor Roa<br/>• Director\'s Speech – Ms. Sweet Kayla Hanasan<br/>• Reminders<br/>• "The Lagoon"<br/>• Closing Remarks – Ma\'am Nylette Jarales<br/><br/><span class="highlight-emcee">EMCEES: Ms. Ashly Joy Mercado</span>', personInCharge: 'All SSC Officers, College Officers, and Organizations' },
          { dateTime: '8:00AM – 12:00NN', activity: '<strong>DAY 2: CBIT GENERAL ASSEMBLY</strong><br/>• Attendance<br/>• Preliminaries – Audio-Visual Presentation<br/>• Welcome Remarks<br/>• Oath-Taking and Introduction of Officers<br/>• Presentation of Activities for A.Y. 2025 - 2026<br/>• Open Forum<br/>• Recognition for Former College Officers', personInCharge: 'CBIT Executive Council' }
        ]
      : [
          {
            dateTime: `${activity.startDate || 'Day 1'}${activity.startTime ? ` (${activity.startTime} – ${activity.endTime || 'End'})` : ''}`,
            activity: `<strong>${activity.programActivity || activity.title || 'Official Program'}</strong><br/>• Registration &amp; Preliminaries<br/>• Opening Message &amp; Presentation<br/>• Core Activity Implementation<br/>• Open Forum &amp; Evaluation`,
            personInCharge: form.submittedBy || activity.proposedBy || `${activity.orgId || 'Organization'} Leadership`
          }
        ]
    );

  const participantsText = form.participantsText || (
    form.participants?.length
      ? form.participants.map(p => (typeof p === 'string' ? p : `${p.name} (${p.position})`)).join(', ')
      : (isWelcomingSample
        ? '• All Enrolled MSUN Students<br/>• MSUN-IDS Tabodagat Dance Troupe<br/>&nbsp;&nbsp;1. Samantha Nicole C. Dadulo<br/>&nbsp;&nbsp;2. Alyana Monica B. Colegado<br/>&nbsp;&nbsp;3. Denise Carl D. Montejo<br/>&nbsp;&nbsp;4. David Howard M. Dadole<br/>&nbsp;&nbsp;5. Nicole P. Gaa<br/>&nbsp;&nbsp;6. Juniel L. Entera<br/>&nbsp;&nbsp;7. Jaiho A. Laguit<br/>&nbsp;&nbsp;8. Lovelyn Dayrose Godelieve Pogoy<br/>• MSUN-IDS Universal Dancers<br/>&nbsp;&nbsp;1. Safia F. Alinabon<br/>&nbsp;&nbsp;2. Annalou Jane G. Abitona<br/>&nbsp;&nbsp;3. Marianne Gelli B. Barrera<br/>&nbsp;&nbsp;4. Julia Nelly R. Gabe<br/>&nbsp;&nbsp;5. Zueweca L. Mercado<br/>&nbsp;&nbsp;6. Angel Missy P. Sacala<br/>&nbsp;&nbsp;7. Kinshin C. Yaun<br/>&nbsp;&nbsp;8. Sophie Krisray Relativo<br/>&nbsp;&nbsp;9. Jan Nina Micaela J. Naldo<br/>&nbsp;&nbsp;10. Donna Marie C. Canitan<br/>&nbsp;&nbsp;11. Keizsha Bryanna G. Gases'
        : `• Target Participants: ${activity.targetParticipants || 150} students<br/>• ${activity.orgId || 'Organization'} Officers and Members<br/>• Faculty Advisers, College Deans, and University Officials`
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
          { item: '4', ribbons: 'Ribbons (Yellow & Blue)', particulars: 'Ribbons (Yellow & Blue)', amount: 600, budgetSource },
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
          { quantity: 4, description: 'Long Tables', duration: '7:00AM – Onwards<br/>(August 5 – 15, 2025)', remarks: 'To be used at the side of the oval for college booths.', signatureStatus: '' },
          { quantity: 2, description: 'Long Tables', duration: '7:00AM – Onwards<br/>(August 12-14, 2025)', remarks: 'To be used at the General Assemblies', signatureStatus: '' },
          { quantity: 6, description: 'FH Tables (Mini tables)', duration: '7:00AM – Onwards<br/>(August 5 – 15, 2025)', remarks: 'To be used at the Court for organizational booths.', signatureStatus: '' },
          { quantity: 1, description: 'Sound System (8 microphones)', duration: '7:00AM – 9:00PM<br/>(August 11 – 15, 2025)', remarks: 'August 11 – Bandstand<br/>August 11 – FH (PM)<br/>August 12 to 14 - TSAC', signatureStatus: '' },
          { quantity: 5, description: 'Industrial Fans', duration: '7:00AM – 5:00PM<br/>(August 12 – 15, 2025)', remarks: 'To be used at TSAC (GA\'s)', signatureStatus: '' },
          { quantity: 200, description: 'Chairs', duration: '7:00AM – Onwards<br/>(August 12 – 15, 2025)', remarks: 'To be used at TSAC (GA\'s)', signatureStatus: '' },
          { quantity: 1, description: 'LED Wall', duration: '7:00AM – 8:00PM<br/>(August 11 – 15, 2025)', remarks: '', signatureStatus: '' },
          { quantity: 1, description: 'Drone', duration: '6:00AM – 12:00NN<br/>(August 11, 2025)', remarks: '', signatureStatus: '' },
          { quantity: 1, description: 'Power Supply', duration: '7:00AM – Onwards<br/>(August 8 – 15, 2025)', remarks: 'To be used at the side of the oval for college and orgs booths.', signatureStatus: '' },
          { quantity: 3, description: 'Tents', duration: '7:00AM – Onwards<br/>(August 5 – 15, 2025)', remarks: 'To be used at the side of the oval for college and orgs booths.', signatureStatus: '' }
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

  const preparedByName = form.submittedBy || activity.proposedBy || 'JOHN NICOLE C. CABATINGAN';
  const preparedByRole = form.submittedByRole || (activity.proposedBy?.includes('(') ? activity.proposedBy.split('(')[1]?.replace(')', '') : `SSC ${activity.orgId || 'CFMS'} Senator, Planning and Development`);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Detailed Activity Design (DAD) - ${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #000000;
      background: #ffffff;
      padding: 12mm 15mm;
      font-size: 9.5pt;
      line-height: 1.35;
    }
    @page {
      size: A4 portrait;
      margin: 10mm 12mm;
    }
    .inst-header {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 6px;
      text-align: left;
    }
    .inst-seal {
      width: 56px;
      height: 56px;
      margin: 0;
      flex-shrink: 0;
      display: block;
    }
    .inst-country {
      font-family: 'Times New Roman', serif;
      font-size: 9pt;
      color: #334155;
    }
    .inst-univ {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 13.5pt;
      font-weight: 900;
      color: #1d4ed8; /* Blue font color */
      letter-spacing: 0.5px;
      margin: 2px 0 2px 0;
    }
    .inst-divider {
      height: 3px;
      background: linear-gradient(to right, #1d4ed8 70%, #F59E0B 70%);
      margin-bottom: 12px;
    }
    .triplicate-notice {
      text-align: right;
      font-size: 8pt;
      font-style: italic;
      color: #475569;
      line-height: 1.25;
      margin-bottom: 10px;
    }
    .doc-main-title {
      text-align: center;
      font-size: 12pt;
      font-weight: bold;
      text-transform: uppercase;
      margin-bottom: 12px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      font-size: 9pt;
    }
    th, td {
      border: 1px solid #000000;
      padding: 4px 6px;
      vertical-align: top;
    }
    th {
      background-color: #f1f5f9;
      font-weight: bold;
      text-align: center;
    }
    .section-title {
      font-size: 9.5pt;
      font-weight: bold;
      margin-top: 10px;
      margin-bottom: 4px;
    }
    .bullet-item {
      margin-bottom: 4px;
      padding-left: 12px;
      text-indent: -12px;
    }
    .highlight-emcee {
      background-color: #FEF08A;
      font-weight: bold;
      padding: 1px 4px;
    }
    .sig-block-cell {
      border: none !important;
      padding: 12px 16px;
    }
    .sig-name {
      font-weight: bold;
      text-decoration: underline;
      text-align: center;
      text-transform: uppercase;
      font-size: 9.5pt;
      margin-top: 24px;
    }
    .sig-role {
      font-size: 8.5pt;
      text-align: center;
      color: #334155;
      margin-top: 2px;
    }
    .inst-footer {
      margin-top: 20px;
      padding-top: 8px;
      border-top: 3px solid #1d4ed8;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      font-size: 8pt;
      color: #334155;
      text-align: left;
    }
    .footer-emblem {
      width: 36px;
      height: 36px;
      flex-shrink: 0;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
      .page-break { page-break-after: always; }
    }
  </style>
</head>
<body>

  <!-- Institutional Header (Left-aligned with Blue Text) -->
  <div class="inst-header">
    <div class="inst-seal">${MSUN_SEAL_SVG}</div>
    <div>
      <div class="inst-country">Republic of the Philippines</div>
      <div class="inst-univ">MINDANAO STATE UNIVERSITY AT NAAWAN</div>
    </div>
  </div>
  <div class="inst-divider"></div>

  <!-- Triplicate Notice -->
  <div class="triplicate-notice">
    <div>${controlNo}</div>
    <div>Produced in TRIPLICATE. One Copy for OME.</div>
    <div>A copy for the office conducting the activity.</div>
    <div>And a copy for admin document attachment.</div>
    <div>Follow the order of signatories for the process flow.</div>
  </div>

  <!-- Document Title -->
  <div class="doc-main-title">DETAILED ACTIVITY DESIGN</div>

  <!-- Administrative Specifications Table -->
  <table>
    <tbody>
      <tr>
        <td style="width: 50%;">
          <div style="margin-bottom: 6px;"><strong>Activity Title:</strong> &nbsp;<strong>${title}</strong></div>
          <div style="margin-bottom: 6px;"><strong>Office Code:</strong> &nbsp;<u>${officeCode}</u></div>
          <div style="margin-bottom: 6px;"><strong>Unit / College:</strong> &nbsp;<u>${unitCollege}</u></div>
          <div style="margin-top: 8px;">
            <strong>Department:</strong>
            ${(!isWelcomingSample && form.department) ? `
              <div style="margin-top: 4px; padding-left: 8px; font-size: 9pt;">
                <u>${form.department}</u>
              </div>
            ` : `
            <div style="margin-top: 4px; padding-left: 8px;">
              <div><strong>• CBIT</strong></div>
              <div style="padding-left: 12px; font-size: 8.5pt;">
                a) CBIT Executive Council<br/>
                b) Junior Marketing Association (JMA)<br/>
                c) Junior People Management Association of the Philippines (JPMAP)<br/>
                d) Society of Hotel and Restaurant Management Students (SOHRMS)<br/>
                e) Body of Information Technology Students (BITS)
              </div>
              <div style="margin-top: 4px;"><strong>• CELS</strong></div>
              <div style="padding-left: 12px; font-size: 8.5pt;">
                a) Agriculture, Forestry, and Environmental Sciences Student Organization (AFESSO)<br/>
                b) Forestry (Floresta) Society<br/>
                c) Student Institute of Noble Agronomist (SINAG)<br/>
                d) Environmental Science Society (ESS)<br/>
                e) Animal Science Student Society (ASSS)<br/>
                f) United Nursing Students' Association (UNSA)
              </div>
              <div style="margin-top: 4px;"><strong>• CESS</strong></div>
              <div style="padding-left: 12px; font-size: 8.5pt;">
                a) United Neutral Innovative for CESS (UNICESS)<br/>
                b) Circle of English Majors (CEM)<br/>
                c) The Buddy of Science Educators (TBSE)<br/>
                d) Mathematics Educators Society Hub (MESH)<br/>
                e) Guild of Elementary Educators (GUEST)
              </div>
              <div style="margin-top: 4px;"><strong>• CFMS</strong></div>
              <div style="padding-left: 12px; font-size: 8.5pt;">
                a) Fisheries and Marine Science Students Executive Council<br/>
                b) School of Marine Fisheries and Technology Science Society (SMFTSS)<br/>
                c) Marine Science Society (MSS)
              </div>
              <div style="margin-top: 4px;"><strong>• ORGANIZATIONS</strong></div>
              <div style="padding-left: 12px; font-size: 8.5pt;">
                a) Indak Kalaunan Performing Arts (Cultural Dance)<br/>
                b) MSUN Crimsons (Modern Dance)<br/>
                c) MSUN Bantawan (Theater Arts)<br/>
                d) Koro Kaayad Kaligaon (Choir)<br/>
                e) Pahid Alampat (Visual Arts)<br/>
                f) The Marine Echo (Publication)<br/>
                g) Kaabag (Student-Peer Facilitators)<br/>
                h) MSUN Kingfishers (Varsity and Sports Club)
              </div>
            </div>
            `}
          </div>
        </td>
        <td style="width: 50%;">
          <div style="margin-bottom: 6px;"><strong>Date Prepared:</strong> &nbsp;<u>${datePrepared}</u></div>
          <div style="margin-bottom: 6px;"><strong>Venue:</strong> &nbsp;<u>${venue}</u></div>
          <div style="margin-bottom: 6px;"><strong>Proposed Budget:</strong> &nbsp;<strong><u>${budgetFormatted}</u></strong></div>
          <div style="margin-bottom: 6px;"><strong>Budget Source:</strong> &nbsp;<u>${budgetFormatted} – ${budgetSource}</u></div>
          <div style="margin-top: 10px; margin-bottom: 10px;">
            <strong>Included in the POE Year:</strong> &nbsp;&nbsp;
            <strong>Yes</strong> ${form.includedInPdsStatus !== 'No' ? '☑' : '☐'} &nbsp;&nbsp;&nbsp;
            <strong>No</strong> ${form.includedInPdsStatus === 'No' ? '☑' : '☐'}
          </div>
          <div style="margin-top: 16px; margin-bottom: 6px;"><strong>Result Code / OPCR/IPCR Code:</strong> &nbsp;<u>${resultCode || '_________________'}</u></div>
          <div style="margin-bottom: 6px;"><strong>Email Add.:</strong> &nbsp;<u style="color: #002060;">${email}</u></div>
          <div style="margin-bottom: 6px;"><strong>Date of Implementation:</strong> &nbsp;<u>${dateImpl}</u></div>
          <div style="margin-bottom: 6px;"><strong>Duration <em>(in days)</em>:</strong> &nbsp;<u>${duration}</u></div>
        </td>
      </tr>
    </tbody>
  </table>

  <!-- Section A: Rationale -->
  <div class="section-title">A. &nbsp;&nbsp; Rationale:</div>
  <div style="text-align: justify; margin-bottom: 12px; text-indent: 24px;">
    ${rationale.replace(/\n/g, '<br/>')}
  </div>

  <!-- Section B: Objectives -->
  <div class="section-title">B. &nbsp;&nbsp; Objectives:</div>
  <div style="margin-bottom: 12px;">
    ${objectives.map(o => `<div class="bullet-item">▪ &nbsp; ${o}</div>`).join('')}
  </div>

  <!-- Section C: Expected Output -->
  <div class="section-title">C. &nbsp;&nbsp; Expected Output:</div>
  <div style="margin-bottom: 14px;">
    ${outputs.map(out => `<div class="bullet-item">▪ &nbsp; ${out}</div>`).join('')}
  </div>

  <!-- Section D: Detail of Activities -->
  <div class="section-title">D. &nbsp;&nbsp; Detail of Activities:</div>
  <div style="font-style: italic; margin-bottom: 6px;">Program of Activities:</div>
  <table>
    <thead>
      <tr>
        <th style="width: 25%;">DATE/TIME</th>
        <th style="width: 50%;">ACTIVITY</th>
        <th style="width: 25%;">PERSON-IN-CHARGE</th>
      </tr>
    </thead>
    <tbody>
      ${scheduleItems.map(s => `
        <tr>
          <td>${s.dateTime}</td>
          <td>${s.activity}</td>
          <td>${s.personInCharge}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <!-- Section E: Participants -->
  <div class="section-title">E. &nbsp;&nbsp; Participants:</div>
  <div style="margin-bottom: 14px; font-size: 9pt;">
    ${participantsText}
  </div>

  <!-- Section F: Budgetary Requirements -->
  <div class="section-title">F. &nbsp;&nbsp; Budgetary Requirements:</div>
  <table>
    <thead>
      <tr>
        <th style="width: 15%;">ITEM/S</th>
        <th style="width: 45%;">PARTICULARS</th>
        <th style="width: 20%; text-align: right;">AMOUNT</th>
        <th style="width: 20%;">BUDGET SOURCE</th>
      </tr>
    </thead>
    <tbody>
      ${budgetItems.map(b => `
        <tr>
          <td style="text-align: center;">${b.item}</td>
          <td>${b.particulars}</td>
          <td style="text-align: right; font-weight: bold;">₱${Number(b.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="text-align: center;">${b.budgetSource || budgetSource}</td>
        </tr>
      `).join('')}
      <tr style="background: #f8fafc; font-weight: bold;">
        <td colspan="2" style="text-align: right;">TOTAL:</td>
        <td style="text-align: right; color: #002060;">${totalBudgetDisplay}</td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <!-- Section G: Type of Activity -->
  <div class="section-title">G. &nbsp;&nbsp; Type of Activity:</div>
  <div style="margin-bottom: 6px; padding-left: 20px;">
    In-Campus &nbsp;${isActivityInCampus ? '☑' : '☐'} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
    Off-Campus &nbsp;${!isActivityInCampus ? '☑' : '☐'}
  </div>
  <div style="font-style: italic; margin-bottom: 4px; font-size: 8.5pt;">Fill-out below for In-Campus Activity only:</div>
  <div style="font-weight: bold; margin-bottom: 4px; font-size: 9pt;">Venue/s:</div>
  <table>
    <thead>
      <tr>
        <th style="width: 25%;">VENUE</th>
        <th style="width: 22%;">SPECIFIED DATE</th>
        <th style="width: 18%;">DURATION</th>
        <th style="width: 17%;">REMARKS</th>
        <th style="width: 18%;">SIGNATURE</th>
      </tr>
    </thead>
    <tbody>
      ${venueRows.map(v => `
        <tr>
          <td><strong>${v.venue}</strong></td>
          <td>${v.specifiedDate}</td>
          <td>${v.duration}</td>
          <td>${v.remarks}</td>
          <td style="text-align: center; vertical-align: bottom; height: 32px;">
            ${v.signatureStatus ? `<span>${v.signatureStatus}</span>` : `<div style="border-bottom: 1px solid #000; width: 80%; margin: 0 auto;"></div>`}
          </td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <!-- Campus Facilities -->
  <div style="font-weight: bold; margin-top: 10px; margin-bottom: 4px; font-size: 9pt;">Campus Facilities:</div>
  <table>
    <thead>
      <tr>
        <th style="width: 12%;">QUANTITY</th>
        <th style="width: 35%;">DESCRIPTION</th>
        <th style="width: 18%;">DURATION</th>
        <th style="width: 18%;">REMARKS</th>
        <th style="width: 17%;">SIGNATURE</th>
      </tr>
    </thead>
    <tbody>
      ${campusFacilities.map(f => `
        <tr>
          <td style="text-align: center; font-weight: bold;">${f.quantity}</td>
          <td>${f.description}</td>
          <td>${f.duration}</td>
          <td>${f.remarks}</td>
          <td style="text-align: center; vertical-align: bottom; height: 32px;">
            ${f.signatureStatus ? `<span>${f.signatureStatus}</span>` : `<div style="border-bottom: 1px solid #000; width: 80%; margin: 0 auto;"></div>`}
          </td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <!-- Section H: SDGs -->
  <div class="section-title">H. &nbsp;&nbsp; Sustainable Development Goals Achieved</div>
  <table>
    <tbody>
      ${ALL_SDGS.slice(0, 9).map((sdg1, idx) => {
        const sdg2 = ALL_SDGS.slice(9)[idx];
        const isChecked1 = userSdgs.some(s => s.toLowerCase().includes(sdg1.toLowerCase().split('-')[0].trim()));
        const isChecked2 = sdg2 ? userSdgs.some(s => s.toLowerCase().includes(sdg2.toLowerCase().split('-')[0].trim())) : false;
        return `
          <tr>
            <td style="width: 50%; border: 1px solid #000; padding: 3px 6px;">
              ${isChecked1 ? '☑' : '☐'} &nbsp;<strong>${sdg1}</strong>
            </td>
            <td style="width: 50%; border: 1px solid #000; padding: 3px 6px;">
              ${sdg2 ? `${isChecked2 ? '☑' : '☐'} &nbsp;<strong>${sdg2}</strong>` : ''}
            </td>
          </tr>
        `;
      }).join('')}
    </tbody>
  </table>

  <!-- Signatories Block (Screenshot 8: 6-block layout) -->
  <table style="width: 100%; border: none; margin-top: 30px; margin-bottom: 20px;">
    <tbody>
      <tr>
        <td class="sig-block-cell" style="width: 50%;">
          <div style="font-size: 8.5pt; color: #475569;">(1) &nbsp;&nbsp; Prepared by:</div>
          <div class="sig-name">${preparedByName}</div>
          <div class="sig-role">${preparedByRole}</div>
        </td>
        <td class="sig-block-cell" style="width: 50%;">
          <div style="font-size: 8.5pt; color: #475569;">(4) &nbsp;&nbsp; Funds Cleared by:</div>
          <div class="sig-name">RHODA D. PERPETUA, CPA</div>
          <div class="sig-role">Vice Chancellor for Administration and Finance</div>
        </td>
      </tr>
      <tr>
        <td class="sig-block-cell" style="width: 50%;">
          <div style="font-size: 8.5pt; color: #475569;">(2) &nbsp;&nbsp; Reviewed by:</div>
          <div class="sig-name">SYLVIA C. LABIAL, RPM</div>
          <div class="sig-role">Director, OSD</div>
        </td>
        <td class="sig-block-cell" style="width: 50%;">
          <div style="font-size: 8.5pt; color: #475569;">(5) &nbsp;&nbsp; Approved by:</div>
          <div class="sig-name">ELNOR C. ROA, PhD</div>
          <div class="sig-role">Chancellor</div>
        </td>
      </tr>
      <tr>
        <td class="sig-block-cell" style="width: 50%;">
          <div style="font-size: 8.5pt; color: #475569;">(3) &nbsp;&nbsp; Endorsed by:</div>
          <div class="sig-name">ARLEEN B. UY, MPA</div>
          <div class="sig-role">Vice Chancellor for Student Affairs and Services</div>
        </td>
        <td class="sig-block-cell" style="width: 50%;">
          <div style="font-size: 8.5pt; color: #475569;">(6) &nbsp;&nbsp; Recorded by:</div>
          <div class="sig-name">RAFAEL J. VICENTE</div>
          <div class="sig-role">Monitoring and Evaluation Personnel</div>
        </td>
      </tr>
    </tbody>
  </table>

  <!-- Institutional Footer (Left-aligned) -->
  <div class="inst-footer">
    <div class="footer-emblem">${MSUN_FOOTER_EMBLEM_SVG}</div>
    <div style="line-height: 1.35;">
      <div style="font-weight: bold; color: #1d4ed8; font-size: 8.5pt; text-transform: uppercase;">Mindanao State University at Naawan</div>
      <div>📍 Pedro Pagalan St., Poblacion, Naawan, Misamis Oriental 9023</div>
      <div>✉ oipp@msunaawan.edu.ph &bull; 📞 +63 993 559 0295 &bull; 🌐 msunaawan.edu.ph</div>
      <div style="font-style: italic; color: #1e3a8a; font-weight: 600;">Forging Minds, Better Tomorrow</div>
    </div>
  </div>

</body>
</html>`;
}

/**
 * Downloads the official DAD form as a formatted HTML document.
 */
export function downloadDadAsHtml(activity: Activity, formOverrides?: Partial<ActivityDesignForm>): void {
  const rawHtml = generateDadHtml(activity, formOverrides);
  const interactiveBanner = `
  <div class="no-print" style="position: sticky; top: 0; background: #002060; color: #ffffff; padding: 12px 24px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 12px rgba(0,0,0,0.15); font-family: sans-serif; z-index: 9999; margin-bottom: 20px;">
    <div>
      <strong style="font-size: 14px; display: block;">MSUN Detailed Activity Design (DAD) — Official Document</strong>
      <span style="font-size: 11px; color: #94a3b8;">Mindanao State University at Naawan &bull; Office of Student Development</span>
    </div>
    <div style="display: flex; gap: 10px;">
      <button onclick="window.print()" style="background: #F59E0B; color: #002060; border: none; padding: 8px 18px; border-radius: 8px; font-weight: bold; font-size: 12px; cursor: pointer;">
        🖨️ Print Form
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
  const sanitizedTitle = (activity.title || activity.id || 'DAD_Form').replace(/[^a-zA-Z0-9_-]/g, '_');
  a.href = url;
  a.download = `MSUN_DAD_${sanitizedTitle}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * Downloads the official DAD form as a genuine PDF file using jsPDF and html2canvas.
 */
export async function downloadDadAsPdf(
  activity: Activity, 
  formOverrides?: Partial<ActivityDesignForm>
): Promise<void> {
  const sanitizedTitle = (activity.title || activity.id || 'DAD_Form').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `MSUN_DAD_${sanitizedTitle}.pdf`;

  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.left = '0';
  wrapper.style.top = '0';
  wrapper.style.width = '794px';
  wrapper.style.zIndex = '-99999';
  wrapper.style.opacity = '1';
  wrapper.style.pointerEvents = 'none';
  wrapper.style.backgroundColor = '#ffffff';

  const fullHtml = generateDadHtml(activity, formOverrides);
  const styleMatch = fullHtml.match(/<style>([\s\S]*?)<\/style>/);
  const bodyMatch = fullHtml.match(/<body>([\s\S]*?)<\/body>/);

  const styleTag = document.createElement('style');
  styleTag.textContent = styleMatch ? styleMatch[1] : '';
  wrapper.appendChild(styleTag);

  const contentDiv = document.createElement('div');
  contentDiv.style.backgroundColor = '#ffffff';
  contentDiv.style.padding = '20px';
  contentDiv.style.color = '#000000';
  contentDiv.innerHTML = bodyMatch ? bodyMatch[1] : fullHtml;
  wrapper.appendChild(contentDiv);

  document.body.appendChild(wrapper);

  try {
    const canvas = await html2canvas(contentDiv, {
      scale: 1.5,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 794
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    // First page
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;

    // Subsequent pages
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }

    pdf.save(filename);
  } catch (err) {
    console.error('html2canvas PDF generation error, downloading HTML document as fallback:', err);
    downloadDadAsHtml(activity, formOverrides);
  } finally {
    if (document.body.contains(wrapper)) {
      document.body.removeChild(wrapper);
    }
  }
}

/**
 * Reliably triggers printing of the DAD form.
 */
export function printDadDocument(
  activity: Activity, 
  formOverrides?: Partial<ActivityDesignForm>
): void {
  const htmlContent = generateDadHtml(activity, formOverrides);

  try {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.setAttribute('sandbox', 'allow-modals allow-same-origin allow-scripts');
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
          console.warn('Iframe print restricted, triggering direct window.print():', innerErr);
          try {
            window.print();
          } catch {
            downloadDadAsPdf(activity, formOverrides);
          }
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }
      }, 500);
      return;
    }
  } catch (err) {
    console.warn('Dedicated iframe creation failed, falling back to window.print():', err);
  }

  try {
    window.print();
  } catch {
    downloadDadAsPdf(activity, formOverrides);
  }
}
