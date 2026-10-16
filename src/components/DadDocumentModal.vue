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
  FileCode
} from 'lucide-vue-next';
import { Activity, ActivityDesignForm } from '../types';
import { 
  downloadDadAsPdf, 
  downloadDadAsHtml, 
  printDadDocument, 
  generateDadHtml,
  downloadDadAsDocx
} from '../utils/dadExport';
import { MSUN_HEADER_IMG, MSUN_FOOTER_IMG } from '../utils/msunHeaderFooter';
import { isCollegeOrg } from '../data/initialData';

const props = defineProps<{
  isOpen: boolean;
  activity: Activity | null;
  formOverrides?: Partial<ActivityDesignForm>;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const isDownloadingDocx = ref(false);
const isDownloadingPdf = ref(false);
const isDownloadingHtml = ref(false);
const showSuccessNotice = ref(false);
const successMessage = ref('');

const isCollege = computed(() => {
  if (!props.activity) return false;
  return isCollegeOrg(props.activity.orgId);
});

const form = computed<Partial<ActivityDesignForm>>(() => {
  if (!props.activity) return {};
  return {
    ...(props.activity.designForm || {}),
    ...(props.formOverrides || {})
  };
});

const isWelcomingSample = computed(() => {
  const t = (props.activity?.title || props.activity?.programActivity || '').toLowerCase();
  const ft = (form.value.activityTitle || '').toLowerCase();
  return t.includes('welcoming') || ft.includes('welcoming');
});

const title = computed(() => form.value.activityTitle || props.activity?.programActivity || props.activity?.title || 'Detailed Activity Design');
const controlNo = computed(() => form.value.controlNumber || `MSUN-${props.activity?.orgId || 'SSC'}-DAD-${props.activity?.id || '001-2025-REV00'}`);
const officeCode = computed(() => form.value.officeCode || `OVCSAS-OSIPS-OSD-OSW-${props.activity?.orgId || 'SSC'}`);
const datePrepared = computed(() => form.value.datePrepared || props.activity?.submittedDate || 'July 25, 2025');
const unitCollege = computed(() => form.value.unitCollege || props.activity?.orgId || (isCollege.value ? `${props.activity?.orgId} College` : 'CBIT, CELS, CESS, CFMS'));
const department = computed(() => form.value.department || (isCollege.value ? `${props.activity?.orgId} Student Organizations` : 'Student Organizations & Services'));
const venue = computed(() => form.value.venue || props.activity?.venue || 'TSAC, Bandstand, FH, Court');
const dateImpl = computed(() => form.value.dateImplementation || props.activity?.startDate || 'August 11-15, 2025');
const budget = computed(() => Number(form.value.proposedBudget ?? props.activity?.budget ?? props.activity?.amount ?? 10000));
const budgetFormatted = computed(() => `₱${budget.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
const resultCode = computed(() => form.value.resultCode || props.activity?.strategicObjectives || 'OPCR-2027');
const budgetSource = computed(() => form.value.budgetSource || props.activity?.fundSource || `${props.activity?.orgId || 'SSC'} Funds`);
const email = computed(() => form.value.emailAddress || `${(props.activity?.orgId || 'ssc').toLowerCase()}@msunaawan.edu.ph, osd@msunaawan.edu.ph`);
const duration = computed(() => form.value.durationDays || (props.activity?.startDate && props.activity?.endDate && props.activity.startDate === props.activity.endDate ? '1 Day' : '5 Days'));

const rationale = computed(() => form.value.rationale || props.activity?.description ||
  (isWelcomingSample.value
    ? 'Welcoming Week 2025 is more than just a tradition—it\'s a vibrant celebration of new beginnings and shared aspirations at MSU-Naawan. Designed to warmly usher in our first-year students and re-ignite the spirit of returning MSUans, this week-long festivity blends fun, culture, and purpose through dynamic activities, creative showcases, and meaningful connections. It\'s a chance to discover the heart of our campus life, meet inspiring student leaders, and embrace the unique MSUan identity that unites us all. This isn\'t just a welcome—it\'s a spark that sets the tone for an empowered, inclusive, and unforgettable school year ahead.'
    : `The proposed activity "${title.value}" is designed to advance the organizational mission of ${props.activity?.orgId || 'the student organization'} and enrich the academic, leadership, and socio-cultural experience of MSU at Naawan students.`
  )
);

const objectives = computed(() => {
  if (form.value.objectivesList?.filter(Boolean).length) {
    return form.value.objectivesList.filter(Boolean);
  }
  if (form.value.objectives || props.activity?.strategicObjectives) {
    return (form.value.objectives || props.activity?.strategicObjectives || '').split('\n').filter(Boolean);
  }
  if (isWelcomingSample.value) {
    return [
      'To foster a sense of belonging and inclusivity among new and returning students by creating a warm and engaging campus environment through planned welcoming activities and peer interactions.',
      'To introduce first-year students to the university\'s culture, values, and support systems through structured orientations, campus tours, and interactive sessions led by student leaders and offices.',
      'To promote student engagement and involvement by providing opportunities for recognized student organizations and university offices to showcase their roles, services, and initiatives.'
    ];
  }
  return [
    `To successfully implement the core initiatives and objectives outlined for ${title.value}.`,
    'To encourage active student collaboration, skill development, and community engagement.',
    'To ensure transparent governance and documentation of student activities in MSU at Naawan.'
  ];
});

const outputs = computed(() => {
  if (form.value.expectedOutputsList?.filter(Boolean).length) {
    return form.value.expectedOutputsList.filter(Boolean);
  }
  if (form.value.expectedOutput || props.activity?.expectedOutput) {
    return (form.value.expectedOutput || props.activity?.expectedOutput || '').split('\n').filter(Boolean);
  }
  if (isWelcomingSample.value) {
    return [
      'Increased sense of connection and inclusion among students, as observed through active participation in welcoming activities, positive student feedback, and stronger peer-to-peer interactions.',
      'First-year students demonstrate familiarity with campus facilities, key offices, and support systems, as reflected in post-orientation assessments or feedback forms.',
      'Increased student interest and involvement in organizations and campus initiatives, as reflected in new member sign-ups, inquiries, and participation during organization fairs or showcase events.'
    ];
  }
  return [
    `Full participation of targeted student cohort (${props.activity?.targetParticipants || '200+'} students) in ${title.value}.`,
    'Documentation of accomplishments, attendee feedback ratings, and post-activity evaluations.',
    'Compliant liquidation and post-activity reporting submitted in accordance with university guidelines.'
  ];
});

const scheduleItems = computed(() => {
  if (form.value.scheduleItems?.length) return form.value.scheduleItems;
  if (isWelcomingSample.value) {
    return [
      { dateTime: '6:00AM – 7:00AM\n7:00AM – 7:30AM\n8:00AM – 10:00AM', activity: 'OPENING PROGRAM\n• Dance Exercise – Indak Kalaunan Performing Arts\n• Pamainit\n• Parade of Colleges – Officials, Deans, Coordinators, Faculty Members, and Students\n• Preliminaries – Koro Kaayad Kaligaon\n• Welcome Address – Ma\'am Arleen Uy\n• Intermission Number – MSUN Crimsons\n• Inspirational Message – Dr. Elnor Roa\n• College Cheering:\n  a) CBIT – All Societies and Executive Council w/ College Coordinator\n  b) CELS – All Societies and Executive Council w/ College Coordinator\n  c) CESS – All Societies and Executive Council w/ College Coordinator\n  d) CFMS – All Societies and Executive Council w/ College Coordinator\n• Special Number – MSUN Arnis Team\n• Closing Remarks – Ma\'am Rosevel Colegado\n• Official Opening of Booths & Organizations – MSUN Chancellor, Vice Chancellors, Deans, Coordinators, Faculty Members, Students\n\nEMCEES: Ms. Sandarka Langam & Mr. Frances Maliao', personInCharge: 'All SSC Officers, College Officers, and Organizations' },
      { dateTime: '1:00PM – 4:00PM', activity: 'CAMPUS TOUR FOR FRESHMEN STUDENTS\n• TSAC or Oval\n• MSUN Dorm\n• CFMS Building\n• Admin Building\n• E-Library\n• Student Lounge\n• Infirmary\n• NESB Building\n• MESC Building\n• CSE Building\n• IT Building\n• AVR\n• Research Division', personInCharge: 'All SSC Officers, College Officers, and Organizations' },
      { dateTime: '6:00PM – 8:30PM', activity: 'TARA, SHOW MO \'YAN, ARTE NATIN \'TO: A NIGHT OF TALENTS\n• Preliminaries – Audio-Visual Presentation\n• Welcoming Remarks – Ma\'am Arleen Uy\n• Message – Dr. Elnor Roa\n• Director\'s Speech – Ms. Sweet Kayla Hanasan\n• Reminders\n• "The Lagoon"\n• Closing Remarks – Ma\'am Nylette Jarales\n\nEMCEES: Ms. Ashly Joy Mercado', personInCharge: 'All SSC Officers, College Officers, and Organizations' },
      { dateTime: '8:00AM – 12:00NN', activity: 'DAY 2: CBIT GENERAL ASSEMBLY\n• Attendance\n• Preliminaries – Audio-Visual Presentation\n• Welcome Remarks\n• Oath-Taking and Introduction of Officers\n• Presentation of Activities for A.Y. 2025 - 2026\n• Open Forum\n• Recognition for Former College Officers', personInCharge: 'CBIT Executive Council' }
    ];
  }
  return [
    {
      dateTime: `${props.activity?.startDate || 'Day 1'}${props.activity?.startTime ? ` (${props.activity.startTime} – ${props.activity.endTime || 'End'})` : ''}`,
      activity: `${props.activity?.programActivity || props.activity?.title || 'Official Program'}\n• Registration & Preliminaries\n• Opening Message & Presentation\n• Core Activity Implementation\n• Open Forum & Evaluation`,
      personInCharge: form.value.submittedBy || props.activity?.proposedBy || `${props.activity?.orgId || 'Organization'} Leadership`
    }
  ];
});

const participantsText = computed(() => {
  if (form.value.participantsText) return form.value.participantsText;
  if (form.value.participants?.length) {
    return form.value.participants.map(p => (typeof p === 'string' ? p : `${p.name} (${p.position})`)).join(', ');
  }
  if (isWelcomingSample.value) {
    return '• All Enrolled MSUN Students\n• MSUN-IDS Tabodagat Dance Troupe\n  1. Samantha Nicole C. Dadulo\n  2. Alyana Monica B. Colegado\n  3. Denise Carl D. Montejo\n  4. David Howard M. Dadole\n  5. Nicole P. Gaa\n  6. Juniel L. Entera\n  7. Jaiho A. Laguit\n  8. Lovelyn Dayrose Godelieve Pogoy\n• MSUN-IDS Universal Dancers\n  1. Safia F. Alinabon\n  2. Annalou Jane G. Abitona\n  3. Marianne Gelli B. Barrera\n  4. Julia Nelly R. Gabe\n  5. Zueweca L. Mercado\n  6. Angel Missy P. Sacala\n  7. Kinshin C. Yaun\n  8. Sophie Krisray Relativo\n  9. Jan Nina Micaela J. Naldo\n  10. Donna Marie C. Canitan\n  11. Keizsha Bryanna G. Gases';
  }
  return `• Target Participants: ${props.activity?.targetParticipants || 150} students\n• ${props.activity?.orgId || 'Organization'} Officers and Members\n• Faculty Advisers, College Deans, and University Officials`;
});

const budgetItems = computed(() => {
  if (form.value.budgetaryRequirements?.length) return form.value.budgetaryRequirements;
  if (isWelcomingSample.value) {
    return [
      { item: '10', particulars: 'Cartolina (Yellow)', amount: 100, budgetSource: budgetSource.value },
      { item: '10', particulars: 'Cartolina (Blue)', amount: 100, budgetSource: budgetSource.value },
      { item: '10', particulars: 'Cartolina (Purple)', amount: 100, budgetSource: budgetSource.value },
      { item: '10', particulars: 'Cartolina (Green)', amount: 100, budgetSource: budgetSource.value },
      { item: '3', particulars: 'Illustration Board', amount: 105, budgetSource: budgetSource.value },
      { item: '2', particulars: 'Crepe Paper (Assorted Colors)', amount: 200, budgetSource: budgetSource.value },
      { item: '10', particulars: 'Photo Paper', amount: 450, budgetSource: budgetSource.value },
      { item: '10', particulars: 'Stick Glue', amount: 100, budgetSource: budgetSource.value },
      { item: '10', particulars: 'Double-Sided Tape', amount: 300, budgetSource: budgetSource.value },
      { item: '1', particulars: 'SSC Banner', amount: 800, budgetSource: budgetSource.value },
      { item: '50', particulars: 'Bantings: Charrol (White)', amount: 1500, budgetSource: budgetSource.value },
      { item: '6', particulars: 'Balloons (Assorted Colors)', amount: 420, budgetSource: budgetSource.value },
      { item: '5', particulars: 'Lace Blue', amount: 350, budgetSource: budgetSource.value },
      { item: '4', particulars: 'Ribbons (Yellow & Blue)', amount: 600, budgetSource: budgetSource.value },
      { item: '2', particulars: 'Tarpaulin (8x10)', amount: 2000, budgetSource: budgetSource.value },
      { item: '3', particulars: 'Straw Roll', amount: 255, budgetSource: budgetSource.value },
      { item: '50', particulars: 'Water', amount: 1250, budgetSource: budgetSource.value },
      { item: '1', particulars: 'Tire Wire', amount: 500, budgetSource: budgetSource.value }
    ];
  }
  return [
    {
      item: '1',
      particulars: props.activity?.lineItemBudget || `Program Materials and Logistics for ${title.value}`,
      amount: budget.value,
      budgetSource: budgetSource.value
    }
  ];
});

const totalBudgetCalculated = computed(() => {
  const sum = budgetItems.value.reduce((acc, b) => acc + (Number(b.amount) || 0), 0);
  return `₱${sum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
});

const isActivityInCampus = computed(() => (form.value.activityType || 'In-Campus') === 'In-Campus');

const venueRows = computed(() => {
  if (form.value.venueRows?.length) return form.value.venueRows;
  if (isWelcomingSample.value) {
    return [
      { venue: 'Bandstand', specifiedDate: 'August 11 - 15, 2025', duration: '6:00AM – 9:00PM', remarks: '', signatureStatus: '' },
      { venue: 'Function House', specifiedDate: 'August 11 - 15, 2025', duration: '6:00AM – 9:00PM', remarks: '', signatureStatus: '' },
      { venue: 'MSUN Court', specifiedDate: 'August 11 - 15, 2025', duration: '6:00AM – 9:00PM', remarks: '', signatureStatus: '' },
      { venue: 'TSAC', specifiedDate: 'August 11 - 15, 2025', duration: '6:00AM – 9:00PM', remarks: '', signatureStatus: '' }
    ];
  }
  return [
    {
      venue: venue.value,
      specifiedDate: dateImpl.value,
      duration: duration.value,
      remarks: 'Requisitioned for activity venue',
      signatureStatus: ''
    }
  ];
});

const campusFacilities = computed(() => {
  if (form.value.campusFacilities?.length) return form.value.campusFacilities;
  if (isWelcomingSample.value) {
    return [
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
    ];
  }
  return [
    {
      quantity: 1,
      description: 'Sound System (Microphones & Speakers)',
      duration: duration.value,
      remarks: 'Sound system for venue',
      signatureStatus: ''
    },
    {
      quantity: 50,
      description: 'Monobloc Chairs',
      duration: duration.value,
      remarks: 'For student attendees',
      signatureStatus: ''
    }
  ];
});

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

const userSdgs = computed(() => form.value.sdgsAchieved || []);

const preparedByName = computed(() => form.value.submittedBy || props.activity?.proposedBy || 'JOHN NICOLE C. CABATINGAN');
const preparedByRole = computed(() => form.value.submittedByRole || (props.activity?.proposedBy?.includes('(') ? props.activity.proposedBy.split('(')[1]?.replace(')', '') : `SSC ${props.activity?.orgId || 'CFMS'} Senator, Planning and Development`));

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
    await downloadDadAsDocx(props.activity, form.value);
    triggerSuccessNotice('Official DAD DOCX document generated and downloaded successfully!');
  } catch (err) {
    console.error('DOCX download error:', err);
    triggerSuccessNotice('Failed to generate DOCX. Falling back to HTML/PDF.');
  } finally {
    isDownloadingDocx.value = false;
  }
};

