import JSZip from 'jszip';
import { Activity, OrgId, ActivityApprovalStatus } from '../types';
import { ORGANIZATIONS } from '../data/initialData';
import { canonicalOrgId } from './organizationUtils';

function escapeXml(unsafe: string | number | null | undefined): string {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatCurrency(val?: number): string {
  return `₱${(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export type ActionPlanReportType = 'proposed' | 'approved' | 'deferred_rejected' | 'historical';

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
  const upper = orgIdOrName.toUpperCase();
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

/**
 * Generates and downloads an authentic Microsoft Excel (.xlsx) spreadsheet
 * reproducing the MSUN Action Plan format with dark maroon/red headers (#800000),
 * merged cells, text wrapping, borders, and Philippine peso formatting.
 */
export async function exportActionPlanToExcel(options: ActionPlanExportOptions): Promise<void> {
  const { reportType, orgName, orgId, fiscalYear } = options;
  
  // Filter activities strictly according to report type
  let exportActivities: Activity[] = [];
  let sheetTitle = 'Plan of Activities';
  let reportSubHeader = '';

  if (reportType === 'approved') {
    // ONLY Fully Approved activities
    exportActivities = options.activities.filter(a => a.approvalStatus === 'Fully Approved' || a.status === 'Approved');
    sheetTitle = 'Approved Action Plan';
    reportSubHeader = 'OFFICIAL APPROVED ACTION PLAN';
  } else if (reportType === 'proposed') {
    exportActivities = [...options.activities];
    sheetTitle = 'Proposed Action Plan';
    reportSubHeader = 'PROPOSED ACTION PLAN (ALL SUBMITTED ACTIVITIES)';
  } else if (reportType === 'deferred_rejected') {
    exportActivities = options.activities.filter(a => a.approvalStatus === 'Deferred' || a.approvalStatus === 'Rejected' || a.status === 'DEFERRED' || a.status === 'Rejected');
    sheetTitle = 'Deferred & Rejected';
    reportSubHeader = 'DEFERRED AND REJECTED ACTIVITIES REPORT';
  } else {
    // Historical
    exportActivities = [...options.activities];
    sheetTitle = 'Historical Records';
    reportSubHeader = 'HISTORICAL ACTION PLAN RECORDS';
  }

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
    const lineItem = act.lineItemBudget || (act.budgetLineItems && act.budgetLineItems.length > 0 ? act.budgetLineItems.map(b => `${b.description}: ${b.quantity} × ₱${b.unitCost} = ₱${b.total}`).join('\n') : 'Operating and logistical requirements');
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

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generates an official printable / PDF view for the Action Plan
 * closely matching the MSUN institutional template and print layout.
 */
export function printActionPlanReport(options: ActionPlanExportOptions): void {
  const { reportType, orgName, orgId, fiscalYear } = options;

  let exportActivities: Activity[] = [];
  let reportSubHeader = '';

  if (reportType === 'approved') {
    exportActivities = options.activities.filter(a => a.approvalStatus === 'Fully Approved' || a.status === 'Approved');
    reportSubHeader = 'OFFICIAL APPROVED ACTION PLAN';
  } else if (reportType === 'proposed') {
    exportActivities = [...options.activities];
    reportSubHeader = 'PROPOSED ACTION PLAN (ALL SUBMITTED ACTIVITIES)';
  } else if (reportType === 'deferred_rejected') {
    exportActivities = options.activities.filter(a => a.approvalStatus === 'Deferred' || a.approvalStatus === 'Rejected' || a.status === 'DEFERRED' || a.status === 'Rejected');
    reportSubHeader = 'DEFERRED AND REJECTED ACTIVITIES REPORT';
  } else {
    exportActivities = [...options.activities];
    reportSubHeader = 'HISTORICAL ACTION PLAN RECORDS';
  }

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
    const lineItem = act.lineItemBudget || (act.budgetLineItems && act.budgetLineItems.length > 0 ? act.budgetLineItems.map(b => `${b.description}: ${b.quantity} × ₱${b.unitCost} = ₱${b.total}`).join('<br>') : 'Operating budget');
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

