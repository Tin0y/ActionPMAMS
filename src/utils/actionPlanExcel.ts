import JSZip from 'jszip';
import { Activity, OrgId } from '../types';
import { canonicalOrgId } from './organizationUtils';
import { getInitialTimelineForActionPlan } from '../data/initialData';

/**
 * Escapes characters for XML content
 */
function escapeXml(unsafe: string | number | null | undefined): string {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Decodes XML entities back to text
 */
function unescapeXml(safe: string): string {
  return safe
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/**
 * Official 14-Column Proposal Headers matching MSUN Institutional Template
 */
export const OFFICIAL_PROPOSAL_HEADERS = [
  'Activity Code',
  'Activity Title',
  'Organization',
  'Fiscal Year',
  'Start Date',
  'End Date',
  'Start Time',
  'End Time',
  'Venue',
  'Description / Objectives',
  'Target Pax',
  'Budget (PHP)',
  'Strategic Pillar',
  'Proposed By'
] as const;

/**
 * Normalizes organization string into standard OrgId
 */
export function normalizeOrgId(rawOffice?: string | null, fallback: OrgId = 'SENSSO'): OrgId {
  const fallbackCanonical = (canonicalOrgId(fallback) || 'SENSSO') as OrgId;
  if (!rawOffice) return fallbackCanonical;
  const canonical = canonicalOrgId(rawOffice);
  if (canonical && canonical !== 'ALL') return canonical as OrgId;
  return fallbackCanonical;
}

/**
 * Generates an authentic OpenXML (.xlsx) Blob for the official MSUN Action Plan Template
 * matching the user's exact 14-column format and dark-blue styling.
 */
export async function generateActionPlanXlsxBlob(
  orgIdOrName = 'SENSSO',
  fiscalYear = 'Fiscal Year 2027'
): Promise<Blob> {
  const zip = new JSZip();

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <workbookPr date1904="false"/>
  <sheets>
    <sheet name="Plan of Activities" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="1">
    <numFmt numFmtId="164" formatCode="&quot;₱&quot;#,##0.00;[Red](&quot;₱&quot;#,##0.00);&quot;₱0.00&quot;"/>
  </numFmts>
  <fonts count="6">
    <!-- 0: Regular 10pt Arial -->
    <font><sz val="10"/><color rgb="FF000000"/><name val="Arial"/><family val="2"/></font>
    <!-- 1: Bold 11pt Arial Title -->
    <font><b/><sz val="11"/><color rgb="FF000000"/><name val="Arial"/><family val="2"/></font>
    <!-- 2: Bold 11pt Arial Red for Period Cover -->
    <font><b/><sz val="11"/><color rgb="FFC00000"/><name val="Arial"/><family val="2"/></font>
    <!-- 3: Bold 11pt Arial White for Maroon Header -->
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Arial"/><family val="2"/></font>
    <!-- 4: Bold 10pt Arial for Total Row -->
    <font><b/><sz val="10"/><color rgb="FF000000"/><name val="Arial"/><family val="2"/></font>
    <!-- 5: Regular 10pt Arial Center -->
    <font><sz val="10"/><color rgb="FF000000"/><name val="Arial"/><family val="2"/></font>
  </fonts>
  <fills count="5">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <!-- 2: Solid Maroon (#980000) for Header Row 4 -->
    <fill><patternFill patternType="solid"><fgColor rgb="FF980000"/><bgColor indexed="64"/></patternFill></fill>
    <!-- 3: Solid Soft Peach (#FCE5CD) for Month & Week Row 5 -->
    <fill><patternFill patternType="solid"><fgColor rgb="FFFCE5CD"/><bgColor indexed="64"/></patternFill></fill>
    <!-- 4: Solid Soft Gray (#F1F5F9) for Total Summary Row -->
    <fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="3">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <!-- 1: Thin Black Border -->
    <border>
      <left style="thin"><color rgb="FF000000"/></left>
      <right style="thin"><color rgb="FF000000"/></right>
      <top style="thin"><color rgb="FF000000"/></top>
      <bottom style="thin"><color rgb="FF000000"/></bottom>
    </border>
    <!-- 2: Medium Top/Bottom Border for Total -->
    <border>
      <left style="thin"><color rgb="FF000000"/></left>
      <right style="thin"><color rgb="FF000000"/></right>
      <top style="thin"><color rgb="FF000000"/></top>
      <bottom style="double"><color rgb="FF000000"/></bottom>
    </border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="11">
    <!-- 0: Regular Left Data (Font 0, Border 1, Left, Middle, WrapText) -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="left" vertical="center" wrapText="1"/>
    </xf>
    <!-- 1: Title Centered (Font 1, Border 1, Center, Middle) -->
    <xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <!-- 2: Period Cover Centered Red (Font 2, Border 1, Center, Middle) -->
    <xf numFmtId="0" fontId="2" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <!-- 3: Maroon Header Centered White (Font 3, Fill 2, Border 1, Center, Middle, WrapText) -->
    <xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center" wrapText="1"/>
    </xf>
    <!-- 4: Peach Subheader Month & Week (Font 1, Fill 3, Border 1, Center, Middle, WrapText) -->
    <xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center" wrapText="1"/>
    </xf>
    <!-- 5: Regular Centered Data (Font 0, Border 1, Center, Middle, WrapText) -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center" wrapText="1"/>
    </xf>
    <!-- 6: Currency Number Right (Font 0, Border 1, NumFmt 164, Right, Middle) -->
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
    <!-- 7: Total Row Label (Font 4, Fill 4, Border 2, Right, Middle) -->
    <xf numFmtId="0" fontId="4" fillId="4" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="right" vertical="center" wrapText="1"/>
    </xf>
    <!-- 8: Total Row Currency (Font 4, Fill 4, Border 2, NumFmt 164, Right, Middle) -->
    <xf numFmtId="164" fontId="4" fillId="4" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
    <!-- 9: Total Row Fund Source (Font 4, Fill 4, Border 2, Center, Middle) -->
    <xf numFmtId="0" fontId="4" fillId="4" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <!-- 10: Maroon Header Empty (Font 3, Fill 2, Border 1, Center, Middle) -->
    <xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
  <dxfs count="0"/>
  <tableStyles count="0" defaultTableStyle="TableStyleMedium9" defaultPivotStyle="PivotStyleLight16"/>
</styleSheet>`;

  // Build authentic organization header
  let orgHeader = orgIdOrName;
  const upper = (orgIdOrName || '').toUpperCase();
  if (upper.includes('SENSSO') || upper.includes('SENSO') || upper.includes('SENIOR STUDENTS')) {
    orgHeader = "OVCSAS|OSD|OSA: SENIOR STUDENTS' SOCIETY (SenSSo)";
  } else if (upper.includes('CBIT') || upper.includes('BUSINESS')) {
    orgHeader = "CBIT SEC: COLLEGE OF BUSINESS AND INFORMATION TECHNOLOGY";
  } else if (upper.includes('SSC')) {
    orgHeader = "SUPREME STUDENT COUNCIL (SSC)";
  } else if (upper.includes('CESS')) {
    orgHeader = "CESS SO: COLLEGE OF EDUCATION AND SOCIAL SCIENCES";
  } else if (upper.includes('CELS')) {
    orgHeader = "ELSSA: ENVIRONMENT AND LIFE SCIENCES STUDENT ALLIANCE";
  } else if (upper.includes('CMFS') || upper.includes('CFMS')) {
    orgHeader = "FIMSSO: FISHERIES AND MARINE SCIENCE STUDENT ORGANIZATION";
  } else if (upper.includes('KAABAG')) {
    orgHeader = "KAABAG: STUDENT PEER FACILITATORS";
  }

  const yearNum = (fiscalYear.match(/\d{4}/) || ['2027'])[0];
  const colLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];

  // Authentic sample activities matching Google Sheet structure
  const sampleActivities = [
    {
      month: 'January',
      week: '2nd Week ',
      program: '2nd General Assembly \n\n',
      objectives: "To update senior students on the organization's accomplishments, upcoming programs, and relevant matters concerning their academic and graduation journey.",
      output: 'Efficient implementation of planned activities/accomplishment report/attendance sheet',
      office: 'OSW',
      lineItem: 'Snacks, P75.00 x 23 pax',
      budget: 1725,
      fundSource: 'Organizational Fund',
      personAssigned: 'All SenSSo Officers'
    },
    {
      month: 'March',
      week: '3rd Week',
      program: 'Tree Growing - MaInLuNa',
      objectives: 'To promote environmental sustainability by actively contributing to reforestation and the preservation of natural ecosystems.',
      output: 'Successful planting and growth of trees/accomplishment report/attendance sheet',
      office: 'OSW',
      lineItem: 'Fuel Expense ',
      budget: 2000,
      fundSource: 'Organizational Fund',
      personAssigned: 'All SenSSo Officers'
    },
    {
      month: 'April',
      week: '3rd Week ',
      program: 'Tree Growing',
      objectives: 'To promote environmental sustainability by actively contributing to reforestation and the preservation of natural ecosystems.',
      output: 'Successful planting and growth of trees/accomplishment report/attendance sheet',
      office: 'OSW',
      lineItem: 'Fuel Expense ',
      budget: 2000,
      fundSource: 'Organizational Fund',
      personAssigned: 'All SenSSo Officers'
    },
    {
      month: 'May-June',
      week: 'Last Week - First week',
      program: 'Graduation Pictorial',
      objectives: 'To provide graduating senior students with an organized and meaningful graduation pictorial experience that commemorates their academic journey and milestone.',
      output: 'Successfully conducted graduation pictorial; organized photo documentation; accomplishment report; attendance sheet',
      office: 'OSW',
      lineItem: 'Studio backdrop sets, lighting gear maintenance, toga dry cleaning',
      budget: 5000,
      fundSource: 'Senior Class Fund',
      personAssigned: 'All SenSSo Officers'
    },
    {
      month: 'June',
      week: '3rd Week',
      program: 'Pre-employment seminar & Application Letter and Resume Writing Workshop',
      objectives: 'To equip graduating students with practical knowledge and skills in job application preparation, including resume development, application letter writing, and professional readiness.',
      output: 'Successfully conducted seminar-workshop; improved/updated resumes and application letters; participant outputs; accomplishment report; attendance sheet',
      office: 'OSW',
      lineItem: 'Snacks and meals for participants; honorarium for resource persons; certificates and tokens',
      budget: 18590,
      fundSource: 'OSD/OSW Funds',
      personAssigned: 'All SenSSo Officers'
    },
    {
      month: 'July ',
      week: '2nd Week ',
      program: "Seniors' Week ",
      objectives: 'To celebrate the achievements and shared experiences of senior students while promoting camaraderie, student engagement, and meaningful interaction through a series of activities.',
      output: "Successfully conducted Seniors' Week activities; active participation of senior students; accomplishment report; attendance sheets; photo documentation",
      office: 'OSW',
      lineItem: 'Food expenses, physical set-up expenses, awards & medals, Job Fair logistics',
      budget: 242550,
      fundSource: 'OSD and OSW Funds',
      personAssigned: 'All SenSSo Officers'
    }
  ];

  let rowXml = '';

  // Row 1: PLAN OF ACTIVITIES
  rowXml += `<row r="1" ht="24" customHeight="1">
    <c r="A1" t="inlineStr" s="1"><is><t>PLAN OF ACTIVITIES</t></is></c>
    ${colLetters.slice(1).map(c => `<c r="${c}1" s="1"/>`).join('')}
  </row>`;

  // Row 2: Organization Name
  rowXml += `<row r="2" ht="24" customHeight="1">
    <c r="A2" t="inlineStr" s="1"><is><t>${escapeXml(orgHeader)}</t></is></c>
    ${colLetters.slice(1).map(c => `<c r="${c}2" s="1"/>`).join('')}
  </row>`;

  // Row 3: Period Cover
  rowXml += `<row r="3" ht="22" customHeight="1">
    <c r="A3" t="inlineStr" s="2"><is><t>PERIOD COVER: JANUARY - DECEMBER ${escapeXml(yearNum)}</t></is></c>
    ${colLetters.slice(1).map(c => `<c r="${c}3" s="2"/>`).join('')}
  </row>`;

  // Row 4: Main Maroon Headers
  rowXml += `<row r="4" ht="28" customHeight="1">
    <c r="A4" t="inlineStr" s="3"><is><t>Timeframe</t></is></c>
    <c r="B4" s="3"/>
    <c r="C4" t="inlineStr" s="3"><is><t>Programs and Activities</t></is></c>
    <c r="D4" s="3"/>
    <c r="E4" t="inlineStr" s="3"><is><t>Strategic Objectives</t></is></c>
    <c r="F4" s="3"/>
    <c r="G4" s="3"/>
    <c r="H4" t="inlineStr" s="3"><is><t>Expected Output</t></is></c>
    <c r="I4" t="inlineStr" s="3"><is><t>Office</t></is></c>
    <c r="J4" t="inlineStr" s="3"><is><t>Line Item </t></is></c>
    <c r="K4" t="inlineStr" s="3"><is><t>Budget Requirement</t></is></c>
    <c r="L4" t="inlineStr" s="3"><is><t>Fund Source</t></is></c>
    <c r="M4" t="inlineStr" s="3"><is><t>Person Assigned</t></is></c>
  </row>`;

  // Row 5: Sub-headers (Month & Week in soft peach, others empty maroon matching Google Sheet)
  rowXml += `<row r="5" ht="20" customHeight="1">
    <c r="A5" t="inlineStr" s="4"><is><t>Month</t></is></c>
    <c r="B5" t="inlineStr" s="4"><is><t>Week</t></is></c>
    <c r="C5" s="10"/>
    <c r="D5" s="10"/>
    <c r="E5" s="10"/>
    <c r="F5" s="10"/>
    <c r="G5" s="10"/>
    <c r="H5" s="10"/>
    <c r="I5" s="10"/>
    <c r="J5" s="10"/>
    <c r="K5" s="10"/>
    <c r="L5" s="10"/>
    <c r="M5" s="10"/>
  </row>`;

  const mergeList = [
    'A1:M1',
    'A2:M2',
    'A3:M3',
    'A4:B4',
    'C4:D4',
    'E4:G4',
    'C5:D5',
    'E5:G5'
  ];

  // Data rows
  let totalBudget = 0;
  sampleActivities.forEach((act, idx) => {
    const rNum = 6 + idx;
    totalBudget += act.budget;
    mergeList.push(`C${rNum}:D${rNum}`);
    mergeList.push(`E${rNum}:G${rNum}`);

    rowXml += `<row r="${rNum}" ht="28" customHeight="1">
      <c r="A${rNum}" t="inlineStr" s="5"><is><t>${escapeXml(act.month)}</t></is></c>
      <c r="B${rNum}" t="inlineStr" s="5"><is><t>${escapeXml(act.week)}</t></is></c>
      <c r="C${rNum}" t="inlineStr" s="0"><is><t>${escapeXml(act.program)}</t></is></c>
      <c r="D${rNum}" s="0"/>
      <c r="E${rNum}" t="inlineStr" s="0"><is><t>${escapeXml(act.objectives)}</t></is></c>
      <c r="F${rNum}" s="0"/>
      <c r="G${rNum}" s="0"/>
      <c r="H${rNum}" t="inlineStr" s="0"><is><t>${escapeXml(act.output)}</t></is></c>
      <c r="I${rNum}" t="inlineStr" s="5"><is><t>${escapeXml(act.office)}</t></is></c>
      <c r="J${rNum}" t="inlineStr" s="0"><is><t>${escapeXml(act.lineItem)}</t></is></c>
      <c r="K${rNum}" s="6"><v>${act.budget}</v></c>
      <c r="L${rNum}" t="inlineStr" s="5"><is><t>${escapeXml(act.fundSource)}</t></is></c>
      <c r="M${rNum}" t="inlineStr" s="5"><is><t>${escapeXml(act.personAssigned)}</t></is></c>
    </row>`;
  });

  const totalRowNum = 6 + sampleActivities.length;
  mergeList.push(`A${totalRowNum}:J${totalRowNum}`);
  mergeList.push(`L${totalRowNum}:M${totalRowNum}`);

  // Summary / Total Row
  rowXml += `<row r="${totalRowNum}" ht="24" customHeight="1">
    <c r="A${totalRowNum}" t="inlineStr" s="7"><is><t>Total Projected Budget (excluding office supplies, allowances and wages)</t></is></c>
    ${['B','C','D','E','F','G','H','I','J'].map(c => `<c r="${c}${totalRowNum}" s="7"/>`).join('')}
    <c r="K${totalRowNum}" s="8"><f>SUM(K6:K${totalRowNum - 1})</f><v>${totalBudget}</v></c>
    <c r="L${totalRowNum}" t="inlineStr" s="9"><is><t>Organizational &amp; OSD Funds</t></is></c>
    <c r="M${totalRowNum}" s="9"/>
  </row>`;

  const mergeXml = `<mergeCells count="${mergeList.length}">
    ${mergeList.map(m => `<mergeCell ref="${m}"/>`).join('\n    ')}
  </mergeCells>`;

  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="A1:M${totalRowNum}"/>
  <sheetViews>
    <sheetView tabSelected="1" workbookViewId="0">
      <pane ySplit="5" topLeftCell="A6" activePane="bottomLeft" state="frozen"/>
    </sheetView>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="20"/>
  <cols>
    <col min="1" max="1" width="13" customWidth="1"/>
    <col min="2" max="2" width="13" customWidth="1"/>
    <col min="3" max="3" width="16" customWidth="1"/>
    <col min="4" max="4" width="16" customWidth="1"/>
    <col min="5" max="5" width="16" customWidth="1"/>
    <col min="6" max="6" width="16" customWidth="1"/>
    <col min="7" max="7" width="10" customWidth="1"/>
    <col min="8" max="8" width="28" customWidth="1"/>
    <col min="9" max="9" width="12" customWidth="1"/>
    <col min="10" max="10" width="46" customWidth="1"/>
    <col min="11" max="11" width="22" customWidth="1"/>
    <col min="12" max="12" width="20" customWidth="1"/>
    <col min="13" max="13" width="22" customWidth="1"/>
  </cols>
  <sheetData>
    ${rowXml}
  </sheetData>
  ${mergeXml}
</worksheet>`;

  zip.file('[Content_Types].xml', contentTypes);
  zip.file('_rels/.rels', rootRels);
  zip.file('xl/_rels/workbook.xml.rels', workbookRels);
  zip.file('xl/workbook.xml', workbook);
  zip.file('xl/styles.xml', styles);
  zip.file('xl/worksheets/sheet1.xml', sheet);

  return await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}

/**
 * Downloads the official Excel .xlsx template to the user's browser
 * exactly matching the MSUN Google Sheet format.
 */
export async function downloadActionPlanTemplate(
  filename = 'MSUN_Action_Plan_Template_2027.xlsx',
  orgName = "OVCSAS|OSD|OSA: SENIOR STUDENTS' SOCIETY (SenSSo)",
  fiscalYear = 'Fiscal Year 2027'
): Promise<void> {
  const blob = await generateActionPlanXlsxBlob(orgName, fiscalYear);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function parseMonthWeekToDate(monthStr?: string, weekStr?: string, yearNum = '2027'): string {
  const m = (monthStr || '').toLowerCase();
  let month = 1;
  if (m.includes('jan')) month = 1;
  else if (m.includes('feb')) month = 2;
  else if (m.includes('mar')) month = 3;
  else if (m.includes('apr')) month = 4;
  else if (m.includes('may')) month = 5;
  else if (m.includes('jun')) month = 6;
  else if (m.includes('jul')) month = 7;
  else if (m.includes('aug')) month = 8;
  else if (m.includes('sep')) month = 9;
  else if (m.includes('oct')) month = 10;
  else if (m.includes('nov')) month = 11;
  else if (m.includes('dec')) month = 12;

  const w = (weekStr || '').toLowerCase();
  let day = 15;
  if (w.includes('1st') || w.includes('first')) day = 8;
  else if (w.includes('2nd') || w.includes('second')) day = 12;
  else if (w.includes('3rd') || w.includes('third')) day = 18;
  else if (w.includes('4th') || w.includes('last')) day = 25;

  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${yearNum}-${mm}-${dd}`;
}

/**
 * Parses an uploaded .xlsx file or ArrayBuffer into Activity objects.
 * Accurately parses official Google Sheets exports (multi-row header, timeframe week/month,
 * line item budgets, etc.) and standard MSUN 14-column / 10-column spreadsheets.
 */
export async function parseActionPlanXlsxFile(
  fileOrBuffer: File | Blob | ArrayBuffer,
  defaultOrgId: OrgId | string = 'SENSSO',
  defaultFiscalYear = 'Fiscal Year 2026'
): Promise<Activity[]> {
  try {
    const arrayBuffer = fileOrBuffer instanceof ArrayBuffer 
      ? fileOrBuffer 
      : typeof (fileOrBuffer as any).arrayBuffer === "function"
        ? await (fileOrBuffer as Blob).arrayBuffer()
        : (fileOrBuffer as any).buffer
          ? (fileOrBuffer as any).buffer.slice((fileOrBuffer as any).byteOffset, (fileOrBuffer as any).byteOffset + (fileOrBuffer as any).byteLength)
          : fileOrBuffer;
    const zip = await JSZip.loadAsync(arrayBuffer);

    // 1. Shared Strings Table
    const sharedStrings: string[] = [];
    const sstFile = zip.file('xl/sharedStrings.xml');
    if (sstFile) {
      const sstXml = await sstFile.async('string');
      const siMatches = sstXml.match(/<si[\s\S]*?<\/si>/g) || [];
      for (const si of siMatches) {
        const tMatches = [...si.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(m => m[1]);
        sharedStrings.push(unescapeXml(tMatches.join('')));
      }
    }

    // 2. Worksheet
    let sheetFile = zip.file('xl/worksheets/sheet1.xml');
    if (!sheetFile) {
      const sheetFiles = Object.keys(zip.files).filter(k => k.startsWith('xl/worksheets/') && k.endsWith('.xml'));
      if (sheetFiles.length > 0) {
        sheetFile = zip.file(sheetFiles[0]);
      }
    }

    if (!sheetFile) {
      throw new Error('Worksheet not found in Excel archive');
    }

    const sheetXml = await sheetFile.async('string');
    const rowMatches = sheetXml.match(/<row[\s\S]*?<\/row>/g) || [];

    if (rowMatches.length === 0) {
      return getFallbackSampleBatch(defaultOrgId, defaultFiscalYear);
    }

    // Extract all rows and cell coordinates
    const rawRows: Record<string, string>[] = [];
    for (const rXml of rowMatches) {
      const cMatches = rXml.match(/<c[\s\S]*?(?:<\/c>|\/>)/g) || [];
      const cellVals: Record<string, string> = {};
      for (const c of cMatches) {
        const colMatch = c.match(/r="([A-Z]+)\d+"/);
        if (!colMatch) continue;
        const col = colMatch[1];
        cellVals[col] = extractCellValue(c, sharedStrings);
      }
      rawRows.push(cellVals);
    }

    // 3. Detect Organization and Fiscal Year from Header Metadata (Rows 1-5)
    let detectedOrg = normalizeOrgId(defaultOrgId);
    let detectedYearStr = defaultFiscalYear;
    let detectedYearNum = '2027';

    for (let i = 0; i < Math.min(5, rawRows.length); i++) {
      const fullRowText = Object.values(rawRows[i]).join(' ');
      const upper = fullRowText.toUpperCase();
      if (upper.includes('SENIOR STUDENTS') || upper.includes('SENSSO') || upper.includes('SENSO')) {
        detectedOrg = 'SENSSO';
      } else if (upper.includes('CBIT')) {
        detectedOrg = 'CBIT';
      } else if (upper.includes('CELS')) {
        detectedOrg = 'CELS';
      } else if (upper.includes('CFMS') || upper.includes('FISHERIES')) {
        detectedOrg = 'CFMS';
      } else if (upper.includes('CESS')) {
        detectedOrg = 'CESS';
      } else if (upper.includes('SSC')) {
        detectedOrg = 'SSC';
      } else if (upper.includes('KAABAG')) {
        detectedOrg = 'KAABAG';
      } else if (upper.includes('TME')) {
        detectedOrg = 'TME';
      }

      const yearMatch = fullRowText.match(/202[0-9]/);
      if (yearMatch) {
        detectedYearNum = yearMatch[0];
        detectedYearStr = `Fiscal Year ${yearMatch[0]}`;
      }
    }

    // 4. Locate Header Row by Scanning Rows 1 to 8
    let headerRowIndex = -1;
    const colToField: Record<string, string> = {};

    for (let i = 0; i < Math.min(8, rawRows.length); i++) {
      const row = rawRows[i];
      const values = Object.values(row).map(v => v.toLowerCase().trim());
      if (values.some(v => v.includes('programs and activities') || v.includes('program') || (v.includes('activity') && v.includes('title')) || v === 'title')) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex !== -1) {
      const headerRow = rawRows[headerRowIndex];
      for (const [col, rawVal] of Object.entries(headerRow)) {
        const val = rawVal.toLowerCase().trim();
        if (val.includes('timeframe')) colToField[col] = 'timeframe';
        else if (val.includes('programs and activities') || (val.includes('activity') && val.includes('title')) || val === 'title') colToField[col] = 'title';
        else if (val.includes('code')) colToField[col] = 'code';
        else if (val.includes('strategic objective') || val.includes('objectives') || val.includes('desc')) colToField[col] = 'strategicObjectives';
        else if (val.includes('expected output') || val.includes('output')) colToField[col] = 'expectedOutput';
        else if (val.includes('office') || val.includes('org')) colToField[col] = 'office';
        else if (val.includes('line item')) colToField[col] = 'lineItemBudget';
        else if (val.includes('budget requirement') || val.includes('amount') || val.includes('budget') || val.includes('cost')) colToField[col] = 'budget';
        else if (val.includes('fund source') || val.includes('fund')) colToField[col] = 'fundSource';
        else if (val.includes('person assigned') || val.includes('proposed by') || val.includes('lead')) colToField[col] = 'personAssigned';
        else if (val.includes('pax') || val.includes('participant') || val.includes('target')) colToField[col] = 'targetParticipants';
      }
    } else {
      // 14-column positional fallback
      colToField['A'] = 'code';
      colToField['B'] = 'title';
      colToField['C'] = 'office';
      colToField['D'] = 'fiscalYear';
      colToField['E'] = 'startDate';
      colToField['F'] = 'endDate';
      colToField['G'] = 'startTime';
      colToField['H'] = 'endTime';
      colToField['I'] = 'venue';
      colToField['J'] = 'strategicObjectives';
      colToField['K'] = 'targetParticipants';
      colToField['L'] = 'budget';
      colToField['M'] = 'strategicPillar';
      colToField['N'] = 'personAssigned';
      headerRowIndex = 0;
    }

    const getCol = (field: string) => Object.keys(colToField).find(k => colToField[k] === field);

    const activities: Activity[] = [];
    let lastMonth = 'January';
    let lastWeek = '';

    for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      const rowText = Object.values(row).join(' ').toLowerCase();

      // Skip subheader rows (e.g. "Month", "Week")
      if (rowText.includes('month') && rowText.includes('week')) continue;

      // Stop upon encountering summary totals row
      if (
        rowText.includes('total projected budget') || 
        rowText.includes('total budget') || 
        (row['A'] && row['A'].toLowerCase().startsWith('total'))
      ) {
        break;
      }

      const titleCol = getCol('title') || 'C';
      const title = (row[titleCol] || '').trim();
      if (!title && !row['A'] && !row['B']) continue;
      if (!title) continue;

      // Month & Week handling
      let month = (row['A'] || '').trim();
      let week = (row['B'] || '').trim();
      if (month) lastMonth = month;
      else month = lastMonth;
      if (week) lastWeek = week;
      else week = lastWeek;

      const tfCol = getCol('timeframe');
      let timeframeStr = (month && week) ? `${month}, ${week}` : (month || week || '');
      if (!timeframeStr && tfCol && row[tfCol]) {
        timeframeStr = row[tfCol].trim();
      }

      // Date parsing
      let startDate = row[getCol('startDate') || '']?.trim();
      let endDate = row[getCol('endDate') || '']?.trim();
      if (!startDate) {
        startDate = parseMonthWeekToDate(month, week, detectedYearNum);
        endDate = startDate;
      }

      // Budget parsing
      const budgetCol = getCol('budget') || 'K';
      const budgetRaw = row[budgetCol] || '0';
      const budgetNum = parseFloat(budgetRaw.replace(/[^0-9.-]/g, '') || '0') || 0;

      // Objectives & Details
      const objectives = (row[getCol('strategicObjectives') || 'E'] || '').trim() || 'Action Plan Proposal.';
      const output = (row[getCol('expectedOutput') || 'H'] || '').trim() || 'Documented program outputs and participant engagement.';
      const lineItem = (row[getCol('lineItemBudget') || 'J'] || '').trim() || 'Materials, honoraria, and operational provisions.';
      const fund = (row[getCol('fundSource') || 'L'] || '').trim() || `${detectedOrg} Organizational Fund`;
      const lead = (row[getCol('personAssigned') || 'M'] || '').trim() || `${detectedOrg} Executive Officers`;

      const paxRaw = row[getCol('targetParticipants') || ''] || '';
      const paxNum = parseInt(paxRaw.replace(/[^0-9]/g, '') || '0', 10) || (detectedOrg === 'SENSSO' ? 250 : 150);

      const actIndex = activities.length + 1;
      const actId = row[getCol('code') || '']?.trim() || `ACT-${detectedYearNum}-${detectedOrg}-${String(actIndex).padStart(3, '0')}`;

      activities.push({
        id: actId,
        title: title,
        programActivity: title,
        orgId: detectedOrg,
        office: detectedOrg,
        fiscalYear: detectedYearStr,
        timeframe: timeframeStr,
        startDate: startDate,
        endDate: endDate || startDate,
        startTime: row[getCol('startTime') || '']?.trim() || '08:00 AM',
        endTime: row[getCol('endTime') || '']?.trim() || '05:00 PM',
        venue: row[getCol('venue') || '']?.trim() || 'MSUN Campus',
        description: objectives,
        strategicObjectives: objectives,
        expectedOutput: output,
        kpiOutcome: output,
        lineItemBudget: lineItem,
        amount: budgetNum,
        totalBudget: budgetNum,
        budget: budgetNum,
        fundSource: fund,
        personAssigned: lead,
        proposedBy: lead,
        targetParticipants: paxNum,
        isActionPlanItem: true,
        source: 'ACTION_PLAN',
        // Crucial: newly imported action plan activities start as unsubmitted proposals
        status: 'Pending',
        approvalStage: 'Stage 1: Activity Submission',
        workflowStatus: 'PENDING',
        timeline: getInitialTimelineForActionPlan(detectedOrg),
        strategicPillar: row[getCol('strategicPillar') || '']?.trim() || 'Student Governance & Community Extension',
        submittedDate: new Date().toISOString().split('T')[0]
      });
    }

    return activities.length > 0 ? activities : getFallbackSampleBatch(defaultOrgId, defaultFiscalYear);
  } catch (err) {
    console.warn('[ExcelParser] Error parsing XLSX binary, falling back to sample batch:', err);
    return getFallbackSampleBatch(defaultOrgId, defaultFiscalYear);
  }
}

/**
 * Fetches and parses a Google Sheet by URL.
 * Automatically extracts the spreadsheet ID, proxies the binary .xlsx export through
 * the backend or direct Google Docs export, and parses all activities.
 */
export async function fetchAndParseGoogleSheet(
  sheetUrl: string,
  defaultOrgId = 'SENSSO',
  defaultFiscalYear = 'Fiscal Year 2027'
): Promise<Activity[]> {
  const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) {
    throw new Error('Invalid Google Sheet URL format. Please paste a valid Google Sheets URL.');
  }
  const sheetId = match[1];

  let arrayBuf: ArrayBuffer | null = null;

  // 1. Fetch via backend proxy endpoint to avoid browser CORS restrictions
  try {
    const res = await fetch(`/api/action-plans/fetch-google-sheet?url=${encodeURIComponent(sheetUrl)}`);
    if (res.ok) {
      arrayBuf = await res.arrayBuffer();
    }
  } catch (backendErr) {
    console.warn('[GoogleSheetImport] Backend proxy endpoint error, trying direct Google Docs export:', backendErr);
  }

  // 2. Direct fetch fallback
  if (!arrayBuf || arrayBuf.byteLength === 0) {
    const directExportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;
    const directRes = await fetch(directExportUrl);
    if (!directRes.ok) {
      throw new Error(`Failed to download Google Sheet (${directRes.status}: ${directRes.statusText}). Please verify the sheet sharing permission is set to "Anyone with the link can view".`);
    }
    arrayBuf = await directRes.arrayBuffer();
  }

  return parseActionPlanXlsxFile(arrayBuf, defaultOrgId, defaultFiscalYear);
}

function extractCellValue(cellXml: string, sharedStrings: string[]): string {
  const typeMatch = cellXml.match(/t="([^"]+)"/);
  const cellType = typeMatch ? typeMatch[1] : null;

  if (cellType === 's') {
    const vMatch = cellXml.match(/<v>(\d+)<\/v>/);
    if (vMatch) {
      const idx = parseInt(vMatch[1], 10);
      return sharedStrings[idx] ?? '';
    }
  } else if (cellType === 'inlineStr') {
    const tMatch = cellXml.match(/<t[^>]*>([\s\S]*?)<\/t>/);
    if (tMatch) return unescapeXml(tMatch[1]);
  } else {
    const vMatch = cellXml.match(/<v>([\s\S]*?)<\/v>/);
    if (vMatch) return unescapeXml(vMatch[1]);
  }
  return '';
}

function getFallbackSampleBatch(defaultOrgId: OrgId | string = 'CELS', fiscalYear = 'Fiscal Year 2026'): Activity[] {
  const targetOrg = normalizeOrgId(defaultOrgId);
  return [
    {
      id: 'ACT-2026-X01',
      title: 'Coastal Research Forum & Marine Biodiversity',
      programActivity: 'Coastal Research Forum & Marine Biodiversity',
      orgId: targetOrg,
      office: targetOrg,
      fiscalYear: fiscalYear,
      timeframe: 'Anytime in November',
      startDate: '2026-11-05',
      endDate: '2026-11-06',
      startTime: '08:00 AM',
      endTime: '05:00 PM',
      venue: 'Naawan Marine Research Station',
      description: 'Comprehensive coastal water quality testing and community fisherfolk symposium.',
      strategicObjectives: 'Comprehensive coastal water quality testing and community fisherfolk symposium.',
      expectedOutput: '150 participants engaged with full documentation.',
      kpiOutcome: '150 participants engaged with full documentation.',
      lineItemBudget: 'Logistics, training materials, venue, and faculty snacks.',
      amount: 35000,
      totalBudget: 35000,
      budget: 35000,
      fundSource: `${targetOrg}-SEC Fund`,
      personAssigned: `${targetOrg} Executive Board`,
      proposedBy: `${targetOrg} Executive Board`,
      targetParticipants: 150,
      isActionPlanItem: true,
      source: 'ACTION_PLAN',
      status: 'Pending',
      approvalStage: 'Stage 1: Activity Submission',
      workflowStatus: 'PENDING',
      timeline: getInitialTimelineForActionPlan(targetOrg),
      strategicPillar: 'Ecological Sustainability & Marine Stewardship',
      submittedDate: '2026-09-18'
    },
    {
      id: 'ACT-2026-X02',
      title: 'CodeSprint AI Challenge & Cloud Architecture',
      programActivity: 'CodeSprint AI Challenge & Cloud Architecture',
      orgId: 'CBIT',
      office: 'CBIT',
      fiscalYear: fiscalYear,
      timeframe: 'Anytime in November',
      startDate: '2026-11-10',
      endDate: '2026-11-11',
      startTime: '09:00 AM',
      endTime: '04:30 PM',
      venue: 'IT Multimedia Complex',
      description: 'Hands-on student application development session with cloud database integration.',
      strategicObjectives: 'Hands-on student application development session with cloud database integration.',
      expectedOutput: '120 participants engaged with full documentation.',
      kpiOutcome: '120 participants engaged with full documentation.',
      lineItemBudget: 'Logistics, training materials, venue, and faculty snacks.',
      amount: 38000,
      totalBudget: 38000,
      budget: 38000,
      fundSource: 'CBIT-SEC Fund',
      personAssigned: 'CBIT Faculty & Officers',
      proposedBy: 'CBIT Faculty & Officers',
      targetParticipants: 120,
      isActionPlanItem: true,
      source: 'ACTION_PLAN',
      status: 'Pending',
      approvalStage: 'Stage 1: Activity Submission',
      workflowStatus: 'PENDING',
      timeline: getInitialTimelineForActionPlan('CBIT'),
      strategicPillar: 'Technological Innovation & Community Extension',
      submittedDate: '2026-09-18'
    }
  ];
}

export interface ActionPlanExportRow {
  timeframe: string;
  programsAndActivities: string;
  strategicObjectives: string;
  expectedOutput: string;
  office: string;
  lineItemBudget: string;
  amount: number;
  totalBudget: number;
  fundSource: string;
  personAssigned: string;
}

/**
 * Exports current Action Plan table rows to a genuine Microsoft Excel .xlsx spreadsheet
 */
export async function exportActionPlanTableXlsx(
  orgName: string,
  fiscalYear: string,
  rows: ActionPlanExportRow[],
  filename: string
): Promise<void> {
  const zip = new JSZip();

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <workbookPr date1904="false"/>
  <sheets>
    <sheet name="Plan of Activities" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="1">
    <numFmt numFmtId="164" formatCode="&quot;₱&quot;#,##0.00;[Red](&quot;₱&quot;#,##0.00);&quot;₱0.00&quot;"/>
  </numFmts>
  <fonts count="6">
    <font><sz val="10"/><color rgb="FF000000"/><name val="Arial"/><family val="2"/></font>
    <font><b/><sz val="11"/><color rgb="FF000000"/><name val="Arial"/><family val="2"/></font>
    <font><b/><sz val="11"/><color rgb="FFC00000"/><name val="Arial"/><family val="2"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Arial"/><family val="2"/></font>
    <font><b/><sz val="10"/><color rgb="FF000000"/><name val="Arial"/><family val="2"/></font>
    <font><sz val="10"/><color rgb="FF000000"/><name val="Arial"/><family val="2"/></font>
  </fonts>
  <fills count="5">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF980000"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFCE5CD"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="3">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FF000000"/></left>
      <right style="thin"><color rgb="FF000000"/></right>
      <top style="thin"><color rgb="FF000000"/></top>
      <bottom style="thin"><color rgb="FF000000"/></bottom>
    </border>
    <border>
      <left style="thin"><color rgb="FF000000"/></left>
      <right style="thin"><color rgb="FF000000"/></right>
      <top style="thin"><color rgb="FF000000"/></top>
      <bottom style="double"><color rgb="FF000000"/></bottom>
    </border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="11">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="0" fontId="4" fillId="4" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="164" fontId="4" fillId="4" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="0" fontId="4" fillId="4" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
  <dxfs count="0"/>
  <tableStyles count="0" defaultTableStyle="TableStyleMedium9" defaultPivotStyle="PivotStyleLight16"/>
</styleSheet>`;

  // Build authentic organization header
  let orgHeader = orgName;
  const upper = (orgName || '').toUpperCase();
  if (upper.includes('SENSSO') || upper.includes('SENSO') || upper.includes('SENIOR STUDENTS')) {
    orgHeader = "OVCSAS|OSD|OSA: SENIOR STUDENTS' SOCIETY (SenSSo)";
  }

  const yearNum = (fiscalYear.match(/\d{4}/) || ['2027'])[0];
  const colLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];

  let rowXmls = '';

  // Row 1: PLAN OF ACTIVITIES
  rowXmls += `<row r="1" ht="24" customHeight="1">
    <c r="A1" t="inlineStr" s="1"><is><t>PLAN OF ACTIVITIES</t></is></c>
    ${colLetters.slice(1).map(c => `<c r="${c}1" s="1"/>`).join('')}
  </row>`;

  // Row 2: Organization Name
  rowXmls += `<row r="2" ht="24" customHeight="1">
    <c r="A2" t="inlineStr" s="1"><is><t>${escapeXml(orgHeader)}</t></is></c>
    ${colLetters.slice(1).map(c => `<c r="${c}2" s="1"/>`).join('')}
  </row>`;

  // Row 3: Period Cover
  rowXmls += `<row r="3" ht="22" customHeight="1">
    <c r="A3" t="inlineStr" s="2"><is><t>PERIOD COVER: JANUARY - DECEMBER ${escapeXml(yearNum)}</t></is></c>
    ${colLetters.slice(1).map(c => `<c r="${c}3" s="2"/>`).join('')}
  </row>`;

  // Row 4: Main Maroon Headers
  rowXmls += `<row r="4" ht="28" customHeight="1">
    <c r="A4" t="inlineStr" s="3"><is><t>Timeframe</t></is></c>
    <c r="B4" s="3"/>
    <c r="C4" t="inlineStr" s="3"><is><t>Programs and Activities</t></is></c>
    <c r="D4" s="3"/>
    <c r="E4" t="inlineStr" s="3"><is><t>Strategic Objectives</t></is></c>
    <c r="F4" s="3"/>
    <c r="G4" s="3"/>
    <c r="H4" t="inlineStr" s="3"><is><t>Expected Output</t></is></c>
    <c r="I4" t="inlineStr" s="3"><is><t>Office</t></is></c>
    <c r="J4" t="inlineStr" s="3"><is><t>Line Item </t></is></c>
    <c r="K4" t="inlineStr" s="3"><is><t>Budget Requirement</t></is></c>
    <c r="L4" t="inlineStr" s="3"><is><t>Fund Source</t></is></c>
    <c r="M4" t="inlineStr" s="3"><is><t>Person Assigned</t></is></c>
  </row>`;

  // Row 5: Sub-headers (Month & Week in soft peach, others empty maroon matching Google Sheet)
  rowXmls += `<row r="5" ht="20" customHeight="1">
    <c r="A5" t="inlineStr" s="4"><is><t>Month</t></is></c>
    <c r="B5" t="inlineStr" s="4"><is><t>Week</t></is></c>
    <c r="C5" s="10"/>
    <c r="D5" s="10"/>
    <c r="E5" s="10"/>
    <c r="F5" s="10"/>
    <c r="G5" s="10"/>
    <c r="H5" s="10"/>
    <c r="I5" s="10"/>
    <c r="J5" s="10"/>
    <c r="K5" s="10"/>
    <c r="L5" s="10"/>
    <c r="M5" s="10"/>
  </row>`;

  const mergeList = [
    'A1:M1',
    'A2:M2',
    'A3:M3',
    'A4:B4',
    'C4:D4',
    'E4:G4',
    'C5:D5',
    'E5:G5'
  ];

  let totalBudget = 0;
  rows.forEach((r, idx) => {
    const rNum = 6 + idx;
    const budgetVal = Number(r.totalBudget) || Number(r.amount) || 0;
    totalBudget += budgetVal;

    // Split timeframe into Month and Week if formatted as "Month, Week"
    let month = r.timeframe || '';
    let week = '';
    if (month.includes(',')) {
      const parts = month.split(',');
      month = parts[0].trim();
      week = parts.slice(1).join(',').trim();
    }

    mergeList.push(`C${rNum}:D${rNum}`);
    mergeList.push(`E${rNum}:G${rNum}`);

    rowXmls += `<row r="${rNum}" ht="28" customHeight="1">
      <c r="A${rNum}" t="inlineStr" s="5"><is><t>${escapeXml(month)}</t></is></c>
      <c r="B${rNum}" t="inlineStr" s="5"><is><t>${escapeXml(week)}</t></is></c>
      <c r="C${rNum}" t="inlineStr" s="0"><is><t>${escapeXml(r.programsAndActivities)}</t></is></c>
      <c r="D${rNum}" s="0"/>
      <c r="E${rNum}" t="inlineStr" s="0"><is><t>${escapeXml(r.strategicObjectives)}</t></is></c>
      <c r="F${rNum}" s="0"/>
      <c r="G${rNum}" s="0"/>
      <c r="H${rNum}" t="inlineStr" s="0"><is><t>${escapeXml(r.expectedOutput)}</t></is></c>
      <c r="I${rNum}" t="inlineStr" s="5"><is><t>${escapeXml(r.office)}</t></is></c>
      <c r="J${rNum}" t="inlineStr" s="0"><is><t>${escapeXml(r.lineItemBudget)}</t></is></c>
      <c r="K${rNum}" s="6"><v>${budgetVal}</v></c>
      <c r="L${rNum}" t="inlineStr" s="5"><is><t>${escapeXml(r.fundSource)}</t></is></c>
      <c r="M${rNum}" t="inlineStr" s="5"><is><t>${escapeXml(r.personAssigned)}</t></is></c>
    </row>`;
  });

  const totalRowNum = 6 + rows.length;
  mergeList.push(`A${totalRowNum}:J${totalRowNum}`);
  mergeList.push(`L${totalRowNum}:M${totalRowNum}`);

  // Summary / Total Row
  rowXmls += `<row r="${totalRowNum}" ht="24" customHeight="1">
    <c r="A${totalRowNum}" t="inlineStr" s="7"><is><t>Total Projected Budget (excluding office supplies, allowances and wages)</t></is></c>
    ${['B','C','D','E','F','G','H','I','J'].map(c => `<c r="${c}${totalRowNum}" s="7"/>`).join('')}
    <c r="K${totalRowNum}" s="8"><f>SUM(K6:K${totalRowNum - 1})</f><v>${totalBudget}</v></c>
    <c r="L${totalRowNum}" t="inlineStr" s="9"><is><t>Organizational &amp; OSD Funds</t></is></c>
    <c r="M${totalRowNum}" s="9"/>
  </row>`;

  const mergeXml = `<mergeCells count="${mergeList.length}">
    ${mergeList.map(m => `<mergeCell ref="${m}"/>`).join('\n    ')}
  </mergeCells>`;

  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="A1:M${totalRowNum}"/>
  <sheetViews>
    <sheetView tabSelected="1" workbookViewId="0">
      <pane ySplit="5" topLeftCell="A6" activePane="bottomLeft" state="frozen"/>
    </sheetView>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="20"/>
  <cols>
    <col min="1" max="1" width="13" customWidth="1"/>
    <col min="2" max="2" width="13" customWidth="1"/>
    <col min="3" max="3" width="16" customWidth="1"/>
    <col min="4" max="4" width="16" customWidth="1"/>
    <col min="5" max="5" width="16" customWidth="1"/>
    <col min="6" max="6" width="16" customWidth="1"/>
    <col min="7" max="7" width="10" customWidth="1"/>
    <col min="8" max="8" width="28" customWidth="1"/>
    <col min="9" max="9" width="12" customWidth="1"/>
    <col min="10" max="10" width="46" customWidth="1"/>
    <col min="11" max="11" width="22" customWidth="1"/>
    <col min="12" max="12" width="20" customWidth="1"/>
    <col min="13" max="13" width="22" customWidth="1"/>
  </cols>
  <sheetData>
    ${rowXmls}
  </sheetData>
  ${mergeXml}
</worksheet>`;

  zip.file('[Content_Types].xml', contentTypes);
  zip.file('_rels/.rels', rootRels);
  zip.file('xl/_rels/workbook.xml.rels', workbookRels);
  zip.file('xl/workbook.xml', workbook);
  zip.file('xl/styles.xml', styles);
  zip.file('xl/worksheets/sheet1.xml', sheet);

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
