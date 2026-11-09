<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { 
  ActionPlanFolder, 
  Activity, 
  FiscalYear, 
  FiscalYearStatus, 
  ActionPlanTemplate, 
  TemplateColumn, 
  TemplateFieldType,
  OrganizationFiscalYearPlan
} from '../types';
import { 
  ORGANIZATIONS, 
  DEFAULT_MSUN_ACTION_PLAN_TEMPLATE,
  INITIAL_ACTION_PLAN_TEMPLATES,
  INITIAL_FISCAL_YEARS,
  getOrgTheme
} from '../data/initialData';
import { 
  getFiscalYears, 
  saveFiscalYearToDb, 
  activateFiscalYearInDb, 
  closeFiscalYearInDb, 
  archiveFiscalYearInDb,
  deleteFiscalYearFromDb,
  getActionPlanTemplates,
  saveTemplateToDb,
  duplicateTemplateInDb,
  publishTemplateInDb,
  deleteTemplateFromDb
} from '../services/db';
import { isSameOrg, isMatchingFiscalYear, getFiscalYearDigits } from '../utils/organizationUtils';
import ActivityReviewModal from './ActivityReviewModal.vue';
import OrgBadge from './OrgBadge.vue';
import { 
  FolderPlus, 
  Folder, 
  Search, 
  Calendar, 
  Coins, 
  CheckCircle2, 
  Clock, 
  Lock, 
  Unlock, 
  Archive,
  X, 
  Save, 
  ExternalLink,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
  Eye,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  Building2,
  Check,
  Plus,
  Palette,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  ShieldCheck,
  Filter,
  Tag,
  AlertCircle
} from 'lucide-vue-next';

const props = defineProps<{
  folders: ActionPlanFolder[];
  activities?: Activity[];
  activeFiscalYear?: string;
}>();

const emit = defineEmits<{
  (e: 'createFolder', folder: Omit<ActionPlanFolder, 'id' | 'createdAt' | 'totalActivitiesCount' | 'approvedCount' | 'pendingCount'>): void;
  (e: 'deleteFolder', fiscalYear: string): void;
  (e: 'selectActivity', activity: Activity): void;
  (e: 'selectFiscalYear', fiscalYear: string): void;
  (e: 'showToast', title: string, message?: string, type?: 'success' | 'info' | 'warning'): void;
}>();

// Main View Tabs: 'fiscal_years' | 'organizations_explorer' | 'template_builder'
const currentViewTab = ref<'fiscal_years' | 'organizations_explorer' | 'template_builder'>('fiscal_years');

// Local reactive fiscal years and templates
const fiscalYears = ref<FiscalYear[]>([]);
const templates = ref<ActionPlanTemplate[]>([]);

const loadLocalData = () => {
  fiscalYears.value = getFiscalYears();
  templates.value = getActionPlanTemplates();
};

onMounted(() => {
  loadLocalData();
});


// Summary metrics across all student organization action plans
const getFiscalYearStats = (fyName: string) => {
  const fyDigits = getFiscalYearDigits(fyName);
  const acts = (props.activities || []).filter(a => {
    if (isMatchingFiscalYear(a.fiscalYear, fyName)) return true;
    if (a.startDate && fyDigits && a.startDate.startsWith(fyDigits)) return true;
    return false;
  });
  const total = acts.length;
  const fullyApproved = acts.filter(a => 
    a.approvalStatus === 'Fully Approved' || 
    a.status === 'Approved' ||
    a.actionPlanStatus === 'Approved' ||
    a.workflowStatus === 'COMPLETED'
  ).length;
  const pending = acts.filter(a => 
    a.approvalStatus === 'Pending Review' || 
    a.approvalStatus === 'Approved at Current Stage' || 
    a.status === 'Pending' ||
    a.status === 'Under Review' ||
    a.actionPlanStatus === 'Submitted'
  ).length;
  const deferred = acts.filter(a => a.approvalStatus === 'Deferred' || a.status === 'DEFERRED').length;
  const rejected = acts.filter(a => a.approvalStatus === 'Rejected' || a.status === 'Rejected' || a.actionPlanStatus === 'Rejected').length;
  const proposedBudget = acts.reduce((sum, a) => sum + (Number(a.budget || a.totalBudget || a.amount) || 0), 0);
  const approvedBudget = acts
    .filter(a => 
      a.approvalStatus === 'Fully Approved' || 
      a.status === 'Approved' ||
      a.actionPlanStatus === 'Approved' ||
      a.workflowStatus === 'COMPLETED'
    )
    .reduce((sum, a) => sum + (Number(a.budget || a.totalBudget || a.amount) || 0), 0);
  return { total, fullyApproved, pending, deferred, rejected, proposedBudget, approvedBudget };
};

const isReviewModalOpen = ref(false);
const selectedActivityForReview = ref<Activity | null>(null);

const handleInspectActivity = (act: Activity) => {
  selectedActivityForReview.value = act;
  isReviewModalOpen.value = true;
};

