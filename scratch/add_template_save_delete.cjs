const fs = require('fs');
const path = require('path');

const filePath = path.resolve('src/components/AdminActionPlanView.vue');
let content = fs.readFileSync(filePath, 'utf8');

function replaceNormalized(src, search, replace) {
  const normSearch = search.replace(/\r\n/g, '\n');
  const normSrc = src.replace(/\r\n/g, '\n');
  if (!normSrc.includes(normSearch)) {
    console.error('Target not found:\n', normSearch.slice(0, 100));
    return src;
  }
  const isCRLF = src.includes('\r\n');
  const updated = normSrc.replace(normSearch, replace.replace(/\r\n/g, '\n'));
  return isCRLF ? updated.replace(/\n/g, '\r\n') : updated;
}

// 1. Add deleteTemplateFromDb import
const oldImport = `  getActionPlanTemplates,
  saveTemplateToDb,
  duplicateTemplateInDb,
  publishTemplateInDb`;

const newImport = `  getActionPlanTemplates,
  saveTemplateToDb,
  duplicateTemplateInDb,
  publishTemplateInDb,
  deleteTemplateFromDb`;

content = replaceNormalized(content, oldImport, newImport);

// 2. Add handleDeleteTemplate function
const oldPublishFunc = `const handlePublishTemplate = async () => {
  // Publishing bumps the version to protect historical records
  editableTemplate.value.status = 'Published';
  editableTemplate.value.version = (editableTemplate.value.version || 1) + 1;
  await saveTemplateToDb(editableTemplate.value);
  loadLocalData();
  emit('showToast', 'Template Published', \`Template "\${editableTemplate.value.name}" published as Version \${editableTemplate.value.version}. All organizations will follow this published schema.\`, 'success');
};`;

const newPublishWithDeleteFunc = `const handlePublishTemplate = async () => {
  // Publishing bumps the version to protect historical records
  editableTemplate.value.status = 'Published';
  editableTemplate.value.version = (editableTemplate.value.version || 1) + 1;
  await saveTemplateToDb(editableTemplate.value);
  loadLocalData();
  emit('showToast', 'Template Published', \`Template "\${editableTemplate.value.name}" published as Version \${editableTemplate.value.version}. All organizations will follow this published schema.\`, 'success');
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
    ? \`Template "\${target.name}" is currently assigned to \${assignedFy.name}. Are you sure you want to permanently delete it?\`
    : \`Are you sure you want to permanently delete template "\${target.name}"? This action cannot be undone.\`;

  if (!confirm(promptMsg)) {
    return;
  }

  try {
    await deleteTemplateFromDb(templateId);
    loadLocalData();
    const nextTemplate = templates.value[0] || DEFAULT_MSUN_ACTION_PLAN_TEMPLATE;
    selectedTemplateId.value = nextTemplate.id;
    emit('showToast', 'Template Deleted', \`Template "\${target.name}" was permanently removed.\`, 'info');
  } catch (err: any) {
    emit('showToast', 'Delete Failed', err.message || 'Could not delete template.', 'warning');
  }
};`;

content = replaceNormalized(content, oldPublishFunc, newPublishWithDeleteFunc);

// 3. Update top toolbar buttons in Template Builder
const oldToolbar = `          <button
            type="button"
            @click="handleCreateNewTemplate"
            class="btn-secondary btn-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Plus class="w-3.5 h-3.5" />
            <span>New Template</span>
          </button>

          <button
            type="button"
            @click="handleDuplicateTemplate(editableTemplate.id)"
            class="btn-secondary btn-sm flex items-center gap-1.5 cursor-pointer"
            title="Duplicate current template as a new version or draft"
          >
            <Copy class="w-3.5 h-3.5" />
            <span>Duplicate</span>
          </button>

          <button
            type="button"
            @click="handlePublishTemplate"
            class="btn-primary btn-sm flex items-center gap-1.5 cursor-pointer"
            title="Publish template: Increments version and locks columns for all participating organizations"
          >
            <ShieldCheck class="w-4 h-4" />
            <span>Publish Template (v{{ (editableTemplate.version || 1) + 1 }})</span>
          </button>`;

const newToolbar = `          <!-- Save Template Button -->
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
          </button>`;

content = replaceNormalized(content, oldToolbar, newToolbar);

// 4. Update the Save button at the bottom of the column manager to match
const oldBottomSave = `            <div class="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                @click="handleSaveTemplateChanges"
                class="btn-secondary btn-sm cursor-pointer flex items-center gap-1.5"
              >
                <Save class="w-3.5 h-3.5" />
                <span>Save Template Changes</span>
              </button>
            </div>`;

const newBottomSave = `            <div class="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                @click="handleSaveTemplateChanges"
                class="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <Save class="w-3.5 h-3.5" />
                <span>Save Template</span>
              </button>
            </div>`;

content = replaceNormalized(content, oldBottomSave, newBottomSave);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated AdminActionPlanView.vue with Save Template & Delete Template buttons!');