// 2. SECONDARY EXPORTS
const handleDownloadPdf = async () => {
  if (!props.activity) return;
  isDownloadingPdf.value = true;
  try {
    await downloadDadAsPdf(props.activity, form.value);
    triggerSuccessNotice('Official DAD PDF downloaded successfully.');
  } catch (err) {
    console.error('PDF download error:', err);
    downloadDadAsHtml(props.activity, form.value);
    triggerSuccessNotice('Downloaded official DAD as standalone printable document.');
  } finally {
    isDownloadingPdf.value = false;
  }
};

const handleDownloadHtml = () => {
  if (!props.activity) return;
  isDownloadingHtml.value = true;
  try {
    downloadDadAsHtml(props.activity, form.value);
    triggerSuccessNotice('Official DAD HTML file downloaded.');
  } finally {
    setTimeout(() => {
      isDownloadingHtml.value = false;
    }, 600);
  }
};

const handlePrint = () => {
  if (!props.activity) return;
  printDadDocument(props.activity, form.value);
  triggerSuccessNotice('Print dialog triggered.');
};
</script>

<template>
  <div v-if="isOpen && activity" class="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
    <div class="bg-slate-100 rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-300 overflow-hidden my-4 flex flex-col max-h-[94vh]">
      
      <!-- Top Action Bar -->
      <div class="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800 gap-3 flex-wrap sm:flex-nowrap">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
            <FileText class="w-5 h-5" />
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                Official MSUN Form
              </span>
              <span class="text-[11px] text-slate-400 font-mono">{{ controlNo }}</span>
            </div>
            <h3 class="text-sm sm:text-base font-extrabold text-white truncate">
              Detailed Activity Design (DAD) — Official Document
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
            title="Download official DAD as PDF file"
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
            title="Print DAD Form with university styling"
          >
            <Printer class="w-4 h-4" />
            <span>Print</span>
          </button>

          <!-- 4. HTML File -->
          <button
            type="button"
            @click="handleDownloadHtml"
            :disabled="isDownloadingHtml"
            class="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-95"
            title="Download standalone HTML document"
          >
            <FileDown class="w-3.5 h-3.5" />
            <span class="hidden sm:inline">HTML</span>
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
        <!-- Authentic White A4 Paper Sheet Matching Screenshots 1-8 -->
        <div 
          id="dad-document-paper"
          class="bg-white text-black p-6 sm:p-10 rounded-sm shadow-xl max-w-[820px] w-full text-[10px] sm:text-[11px] leading-relaxed border border-slate-300 font-sans"
        >
          
          <!-- 1. Institutional Header Banner (Picture 1) -->
          <div class="mb-3">
            <img :src="MSUN_HEADER_IMG" alt="Mindanao State University at Naawan" class="w-full h-auto object-contain block" />
          </div>

          <!-- Triplicate Subheader Notice (Top Right of Page 1) -->
          <div class="text-right text-[8px] sm:text-[8.5px] italic text-slate-600 leading-tight mb-2">
            <div>{{ controlNo }}</div>
            <div>Produced in TRIPLICATE. One Copy for OME.</div>
            <div>A copy for the office conducting the activity.</div>
            <div>And a copy for admin document attachment.</div>
            <div>Follow the order of signatories for the process flow.</div>
          </div>

          <!-- Document Main Title -->
          <div class="text-center font-bold text-xs sm:text-sm uppercase tracking-wider mb-3">
            DETAILED ACTIVITY DESIGN
          </div>

          <!-- 2. Administrative Specifications (Screenshots 1 & 2) -->
          <table class="w-full border-collapse border border-black mb-3 text-[9.5px] sm:text-[10px]">
            <tbody>
              <tr>
                <!-- Left Column -->
                <td class="border border-black p-2 w-1/2 align-top">
                  <div class="mb-1.5"><strong>Activity Title:</strong> &nbsp;<strong>{{ title }}</strong></div>
                  <div class="mb-1.5"><strong>Office Code:</strong> &nbsp;<u>{{ officeCode }}</u></div>
                  <div class="mb-1.5"><strong>Unit / College:</strong> &nbsp;<u>{{ unitCollege }}</u></div>
                  
                  <div class="mt-2">
                    <strong>Department:</strong>
                    <div v-if="!isWelcomingSample && form.department" class="mt-1 pl-2 text-[9.5px]">
                      <u>{{ form.department }}</u>
                    </div>
                    <div v-else class="mt-1 pl-2 text-[9px]">
                      <div class="font-bold">• CBIT</div>
                      <div class="pl-3">
                        a) CBIT Executive Council<br/>
                        b) Junior Marketing Association (JMA)<br/>
                        c) Junior People Management Association of the Philippines (JPMAP)<br/>
                        d) Society of Hotel and Restaurant Management Students (SOHRMS)<br/>
                        e) Body of Information Technology Students (BITS)
                      </div>
                      <div class="font-bold mt-1">• CELS</div>
                      <div class="pl-3">
                        a) Agriculture, Forestry, and Environmental Sciences Student Organization (AFESSO)<br/>
                        b) Forestry (Floresta) Society<br/>
                        c) Student Institute of Noble Agronomist (SINAG)<br/>
                        d) Environmental Science Society (ESS)<br/>
                        e) Animal Science Student Society (ASSS)<br/>
                        f) United Nursing Students' Association (UNSA)
                      </div>
                      <div class="font-bold mt-1">• CESS</div>
                      <div class="pl-3">
                        a) United Neutral Innovative for CESS (UNICESS)<br/>
                        b) Circle of English Majors (CEM)<br/>
                        c) The Buddy of Science Educators (TBSE)<br/>
                        d) Mathematics Educators Society Hub (MESH)<br/>
                        e) Guild of Elementary Educators (GUEST)
                      </div>
                      <div class="font-bold mt-1">• CFMS</div>
                      <div class="pl-3">
                        a) Fisheries and Marine Science Students Executive Council<br/>
                        b) School of Marine Fisheries and Technology Science Society (SMFTSS)<br/>
                        c) Marine Science Society (MSS)
                      </div>
                      <div class="font-bold mt-1">• ORGANIZATIONS</div>
                      <div class="pl-3">
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
                  </div>
                </td>

                <!-- Right Column -->
                <td class="border border-black p-2 w-1/2 align-top">
                  <div class="mb-1.5"><strong>Date Prepared:</strong> &nbsp;<u>{{ datePrepared }}</u></div>
                  <div class="mb-1.5"><strong>Venue:</strong> &nbsp;<u>{{ venue }}</u></div>
                  <div class="mb-1.5"><strong>Proposed Budget:</strong> &nbsp;<strong><u>{{ budgetFormatted }}</u></strong></div>
                  <div class="mb-1.5"><strong>Budget Source:</strong> &nbsp;<u>{{ budgetFormatted }} – {{ budgetSource }}</u></div>
                  <div class="mt-2 mb-2">
                    <strong>Included in the POE Year:</strong> &nbsp;&nbsp;
                    <strong>Yes</strong> {{ form.includedInPdsStatus !== 'No' ? '☑' : '☐' }} &nbsp;&nbsp;&nbsp;
                    <strong>No</strong> {{ form.includedInPdsStatus === 'No' ? '☑' : '☐' }}
                  </div>
                  <div class="mt-3 mb-1.5"><strong>Result Code / OPCR/IPCR Code:</strong> &nbsp;<u>{{ resultCode || '_________________' }}</u></div>
                  <div class="mb-1.5"><strong>Email Add.:</strong> &nbsp;<u class="text-[#002060]">{{ email }}</u></div>
                  <div class="mb-1.5"><strong>Date of Implementation:</strong> &nbsp;<u>{{ dateImpl }}</u></div>
                  <div class="mb-1.5"><strong>Duration <em>(in days)</em>:</strong> &nbsp;<u>{{ duration }}</u></div>
                </td>
              </tr>
              <!-- Row 2: Section A: Rationale -->
              <tr>
                <td colspan="2" class="border border-black p-2.5 align-top">
                  <div class="font-bold text-xs uppercase mb-1">A. &nbsp;&nbsp; Rationale:</div>
                  <div class="text-justify px-1 leading-relaxed text-slate-900 indent-6">
                    {{ rationale }}
                  </div>
                </td>
              </tr>

              <!-- Row 3: Section B: Objectives -->
              <tr>
                <td colspan="2" class="border border-black p-2.5 align-top">
                  <div class="font-bold text-xs uppercase mb-1">B. &nbsp;&nbsp; Objectives:</div>
                  <div class="px-1 space-y-1">
                    <div v-for="(obj, idx) in objectives" :key="idx" class="flex items-start gap-1.5">
                      <span class="font-bold">▪</span>
                      <span>{{ obj }}</span>
                    </div>
                  </div>
                </td>
              </tr>

              <!-- Row 4: Section C: Expected Output -->
              <tr>
                <td colspan="2" class="border border-black p-2.5 align-top">
                  <div class="font-bold text-xs uppercase mb-1">C. &nbsp;&nbsp; Expected Output:</div>
                  <div class="px-1 space-y-1">
                    <div v-for="(out, idx) in outputs" :key="idx" class="flex items-start gap-1.5">
                      <span class="font-bold">▪</span>
                      <span>{{ out }}</span>
                    </div>
                  </div>
                </td>
              </tr>

              <!-- Row 5: Section D: Detail of Activities -->
              <tr>
                <td colspan="2" class="border border-black p-2.5 align-top">
                  <div class="font-bold text-xs uppercase mb-1">D. &nbsp;&nbsp; Detail of Activities:</div>
                  <div class="italic text-[10px] mb-1.5">Program of Activities:</div>
                  <table class="w-full border-collapse border border-black text-[9px] sm:text-[9.5px]">
                    <thead>
                      <tr class="bg-slate-100">
                        <th class="border border-black p-1.5 text-center w-[25%] font-bold">DATE/TIME</th>
                        <th class="border border-black p-1.5 text-center w-[50%] font-bold">ACTIVITY</th>
                        <th class="border border-black p-1.5 text-center w-[25%] font-bold">PERSON-IN-CHARGE</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(item, idx) in scheduleItems" :key="idx">
                        <td class="border border-black p-1.5 whitespace-pre-line align-top">{{ item.dateTime }}</td>
                        <td class="border border-black p-1.5 whitespace-pre-line align-top">
                          <div v-for="(line, lidx) in item.activity.split('\n')" :key="lidx" :class="{ 'bg-yellow-200 font-bold px-1 inline-block': line.includes('EMCEE') }">
                            {{ line }}
                          </div>
                        </td>
                        <td class="border border-black p-1.5 align-top">{{ item.personInCharge }}</td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>

              <!-- Row 6: Section E: Participants -->
              <tr>
                <td colspan="2" class="border border-black p-2.5 align-top">
                  <div class="font-bold text-xs uppercase mb-1">E. &nbsp;&nbsp; Participants:</div>
                  <div class="px-1 whitespace-pre-line text-slate-800 leading-relaxed text-[9.5px]">
                    {{ participantsText }}
                  </div>
                </td>
              </tr>

              <!-- Row 7: Section F: Budgetary Requirements -->
              <tr>
                <td colspan="2" class="border border-black p-2.5 align-top">
                  <div class="font-bold text-xs uppercase mb-1">F. &nbsp;&nbsp; Budgetary Requirements:</div>
                  <table class="w-full border-collapse border border-black text-[9px] sm:text-[9.5px]">
                    <thead>
                      <tr class="bg-slate-100">
                        <th class="border border-black p-1.5 text-center w-[15%] font-bold">ITEM/S</th>
                        <th class="border border-black p-1.5 text-center w-[45%] font-bold">PARTICULARS</th>
                        <th class="border border-black p-1.5 text-right w-[20%] font-bold">AMOUNT</th>
                        <th class="border border-black p-1.5 text-center w-[20%] font-bold">BUDGET SOURCE</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(b, idx) in budgetItems" :key="idx">
                        <td class="border border-black p-1.5 text-center">{{ b.item }}</td>
                        <td class="border border-black p-1.5">{{ b.particulars }}</td>
                        <td class="border border-black p-1.5 text-right font-bold">₱{{ Number(b.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
                        <td class="border border-black p-1.5 text-center">{{ b.budgetSource || budgetSource }}</td>
                      </tr>
                      <tr class="bg-slate-50 font-bold">
                        <td colspan="2" class="border border-black p-1.5 text-right uppercase">TOTAL:</td>
                        <td class="border border-black p-1.5 text-right text-[#002060] font-black">{{ totalBudgetCalculated }}</td>
                        <td class="border border-black p-1.5"></td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>

              <!-- Row 8: Section G: Type of Activity & Venue/Campus Facilities -->
              <tr>
                <td colspan="2" class="border border-black p-2.5 align-top">
                  <div class="font-bold text-xs uppercase mb-1">G. &nbsp;&nbsp; Type of Activity:</div>
                  <div class="px-3 mb-2">
                    In-Campus &nbsp;{{ isActivityInCampus ? '☑' : '☐' }} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                    Off-Campus &nbsp;{{ !isActivityInCampus ? '☑' : '☐' }}
                  </div>
                  <div class="italic text-[9.5px] mb-1">Fill-out below for In-Campus Activity only:</div>
                  <div class="font-bold text-[10px] mb-1">Venue/s:</div>
                  <table class="w-full border-collapse border border-black mb-3 text-[9px] sm:text-[9.5px]">
                    <thead>
                      <tr class="bg-slate-100">
                        <th class="border border-black p-1.5 text-center w-[25%] font-bold">VENUE</th>
                        <th class="border border-black p-1.5 text-center w-[22%] font-bold">SPECIFIED DATE</th>
                        <th class="border border-black p-1.5 text-center w-[18%] font-bold">DURATION</th>
                        <th class="border border-black p-1.5 text-center w-[17%] font-bold">REMARKS</th>
                        <th class="border border-black p-1.5 text-center w-[18%] font-bold">SIGNATURE</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(v, idx) in venueRows" :key="idx">
                        <td class="border border-black p-1.5 font-bold">{{ v.venue }}</td>
                        <td class="border border-black p-1.5">{{ v.specifiedDate }}</td>
                        <td class="border border-black p-1.5">{{ v.duration }}</td>
                        <td class="border border-black p-1.5">{{ v.remarks }}</td>
                        <td class="border border-black p-1.5 text-center align-bottom h-9">
                          <span v-if="v.signatureStatus">{{ v.signatureStatus }}</span>
                          <div v-else class="w-3/4 mx-auto border-b border-black"></div>
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <!-- Campus Facilities -->
                  <div class="font-bold text-[10px] mt-3 mb-1">Campus Facilities:</div>
                  <table class="w-full border-collapse border border-black mb-1 text-[9px] sm:text-[9.5px]">
                    <thead>
                      <tr class="bg-slate-100">
                        <th class="border border-black p-1.5 text-center w-[12%] font-bold">QUANTITY</th>
                        <th class="border border-black p-1.5 text-center w-[35%] font-bold">DESCRIPTION</th>
                        <th class="border border-black p-1.5 text-center w-[18%] font-bold">DURATION</th>
                        <th class="border border-black p-1.5 text-center w-[18%] font-bold">REMARKS</th>
                        <th class="border border-black p-1.5 text-center w-[17%] font-bold">SIGNATURE</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(fac, idx) in campusFacilities" :key="idx">
                        <td class="border border-black p-1.5 text-center font-bold">{{ fac.quantity }}</td>
                        <td class="border border-black p-1.5">{{ fac.description }}</td>
                        <td class="border border-black p-1.5 whitespace-pre-line">{{ fac.duration }}</td>
                        <td class="border border-black p-1.5 whitespace-pre-line">{{ fac.remarks }}</td>
                        <td class="border border-black p-1.5 text-center align-bottom h-9">
                          <span v-if="fac.signatureStatus">{{ fac.signatureStatus }}</span>
                          <div v-else class="w-3/4 mx-auto border-b border-black"></div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>

              <!-- Row 9: Section H: SDGs Achieved -->
              <tr>
                <td colspan="2" class="border border-black p-2.5 align-top">
                  <div class="font-bold text-xs uppercase mb-2">
                    H. &nbsp;&nbsp; Sustainable Development Goals Achieved
                  </div>
                  <table class="w-full border-collapse border border-black text-[9px] sm:text-[9.5px]">
                    <tbody>
                      <tr v-for="(sdg1, idx) in ALL_SDGS.slice(0, 9)" :key="idx">
                        <td class="border border-black p-1.5 w-1/2">
                          <span class="font-bold">{{ userSdgs.some(s => s.toLowerCase().includes(sdg1.toLowerCase().split('-')[0].trim())) ? '☑' : '☐' }}</span>
                          &nbsp;<strong>{{ sdg1 }}</strong>
                        </td>
                        <td class="border border-black p-1.5 w-1/2">
                          <template v-if="ALL_SDGS.slice(9)[idx]">
                            <span class="font-bold">{{ userSdgs.some(s => s.toLowerCase().includes(ALL_SDGS.slice(9)[idx].toLowerCase().split('-')[0].trim())) ? '☑' : '☐' }}</span>
                            &nbsp;<strong>{{ ALL_SDGS.slice(9)[idx] }}</strong>
                          </template>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>

              <!-- Row 10: 6-Block Approval Signatories -->
              <tr>
                <td colspan="2" class="border border-black p-4 align-top">
                  <div class="grid grid-cols-2 gap-y-10 gap-x-12 text-[10px] sm:text-[10.5px]">
                    <!-- (1) Prepared by -->
                    <div>
                      <p class="text-slate-600 mb-8">(1) &nbsp;&nbsp; Prepared by:</p>
                      <p class="font-bold uppercase border-b border-black pb-0.5 text-center">{{ preparedByName }}</p>
                      <p class="text-slate-600 text-center mt-1 text-[9px]">{{ preparedByRole }}</p>
                    </div>

                    <!-- (4) Funds Cleared by -->
                    <div>
                      <p class="text-slate-600 mb-8">(4) &nbsp;&nbsp; Funds Cleared by:</p>
                      <p class="font-bold uppercase border-b border-black pb-0.5 text-center">RHODA D. PERPETUA, CPA</p>
                      <p class="text-slate-600 text-center mt-1 text-[9px]">Vice Chancellor for Administration and Finance</p>
                    </div>

                    <!-- (2) Reviewed by -->
                    <div>
                      <p class="text-slate-600 mb-8">(2) &nbsp;&nbsp; Reviewed by:</p>
                      <p class="font-bold uppercase border-b border-black pb-0.5 text-center">SYLVIA C. LABIAL, RPM</p>
                      <p class="text-slate-600 text-center mt-1 text-[9px]">Director, OSD</p>
                    </div>

                    <!-- (5) Approved by -->
                    <div>
                      <p class="text-slate-600 mb-8">(5) &nbsp;&nbsp; Approved by:</p>
                      <p class="font-bold uppercase border-b border-black pb-0.5 text-center">ELNOR C. ROA, PhD</p>
                      <p class="text-slate-600 text-center mt-1 text-[9px]">Chancellor</p>
                    </div>

                    <!-- (3) Endorsed by -->
                    <div>
                      <p class="text-slate-600 mb-8">(3) &nbsp;&nbsp; Endorsed by:</p>
                      <p class="font-bold uppercase border-b border-black pb-0.5 text-center">ARLEEN B. UY, MPA</p>
                      <p class="text-slate-600 text-center mt-1 text-[9px]">Vice Chancellor for Student Affairs and Services</p>
                    </div>

                    <!-- (6) Recorded by -->
                    <div>
                      <p class="text-slate-600 mb-8">(6) &nbsp;&nbsp; Recorded by:</p>
                      <p class="font-bold uppercase border-b border-black pb-0.5 text-center">RAFAEL J. VICENTE</p>
                      <p class="text-slate-600 text-center mt-1 text-[9px]">Monitoring and Evaluation Personnel</p>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Institutional Footer Banner (Picture 2) -->
          <div class="mt-8">
            <img :src="MSUN_FOOTER_IMG" alt="Mindanao State University at Naawan" class="w-full h-auto object-contain block" />
          </div>

        </div>
      </div>

      <!-- Modal Bottom Bar with Prominent DOCX Button -->
      <div class="px-5 py-3 bg-white border-t border-slate-200 flex items-center justify-between shrink-0 gap-3 flex-wrap sm:flex-nowrap">
        <div class="text-[11px] text-slate-500">
          Official format reproducing MSU at Naawan layout with seals, checkboxes, tables, and 6-signatory routing.
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