const formatCurrency = (val?: number): string => {
  return `₱${(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const organizationSummaries = computed(() => {
  const acts = props.activities || [];
  return ORGANIZATIONS.map(org => {
    const orgActs = acts.filter(a => isSameOrg(a.orgId, org.id));
    const totalProposed = orgActs.length;
    const fullyApproved = orgActs.filter(a => a.approvalStatus === 'Fully Approved' || a.status === 'Approved').length;
    const pending = orgActs.filter(a => a.approvalStatus === 'Pending Review' || a.approvalStatus === 'Approved at Current Stage' || a.status === 'Pending').length;
    const deferred = orgActs.filter(a => a.approvalStatus === 'Deferred' || a.status === 'DEFERRED').length;
    const rejected = orgActs.filter(a => a.approvalStatus === 'Rejected' || a.status === 'Rejected').length;
    const proposedBudget = orgActs.reduce((sum, a) => sum + (Number(a.budget || a.totalBudget || a.amount) || 0), 0);
    const approvedBudget = orgActs
      .filter(a => a.approvalStatus === 'Fully Approved' || a.status === 'Approved')
      .reduce((sum, a) => sum + (Number(a.budget || a.totalBudget || a.amount) || 0), 0);

    return {
      orgId: org.id,
      orgName: org.name,
      acronym: org.acronym,
      color: org.color,
      totalProposed,
      fullyApproved,
      pending,
      deferred,
      rejected,
      proposedBudget,
      approvedBudget,
      approvalRate: totalProposed > 0 ? Math.round((fullyApproved / totalProposed) * 100) : 0
    };
  });
});

const totalProposedAll = computed(() => {
  return organizationSummaries.value.reduce((sum, o) => sum + o.totalProposed, 0);
});

const totalApprovedAll = computed(() => {
  return organizationSummaries.value.reduce((sum, o) => sum + o.fullyApproved, 0);
});

const totalPendingAll = computed(() => {
  return organizationSummaries.value.reduce((sum, o) => sum + o.pending, 0);
});

const totalDeferredAll = computed(() => {
  return organizationSummaries.value.reduce((sum, o) => sum + o.deferred, 0);
});

const totalRejectedAll = computed(() => {
  return organizationSummaries.value.reduce((sum, o) => sum + o.rejected, 0);
});

const totalProposedBudgetAll = computed(() => {
  return organizationSummaries.value.reduce((sum, o) => sum + o.proposedBudget, 0);
});

const totalApprovedBudgetAll = computed(() => {
  return organizationSummaries.value.reduce((sum, o) => sum + o.approvedBudget, 0);
});



// ============================================================================
// 1. FISCAL YEAR MANAGEMENT LOGIC
// ============================================================================
const fySearchQuery = ref('');
const fyStatusFilter = ref<string>('ALL');
const isCreateFyModalOpen = ref(false);
const isEditingFy = ref(false);

const fyForm = ref<{
  id: string;
  name: string;
  fiscalYear: string;
  startDate: string;
  endDate: string;
  submissionStartDate: string;
  submissionDeadline: string;
  status: FiscalYearStatus;
  templateId: string;
  notes: string;
}>({
  id: '',
  name: '',
  fiscalYear: '',
  startDate: '2028-01-01',
  endDate: '2028-12-31',
  submissionStartDate: '2027-10-01',
  submissionDeadline: '2028-03-31',
  status: 'Open',
  templateId: 'TEMPLATE-MSUN-DEFAULT',
  notes: ''
});

const filteredFiscalYears = computed(() => {
  return fiscalYears.value.filter(fy => {
    const q = fySearchQuery.value.trim().toLowerCase();
    const matchesSearch = !q || 
      fy.name.toLowerCase().includes(q) ||
      (fy.notes && fy.notes.toLowerCase().includes(q)) ||
      (fy.periodCovered && fy.periodCovered.toLowerCase().includes(q)) ||
      fy.status.toLowerCase().includes(q);

    const matchesStatus = fyStatusFilter.value === 'ALL' || fy.status === fyStatusFilter.value;
    return matchesSearch && matchesStatus;
  });
});

const handleOpenCreateFyModal = () => {
  const nextYear = new Date().getFullYear() + 2;
  fyForm.value = {
    id: `FY-${nextYear}`,
    name: `FY ${nextYear}`,
    fiscalYear: `FY ${nextYear}`,
    startDate: `${nextYear}-01-01`,
    endDate: `${nextYear}-12-31`,
    submissionStartDate: `${nextYear - 1}-10-01`,
    submissionDeadline: `${nextYear}-03-31`,
    status: 'Open',
    templateId: templates.value[0]?.id || 'TEMPLATE-MSUN-DEFAULT',
    notes: `Official Fiscal Year ${nextYear} Action Plan repository for MSU Naawan accredited student organizations.`
  };
  isEditingFy.value = false;
  isCreateFyModalOpen.value = true;
};

const handleOpenEditFyModal = (fy: FiscalYear) => {
  fyForm.value = {
    id: fy.id,
    name: fy.name,
    fiscalYear: fy.fiscalYear || fy.name,
    startDate: fy.startDate,
    endDate: fy.endDate,
    submissionStartDate: fy.submissionStartDate || fy.submissionOpenDate || fy.startDate,
    submissionDeadline: fy.submissionDeadline || fy.submissionCloseDate || fy.endDate,
    status: fy.status,
    templateId: fy.templateId || 'TEMPLATE-MSUN-DEFAULT',
    notes: fy.notes || ''
  };
  isEditingFy.value = true;
  isCreateFyModalOpen.value = true;
};

const handleSaveFiscalYear = async () => {
  if (!fyForm.value.name.trim()) {
    emit('showToast', 'Validation Error', 'Fiscal Year Name is required (e.g., FY 2028).', 'warning');
    return;
  }
  if (!fyForm.value.startDate || !fyForm.value.endDate) {
    emit('showToast', 'Validation Error', 'Start Date and End Date are required.', 'warning');
    return;
  }
  if (!fyForm.value.submissionStartDate || !fyForm.value.submissionDeadline) {
    emit('showToast', 'Validation Error', 'Submission Start Date and Submission Deadline are required.', 'warning');
    return;
  }

  const digitsMatch = fyForm.value.name.match(/\d{4}/);
  const yearDigits = digitsMatch ? digitsMatch[0] : fyForm.value.name.replace(/\D/g, '');
  const normalizedName = fyForm.value.name.startsWith('FY') ? fyForm.value.name : `FY ${fyForm.value.name}`;
  const normalizedId = isEditingFy.value ? fyForm.value.id : `FY-${yearDigits || Date.now()}`;

  if (!isEditingFy.value && fiscalYears.value.some(f => f.id.toLowerCase() === normalizedId.toLowerCase())) {
    emit('showToast', 'Duplicate Fiscal Year', `Fiscal Year ${normalizedName} already exists.`, 'warning');
    return;
  }

  const periodCovered = `January–December ${yearDigits || new Date(fyForm.value.startDate).getFullYear()}`;

  const fyData: FiscalYear = {
    id: normalizedId,
    name: normalizedName,
    fiscalYear: normalizedName,
    startDate: fyForm.value.startDate,
    endDate: fyForm.value.endDate,
    submissionStartDate: fyForm.value.submissionStartDate,
    submissionDeadline: fyForm.value.submissionDeadline,
    submissionOpenDate: fyForm.value.submissionStartDate,
    submissionCloseDate: fyForm.value.submissionDeadline,
    status: fyForm.value.status,
    templateId: fyForm.value.templateId,
    periodCovered,
    isSubmissionActive: fyForm.value.status === 'Open',
    publishedAt: fyForm.value.status === 'Open' ? new Date().toISOString() : undefined,
    notes: fyForm.value.notes,
    participatingOrgs: ['ALL'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await saveFiscalYearToDb(fyData);

  if (!isEditingFy.value) {
    // Ensure folder entry exists for repository (triggers a single clean toast via handleCreateFolder)
    emit('createFolder', {
      fiscalYear: normalizedName,
      title: `Fiscal Year ${yearDigits} Strategic Action Plan Repository`,
      theme: 'Advancing Academic Leadership, Climate Stewardship & Student Empowerment',
      submissionDeadline: fyForm.value.submissionDeadline,
      allocatedBudget: 650000,
      description: `Official master repository for storing and approving all organization activities for Fiscal Year ${yearDigits}.`,
      status: fyForm.value.status === 'Open' ? 'Open' : (fyForm.value.status === 'Archived' ? 'Archived' : 'Locked'),
      createdBy: 'System Administrator'
    });
  } else {
    emit('showToast', 'Fiscal Year Updated', `${normalizedName} has been updated successfully.`, 'success');
  }

  loadLocalData();
  isCreateFyModalOpen.value = false;
};

const handleActivateFy = async (fy: FiscalYear) => {
  await activateFiscalYearInDb(fy.id);
  loadLocalData();
  emit('selectFiscalYear', fy.name);
  emit('showToast', 'Fiscal Year Activated', `${fy.name} is now Open for organization submissions.`, 'success');
};

const handleCloseFy = async (fy: FiscalYear, newStatus: FiscalYearStatus = 'Under Review') => {
  await closeFiscalYearInDb(fy.id, newStatus);
  loadLocalData();
  emit('showToast', 'Fiscal Year Closed', `${fy.name} has been closed (Status: ${newStatus}). Submissions are locked.`, 'info');
};

const handleArchiveFy = async (fy: FiscalYear) => {
  if (!confirm(`Are you sure you want to archive ${fy.name}? All historical action plan records and activities will remain preserved.`)) {
    return;
  }
  await archiveFiscalYearInDb(fy.id);
  loadLocalData();
  emit('showToast', 'Fiscal Year Archived', `${fy.name} has been archived. All records preserved.`, 'info');
};

// Delete Empty / Not Started Action Plan Folder
const isDeleteFyModalOpen = ref(false);
const fyToDelete = ref<FiscalYear | null>(null);

const canDeleteFiscalYear = (fyName: string) => {
  const stats = getFiscalYearStats(fyName);
  return stats.total === 0;
};

const handlePromptDeleteFy = (fy: FiscalYear) => {
  fyToDelete.value = fy;
  isDeleteFyModalOpen.value = true;
};

const confirmDeleteFy = async () => {
  if (!fyToDelete.value) return;
  const target = fyToDelete.value;
  const stats = getFiscalYearStats(target.name);
  if (stats.total > 0) {
    emit('showToast', 'Cannot Delete Folder', `${target.name} contains ${stats.total} proposal(s). You can archive it instead.`, 'warning');
    isDeleteFyModalOpen.value = false;
    fyToDelete.value = null;
    return;
  }

  await deleteFiscalYearFromDb(target.id, target.name);
  emit('deleteFolder', target.name);
  loadLocalData();
  isDeleteFyModalOpen.value = false;
  fyToDelete.value = null;
  emit('showToast', 'Action Plan Folder Deleted', `${target.name} action plan folder has been permanently deleted.`, 'info');
};

// ============================================================================
// 2. ORGANIZATION ACTION PLANS EXPLORER (ORGANIZED BY REGISTERED ORG)
// ============================================================================
const selectedExplorerFy = ref<string>('FY 2027');
const explorerSearch = ref('');
const expandedExplorerOrgs = ref<Set<string>>(new Set(['SENSSO', 'SSC']));
const activeOrgPlanSection = ref<Record<string, 'proposed' | 'approved' | 'deferred'>>({});

// Ensure selected fiscal year syncs with active prop
watch(() => props.activeFiscalYear, (newVal) => {
  if (newVal) {
    selectedExplorerFy.value = newVal;
  }
}, { immediate: true });

const selectedFyDetails = computed<FiscalYear | undefined>(() => {
  return fiscalYears.value.find(f => f.name === selectedExplorerFy.value || f.id === selectedExplorerFy.value || f.fiscalYear === selectedExplorerFy.value);
});

// Bound template for the selected fiscal year
const boundTemplateForSelectedFy = computed<ActionPlanTemplate>(() => {
  const tplId = selectedFyDetails.value?.templateId;
  const found = templates.value.find(t => t.id === tplId);
  return found || templates.value[0] || DEFAULT_MSUN_ACTION_PLAN_TEMPLATE;
});

// Organization plans organized for the selected fiscal year
const organizationPlans = computed<OrganizationFiscalYearPlan[]>(() => {
  const fyName = selectedExplorerFy.value;
  const fyDigits = fyName.replace(/\D/g, '') || '2027';
  const allActs = props.activities || [];

  // Match activities in this fiscal year
  const yearActs = allActs.filter(act => {
    const actYear = (act.fiscalYear || '').replace(/\D/g, '');
    if (actYear && actYear === fyDigits) return true;
    if (act.startDate && act.startDate.startsWith(fyDigits)) return true;
    return false;
  });

  return ORGANIZATIONS
    .filter(org => org.id && org.id !== 'ADMIN' && org.id !== 'COLLEGE')
    .map(org => {
      const orgActs = yearActs.filter(act => isSameOrg(act.orgId, org.id));

      const proposedActivities = orgActs.filter(act => {
        const s = (act.status || '').toUpperCase();
        const ws = (act.workflowStatus || '').toUpperCase();
        if (s.includes('DEFERRED') || s.includes('REJECTED')) return false;
        if (s === 'APPROVED' || ws === 'COMPLETED') return false;
        return true;
      });

      const approvedActivities = orgActs.filter(act => {
        const s = (act.status || '').toUpperCase();
        const ws = (act.workflowStatus || '').toUpperCase();
        return s === 'APPROVED' || ws === 'COMPLETED';
      });

      const deferredRejectedActivities = orgActs.filter(act => {
        const s = (act.status || '').toUpperCase();
        return s.includes('DEFERRED') || s.includes('REJECTED');
      });

      const proposedBudget = proposedActivities.reduce((sum, a) => sum + (a.budget || a.amount || 0), 0);
      const approvedBudget = approvedActivities.reduce((sum, a) => sum + (a.budget || a.amount || 0), 0);
      const totalBudget = orgActs.reduce((sum, a) => sum + (a.budget || a.amount || 0), 0);

      let status: 'Draft' | 'Submitted' | 'Under Review' | 'Approved' | 'Revision Requested' = 'Draft';
      if (approvedActivities.length > 0 && proposedActivities.length === 0) {
        status = 'Approved';
      } else if (proposedActivities.length > 0) {
        status = 'Under Review';
      } else if (deferredRejectedActivities.length > 0 && orgActs.length === deferredRejectedActivities.length) {
        status = 'Revision Requested';
      }

      const latestDate = orgActs.reduce((latest, a) => {
        const d = a.submittedDate || a.startDate || '';
        return d > latest ? d : latest;
      }, '');

      return {
        orgId: org.id,
        orgName: org.name,
        category: org.category || 'Student Organization',
        fiscalYear: fyName,
        primaryActionPlanId: `AP-${fyDigits}-${org.id}`,
        version: 1,
        templateId: selectedFyDetails.value?.templateId || 'TEMPLATE-MSUN-DEFAULT',
        status,
        proposedActivities,
        approvedActivities,
        deferredRejectedActivities,
        totalActivities: orgActs.length,
        totalBudget,
        proposedBudget,
        approvedBudget,
        submissionDate: latestDate || `${fyDigits}-01-15`,
        signatory: orgActs[0]?.proposedBy || `${org.id} President`
      };
    });
});

const filteredOrganizationPlans = computed(() => {
  const q = explorerSearch.value.trim().toLowerCase();
  if (!q) return organizationPlans.value;

  return organizationPlans.value.filter(plan => {
    const matchesOrg = 
      plan.orgId.toLowerCase().includes(q) ||
      plan.orgName.toLowerCase().includes(q) ||
      plan.status.toLowerCase().includes(q) ||
      plan.primaryActionPlanId.toLowerCase().includes(q);

    if (matchesOrg) return true;

    // Check inner activities
    const allOrgActs = [...plan.proposedActivities, ...plan.approvedActivities, ...plan.deferredRejectedActivities];
    return allOrgActs.some(a => 
      a.title.toLowerCase().includes(q) ||
      (a.venue && a.venue.toLowerCase().includes(q)) ||
      (a.status && a.status.toLowerCase().includes(q))
    );
  });
});

const toggleOrgExpansion = (orgId: string) => {
  if (expandedExplorerOrgs.value.has(orgId)) {
    expandedExplorerOrgs.value.delete(orgId);
  } else {
    expandedExplorerOrgs.value.add(orgId);
  }
};

const getActiveSectionForOrg = (orgId: string): 'proposed' | 'approved' | 'deferred' => {
  return activeOrgPlanSection.value[orgId] || 'proposed';
};

const setActiveSectionForOrg = (orgId: string, section: 'proposed' | 'approved' | 'deferred') => {
  activeOrgPlanSection.value[orgId] = section;
};

const handleViewInExplorer = (fyName: string) => {
  selectedExplorerFy.value = fyName;
  currentViewTab.value = 'organizations_explorer';
};

// ============================================================================
// 3. ACTION PLAN TEMPLATE BUILDER LOGIC (UPDATE 2)
// ============================================================================
const selectedTemplateId = ref<string>('TEMPLATE-MSUN-DEFAULT');
const isCreateTemplateModalOpen = ref(false);
const isAddColumnModalOpen = ref(false);

const activeTemplate = computed<ActionPlanTemplate>(() => {
  const found = templates.value.find(t => t.id === selectedTemplateId.value);
  return found || templates.value[0] || DEFAULT_MSUN_ACTION_PLAN_TEMPLATE;
});

// Editable copy of current template for live design modifications
const editableTemplate = ref<ActionPlanTemplate>({ ...DEFAULT_MSUN_ACTION_PLAN_TEMPLATE });

watch(activeTemplate, (newVal) => {
  if (newVal) {
    editableTemplate.value = JSON.parse(JSON.stringify(newVal));
  }
}, { immediate: true });

// Column being added or edited
const newColumnForm = ref<{
  mainHeader: string;
  subHeader: string;
  fieldKey: string;
  fieldType: TemplateFieldType;
  isRequired: boolean;
  width: string;
  align: 'left' | 'center' | 'right';
  isGrouped: boolean;
  groupParent: string;
}>({
  mainHeader: '',
  subHeader: '',
  fieldKey: '',
  fieldType: 'text',
  isRequired: true,
  width: '180px',
  align: 'left',
  isGrouped: false,
  groupParent: ''
});

const handleSelectTemplate = (tplId: string) => {
  selectedTemplateId.value = tplId;
};

const handleCreateNewTemplate = () => {
  const newId = `TEMPLATE-${Date.now().toString(36).toUpperCase()}`;
  const baseTpl: ActionPlanTemplate = {
    id: newId,
    name: 'New Custom Action Plan Template',
    description: 'Customized action plan column structure and aesthetics for institutional operations.',
    version: 1,
    isDefault: false,
    headerTitle: 'PLAN OF ACTIVITIES',
    headerSubTitle: '[ORGANIZATION/OFFICE NAME]',
    headerColor: '#800000',
    headerTextColor: '#FFFFFF',
    subHeaderColor: '#FCE5CD',
    subHeaderTextColor: '#1E293B',
    footerLabel: 'Total Projected Budget (excluding office supplies, allowances and wages)',
    budgetCalculationRule: 'SUM_ALL',
    columns: JSON.parse(JSON.stringify(DEFAULT_MSUN_ACTION_PLAN_TEMPLATE.columns)),
    status: 'Draft',
    allowTextWrap: true,
    showBorders: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  saveTemplateToDb(baseTpl);
  loadLocalData();
  selectedTemplateId.value = newId;
  emit('showToast', 'Template Created', 'New template draft initialized with standard MSUN columns.', 'success');
};

const handleDuplicateTemplate = async (templateId: string) => {
  const source = templates.value.find(t => t.id === templateId);
  if (!source) return;

  const duplicated = await duplicateTemplateInDb(templateId, `Copy of ${source.name}`);
  loadLocalData();
  if (duplicated) {
    selectedTemplateId.value = duplicated.id;
    emit('showToast', 'Template Duplicated', `Duplicated "${source.name}" as draft.`, 'success');
  }
};

const handleSaveTemplateChanges = async () => {
  await saveTemplateToDb(editableTemplate.value);
  loadLocalData();
  emit('showToast', 'Template Saved', `Template "${editableTemplate.value.name}" saved successfully.`, 'success');
};

const handlePublishTemplate = async () => {
  // Publishing bumps the version to protect historical records
  editableTemplate.value.status = 'Published';
  editableTemplate.value.version = (editableTemplate.value.version || 1) + 1;
  await saveTemplateToDb(editableTemplate.value);
  loadLocalData();
  emit('showToast', 'Template Published', `Template "${editableTemplate.value.name}" published as Version ${editableTemplate.value.version}. All organizations will follow this published schema.`, 'success');
};

const handleDeleteTemplate = async (templateId: string) => {
  const target = templates.value.find(t => t.id === templateId);
  if (!target) return;

  if (target.isDefault || target.id === 'TEMPLATE-MSUN-DEFAULT') {
    emit('showToast', 'Cannot Delete Default', 'The standard default MSUN template cannot be deleted.', 'warning');
    return;
  }

  // Check if assigned to any fiscal year
  const assignedFy = fiscalYears.value.find(fy => fy.templateId === templateId);
  const promptMsg = assignedFy
    ? `Template "${target.name}" is currently assigned to ${assignedFy.name}. Are you sure you want to permanently delete it?`
    : `Are you sure you want to permanently delete template "${target.name}"? This action cannot be undone.`;

  if (!confirm(promptMsg)) {
    return;
  }

  try {
    await deleteTemplateFromDb(templateId);
    loadLocalData();
    const nextTemplate = templates.value[0] || DEFAULT_MSUN_ACTION_PLAN_TEMPLATE;
    selectedTemplateId.value = nextTemplate.id;
    emit('showToast', 'Template Deleted', `Template "${target.name}" was permanently removed.`, 'info');
  } catch (err: any) {
    emit('showToast', 'Delete Failed', err.message || 'Could not delete template.', 'warning');
  }
};

// Column ordering actions
const moveColumnUp = (index: number) => {
  if (index <= 0) return;
  const cols = editableTemplate.value.columns;
  const temp = cols[index];
  cols[index] = cols[index - 1];
  cols[index - 1] = temp;
};

const moveColumnDown = (index: number) => {
  const cols = editableTemplate.value.columns;
  if (index >= cols.length - 1) return;
  const temp = cols[index];
  cols[index] = cols[index + 1];
  cols[index + 1] = temp;
};

const removeColumn = (index: number) => {
  const col = editableTemplate.value.columns[index];
  if (confirm(`Remove column "${col.mainHeader}${col.subHeader ? ' - ' + col.subHeader : ''}"?`)) {
    editableTemplate.value.columns.splice(index, 1);
  }
};

const handleOpenAddColumnModal = () => {
  newColumnForm.value = {
    mainHeader: '',
    subHeader: '',
    fieldKey: `customField_${Date.now().toString(36)}`,
    fieldType: 'text',
    isRequired: true,
    width: '180px',
    align: 'left',
    isGrouped: false,
    groupParent: ''
  };
  isAddColumnModalOpen.value = true;
};

const handleSaveNewColumn = () => {
  if (!newColumnForm.value.mainHeader.trim()) {
    emit('showToast', 'Validation Error', 'Column Header Name is required.', 'warning');
    return;
  }

  const newCol: TemplateColumn = {
    id: `col-${Date.now().toString(36)}`,
    mainHeader: newColumnForm.value.mainHeader.trim(),
    subHeader: newColumnForm.value.subHeader.trim() || undefined,
    fieldKey: newColumnForm.value.fieldKey.trim() || `field_${Date.now()}`,
    fieldType: newColumnForm.value.fieldType,
    isRequired: newColumnForm.value.isRequired,
    width: newColumnForm.value.width || '180px',
    align: newColumnForm.value.align,
    isGrouped: newColumnForm.value.isGrouped,
    groupParent: newColumnForm.value.groupParent || undefined
  };

  editableTemplate.value.columns.push(newCol);
  isAddColumnModalOpen.value = false;
  emit('showToast', 'Column Added', `Added column "${newCol.mainHeader}".`, 'success');
};

// Preset colors for Template Column Header
const presetColors = [
  { name: 'Dark Red (MSUN Maroon)', hex: '#800000' },
  { name: 'Deep Burgundy', hex: '#881337' },
  { name: 'Navy Blue', hex: '#1E3A8A' },
  { name: 'Forest Green', hex: '#065F46' },
  { name: 'Slate Gray', hex: '#0F172A' },
  { name: 'Dark Indigo', hex: '#312E81' }
];

// Reference sample activities for SenSSo reference table preview
const samplePreviewActivities = computed(() => {
  return [
    {
      timeframeMonth: 'May-June',
      timeframeWeek: 'Last Week - First week',
      title: 'Senior Exit and Job Fair 2027',
      strategicObjectives: 'Bridge graduating seniors with regional employers and industry partners for immediate career placement.',
      expectedOutput: 'At least 250 graduating seniors interviewed; minimum 30 job offers and industry MOAs executed.',
      office: 'SenSSo',
      lineItemBudget: 'Logistics, guest speaker accommodation, and career portfolio packs',
      budget: 45000,
      fundSource: 'Senior Class Fund',
      personAssigned: 'SenSSo Executive Committee'
    },
    {
      timeframeMonth: 'September',
      timeframeWeek: '3rd Week',
      title: 'Graduation Ball & Alumni Transition Night',
      strategicObjectives: 'Celebrate collegiate milestones, strengthen lifelong alumni ties, and conduct university leadership turnover.',
      expectedOutput: 'Full batch attendance with leadership testimonials, financial clearance, and turnover rites.',
      office: 'SenSSo',
      lineItemBudget: 'Stage lighting, tokens, certificates, and program collation',
      budget: 85000,
      fundSource: 'Senior Class Fund',
      personAssigned: 'SenSSo Socials Committee'
    },
    {
      timeframeMonth: 'October',
      timeframeWeek: '2nd Week',
      title: 'Campus Climate Leadership Summit',
      strategicObjectives: 'Equip student organization officers with actionable tools for campus waste reduction and carbon neutrality.',
      expectedOutput: 'Actionable policy resolutions submitted to Office of Student Development and College Deans.',
      office: 'SenSSo',
      lineItemBudget: 'Workshop manuals, eco-friendly supplies, and technical documentation',
      budget: 25000,
      fundSource: 'OSD/OSW Funds',
      personAssigned: 'SenSSo Advocacy Head'
    }
  ];
});
</script>

<template>
  <div class="space-y-6">
    <!-- ========================================================================= -->
    <!-- TOP NAVIGATION & MODULE CONTEXT HEADER                                    -->
    <!-- ========================================================================= -->
    <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6">
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-1.5 flex-wrap">
            <span class="text-xs font-bold text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
              System Administration
            </span>
            <span v-if="activeFiscalYear" class="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
              <Check class="w-3.5 h-3.5 text-emerald-600" />
              Active System Year: {{ activeFiscalYear }}
            </span>
            <span class="text-xs text-slate-500">Mindanao State University at Naawan</span>
          </div>
          <h2 class="text-2xl font-extrabold text-slate-900 tracking-tight">
            Fiscal Year Management & Template Builder
          </h2>
          <p class="text-sm text-slate-600 mt-1 max-w-3xl leading-relaxed">
            Provision and lifecycle-manage fiscal years, organize participating organizations under each fiscal year, and build standardized versioned action plan templates.
          </p>
        </div>

        <!-- Mode Switcher Buttons -->
        <div class="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200/90 shrink-0 self-start lg:self-auto flex-wrap">


          <button
            type="button"
            @click="currentViewTab = 'fiscal_years'"
            class="px-3 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
            :class="currentViewTab === 'fiscal_years'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'"
          >
            <Calendar class="w-4 h-4" />
            <span>Fiscal Years ({{ fiscalYears.length }})</span>
          </button>

          <button
            type="button"
            @click="currentViewTab = 'organizations_explorer'"
            class="px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2"
            :class="currentViewTab === 'organizations_explorer'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'"
          >
            <Building2 class="w-4 h-4" />
            <span>Organization Plans</span>
          </button>

          <button
            type="button"
            @click="currentViewTab = 'template_builder'"
            class="px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2"
            :class="currentViewTab === 'template_builder'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'"
          >
            <Palette class="w-4 h-4" />
            <span>Template Builder</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ========================================================================= -->
    <!-- TAB 1: FISCAL YEARS MANAGEMENT                                            -->
    <!-- ========================================================================= -->
    <div v-if="currentViewTab === 'fiscal_years'" class="space-y-5">
      <!-- High-Level Action Plan Activity & Budget Summary Metrics Across Fiscal Years -->
      <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Proposed</span>
          <span class="text-xl font-black text-slate-900 mt-1 block">{{ totalProposedAll }}</span>
          <span class="text-[10px] text-slate-400">All submissions</span>
        </div>

        <div class="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
          <span class="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Fully Approved</span>
          <span class="text-xl font-black text-emerald-700 mt-1 block">{{ totalApprovedAll }}</span>
          <span class="text-[10px] text-emerald-600">Official sanction</span>
        </div>

        <div class="bg-white p-3.5 rounded-xl border border-blue-200 bg-blue-50/20 shadow-2xs">
          <span class="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">Pending Review</span>
          <span class="text-xl font-black text-blue-700 mt-1 block">{{ totalPendingAll }}</span>
          <span class="text-[10px] text-blue-600">In hierarchy</span>
        </div>

        <div class="bg-white p-3.5 rounded-xl border border-amber-200 bg-amber-50/20 shadow-2xs">
          <span class="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Deferred</span>
          <span class="text-xl font-black text-amber-700 mt-1 block">{{ totalDeferredAll }}</span>
          <span class="text-[10px] text-amber-600">Returned for revision</span>
        </div>

        <div class="bg-white p-3.5 rounded-xl border border-rose-200 bg-rose-50/20 shadow-2xs">
          <span class="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">Rejected</span>
          <span class="text-xl font-black text-rose-700 mt-1 block">{{ totalRejectedAll }}</span>
          <span class="text-[10px] text-rose-600">Permanently kept</span>
        </div>

        <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
          <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Proposed Budget</span>
          <span class="text-sm font-black text-slate-900 mt-1 block font-mono truncate" :title="formatCurrency(totalProposedBudgetAll)">
            {{ formatCurrency(totalProposedBudgetAll) }}
          </span>
          <span class="text-[10px] text-slate-400">Total requested</span>
        </div>

        <div class="bg-white p-3.5 rounded-xl border border-emerald-300 bg-emerald-50/40 shadow-2xs col-span-2 sm:col-span-1">
          <span class="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Approved Budget</span>
          <span class="text-sm font-black text-emerald-800 mt-1 block font-mono truncate" :title="formatCurrency(totalApprovedBudgetAll)">
            {{ formatCurrency(totalApprovedBudgetAll) }}
          </span>
          <span class="text-[10px] text-emerald-700 font-bold">Only Fully Approved</span>
        </div>
      </div>
      <!-- Search, Filter & Action Bar -->
      <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div class="relative flex-1 w-full">
          <Search class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            v-model="fySearchQuery"
            type="text"
            placeholder="Search fiscal years by name (e.g. FY 2027), status, notes, or timeframe..."
            class="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
          />
        </div>

        <div class="flex items-center gap-3 w-full sm:w-auto">
          <select
            v-model="fyStatusFilter"
            class="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
          >
            <option value="ALL">All Statuses ({{ fiscalYears.length }})</option>
            <option value="Draft">Draft</option>
            <option value="Open">Open</option>
            <option value="Under Review">Under Review</option>
            <option value="Finalized">Finalized</option>
            <option value="Archived">Archived</option>
          </select>

          <button
            type="button"
            @click="handleOpenCreateFyModal"
            class="btn-primary btn-sm shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            <FolderPlus class="w-4 h-4" />
            <span>Create Fiscal Year</span>
          </button>
        </div>
      </div>

      <!-- Fiscal Years Cards Grid / List -->
      <div class="space-y-4">
        <div
          v-if="filteredFiscalYears.length === 0"
          class="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-12 text-center"
        >
          <Calendar class="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 class="text-sm font-bold text-slate-800">No Fiscal Years Found</h3>
          <p class="text-xs text-slate-500 mt-1">Adjust search parameters or create a new Fiscal Year.</p>
        </div>

        <div
          v-for="fy in filteredFiscalYears"
          :key="fy.id"
          class="bg-white rounded-2xl border shadow-2xs p-6 transition-all"
          :class="activeFiscalYear === fy.name ? 'border-blue-400 ring-2 ring-blue-500/15' : 'border-slate-200/90 hover:border-slate-300'"
        >
          <div class="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
            <!-- Left: Fiscal Year Identity, Dates & Meta -->
            <div class="flex items-start gap-4 flex-1">
              <div
                class="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 shadow-xs"
                :class="fy.status === 'Open'
                  ? 'bg-emerald-100 text-emerald-800'
                  : fy.status === 'Under Review'
                  ? 'bg-amber-100 text-amber-800'
                  : fy.status === 'Finalized'
                  ? 'bg-blue-100 text-blue-800'
                  : fy.status === 'Archived'
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-slate-100 text-slate-600'"
              >
                <Calendar class="w-6 h-6" />
              </div>

              <div class="space-y-2 flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-xs font-black px-2.5 py-0.5 rounded-lg bg-slate-900 text-white">
                    {{ fy.name }}
                  </span>

                  <!-- Status Badge -->
                  <span
                    class="text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1"
                    :class="fy.status === 'Open'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : fy.status === 'Under Review'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : fy.status === 'Finalized'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : fy.status === 'Archived'
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'"
                  >
                    <Unlock v-if="fy.status === 'Open'" class="w-3 h-3 text-emerald-600" />
                    <Clock v-else-if="fy.status === 'Under Review'" class="w-3 h-3 text-amber-600" />
                    <Lock v-else-if="fy.status === 'Finalized'" class="w-3 h-3 text-blue-600" />
                    <Archive v-else-if="fy.status === 'Archived'" class="w-3 h-3 text-purple-600" />
                    <span>Status: {{ fy.status }}</span>
                  </span>

                  <span
                    v-if="activeFiscalYear === fy.name"
                    class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1"
                  >
                    <Check class="w-3 h-3 text-blue-600" />
                    Active in System Sidebar
                  </span>

                  <span class="text-[10px] font-mono text-slate-400">ID: {{ fy.id }}</span>
                </div>

                <h3 class="text-base font-bold text-slate-900 leading-snug">
                  Fiscal Year {{ fy.name.replace(/\D/g, '') }} Strategic Plan & Organization Action Plans
                </h3>

                <p v-if="fy.notes" class="text-xs text-slate-600 leading-relaxed">
                  {{ fy.notes }}
                </p>

                <!-- Detailed Dates Grid -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-2">
                  <div class="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Fiscal Period
                    </span>
                    <span class="text-xs font-bold text-slate-900 block mt-0.5">
                      {{ fy.startDate }} to {{ fy.endDate }}
                    </span>
                    <span class="text-[10px] text-slate-400 block mt-0.2">{{ fy.periodCovered }}</span>
                  </div>

                  <div class="bg-blue-50/70 border border-blue-100 rounded-xl p-2.5">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">
                      Submission Window
                    </span>
                    <span class="text-xs font-bold text-blue-950 block mt-0.5">
                      {{ fy.submissionStartDate || fy.startDate }} to {{ fy.submissionDeadline || fy.endDate }}
                    </span>
                    <span class="text-[10px] text-blue-600 font-semibold block mt-0.2">
                      {{ fy.isSubmissionActive ? '🟢 Submissions Open' : '🔴 Submissions Closed' }}
                    </span>
                  </div>

                  <div class="bg-purple-50/70 border border-purple-100 rounded-xl p-2.5">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">
                      Assigned Action Plan Template
                    </span>
                    <span class="text-xs font-bold text-purple-950 block mt-0.5 truncate">
                      {{ templates.find(t => t.id === fy.templateId)?.name || 'MSUN Standard Plan of Activities' }}
                    </span>
                    <span class="text-[10px] text-purple-600 block mt-0.2">
                      Version {{ templates.find(t => t.id === fy.templateId)?.version || 1 }} (10 Standard Columns)
                    </span>
                  </div>

                  <div class="bg-emerald-50/70 border border-emerald-100 rounded-xl p-2.5">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                      Registered Organizations
                    </span>
                    <div class="flex items-baseline gap-1 mt-0.5">
                      <span class="text-base font-black text-emerald-900">
                        {{ ORGANIZATIONS.filter(o => o.id !== 'ADMIN' && o.id !== 'COLLEGE').length }}
                      </span>
                      <span class="text-[11px] text-emerald-700 font-semibold">participating councils</span>
                    </div>
                  </div>

                  <div class="bg-indigo-50/70 border border-indigo-100 rounded-xl p-2.5">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">
                      Action Plan Activities
                    </span>
                    <div class="flex items-baseline gap-1 mt-0.5">
                      <span class="text-base font-black text-indigo-950">
                        {{ getFiscalYearStats(fy.name).total }}
                      </span>
                      <span class="text-[11px] text-indigo-700 font-semibold">
                        proposals ({{ getFiscalYearStats(fy.name).fullyApproved }} approved)
                      </span>
                    </div>
                    <span class="text-[10px] text-indigo-600 block mt-0.2 font-mono truncate" :title="formatCurrency(getFiscalYearStats(fy.name).approvedBudget)">
                      Approved: {{ formatCurrency(getFiscalYearStats(fy.name).approvedBudget) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right: Lifecycle Management Actions -->
            <div class="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0 self-end lg:self-start w-full lg:w-auto">
              <!-- Primary Explorer Button -->
              <button
                type="button"
                @click="handleViewInExplorer(fy.name)"
                class="btn-info btn-sm flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Building2 class="w-3.5 h-3.5" />
                <span>View Organizations & Plans</span>
                <ChevronRight class="w-3.5 h-3.5" />
              </button>

              <!-- Lifecycle State Changer Buttons -->
              <div class="flex items-center gap-1.5 flex-wrap">
                <!-- Activate (Open) -->
                <button
                  v-if="fy.status !== 'Open'"
                  type="button"
                  @click="handleActivateFy(fy)"
                  class="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer flex items-center gap-1"
                  title="Open this fiscal year for submissions"
                >
                  <Unlock class="w-3 h-3 text-emerald-600" />
                  <span>Activate (Open)</span>
                </button>

                <!-- Close (Under Review or Finalized) -->
                <button
                  v-if="fy.status === 'Open'"
                  type="button"
                  @click="handleCloseFy(fy, 'Under Review')"
                  class="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition-colors cursor-pointer flex items-center gap-1"
                  title="Close submissions and place under review"
                >
                  <Lock class="w-3 h-3 text-amber-600" />
                  <span>Close Submissions</span>
                </button>

                <!-- Finalize -->
                <button
                  v-if="fy.status === 'Under Review'"
                  type="button"
                  @click="handleCloseFy(fy, 'Finalized')"
                  class="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer flex items-center gap-1"
                  title="Finalize all approved action plans"
                >
                  <CheckCircle2 class="w-3 h-3 text-blue-600" />
                  <span>Finalize FY</span>
                </button>

                <!-- Archive -->
                <button
                  v-if="fy.status !== 'Archived'"
                  type="button"
                  @click="handleArchiveFy(fy)"
                  class="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200 transition-colors cursor-pointer flex items-center gap-1"
                  title="Archive this fiscal year while preserving all records"
                >
                  <Archive class="w-3 h-3 text-purple-600" />
                  <span>Archive</span>
                </button>

                <!-- Edit Details -->
                <button
                  type="button"
                  @click="handleOpenEditFyModal(fy)"
                  class="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  Edit
                </button>

                <!-- Delete Empty / Not Started Action Plan Folder -->
                <button
                  v-if="canDeleteFiscalYear(fy.name)"
                  type="button"
                  @click="handlePromptDeleteFy(fy)"
                  class="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                  title="Delete empty action plan folder and fiscal year"
                >
                  <Trash2 class="w-3 h-3 text-rose-600" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Card Footer -->
          <div class="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap text-xs text-slate-500">
            <div>
              <span>Created: <strong class="text-slate-700">{{ fy.createdAt ? fy.createdAt.split('T')[0] : '2026-01-01' }}</strong></span>
              <span v-if="activeFiscalYear !== fy.name">
                • 
                <button
                  type="button"
                  @click="emit('selectFiscalYear', fy.name)"
                  class="text-blue-600 hover:underline font-bold cursor-pointer"
                >
                  Set as Active Fiscal Year
                </button>
              </span>
            </div>

            <div class="flex items-center gap-2">
              <span class="text-[11px] text-slate-400">All student organization action plans follow the published template.</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ========================================================================= -->
    <!-- TAB 2: ORGANIZATION ACTION PLANS EXPLORER                                 -->
    <!-- ========================================================================= -->
    <div v-if="currentViewTab === 'organizations_explorer'" class="space-y-5">
      <!-- Context & Fiscal Year Selector -->
      <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="space-y-1">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
                Participating Organizations
              </span>
              <span class="text-xs font-bold text-purple-800 bg-purple-50 px-2.5 py-0.5 rounded-md border border-purple-200">
                Template: {{ boundTemplateForSelectedFy.name }} (v{{ boundTemplateForSelectedFy.version }})
              </span>
            </div>
            <h3 class="text-xl font-black text-slate-900 tracking-tight">
              Organization Action Plans in {{ selectedExplorerFy }}
            </h3>
            <p class="text-xs text-slate-600">
              Each registered organization maintains one primary action plan per fiscal year with Proposed, Approved, and Deferred/Rejected sections.
            </p>
          </div>

          <!-- FY Switcher Dropdown -->
          <div class="flex items-center gap-3 shrink-0">
            <label class="text-xs font-bold text-slate-700">Fiscal Year:</label>
            <select
              v-model="selectedExplorerFy"
              class="px-3.5 py-2 text-xs font-extrabold bg-blue-50 border border-blue-200 text-blue-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer shadow-2xs"
            >
              <option v-for="fy in fiscalYears" :key="fy.id" :value="fy.name">
                {{ fy.name }} ({{ fy.status }})
              </option>
            </select>
          </div>
        </div>

        <!-- Search Bar within Explorer -->
        <div class="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div class="relative flex-1 w-full">
            <Search class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              v-model="explorerSearch"
              type="text"
              placeholder="Filter by organization (SSC, CBIT, SenSSo...), activity title, or status..."
              class="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
            />
          </div>

          <div class="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              @click="expandedExplorerOrgs = new Set(organizationPlans.map(p => p.orgId))"
              class="text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              Expand All
            </button>
            <button
              type="button"
              @click="expandedExplorerOrgs.clear()"
              class="text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              Collapse All
            </button>
          </div>
        </div>
      </div>

      <!-- Organizations List -->
      <div class="space-y-4">
        <div
          v-if="filteredOrganizationPlans.length === 0"
          class="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-xs"
        >
          No registered organizations match the search query for {{ selectedExplorerFy }}.
        </div>

        <div
          v-for="plan in filteredOrganizationPlans"
          :key="plan.orgId"
          class="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-blue-300 transition-all overflow-hidden"
        >
          <!-- Organization Header Card -->
          <div class="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
            <div class="flex items-start gap-3.5 min-w-0">
              <!-- Org Badge Icon -->
              <div 
                class="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 border shadow-2xs"
                :class="[
                  getOrgTheme(plan.orgId).badgeBg,
                  getOrgTheme(plan.orgId).badgeText,
                  getOrgTheme(plan.orgId).badgeBorder
                ]"
              >
                {{ plan.orgId }}
              </div>

              <div class="space-y-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-sm font-extrabold text-slate-900 truncate">
                    {{ plan.orgName }}
                  </span>
                  
                  <!-- Primary Action Plan Pill (Requirement 7) -->
                  <span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-300 flex items-center gap-1 shadow-2xs">
                    <ShieldCheck class="w-3 h-3 text-blue-700" />
                    <span>Primary Action Plan v{{ plan.version }}.0</span>
                  </span>

                  <!-- Plan Status -->
                  <span
                    class="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                    :class="plan.status === 'Approved'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : plan.status === 'Under Review'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'"
                  >
                    {{ plan.status }}
                  </span>
                </div>

                <p class="text-xs text-slate-500">
                  Plan Reference: <strong class="font-mono text-slate-700">{{ plan.primaryActionPlanId }}</strong> • Signatory: {{ plan.signatory }}
                </p>

                <!-- Statistics Bar -->
                <div class="flex items-center gap-3 text-xs text-slate-600 pt-1 flex-wrap">
                  <span class="flex items-center gap-1 font-semibold">
                    <Layers class="w-3.5 h-3.5 text-blue-600" />
                    <span>Total Activities: <strong class="text-slate-900">{{ plan.totalActivities }}</strong></span>
                  </span>
                  <span>•</span>
                  <span class="text-emerald-700 font-semibold flex items-center gap-1">
                    <Coins class="w-3.5 h-3.5" />
                    <span>Planned Budget: <strong>₱{{ plan.totalBudget.toLocaleString() }}</strong></span>
                  </span>
                  <span>•</span>
                  <span class="text-slate-500 font-medium">
                    Proposed ({{ plan.proposedActivities.length }}) | Approved ({{ plan.approvedActivities.length }}) | Deferred/Rejected ({{ plan.deferredRejectedActivities.length }})
                  </span>
                </div>
              </div>
            </div>

            <!-- Toggle Button -->
            <button
              type="button"
              @click="toggleOrgExpansion(plan.orgId)"
              class="btn-secondary btn-sm self-end sm:self-center flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <span>{{ expandedExplorerOrgs.has(plan.orgId) ? 'Hide Plan Sections' : 'View Action Plan' }}</span>
              <ChevronDown
                class="w-4 h-4 text-slate-500 transition-transform duration-200"
                :class="{ 'rotate-180': expandedExplorerOrgs.has(plan.orgId) }"
              />
            </button>
          </div>

          <!-- Inside: 3 Required Sections (Proposed, Approved, Deferred/Rejected) -->
          <div v-if="expandedExplorerOrgs.has(plan.orgId)" class="border-t border-slate-200 bg-white p-5 space-y-4">
            <!-- 3 Sections Navigation Tabs -->
            <div class="flex items-center gap-2 border-b border-slate-200 pb-3 flex-wrap">
              <button
                type="button"
                @click="setActiveSectionForOrg(plan.orgId, 'proposed')"
                class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                :class="getActiveSectionForOrg(plan.orgId) === 'proposed'
                  ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent'"
              >
                <Clock class="w-3.5 h-3.5 text-amber-700" />
                <span>Proposed Action Plan ({{ plan.proposedActivities.length }})</span>
              </button>

              <button
                type="button"
                @click="setActiveSectionForOrg(plan.orgId, 'approved')"
                class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                :class="getActiveSectionForOrg(plan.orgId) === 'approved'
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent'"
              >
                <CheckCircle2 class="w-3.5 h-3.5 text-emerald-700" />
                <span>Approved Action Plan ({{ plan.approvedActivities.length }})</span>
              </button>

              <button
                type="button"
                @click="setActiveSectionForOrg(plan.orgId, 'deferred')"
                class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                :class="getActiveSectionForOrg(plan.orgId) === 'deferred'
                  ? 'bg-rose-100 text-rose-900 border border-rose-300 shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent'"
              >
                <AlertTriangle class="w-3.5 h-3.5 text-rose-700" />
                <span>Deferred / Rejected Activities ({{ plan.deferredRejectedActivities.length }})</span>
              </button>
            </div>

            <!-- SECTION A: PROPOSED ACTION PLAN -->
            <div v-if="getActiveSectionForOrg(plan.orgId) === 'proposed'" class="space-y-3">
              <div class="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
                <span>Proposed Initiatives awaiting clearance or in review for {{ selectedExplorerFy }}</span>
                <span class="text-amber-800">Proposed Budget: ₱{{ plan.proposedBudget.toLocaleString() }}</span>
              </div>

              <div v-if="plan.proposedActivities.length === 0" class="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
                No pending or proposed activities currently in the queue for this organization.
              </div>

              <div
                v-for="act in plan.proposedActivities"
                :key="act.id"
                class="p-3.5 rounded-xl border border-slate-200/90 bg-white shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-amber-300 transition-all"
              >
                <div class="space-y-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-xs font-bold text-slate-900">{{ act.title }}</span>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                      {{ act.status || 'Pending' }}
                    </span>
                    <span class="text-[10px] text-slate-400 font-mono">{{ act.id }}</span>
                  </div>
                  <p class="text-xs text-slate-600 truncate max-w-2xl">
                    {{ act.description || act.strategicObjectives || 'Leadership and organizational initiative.' }}
                  </p>
                  <div class="flex items-center gap-3 text-[11px] text-slate-500 pt-0.5 flex-wrap">
                    <span>Date: <strong class="text-slate-700">{{ act.startDate }}</strong></span>
                    <span>•</span>
                    <span>Budget: <strong class="text-amber-900">₱{{ (act.budget || act.amount || 0).toLocaleString() }}</strong></span>
                    <span>•</span>
                    <span>Fund Source: <strong class="text-slate-700">{{ act.fundSource || 'Council Fund' }}</strong></span>
                  </div>
                </div>

                <button
                  type="button"
                  @click="emit('selectActivity', act)"
                  class="btn-secondary btn-sm shrink-0 self-end sm:self-auto cursor-pointer"
                >
                  <Eye class="w-3.5 h-3.5" />
                  <span>Inspect</span>
                </button>
              </div>
            </div>

            <!-- SECTION B: APPROVED ACTION PLAN -->
            <div v-if="getActiveSectionForOrg(plan.orgId) === 'approved'" class="space-y-3">
              <div class="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
                <span>Fully cleared & endorsed initiatives for {{ selectedExplorerFy }}</span>
                <span class="text-emerald-800">Approved Budget: ₱{{ plan.approvedBudget.toLocaleString() }}</span>
              </div>

              <div v-if="plan.approvedActivities.length === 0" class="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
                No approved activities recorded yet for this organization in {{ selectedExplorerFy }}.
              </div>

              <div
                v-for="act in plan.approvedActivities"
                :key="act.id"
                class="p-3.5 rounded-xl border border-slate-200/90 bg-emerald-50/20 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-emerald-300 transition-all"
              >
                <div class="space-y-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-xs font-bold text-slate-900">{{ act.title }}</span>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                      <CheckCircle2 class="w-3 h-3 text-emerald-700" />
                      Approved
                    </span>
                    <span class="text-[10px] text-slate-400 font-mono">{{ act.id }}</span>
                  </div>
                  <p class="text-xs text-slate-600 truncate max-w-2xl">
                    {{ act.description || act.expectedOutput || 'Authorized student council activity.' }}
                  </p>
                  <div class="flex items-center gap-3 text-[11px] text-slate-500 pt-0.5 flex-wrap">
                    <span>Timeframe: <strong class="text-slate-700">{{ act.startDate }}</strong></span>
                    <span>•</span>
                    <span>Approved Budget: <strong class="text-emerald-900">₱{{ (act.budget || act.amount || 0).toLocaleString() }}</strong></span>
                    <span>•</span>
                    <span>Person Assigned: <strong class="text-slate-700">{{ act.personAssigned || act.proposedBy }}</strong></span>
                  </div>
                </div>

                <button
                  type="button"
                  @click="emit('selectActivity', act)"
                  class="btn-secondary btn-sm shrink-0 self-end sm:self-auto cursor-pointer"
                >
                  <Eye class="w-3.5 h-3.5" />
                  <span>Inspect</span>
                </button>
              </div>
            </div>

            <!-- SECTION C: DEFERRED / REJECTED ACTIVITIES -->
            <div v-if="getActiveSectionForOrg(plan.orgId) === 'deferred'" class="space-y-3">
              <div class="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
                <span>Initiatives requiring revision or rejected by approval authorities</span>
                <span class="text-rose-700">{{ plan.deferredRejectedActivities.length }} flagged initiatives</span>
              </div>

              <div v-if="plan.deferredRejectedActivities.length === 0" class="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
                No deferred or rejected activities recorded. All proposals are in good standing!
              </div>

              <div
                v-for="act in plan.deferredRejectedActivities"
                :key="act.id"
                class="p-3.5 rounded-xl border border-rose-200 bg-rose-50/30 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-rose-300 transition-all"
              >
                <div class="space-y-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-xs font-bold text-slate-900">{{ act.title }}</span>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                      {{ act.status }}
                    </span>
                  </div>
                  <div v-if="act.deferReason || act.rejectionRemarks" class="p-2 rounded-lg bg-rose-100/70 text-xs text-rose-900 font-medium">
                    ⚠️ <strong>Reviewer Remarks:</strong> {{ act.deferReason || act.rejectionRemarks }}
                  </div>
                  <div class="flex items-center gap-3 text-[11px] text-slate-500 pt-0.5 flex-wrap">
                    <span>Budget: <strong class="text-slate-700">₱{{ (act.budget || act.amount || 0).toLocaleString() }}</strong></span>
                    <span>•</span>
                    <span>Target Date: <strong class="text-slate-700">{{ act.startDate }}</strong></span>
                  </div>
                </div>

                <button
                  type="button"
                  @click="emit('selectActivity', act)"
                  class="btn-secondary btn-sm shrink-0 self-end sm:self-auto cursor-pointer"
                >
                  <Eye class="w-3.5 h-3.5" />
                  <span>Inspect</span>
                </button>
              </div>
            </div>

            <!-- Single Primary Plan Rule Disclaimer -->
            <div class="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 flex items-center gap-2">
              <ShieldCheck class="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                <strong>System Governance Rule:</strong> Each student organization is permitted only <strong>one primary action plan</strong> for {{ selectedExplorerFy }}. Any future modifications or additions are recorded as revisions under this published baseline.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ========================================================================= -->
    <!-- TAB 3: ACTION PLAN TEMPLATE BUILDER (UPDATE 2)                           -->
    <!-- ========================================================================= -->
    <div v-if="currentViewTab === 'template_builder'" class="space-y-6">
      <!-- Template Selector & Action Bar -->
      <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-md border border-purple-200">
              Template Builder
            </span>
            <span class="text-xs font-bold px-2 py-0.5 rounded-md" :class="editableTemplate.status === 'Published' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'">
              {{ editableTemplate.status }} (Version {{ editableTemplate.version }})
            </span>
          </div>
          <h3 class="text-xl font-extrabold text-slate-900 tracking-tight">
            Standardized Action Plan Template Builder
          </h3>
          <p class="text-xs text-slate-600 mt-0.5">
            Design and publish the standardized table columns, merged headers, and aesthetics. All councils in the fiscal year strictly follow this template.
          </p>
        </div>

        <div class="flex items-center gap-2.5 flex-wrap">
          <!-- Template Selector Dropdown -->
          <div class="flex items-center gap-2">
            <label class="text-xs font-bold text-slate-600">Select Template:</label>
            <select
              v-model="selectedTemplateId"
              class="px-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-blue-600 cursor-pointer"
            >
              <option v-for="t in templates" :key="t.id" :value="t.id">
                {{ t.name }} (v{{ t.version }}) - {{ t.status }}
              </option>
            </select>
          </div>

          <!-- Save Template Button -->
          <button
            type="button"
            @click="handleSaveTemplateChanges"
            class="px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            title="Save template changes, column layout, and styling"
          >
            <Save class="w-3.5 h-3.5" />
            <span>Save Template</span>
          </button>

          <!-- Publish Template Button -->
          <button
            type="button"
            @click="handlePublishTemplate"
            class="btn-primary btn-sm flex items-center gap-1.5 cursor-pointer"
            title="Publish template: Increments version and locks columns for all participating organizations"
          >
            <ShieldCheck class="w-4 h-4" />
            <span>Publish Template (v{{ (editableTemplate.version || 1) + 1 }})</span>
          </button>

          <!-- New Template Button -->
          <button
            type="button"
            @click="handleCreateNewTemplate"
            class="btn-secondary btn-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Plus class="w-3.5 h-3.5" />
            <span>New Template</span>
          </button>

          <!-- Duplicate Template Button -->
          <button
            type="button"
            @click="handleDuplicateTemplate(editableTemplate.id)"
            class="btn-secondary btn-sm flex items-center gap-1.5 cursor-pointer"
            title="Duplicate current template as a new version or draft"
          >
            <Copy class="w-3.5 h-3.5" />
            <span>Duplicate</span>
          </button>

          <!-- Delete Template Button -->
          <button
            type="button"
            @click="handleDeleteTemplate(editableTemplate.id)"
            :disabled="editableTemplate.isDefault || editableTemplate.id === 'TEMPLATE-MSUN-DEFAULT'"
            class="px-3 py-2 text-xs font-bold rounded-xl border border-rose-200 text-rose-700 bg-rose-50/80 hover:bg-rose-100 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1.5 cursor-pointer"
            :title="editableTemplate.isDefault || editableTemplate.id === 'TEMPLATE-MSUN-DEFAULT' ? 'Default system template cannot be deleted' : 'Permanently delete this template'"
          >
            <Trash2 class="w-3.5 h-3.5" />
            <span>Delete Template</span>
          </button>
        </div>
      </div>

      <!-- Main Template Configuration Columns (2 Columns: Left = Customizer, Right = Live Preview) -->
      <div class="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        <!-- LEFT: Template Settings & Column Management (5 Cols) -->
        <div class="xl:col-span-5 space-y-5">
          <!-- General Details & Aesthetics Card -->
          <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
            <div class="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 class="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <Palette class="w-4 h-4 text-rose-700" />
                <span>Header & Aesthetics Styling</span>
              </h4>
              <span class="text-[10px] text-slate-400">Reference: SenSSo FY 2027</span>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Template Name</label>
              <input
                v-model="editableTemplate.name"
                type="text"
                class="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Header Title Banner</label>
              <input
                v-model="editableTemplate.headerTitle"
                type="text"
                placeholder="PLAN OF ACTIVITIES"
                class="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
              <p class="text-[10px] text-slate-400 mt-1">Organization name & Period covered are automatically generated.</p>
            </div>

            <!-- Color Palette Presets -->
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1.5">Column Header Color</label>
              <div class="flex items-center gap-2 flex-wrap mb-2">
                <button
                  v-for="c in presetColors"
                  :key="c.hex"
                  type="button"
                  @click="editableTemplate.headerColor = c.hex"
                  class="w-7 h-7 rounded-lg border-2 transition-transform cursor-pointer shadow-xs"
                  :style="{ backgroundColor: c.hex }"
                  :class="editableTemplate.headerColor === c.hex ? 'scale-110 border-slate-900 ring-2 ring-blue-500/30' : 'border-white hover:scale-105'"
                  :title="c.name"
                />
              </div>
              <div class="flex items-center gap-2">
                <input
                  v-model="editableTemplate.headerColor"
                  type="color"
                  class="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 p-0.5 bg-white"
                />
                <input
                  v-model="editableTemplate.headerColor"
                  type="text"
                  class="w-28 px-2 py-1 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
                <span class="text-[11px] text-slate-500">Dark red (#800000) default</span>
              </div>
            </div>

            <!-- Header Text Color & Subheader Color -->
            <div class="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label class="block text-[11px] font-bold text-slate-700 mb-1">Header Text Color</label>
                <input
                  v-model="editableTemplate.headerTextColor"
                  type="text"
                  class="w-full px-2 py-1 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label class="block text-[11px] font-bold text-slate-700 mb-1">Sub-header BG Color</label>
                <input
                  v-model="editableTemplate.subHeaderColor"
                  type="text"
                  class="w-full px-2 py-1 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <!-- Toggles: Text Wrap & Borders -->
            <div class="flex items-center justify-between pt-2 border-t border-slate-100">
              <label class="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  v-model="editableTemplate.allowTextWrap"
                  type="checkbox"
                  class="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <span>Enable Text Wrapping in Cells</span>
              </label>

              <label class="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  v-model="editableTemplate.showBorders"
                  type="checkbox"
                  class="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <span>Table Grid Borders</span>
              </label>
            </div>
          </div>

          <!-- Column Structure & Field Types Card -->
          <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
            <div class="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h4 class="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Layers class="w-4 h-4 text-blue-700" />
                  <span>Columns & Field Types ({{ editableTemplate.columns.length }})</span>
                </h4>
                <p class="text-[10px] text-slate-400 mt-0.5">Month & Week grouped under Timeframe heading.</p>
              </div>

              <button
                type="button"
                @click="handleOpenAddColumnModal"
                class="btn-secondary btn-sm flex items-center gap-1 cursor-pointer"
              >
                <Plus class="w-3.5 h-3.5" />
                <span>Add Column</span>
              </button>
            </div>

            <!-- Columns List with Reorder Controls -->
            <div class="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              <div
                v-for="(col, idx) in editableTemplate.columns"
                :key="col.id || idx"
                class="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:bg-slate-100/60 transition-colors flex items-center justify-between gap-2.5 text-xs"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <span class="w-5 h-5 rounded-md bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                    {{ idx + 1 }}
                  </span>

                  <div class="min-w-0">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <strong class="text-slate-900 font-bold truncate">
                        {{ col.mainHeader }}
                        <span v-if="col.subHeader" class="text-slate-500 font-normal">({{ col.subHeader }})</span>
                      </strong>
                      <span v-if="col.isGrouped" class="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-800">
                        Grouped: {{ col.groupParent }}
                      </span>
                    </div>

                    <div class="flex items-center gap-2 text-[10px] text-slate-500 pt-0.5">
                      <span class="font-mono bg-white px-1 rounded border border-slate-200">{{ col.fieldType }}</span>
                      <span>•</span>
                      <span>{{ col.isRequired ? 'Required' : 'Optional' }}</span>
                      <span>•</span>
                      <span>{{ col.width || 'auto' }}</span>
                    </div>
                  </div>
                </div>

                <!-- Column Action Controls: Reorder & Delete -->
                <div class="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    @click="moveColumnUp(idx)"
                    :disabled="idx === 0"
                    class="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    title="Move column up"
                  >
                    <ArrowUp class="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    @click="moveColumnDown(idx)"
                    :disabled="idx === editableTemplate.columns.length - 1"
                    class="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    title="Move column down"
                  >
                    <ArrowDown class="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    @click="removeColumn(idx)"
                    class="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                    title="Remove column"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div class="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                @click="handleSaveTemplateChanges"
                class="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <Save class="w-3.5 h-3.5" />
                <span>Save Template</span>
              </button>
            </div>
          </div>
        </div>

        <!-- RIGHT: Live Interactive Preview Matching MSUN SenSSo Reference (7 Cols) -->
        <div class="xl:col-span-7 space-y-4">
          <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
              <div>
                <span class="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Live Matrix Preview
                </span>
                <h4 class="text-sm font-bold text-slate-900 mt-1">
                  MSUN Plan of Activities Table Layout
                </h4>
              </div>

              <span class="text-xs text-slate-400">
                Sample Council: <strong>SENIOR STUDENTS' SOCIETY (SenSSo)</strong> • FY 2027
              </span>
            </div>

            <!-- SPREADSHEET PREVIEW CONTAINER (SenSSo Screenshot Layout) -->
            <div class="mt-4 border border-slate-300 rounded-xl overflow-hidden shadow-xs bg-white">
              
              <!-- Top Official Header Block -->
              <div class="p-4 text-center border-b border-slate-300 bg-slate-50/50 space-y-1">
                <h3 class="text-base sm:text-lg font-black tracking-wider text-slate-900 uppercase">
                  {{ editableTemplate.headerTitle || 'PLAN OF ACTIVITIES' }}
                </h3>
                <h4 class="text-xs sm:text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                  SENIOR STUDENTS' SOCIETY (SenSSo)
                </h4>
                <p class="text-[11px] font-bold text-slate-600 uppercase tracking-widest">
                  PERIOD COVERED: JANUARY–DECEMBER 2027
                </p>
              </div>

              <!-- Live Table with Merged Headers & Custom Colors -->
              <div class="overflow-x-auto w-full">
                <table 
                  class="w-full text-left text-xs border-collapse min-w-[900px]"
                  :class="{ 'border border-slate-400': editableTemplate.showBorders !== false }"
                >
                  <!-- Themed Column Headers (Merged Timeframe Month & Week) -->
                  <thead>
                    <!-- Row 1: Merged Headers -->
                    <tr 
                      :style="{ backgroundColor: editableTemplate.headerColor, color: editableTemplate.headerTextColor }"
                      class="font-bold text-center border-b border-slate-400"
                    >
                      <!-- Timeframe Spanning 2 Sub-columns: Month and Week -->
                      <th 
                        colspan="2" 
                        class="p-2.5 border border-slate-400 font-extrabold uppercase tracking-wider text-[11px]"
                      >
                        Timeframe
                      </th>

                      <!-- Other columns spanning 2 rows -->
                      <th 
                        v-for="col in editableTemplate.columns.filter(c => !c.isGrouped)"
                        :key="col.id"
                        rowspan="2"
                        class="p-2.5 border border-slate-400 font-extrabold uppercase tracking-wider text-[11px]"
                        :style="{ width: col.width || 'auto' }"
                      >
                        {{ col.mainHeader }}
                      </th>
                    </tr>

                    <!-- Row 2: Sub-headers for grouped columns (Month, Week) -->
                    <tr 
                      :style="{ backgroundColor: editableTemplate.subHeaderColor || '#FCE5CD', color: editableTemplate.subHeaderTextColor || '#1E293B' }"
                      class="font-bold text-center text-[10px] border-b border-slate-400 uppercase"
                    >
                      <th class="p-1.5 border border-slate-400 w-24">Month</th>
                      <th class="p-1.5 border border-slate-400 w-28">Week</th>
                    </tr>
                  </thead>

                  <!-- Sample Rows reflecting SenSSo Plan of Activities -->
                  <tbody class="divide-y divide-slate-300">
                    <tr
                      v-for="(sample, sIdx) in samplePreviewActivities"
                      :key="sIdx"
                      class="hover:bg-slate-50 transition-colors"
                      :class="{ 'text-wrap': editableTemplate.allowTextWrap !== false }"
                    >
                      <!-- Month -->
                      <td class="p-2.5 border border-slate-300 text-center font-bold text-slate-800 bg-[#fce4ec]/40 align-middle">
                        {{ sample.timeframeMonth }}
                      </td>

                      <!-- Week -->
                      <td class="p-2.5 border border-slate-300 text-center font-medium text-slate-700 bg-[#fce4ec]/40 align-middle">
                        {{ sample.timeframeWeek }}
                      </td>

                      <!-- Programs and Activities -->
                      <td class="p-2.5 border border-slate-300 font-bold text-slate-900 align-middle">
                        {{ sample.title }}
                      </td>

                      <!-- Strategic Objectives -->
                      <td class="p-2.5 border border-slate-300 text-slate-700 text-[11px] leading-relaxed align-middle">
                        {{ sample.strategicObjectives }}
                      </td>

                      <!-- Expected Output -->
                      <td class="p-2.5 border border-slate-300 text-slate-700 text-[11px] leading-relaxed align-middle">
                        {{ sample.expectedOutput }}
                      </td>

                      <!-- Office -->
                      <td class="p-2.5 border border-slate-300 text-center font-bold text-rose-900 align-middle">
                        {{ sample.office }}
                      </td>

                      <!-- Line Item -->
                      <td class="p-2.5 border border-slate-300 text-slate-600 text-[11px] align-middle">
                        {{ sample.lineItemBudget }}
                      </td>

                      <!-- Budget Requirement -->
                      <td class="p-2.5 border border-slate-300 text-right font-black text-slate-900 align-middle">
                        ₱{{ sample.budget.toLocaleString() }}
                      </td>

                      <!-- Fund Source -->
                      <td class="p-2.5 border border-slate-300 text-center font-medium text-slate-700 text-[11px] align-middle">
                        {{ sample.fundSource }}
                      </td>

                      <!-- Person Assigned -->
                      <td class="p-2.5 border border-slate-300 font-medium text-slate-700 text-[11px] align-middle">
                        {{ sample.personAssigned }}
                      </td>
                    </tr>
                  </tbody>

                  <!-- Table Footer (Total Budget) -->
                  <tfoot>
                    <tr class="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-400">
                      <td colspan="7" class="p-2.5 border border-slate-300 text-right uppercase text-[11px]">
                        {{ editableTemplate.footerLabel || 'Total Projected Budget (excluding office supplies, allowances and wages)' }}:
                      </td>
                      <td class="p-2.5 border border-slate-300 text-right font-black text-sm text-emerald-900">
                        ₱155,000.00
                      </td>
                      <td colspan="2" class="p-2.5 border border-slate-300 bg-slate-50"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <!-- Template Governance Rules Notice -->
            <div class="mt-4 p-3.5 rounded-xl bg-purple-50/70 border border-purple-200 text-xs text-purple-900 space-y-1">
              <div class="flex items-center gap-1.5 font-bold">
                <ShieldCheck class="w-4 h-4 text-purple-700" />
                <span>Template Versioning & Lock Assurance</span>
              </div>
              <p class="text-[11px] text-purple-800 leading-relaxed">
                When a template is published, all organizations assigned to the corresponding fiscal year will render this exact table structure. <strong>Student organizations are strictly prevented from altering columns</strong>, ensuring institutional reporting uniformity.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ========================================================================= -->
    <!-- MODALS                                                                    -->
    <!-- ========================================================================= -->

    <!-- CREATE / EDIT FISCAL YEAR MODAL -->
    <div
      v-if="isCreateFyModalOpen"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto"
      @click.self="isCreateFyModalOpen = false"
    >
      <div class="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div class="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center font-bold">
              <Calendar class="w-5 h-5" />
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-900">
                {{ isEditingFy ? 'Edit Fiscal Year' : 'Create Fiscal Year' }}
              </h3>
              <p class="text-xs text-slate-500">Configure fiscal dates, submission window, and assigned template</p>
            </div>
          </div>
          <button
            @click="isCreateFyModalOpen = false"
            class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <!-- Fiscal Year Name -->
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Fiscal Year Name <span class="text-rose-500">*</span>
            </label>
            <input
              v-model="fyForm.name"
              type="text"
              placeholder="e.g. FY 2028 or FY 2029"
              class="w-full px-3.5 py-2 text-sm font-bold bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
            />
          </div>

          <!-- Fiscal Period Dates -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Start Date <span class="text-rose-500">*</span></label>
              <input
                v-model="fyForm.startDate"
                type="date"
                class="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">End Date <span class="text-rose-500">*</span></label>
              <input
                v-model="fyForm.endDate"
                type="date"
                class="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>
          </div>

          <!-- Submission Window Dates -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Submission Start Date <span class="text-rose-500">*</span></label>
              <input
                v-model="fyForm.submissionStartDate"
                type="date"
                class="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Submission Deadline <span class="text-rose-500">*</span></label>
              <input
                v-model="fyForm.submissionDeadline"
                type="date"
                class="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>
          </div>

          <!-- Initial Status -->
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Status <span class="text-rose-500">*</span>
            </label>
            <select
              v-model="fyForm.status"
              class="w-full px-3.5 py-2 text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="Draft">Draft (Internal planning)</option>
              <option value="Open">Open (Active for submissions)</option>
              <option value="Under Review">Under Review (Submissions closed, reviewing)</option>
              <option value="Finalized">Finalized (Approved and locked)</option>
              <option value="Archived">Archived (Preserved historical record)</option>
            </select>
          </div>

          <!-- Template Selection -->
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Action Plan Template <span class="text-rose-500">*</span>
            </label>
            <select
              v-model="fyForm.templateId"
              class="w-full px-3.5 py-2 text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option v-for="t in templates" :key="t.id" :value="t.id">
                {{ t.name }} (v{{ t.version }}) - {{ t.status }}
              </option>
            </select>
            <p class="text-[11px] text-slate-500 mt-1">
              All registered student organizations in this fiscal year will strictly follow the selected template.
            </p>
          </div>

          <!-- Notes / Description -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Theme / Strategic Notes</label>
            <textarea
              v-model="fyForm.notes"
              rows="2"
              placeholder="e.g. Advancing Academic Leadership, Climate Stewardship & Student Empowerment..."
              class="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            ></textarea>
          </div>
        </div>

        <div class="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            @click="isCreateFyModalOpen = false"
            class="btn-secondary cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="handleSaveFiscalYear"
            class="btn-primary cursor-pointer flex items-center gap-1.5"
          >
            <Save class="w-4 h-4" />
            <span>{{ isEditingFy ? 'Save Changes' : 'Create Fiscal Year' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ADD COLUMN MODAL (TEMPLATE BUILDER) -->
    <div
      v-if="isAddColumnModalOpen"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto"
      @click.self="isAddColumnModalOpen = false"
    >
      <div class="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div class="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <h3 class="text-base font-bold text-slate-900">Add Template Column</h3>
          <button
            @click="isAddColumnModalOpen = false"
            class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="p-6 space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Column Header Name <span class="text-rose-500">*</span></label>
            <input
              v-model="newColumnForm.mainHeader"
              type="text"
              placeholder="e.g. Target Participants, SDGs, etc."
              class="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Sub-Header (Optional)</label>
            <input
              v-model="newColumnForm.subHeader"
              type="text"
              placeholder="e.g. Category or description"
              class="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Field Type</label>
              <select
                v-model="newColumnForm.fieldType"
                class="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl cursor-pointer"
              >
                <option value="text">Single Line Text</option>
                <option value="multiline">Multiline Text</option>
                <option value="currency">Currency (PHP ₱)</option>
                <option value="number">Numeric</option>
                <option value="select">Dropdown Select</option>
                <option value="month-select">Month Selector</option>
                <option value="week-select">Week Selector</option>
                <option value="budget-breakdown">Budget Breakdown</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Text Alignment</label>
              <select
                v-model="newColumnForm.align"
                class="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl cursor-pointer"
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>
          </div>

          <div>
            <label class="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
              <input
                v-model="newColumnForm.isRequired"
                type="checkbox"
                class="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
              />
              <span>Mandatory Field (Required for Submission)</span>
            </label>
          </div>
        </div>

        <div class="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
          <button
            type="button"
            @click="isAddColumnModalOpen = false"
            class="btn-secondary btn-sm cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="handleSaveNewColumn"
            class="btn-primary btn-sm cursor-pointer"
          >
            Add Column
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Delete Fiscal Year Action Plan Confirmation Modal -->
  <div
    v-if="isDeleteFyModalOpen && fyToDelete"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    @click.self="isDeleteFyModalOpen = false"
  >
    <div class="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden transform transition-all">
      <div class="p-5 border-b border-slate-100 flex items-center justify-between bg-rose-50/60">
        <div class="flex items-center gap-2 text-rose-700">
          <div class="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">
            <Trash2 class="w-4 h-4 text-rose-600" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-slate-900">Delete Action Plan Folder</h3>
            <p class="text-[11px] text-slate-500 font-medium">Permanently remove empty repository</p>
          </div>
        </div>
        <button
          type="button"
          @click="isDeleteFyModalOpen = false"
          class="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="p-6 space-y-3">
        <p class="text-xs text-slate-600 leading-relaxed">
          Are you sure you want to delete the action plan repository and fiscal year folder for
          <strong class="text-slate-900 font-bold">{{ fyToDelete.name }}</strong>?
        </p>

        <div class="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
          <div class="font-bold flex items-center gap-1.5 text-amber-900">
            <span>Empty Folder Verification</span>
          </div>
          <p class="text-[11px] text-amber-700">
            This action plan folder is currently empty with 0 registered activities or proposals. This action cannot be undone.
          </p>
        </div>
      </div>

      <div class="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
        <button
          type="button"
          @click="isDeleteFyModalOpen = false"
          class="btn-secondary btn-sm cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          @click="confirmDeleteFy"
          class="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
        >
          <Trash2 class="w-3.5 h-3.5" />
          <span>Yes, Delete Folder</span>
        </button>
      </div>
    </div>
  </div>

  <!-- Activity Inspection Modal (Read-Only Audit for System Administrator) -->
  <ActivityReviewModal
    :is-open="isReviewModalOpen"
    :activity="selectedActivityForReview"
    :current-user="null"
    @close="isReviewModalOpen = false"
  />
</template>
