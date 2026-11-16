import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import { Activity, OrgId, ActivityApprovalStatus } from '../types';
import { ORGANIZATIONS } from '../data/initialData';
import { canonicalOrgId } from './organizationUtils';
import { isActionPlanActivityApproved } from './activityVisibility';
import { getMonthNumberFromLabel, resolveActivityDates } from './activityDate';
import { formatLineItemBudgetText } from './budgetFormat';

function escapeXml(unsafe: string | number | null | undefined): string {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function sanitizePdfText(text: unknown): string {
  return String(text ?? '')
    .replace(/₱/g, 'PHP ')
    .replace(/×/g, 'x')
    .replace(/[–—]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
    .trim();
}

function formatPdfCurrency(val?: number): string {
  return `PHP ${(val || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function formatCurrency(val?: number): string {
  return `₱${(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export type ActionPlanReportType = 'proposed' | 'approved' | 'deferred_rejected' | 'historical' | 'calendar';

export interface ActionPlanExportOptions {
  reportType: ActionPlanReportType;
  orgName: string;
  orgId: string;
  fiscalYear: string;
  activities: Activity[];
}

/**
 * Resolves the official institutional header for an organization.
 */
export function getOfficialOrgHeader(orgIdOrName?: string): string {
  if (!orgIdOrName) return 'OVCSAS|OSD: ACCREDITED STUDENT ORGANIZATIONS';
  const upper = orgIdOrName.trim().toUpperCase();
  if (upper === 'ALL' || upper === 'ALL COUNCILS' || upper.includes('CONSOLIDATED')) {
    return 'OVCSAS|OSD: CONSOLIDATED ACCREDITED STUDENT ORGANIZATIONS';
  }
  if (upper.includes('SSC') || upper.includes('SUPREME')) {
    return 'OVCSAS|OSD: SUPREME STUDENT COUNCIL (SSC)';
  }
  if (upper.includes('CBIT')) {
    return 'OVCSAS|OSD: COLLEGE OF BUSINESS AND INFORMATION TECHNOLOGY STUDENT EXECUTIVE COUNCIL (CBIT SEC)';
  }
  if (upper.includes('CELS') || upper.includes('ELSSA')) {
    return 'OVCSAS|OSD: ENVIRONMENT AND LIFE SCIENCES STUDENT ALLIANCE (ELSSA)';
  }
  if (upper.includes('CESS')) {
    return 'OVCSAS|OSD: COLLEGE OF EDUCATION AND SOCIAL SCIENCES STUDENT ORGANIZATION (CESS SO)';
  }
  if (upper.includes('CFMS') || upper.includes('CMFS') || upper.includes('FIMSSO')) {
    return 'OVCSAS|OSD: FISHERIES AND MARINE SCIENCE STUDENT ORGANIZATION (FIMSSO)';
  }
  if (upper.includes('KAABAG')) {
    return 'OVCSAS|OSD: KAABAG STUDENT PEER FACILITATORS (KAABAG)';
  }
  if (upper.includes('SENSSO') || upper.includes('SENSO') || upper.includes('SENIOR')) {
    return "OVCSAS|OSD: SENIOR STUDENTS' SOCIETY (SenSSo)";
  }
  return `OVCSAS|OSD: ${orgIdOrName.toUpperCase()}`;
}

function sortActivitiesForFiscalPlan(list: Activity[]): Activity[] {
  return [...list].sort((a, b) => {
    const mA = getMonthNumberFromLabel(a.timeframeMonth) ?? (Number(resolveActivityDates(a).startDate.slice(5, 7)) || 99);
    const mB = getMonthNumberFromLabel(b.timeframeMonth) ?? (Number(resolveActivityDates(b).startDate.slice(5, 7)) || 99);
    if (mA !== mB) return mA - mB;
    const dA = resolveActivityDates(a).startDate;
    const dB = resolveActivityDates(b).startDate;
    if (dA !== dB) return dA.localeCompare(dB);
    return (a.orgId || '').localeCompare(b.orgId || '') || (a.title || '').localeCompare(b.title || '');
  });
}

export function selectReportActivities(activities: Activity[], reportType: ActionPlanReportType): {
  exportActivities: Activity[];
  sheetTitle: string;
  reportSubHeader: string;
} {
  if (reportType === 'calendar') {
    return {
      exportActivities: sortActivitiesForFiscalPlan(activities.filter(isActionPlanActivityApproved)),
      sheetTitle: 'Calendar Fiscal Plan',
      reportSubHeader: 'CONSOLIDATED APPROVED ACTION PLAN (CALENDAR)'
    };
  }
  if (reportType === 'deferred_rejected') {
    return {
      exportActivities: sortActivitiesForFiscalPlan(
        activities.filter(
          a => a.approvalStatus === 'Deferred' || a.approvalStatus === 'Rejected' || a.status === 'DEFERRED' || a.status === 'Rejected'
        )
      ),
      sheetTitle: 'Deferred & Rejected',
      reportSubHeader: 'DEFERRED AND REJECTED ACTIVITIES REPORT'
    };
  }
  // Export only approved activities — never draft proposals or rejected items
  const approvedOnly = sortActivitiesForFiscalPlan(activities.filter(isActionPlanActivityApproved));
  if (reportType === 'historical') {
    return {
      exportActivities: approvedOnly,
      sheetTitle: 'Historical Approved Plan',
      reportSubHeader: 'HISTORICAL APPROVED ACTION PLAN RECORDS'
    };
  }
  return {
    exportActivities: approvedOnly,
    sheetTitle: 'Approved Action Plan',
    reportSubHeader: 'OFFICIAL APPROVED ACTION PLAN'
  };
}

/**
 * Generates and downloads an authentic Microsoft Excel (.xlsx) spreadsheet
 * reproducing the MSUN Action Plan format with dark maroon/red headers (#800000),
 * merged cells, text wrapping, borders, and Philippine peso formatting.
 */
export async function exportActionPlanToExcel(options: ActionPlanExportOptions): Promise<void> {
  const { reportType, orgName, orgId, fiscalYear } = options;

  const { exportActivities, sheetTitle, reportSubHeader } = selectReportActivities(options.activities, reportType);

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
    <sheet name="${escapeXml(sheetTitle)}" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

  // Authentic dark maroon headers #800000, soft peach subheaders #FCE5CD, bold totals #FFF2CC
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="1">
    <numFmt numFmtId="164" formatCode="&quot;₱&quot;#,##0.00"/>
  </numFmts>
  <fonts count="6">
    <font><name val="Arial"/><sz val="10"/><color rgb="FF000000"/></font>
    <font><b/><name val="Arial"/><sz val="11"/><color rgb="FF000000"/></font>
    <font><b/><name val="Arial"/><sz val="12"/><color rgb="FF000000"/></font>
    <font><b/><name val="Arial"/><sz val="10"/><color rgb="FFFFFFFF"/></font>
    <font><b/><name val="Arial"/><sz val="10"/><color rgb="FF800000"/></font>
    <font><i/><name val="Arial"/><sz val="9"/><color rgb="FF64748B"/></font>
  </fonts>
  <fills count="6">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF800000"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFCE5CD"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFF2CC"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/></patternFill></fill>
  </fills>
  <borders count="3">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFCBD5E1"/></left>
      <right style="thin"><color rgb="FFCBD5E1"/></right>
      <top style="thin"><color rgb="FFCBD5E1"/></top>
      <bottom style="thin"><color rgb="FFCBD5E1"/></bottom>
    </border>
    <border>
      <left style="medium"><color rgb="FF800000"/></left>
      <right style="medium"><color rgb="FF800000"/></right>
      <top style="medium"><color rgb="FF800000"/></top>
      <bottom style="double"><color rgb="FF800000"/></bottom>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="11">
    <!-- 0: Standard Left Data -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="top" wrapText="1"/></xf>
    <!-- 1: Title Header (Bold 12pt Center) -->
    <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <!-- 2: Sub-Title Header (Bold 11pt Center) -->
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <!-- 3: Maroon Main Header (Bold 10pt White Center) -->
    <xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <!-- 4: Peach Sub-Header (Bold 10pt Center) -->
    <xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <!-- 5: Standard Center Data -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top" wrapText="1"/></xf>
    <!-- 6: Currency Right Data -->
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="top"/></xf>
    <!-- 7: Total Projected Budget Label Cell -->
    <xf numFmtId="0" fontId="4" fillId="4" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center" wrapText="1"/></xf>
    <!-- 8: Total Projected Budget Amount Cell -->
    <xf numFmtId="164" fontId="4" fillId="4" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <!-- 9: Total Footer Right Info -->
    <xf numFmtId="0" fontId="4" fillId="4" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <!-- 10: Maroon Header Filler -->
    <xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

  const yearNum = (fiscalYear.match(/\d{4}/) || ['2027'])[0];
  const colLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
  const fullOrgHeader = getOfficialOrgHeader(orgName || orgId);

  let rowXmls = '';

  // Row 1: PLAN OF ACTIVITIES
  rowXmls += `<row r="1" ht="24" customHeight="1">
    <c r="A1" t="inlineStr" s="1"><is><t>PLAN OF ACTIVITIES</t></is></c>
    ${colLetters.slice(1).map(c => `<c r="${c}1" s="1"/>`).join('')}
  </row>`;

  // Row 2: Organization Name
  rowXmls += `<row r="2" ht="22" customHeight="1">
    <c r="A2" t="inlineStr" s="1"><is><t>${escapeXml(fullOrgHeader)}</t></is></c>
    ${colLetters.slice(1).map(c => `<c r="${c}2" s="1"/>`).join('')}
  </row>`;

  // Row 3: Period Covered & Report Type
  rowXmls += `<row r="3" ht="20" customHeight="1">
    <c r="A3" t="inlineStr" s="2"><is><t>PERIOD COVERED: JANUARY - DECEMBER ${escapeXml(yearNum)} | ${escapeXml(reportSubHeader)}</t></is></c>
    ${colLetters.slice(1).map(c => `<c r="${c}3" s="2"/>`).join('')}
  </row>`;

  // Row 4: Main Maroon Headers (#800000)
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
    <c r="J4" t="inlineStr" s="3"><is><t>Line Item</t></is></c>
    <c r="K4" t="inlineStr" s="3"><is><t>Budget Requirement</t></is></c>
    <c r="L4" t="inlineStr" s="3"><is><t>Fund Source</t></is></c>
    <c r="M4" t="inlineStr" s="3"><is><t>Person Assigned</t></is></c>
  </row>`;

  // Row 5: Sub-headers (Month & Week in soft peach, others maroon continuation)
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
  exportActivities.forEach((act, idx) => {
    const rNum = 6 + idx;
    const budgetVal = Number(act.budget || act.totalBudget || act.amount || 0);
    totalBudget += budgetVal;

    const month = act.timeframeMonth || (act.startDate ? new Date(act.startDate).toLocaleString('en-US', { month: 'long' }) : 'Annual');
    const week = act.timeframeWeek || '1st Week';
    const title = act.title || act.programActivity || 'Proposed Activity';
    const obj = act.strategicObjectives || act.description || '';
    const output = act.expectedOutput || '';
    const office = act.office || act.orgId || '';
    const lineItem = formatLineItemBudgetText(act.budgetLineItems, act.lineItemBudget) || 'Operating and logistical requirements';
    const fund = act.fundSource || `${act.orgId}-SEC Fund`;
    const person = act.personAssigned || act.proposedBy || 'Officers';

    mergeList.push(`C${rNum}:D${rNum}`);
    mergeList.push(`E${rNum}:G${rNum}`);

    rowXmls += `<row r="${rNum}" ht="28" customHeight="1">
      <c r="A${rNum}" t="inlineStr" s="5"><is><t>${escapeXml(month)}</t></is></c>
      <c r="B${rNum}" t="inlineStr" s="5"><is><t>${escapeXml(week)}</t></is></c>
      <c r="C${rNum}" t="inlineStr" s="0"><is><t>${escapeXml(title)}</t></is></c>
      <c r="D${rNum}" s="0"/>
      <c r="E${rNum}" t="inlineStr" s="0"><is><t>${escapeXml(obj)}</t></is></c>
      <c r="F${rNum}" s="0"/>
      <c r="G${rNum}" s="0"/>
      <c r="H${rNum}" t="inlineStr" s="0"><is><t>${escapeXml(output)}</t></is></c>
      <c r="I${rNum}" t="inlineStr" s="5"><is><t>${escapeXml(office)}</t></is></c>
      <c r="J${rNum}" t="inlineStr" s="0"><is><t>${escapeXml(lineItem)}</t></is></c>
      <c r="K${rNum}" s="6"><v>${budgetVal}</v></c>
      <c r="L${rNum}" t="inlineStr" s="5"><is><t>${escapeXml(fund)}</t></is></c>
      <c r="M${rNum}" t="inlineStr" s="5"><is><t>${escapeXml(person)}</t></is></c>
    </row>`;
  });

  const totalRowNum = 6 + exportActivities.length;
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
    <col min="1" max="1" width="14" customWidth="1"/>
    <col min="2" max="2" width="14" customWidth="1"/>
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

  const cleanFy = fiscalYear.replace(/\s+/g, '_');
  const filename = `MSUN_${reportType.toUpperCase()}_Action_Plan_${orgId}_${cleanFy}.xlsx`;
  triggerBlobDownload(blob, filename);
}

interface PdfColumnDef {
  key: string;
  label: string;
  width: number;
  align: 'left' | 'center' | 'right';
}

const BASE_PDF_COLUMNS: PdfColumnDef[] = [
  { key: 'month', label: 'Month', width: 22, align: 'center' },
  { key: 'week', label: 'Week', width: 22, align: 'center' },
  { key: 'title', label: 'Programs and Activities', width: 46, align: 'left' },
  { key: 'objectives', label: 'Strategic Objectives', width: 54, align: 'left' },
  { key: 'output', label: 'Expected Output', width: 46, align: 'left' },
  { key: 'office', label: 'Office', width: 18, align: 'center' },
  { key: 'lineItem', label: 'Line Item', width: 55, align: 'left' },
  { key: 'budget', label: 'Budget Requirement', width: 28, align: 'right' },
  { key: 'fund', label: 'Fund Source', width: 24, align: 'center' },
  { key: 'person', label: 'Person Assigned', width: 20, align: 'center' }
];

function buildPdfRowValues(act: Activity, includeStatus: boolean): Record<string, string> {
  const budgetVal = Number(act.budget || act.totalBudget || act.amount || 0);
  const resolvedStart = resolveActivityDates(act).startDate;
  const monthIdx = Number(resolvedStart.slice(5, 7));
  const fallbackMonth = monthIdx >= 1 && monthIdx <= 12
    ? new Date(2027, monthIdx - 1, 1).toLocaleString('en-US', { month: 'long' })
    : 'Annual';

  const lineItem = formatLineItemBudgetText(act.budgetLineItems, act.lineItemBudget) || 'Operating and logistical requirements';

  const values: Record<string, string> = {
    month: sanitizePdfText(act.timeframeMonth || fallbackMonth),
    week: sanitizePdfText(act.timeframeWeek || '1st Week'),
    title: sanitizePdfText(act.title || act.programActivity || 'Proposed Activity'),
    objectives: sanitizePdfText(act.strategicObjectives || act.description || ''),
    output: sanitizePdfText(act.expectedOutput || ''),
    office: sanitizePdfText(act.office || act.orgId || ''),
    lineItem: sanitizePdfText(lineItem),
    budget: formatPdfCurrency(budgetVal),
    fund: sanitizePdfText(act.fundSource || `${act.orgId}-SEC Fund`),
    person: sanitizePdfText(act.personAssigned || act.proposedBy || 'Officers')
  };

  if (includeStatus) {
    let statusText = act.approvalStatus || act.status || 'Pending';
    if (
      act.status === 'Approved' ||
      act.status === 'APPROVED' ||
      act.status === 'COMPLETED' ||
      act.approvalStatus === 'Fully Approved' ||
      act.workflowStatus === 'COMPLETED'
    ) {
      statusText = 'Approved';
    } else if (isActionPlanActivityApproved(act)) {
      statusText = 'Plan Approved';
    }
    values.status = sanitizePdfText(statusText);
  }

  return values;
}

/**
 * Generates and downloads an official Legal Landscape PDF (.pdf)
 * of the MSUN Fiscal Year Plan matching the institutional layout.
 */
export async function exportActionPlanToPdf(options: ActionPlanExportOptions): Promise<void> {
  const { reportType, orgName, orgId, fiscalYear } = options;
  const { exportActivities, reportSubHeader } = selectReportActivities(options.activities, reportType);

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'legal'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 10;
  const bottomLimit = pageHeight - 16;
  const yearNum = (fiscalYear.match(/\d{4}/) || ['2027'])[0];
  const fullOrgHeader = sanitizePdfText(getOfficialOrgHeader(orgName || orgId));
  const includeStatus = reportType === 'deferred_rejected' || reportType === 'proposed';

  const columns: PdfColumnDef[] = includeStatus
    ? [
        ...BASE_PDF_COLUMNS.map(col =>
          col.key === 'objectives'
            ? { ...col, width: 42 }
            : col.key === 'lineItem'
            ? { ...col, width: 43 }
            : col
        ),
        { key: 'status', label: 'Status & Remarks', width: 24, align: 'center' }
      ]
    : BASE_PDF_COLUMNS;

  const totalTableWidth = columns.reduce((s, c) => s + c.width, 0);

  const drawDocumentBanner = (startY: number): number => {
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('PLAN OF ACTIVITIES', pageWidth / 2, startY, { align: 'center' });

    doc.setFontSize(10);
    doc.text(fullOrgHeader, pageWidth / 2, startY + 5.5, { align: 'center' });

    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(
      sanitizePdfText(`PERIOD COVERED: JANUARY - DECEMBER ${yearNum} | ${reportSubHeader}`),
      pageWidth / 2,
      startY + 10.5,
      { align: 'center' }
    );
    return startY + 14;
  };

  const drawTableHeader = (startY: number): number => {
    const topH = 7;
    const subH = 6;
    let x = marginX;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setDrawColor(107, 0, 0);
    doc.setLineWidth(0.2);

    // Top-left grouped Timeframe header over Month + Week
    const tfWidth = columns[0].width + columns[1].width;
    doc.setFillColor(128, 0, 0);
    doc.rect(x, startY, tfWidth, topH, 'FD');
    doc.setTextColor(255, 255, 255);
    doc.text('Timeframe', x + tfWidth / 2, startY + 4.5, { align: 'center' });

    // Month & Week sub-headers in peach #FCE5CD (re-apply fillColor before each rect because text resets PDF rg)
    doc.setDrawColor(107, 0, 0);
    doc.setFillColor(252, 229, 205);
    doc.rect(x, startY + topH, columns[0].width, subH, 'FD');
    doc.setTextColor(30, 41, 59);
    doc.text(columns[0].label, x + columns[0].width / 2, startY + topH + 4.2, { align: 'center' });

    doc.setDrawColor(107, 0, 0);
    doc.setFillColor(252, 229, 205);
    doc.rect(x + columns[0].width, startY + topH, columns[1].width, subH, 'FD');
    doc.setTextColor(30, 41, 59);
    doc.text(columns[1].label, x + columns[0].width + columns[1].width / 2, startY + topH + 4.2, { align: 'center' });
    x += tfWidth;

    // Remaining columns span full topH + subH header height in maroon
    const fullHeaderH = topH + subH;
    for (let i = 2; i < columns.length; i++) {
      const col = columns[i];
      doc.setFillColor(128, 0, 0);
      doc.rect(x, startY, col.width, fullHeaderH, 'FD');
      doc.setTextColor(255, 255, 255);
      const wrapped = doc.splitTextToSize(col.label, col.width - 2);
      const lineSpacing = 3.2;
      const textStartY = startY + (fullHeaderH - wrapped.length * lineSpacing) / 2 + 2.4;
      wrapped.forEach((line: string, lineIdx: number) => {
        doc.text(line, x + col.width / 2, textStartY + lineIdx * lineSpacing, { align: 'center' });
      });
      x += col.width;
    }

    return startY + fullHeaderH;
  };

  let cursorY = drawDocumentBanner(12);
  cursorY = drawTableHeader(cursorY);

  let totalBudget = 0;

  if (exportActivities.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.setDrawColor(203, 213, 225);
    doc.rect(marginX, cursorY, totalTableWidth, 12, 'S');
    doc.text('No approved activities recorded for this period.', pageWidth / 2, cursorY + 7.5, { align: 'center' });
    cursorY += 12;
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    const lineHeight = 3.3;

    for (const act of exportActivities) {
      totalBudget += Number(act.budget || act.totalBudget || act.amount || 0);
      const rowValues = buildPdfRowValues(act, includeStatus);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);

      const cellLines = columns.map(col => {
        const raw = rowValues[col.key] || '';
        const wrapped = doc.splitTextToSize(raw || '-', col.width - 3);
        return Array.isArray(wrapped) ? wrapped : [String(wrapped)];
      });

      const maxLines = Math.max(1, ...cellLines.map(lines => lines.length));
      const rowHeight = Math.max(8, maxLines * lineHeight + 3);

      if (cursorY + rowHeight > bottomLimit) {
        doc.addPage('legal', 'landscape');
        cursorY = drawTableHeader(12);
      }

      let x = marginX;
      doc.setDrawColor(203, 213, 225);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);

      for (let cIdx = 0; cIdx < columns.length; cIdx++) {
        const col = columns[cIdx];
        const lines = cellLines[cIdx];
        doc.rect(x, cursorY, col.width, rowHeight, 'S');

        lines.forEach((line: string, lIdx: number) => {
          const textY = cursorY + 3.8 + lIdx * lineHeight;
          if (col.align === 'center') {
            doc.text(line, x + col.width / 2, textY, { align: 'center' });
          } else if (col.align === 'right') {
            doc.text(line, x + col.width - 1.5, textY, { align: 'right' });
          } else {
            doc.text(line, x + 1.5, textY, { align: 'left' });
          }
        });

        x += col.width;
      }

      cursorY += rowHeight;
    }
  }

  // Footer Total Row
  const footerHeight = 9;
  if (cursorY + footerHeight > bottomLimit) {
    doc.addPage('legal', 'landscape');
    cursorY = drawTableHeader(12);
  }

  const budgetColIdx = columns.findIndex(c => c.key === 'budget');
  const leftSummaryWidth = columns.slice(0, budgetColIdx).reduce((s, c) => s + c.width, 0);
  const budgetColWidth = columns[budgetColIdx].width;
  const rightInfoWidth = columns.slice(budgetColIdx + 1).reduce((s, c) => s + c.width, 0);

  // Re-apply fillColor before each rect(..., 'FD') so previous doc.text() fill state cannot override background color
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);

  doc.setDrawColor(128, 0, 0);
  doc.setFillColor(255, 242, 204);
  doc.rect(marginX, cursorY, leftSummaryWidth, footerHeight, 'FD');
  doc.setTextColor(128, 0, 0);
  doc.text(
    'Total Projected Budget (excluding office supplies, allowances and wages):',
    marginX + leftSummaryWidth - 2,
    cursorY + 5.8,
    { align: 'right' }
  );

  doc.setDrawColor(128, 0, 0);
  doc.setFillColor(255, 242, 204);
  doc.rect(marginX + leftSummaryWidth, cursorY, budgetColWidth, footerHeight, 'FD');
  doc.setTextColor(128, 0, 0);
  doc.text(
    formatPdfCurrency(totalBudget),
    marginX + leftSummaryWidth + budgetColWidth - 1.5,
    cursorY + 5.8,
    { align: 'right' }
  );

  doc.setDrawColor(128, 0, 0);
  doc.setFillColor(255, 242, 204);
  doc.rect(marginX + leftSummaryWidth + budgetColWidth, cursorY, rightInfoWidth, footerHeight, 'FD');
  doc.setTextColor(128, 0, 0);
  doc.text(
    'Organizational & OSD Funds',
    marginX + leftSummaryWidth + budgetColWidth + rightInfoWidth / 2,
    cursorY + 5.8,
    { align: 'center' }
  );

  // Page numbering across all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `MSU Naawan Action Plan Monitoring and Management System (${fiscalYear})`,
      marginX,
      pageHeight - 6
    );
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - marginX, pageHeight - 6, { align: 'right' });
  }

  const cleanFy = fiscalYear.replace(/\s+/g, '_');
  const filename =
    reportType === 'calendar'
      ? `MSUN_Calendar_Fiscal_Year_Plan_${orgId}_${cleanFy}.pdf`
      : `MSUN_${reportType.toUpperCase()}_Action_Plan_${orgId}_${cleanFy}.pdf`;
  const pdfBlob = doc.output('blob');
  triggerBlobDownload(pdfBlob, filename);
}

/**
 * Generates an official printable / PDF view for the Action Plan
 * closely matching the MSUN institutional template and print layout.
 */
export function printActionPlanReport(options: ActionPlanExportOptions): void {
  const { reportType, orgName, orgId, fiscalYear } = options;

  const { exportActivities, reportSubHeader } = selectReportActivities(options.activities, reportType);

  const yearNum = (fiscalYear.match(/\d{4}/) || ['2027'])[0];
  const fullOrgHeader = getOfficialOrgHeader(orgName || orgId);
  const totalBudget = exportActivities.reduce((sum, a) => sum + Number(a.budget || a.totalBudget || a.amount || 0), 0);

  const tableRowsHtml = exportActivities.map((act, idx) => {
    const month = act.timeframeMonth || (act.startDate ? new Date(act.startDate).toLocaleString('en-US', { month: 'long' }) : 'Annual');
    const week = act.timeframeWeek || '1st Week';
    const title = act.title || act.programActivity || 'Activity';
    const obj = act.strategicObjectives || act.description || '';
    const output = act.expectedOutput || '';
    const office = act.office || act.orgId || '';
    const lineItem = formatLineItemBudgetText(act.budgetLineItems, act.lineItemBudget) || 'Operating budget';
    const budget = formatCurrency(Number(act.budget || act.totalBudget || act.amount || 0));
    const fund = act.fundSource || `${act.orgId}-SEC Fund`;
    const person = act.personAssigned || act.proposedBy || 'Officers';

    const statusBadge = act.approvalStatus === 'Fully Approved'
      ? '<span style="color:#047857; font-weight:bold;">Fully Approved</span>'
      : act.approvalStatus === 'Deferred'
      ? `<span style="color:#b45309; font-weight:bold;">Deferred</span><br><small style="color:#78350f;"><em>${act.deferredRemarks || act.deferReason || ''}</em></small>`
      : act.approvalStatus === 'Rejected'
      ? `<span style="color:#b91c1c; font-weight:bold;">Rejected</span><br><small style="color:#991b1b;"><em>${act.rejectionRemarks || ''}</em></small>`
      : '<span style="color:#1d4ed8; font-weight:bold;">Pending Review</span>';

    return `
      <tr>
        <td style="text-align:center; vertical-align:top; border:1px solid #cbd5e1; padding:6px;">${month}</td>
        <td style="text-align:center; vertical-align:top; border:1px solid #cbd5e1; padding:6px;">${week}</td>
        <td style="vertical-align:top; border:1px solid #cbd5e1; padding:6px; font-weight:bold;">${title}</td>
        <td style="vertical-align:top; border:1px solid #cbd5e1; padding:6px; font-size:10px; line-height:1.3;">${obj}</td>
        <td style="vertical-align:top; border:1px solid #cbd5e1; padding:6px; font-size:10px; line-height:1.3;">${output}</td>
        <td style="text-align:center; vertical-align:top; border:1px solid #cbd5e1; padding:6px;">${office}</td>
        <td style="vertical-align:top; border:1px solid #cbd5e1; padding:6px; font-size:10px;">${lineItem}</td>
        <td style="text-align:right; vertical-align:top; border:1px solid #cbd5e1; padding:6px; font-weight:bold;">${budget}</td>
        <td style="text-align:center; vertical-align:top; border:1px solid #cbd5e1; padding:6px;">${fund}</td>
        <td style="text-align:center; vertical-align:top; border:1px solid #cbd5e1; padding:6px;">${person}</td>
        ${reportType !== 'approved' ? `<td style="vertical-align:top; border:1px solid #cbd5e1; padding:6px; font-size:10px;">${statusBadge}</td>` : ''}
      </tr>
    `;
  }).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>MSUN Action Plan - ${escapeXml(reportSubHeader)}</title>
  <style>
    @page {
      size: legal landscape;
      margin: 12mm 10mm 12mm 10mm;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      color: #0f172a;
      margin: 0;
      padding: 10px;
      background: #fff;
    }
    .header-box {
      text-align: center;
      margin-bottom: 12px;
    }
    .header-title {
      font-size: 14px;
      font-weight: 900;
      letter-spacing: 0.5px;
      margin: 0 0 2px 0;
      text-transform: uppercase;
    }
    .header-org {
      font-size: 12px;
      font-weight: 800;
      margin: 0 0 2px 0;
      text-transform: uppercase;
    }
    .header-period {
      font-size: 10px;
      font-weight: 700;
      color: #475569;
      margin: 0;
      letter-spacing: 0.5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      page-break-inside: auto;
    }
    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
    th.maroon {
      background-color: #800000;
      color: #ffffff;
      font-weight: bold;
      text-align: center;
      vertical-align: middle;
      border: 1px solid #6b0000;
      padding: 6px 4px;
      font-size: 10px;
    }
    th.peach {
      background-color: #FCE5CD;
      color: #1e293b;
      font-weight: bold;
      text-align: center;
      vertical-align: middle;
      border: 1px solid #cbd5e1;
      padding: 4px;
      font-size: 9px;
    }
    .footer-row td {
      background-color: #FFF2CC;
      font-weight: bold;
      border: 1px solid #800000;
      padding: 8px;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
  <script>
    window.addEventListener('load', function() {
      setTimeout(function() { window.print(); }, 400);
    });
  </script>
</head>
<body>
  <div class="header-box">
    <div class="header-title">PLAN OF ACTIVITIES</div>
    <div class="header-org">${escapeXml(fullOrgHeader)}</div>
    <div class="header-period">PERIOD COVERED: JANUARY - DECEMBER ${escapeXml(yearNum)} | ${escapeXml(reportSubHeader)}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th colspan="2" class="maroon">Timeframe</th>
        <th rowspan="2" class="maroon" style="width:16%;">Programs and Activities</th>
        <th rowspan="2" class="maroon" style="width:18%;">Strategic Objectives</th>
        <th rowspan="2" class="maroon" style="width:15%;">Expected Output</th>
        <th rowspan="2" class="maroon" style="width:8%;">Office</th>
        <th rowspan="2" class="maroon" style="width:18%;">Line Item</th>
        <th rowspan="2" class="maroon" style="width:11%;">Budget Requirement</th>
        <th rowspan="2" class="maroon" style="width:8%;">Fund Source</th>
        <th rowspan="2" class="maroon" style="width:9%;">Person Assigned</th>
        ${reportType !== 'approved' ? '<th rowspan="2" class="maroon" style="width:10%;">Status &amp; Remarks</th>' : ''}
      </tr>
      <tr>
        <th class="peach" style="width:7%;">Month</th>
        <th class="peach" style="width:6%;">Week</th>
      </tr>
    </thead>
    <tbody>
      ${tableRowsHtml || `<tr><td colspan="${reportType !== 'approved' ? 11 : 10}" style="text-align:center; padding:20px; font-style:italic; color:#64748b;">No activities recorded for this section.</td></tr>`}
    </tbody>
    <tfoot>
      <tr class="footer-row">
        <td colspan="7" style="text-align:right; font-size:10px; color:#800000;">
          Total Projected Budget (excluding office supplies, allowances and wages):
        </td>
        <td style="text-align:right; font-size:11px; color:#800000;">
          ${formatCurrency(totalBudget)}
        </td>
        <td colspan="${reportType !== 'approved' ? 3 : 2}" style="text-align:center; font-size:10px; color:#800000;">
          Organizational &amp; OSD Funds
        </td>
      </tr>
    </tfoot>
  </table>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank', 'width=1100,height=800');
  if (!win) {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      setTimeout(() => {
        try { iframe.contentWindow?.print(); } catch {}
        setTimeout(() => {
          if (document.body.contains(iframe)) document.body.removeChild(iframe);
          URL.revokeObjectURL(url);
        }, 30000);
      }, 500);
    }
  }
}

