<script setup lang="ts">
import { ref, computed } from 'vue';
import { 
  Printer, 
  Download, 
  FileDown, 
  X, 
  CheckCircle2, 
  Loader2, 
  FileText,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  Eye,
  Camera
} from 'lucide-vue-next';
import { Activity, ActivityAccomplishmentForm, AccomplishmentRow } from '../types';
import { 
  downloadAccomplishmentAsPdf, 
  downloadAccomplishmentAsHtml, 
  printAccomplishmentDocument, 
  generateAccomplishmentHtml,
  downloadAccomplishmentAsDocx,
  getAccomplishmentControlNo,
  resolvePreparedBySignatory,
  resolveReviewedBySignatory,
  resolveRecordedBySignatory
} from '../utils/accomplishmentExport';
import { MSUN_HEADER_IMG, MSUN_FOOTER_IMG } from '../utils/msunHeaderFooter';

const props = defineProps<{
  isOpen: boolean;
  activity: Activity | null;
  formOverrides?: Partial<ActivityAccomplishmentForm>;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const isDownloadingDocx = ref(false);
const isDownloadingPdf = ref(false);
const isDownloadingHtml = ref(false);
const showSuccessNotice = ref(false);
const successMessage = ref('');

const form = computed<Partial<ActivityAccomplishmentForm>>(() => {
  if (!props.activity) return {};
  return {
    ...(props.activity.accomplishmentForm || {}),
    ...(props.formOverrides || {})
  };
});

const title = computed(() => form.value.activityTitle || props.activity?.title || props.activity?.programActivity || 'Seniors Week 2026');
const controlNo = computed(() => getAccomplishmentControlNo(props.activity, form.value));
const officeCode = computed(() => form.value.officeCode || props.activity?.orgId || 'OSD');
const unitCollege = computed(() => form.value.unitCollege || props.activity?.orgId || 'OVCSAS');
const department = computed(() => form.value.department || (props.activity?.orgId === 'SSC' ? 'OSD' : 'Bachelor of Science in Information Technology'));
const datePrepared = computed(() => form.value.datePrepared || 'June 10, 2026');
const venue = computed(() => form.value.venue || props.activity?.venue || 'MSUN');
const budget = computed(() => Number(form.value.proposedBudget ?? props.activity?.budget ?? props.activity?.amount ?? 227725));
const budgetFormatted = computed(() => `₱${budget.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
const budgetSource = computed(() => form.value.budgetSource || props.activity?.fundSource || 'Personal Funds & OVCSAS Fund 01');
const dateImpl = computed(() => form.value.dateOfImplementation || props.activity?.startDate || 'July 13, 2026 - July 17, 2026');
const resultCode = computed(() => form.value.resultCode || 'None');
const email = computed(() => form.value.emailAddress || `${(props.activity?.orgId || 'osd').toLowerCase()}@msunaawan.edu.ph`);
const duration = computed(() => form.value.durationDays || '5 days');
const poeYear = computed(() => form.value.pdbYear || '2026');
const isPoeIncluded = computed(() => form.value.pdbIncluded !== false);

// Section A: Objectives
const objectives = computed(() => {
  if (form.value.objectives && form.value.objectives.length > 0) {
    return form.value.objectives;
  }
  return [
    'To provide graduating students with a meaningful and memorable celebration before their graduation.',
    'To strengthen camaraderie, unity, and fellowship among the members of Batch LUMINARA, Class of 2026.',
    'To promote student engagement, wellness, and appreciation through various recreational, social, and recognition activities.'
  ];
});

// Section B: Narrative Report
const narrativeParagraphs = computed(() => {
  const defaultText = `The Senior Students' Society (SenSSo) successfully conducted Seniors' Week 2026 from July 13 to July 17, 2026, in celebration of the graduating students of Batch LUMINARA, Class of 2026. The week-long celebration was organized to recognize the achievements, perseverance, and growth of the graduating students as they prepared to conclude their academic journey at Mindanao State University at Naawan. It also aimed to provide opportunities for graduating students to create meaningful memories, strengthen friendships, and foster camaraderie through various recreational, social, and recognition activities.

The celebration officially commenced on July 13, 2026, with the SenSSo Fun Run, which gathered graduating students, university employees, alumni, and other members of the university community in promoting physical wellness and healthy living. This was followed by a Zumba session, encouraging participants to remain active while enjoying the festive atmosphere. The morning activities continued with Larong Lahi, featuring traditional Filipino games such as Chinese Garter, Tug of War, Big Volleyball, and Tigsu2x. These activities promoted teamwork, sportsmanship, cooperation, and strengthened camaraderie among the participants.

On July 14 and 15, 2026, the university conducted a Job Fair and Pre-Employment Orientation in collaboration with the Office of Student Welfare (OSW) and SenSSo Officers. These activities equipped graduating students with essential knowledge and opportunities for employment after graduation. Representatives from various agencies and companies provided career opportunities, employment information, and guidance on preparing for the workforce, allowing students to gain valuable insights as they transitioned from academic life to professional careers.

On July 16, 2026, the graduating students participated in the Batch Pictorial, which was conducted according to the scheduled time slots of each college. This activity served as an important milestone for the graduating class, allowing students to commemorate their academic journey through their official graduation photographs. On the same day, the Releasing of Togas was facilitated to ensure that graduating students received their academic regalia in preparation for the upcoming commencement exercises. The distribution was carried out in an organized manner according to the designated schedule for each college.

The final day of the celebration, July 17, 2026, focused on graduation preparations and the culminating celebration. The TOGA Distribution was completed to accommodate students who had not yet claimed their academic attire. The graduating students also participated in OLMAK 2026, which provided an opportunity for fellowship and reflection before graduation. The week concluded with the much-awaited Seniors' Night 2026: 'Grad Ball: Midnight Blue,' where graduating students gathered for an evening of recognition, celebration, and fellowship. The event featured entertainment, interactive activities, and memorable moments that celebrated the accomplishments and shared experiences of Batch LUMINARA.

Overall, Seniors' Week 2026 successfully achieved its objectives of providing graduating students with a meaningful and memorable celebration before graduation, strengthening unity and fellowship among the members of Batch LUMINARA, and promoting student engagement, wellness, and appreciation through various activities. The active participation of the graduating class, together with the support of the university administration, partner offices, faculty members, and SenSSo Officers, contributed to the successful implementation of the week-long celebration.

The activity resulted in increased interaction, collaboration, and camaraderie among graduating students while creating lasting memories and reinforcing a strong sense of pride, appreciation, and belonging. More importantly, Seniors' Week 2026 served as a fitting culmination of the students' undergraduate journey, leaving Batch LUMINARA with meaningful experiences that they will cherish as they move forward into the next chapter of their lives.`;

  const raw = form.value.narrativeReport || defaultText;
  return raw.split('\n\n').filter(Boolean);
});

// Section C: Accomplishment Rows
const accomplishmentRows = computed<AccomplishmentRow[]>(() => {
  if (form.value.accomplishmentRows && form.value.accomplishmentRows.length > 0) {
    return form.value.accomplishmentRows.map((r, i) => ({
      objectiveNo: r.objectiveNo || i + 1,
      expectedOutput: r.expectedOutput || '',
      actualAccomplishment: r.actualAccomplishment || '',
      rating: r.rating?.toString().charAt(0) || '4'
    }));
  }
  return [
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
});

// Section D: Photos
const photoList = computed(() => {
  if (form.value.photoFiles && form.value.photoFiles.length > 0) {
    return form.value.photoFiles.slice(0, 4);
  }
  return [
    'Photo 1: SenSSo Fun Run & Zumba Wellness Activity',
    'Photo 2: Larong Lahi Traditional Sports Competition',
    'Photo 3: Pre-Employment Orientation & Job Fair',
    "Photo 4: Grad Ball 'Midnight Blue' Culminating Fellowship"
  ];
});

// Section E: Summary of Evaluation
const evaluationSummary = computed(() => {
  return form.value.summaryOfEvaluations || 'The evaluation of Seniors Week 2026 yielded an overall positive result, with 163 respondents expressing high satisfaction with the activity. Participants found the activity informative, relevant, meaningful, and well-organized. The activity assessment received strong positive feedback, particularly in terms of organization, relevance of topics, and increased knowledge and understanding. The venue and food services were also generally satisfactory, although some concerns were raised regarding ventilation, comfort, and facility conditions. Overall, the activity was considered successful and memorable, with participants commending the dedication, teamwork, and efforts of the organizers.';
});

// Section F: Remarks
const remarksComments = computed(() => {
  return form.value.remarksComments || 'Participants described Seniors Week 2026 as a successful, enjoyable, informative, and meaningful activity. They commended the officers and organizers for their dedication, teamwork, and hard work. Suggestions included improving venue ventilation by providing additional fans or air-conditioning, providing cold water and foldable fans, and installing a ceiling cover or tarp to address concerns regarding birds and droppings. Participants also suggested inviting resource speakers with extensive professional experience, offering more webinars for those unable to attend in person, ensuring equal attention to participants seated at the back, and providing additional tables.';
});

// Section G: Next Steps
const nextSteps = computed(() => {
  return form.value.nextStepsPlanOfAction || 'The organizers shall consider the recommendations and feedback gathered from the evaluation in the planning and implementation of future Seniors Week activities. Improvements shall focus on enhancing venue ventilation and comfort, ensuring a cleaner and more conducive event environment, providing adequate hydration and seating facilities, and exploring the provision of additional participant amenities such as fans. Future programs shall also consider inviting experienced and engaging resource speakers, offering online or hybrid participation options when appropriate, and ensuring inclusive engagement and equal attention to all participants. The positive practices in organization, teamwork, and program implementation shall likewise be sustained and further improved in succeeding activities.';
});

// Signatories (Clean names, position displayed under name without parentheses)
const preparedSig = computed(() => resolvePreparedBySignatory(
  form.value.preparedByName,
  form.value.preparedByTitle,
  props.activity?.proposedBy,
  props.activity?.orgId
));
const preparedByName = computed(() => preparedSig.value.name);
const preparedByTitle = computed(() => preparedSig.value.position);

const reviewedSig = computed(() => resolveReviewedBySignatory(
  form.value.reviewedByName,
  form.value.reviewedByTitle,
  props.activity?.adviserName,
  props.activity?.orgId
));
const reviewedByName = computed(() => reviewedSig.value.name);
const reviewedByTitle = computed(() => reviewedSig.value.position);

const recordedSig = computed(() => resolveRecordedBySignatory(
  form.value.recordedByName,
  form.value.recordedByTitle
));
const recordedByName = computed(() => recordedSig.value.name);
const recordedByTitle = computed(() => recordedSig.value.position);

const triggerSuccessNotice = (msg: string) => {
  successMessage.value = msg;
  showSuccessNotice.value = true;
  setTimeout(() => {
    showSuccessNotice.value = false;
  }, 4000);
};

// 1. PRIMARY EXPORT: DOCX Word Document
const handleDownloadDocx = async () => {
  if (!props.activity) return;
  isDownloadingDocx.value = true;
  try {
    await downloadAccomplishmentAsDocx(props.activity, form.value);
    triggerSuccessNotice('Official Accomplishment Report DOCX generated and downloaded successfully!');
  } catch (err) {
    console.error('DOCX download error:', err);
    triggerSuccessNotice('Failed to generate DOCX. Falling back to HTML/PDF.');
  } finally {
    isDownloadingDocx.value = false;
  }
};

// 2. PDF Support
const handleDownloadPdf = async () => {
  if (!props.activity) return;
  isDownloadingPdf.value = true;
  try {
    await downloadAccomplishmentAsPdf(props.activity, form.value);
    triggerSuccessNotice('Official Accomplishment Report PDF dialog launched.');
  } catch (err) {
    console.error('PDF download error:', err);
    downloadAccomplishmentAsHtml(props.activity, form.value);
    triggerSuccessNotice('Downloaded official report as standalone printable document.');
  } finally {
    isDownloadingPdf.value = false;
  }
};

// 3. Standalone HTML
const handleDownloadHtml = () => {
  if (!props.activity) return;
  isDownloadingHtml.value = true;
  try {
    downloadAccomplishmentAsHtml(props.activity, form.value);
    triggerSuccessNotice('Official Accomplishment Report HTML file downloaded.');
  } finally {
    setTimeout(() => {
      isDownloadingHtml.value = false;
    }, 600);
  }
};

// 4. Print
const handlePrint = () => {
  if (!props.activity) return;
  printAccomplishmentDocument(props.activity, form.value);
  triggerSuccessNotice('Print dialog triggered.');
};
</script>

<template>
  <div v-if="isOpen && activity" class="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
    <div class="bg-slate-100 rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-300 overflow-hidden my-4 flex flex-col max-h-[94vh]">
      
      <!-- Top Action Bar -->
      <div class="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800 gap-3 flex-wrap sm:flex-nowrap">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
            <FileText class="w-5 h-5" />
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                Official MSUN Form
              </span>
              <span class="text-[11px] text-slate-400 font-mono">{{ controlNo }}</span>
            </div>
            <h3 class="text-sm sm:text-base font-extrabold text-white truncate">
              Activity Accomplishment Report — Official Document
            </h3>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-2 shrink-0">
          <!-- 1. PRIMARY FORMAT: DOCX BUTTON (WORD) -->
          <button
            type="button"
            @click="handleDownloadDocx"
            :disabled="isDownloadingDocx"
            class="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-95"
            title="Download official editable Word (.docx) document"
          >
            <Loader2 v-if="isDownloadingDocx" class="w-4 h-4 animate-spin" />
            <FileText v-else class="w-4 h-4 text-white" />
            <span>{{ isDownloadingDocx ? 'Generating DOCX...' : 'Download Word (.docx)' }}</span>
          </button>

          <!-- 2. PDF Support -->
          <button
            type="button"
            @click="handleDownloadPdf"
            :disabled="isDownloadingPdf"
            class="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-95"
            title="Download official report as PDF file"
          >
            <Loader2 v-if="isDownloadingPdf" class="w-4 h-4 animate-spin" />
            <Download v-else class="w-4 h-4" />
            <span>PDF</span>
          </button>

          <!-- 3. Print Button -->
          <button
            type="button"
            @click="handlePrint"
            class="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-95"
            title="Print Accomplishment Report with university styling"
          >
            <Printer class="w-4 h-4" />
            <span>Print</span>
          </button>


          <!-- Close Modal -->
          <button
            type="button"
            @click="emit('close')"
            class="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer ml-1"
            title="Close viewer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- Success Notification Bar -->
      <div v-if="showSuccessNotice" class="bg-emerald-500 text-white px-5 py-2 text-xs font-bold flex items-center justify-between animate-in slide-in-from-top-2">
        <div class="flex items-center gap-2">
          <CheckCircle2 class="w-4 h-4" />
          <span>{{ successMessage }}</span>
        </div>
        <button @click="showSuccessNotice = false" class="text-white hover:text-emerald-100 p-0.5">
          <X class="w-3.5 h-3.5" />
        </button>
      </div>

      <!-- Paper Preview Container (Scrollable) -->
      <div class="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200/90 flex justify-center">
        <!-- Authentic White A4 Paper Sheet (210mm x 297mm) Matching Official MSUN Format -->
        <div 
          id="accomplishment-document-paper"
          class="bg-white text-black p-6 sm:p-10 rounded-sm shadow-xl max-w-[210mm] w-full min-h-[297mm] text-[10px] sm:text-[11px] leading-relaxed border border-slate-300 font-sans mx-auto"
        >
          
          <!-- 1. Institutional Header Banner -->
          <div class="mb-3">
            <img :src="MSUN_HEADER_IMG" alt="Mindanao State University at Naawan" class="w-full h-auto object-contain block" />
          </div>

          <!-- Triplicate Subheader Notice (Top Right) -->
          <div class="text-right text-[8px] sm:text-[8.5px] italic text-slate-600 leading-tight mb-2">
            <div class="font-bold not-italic text-black">{{ controlNo }}</div>
            <div>Print in A4. Produced in TRIPLICATE. One Copy for OME.</div>
            <div>A copy for the office conducting the activity.</div>
            <div>And a copy for admin document attachment.</div>
            <div>Follow the order of signatories for the process flow.</div>
          </div>

          <!-- Document Main Title -->
          <div class="text-center font-bold text-xs sm:text-sm uppercase tracking-wider mb-3">
            ACTIVITY ACCOMPLISHMENT REPORT
          </div>

          <!-- Unified Master Accomplishment Form Table (Every section is a row; inner tables integrated in row cells) -->
          <table class="w-full max-w-full border-collapse border border-black mb-4 text-[9.5px] sm:text-[10px] table-fixed box-border">
            <tbody>
              <!-- Row 1: Administrative Specifications (2 Columns) -->
              <tr>
                <!-- Left Column -->
                <td class="border border-black p-2 w-1/2 align-top break-words">
                  <div class="mb-1.5"><strong>Activity Title:</strong> &nbsp;<u>{{ title }}</u></div>
                  <div class="mb-1.5"><strong>Office Code:</strong> &nbsp;<u>{{ officeCode }}</u></div>
                  <div class="mb-1.5"><strong>Unit/College:</strong> &nbsp;<u>{{ unitCollege }}</u></div>
                  <div class="mb-1.5"><strong>Department:</strong> &nbsp;<u>{{ department }}</u></div>
                  <div class="mb-1.5"><strong>Result Code/OPCR/IPCR Code:</strong> &nbsp;<u>{{ resultCode }}</u></div>
                  <div class="mb-1.5"><strong>Date of Implementation:</strong> &nbsp;<u>{{ dateImpl }}</u></div>
                </td>

                <!-- Right Column -->
                <td class="border border-black p-2 w-1/2 align-top break-words">
                  <div class="mb-1.5"><strong>Date Prepared:</strong> &nbsp;<u>{{ datePrepared }}</u></div>
                  <div class="mb-1.5"><strong>Venue:</strong> &nbsp;<u>{{ venue }}</u></div>
                  <div class="mb-1.5"><strong>Proposed Budget:</strong> &nbsp;<u>{{ budgetFormatted }}</u></div>
                  <div class="mb-1.5"><strong>Budget Source:</strong> &nbsp;<u>{{ budgetSource }}</u></div>
                  <div class="mb-1.5">
                    <strong>Included in POE Year {{ poeYear }}:</strong> &nbsp;
                    <span>[{{ isPoeIncluded ? 'X' : ' ' }}] Yes</span> &nbsp;&nbsp;
                    <span>[{{ !isPoeIncluded ? 'X' : ' ' }}] No</span>
                  </div>
                  <div class="mb-1.5"><strong>Email Add.:</strong> &nbsp;<u class="break-all">{{ email }}</u></div>
                  <div class="mb-1.5"><strong>Duration:</strong> &nbsp;<u>{{ duration }}</u></div>
                </td>
              </tr>

              <!-- Row 2: Section A: Objectives -->
              <tr>
                <td colspan="2" class="border border-black p-2 align-top break-words">
                  <div class="font-bold text-[9.5px] sm:text-[10px] uppercase mb-1.5">A. OBJECTIVE/S</div>
                  <div class="pl-4 space-y-1 mb-1">
                    <div v-for="(obj, i) in objectives" :key="i" class="flex items-start gap-1.5">
                      <span class="font-bold">{{ i + 1 }}.</span>
                      <span class="text-justify break-words">{{ obj }}</span>
                    </div>
                  </div>
                </td>
              </tr>

              <!-- Row 3: Section B: Narrative Report -->
              <tr>
                <td colspan="2" class="border border-black p-2 align-top break-words">
                  <div class="font-bold text-[9.5px] sm:text-[10px] uppercase mb-1.5">B. NARRATIVE REPORT</div>
                  <div class="space-y-2 mb-1 text-justify leading-relaxed break-words">
                    <p v-for="(p, idx) in narrativeParagraphs" :key="idx" class="indent-6">
                      {{ p }}
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Row 4: Section C: Actual Accomplishment and Rating (Inner table integrated into cell) -->
              <tr>
                <td colspan="2" class="border border-black p-2 align-top break-words">
                  <div class="font-bold text-[9.5px] sm:text-[10px] uppercase mb-1.5">C. ACTUAL ACCOMPLISHMENT AND RATING</div>
                  <table class="w-full max-w-full border-collapse border border-black mb-1.5 text-[8.5px] sm:text-[9.5px] table-fixed box-border">
                    <thead>
                      <tr class="bg-slate-50">
                        <th rowspan="2" class="border border-black p-1.5 text-center font-bold w-[10%]">OBJECTIVE NO.</th>
                        <th rowspan="2" class="border border-black p-1.5 text-center font-bold w-[38%]">EXPECTED OUTPUT</th>
                        <th rowspan="2" class="border border-black p-1.5 text-center font-bold w-[40%]">ACTUAL ACCOMPLISHMENT</th>
                        <th colspan="4" class="border border-black p-1 text-center font-bold w-[12%]">ACCOMPLISHMENT RATING SCALE</th>
                      </tr>
                      <tr class="bg-slate-50">
                        <th class="border border-black p-1 text-center font-bold w-[3%]">4</th>
                        <th class="border border-black p-1 text-center font-bold w-[3%]">3</th>
                        <th class="border border-black p-1 text-center font-bold w-[3%]">2</th>
                        <th class="border border-black p-1 text-center font-bold w-[3%]">1</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="row in accomplishmentRows" :key="row.objectiveNo">
                        <td class="border border-black p-1.5 text-center font-bold align-top">
                          {{ row.objectiveNo }}
                        </td>
                        <td class="border border-black p-1.5 text-justify align-top leading-tight break-words">
                          {{ row.expectedOutput }}
                        </td>
                        <td class="border border-black p-1.5 text-justify align-top leading-tight break-words">
                          {{ row.actualAccomplishment }}
                        </td>
                        <td class="border border-black p-1 text-center font-bold text-xs align-middle">
                          <span v-if="String(row.rating).charAt(0) === '4'">✔</span>
                        </td>
                        <td class="border border-black p-1 text-center font-bold text-xs align-middle">
                          <span v-if="String(row.rating).charAt(0) === '3'">✔</span>
                        </td>
                        <td class="border border-black p-1 text-center font-bold text-xs align-middle">
                          <span v-if="String(row.rating).charAt(0) === '2'">✔</span>
                        </td>
                        <td class="border border-black p-1 text-center font-bold text-xs align-middle">
                          <span v-if="String(row.rating).charAt(0) === '1'">✔</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <!-- Rating Scale Legend -->
                  <div class="text-[8px] sm:text-[8.5px] leading-tight text-slate-700 mb-1">
                    <strong>Accomplishment Rating Scale:</strong><br/>
                    4 - Fully Achieved &nbsp;&nbsp;&nbsp;&nbsp; 3 - Largely Achieved &nbsp;&nbsp;&nbsp;&nbsp; 2 - Partially Achieved &nbsp;&nbsp;&nbsp;&nbsp; 1 - Not Achieved
                  </div>
                </td>
              </tr>

              <!-- Row 5: Section D: Photo Documentation (Integrated into cell) -->
              <tr>
                <td colspan="2" class="border border-black p-2 align-top break-words">
                  <div class="font-bold text-[9.5px] sm:text-[10px] uppercase mb-1.5">D. PHOTO DOCUMENTATION</div>
                  <div class="grid grid-cols-2 gap-3 mb-1">
                    <div 
                      v-for="(photo, pidx) in photoList" 
                      :key="pidx"
                      class="border border-slate-300 rounded-sm bg-slate-50/70 p-3 flex flex-col items-center justify-center min-h-[120px] text-center"
                    >
                      <div class="w-8 h-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center mb-1.5">
                        <Camera class="w-4 h-4" />
                      </div>
                      <span class="font-semibold text-[9px] sm:text-[9.5px] text-slate-800 leading-tight">
                        {{ photo }}
                      </span>
                      <span class="text-[8px] text-slate-500 mt-0.5">Photo Document #{{ pidx + 1 }}</span>
                    </div>
                  </div>
                </td>
              </tr>

              <!-- Row 6: Section E: Summary of Evaluation -->
              <tr>
                <td colspan="2" class="border border-black p-2 align-top break-words">
                  <div class="font-bold text-[9.5px] sm:text-[10px] uppercase mb-1.5">E. SUMMARY OF EVALUATION</div>
                  <p class="text-justify leading-relaxed mb-1">
                    {{ evaluationSummary }}
                  </p>
                </td>
              </tr>

              <!-- Row 7: Section F: Remarks / Comments / Suggestions -->
              <tr>
                <td colspan="2" class="border border-black p-2 align-top break-words">
                  <div class="font-bold text-[9.5px] sm:text-[10px] uppercase mb-1.5">F. REMARKS / COMMENTS / SUGGESTIONS</div>
                  <p class="text-justify leading-relaxed mb-1">
                    {{ remarksComments }}
                  </p>
                </td>
              </tr>

              <!-- Row 8: Section G: Next Steps / Plan of Action -->
              <tr>
                <td colspan="2" class="border border-black p-2 align-top break-words">
                  <div class="font-bold text-[9.5px] sm:text-[10px] uppercase mb-1.5">G. NEXT STEPS / PLAN OF ACTION</div>
                  <p class="text-justify leading-relaxed mb-1">
                    {{ nextSteps }}
                  </p>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Signatories Block (Outside the master table as requested) -->
          <div class="mt-6 mb-4">
            <div class="grid grid-cols-2 gap-8 mb-6">
              <!-- Prepared by -->
              <div>
                <p class="text-slate-600 mb-8 text-[9px]">Prepared by:</p>
                <p class="font-bold uppercase border-b border-black pb-0.5 text-center text-[9.5px]">{{ preparedByName }}</p>
                <p class="text-slate-600 text-center mt-1 text-[8.5px]">{{ preparedByTitle }}</p>
              </div>

              <!-- Reviewed by -->
              <div>
                <p class="text-slate-600 mb-8 text-[9px]">Reviewed by:</p>
                <p class="font-bold uppercase border-b border-black pb-0.5 text-center text-[9.5px]">{{ reviewedByName }}</p>
                <p class="text-slate-600 text-center mt-1 text-[8.5px]">{{ reviewedByTitle }}</p>
              </div>
            </div>

            <!-- Recorded by (Bottom Centered) -->
            <div class="max-w-xs mx-auto text-center">
              <p class="text-slate-600 mb-8 text-left text-[9px]">Recorded by:</p>
              <p class="font-bold uppercase border-b border-black pb-0.5 text-center text-[9.5px]">{{ recordedByName }}</p>
              <p class="text-slate-600 text-center mt-1 text-[8.5px]">{{ recordedByTitle }}</p>
            </div>
          </div>

          <!-- Institutional Footer Banner -->
          <div class="mt-8">
            <img :src="MSUN_FOOTER_IMG" alt="Mindanao State University at Naawan" class="w-full h-auto object-contain block" />
          </div>

        </div>
      </div>

      <!-- Modal Bottom Bar with Prominent DOCX Button -->
      <div class="px-5 py-3 bg-white border-t border-slate-200 flex items-center justify-between shrink-0 gap-3 flex-wrap sm:flex-nowrap">
        <div class="text-[11px] text-slate-500">
          Official format reproducing MSU at Naawan Accomplishment Report with seals, rating grid, photos, and 3-signatory routing.
        </div>

        <div class="flex items-center gap-2">
          <!-- Primary: DOCX Button -->
          <button
            type="button"
            @click="handleDownloadDocx"
            :disabled="isDownloadingDocx"
            class="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-95"
          >
            <Loader2 v-if="isDownloadingDocx" class="w-4 h-4 animate-spin" />
            <FileText v-else class="w-4 h-4 text-white" />
            <span>{{ isDownloadingDocx ? 'Generating DOCX...' : 'Download Word (.docx)' }}</span>
          </button>

          <!-- PDF Button -->
          <button
            type="button"
            @click="handleDownloadPdf"
            :disabled="isDownloadingPdf"
            class="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-400 text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-95"
          >
            <Loader2 v-if="isDownloadingPdf" class="w-4 h-4 animate-spin" />
            <Download v-else class="w-4 h-4" />
            <span>Download PDF</span>
          </button>

          <!-- Print Button -->
          <button
            type="button"
            @click="handlePrint"
            class="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 bg-white text-slate-800 hover:bg-slate-100 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-95"
          >
            <Printer class="w-4 h-4 text-blue-900" />
            <span>Print</span>
          </button>

          <button
            type="button"
            @click="emit('close')"
            class="btn-secondary"
          >
            Close
          </button>
        </div>
      </div>

    </div>
  </div>
</template>
