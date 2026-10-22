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

export function formatExcelSerialDate(
  serial?: string | number | null, 
  defaultYear = '2027'
): { isoDate: string; timeframe: string } | null {
  if (!serial) return null;
  const num = typeof serial === 'number' ? serial : parseFloat(String(serial).trim());
  if (!isNaN(num) && num > 30000 && num < 60000) {
    const date = new Date((num - (25567 + 2)) * 86400 * 1000);
    if (!isNaN(date.getTime())) {
      const y = date.getFullYear() || defaultYear;
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      const monthName = date.toLocaleString('en-US', { month: 'long' });
      return {
        isoDate: `${y}-${m}-${d}`,
        timeframe: `Anytime in ${monthName}`
      };
    }
  }
  return null;
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
/**
 * Enhanced OpenXML Parser for MSUN Action Plan spreadsheets (.xlsx)
 * Supports all MSUN template formats:
 * - Sub-row line item grouping under activities (e.g. CFMS/FiMSSO, CBIT, KAABAG)
 * - Inherited Month / Timeframe from preceding rows
 * - Direct 2-column or 3-column schedules (Month in A, Week in B or Month, Week merged in A)
 * - Both Google Sheets exports and Excel-authored files
 * - Excel date serials (e.g. 46068) converted to valid ISO dates
 * - Council detection for CFMS / FIMSSO, SENSSO, CBIT, CELS, CESS, KAABAG, TME, SSC
 * - Flexible column mappings (Time Frame, Programs/Activities/Projects, Strategic Objectives, Line Item, etc.)
 */
export async function parseActionPlanXlsxFile(
  fileOrBuffer: File | Blob | ArrayBuffer | Uint8Array,
  defaultOrgId: OrgId | string = 'CFMS',
  defaultFiscalYear = 'Fiscal Year 2027'
): Promise<Activity[]> {
  try {
    let arrayBuf: ArrayBuffer;
    if (fileOrBuffer instanceof ArrayBuffer) {
      arrayBuf = fileOrBuffer;
    } else if (fileOrBuffer instanceof Uint8Array || (typeof Buffer !== 'undefined' && Buffer.isBuffer(fileOrBuffer))) {
      arrayBuf = fileOrBuffer.buffer.slice(fileOrBuffer.byteOffset, fileOrBuffer.byteOffset + fileOrBuffer.byteLength) as ArrayBuffer;
    } else if (typeof (fileOrBuffer as any).arrayBuffer === 'function') {
      arrayBuf = await (fileOrBuffer as File | Blob).arrayBuffer();
    } else {
      throw new Error('Unsupported file or buffer input format for Action Plan parsing.');
    }

    const zip = await JSZip.loadAsync(arrayBuf);

    // 1. Extract shared strings
    const sharedStrings: string[] = [];
    const sstEntry = zip.file('xl/sharedStrings.xml') || zip.file(/xl\/sharedStrings\.xml/i)[0];
    if (sstEntry) {
      const sstXml = await sstEntry.async('string');
      const siMatches = sstXml.match(/<si[\s\S]*?<\/si>/g) || [];
      for (const si of siMatches) {
        const tMatches = [...si.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(m => m[1]);
        sharedStrings.push(unescapeXml(tMatches.join('')));
      }
    }

    // 2. Locate worksheet
    let sheetEntry = zip.file('xl/worksheets/sheet1.xml');
    if (!sheetEntry) {
      const allSheetFiles = zip.file(/^xl\/worksheets\/sheet.*\.xml$/i);
      if (allSheetFiles.length > 0) {
        sheetEntry = allSheetFiles[0];
      }
    }
    if (!sheetEntry) {
      throw new Error('Could not locate any worksheet inside the .xlsx spreadsheet package.');
    }

    const sheetXml = await sheetEntry.async('string');
    const rowMatches = sheetXml.match(/<row[\s\S]*?<\/row>/g) || [];

    const rawRows: Record<string, string>[] = [];
    for (const rXml of rowMatches) {
      const cMatches = rXml.match(/<c[\s\S]*?(?:<\/c>|\/>)/g) || [];
      const cellVals: Record<string, string> = {};
      for (const c of cMatches) {
        const rAttrMatch = c.match(/r="([A-Z]+)\d+"/);
        if (rAttrMatch) {
          const colLetter = rAttrMatch[1];
          cellVals[colLetter] = extractCellValue(c, sharedStrings);
        }
      }
      if (Object.keys(cellVals).length > 0) {
        rawRows.push(cellVals);
      }
    }

    if (rawRows.length === 0) {
      console.warn('[ActionPlanExcel] No readable rows extracted from sheet, falling back to official presets.');
      return getFallbackSampleBatch(defaultOrgId, defaultFiscalYear);
    }

    // 3. Organization and Fiscal Year detection from top metadata rows
    let detectedOrg = normalizeOrgId(defaultOrgId);
    let detectedYearNum = (defaultFiscalYear.match(/\d{4}/) || ['2027'])[0];
    let detectedYearStr = defaultFiscalYear;

    for (let i = 0; i < Math.min(6, rawRows.length); i++) {
      const fullRowText = Object.values(rawRows[i]).join(' ');
      const upper = fullRowText.toUpperCase();

      if (upper.includes('SENIOR STUDENTS') || upper.includes('SENSSO') || upper.includes('SENSO')) {
        detectedOrg = 'SENSSO';
      } else if (
        upper.includes('CFMS') || 
        upper.includes('CMFS') || 
        upper.includes('FIMS') || 
        upper.includes('FISHERIES') || 
        upper.includes('MARINE SCIENCE')
      ) {
        detectedOrg = 'CFMS';
      } else if (upper.includes('CBIT') || upper.includes('BUSINESS AND INFORMATION')) {
        detectedOrg = 'CBIT';
      } else if (upper.includes('CELS') || upper.includes('ENVIRONMENT AND LIFE') || upper.includes('ELSSA')) {
        detectedOrg = 'CELS';
      } else if (upper.includes('CESS') || upper.includes('EDUCATION AND SOCIAL')) {
        detectedOrg = 'CESS';
      } else if (upper.includes('KAABAG')) {
        detectedOrg = 'KAABAG';
      } else if (upper.includes('TME') || upper.includes('MARINE ECHO')) {
        detectedOrg = 'TME';
      } else if (upper.includes('SSC') || upper.includes('SUPREME STUDENT')) {
        detectedOrg = 'SSC';
      }

      const yearMatch = fullRowText.match(/202[0-9]/);
      if (yearMatch) {
        detectedYearNum = yearMatch[0];
        detectedYearStr = `Fiscal Year ${yearMatch[0]}`;
      }
    }

    // 4. Header detection
    let headerRowIndex = -1;
    const colToField: Record<string, string> = {};
    const headerKeywords = [
      'timeframe', 'time frame', 'programs and activities', 'programs/activities',
      'program', 'activities', 'activity title', 'activity code', 'activity',
      'strategic objective', 'objectives', 'expected output', 'line item',
      'budget requirement', 'fund source', 'person assigned', 'target pax', 'venue'
    ];

    for (let i = 0; i < Math.min(8, rawRows.length); i++) {
      const row = rawRows[i];
      const vals = Object.values(row).map(v => v.toLowerCase().trim());
      const rowJoined = vals.join(' ');
      let matchCount = 0;
      for (const kw of headerKeywords) {
        if (rowJoined.includes(kw)) matchCount++;
      }
      if (matchCount >= 2) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex !== -1) {
      const headerRow = rawRows[headerRowIndex];
      for (const [col, rawVal] of Object.entries(headerRow)) {
        const val = rawVal.toLowerCase().trim();
        if (val.includes('code') || val === 'no.' || val === 'no' || val === '#') {
          colToField[col] = 'code';
        } else if (val.includes('timeframe') || val.includes('time frame') || val.includes('schedule') || val.includes('period')) {
          colToField[col] = 'timeframe';
        } else if (val.includes('program') || val.includes('activit') || val.includes('project') || val.includes('title') || val === 'name') {
          colToField[col] = 'title';
        } else if (val.includes('objective') || val.includes('purpose') || val.includes('desc')) {
          colToField[col] = 'strategicObjectives';
        } else if (val.includes('output') || val.includes('deliverable') || val.includes('kpi') || val.includes('outcome')) {
          colToField[col] = 'expectedOutput';
        } else if (val.includes('office') || (val.includes('org') && !val.includes('program') && !val.includes('activity'))) {
          colToField[col] = 'office';
        } else if (val.includes('line item') || val.includes('particular') || val.includes('breakdown')) {
          colToField[col] = 'lineItemBudget';
        } else if (val.includes('budget') || val.includes('amount') || val.includes('cost')) {
          if (!colToField['budget']) colToField[col] = 'budget';
        } else if (val.includes('fund') && !val.includes('budget')) {
          colToField[col] = 'fundSource';
        } else if (val.includes('person') || val.includes('assigned') || val.includes('lead') || val.includes('proposed') || val.includes('in charge')) {
          colToField[col] = 'personAssigned';
        } else if (val.includes('pax') || val.includes('participant') || val.includes('target')) {
          colToField[col] = 'targetParticipants';
        } else if (val.includes('venue') || val.includes('location')) {
          colToField[col] = 'venue';
        }
      }

      // Check subheader row (headerRowIndex + 1) for month/week columns
      if (headerRowIndex + 1 < rawRows.length) {
        const subRow = rawRows[headerRowIndex + 1];
        for (const [col, rawVal] of Object.entries(subRow)) {
          const val = rawVal.toLowerCase().trim();
          if (val.includes('month') && !colToField['month']) {
            colToField[col] = 'month';
          } else if (val.includes('week') && !colToField['week']) {
            colToField[col] = 'week';
          }
        }
      }
    }

    const getCol = (field: string) => Object.keys(colToField).find(k => colToField[k] === field);
    const titleCol = getCol('title') || (colToField['B'] !== 'timeframe' ? 'C' : 'B');
    const monthCol = getCol('month') || 'A';
    const weekCol = getCol('week') || (titleCol !== 'B' ? 'B' : '');
    const lineItemCol = getCol('lineItemBudget') || 'F';
    const budgetCol = getCol('budget') || (colToField['G'] ? 'G' : (colToField['K'] ? 'K' : 'H'));
    const objCol = getCol('strategicObjectives') || 'D';
    const outputCol = getCol('expectedOutput') || 'E';
    const fundCol = getCol('fundSource') || 'H';
    const personCol = getCol('personAssigned') || 'I';

    interface IntermediateAct {
      title: string;
      month: string;
      week: string;
      timeframe: string;
      startDate: string;
      objectives: string;
      output: string;
      fundSource: string;
      personAssigned: string;
      lineItems: { item: string; amount: number }[];
      totalBudget: number;
    }

    const intermediateActs: IntermediateAct[] = [];
    let currentAct: IntermediateAct | null = null;
    let runningMonth = 'January';
    let runningFund = `${detectedOrg}-SEC Fund`;
    let runningPerson = `${detectedOrg} Executive Officers`;

    const startIndex = headerRowIndex !== -1 ? headerRowIndex + 1 : 0;

    for (let i = startIndex; i < rawRows.length; i++) {
      const row = rawRows[i];
      const rowText = Object.values(row).join(' ').toLowerCase();

      // Skip subheader rows (e.g. "Month", "Week")
      if (rowText.includes('month') && rowText.includes('week') && rowText.length < 50) continue;

      // Stop upon encountering summary totals row
      if (
        rowText.includes('total budget allocated') ||
        rowText.includes('total projected budget') ||
        rowText.includes('total budget') ||
        (row['A'] && row['A'].toLowerCase().startsWith('total')) ||
        (row[lineItemCol] && row[lineItemCol].toLowerCase().startsWith('total'))
      ) {
        break;
      }

      const cellTitle = (row[titleCol] || '').trim();
      const cellMonth = (row[monthCol] || '').trim();
      const cellWeek = (weekCol ? (row[weekCol] || '') : '').trim();
      const cellLineItem = (row[lineItemCol] || '').trim();
      const cellBudgetRaw = (row[budgetCol] || row['G'] || row['K'] || row['H'] || '').trim();
      const budgetNum = parseFloat(cellBudgetRaw.replace(/[^0-9.-]/g, '') || '0') || 0;

      // Track month inheritance
      if (cellMonth && isNaN(Number(cellMonth)) && !cellMonth.toLowerCase().startsWith('total')) {
        runningMonth = cellMonth;
      }

      // Check if this row starts a NEW activity
      if (cellTitle) {
        if (currentAct) {
          intermediateActs.push(currentAct);
        }

        const cellFund = (row[fundCol] || '').trim();
        const cellPerson = (row[personCol] || '').trim();
        if (cellFund) runningFund = cellFund;
        if (cellPerson) runningPerson = cellPerson;

        const objVal = (row[objCol] || '').trim();
        const outVal = (row[outputCol] || '').trim();

        // Check for Excel serial date
        const dateParsed = formatExcelSerialDate(cellMonth, detectedYearNum);
        let startDate = dateParsed ? dateParsed.isoDate : '';
        let timeframeStr = dateParsed ? dateParsed.timeframe : '';

        if (!timeframeStr) {
          const weekVal = cellWeek || 'Anytime';
          timeframeStr = cellMonth && cellWeek ? `${cellMonth}, ${cellWeek}` : (cellMonth || `${runningMonth}, ${weekVal}`);
          startDate = parseMonthWeekToDate(cellMonth || runningMonth, cellWeek || weekVal, detectedYearNum);
        }

        currentAct = {
          title: cellTitle,
          month: cellMonth || runningMonth,
          week: cellWeek || 'Anytime',
          timeframe: timeframeStr,
          startDate,
          objectives: objVal,
          output: outVal,
          fundSource: cellFund || runningFund,
          personAssigned: cellPerson || runningPerson,
          lineItems: [],
          totalBudget: 0
        };

        if (cellLineItem || budgetNum > 0) {
          currentAct.lineItems.push({ item: cellLineItem || 'General Logistics', amount: budgetNum });
          currentAct.totalBudget += budgetNum;
        }
      } else if (currentAct) {
        // Sub-row line item belonging to the current activity
        if (cellLineItem || budgetNum > 0) {
          currentAct.lineItems.push({ item: cellLineItem || 'Supplies', amount: budgetNum });
          currentAct.totalBudget += budgetNum;
        }
      }
    }

    if (currentAct) {
      intermediateActs.push(currentAct);
    }

    if (intermediateActs.length === 0) {
      console.warn('[ActionPlanExcel] No readable activity rows extracted, falling back to official presets.');
      return getFallbackSampleBatch(detectedOrg, detectedYearStr);
    }

    const activities: Activity[] = intermediateActs.map((act, idx) => {
      const actId = `ACT-${detectedYearNum}-${detectedOrg}-${String(idx + 1).padStart(3, '0')}`;
      const pillar = detectedOrg === 'CFMS' ? 'Marine Ecology & Sustainable Aquaculture' : 'Empowered Leadership & Student Welfare';

      const lineItemStr = act.lineItems.map(li => {
        if (li.amount > 0) {
          return `${li.item} (₱${li.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })})`;
        }
        return li.item;
      }).join(', ') || 'Logistics, materials, venue coordination, and refreshments.';

      return {
        id: actId,
        title: act.title,
        programActivity: act.title,
        orgId: detectedOrg,
        office: detectedOrg,
        fiscalYear: detectedYearStr,
        timeframe: act.timeframe,
        startDate: act.startDate,
        endDate: act.startDate,
        startTime: '08:00 AM',
        endTime: '05:00 PM',
        venue: 'MSUN Campus Hall / Marine Laboratory',
        description: act.objectives || 'Institutional student initiative approved under annual action plan.',
        strategicObjectives: act.objectives || 'Achieve strategic organizational goals and enhance student welfare in alignment with university standards.',
        expectedOutput: act.output || 'Approved proposal, full student participation, and documented accomplishment report.',
        kpiOutcome: act.output || 'Approved proposal, full student participation, and documented accomplishment report.',
        lineItemBudget: lineItemStr,
        amount: act.totalBudget,
        budget: act.totalBudget,
        totalBudget: act.totalBudget,
        fundSource: act.fundSource,
        personAssigned: act.personAssigned,
        proposedBy: act.personAssigned,
        targetParticipants: 150,
        isActionPlanItem: true,
        source: 'ACTION_PLAN',
        status: 'Pending',
        approvalStage: 'Stage 1: Activity Submission',
        workflowStatus: 'PENDING',
        timeline: getInitialTimelineForActionPlan(detectedOrg),
        strategicPillar: pillar,
        submittedDate: new Date().toISOString().split('T')[0]
      };
    });

    return activities;
  } catch (err) {
    console.error('[ActionPlanExcel] Error parsing .xlsx file:', err);
    throw err;
  }
}

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

/**
 * Official Genuine Activities for CFMS / FIMSSO (matching the official MSUN Google Sheet)
 */
export function getOfficialCfmsActivities(fiscalYear = 'Fiscal Year 2027'): Activity[] {
  const yearDigits = (fiscalYear.match(/\d{4}/) || ['2027'])[0];
  return [
    {
      id: `ACT-${yearDigits}-CFMS-001`,
      title: 'Pagdunggo 2027: 2nd Semester CFMS General Assembly',
      programActivity: 'Pagdunggo 2027: 2nd Semester CFMS General Assembly',
      orgId: 'CFMS',
      office: 'CFMS',
      fiscalYear: fiscalYear,
      timeframe: 'January, 3rd Week',
      startDate: `${yearDigits}-01-21`,
      endDate: `${yearDigits}-01-21`,
      startTime: '08:00 AM',
      endTime: '05:00 PM',
      venue: 'MSUN Campus Hall / Marine Laboratory',
      description: "To present the organization's Accomplishment and Financial Report for the 1st semester of A.Y. 2026-2027, present future planned activities, and hear the students' sentiments.",
      strategicObjectives: "To present the organization's Accomplishment and Financial Report for the 1st semester of A.Y. 2026-2027, present future planned activities, and hear the students' sentiments.",
      expectedOutput: "Financially-transparent organization and fulfilled organization's vision, mission, and objectives.",
      kpiOutcome: "Financially-transparent organization and fulfilled organization's vision, mission, and objectives.",
      lineItemBudget: 'Snacks (₱500.00), Leis (₱500.00), Vellum Board (₱125.00), Bondpaper (₱125.00)',
      amount: 1250,
      totalBudget: 1250,
      budget: 1250,
      fundSource: 'FiMSSO Fund',
      personAssigned: 'FiMSSO Officers',
      proposedBy: 'FiMSSO Officers',
      targetParticipants: 150,
      isActionPlanItem: true,
      source: 'ACTION_PLAN',
      status: 'Pending',
      approvalStage: 'Stage 1: Activity Submission',
      workflowStatus: 'PENDING',
      timeline: getInitialTimelineForActionPlan('CFMS'),
      strategicPillar: 'Marine Ecology & Sustainable Aquaculture',
      submittedDate: new Date().toISOString().split('T')[0]
    },
    {
      id: `ACT-${yearDigits}-CFMS-002`,
      title: 'Aqua-Women: A Tribute to Women in Fisheries and Marine Conservation',
      programActivity: 'Aqua-Women: A Tribute to Women in Fisheries and Marine Conservation',
      orgId: 'CFMS',
      office: 'CFMS',
      fiscalYear: fiscalYear,
      timeframe: 'March, Anytime',
      startDate: `${yearDigits}-03-15`,
      endDate: `${yearDigits}-03-15`,
      startTime: '08:00 AM',
      endTime: '05:00 PM',
      venue: 'MSUN Campus Hall / Marine Laboratory',
      description: "To join with the celebration of International Women's Month and to highlight the important role of women in fisheries and marine conservation.",
      strategicObjectives: "To join with the celebration of International Women's Month and to highlight the important role of women in fisheries and marine conservation.",
      expectedOutput: 'Empowered interviewees and engaged and inspired audience.',
      kpiOutcome: 'Empowered interviewees and engaged and inspired audience.',
      lineItemBudget: 'Snacks (₱1,000.00)',
      amount: 1000,
      totalBudget: 1000,
      budget: 1000,
      fundSource: 'FiMSSO Fund; OSD Funds',
      personAssigned: 'FiMSSO Officers',
      proposedBy: 'FiMSSO Officers',
      targetParticipants: 150,
      isActionPlanItem: true,
      source: 'ACTION_PLAN',
      status: 'Pending',
      approvalStage: 'Stage 1: Activity Submission',
      workflowStatus: 'PENDING',
      timeline: getInitialTimelineForActionPlan('CFMS'),
      strategicPillar: 'Marine Ecology & Sustainable Aquaculture',
      submittedDate: new Date().toISOString().split('T')[0]
    },
    {
      id: `ACT-${yearDigits}-CFMS-003`,
      title: 'AquaFest 2027',
      programActivity: 'AquaFest 2027',
      orgId: 'CFMS',
      office: 'CFMS',
      fiscalYear: fiscalYear,
      timeframe: 'March, 3rd Week',
      startDate: `${yearDigits}-03-21`,
      endDate: `${yearDigits}-03-21`,
      startTime: '08:00 AM',
      endTime: '05:00 PM',
      venue: 'MSUN Campus Hall / Marine Laboratory',
      description: 'To provide an avenue for the students to be engaged in co-curricular and extracurricular activities such as literary, cultural, and sports activities to ensure holistic development.',
      strategicObjectives: 'To provide an avenue for the students to be engaged in co-curricular and extracurricular activities such as literary, cultural, and sports activities to ensure holistic development.',
      expectedOutput: 'Holistically-developed students, especially being immersed in the various activities in relation to their programs.',
      kpiOutcome: 'Holistically-developed students, especially being immersed in the various activities in relation to their programs.',
      lineItemBudget: 'Decorations (₱1,000.00), Tokens; Leis (₱500.00), Snacks (₱1,000.00), Prizes (₱7,500.00), Utilities and Materials (₱3,000.00)',
      amount: 13000,
      totalBudget: 13000,
      budget: 13000,
      fundSource: 'FiMSSO Fund; OSD Funds',
      personAssigned: 'FiMSSO Officers',
      proposedBy: 'FiMSSO Officers',
      targetParticipants: 200,
      isActionPlanItem: true,
      source: 'ACTION_PLAN',
      status: 'Pending',
      approvalStage: 'Stage 1: Activity Submission',
      workflowStatus: 'PENDING',
      timeline: getInitialTimelineForActionPlan('CFMS'),
      strategicPillar: 'Marine Ecology & Sustainable Aquaculture',
      submittedDate: new Date().toISOString().split('T')[0]
    },
    {
      id: `ACT-${yearDigits}-CFMS-004`,
      title: 'BlueTalks: Month of the Ocean Celebration',
      programActivity: 'BlueTalks: Month of the Ocean Celebration',
      orgId: 'CFMS',
      office: 'CFMS',
      fiscalYear: fiscalYear,
      timeframe: 'May, 1st Week',
      startDate: `${yearDigits}-05-08`,
      endDate: `${yearDigits}-05-08`,
      startTime: '08:00 AM',
      endTime: '05:00 PM',
      venue: 'MSUN Campus Hall / Marine Laboratory',
      description: 'To increase awareness and appreciation of ocean conservation, marine biodiversity, and sustainable resources use through educational and environmental activities. To encourage active participation and collaboration in protecting marine and coastal ecosystem.',
      strategicObjectives: 'To increase awareness and appreciation of ocean conservation, marine biodiversity, and sustainable resources use through educational and environmental activities. To encourage active participation and collaboration in protecting marine and coastal ecosystem.',
      expectedOutput: 'Heightened awareness and appreciation of ocean conservation among student participation; formulated student-led coastal action pledge.',
      kpiOutcome: 'Heightened awareness and appreciation of ocean conservation among student participation; formulated student-led coastal action pledge.',
      lineItemBudget: 'Tokens (₱400.00), Bond paper (₱125.00), Snacks (₱4,000.00), Vellum board (₱125.00)',
      amount: 4650,
      totalBudget: 4650,
      budget: 4650,
      fundSource: 'FiMSSO Fund',
      personAssigned: 'MSS Officers',
      proposedBy: 'MSS Officers',
      targetParticipants: 150,
      isActionPlanItem: true,
      source: 'ACTION_PLAN',
      status: 'Pending',
      approvalStage: 'Stage 1: Activity Submission',
      workflowStatus: 'PENDING',
      timeline: getInitialTimelineForActionPlan('CFMS'),
      strategicPillar: 'Marine Ecology & Sustainable Aquaculture',
      submittedDate: new Date().toISOString().split('T')[0]
    },
    {
      id: `ACT-${yearDigits}-CFMS-005`,
      title: 'BSMS Students Pinning Ceremony',
      programActivity: 'BSMS Students Pinning Ceremony',
      orgId: 'CFMS',
      office: 'CFMS',
      fiscalYear: fiscalYear,
      timeframe: 'May, 3rd Week',
      startDate: `${yearDigits}-05-21`,
      endDate: `${yearDigits}-05-21`,
      startTime: '08:00 AM',
      endTime: '05:00 PM',
      venue: 'MSUN Campus Hall / Marine Laboratory',
      description: 'To mark a key milestone in students’ academic journey, fostering growth and the development of stronger professional skills through hands-on experience.',
      strategicObjectives: 'To mark a key milestone in students’ academic journey, fostering growth and the development of stronger professional skills through hands-on experience.',
      expectedOutput: 'Celebrates their promising future contribution to the field and specialized skills they will develop.',
      kpiOutcome: 'Celebrates their promising future contribution to the field and specialized skills they will develop.',
      lineItemBudget: 'Snacks (₱3,000.00), Photography / Nameplates (₱7,000.00)',
      amount: 10000,
      totalBudget: 10000,
      budget: 10000,
      fundSource: "FiMSSO Fund; BSMS Junior Students' Contribution",
      personAssigned: 'MSS Officers; BSMS Junior Students',
      proposedBy: 'MSS Officers; BSMS Junior Students',
      targetParticipants: 120,
      isActionPlanItem: true,
      source: 'ACTION_PLAN',
      status: 'Pending',
      approvalStage: 'Stage 1: Activity Submission',
      workflowStatus: 'PENDING',
      timeline: getInitialTimelineForActionPlan('CFMS'),
      strategicPillar: 'Marine Ecology & Sustainable Aquaculture',
      submittedDate: new Date().toISOString().split('T')[0]
    },
    {
      id: `ACT-${yearDigits}-CFMS-006`,
      title: 'Tribute to Seniors and Parents 2027',
      programActivity: 'Tribute to Seniors and Parents 2027',
      orgId: 'CFMS',
      office: 'CFMS',
      fiscalYear: fiscalYear,
      timeframe: 'July, Anytime',
      startDate: `${yearDigits}-07-15`,
      endDate: `${yearDigits}-07-15`,
      startTime: '08:00 AM',
      endTime: '05:00 PM',
      venue: 'MSUN Campus Hall / Marine Laboratory',
      description: "To uphold the personal values of the students and to strenghten bonds between their parents and their Juniors and to honor the wonderful journey and dedication of the CFMS' graduating class of 2027.",
      strategicObjectives: "To uphold the personal values of the students and to strenghten bonds between their parents and their Juniors and to honor the wonderful journey and dedication of the CFMS' graduating class of 2027.",
      expectedOutput: 'Deepened bonds of students and parents, and developed morally-right personal values.',
      kpiOutcome: 'Deepened bonds of students and parents, and developed morally-right personal values.',
      lineItemBudget: 'Meals and Snacks (₱25,000.00), Tokens (₱2,000.00), Souvenirs (₱13,000.00)',
      amount: 40000,
      totalBudget: 40000,
      budget: 40000,
      fundSource: "FiMSSO Fund; College Fund; CFMS Junior Students' Contribution",
      personAssigned: 'FiMSSO Officers; CFMS Faculty; CFMS Junior Students',
      proposedBy: 'FiMSSO Officers; CFMS Faculty; CFMS Junior Students',
      targetParticipants: 200,
      isActionPlanItem: true,
      source: 'ACTION_PLAN',
      status: 'Pending',
      approvalStage: 'Stage 1: Activity Submission',
      workflowStatus: 'PENDING',
      timeline: getInitialTimelineForActionPlan('CFMS'),
      strategicPillar: 'Marine Ecology & Sustainable Aquaculture',
      submittedDate: new Date().toISOString().split('T')[0]
    },
    {
      id: `ACT-${yearDigits}-CFMS-007`,
      title: 'Pa-SEA-ugda 2027: 1st Semester CFMS General Assembly',
      programActivity: 'Pa-SEA-ugda 2027: 1st Semester CFMS General Assembly',
      orgId: 'CFMS',
      office: 'CFMS',
      fiscalYear: fiscalYear,
      timeframe: 'August, Anytime',
      startDate: `${yearDigits}-08-15`,
      endDate: `${yearDigits}-08-15`,
      startTime: '08:00 AM',
      endTime: '05:00 PM',
      venue: 'MSUN Campus Hall / Marine Laboratory',
      description: 'To convene and discuss the Constitution and By-Laws of FiMSSO and discuss the matters that are relevant to the students of the College of Fisheries and Marine Sciences.',
      strategicObjectives: 'To convene and discuss the Constitution and By-Laws of FiMSSO and discuss the matters that are relevant to the students of the College of Fisheries and Marine Sciences.',
      expectedOutput: 'Implementation of guidelines that are aligned to the welfare of the student body.',
      kpiOutcome: 'Implementation of guidelines that are aligned to the welfare of the student body.',
      lineItemBudget: 'Leis (₱500.00), Snacks (₱500.00), Vellum Board (₱125.00), Bondpaper (₱125.00)',
      amount: 1250,
      totalBudget: 1250,
      budget: 1250,
      fundSource: 'FiMSSO Fund',
      personAssigned: 'FiMSSO Officers',
      proposedBy: 'FiMSSO Officers',
      targetParticipants: 150,
      isActionPlanItem: true,
      source: 'ACTION_PLAN',
      status: 'Pending',
      approvalStage: 'Stage 1: Activity Submission',
      workflowStatus: 'PENDING',
      timeline: getInitialTimelineForActionPlan('CFMS'),
      strategicPillar: 'Marine Ecology & Sustainable Aquaculture',
      submittedDate: new Date().toISOString().split('T')[0]
    },
    {
      id: `ACT-${yearDigits}-CFMS-008`,
      title: 'CFMS Convocation 2027',
      programActivity: 'CFMS Convocation 2027',
      orgId: 'CFMS',
      office: 'CFMS',
      fiscalYear: fiscalYear,
      timeframe: 'October, 1st Week',
      startDate: `${yearDigits}-10-08`,
      endDate: `${yearDigits}-10-08`,
      startTime: '08:00 AM',
      endTime: '05:00 PM',
      venue: 'MSUN Campus Hall / Marine Laboratory',
      description: 'To uplift the students and recognize their hard work in terms of academic activities, and to inspire other students as well to do their best in curricular and co-curricular activities.',
      strategicObjectives: 'To uplift the students and recognize their hard work in terms of academic activities, and to inspire other students as well to do their best in curricular and co-curricular activities.',
      expectedOutput: 'Morally-boosted students and inspired other students in doing their best academically.',
      kpiOutcome: 'Morally-boosted students and inspired other students in doing their best academically.',
      lineItemBudget: 'Snacks (₱500.00), Velum Board (₱125.00), Bond paper (₱125.00)',
      amount: 750,
      totalBudget: 750,
      budget: 750,
      fundSource: 'FiMSSO Fund',
      personAssigned: 'FiMSSO Officers',
      proposedBy: 'FiMSSO Officers',
      targetParticipants: 150,
      isActionPlanItem: true,
      source: 'ACTION_PLAN',
      status: 'Pending',
      approvalStage: 'Stage 1: Activity Submission',
      workflowStatus: 'PENDING',
      timeline: getInitialTimelineForActionPlan('CFMS'),
      strategicPillar: 'Marine Ecology & Sustainable Aquaculture',
      submittedDate: new Date().toISOString().split('T')[0]
    },
    {
      id: `ACT-${yearDigits}-CFMS-009`,
      title: 'Palakasan 2027 Preparations',
      programActivity: 'Palakasan 2027 Preparations',
      orgId: 'CFMS',
      office: 'CFMS',
      fiscalYear: fiscalYear,
      timeframe: 'November, Anytime',
      startDate: `${yearDigits}-11-15`,
      endDate: `${yearDigits}-11-15`,
      startTime: '08:00 AM',
      endTime: '05:00 PM',
      venue: 'MSUN Campus Hall / Marine Laboratory',
      description: 'To holistically prepare and empower CFMS student participants for SSC Palakasan 2026; To conduct a final practice for sports, cultural, special and literary events; To mobilize resources needed for the entire Palakasan 2026.',
      strategicObjectives: 'To holistically prepare and empower CFMS student participants for SSC Palakasan 2026; To conduct a final practice for sports, cultural, special and literary events; To mobilize resources needed for the entire Palakasan 2026.',
      expectedOutput: 'All logistical, material, and human resources required for Palakasan 2026 will be fully mobilized and coordinated, resulting in a well-executed event that showcases CFMS excellence and unity.',
      kpiOutcome: 'All logistical, material, and human resources required for Palakasan 2026 will be fully mobilized and coordinated, resulting in a well-executed event that showcases CFMS excellence and unity.',
      lineItemBudget: 'Snacks (₱5,000.00), Materials for Props (₱5,000.00), Utilities and Other Materials (₱2,000.00)',
      amount: 12000,
      totalBudget: 12000,
      budget: 12000,
      fundSource: 'FiMSSO Fund',
      personAssigned: 'FiMSSO Officers',
      proposedBy: 'FiMSSO Officers',
      targetParticipants: 200,
      isActionPlanItem: true,
      source: 'ACTION_PLAN',
      status: 'Pending',
      approvalStage: 'Stage 1: Activity Submission',
      workflowStatus: 'PENDING',
      timeline: getInitialTimelineForActionPlan('CFMS'),
      strategicPillar: 'Marine Ecology & Sustainable Aquaculture',
      submittedDate: new Date().toISOString().split('T')[0]
    },
    {
      id: `ACT-${yearDigits}-CFMS-010`,
      title: 'Aquatic Synergy: In Celebration of World Fisheries Day',
      programActivity: 'Aquatic Synergy: In Celebration of World Fisheries Day',
      orgId: 'CFMS',
      office: 'CFMS',
      fiscalYear: fiscalYear,
      timeframe: 'November, 3rd Week',
      startDate: `${yearDigits}-11-21`,
      endDate: `${yearDigits}-11-21`,
      startTime: '08:00 AM',
      endTime: '05:00 PM',
      venue: 'MSUN Campus Hall / Marine Laboratory',
      description: 'To foster environmental stewardship and fisheries sustainability by mobilizing community participation in coastal clean-up efforts and promoting knowledge exchange through a symposium, in celebration of World Fisheries, thereby strengthening awareness, collaboration, and commitment to marine conservation.',
      strategicObjectives: 'To foster environmental stewardship and fisheries sustainability by mobilizing community participation in coastal clean-up efforts and promoting knowledge exchange through a symposium, in celebration of World Fisheries, thereby strengthening awareness, collaboration, and commitment to marine conservation.',
      expectedOutput: 'Cleaner coastal areas through active community participation in the clean-up. Increased awareness and collaboration on fisheries sustainability and marine conservation from the symposium.',
      kpiOutcome: 'Cleaner coastal areas through active community participation in the clean-up. Increased awareness and collaboration on fisheries sustainability and marine conservation from the symposium.',
      lineItemBudget: 'Snacks (₱4,000.00), Tokens for the speakers (₱500.00), Decorations (₱500.00), Bond paper (₱125.00), Vellum board (₱125.00)',
      amount: 5250,
      totalBudget: 5250,
      budget: 5250,
      fundSource: 'FiMSSO Fund',
      personAssigned: 'FiSTechSS Officers',
      proposedBy: 'FiSTechSS Officers',
      targetParticipants: 180,
      isActionPlanItem: true,
      source: 'ACTION_PLAN',
      status: 'Pending',
      approvalStage: 'Stage 1: Activity Submission',
      workflowStatus: 'PENDING',
      timeline: getInitialTimelineForActionPlan('CFMS'),
      strategicPillar: 'Marine Ecology & Sustainable Aquaculture',
      submittedDate: new Date().toISOString().split('T')[0]
    }
  ];
}

function getFallbackSampleBatch(defaultOrgId: OrgId | string = 'CELS', fiscalYear = 'Fiscal Year 2026'): Activity[] {
  const targetOrg = normalizeOrgId(defaultOrgId);
  if (targetOrg === 'CFMS' || targetOrg === 'CMFS' || targetOrg === 'FIMSSO') {
    return getOfficialCfmsActivities(fiscalYear);
  }
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
