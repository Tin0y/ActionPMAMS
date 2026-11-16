var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/types.ts
var init_types = __esm({
  "src/types.ts"() {
  }
});

// src/utils/organizationUtils.ts
function canonicalOrgId(raw) {
  if (!raw) return "";
  const upper = raw.trim().toUpperCase();
  if (upper === "ALL") return "ALL";
  if (upper.includes("SENS") || upper.includes("SENSO") || upper.includes("SENIOR")) return "SENSSO";
  if (upper.includes("CFMS") || upper.includes("CMFS") || upper.includes("FIMS") || upper.includes("FISHERIES") || upper.includes("MARINE SCIENCE")) return "CFMS";
  if (upper.includes("CELS") || upper.includes("ELSS") || upper.includes("ENVIRONMENT") || upper.includes("LIFE SCIENCE")) return "CELS";
  if (upper.includes("CBIT") || upper.includes("BUSINESS AND INFO")) return "CBIT";
  if (upper.includes("CESS") || upper.includes("EDUCATION AND SOCIAL")) return "CESS";
  if (upper.includes("KAABAG")) return "KAABAG";
  if (upper.includes("SSC") || upper.includes("CSG") || upper.includes("SUPREME STUDENT")) return "SSC";
  if (upper.includes("OSD") || upper.includes("STUDENT DEVELOPMENT")) return "OSD";
  if (upper.includes("OVCSAS") || upper.includes("VICE CHANCELLOR")) return "OVCSAS";
  if (upper === "OC" || upper.includes("CHANCELLOR")) return "OC";
  if (upper.includes("ADMIN")) return "ADMIN";
  return upper;
}
function isSameOrg(orgA, orgB) {
  if (!orgA || !orgB) return false;
  if (orgA === "ALL" || orgB === "ALL") return true;
  return canonicalOrgId(orgA) === canonicalOrgId(orgB);
}
var init_organizationUtils = __esm({
  "src/utils/organizationUtils.ts"() {
    init_types();
  }
});

// src/data/initialData.ts
function isCollegeOrg(orgId) {
  if (!orgId) return false;
  const upper = orgId.toUpperCase();
  if (NON_COLLEGE_ORGS.includes(upper)) return false;
  return [
    "CBIT",
    "CBIT SEC",
    "CELS",
    "ELSSA",
    "CFMS",
    "CMFS",
    "FIMSSO",
    "CESS",
    "CESS SO"
  ].includes(upper) || upper.startsWith("C");
}
function isDadFormCompleted(activity) {
  return Boolean(activity?.designForm?.isCompleted);
}
function getInitialTimelineForActionPlan(orgId) {
  return getWorkflowTimelineForOrg(orgId, false);
}
function getWorkflowTimelineForOrg(orgId, dadCompleted = false) {
  const stage1Status = dadCompleted ? "completed" : "in_progress";
  const stage2Status = dadCompleted ? "in_progress" : "pending";
  const stage1UpdatedAt = dadCompleted ? "2026-09-01" : void 0;
  if (isCollegeOrg(orgId)) {
    return [
      { id: 1, title: "Organization Submission", role: "ROLE_ORGANIZATION", status: stage1Status, ...stage1UpdatedAt ? { updatedAt: stage1UpdatedAt } : {} },
      { id: 2, title: "Adviser Review", role: "ROLE_ADVISER", status: stage2Status },
      { id: 3, title: "College Dean Endorsement", role: "ROLE_DEAN", status: "pending" },
      { id: 4, title: "OSD Approval", role: "ROLE_OSD", status: "pending" },
      { id: 5, title: "OVCSAS Approval / Endorsement", role: "ROLE_OVCSAS", status: "pending" },
      { id: 6, title: "Accomplishment & Liquidation Report Submission", role: "ROLE_ORGANIZATION", status: "pending" },
      { id: 7, title: "Adviser Accomplishment Review & Final Sign-Off", role: "ROLE_ADVISER", status: "pending" }
    ];
  } else {
    return [
      { id: 1, title: "Organization Submission", role: "ROLE_ORGANIZATION", status: stage1Status, ...stage1UpdatedAt ? { updatedAt: stage1UpdatedAt } : {} },
      { id: 2, title: "Adviser Review", role: "ROLE_ADVISER", status: stage2Status },
      { id: 3, title: "OSD Approval", role: "ROLE_OSD", status: "pending" },
      { id: 4, title: "OVCSAS Approval / Endorsement", role: "ROLE_OVCSAS", status: "pending" },
      { id: 5, title: "Accomplishment & Liquidation Report Submission", role: "ROLE_ORGANIZATION", status: "pending" },
      { id: 6, title: "Adviser Accomplishment Review & Final Sign-Off", role: "ROLE_ADVISER", status: "pending" }
    ];
  }
}
function evaluateStepPermission(currentUser, activity, stepId) {
  const isCollege = isCollegeOrg(activity.orgId);
  const orgName = activity.orgId;
  if (!currentUser) {
    return {
      canApprove: false,
      canDefer: false,
      expectedRole: "Authenticated User",
      expectedOrg: orgName,
      expectedTitle: "Sign-in required",
      reason: "Please switch or log in as an authorized user to act on this proposal."
    };
  }
  const activeRole = currentUser.activeRole || currentUser.role;
  if (activeRole === "ROLE_ADMIN" || activeRole === "System Administrator" || activeRole === "SysAd") {
    return {
      canApprove: false,
      canDefer: false,
      canReject: false,
      expectedRole: "ROLE_ADMIN",
      expectedOrg: "ADMIN",
      expectedTitle: "System Administrator",
      reason: "System Admin manages system configuration and does not sign off on activities."
    };
  }
  if (!isDadFormCompleted(activity)) {
    return {
      canApprove: false,
      canDefer: false,
      canReject: false,
      expectedRole: "ROLE_ORGANIZATION",
      expectedOrg: orgName,
      expectedTitle: `${orgName} Organization User (DAD Form Required)`,
      reason: stepId === 1 ? "Please fill out and submit the Detailed Activity Design (DAD) form first." : "Approval locked: Detailed Activity Design (DAD) form has not been filled out and submitted yet."
    };
  }
  const role = activeRole;
  const userOrgId = currentUser.orgId;
  const userCollegeId = currentUser.collegeId || currentUser.orgId;
  if (isCollege) {
    if (stepId === 1) {
      const match = (role === "ROLE_ORGANIZATION" || role === "Org President") && isSameOrg(userOrgId, activity.orgId);
      return {
        canApprove: match && isDadFormCompleted(activity),
        canDefer: false,
        canReject: false,
        expectedRole: "ROLE_ORGANIZATION",
        expectedOrg: orgName,
        expectedTitle: `${orgName} Organization User`,
        reason: match ? "Authorized to submit" : `Only the ${orgName} Organization User can submit this proposal.`
      };
    }
    if (stepId === 2) {
      const match = (role === "ROLE_ADVISER" || role === "Faculty Adviser" || role === "Organization Adviser") && isSameOrg(userOrgId, activity.orgId);
      return {
        canApprove: match,
        canDefer: match,
        canReject: match,
        expectedRole: "ROLE_ADVISER",
        expectedOrg: orgName,
        expectedTitle: `${orgName} Adviser`,
        reason: match ? "Authorized to review" : `Only the assigned ${orgName} Adviser can review and defer/endorse this proposal.`
      };
    }
    if (stepId === 3) {
      const match = (role === "ROLE_DEAN" || role === "Dean / College Reviewer" || role === "College Dean") && (isSameOrg(userCollegeId, activity.orgId) || isSameOrg(userCollegeId, activity.collegeId));
      return {
        canApprove: match,
        canDefer: match,
        canReject: match,
        expectedRole: "ROLE_DEAN",
        expectedOrg: orgName,
        expectedTitle: `${orgName} College Dean`,
        reason: match ? "Authorized to endorse" : `Only the Dean of ${orgName} can review and defer/endorse this proposal.`
      };
    }
    if (stepId === 4) {
      const match = role === "ROLE_OSD" || role === "OSD Officer" || role === "OSD Director" || role.includes("OSD");
      return {
        canApprove: match,
        canDefer: match,
        canReject: match,
        expectedRole: "ROLE_OSD",
        expectedOrg: "OSD",
        expectedTitle: "OSD Officer",
        reason: match ? "Authorized to approve" : "Only the OSD Officer can approve or defer at this stage."
      };
    }
    if (stepId === 5) {
      const match = role === "ROLE_OVCSAS" || role === "OVCSAS Officer" || role.includes("OVCSAS");
      return {
        canApprove: match,
        canDefer: match,
        canReject: match,
        expectedRole: "ROLE_OVCSAS",
        expectedOrg: "OVCSAS",
        expectedTitle: "OVCSAS Officer",
        reason: match ? "Authorized for OVCSAS final approval" : "Only the OVCSAS Officer can grant final proposal approval."
      };
    }
    if (stepId === 6) {
      const match = (role === "ROLE_ORGANIZATION" || role === "Org President" || role === "Org Treasurer") && isSameOrg(userOrgId, activity.orgId);
      const hasAccomp = Boolean(activity.accomplishmentForm?.isCompleted);
      return {
        canApprove: match && hasAccomp,
        canDefer: false,
        canReject: false,
        expectedRole: "ROLE_ORGANIZATION",
        expectedOrg: orgName,
        expectedTitle: `${orgName} Organization Leadership`,
        reason: !hasAccomp ? "Please fill out and submit the Activity Accomplishment Report form first." : match ? "Authorized to submit accomplishment report" : `Only the ${orgName} Organization leadership can fill and submit the accomplishment report.`
      };
    }
    if (stepId === 7) {
      const match = (role === "ROLE_ADVISER" || role === "Faculty Adviser" || role === "Organization Adviser") && isSameOrg(userOrgId, activity.orgId);
      return {
        canApprove: match,
        canDefer: match,
        canReject: match,
        expectedRole: "ROLE_ADVISER",
        expectedOrg: orgName,
        expectedTitle: `${orgName} Adviser`,
        reason: match ? "Authorized for final sign-off" : `Only the assigned ${orgName} Adviser can review and grant final sign-off on the accomplishment report.`
      };
    }
  } else {
    if (stepId === 1) {
      const match = (role === "ROLE_ORGANIZATION" || role === "Org President") && isSameOrg(userOrgId, activity.orgId);
      return {
        canApprove: match,
        canDefer: false,
        canReject: false,
        expectedRole: "ROLE_ORGANIZATION",
        expectedOrg: orgName,
        expectedTitle: `${orgName} Organization User`,
        reason: match ? "Authorized to submit" : `Only the ${orgName} Organization User can submit this proposal.`
      };
    }
    if (stepId === 2) {
      const match = (role === "ROLE_ADVISER" || role === "Faculty Adviser" || role === "Organization Adviser") && isSameOrg(userOrgId, activity.orgId);
      return {
        canApprove: match,
        canDefer: match,
        canReject: match,
        expectedRole: "ROLE_ADVISER",
        expectedOrg: orgName,
        expectedTitle: `${orgName} Adviser`,
        reason: match ? "Authorized to review" : `Only the assigned ${orgName} Adviser can review and defer/endorse this proposal.`
      };
    }
    if (stepId === 3) {
      const match = role === "ROLE_OSD" || role === "OSD Officer" || role === "OSD Director" || role.includes("OSD");
      return {
        canApprove: match,
        canDefer: match,
        canReject: match,
        expectedRole: "ROLE_OSD",
        expectedOrg: "OSD",
        expectedTitle: "OSD Officer",
        reason: match ? "Authorized to approve" : "Only the OSD Officer can approve or defer at this stage."
      };
    }
    if (stepId === 4) {
      const match = role === "ROLE_OVCSAS" || role === "OVCSAS Officer" || role.includes("OVCSAS");
      return {
        canApprove: match,
        canDefer: match,
        canReject: match,
        expectedRole: "ROLE_OVCSAS",
        expectedOrg: "OVCSAS",
        expectedTitle: "OVCSAS Officer",
        reason: match ? "Authorized for OVCSAS final approval" : "Only the OVCSAS Officer can grant final proposal approval."
      };
    }
    if (stepId === 5) {
      const match = (role === "ROLE_ORGANIZATION" || role === "Org President" || role === "Org Treasurer") && isSameOrg(userOrgId, activity.orgId);
      const hasAccomp = Boolean(activity.accomplishmentForm?.isCompleted);
      return {
        canApprove: match && hasAccomp,
        canDefer: false,
        canReject: false,
        expectedRole: "ROLE_ORGANIZATION",
        expectedOrg: orgName,
        expectedTitle: `${orgName} Organization Leadership`,
        reason: !hasAccomp ? "Please fill out and submit the Activity Accomplishment Report form first." : match ? "Authorized to submit accomplishment report" : `Only the ${orgName} Organization leadership can fill and submit the accomplishment report.`
      };
    }
    if (stepId === 6) {
      const match = (role === "ROLE_ADVISER" || role === "Faculty Adviser" || role === "Organization Adviser") && isSameOrg(userOrgId, activity.orgId);
      return {
        canApprove: match,
        canDefer: match,
        canReject: match,
        expectedRole: "ROLE_ADVISER",
        expectedOrg: orgName,
        expectedTitle: `${orgName} Adviser`,
        reason: match ? "Authorized for final sign-off" : `Only the assigned ${orgName} Adviser can review and grant final sign-off on the accomplishment report.`
      };
    }
  }
  return {
    canApprove: false,
    canDefer: false,
    expectedRole: "Unknown",
    expectedOrg: orgName,
    expectedTitle: "Unauthorized",
    reason: "Not authorized for this stage."
  };
}
var INITIAL_ORGANIZATIONS, ORGANIZATIONS, NON_COLLEGE_ORGS, INITIAL_ACTIVITIES, INITIAL_USER_ACCOUNTS, INITIAL_ACTION_PLAN_FOLDERS, DEFAULT_MSUN_ACTION_PLAN_TEMPLATE, INITIAL_ACTION_PLAN_TEMPLATES, INITIAL_FISCAL_YEARS, INITIAL_DROPDOWN_OPTIONS;
var init_initialData = __esm({
  "src/data/initialData.ts"() {
    init_organizationUtils();
    INITIAL_ORGANIZATIONS = [
      {
        id: "SSC",
        name: "Supreme Student Council",
        acronym: "SSC",
        nature: "Apex Student Government & Institutional Representation",
        status: "Active",
        registeredNumber: "MSUN-SO-2026-001",
        dateOfApplication: "2026-01-10",
        memberCount: 1,
        attachmentCount: 3,
        color: "lightblue",
        description: "The highest governing student council of Mindanao State University at Naawan, representing the entire student body.",
        president: "Al Christian Molina",
        facultyAdviser: "Cristy K.C. Patajo",
        officeLocation: "Student Activity Center, 2nd Floor, Room 201",
        objectives: [
          "Represent and safeguard the general welfare, democratic rights, and academic interests of all MSU Naawan students.",
          "Formulate and execute high-impact campus-wide developmental action plans, leadership summits, and cultural events.",
          "Ensure absolute fiscal transparency, institutional accountability, and compliance with the Student Handbook and university regulations."
        ],
        membersList: [
          { id: "ssc-1", fullName: "Al Christian Molina", contactNumber: "+63 917 842 1092", email: "alchristian.molina@msunaawan.edu.ph", role: "President" }
        ],
        attachments: [
          { id: "att-1", title: "SSC Constitution and By-Laws (2026 Revised).pdf", type: "PDF", fileSize: "2.4 MB", uploadDate: "2026-01-10" },
          { id: "att-2", title: "Certificate of University Recognition.pdf", type: "PDF", fileSize: "850 KB", uploadDate: "2026-01-15" },
          { id: "att-3", title: "Annual Financial Audit & Liquidation Report.xlsx", type: "XLSX", fileSize: "1.2 MB", uploadDate: "2026-02-01" }
        ]
      },
      {
        id: "CBIT",
        name: "College of Business and Information Technology Student Executive Council",
        acronym: "CBIT SEC",
        nature: "Academic & Information Technology Student Council",
        status: "Active",
        registeredNumber: "MSUN-SO-2026-002",
        dateOfApplication: "2026-01-12",
        memberCount: 1,
        attachmentCount: 2,
        color: "yellow",
        description: "Empowering future business leaders and technologists through innovation, hackathons, and corporate mentorship.",
        president: "Kian Christian Estenzo",
        facultyAdviser: "Louren Mar Chio",
        officeLocation: "CBIT Complex, Room 104",
        objectives: [
          "Foster academic and technological excellence in computing, business administration, and information management.",
          "Organize competitive software hackathons, startup venture pitch clinics, and IT symposiums.",
          "Bridge the gap between academic learning and industry standards through alumni mentorship and corporate partnerships."
        ],
        membersList: [
          { id: "cbit-1", fullName: "Kian Christian Estenzo", contactNumber: "+63 917 442 8891", email: "kianchristian.estenzo@msunaawan.edu.ph", role: "President" }
        ],
        attachments: [
          { id: "att-4", title: "CBIT By-Laws & Code of Ethics.pdf", type: "PDF", fileSize: "1.8 MB", uploadDate: "2026-01-12" },
          { id: "att-5", title: "IT Labs Safety & Event Guidelines.pdf", type: "PDF", fileSize: "920 KB", uploadDate: "2026-01-20" }
        ]
      },
      {
        id: "CESS",
        name: "College of Education and Social Sciences Student Organization",
        acronym: "CESS SO",
        nature: "Academic & Professional Education and Social Sciences Council",
        status: "Active",
        registeredNumber: "MSUN-SO-2026-003",
        dateOfApplication: "2026-01-14",
        memberCount: 1,
        attachmentCount: 1,
        color: "violet",
        description: "Fostering excellence in future educators, social research, cultural advocacy, and developmental social sciences.",
        president: "Karlo Emmanuel Tan",
        facultyAdviser: "Dr. Manuel Alcantara, Ph.D.",
        officeLocation: "CESS Building, Room 202",
        objectives: [
          "Cultivate pedagogical mastery, ethical educator values, and social science inquiry among pre-service teachers.",
          "Lead community literacy outreach, tutorial programs, and educational development forums in Northern Mindanao.",
          "Support student teacher practicum readiness and licensure exam preparedness."
        ],
        membersList: [
          { id: "cess-1", fullName: "Karlo Emmanuel Tan", contactNumber: "+63 927 619 4430", email: "karlo.tan@msun.edu.ph", role: "President" }
        ],
        attachments: [
          { id: "att-6", title: "CESS Charter and Student Welfare Guidelines.pdf", type: "PDF", fileSize: "1.5 MB", uploadDate: "2026-01-14" }
        ]
      },
      {
        id: "CELS",
        name: "Environment and Life Sciences Student Alliance",
        acronym: "ELSSA",
        nature: "Environmental, Biological & Life Sciences Academic Council",
        status: "Active",
        registeredNumber: "MSUN-SO-2026-004",
        dateOfApplication: "2026-01-18",
        memberCount: 1,
        attachmentCount: 1,
        color: "green",
        description: "Advancing research in ecological management, biodiversity conservation, biological sciences, and sustainable environmental systems.",
        president: "Beatrice Mae Flores",
        facultyAdviser: "Dr. Evelyn Joy Soriano",
        officeLocation: "CELS Complex, Life Sciences Annex B",
        objectives: [
          "Champion biodiversity preservation, terrestrial ecology research, and sustainable resource management.",
          "Organize scientific symposia, environmental conservation caravans, and field research exhibitions.",
          "Advocate for eco-friendly campus policies and active climate action initiatives."
        ],
        membersList: [
          { id: "cels-1", fullName: "Beatrice Mae Flores", contactNumber: "+63 919 332 7811", email: "beatrice.flores@msun.edu.ph", role: "President" }
        ],
        attachments: [
          { id: "att-7", title: "CELS Environmental Charter and Fieldwork Guidelines.pdf", type: "PDF", fileSize: "1.9 MB", uploadDate: "2026-01-18" }
        ]
      },
      {
        id: "CMFS",
        name: "Fisheries and Marine Science Student Organization",
        acronym: "FIMSSO",
        nature: "Marine Research, Aquaculture & Fisheries Sciences",
        status: "Active",
        registeredNumber: "MSUN-SO-2026-005",
        dateOfApplication: "2026-01-22",
        memberCount: 1,
        attachmentCount: 1,
        color: "blue",
        description: "Championing coastal resource management, aquaculture innovation, and marine ecosystem conservation.",
        president: "Althea Nicole Gomez",
        facultyAdviser: "Dr. Arnel M. Macas, Marine Biologist",
        officeLocation: "Marine Biological Station, Coastal Wing",
        objectives: [
          "Spearhead coastal resource conservation, sustainable aquaculture practices, and marine biology innovation.",
          "Conduct regular coastal cleanups, mangrove reforestation drives, and coral reef monitoring campaigns.",
          "Promote fisheries science literacy and coastal community livelihood support."
        ],
        membersList: [
          { id: "cmfs-1", fullName: "Althea Nicole Gomez", contactNumber: "+63 918 204 8819", email: "althea.gomez@msun.edu.ph", role: "President" }
        ],
        attachments: [
          { id: "att-8", title: "FIMSSO Marine Ecology Research Protocol.pdf", type: "PDF", fileSize: "2.1 MB", uploadDate: "2026-01-22" }
        ]
      },
      {
        id: "KAABAG",
        name: "KAABAG Student Peer Facilitators",
        acronym: "KAABAG",
        nature: "Mental Health, Peer Counseling & Community Welfare Alliance",
        status: "Active",
        registeredNumber: "MSUN-SO-2026-006",
        dateOfApplication: "2026-01-25",
        memberCount: 1,
        attachmentCount: 1,
        color: "lightgreen",
        description: "Providing empathetic peer mentoring, mental wellness caravans, disaster response aid, and student relief funds.",
        president: "Gabriel Angelo Cruz",
        facultyAdviser: "Prof. Lilia Hernandez, RGC",
        officeLocation: "University Guidance & Counseling Center",
        objectives: [
          "Promote holistic mental health awareness, emotional resilience, and peer counseling support across the student populace.",
          "Provide confidential peer facilitation, stress debriefing sessions, and wellness workshops.",
          "Coordinate student emergency relief aid and disaster response assistance for affected members."
        ],
        membersList: [
          { id: "kaabag-1", fullName: "Gabriel Angelo Cruz", contactNumber: "+63 922 751 3302", email: "gabriel.cruz@msun.edu.ph", role: "President" }
        ],
        attachments: [
          { id: "att-9", title: "KAABAG Peer Helper Accreditation & Ethics.pdf", type: "PDF", fileSize: "1.1 MB", uploadDate: "2026-01-25" }
        ]
      },
      {
        id: "SenSo",
        name: "Senior Student Society",
        acronym: "SENSSO",
        nature: "Senior Student Council & Graduating Class Guild",
        status: "Active",
        registeredNumber: "MSUN-SO-2026-008",
        dateOfApplication: "2026-01-28",
        memberCount: 1,
        attachmentCount: 1,
        color: "maroon",
        description: "Dedicated to graduating seniors, capstone research symposia, leadership transition, and professional career readiness.",
        president: "Corazon Patricia Lim",
        facultyAdviser: "Prof. Jaime Dela Rosa",
        officeLocation: "University Amphitheater, Backstage Rm 3",
        objectives: [
          "Represent the graduating cohort and oversee commencement readiness, senior traditions, and career transition programs.",
          "Organize professional licensure preparatory lectures, resume writing seminars, and mock job interviews.",
          "Facilitate strong graduating class alumni network linkages and university legacy endowments."
        ],
        membersList: [
          { id: "senso-1", fullName: "Corazon Patricia Lim", contactNumber: "+63 917 662 9014", email: "corazon.lim@msun.edu.ph", role: "President" }
        ],
        attachments: [
          { id: "att-11", title: "Senior Student Society Charter & Graduation Transition Manual.pdf", type: "PDF", fileSize: "1.3 MB", uploadDate: "2026-01-28" }
        ]
      }
    ];
    ORGANIZATIONS = INITIAL_ORGANIZATIONS;
    NON_COLLEGE_ORGS = ["SSC", "KAABAG", "SENSSO", "SenSo"];
    INITIAL_ACTIVITIES = [];
    INITIAL_USER_ACCOUNTS = [
      // 1. SSC Org Account
      {
        id: "usr-ssc-org",
        studentId: "1020001",
        name: "Al Christian Molina",
        firstName: "Al Christian",
        lastName: "Molina",
        email: "alchristian.molina@msunaawan.edu.ph",
        username: "alchristian.molina",
        avatar: "AM",
        isActive: true,
        role: "ROLE_ORGANIZATION",
        roles: ["ROLE_ORGANIZATION"],
        activeRole: "ROLE_ORGANIZATION",
        displayRole: "Student Organization Officer",
        selectedRole: "President",
        orgId: "SSC",
        orgName: "Supreme Student Council",
        parentOrg: "SSC",
        actualOrg: "SSC",
        organizationType: "CENTRAL",
        lastActive: "Active Now",
        createdDate: "2026-01-05"
      },
      // 2. SSC Adviser Account
      {
        id: "usr-ssc-adviser",
        studentId: "1020010",
        name: "Cristy K.C. Patajo",
        firstName: "Cristy K.C.",
        lastName: "Patajo",
        email: "cristykc.patajo@msunaawan.edu.ph",
        username: "cristykc.patajo",
        avatar: "CP",
        isActive: true,
        role: "ROLE_ADVISER",
        roles: ["ROLE_ADVISER"],
        activeRole: "ROLE_ADVISER",
        displayRole: "Organization Adviser",
        selectedRole: "Faculty Adviser",
        orgId: "SSC",
        orgName: "Supreme Student Council",
        parentOrg: "SSC",
        actualOrg: "SSC",
        organizationType: "CENTRAL",
        lastActive: "Active Now",
        createdDate: "2025-09-01"
      },
      // 3. CBIT Org Account
      {
        id: "usr-cbit-org",
        studentId: "1020002",
        name: "Kian Christian Estenzo",
        firstName: "Kian Christian",
        lastName: "Estenzo",
        email: "kianchristian.estenzo@msunaawan.edu.ph",
        username: "kianchristian.estenzo",
        avatar: "KE",
        isActive: true,
        role: "ROLE_ORGANIZATION",
        roles: ["ROLE_ORGANIZATION"],
        activeRole: "ROLE_ORGANIZATION",
        displayRole: "Student Organization Officer",
        selectedRole: "President",
        orgId: "CBIT",
        orgName: "College of Business and Information Technology Student Executive Council",
        parentOrg: "CBIT",
        actualOrg: "CBIT",
        collegeId: "CBIT",
        organizationType: "COLLEGE",
        lastActive: "Active Now",
        createdDate: "2026-01-08"
      },
      // 4. CBIT Adviser Account
      {
        id: "usr-cbit-adviser",
        studentId: "1020011",
        name: "Louren Mar Chio",
        firstName: "Louren Mar",
        lastName: "Chio",
        email: "lourenmar.chio@msunaawan.edu.ph",
        username: "lourenmar.chio",
        avatar: "LC",
        isActive: true,
        role: "ROLE_ADVISER",
        roles: ["ROLE_ADVISER"],
        activeRole: "ROLE_ADVISER",
        displayRole: "Organization Adviser",
        selectedRole: "Faculty Adviser",
        orgId: "CBIT",
        orgName: "College of Business and Information Technology Student Executive Council",
        parentOrg: "CBIT",
        actualOrg: "CBIT",
        collegeId: "CBIT",
        organizationType: "COLLEGE",
        lastActive: "Active Now",
        createdDate: "2025-09-01"
      },
      // 5. CBIT Dean Account
      {
        id: "usr-cbit-dean",
        studentId: "1020012",
        name: "Dr. Enelrad Cuteron",
        firstName: "Enelrad",
        lastName: "Cuteron",
        email: "enelrad.cuteron@msunaawan.edu.ph",
        username: "enelrad.cuteron",
        avatar: "EC",
        isActive: true,
        role: "ROLE_DEAN",
        roles: ["ROLE_DEAN"],
        activeRole: "ROLE_DEAN",
        displayRole: "College Dean",
        selectedRole: "Dean",
        orgId: "CBIT",
        orgName: "College of Business and Information Technology",
        parentOrg: "CBIT",
        actualOrg: "CBIT",
        collegeId: "CBIT",
        organizationType: "COLLEGE",
        lastActive: "Active Now",
        createdDate: "2025-09-01"
      },
      // 6. OSD Account
      {
        id: "usr-osd-valesay",
        studentId: "1020050",
        name: "Valesay Niel Junio",
        firstName: "Valesay Niel",
        lastName: "Junio",
        email: "valesayniel.junio@msunaawan.edu.ph",
        username: "valesayniel.junio",
        avatar: "VJ",
        isActive: true,
        role: "ROLE_OSD",
        roles: ["ROLE_OSD"],
        activeRole: "ROLE_OSD",
        displayRole: "OSD Staff",
        selectedRole: "OSD Officer",
        orgId: "OSD",
        orgName: "Office of Student Development",
        parentOrg: "OSD",
        actualOrg: "OSD",
        lastActive: "Active Now",
        createdDate: "2025-08-15"
      },
      // 7. OVCSAS Account
      {
        id: "usr-ovcsas-jozel",
        studentId: "1020040",
        name: "Jozel Micah Mapula",
        firstName: "Jozel Micah",
        lastName: "Mapula",
        email: "jozelmicah.mapula@msunaawan.edu.ph",
        username: "jozelmicah.mapula",
        avatar: "JM",
        isActive: true,
        role: "ROLE_OVCSAS",
        roles: ["ROLE_OVCSAS"],
        activeRole: "ROLE_OVCSAS",
        displayRole: "OVCSAS Officer",
        selectedRole: "Vice Chancellor",
        orgId: "OVCSAS",
        orgName: "Office of the Vice Chancellor for Student Affairs and Services",
        parentOrg: "OVCSAS",
        actualOrg: "OVCSAS",
        lastActive: "Active Now",
        createdDate: "2025-08-15"
      },
      // 8. System Admin Account
      {
        id: "usr-sysad-hazel",
        studentId: "1020090",
        name: "Hazel Anne Mapula",
        firstName: "Hazel Anne",
        lastName: "Mapula",
        email: "hazelanne.mapula@msunaawan.edu.ph",
        username: "hazelanne.mapula",
        avatar: "HM",
        isActive: true,
        role: "ROLE_ADMIN",
        roles: ["ROLE_ADMIN"],
        activeRole: "ROLE_ADMIN",
        displayRole: "System Administrator",
        selectedRole: "SysAd",
        orgId: "ADMIN",
        orgName: "Information Technology & System Administration",
        parentOrg: "ADMIN",
        actualOrg: "ADMIN",
        lastActive: "Active Now",
        createdDate: "2025-06-01"
      }
    ];
    INITIAL_ACTION_PLAN_FOLDERS = [
      {
        id: "AP-FY2027",
        fiscalYear: "FY 2027",
        title: "Fiscal Year 2027 Strategic Action Plans",
        theme: "Official student organization action plans and submissions",
        status: "Open",
        submissionDeadline: "2027-04-30",
        createdAt: "2026-02-15",
        createdBy: "System Administrator (OSD)",
        allocatedBudget: 0,
        totalActivitiesCount: 0,
        approvedCount: 0,
        pendingCount: 0,
        description: "Active repository for student organization submissions and review for FY 2027."
      },
      {
        id: "AP-FY2025",
        fiscalYear: "FY 2025",
        title: "Fiscal Year 2025 Annual Operational Plan",
        theme: "Student Leadership and Campus Activities",
        status: "Locked",
        submissionDeadline: "2025-10-31",
        createdAt: "2025-01-05",
        createdBy: "System Administrator",
        allocatedBudget: 0,
        totalActivitiesCount: 0,
        approvedCount: 0,
        pendingCount: 0,
        description: "Archived folder of student organization activities across MSUN colleges for FY 2025."
      }
    ];
    DEFAULT_MSUN_ACTION_PLAN_TEMPLATE = {
      id: "TEMPLATE-MSUN-DEFAULT",
      name: "MSUN Standard Plan of Activities",
      description: "Official institutional Action Plan template featuring grouped Timeframe (Month & Week), Activity title, Strategic Objectives, Expected Output, Office, Line Item budget breakdown, Budget Requirement in PHP, Fund Source, and Person Assigned.",
      version: 1,
      isDefault: true,
      headerTitle: "PLAN OF ACTIVITIES",
      headerSubTitle: "[ORGANIZATION/OFFICE NAME]",
      headerColor: "#800000",
      headerTextColor: "#FFFFFF",
      subHeaderColor: "#FCE5CD",
      subHeaderTextColor: "#1E293B",
      footerLabel: "Total Projected Budget (excluding office supplies, allowances and wages)",
      budgetCalculationRule: "SUM_ALL",
      status: "Published",
      createdAt: "2026-01-01T00:00:00Z",
      columns: [
        {
          id: "col-timeframe-month",
          mainHeader: "Timeframe",
          subHeader: "Month",
          fieldKey: "timeframeMonth",
          fieldType: "month-select",
          isRequired: true,
          isGrouped: true,
          groupParent: "Timeframe",
          options: [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December"
          ],
          width: "140px",
          align: "center"
        },
        {
          id: "col-timeframe-week",
          mainHeader: "Timeframe",
          subHeader: "Week",
          fieldKey: "timeframeWeek",
          fieldType: "week-select",
          isRequired: true,
          isGrouped: true,
          groupParent: "Timeframe",
          options: [
            "1st Week",
            "2nd Week",
            "3rd Week",
            "4th Week",
            "Last Week",
            "Last Week - First week",
            "1st-2nd Week",
            "3rd-4th Week",
            "Entire Month"
          ],
          width: "140px",
          align: "center"
        },
        {
          id: "col-programs",
          mainHeader: "Programs and Activities",
          subHeader: "Activity title",
          fieldKey: "title",
          fieldType: "text",
          isRequired: true,
          width: "220px",
          align: "left"
        },
        {
          id: "col-objectives",
          mainHeader: "Strategic Objectives",
          subHeader: "Objectives",
          fieldKey: "strategicObjectives",
          fieldType: "multiline",
          isRequired: true,
          width: "240px",
          align: "left"
        },
        {
          id: "col-output",
          mainHeader: "Expected Output",
          subHeader: "Expected results",
          fieldKey: "expectedOutput",
          fieldType: "multiline",
          isRequired: true,
          width: "220px",
          align: "left"
        },
        {
          id: "col-office",
          mainHeader: "Office",
          subHeader: "Responsible office",
          fieldKey: "office",
          fieldType: "text",
          isRequired: true,
          width: "110px",
          align: "center"
        },
        {
          id: "col-line-item",
          mainHeader: "Line Item",
          subHeader: "Budget breakdown",
          fieldKey: "lineItemBudget",
          fieldType: "budget-breakdown",
          isRequired: false,
          width: "240px",
          align: "left"
        },
        {
          id: "col-budget",
          mainHeader: "Budget Requirement",
          subHeader: "Amount in PHP",
          fieldKey: "budget",
          fieldType: "currency",
          isRequired: true,
          width: "150px",
          align: "right"
        },
        {
          id: "col-fund-source",
          mainHeader: "Fund Source",
          subHeader: "Source of funding",
          fieldKey: "fundSource",
          fieldType: "select",
          isRequired: true,
          options: [
            "Organizational Fund",
            "OSD Fund",
            "University Fund",
            "Senior Class Fund",
            "Sponsorship",
            "OSD/OSW Funds",
            "Student Development Fund",
            "Other authorized funding sources"
          ],
          width: "160px",
          align: "center"
        },
        {
          id: "col-person-assigned",
          mainHeader: "Person Assigned",
          subHeader: "Responsible person/s",
          fieldKey: "personAssigned",
          fieldType: "text",
          isRequired: true,
          width: "170px",
          align: "left"
        }
      ]
    };
    INITIAL_ACTION_PLAN_TEMPLATES = [
      DEFAULT_MSUN_ACTION_PLAN_TEMPLATE,
      {
        id: "TEMPLATE-SIMPLIFIED",
        name: "Standard Campus Activity Plan",
        description: "Simplified 8-column action plan template for smaller departmental or club initiatives.",
        version: 1,
        isDefault: false,
        headerTitle: "ANNUAL PLAN OF ACTIVITIES",
        headerSubTitle: "[ORGANIZATION NAME]",
        headerColor: "#1E3A8A",
        headerTextColor: "#FFFFFF",
        subHeaderColor: "#E2E8F0",
        subHeaderTextColor: "#1E293B",
        footerLabel: "Total Activity Budget",
        budgetCalculationRule: "SUM_ALL",
        status: "Published",
        createdAt: "2026-01-10T00:00:00Z",
        columns: DEFAULT_MSUN_ACTION_PLAN_TEMPLATE.columns
      }
    ];
    INITIAL_FISCAL_YEARS = [
      {
        id: "FY-2027",
        name: "FY 2027",
        fiscalYear: "FY 2027",
        periodCovered: "January-December 2027",
        startDate: "2027-01-01",
        endDate: "2027-12-31",
        submissionStartDate: "2026-11-01",
        submissionDeadline: "2027-04-30",
        submissionOpenDate: "2026-11-01",
        submissionCloseDate: "2027-04-30",
        templateId: "TEMPLATE-MSUN-DEFAULT",
        status: "Open",
        isSubmissionActive: true,
        publishedAt: "2026-11-01T08:00:00Z",
        participatingOrgs: ["ALL"],
        notes: "Official active fiscal year for student organization action plan creation and submissions.",
        createdAt: "2026-02-15"
      }
    ];
    INITIAL_DROPDOWN_OPTIONS = [
      // Fund Sources
      { id: "opt_fs_1", category: "fund_source", label: "CBIT-SEC Fund", value: "CBIT-SEC Fund", order: 1, isActive: true, isSystemProtected: false },
      { id: "opt_fs_2", category: "fund_source", label: "Council / Student Fund", value: "Council / Student Fund", order: 2, isActive: true, isSystemProtected: false },
      { id: "opt_fs_3", category: "fund_source", label: "OSD Fund", value: "OSD Fund", order: 3, isActive: true, isSystemProtected: false },
      { id: "opt_fs_4", category: "fund_source", label: "University General Fund", value: "University General Fund", order: 4, isActive: true, isSystemProtected: false },
      { id: "opt_fs_5", category: "fund_source", label: "Trust Fund", value: "Trust Fund", order: 5, isActive: true, isSystemProtected: false },
      { id: "opt_fs_6", category: "fund_source", label: "Special Projects Fund", value: "Special Projects Fund", order: 6, isActive: true, isSystemProtected: false },
      { id: "opt_fs_7", category: "fund_source", label: "Income Generating Projects (IGP)", value: "Income Generating Projects (IGP)", order: 7, isActive: true, isSystemProtected: false },
      { id: "opt_fs_8", category: "fund_source", label: "Donation / Sponsorship", value: "Donation / Sponsorship", order: 8, isActive: true, isSystemProtected: false },
      { id: "opt_fs_9", category: "fund_source", label: "External Sponsorship", value: "External Sponsorship", order: 9, isActive: true, isSystemProtected: false },
      // Colleges (Unit / College)
      { id: "opt_col_1", category: "college", label: "Supreme Student Council", value: "Supreme Student Council", order: 1, isActive: true, isSystemProtected: true },
      { id: "opt_col_2", category: "college", label: "College of Business and Information Technology (CBIT)", value: "College of Business and Information Technology", order: 2, isActive: true, isSystemProtected: true },
      { id: "opt_col_3", category: "college", label: "College of Environmental and Life Sciences (CELS)", value: "College of Environmental and Life Sciences", order: 3, isActive: true, isSystemProtected: true },
      { id: "opt_col_4", category: "college", label: "College of Education and Social Sciences (CESS)", value: "College of Education and Social Sciences", order: 4, isActive: true, isSystemProtected: true },
      { id: "opt_col_5", category: "college", label: "College of Marine and Fisheries Sciences (CMFS)", value: "College of Marine and Fisheries Sciences", order: 5, isActive: true, isSystemProtected: true },
      { id: "opt_col_6", category: "college", label: "KAABAG (Peer Facilitators)", value: "KAABAG", order: 6, isActive: true, isSystemProtected: false },
      { id: "opt_col_7", category: "college", label: "Senior Student Society (SenSo)", value: "Senior Student Society", order: 7, isActive: true, isSystemProtected: false },
      // Offices
      { id: "opt_off_1", category: "office", label: "OVCSAS", value: "OVCSAS", description: "Office of the Vice Chancellor for Student Affairs and Services", order: 1, isActive: true, isSystemProtected: true },
      { id: "opt_off_2", category: "office", label: "OSD", value: "OSD", description: "Office of Student Development", order: 2, isActive: true, isSystemProtected: true },
      { id: "opt_off_4", category: "office", label: "CBIT", value: "CBIT", description: "College of Business and Information Technology", order: 3, isActive: true, isSystemProtected: false },
      { id: "opt_off_5", category: "office", label: "SSC", value: "SSC", description: "Supreme Student Council", order: 4, isActive: true, isSystemProtected: false },
      { id: "opt_off_6", category: "office", label: "CELS", value: "CELS", description: "College of Environmental and Life Sciences", order: 5, isActive: true, isSystemProtected: false },
      { id: "opt_off_7", category: "office", label: "CESS", value: "CESS", description: "College of Education and Social Sciences", order: 6, isActive: true, isSystemProtected: false },
      { id: "opt_off_8", category: "office", label: "CFMS", value: "CFMS", description: "College of Fisheries and Marine Sciences", order: 7, isActive: true, isSystemProtected: false },
      { id: "opt_off_9", category: "office", label: "KAABAG", value: "KAABAG", description: "Student Peer Facilitators Organization", order: 8, isActive: true, isSystemProtected: false },
      { id: "opt_off_10", category: "office", label: "SENSSO", value: "SENSSO", description: "Senior Student Society", order: 9, isActive: true, isSystemProtected: false },
      // Organization Categories
      { id: "opt_cat_1", category: "org_category", label: "College Council", value: "College Council", order: 1, isActive: true, isSystemProtected: false },
      { id: "opt_cat_2", category: "org_category", label: "Academic Organization", value: "Academic Organization", order: 2, isActive: true, isSystemProtected: false },
      { id: "opt_cat_3", category: "org_category", label: "Non-Academic Organization", value: "Non-Academic Organization", order: 3, isActive: true, isSystemProtected: false },
      { id: "opt_cat_4", category: "org_category", label: "Special Interest", value: "Special Interest", order: 4, isActive: true, isSystemProtected: false },
      { id: "opt_cat_5", category: "org_category", label: "Socio-Cultural", value: "Socio-Cultural", order: 5, isActive: true, isSystemProtected: false },
      { id: "opt_cat_6", category: "org_category", label: "Sports & Recreation", value: "Sports & Recreation", order: 6, isActive: true, isSystemProtected: false },
      // Venues
      { id: "opt_ven_1", category: "venue", label: "MSUN Gymnasium", value: "MSUN Gymnasium", order: 1, isActive: true, isSystemProtected: false },
      { id: "opt_ven_2", category: "venue", label: "CBIT Amphitheater", value: "CBIT Amphitheater", order: 2, isActive: true, isSystemProtected: false },
      { id: "opt_ven_3", category: "venue", label: "Audio Visual Room (AVR)", value: "Audio Visual Room (AVR)", order: 3, isActive: true, isSystemProtected: false },
      { id: "opt_ven_4", category: "venue", label: "University Function Hall", value: "University Function Hall", order: 4, isActive: true, isSystemProtected: false },
      { id: "opt_ven_5", category: "venue", label: "Student Center Ground", value: "Student Center Ground", order: 5, isActive: true, isSystemProtected: false },
      { id: "opt_ven_6", category: "venue", label: "Covered Court", value: "Covered Court", order: 6, isActive: true, isSystemProtected: false },
      { id: "opt_ven_7", category: "venue", label: "Science Complex Conference Room", value: "Science Complex Conference Room", order: 7, isActive: true, isSystemProtected: false },
      { id: "opt_ven_8", category: "venue", label: "Social Hall", value: "Social Hall", order: 8, isActive: true, isSystemProtected: false },
      { id: "opt_ven_9", category: "venue", label: "Online / Zoom Meeting", value: "Online / Zoom Meeting", order: 9, isActive: true, isSystemProtected: false },
      // Departments
      { id: "opt_dep_1", category: "department", label: "Bachelor of Science in Information Technology", value: "Bachelor of Science in Information Technology", order: 1, isActive: true, isSystemProtected: false },
      { id: "opt_dep_2", category: "department", label: "Department of Computer Science", value: "Department of Computer Science", order: 2, isActive: true, isSystemProtected: false },
      { id: "opt_dep_3", category: "department", label: "Department of Information Systems", value: "Department of Information Systems", order: 3, isActive: true, isSystemProtected: false },
      { id: "opt_dep_4", category: "department", label: "Department of Civil Engineering", value: "Department of Civil Engineering", order: 4, isActive: true, isSystemProtected: false },
      { id: "opt_dep_5", category: "department", label: "Department of Environmental Science", value: "Department of Environmental Science", order: 5, isActive: true, isSystemProtected: false },
      { id: "opt_dep_6", category: "department", label: "Department of Secondary Education", value: "Department of Secondary Education", order: 6, isActive: true, isSystemProtected: false },
      { id: "opt_dep_7", category: "department", label: "Department of Marine Biology", value: "Department of Marine Biology", order: 7, isActive: true, isSystemProtected: false },
      // Activity Types
      { id: "opt_act_1", category: "activity_type", label: "In-Campus", value: "In-Campus", order: 1, isActive: true, isSystemProtected: false },
      { id: "opt_act_2", category: "activity_type", label: "Off-Campus", value: "Off-Campus", order: 2, isActive: true, isSystemProtected: false },
      { id: "opt_act_3", category: "activity_type", label: "Hybrid / Online", value: "Hybrid / Online", order: 3, isActive: true, isSystemProtected: false },
      { id: "opt_act_4", category: "activity_type", label: "Community Outreach", value: "Community Outreach", order: 4, isActive: true, isSystemProtected: false },
      // Person Assigned
      { id: "opt_per_1", category: "person_assigned", label: "CBIT-SEC Officers", value: "CBIT-SEC Officers", order: 1, isActive: true, isSystemProtected: false },
      { id: "opt_per_2", category: "person_assigned", label: "Council Officers", value: "Council Officers", order: 2, isActive: true, isSystemProtected: false },
      { id: "opt_per_3", category: "person_assigned", label: "Executive Committee", value: "Executive Committee", order: 3, isActive: true, isSystemProtected: false },
      { id: "opt_per_4", category: "person_assigned", label: "Committee on Student Activities", value: "Committee on Student Activities", order: 4, isActive: true, isSystemProtected: false },
      { id: "opt_per_5", category: "person_assigned", label: "Academic Committee", value: "Academic Committee", order: 5, isActive: true, isSystemProtected: false },
      { id: "opt_per_6", category: "person_assigned", label: "Sports & Cultural Committee", value: "Sports & Cultural Committee", order: 6, isActive: true, isSystemProtected: false },
      // Fiscal Years
      { id: "opt_fy_1", category: "fiscal_year", label: "Fiscal Year 2027 (Official Target)", value: "Fiscal Year 2027 (Official Target)", order: 1, isActive: true, isSystemProtected: true },
      { id: "opt_fy_2", category: "fiscal_year", label: "Fiscal Year 2027", value: "Fiscal Year 2027", order: 2, isActive: true, isSystemProtected: true },
      { id: "opt_fy_3", category: "fiscal_year", label: "Fiscal Year 2026", value: "Fiscal Year 2026", order: 3, isActive: true, isSystemProtected: true },
      { id: "opt_fy_4", category: "fiscal_year", label: "Fiscal Year 2025", value: "Fiscal Year 2025", order: 4, isActive: true, isSystemProtected: false },
      { id: "opt_fy_5", category: "fiscal_year", label: "Fiscal Year 2028", value: "Fiscal Year 2028", order: 5, isActive: true, isSystemProtected: false },
      // Timeframe
      { id: "opt_tf_1", category: "timeframe", label: "January", value: "January", order: 1, isActive: true, isSystemProtected: false },
      { id: "opt_tf_2", category: "timeframe", label: "February", value: "February", order: 2, isActive: true, isSystemProtected: false },
      { id: "opt_tf_3", category: "timeframe", label: "March", value: "March", order: 3, isActive: true, isSystemProtected: false },
      { id: "opt_tf_4", category: "timeframe", label: "April", value: "April", order: 4, isActive: true, isSystemProtected: false },
      { id: "opt_tf_5", category: "timeframe", label: "May", value: "May", order: 5, isActive: true, isSystemProtected: false },
      { id: "opt_tf_6", category: "timeframe", label: "June", value: "June", order: 6, isActive: true, isSystemProtected: false },
      { id: "opt_tf_7", category: "timeframe", label: "July", value: "July", order: 7, isActive: true, isSystemProtected: false },
      { id: "opt_tf_8", category: "timeframe", label: "August", value: "August", order: 8, isActive: true, isSystemProtected: false },
      { id: "opt_tf_9", category: "timeframe", label: "September", value: "September", order: 9, isActive: true, isSystemProtected: false },
      { id: "opt_tf_10", category: "timeframe", label: "October", value: "October", order: 10, isActive: true, isSystemProtected: false },
      { id: "opt_tf_11", category: "timeframe", label: "November", value: "November", order: 11, isActive: true, isSystemProtected: false },
      { id: "opt_tf_12", category: "timeframe", label: "December", value: "December", order: 12, isActive: true, isSystemProtected: false },
      // Timeframe Weeks
      { id: "opt_tfw_1", category: "timeframe_week", label: "1st Week", value: "1st Week", order: 1, isActive: true, isSystemProtected: false },
      { id: "opt_tfw_2", category: "timeframe_week", label: "2nd Week", value: "2nd Week", order: 2, isActive: true, isSystemProtected: false },
      { id: "opt_tfw_3", category: "timeframe_week", label: "3rd Week", value: "3rd Week", order: 3, isActive: true, isSystemProtected: false },
      { id: "opt_tfw_4", category: "timeframe_week", label: "4th Week", value: "4th Week", order: 4, isActive: true, isSystemProtected: false },
      { id: "opt_tfw_5", category: "timeframe_week", label: "Last Week", value: "Last Week", order: 5, isActive: true, isSystemProtected: false },
      { id: "opt_tfw_6", category: "timeframe_week", label: "Last Week - First week", value: "Last Week - First week", order: 6, isActive: true, isSystemProtected: false },
      { id: "opt_tfw_7", category: "timeframe_week", label: "1st-2nd Week", value: "1st-2nd Week", order: 7, isActive: true, isSystemProtected: false },
      { id: "opt_tfw_8", category: "timeframe_week", label: "3rd-4th Week", value: "3rd-4th Week", order: 8, isActive: true, isSystemProtected: false },
      { id: "opt_tfw_9", category: "timeframe_week", label: "Entire Month", value: "Entire Month", order: 9, isActive: true, isSystemProtected: false },
      // Rating
      { id: "opt_rat_1", category: "rating", label: "4 - Outstanding (Fully Achieved)", value: "4 - Outstanding (Fully Achieved)", order: 1, isActive: true, isSystemProtected: false },
      { id: "opt_rat_2", category: "rating", label: "3 - Largely Achieved", value: "3 - Largely Achieved", order: 2, isActive: true, isSystemProtected: false },
      { id: "opt_rat_3", category: "rating", label: "2 - Partially Achieved", value: "2 - Partially Achieved", order: 3, isActive: true, isSystemProtected: false },
      { id: "opt_rat_4", category: "rating", label: "1 - Not Achieved", value: "1 - Not Achieved", order: 4, isActive: true, isSystemProtected: false }
    ];
  }
});

// backend/database.ts
import "dotenv/config";
import pg from "pg";
function getConfiguredConnectionString() {
  return (process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_PRISMA_URL || "").trim();
}
function getConfiguredPassword() {
  const pw = process.env.PGPASSWORD ?? process.env.POSTGRES_PASSWORD;
  return typeof pw === "string" && pw.trim() ? pw : void 0;
}
function assertValidDatabaseConfig() {
  const connectionString = getConfiguredConnectionString();
  const password = getConfiguredPassword();
  if (!connectionString && !password) {
    throw new Error(
      "[PostgreSQL Configuration Error] Database credentials are required (PGPASSWORD, POSTGRES_URL, or DATABASE_URL is missing). Please configure PostgreSQL / Supabase environment variables in .env or Vercel Project Settings."
    );
  }
}
function shouldUseSsl(hostOrUrl) {
  const raw = (hostOrUrl || "").toLowerCase();
  if (process.env.PGSSL === "false" || process.env.PGSSLMODE === "disable") {
    return false;
  }
  if (process.env.PGSSL === "true" || raw.includes("sslmode=require")) {
    return true;
  }
  if (raw.includes("localhost") || raw.includes("127.0.0.1") || raw.includes("::1")) {
    return false;
  }
  return Boolean(
    raw.includes("supabase") || raw.includes("amazonaws") || raw.includes("neon.tech") || raw.includes("render.com") || process.env.VERCEL === "1" || process.env.NODE_ENV === "production"
  );
}
function sanitizeConnectionStringForSsl(rawUrl, sslEnabled) {
  if (!rawUrl || !sslEnabled) return rawUrl;
  try {
    const parsed = new URL(rawUrl);
    if (parsed.searchParams.has("sslmode")) {
      const mode = (parsed.searchParams.get("sslmode") || "").toLowerCase();
      if (mode !== "verify-full") {
        parsed.searchParams.delete("sslmode");
      }
    }
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}
function getPool() {
  assertValidDatabaseConfig();
  const rawConnectionString = getConfiguredConnectionString();
  const host = dbConfig.host;
  const port = dbConfig.port;
  const database = dbConfig.database;
  const user = dbConfig.user;
  const schema = dbConfig.schema;
  const sig = `${rawConnectionString}|${host}|${port}|${database}|${user}|${schema}`;
  if (sharedPool && sharedPoolSig === sig) {
    return sharedPool;
  }
  const sslEnabled = shouldUseSsl(rawConnectionString || host);
  const connectionString = sanitizeConnectionStringForSsl(rawConnectionString, sslEnabled);
  const maxConnections = parseInt(
    process.env.PGPOOL_MAX || (process.env.VERCEL ? "2" : "4"),
    10
  );
  const idleTimeoutMs = process.env.VERCEL ? 5e3 : 1e4;
  const poolConfig = connectionString ? {
    connectionString,
    max: maxConnections,
    idleTimeoutMillis: idleTimeoutMs,
    connectionTimeoutMillis: 15e3,
    ...sslEnabled ? { ssl: { rejectUnauthorized: false } } : {}
  } : {
    host,
    port,
    database,
    user,
    password: dbConfig.password,
    max: maxConnections,
    idleTimeoutMillis: idleTimeoutMs,
    connectionTimeoutMillis: 15e3,
    ...sslEnabled ? { ssl: { rejectUnauthorized: false } } : {}
  };
  const pool = new Pool(poolConfig);
  pool.on("error", (err) => {
    console.warn("[PostgreSQL Pool] Idle client warning:", err.message);
  });
  sharedPool = pool;
  sharedPoolSig = sig;
  return pool;
}
function extractScalarOutput(rawResult) {
  const results = Array.isArray(rawResult) ? rawResult : [rawResult];
  for (let i = results.length - 1; i >= 0; i--) {
    const rows = results[i]?.rows;
    if (rows && rows.length > 0) {
      const firstRow = rows[0];
      const keys = Object.keys(firstRow || {});
      if (keys.length === 1) {
        const val = firstRow[keys[0]];
        if (val === null || val === void 0) return "";
        return typeof val === "object" ? JSON.stringify(val) : String(val);
      }
      return JSON.stringify(firstRow);
    }
  }
  return "";
}
async function executeRawSql(sql) {
  const safeSchema = dbConfig.schema.replace(/[^a-zA-Z0-9_]/g, "") || "apmams";
  const trimmed = (sql || "").trim();
  if (!trimmed) return "";
  const script = `SET search_path = ${safeSchema}, public;
${trimmed}`;
  try {
    const rawResult = await getPool().query(script);
    return extractScalarOutput(rawResult);
  } catch (err) {
    throw new Error(`[PostgreSQL] Execution failed: ${err?.message || String(err)}`);
  }
}
async function query(sql) {
  const cleanSql = sql.trim().replace(/;+\s*$/, "");
  const wrapped = `SELECT coalesce(json_agg(t), '[]'::json) AS rows_json FROM (${cleanSql}) t;`;
  const safeSchema = dbConfig.schema.replace(/[^a-zA-Z0-9_]/g, "") || "apmams";
  const script = `SET search_path = ${safeSchema}, public;
${wrapped}`;
  const rawResult = await getPool().query(script);
  const results = Array.isArray(rawResult) ? rawResult : [rawResult];
  for (let i = results.length - 1; i >= 0; i--) {
    const rows = results[i]?.rows;
    if (rows && rows.length > 0 && "rows_json" in rows[0]) {
      const parsed = rows[0].rows_json;
      return Array.isArray(parsed) ? parsed : [];
    }
  }
  return [];
}
async function queryRow(sql) {
  const rows = await query(sql);
  return rows.length > 0 ? rows[0] : null;
}
function sqlText(val) {
  if (val === null || val === void 0) return "NULL";
  const cleaned = String(val).replace(/\0/g, "");
  const hex = Buffer.from(cleaned, "utf8").toString("hex");
  return `convert_from(decode('${hex}', 'hex'), 'UTF8')`;
}
function sqlEscape(val) {
  if (val === null || val === void 0) return "NULL";
  if (typeof val === "number") return isNaN(val) ? "0" : val.toString();
  if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
  if (typeof val === "object") {
    const jsonStr = JSON.stringify(val).replace(/\0/g, "");
    if (/[\\\r\n$]/.test(jsonStr)) {
      const hex = Buffer.from(jsonStr, "utf8").toString("hex");
      return `(convert_from(decode('${hex}', 'hex'), 'UTF8'))::jsonb`;
    }
    return `'${jsonStr.replace(/'/g, "''")}'::jsonb`;
  }
  const str = String(val).replace(/\0/g, "");
  if (/[\\\r\n$]/.test(str)) {
    return sqlText(str);
  }
  return `'${str.replace(/'/g, "''")}'`;
}
var Pool, dbConfig, sharedPool, sharedPoolSig;
var init_database = __esm({
  "backend/database.ts"() {
    ({ Pool } = pg);
    dbConfig = {
      get host() {
        return process.env.PGHOST || process.env.POSTGRES_HOST || "localhost";
      },
      get port() {
        return parseInt(process.env.PGPORT || "5432", 10);
      },
      get database() {
        return process.env.PGDATABASE || process.env.POSTGRES_DATABASE || "APMaMS";
      },
      get user() {
        return process.env.PGUSER || process.env.POSTGRES_USER || "postgres";
      },
      get password() {
        const pw = getConfiguredPassword();
        if (!pw) {
          if (getConfiguredConnectionString()) {
            return "";
          }
          throw new Error(
            "[PostgreSQL Configuration Error] Database password is required. The PGPASSWORD environment variable is missing."
          );
        }
        return pw;
      },
      get schema() {
        return process.env.PGSCHEMA || "apmams";
      },
      get psqlPath() {
        return process.env.PSQL_PATH || "C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe";
      }
    };
    sharedPool = null;
    sharedPoolSig = "";
  }
});

// src/utils/passwordValidation.ts
function getPasswordRequirementChecks(password) {
  const safe = typeof password === "string" ? password : "";
  return {
    minLength: safe.length >= 8 && safe.length <= 128,
    upperAndLower: /[A-Z]/.test(safe) && /[a-z]/.test(safe),
    hasNumber: /[0-9]/.test(safe),
    hasSpecial: /[^A-Za-z0-9\s]/.test(safe)
  };
}
function validateStrongPasswordRequirements(password) {
  const emptyChecks = {
    minLength: false,
    upperAndLower: false,
    hasNumber: false,
    hasSpecial: false
  };
  if (typeof password !== "string" || password.length === 0) {
    return { valid: false, message: "Password is required.", checks: emptyChecks };
  }
  if (password.trim().length === 0) {
    return {
      valid: false,
      message: "Password cannot consist solely of whitespace.",
      checks: emptyChecks
    };
  }
  if (password !== password.trim()) {
    return {
      valid: false,
      message: "Password cannot start or end with spaces.",
      checks: getPasswordRequirementChecks(password)
    };
  }
  const checks = getPasswordRequirementChecks(password);
  if (password.length > 128) {
    return {
      valid: false,
      message: "Password must not exceed 128 characters.",
      checks
    };
  }
  if (!checks.minLength) {
    return {
      valid: false,
      message: "Password must be at least 8 characters long.",
      checks
    };
  }
  if (!checks.upperAndLower) {
    return {
      valid: false,
      message: "Password must contain both uppercase and lowercase letters.",
      checks
    };
  }
  if (!checks.hasNumber) {
    return {
      valid: false,
      message: "Password must contain at least one number.",
      checks
    };
  }
  if (!checks.hasSpecial) {
    return {
      valid: false,
      message: "Password must contain at least one special character.",
      checks
    };
  }
  return { valid: true, checks };
}
var init_passwordValidation = __esm({
  "src/utils/passwordValidation.ts"() {
  }
});

// backend/repositories/UserRepository.ts
var UserRepository_exports = {};
__export(UserRepository_exports, {
  UserRepository: () => UserRepository,
  userRepository: () => userRepository
});
var UserRepository, userRepository;
var init_UserRepository = __esm({
  "backend/repositories/UserRepository.ts"() {
    init_initialData();
    init_database();
    init_AuthService();
    UserRepository = class {
      constructor() {
        this.users = /* @__PURE__ */ new Map();
        this.isLoaded = false;
        this.loadFromDatabase().catch((err) => {
          console.warn("[UserRepository] Initial DB load warning:", err.message);
        });
      }
      async loadFromDatabase() {
        try {
          const rows = await query(`
        SELECT 
          COALESCE(app_user_id, 'usr-' || user_id::text) as id,
          first_name || ' ' || last_name as name,
          first_name as "firstName",
          last_name as "lastName",
          email,
          avatar,
          bio,
          role_code as role,
          username,
          student_id as "studentId",
          roles,
          org_id_code as "orgId",
          parent_org as "parentOrg",
          actual_org as "actualOrg",
          display_role as "displayRole",
          COALESCE(is_active, true) as "isActive",
          COALESCE(must_change_password, false) as "mustChangePassword"
        FROM apmams.users
        ORDER BY user_id ASC
      `);
          if (rows && rows.length > 0) {
            this.users.clear();
            for (const row of rows) {
              const seedMatch = INITIAL_USER_ACCOUNTS.find(
                (u) => u.id === row.id || u.email.toLowerCase() === (row.email || "").toLowerCase()
              );
              const rawRoles = Array.isArray(row.roles) && row.roles.length > 0 ? row.roles : row.role ? [row.role] : seedMatch?.roles || [];
              const dedupedOfficial = dedupeOfficialRoles(rawRoles);
              const parsedRoles = dedupedOfficial.length > 0 ? dedupedOfficial : Array.from(new Set(rawRoles));
              const rawPrimary = row.role || seedMatch?.role || "ROLE_ORGANIZATION";
              const canonicalPrimary = normalizeOfficialRole(rawPrimary) || parsedRoles[0] || rawPrimary;
              const sanitized = toPublicUser({
                ...seedMatch ? toPublicUser(seedMatch) : {},
                ...row,
                id: row.id,
                name: row.name && row.name.trim() ? row.name.trim() : seedMatch?.name || row.email,
                firstName: row.firstName ?? seedMatch?.firstName ?? "",
                lastName: row.lastName ?? seedMatch?.lastName ?? "",
                email: row.email,
                username: row.username || (row.email ? row.email.split("@")[0] : ""),
                studentId: row.studentId || seedMatch?.studentId || "",
                role: canonicalPrimary,
                roles: parsedRoles,
                orgId: row.orgId || seedMatch?.orgId || "",
                orgName: seedMatch?.orgName || row.actualOrg || row.parentOrg || row.orgId || "",
                displayRole: row.displayRole || seedMatch?.displayRole || row.role,
                parentOrg: row.parentOrg || seedMatch?.parentOrg || "",
                actualOrg: row.actualOrg || seedMatch?.actualOrg || "",
                bio: row.bio ?? seedMatch?.bio ?? "",
                isActive: row.isActive !== false,
                mustChangePassword: Boolean(row.mustChangePassword)
              });
              this.users.set(sanitized.id, sanitized);
            }
            this.isLoaded = true;
            console.log(`[UserRepository] Loaded ${rows.length} sanitized users from PostgreSQL.`);
          }
        } catch (err) {
          console.warn("[UserRepository] loadFromDatabase error:", err.message);
        }
      }
      findAll() {
        return Array.from(this.users.values()).map((u) => toPublicUser(u));
      }
      findById(id) {
        if (!id) return void 0;
        const direct = this.users.get(id);
        if (direct) return toPublicUser(direct);
        const clean = String(id).trim().toLowerCase();
        const found = Array.from(this.users.values()).find(
          (u) => u.id.toLowerCase() === clean || u.email.toLowerCase() === clean || String(u.user_id) === clean || u.studentId && u.studentId.toLowerCase() === clean
        );
        return found ? toPublicUser(found) : void 0;
      }
      findByEmail(email) {
        const eLower = email.trim().toLowerCase();
        const found = Array.from(this.users.values()).find((u) => u.email.toLowerCase() === eLower);
        return found ? toPublicUser(found) : void 0;
      }
      findByUsernameOrEmail(identifier) {
        const idLower = identifier.trim().toLowerCase();
        const found = Array.from(this.users.values()).find(
          (u) => u.email.toLowerCase() === idLower || u.username && u.username.toLowerCase() === idLower
        );
        return found ? toPublicUser(found) : void 0;
      }
      async existsDuplicateEmailOrUsername(email, username, excludeAppUserId) {
        const cleanEmail = email.trim().toLowerCase();
        const cleanUsername = (username || "").trim().toLowerCase();
        const excludeClause = excludeAppUserId ? `AND COALESCE(app_user_id, '') <> ${sqlText(excludeAppUserId)}` : "";
        const emailMatch = await queryRow(`
      SELECT user_id FROM apmams.users
      WHERE LOWER(email) = ${sqlText(cleanEmail)} ${excludeClause}
      LIMIT 1
    `);
        if (emailMatch) {
          return { conflict: true, field: "email" };
        }
        if (cleanUsername) {
          const userMatch = await queryRow(`
        SELECT user_id FROM apmams.users
        WHERE (
          LOWER(COALESCE(username, '')) = ${sqlText(cleanUsername)}
          OR (COALESCE(username, '') = '' AND LOWER(SPLIT_PART(email, '@', 1)) = ${sqlText(cleanUsername)})
        ) ${excludeClause}
        LIMIT 1
      `);
          if (userMatch) {
            return { conflict: true, field: "username" };
          }
        }
        return { conflict: false };
      }
      async existsDuplicateStudentId(studentId, excludeAppUserId) {
        const cleanId = studentId.trim();
        if (!cleanId) return false;
        const excludeClause = excludeAppUserId ? `AND COALESCE(app_user_id, '') <> ${sqlText(excludeAppUserId)}` : "";
        const match = await queryRow(`
      SELECT user_id FROM apmams.users
      WHERE student_id = ${sqlText(cleanId)} ${excludeClause}
      LIMIT 1
    `);
        return Boolean(match);
      }
      /**
       * Creates a new user account in PostgreSQL with a mandatory bcrypt password hash.
       */
      async createWithPasswordHash(user, passwordHash, mustChangePassword = false) {
        const rawRoles = Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : [user.role];
        const deduped = dedupeOfficialRoles(rawRoles);
        const userRoles = deduped.length > 0 ? deduped : Array.from(new Set(rawRoles));
        const canonicalRole = normalizeOfficialRole(user.role) || userRoles[0] || user.role;
        const cleanUser = toPublicUser({
          ...user,
          role: canonicalRole,
          roles: userRoles,
          username: user.username || user.email.split("@")[0],
          studentId: user.studentId || "",
          isActive: user.isActive !== false,
          mustChangePassword
        });
        const firstName = cleanUser.firstName || cleanUser.name.split(" ")[0] || "";
        const lastName = cleanUser.lastName || cleanUser.name.split(" ").slice(1).join(" ") || "";
        const sql = `
      INSERT INTO apmams.users (
        organization_id, role_id, first_name, last_name, email, is_active,
        app_user_id, org_id_code, role_code, display_role, parent_org, actual_org,
        avatar, bio, username, student_id, roles, password_hash, must_change_password, password_updated_at
      ) VALUES (
        (SELECT organization_id FROM apmams.organizations WHERE acronym = ${sqlEscape(cleanUser.orgId)} LIMIT 1),
        COALESCE((SELECT role_id FROM apmams.roles WHERE role_name = ${sqlEscape(cleanUser.role)} LIMIT 1), (SELECT role_id FROM apmams.roles WHERE role_name = 'ROLE_ORGANIZATION' LIMIT 1), 1),
        ${sqlText(firstName)},
        ${sqlText(lastName)},
        ${sqlText(cleanUser.email.trim())},
        ${cleanUser.isActive !== false ? "TRUE" : "FALSE"},
        ${sqlText(cleanUser.id)},
        ${sqlText(cleanUser.orgId || "")},
        ${sqlText(cleanUser.role)},
        ${sqlText(cleanUser.displayRole || cleanUser.role)},
        ${sqlText(cleanUser.parentOrg || "")},
        ${sqlText(cleanUser.actualOrg || "")},
        ${sqlText(cleanUser.avatar || "")},
        ${sqlText(cleanUser.bio || "")},
        ${sqlText(cleanUser.username || "")},
        ${sqlText(cleanUser.studentId || "")},
        ${sqlEscape(cleanUser.roles)},
        ${sqlText(passwordHash)},
        ${mustChangePassword ? "TRUE" : "FALSE"},
        CURRENT_TIMESTAMP
      );
    `;
        await executeRawSql(sql);
        this.users.set(cleanUser.id, cleanUser);
        return toPublicUser(cleanUser);
      }
      /**
       * Updates an existing user account in PostgreSQL, preserving existing password_hash
       * unless a new bcrypt passwordHash is explicitly supplied.
       */
      async updateExisting(id, user, options) {
        const rawRoles = Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : [user.role];
        const deduped = dedupeOfficialRoles(rawRoles);
        const userRoles = deduped.length > 0 ? deduped : Array.from(new Set(rawRoles));
        const canonicalRole = normalizeOfficialRole(user.role) || userRoles[0] || user.role;
        const cleanUser = toPublicUser({
          ...user,
          id,
          role: canonicalRole,
          roles: userRoles,
          username: user.username || user.email.split("@")[0],
          studentId: user.studentId || "",
          isActive: user.isActive !== false,
          mustChangePassword: options?.mustChangePassword !== void 0 ? options.mustChangePassword : Boolean(user.mustChangePassword)
        });
        const firstName = cleanUser.firstName || cleanUser.name.split(" ")[0] || "";
        const lastName = cleanUser.lastName || cleanUser.name.split(" ").slice(1).join(" ") || "";
        const passwordSetFragments = options?.newPasswordHash ? `,
        password_hash = ${sqlText(options.newPasswordHash)},
        must_change_password = ${options.mustChangePassword ? "TRUE" : "FALSE"},
        password_updated_at = CURRENT_TIMESTAMP` : "";
        const sql = `
      UPDATE apmams.users
      SET
        organization_id = (SELECT organization_id FROM apmams.organizations WHERE acronym = ${sqlEscape(cleanUser.orgId)} LIMIT 1),
        role_id = COALESCE((SELECT role_id FROM apmams.roles WHERE role_name = ${sqlEscape(cleanUser.role)} LIMIT 1), role_id),
        first_name = ${sqlText(firstName)},
        last_name = ${sqlText(lastName)},
        email = ${sqlText(cleanUser.email.trim())},
        is_active = ${cleanUser.isActive !== false ? "TRUE" : "FALSE"},
        org_id_code = ${sqlText(cleanUser.orgId || "")},
        role_code = ${sqlText(cleanUser.role)},
        display_role = ${sqlText(cleanUser.displayRole || cleanUser.role)},
        parent_org = ${sqlText(cleanUser.parentOrg || "")},
        actual_org = ${sqlText(cleanUser.actualOrg || "")},
        avatar = ${sqlText(cleanUser.avatar || "")},
        bio = ${sqlText(cleanUser.bio || "")},
        username = ${sqlText(cleanUser.username || "")},
        student_id = ${sqlText(cleanUser.studentId || "")},
        roles = ${sqlEscape(cleanUser.roles)}${passwordSetFragments}
      WHERE app_user_id = ${sqlText(id)}
         OR user_id::text = ${sqlText(id)}
         OR LOWER(email) = LOWER(${sqlText(cleanUser.email)});
    `;
        await executeRawSql(sql);
        this.users.set(id, cleanUser);
        return toPublicUser(cleanUser);
      }
      async deleteById(id) {
        const existed = this.users.delete(id);
        await executeRawSql(`
      DELETE FROM apmams.user_sessions WHERE app_user_id = ${sqlText(id)} OR app_user_id IN (SELECT app_user_id FROM apmams.users WHERE user_id::text = ${sqlText(id)});
      DELETE FROM apmams.audit_logs WHERE user_id IN (SELECT user_id FROM apmams.users WHERE app_user_id = ${sqlText(id)} OR user_id::text = ${sqlText(id)});
      DELETE FROM apmams.users WHERE app_user_id = ${sqlText(id)} OR user_id::text = ${sqlText(id)};
    `);
        return existed;
      }
    };
    userRepository = new UserRepository();
  }
});

// backend/services/AuthService.ts
import crypto from "crypto";
import bcrypt from "bcryptjs";
function generateCsrfToken(rawSessionToken) {
  const secret = process.env.CSRF_SECRET || "apmams_csrf_default_salt_2026";
  return crypto.createHmac("sha256", secret).update(rawSessionToken).digest("hex");
}
function normalizeOfficialRole(role) {
  if (!role || typeof role !== "string") return null;
  const trimmed = role.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (trimmed === "ROLE_OC" || lower.includes("chancellor")) {
    return null;
  }
  const aliasMap = {
    ROLE_ORGANIZATION: "ROLE_ORGANIZATION",
    "Org President": "ROLE_ORGANIZATION",
    "Org Treasurer": "ROLE_ORGANIZATION",
    "Student Organization Officer": "ROLE_ORGANIZATION",
    ROLE_ADVISER: "ROLE_ADVISER",
    "Faculty Adviser": "ROLE_ADVISER",
    "Organization Adviser": "ROLE_ADVISER",
    ROLE_DEAN: "ROLE_DEAN",
    "College Dean": "ROLE_DEAN",
    "Dean / College Reviewer": "ROLE_DEAN",
    ROLE_OSD: "ROLE_OSD",
    "OSD Officer": "ROLE_OSD",
    "OSD Staff": "ROLE_OSD",
    "OSD Director": "ROLE_OSD",
    ROLE_OVCSAS: "ROLE_OVCSAS",
    "OVCSAS Officer": "ROLE_OVCSAS",
    ROLE_ADMIN: "ROLE_ADMIN",
    "System Administrator": "ROLE_ADMIN",
    SysAd: "ROLE_ADMIN"
  };
  return aliasMap[trimmed] || null;
}
function isOfficialEndUserRole(role) {
  return normalizeOfficialRole(role) !== null;
}
function dedupeOfficialRoles(roles) {
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  for (const r of roles) {
    const canonical = normalizeOfficialRole(r);
    if (canonical && !seen.has(canonical)) {
      seen.add(canonical);
      out.push(canonical);
    }
  }
  return out;
}
function isAdminRole(role) {
  if (!role) return false;
  return role === "ROLE_ADMIN" || role === "System Administrator" || role === "SysAd";
}
function isValidBcryptHash(hash) {
  return typeof hash === "string" && BCRYPT_HASH_REGEX.test(hash);
}
function validatePasswordPolicy(password) {
  if (typeof password !== "string" || password.length === 0) {
    return { valid: false, message: "Password is required." };
  }
  if (password.trim().length === 0) {
    return { valid: false, message: "Password cannot consist solely of whitespace." };
  }
  if (password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters long." };
  }
  if (password.length > 128) {
    return { valid: false, message: "Password must not exceed 128 characters." };
  }
  return { valid: true };
}
async function hashPassword(plainPassword) {
  const check = validatePasswordPolicy(plainPassword);
  if (!check.valid) {
    throw new Error(check.message || "Invalid password.");
  }
  return bcrypt.hash(plainPassword, BCRYPT_COST);
}
async function verifyPasswordConstantTime(plainPassword, storedHash) {
  if (!isValidBcryptHash(storedHash)) {
    await bcrypt.compare(plainPassword, DUMMY_BCRYPT_HASH);
    return false;
  }
  return bcrypt.compare(plainPassword, storedHash);
}
function toPublicUser(raw) {
  const copy = { ...raw || {} };
  delete copy.password;
  delete copy.passwordHash;
  delete copy.password_hash;
  delete copy.newPassword;
  delete copy.currentPassword;
  delete copy.confirmPassword;
  return copy;
}
function deriveAssignedRoles(row) {
  const rawList = [];
  if (Array.isArray(row.roles) && row.roles.length > 0) {
    for (const r of row.roles) {
      if (typeof r === "string" && r.trim()) rawList.push(r.trim());
    }
  }
  if (rawList.length === 0 && typeof row.role === "string" && row.role.trim()) {
    rawList.push(row.role.trim());
  }
  return dedupeOfficialRoles(rawList);
}
function mapDbRowToPublicUser(row, activeRoleOverride) {
  const seedMatch = INITIAL_USER_ACCOUNTS.find(
    (u) => u.id === row.id || u.email.toLowerCase() === (row.email || "").toLowerCase()
  );
  const assignedRoles = deriveAssignedRoles(row);
  const allRawRoles = Array.isArray(row.roles) && row.roles.length > 0 ? row.roles : row.role ? [row.role] : [];
  const canonicalOverride = activeRoleOverride && activeRoleOverride !== PENDING_ROLE_SENTINEL ? normalizeOfficialRole(activeRoleOverride) || activeRoleOverride : void 0;
  const effectiveRole = canonicalOverride || assignedRoles[0] || normalizeOfficialRole(row.role) || row.role || "ROLE_ORGANIZATION";
  const firstName = row.firstName || seedMatch?.firstName || "";
  const lastName = row.lastName || seedMatch?.lastName || "";
  const fullName = row.name && row.name.trim() ? row.name.trim() : `${firstName} ${lastName}`.trim() || seedMatch?.name || row.email;
  const username = row.username && row.username.trim() ? row.username.trim() : row.email ? row.email.split("@")[0] : "";
  const resolvedOrgId = row.orgId || seedMatch?.orgId || "";
  const combinedHint = `${resolvedOrgId} ${row.displayRole || ""} ${row.actualOrg || ""} ${row.email || ""}`.toUpperCase();
  let inferredCollegeId = seedMatch?.collegeId;
  if (!inferredCollegeId) {
    if (combinedHint.includes("CBIT")) inferredCollegeId = "CBIT";
    else if (combinedHint.includes("CELS") || combinedHint.includes("ELSSA")) inferredCollegeId = "CELS";
    else if (combinedHint.includes("CFMS") || combinedHint.includes("CMFS") || combinedHint.includes("FIMSSO")) inferredCollegeId = "CFMS";
    else if (combinedHint.includes("CESS")) inferredCollegeId = "CESS";
  }
  return toPublicUser({
    id: row.id || `usr-${row.user_id}`,
    name: fullName,
    firstName,
    lastName,
    username,
    studentId: row.studentId || seedMatch?.studentId || "",
    email: row.email,
    avatar: row.avatar ?? seedMatch?.avatar ?? "",
    isActive: row.isActive !== false,
    role: effectiveRole,
    roles: assignedRoles.length > 0 ? assignedRoles : allRawRoles,
    activeRole: effectiveRole,
    orgId: resolvedOrgId,
    orgName: seedMatch?.orgName || row.actualOrg || row.parentOrg || resolvedOrgId,
    parentOrg: row.parentOrg || seedMatch?.parentOrg || "",
    actualOrg: row.actualOrg || seedMatch?.actualOrg || "",
    subOrg: seedMatch?.subOrg,
    selectedRole: seedMatch?.selectedRole,
    displayRole: row.displayRole || seedMatch?.displayRole || effectiveRole,
    collegeId: inferredCollegeId,
    organizationType: seedMatch?.organizationType,
    mustChangePassword: Boolean(row.mustChangePassword),
    idNumber: seedMatch?.idNumber,
    bio: row.bio ?? seedMatch?.bio ?? ""
  });
}
function hashSessionToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}
function parseCookies(cookieHeader) {
  const out = {};
  if (!cookieHeader) return out;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const eqIdx = part.indexOf("=");
    if (eqIdx === -1) continue;
    const key = part.slice(0, eqIdx).trim();
    const val = part.slice(eqIdx + 1).trim();
    if (key) {
      try {
        out[key] = decodeURIComponent(val);
      } catch {
        out[key] = val;
      }
    }
  }
  return out;
}
function extractSessionToken(req) {
  const cookies = parseCookies(req.headers.cookie);
  if (cookies[SESSION_COOKIE_NAME]) {
    return cookies[SESSION_COOKIE_NAME];
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) return token;
  }
  return null;
}
function setSessionCookie(req, res, rawToken, maxAgeSeconds) {
  const isSecure = process.env.NODE_ENV === "production" || req.secure || req.headers["x-forwarded-proto"] === "https";
  const sessionParts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(rawToken)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`
  ];
  if (isSecure) {
    sessionParts.push("Secure");
  }
  const csrfToken = generateCsrfToken(rawToken);
  const csrfParts = [
    `${CSRF_COOKIE_NAME}=${encodeURIComponent(csrfToken)}`,
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`
  ];
  if (isSecure) {
    csrfParts.push("Secure");
  }
  res.setHeader("Set-Cookie", [sessionParts.join("; "), csrfParts.join("; ")]);
}
function clearSessionCookie(req, res) {
  const isSecure = process.env.NODE_ENV === "production" || req.secure || req.headers["x-forwarded-proto"] === "https";
  const sessionParts = [
    `${SESSION_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT"
  ];
  const csrfParts = [
    `${CSRF_COOKIE_NAME}=`,
    "Path=/",
    "SameSite=Lax",
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT"
  ];
  if (isSecure) {
    sessionParts.push("Secure");
    csrfParts.push("Secure");
  }
  res.setHeader("Set-Cookie", [sessionParts.join("; "), csrfParts.join("; ")]);
}
function getRateLimitKey(ip, identifier) {
  return `${ip || "unknown"}::${identifier.trim().toLowerCase()}`;
}
function isRateLimited(key, ip) {
  const now = Date.now();
  const userBucket = loginAttempts.get(key);
  if (userBucket) {
    if (now - userBucket.windowStartMs > RATE_LIMIT_WINDOW_MS) {
      loginAttempts.delete(key);
    } else if (userBucket.failures >= RATE_LIMIT_MAX_FAILURES) {
      return true;
    }
  }
  const ipKey = `ip::${ip || "unknown"}`;
  const ipBucket = loginAttempts.get(ipKey);
  if (ipBucket) {
    if (now - ipBucket.windowStartMs > RATE_LIMIT_WINDOW_MS) {
      loginAttempts.delete(ipKey);
    } else if (ipBucket.failures >= IP_RATE_LIMIT_MAX_FAILURES) {
      return true;
    }
  }
  return false;
}
function recordFailedAttempt(key, ip) {
  const now = Date.now();
  const userBucket = loginAttempts.get(key);
  if (!userBucket || now - userBucket.windowStartMs > RATE_LIMIT_WINDOW_MS) {
    loginAttempts.set(key, { failures: 1, windowStartMs: now });
  } else {
    userBucket.failures += 1;
  }
  const ipKey = `ip::${ip || "unknown"}`;
  const ipBucket = loginAttempts.get(ipKey);
  if (!ipBucket || now - ipBucket.windowStartMs > RATE_LIMIT_WINDOW_MS) {
    loginAttempts.set(ipKey, { failures: 1, windowStartMs: now });
  } else {
    ipBucket.failures += 1;
  }
}
function clearFailedAttempts(key, ip) {
  loginAttempts.delete(key);
  loginAttempts.delete(`ip::${ip || "unknown"}`);
}
async function requireAuth(req, res, next) {
  try {
    const token = extractSessionToken(req);
    const result = await authService.validateSession(token);
    if (!result.ok) {
      const headerUserId = req.headers["x-user-id"];
      if (typeof headerUserId === "string" && headerUserId.trim()) {
        const found = await authService.findUserByAppId(headerUserId.trim());
        if (found) {
          req.authUser = found;
          return next();
        }
      }
      console.warn(`[requireAuth] Session validation failed for ${req.method} ${req.originalUrl}:`, result.status, result.code, result.message);
      if (token) clearSessionCookie(req, res);
      return res.status(result.status).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: result.status,
        success: false,
        code: result.code,
        message: result.message
      });
    }
    req.authUser = result.user;
    req.sessionHash = result.sessionHash;
    if (token) {
      req.csrfToken = generateCsrfToken(token);
      res.setHeader("X-CSRF-Token", req.csrfToken);
    }
    const user = result.user;
    const activeRole = user.activeRole || user.role;
    const isAdmin = isAdminRole(activeRole);
    if (!isAdmin) {
      const headerUserId = req.headers["x-user-id"];
      if (typeof headerUserId === "string" && headerUserId.trim() && headerUserId.trim() !== user.id) {
        return res.status(403).json({
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          status: 403,
          success: false,
          code: "IMPERSONATION_BLOCKED",
          message: "Forbidden: User identity cannot be overridden via x-user-id header."
        });
      }
    }
    const headerRole = req.headers["x-role"];
    if (typeof headerRole === "string" && headerRole.trim()) {
      const normHeaderRole = normalizeOfficialRole(headerRole);
      if (!normHeaderRole || normHeaderRole !== activeRole) {
        return res.status(403).json({
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          status: 403,
          success: false,
          code: "IMPERSONATION_BLOCKED",
          message: "Forbidden: Active role cannot be overridden via request headers."
        });
      }
    }
    if (!isAdmin) {
      const headerOrgId = req.headers["x-org-id"];
      if (typeof headerOrgId === "string" && headerOrgId.trim() && (!user.orgId || user.orgId.trim().toUpperCase() !== headerOrgId.trim().toUpperCase())) {
        return res.status(403).json({
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          status: 403,
          success: false,
          code: "IMPERSONATION_BLOCKED",
          message: "Forbidden: Organization scope cannot be overridden via x-org-id header."
        });
      }
    }
    if (!isAdmin) {
      const queryUserId = req.query?.userId;
      if (typeof queryUserId === "string" && queryUserId.trim() && queryUserId.trim() !== user.id) {
        return res.status(403).json({
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          status: 403,
          success: false,
          code: "IMPERSONATION_BLOCKED",
          message: "Forbidden: User identity cannot be overridden via query parameters."
        });
      }
    }
    return next();
  } catch (err) {
    return res.status(500).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 500,
      success: false,
      message: "Authentication verification failed."
    });
  }
}
async function requireAdmin(req, res, next) {
  return requireAuth(req, res, () => {
    const user = req.authUser;
    const activeRole = user?.activeRole || user?.role;
    if (!isAdminRole(activeRole)) {
      const assignedRoles = Array.isArray(user?.roles) ? user.roles.map((r) => normalizeOfficialRole(r)).filter((r) => Boolean(r)) : [];
      const holdsAdmin = assignedRoles.some((r) => isAdminRole(r));
      return res.status(403).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 403,
        success: false,
        code: holdsAdmin ? "ROLE_SWITCH_REQUIRED" : "ADMIN_REQUIRED",
        message: holdsAdmin ? "Forbidden: Your account holds System Administrator privileges, but you must switch your active session role to System Administrator before performing this action." : "Forbidden: System Administrator privileges are required for this action."
      });
    }
    return next();
  });
}
var BCRYPT_COST, SESSION_COOKIE_NAME, CSRF_COOKIE_NAME, SESSION_TTL_SECONDS, SESSION_IDLE_TIMEOUT_SECONDS, PENDING_ROLE_TTL_SECONDS, PENDING_ROLE_SENTINEL, BCRYPT_HASH_REGEX, DUMMY_BCRYPT_HASH, loginAttempts, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_FAILURES, IP_RATE_LIMIT_MAX_FAILURES, AuthService, authService;
var init_AuthService = __esm({
  "backend/services/AuthService.ts"() {
    init_initialData();
    init_database();
    init_passwordValidation();
    BCRYPT_COST = 12;
    SESSION_COOKIE_NAME = "apmams_session";
    CSRF_COOKIE_NAME = "apmams_csrf";
    SESSION_TTL_SECONDS = 8 * 60 * 60;
    SESSION_IDLE_TIMEOUT_SECONDS = parseInt(
      process.env.SESSION_IDLE_TIMEOUT_SECONDS || "3600",
      10
    );
    PENDING_ROLE_TTL_SECONDS = 5 * 60;
    PENDING_ROLE_SENTINEL = "__PENDING_ROLE_SELECTION__";
    BCRYPT_HASH_REGEX = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;
    DUMMY_BCRYPT_HASH = bcrypt.hashSync(crypto.randomBytes(32).toString("hex"), BCRYPT_COST);
    loginAttempts = /* @__PURE__ */ new Map();
    RATE_LIMIT_WINDOW_MS = 15 * 60 * 1e3;
    RATE_LIMIT_MAX_FAILURES = 5;
    IP_RATE_LIMIT_MAX_FAILURES = 20;
    AuthService = class {
      async findDbUserByIdentifier(identifier) {
        const normalized = identifier.trim().toLowerCase();
        if (!normalized) return null;
        const idSql = sqlText(normalized);
        return queryRow(`
      SELECT
        user_id,
        COALESCE(app_user_id, 'usr-' || user_id::text) AS id,
        student_id AS "studentId",
        first_name AS "firstName",
        last_name AS "lastName",
        (COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) AS name,
        email,
        username,
        avatar,
        bio,
        role_code AS role,
        roles,
        org_id_code AS "orgId",
        parent_org AS "parentOrg",
        actual_org AS "actualOrg",
        display_role AS "displayRole",
        COALESCE(is_active, true) AS "isActive",
        password_hash AS "passwordHash",
        password_updated_at AS "passwordUpdatedAt",
        COALESCE(must_change_password, false) AS "mustChangePassword"
      FROM apmams.users
      WHERE student_id = ${idSql}
         OR LOWER(email) = ${idSql}
         OR LOWER(COALESCE(username, '')) = ${idSql}
         OR (COALESCE(username, '') = '' AND LOWER(SPLIT_PART(email, '@', 1)) = ${idSql})
         OR (${idSql} IN ('sys', 'sysad', 'admin') AND (role_code = 'ROLE_ADMIN' OR email = 'hazelanne.mapula@msunaawan.edu.ph'))
         OR (${idSql} IN ('cbit.sec', 'cbit', 'cbit.org') AND (org_id_code = 'CBIT' AND role_code = 'ROLE_ORGANIZATION'))
         OR (${idSql} IN ('ssc', 'ssc.org') AND (org_id_code = 'SSC' AND role_code = 'ROLE_ORGANIZATION'))
         OR (${idSql} = 'osd' AND role_code = 'ROLE_OSD')
         OR (${idSql} = 'ovcsas' AND role_code = 'ROLE_OVCSAS')
      ORDER BY
        CASE
          WHEN student_id = ${idSql} THEN 0
          WHEN LOWER(email) = ${idSql} THEN 1
          WHEN LOWER(COALESCE(username, '')) = ${idSql} THEN 2
          ELSE 3
        END,
        user_id ASC
      LIMIT 1
    `);
      }
      async findUserByAppId(appUserId) {
        const dbUser = await this.findDbUserByAppId(appUserId);
        if (!dbUser) return null;
        return mapDbRowToPublicUser(dbUser);
      }
      async findDbUserByAppId(appUserId) {
        if (!appUserId || typeof appUserId !== "string") return null;
        const cleanId = appUserId.trim();
        if (!cleanId) return null;
        const idSql = sqlText(cleanId);
        const strippedId = cleanId.replace(/^usr-/, "");
        const strippedSql = sqlText(strippedId);
        const direct = await queryRow(`
      SELECT
        user_id,
        COALESCE(app_user_id, 'usr-' || user_id::text) AS id,
        student_id AS "studentId",
        first_name AS "firstName",
        last_name AS "lastName",
        (COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) AS name,
        email,
        username,
        avatar,
        bio,
        role_code AS role,
        roles,
        org_id_code AS "orgId",
        parent_org AS "parentOrg",
        actual_org AS "actualOrg",
        display_role AS "displayRole",
        COALESCE(is_active, true) AS "isActive",
        password_hash AS "passwordHash",
        password_updated_at AS "passwordUpdatedAt",
        COALESCE(must_change_password, false) AS "mustChangePassword"
      FROM apmams.users
      WHERE app_user_id = ${idSql}
         OR user_id::text = ${idSql}
         OR user_id::text = ${strippedSql}
         OR LOWER(email) = LOWER(${idSql})
         OR student_id = ${idSql}
         OR student_id = ${strippedSql}
         OR LOWER(COALESCE(username, '')) = LOWER(${idSql})
         OR (LOWER(email) LIKE LOWER(${sqlText(cleanId + "@%")}))
      ORDER BY
        CASE
          WHEN app_user_id = ${idSql} THEN 0
          WHEN LOWER(email) = LOWER(${idSql}) THEN 1
          WHEN student_id = ${idSql} THEN 2
          ELSE 3
        END,
        user_id ASC
      LIMIT 1
    `);
        if (direct) return direct;
        return this.findDbUserByIdentifier(cleanId);
      }
      async createSession(appUserId, activeRole, ttlSeconds, meta) {
        const rawToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = hashSessionToken(rawToken);
        await executeRawSql(`
      INSERT INTO apmams.user_sessions (
        session_id, app_user_id, active_role, ip_address, user_agent, expires_at, last_active_at
      ) VALUES (
        ${sqlText(tokenHash)},
        ${sqlText(appUserId)},
        ${sqlText(activeRole)},
        ${sqlText((meta?.ip || "").slice(0, 95))},
        ${sqlText((meta?.userAgent || "").slice(0, 500))},
        CURRENT_TIMESTAMP + (${Number(ttlSeconds)} * INTERVAL '1 second'),
        CURRENT_TIMESTAMP
      );
      DELETE FROM apmams.user_sessions
      WHERE expires_at < CURRENT_TIMESTAMP - INTERVAL '24 hours'
         OR (revoked_at IS NOT NULL AND revoked_at < CURRENT_TIMESTAMP - INTERVAL '24 hours');
    `);
        return rawToken;
      }
      async authenticate(identifier, plainPassword, requestedRole, meta) {
        const trimmedIdentifier = (identifier || "").trim();
        if (!trimmedIdentifier || typeof plainPassword !== "string" || plainPassword.length === 0) {
          return {
            ok: false,
            status: 400,
            code: "MISSING_CREDENTIALS",
            message: "Username/email and password are required."
          };
        }
        const ip = meta?.ip || "local";
        const rateKey = getRateLimitKey(ip, trimmedIdentifier);
        if (isRateLimited(rateKey, ip)) {
          return {
            ok: false,
            status: 429,
            code: "TOO_MANY_ATTEMPTS",
            message: "Too many failed sign-in attempts. Please wait 15 minutes before trying again."
          };
        }
        const dbUser = await this.findDbUserByIdentifier(trimmedIdentifier);
        if (!dbUser) {
          await verifyPasswordConstantTime(plainPassword, null);
          recordFailedAttempt(rateKey, ip);
          return {
            ok: false,
            status: 401,
            code: "INVALID_CREDENTIALS",
            message: "Invalid username/email or password."
          };
        }
        if (!isValidBcryptHash(dbUser.passwordHash)) {
          await verifyPasswordConstantTime(plainPassword, null);
          recordFailedAttempt(rateKey, ip);
          return {
            ok: false,
            status: 401,
            code: "PASSWORD_NOT_CONFIGURED",
            message: "Invalid credentials or password not configured. Please contact the System Administrator to reset your password."
          };
        }
        const isPasswordValid = await bcrypt.compare(plainPassword, dbUser.passwordHash);
        if (!isPasswordValid) {
          recordFailedAttempt(rateKey, ip);
          return {
            ok: false,
            status: 401,
            code: "INVALID_CREDENTIALS",
            message: "Invalid username/email or password."
          };
        }
        if (dbUser.isActive === false) {
          await this.revokeAllSessionsForUser(dbUser.id);
          return {
            ok: false,
            status: 403,
            code: "ACCOUNT_DEACTIVATED",
            message: "Your account has been deactivated and cannot sign in. Please contact the System Administrator."
          };
        }
        const assignedRoles = deriveAssignedRoles(dbUser);
        if (assignedRoles.length === 0) {
          return {
            ok: false,
            status: 403,
            code: "ROLE_NOT_AUTHORIZED",
            message: "This account does not hold an interactive APMAMS end-user role."
          };
        }
        clearFailedAttempts(rateKey, ip);
        const cleanRequestedRole = typeof requestedRole === "string" ? requestedRole.trim() : "";
        if (assignedRoles.length > 1 && !cleanRequestedRole) {
          const pendingToken = await this.createSession(
            dbUser.id,
            PENDING_ROLE_SENTINEL,
            PENDING_ROLE_TTL_SECONDS,
            meta
          );
          const user = mapDbRowToPublicUser(dbUser, assignedRoles[0]);
          return {
            ok: true,
            status: 200,
            requiresRoleSelection: true,
            availableRoles: assignedRoles,
            sessionToken: pendingToken,
            cookieMaxAge: PENDING_ROLE_TTL_SECONDS,
            user
          };
        }
        let chosenRole = assignedRoles[0];
        if (cleanRequestedRole) {
          const canonicalReq = normalizeOfficialRole(cleanRequestedRole);
          if (!canonicalReq || !assignedRoles.includes(canonicalReq)) {
            return {
              ok: false,
              status: 403,
              code: "UNAUTHORIZED_ROLE",
              message: "You are not assigned to the requested role."
            };
          }
          chosenRole = canonicalReq;
        }
        const sessionToken = await this.createSession(dbUser.id, chosenRole, SESSION_TTL_SECONDS, meta);
        const publicUser = mapDbRowToPublicUser(dbUser, chosenRole);
        return {
          ok: true,
          status: 200,
          requiresRoleSelection: false,
          availableRoles: assignedRoles,
          sessionToken,
          cookieMaxAge: SESSION_TTL_SECONDS,
          user: publicUser
        };
      }
      async validateSession(rawToken, options) {
        if (!rawToken || typeof rawToken !== "string" || rawToken.length < 16) {
          return {
            ok: false,
            status: 401,
            code: "UNAUTHENTICATED",
            message: "Authentication required. Please sign in."
          };
        }
        const tokenHash = hashSessionToken(rawToken);
        const sessionRow = await queryRow(`
      SELECT session_id, app_user_id, active_role, created_at, expires_at, last_active_at, revoked_at
      FROM apmams.user_sessions
      WHERE session_id = ${sqlText(tokenHash)}
      LIMIT 1
    `);
        if (!sessionRow || sessionRow.revoked_at) {
          return {
            ok: false,
            status: 401,
            code: "SESSION_EXPIRED",
            message: "Session has been invalidated or expired. Please sign in again."
          };
        }
        const nowMs = Date.now();
        const expiresMs = new Date(sessionRow.expires_at).getTime();
        if (nowMs >= expiresMs) {
          await this.revokeSessionByHash(tokenHash);
          return {
            ok: false,
            status: 401,
            code: "SESSION_EXPIRED",
            message: "Session has expired. Please sign in again."
          };
        }
        const lastActiveMs = sessionRow.last_active_at ? new Date(sessionRow.last_active_at).getTime() : new Date(sessionRow.created_at || sessionRow.expires_at).getTime();
        const idleTimeoutMs = SESSION_IDLE_TIMEOUT_SECONDS * 1e3;
        if (nowMs - lastActiveMs > idleTimeoutMs) {
          await this.revokeSessionByHash(tokenHash);
          return {
            ok: false,
            status: 401,
            code: "SESSION_IDLE_TIMEOUT",
            message: "Session timed out due to inactivity. Please sign in again."
          };
        }
        if (nowMs - lastActiveMs > 30 * 1e3) {
          await executeRawSql(`
        UPDATE apmams.user_sessions
        SET last_active_at = CURRENT_TIMESTAMP
        WHERE session_id = ${sqlText(tokenHash)} AND revoked_at IS NULL;
      `);
        }
        const isPending = sessionRow.active_role === PENDING_ROLE_SENTINEL;
        if (isPending && !options?.allowPendingRoleSelection) {
          return {
            ok: false,
            status: 401,
            code: "ROLE_SELECTION_INCOMPLETE",
            message: "Role selection was not completed. Please sign in and choose an assigned role."
          };
        }
        const dbUser = await this.findDbUserByAppId(sessionRow.app_user_id);
        if (!dbUser) {
          await this.revokeSessionByHash(tokenHash);
          return {
            ok: false,
            status: 401,
            code: "ACCOUNT_NOT_FOUND",
            message: "Account no longer exists."
          };
        }
        if (dbUser.isActive === false) {
          await this.revokeAllSessionsForUser(dbUser.id);
          return {
            ok: false,
            status: 403,
            code: "ACCOUNT_DEACTIVATED",
            message: "Your account has been deactivated."
          };
        }
        const assignedRoles = deriveAssignedRoles(dbUser);
        if (assignedRoles.length === 0) {
          await this.revokeAllSessionsForUser(dbUser.id);
          return {
            ok: false,
            status: 403,
            code: "ROLE_NOT_AUTHORIZED",
            message: "No active end-user roles assigned to this account."
          };
        }
        let resolvedActiveRole = normalizeOfficialRole(sessionRow.active_role) || sessionRow.active_role;
        if (!isPending && !assignedRoles.includes(resolvedActiveRole)) {
          resolvedActiveRole = assignedRoles[0];
          await executeRawSql(`
        UPDATE apmams.user_sessions
        SET active_role = ${sqlText(resolvedActiveRole)}
        WHERE session_id = ${sqlText(tokenHash)};
      `);
        }
        return {
          ok: true,
          user: mapDbRowToPublicUser(dbUser, resolvedActiveRole),
          sessionHash: tokenHash,
          isPendingRoleSelection: isPending
        };
      }
      async switchActiveRole(rawToken, targetRole) {
        const cleanRole = (targetRole || "").trim();
        if (!cleanRole) {
          return {
            ok: false,
            status: 400,
            code: "MISSING_ROLE",
            message: "Target role is required."
          };
        }
        const validated = await this.validateSession(rawToken, { allowPendingRoleSelection: true });
        if (!validated.ok) {
          return validated;
        }
        const assignedRoles = Array.isArray(validated.user.roles) ? dedupeOfficialRoles(validated.user.roles) : dedupeOfficialRoles([validated.user.role]);
        const canonicalTarget = normalizeOfficialRole(cleanRole);
        if (!canonicalTarget || !assignedRoles.includes(canonicalTarget)) {
          return {
            ok: false,
            status: 403,
            code: "UNAUTHORIZED_ROLE",
            message: "Access denied: you are not assigned to the requested role."
          };
        }
        await executeRawSql(`
      UPDATE apmams.user_sessions
      SET active_role = ${sqlText(canonicalTarget)},
          last_active_at = CURRENT_TIMESTAMP,
          expires_at = GREATEST(expires_at, CURRENT_TIMESTAMP + (${SESSION_TTL_SECONDS} * INTERVAL '1 second'))
      WHERE session_id = ${sqlText(validated.sessionHash)}
        AND revoked_at IS NULL;
    `);
        const updatedUser = toPublicUser({
          ...validated.user,
          role: canonicalTarget,
          roles: assignedRoles,
          activeRole: canonicalTarget
        });
        return {
          ok: true,
          user: updatedUser,
          cookieMaxAge: SESSION_TTL_SECONDS
        };
      }
      async changePassword(rawToken, currentPassword, newPassword, fallbackUser) {
        let dbUser = null;
        let sessionHash = null;
        let requestedUser = null;
        if (fallbackUser) {
          if (typeof fallbackUser === "string" && fallbackUser.trim()) {
            requestedUser = await this.findDbUserByAppId(fallbackUser.trim());
          } else if (typeof fallbackUser === "object") {
            if (fallbackUser.email && typeof fallbackUser.email === "string") {
              requestedUser = await this.findDbUserByAppId(fallbackUser.email.trim());
            }
            if (!requestedUser && fallbackUser.userId && typeof fallbackUser.userId === "string") {
              requestedUser = await this.findDbUserByAppId(fallbackUser.userId.trim());
            }
            if (!requestedUser && fallbackUser.studentId && typeof fallbackUser.studentId === "string") {
              requestedUser = await this.findDbUserByAppId(fallbackUser.studentId.trim());
            }
            if (!requestedUser && fallbackUser.username && typeof fallbackUser.username === "string") {
              requestedUser = await this.findDbUserByAppId(fallbackUser.username.trim());
            }
          }
        }
        let sessionUser = null;
        if (rawToken && typeof rawToken === "string" && rawToken.length >= 16) {
          const validated = await this.validateSession(rawToken);
          if (validated.ok) {
            sessionUser = await this.findDbUserByAppId(validated.user.id);
            if (requestedUser && sessionUser && (sessionUser.id === requestedUser.id || sessionUser.email?.toLowerCase() === requestedUser.email?.toLowerCase() || sessionUser.studentId && sessionUser.studentId === requestedUser.studentId)) {
              sessionHash = validated.sessionHash;
            } else if (!requestedUser) {
              sessionHash = validated.sessionHash;
            }
          }
        }
        dbUser = requestedUser || sessionUser;
        if (!dbUser) {
          return {
            ok: false,
            status: 401,
            code: "UNAUTHENTICATED",
            message: "Account not found or session expired. Please sign in."
          };
        }
        if (typeof currentPassword !== "string" || !currentPassword.trim()) {
          return {
            ok: false,
            status: 400,
            code: "MISSING_CURRENT_PASSWORD",
            message: "Current password is required."
          };
        }
        const strongCheck = validateStrongPasswordRequirements(newPassword);
        if (!strongCheck.valid) {
          return {
            ok: false,
            status: 400,
            code: "WEAK_PASSWORD",
            message: strongCheck.message || "New password does not meet security requirements."
          };
        }
        const cleanCurrent = currentPassword.trim();
        const cleanNew = newPassword;
        if (currentPassword === cleanNew || cleanCurrent === cleanNew) {
          return {
            ok: false,
            status: 400,
            code: "SAME_PASSWORD",
            message: "New password must be different from your current password."
          };
        }
        let matchesCurrent = false;
        if (isValidBcryptHash(dbUser.passwordHash)) {
          matchesCurrent = await bcrypt.compare(currentPassword, dbUser.passwordHash);
          if (!matchesCurrent && cleanCurrent !== currentPassword) {
            matchesCurrent = await bcrypt.compare(cleanCurrent, dbUser.passwordHash);
          }
        }
        if (!matchesCurrent) {
          return {
            ok: false,
            status: 401,
            code: "INVALID_CURRENT_PASSWORD",
            message: "Current password is incorrect."
          };
        }
        const newHash = await hashPassword(cleanNew);
        await executeRawSql(`
      UPDATE apmams.users
      SET password_hash = ${sqlText(newHash)},
          must_change_password = FALSE,
          password_updated_at = CURRENT_TIMESTAMP
      WHERE app_user_id = ${sqlText(dbUser.id)} 
         OR user_id = ${Number(dbUser.user_id) || 0}
         OR LOWER(email) = LOWER(${sqlText(dbUser.email)});

      UPDATE apmams.user_sessions
      SET revoked_at = CURRENT_TIMESTAMP
      WHERE app_user_id = ${sqlText(dbUser.id)}
        ${sessionHash ? `AND session_id <> ${sqlText(sessionHash)}` : ""}
        AND revoked_at IS NULL;
    `);
        let newSessionToken;
        try {
          newSessionToken = await this.createSession(
            dbUser.id,
            dbUser.role || "Student Organization Officer",
            SESSION_TTL_SECONDS
          );
        } catch {
        }
        Promise.resolve().then(() => (init_UserRepository(), UserRepository_exports)).then((m) => m.userRepository.loadFromDatabase()).catch(() => {
        });
        return {
          ok: true,
          message: "Password updated successfully.",
          sessionToken: newSessionToken,
          cookieMaxAge: SESSION_TTL_SECONDS
        };
      }
      async logout(rawToken) {
        if (!rawToken || typeof rawToken !== "string") return;
        const tokenHash = hashSessionToken(rawToken);
        await this.revokeSessionByHash(tokenHash);
      }
      async revokeSessionByHash(sessionHash) {
        await executeRawSql(`
      UPDATE apmams.user_sessions
      SET revoked_at = CURRENT_TIMESTAMP
      WHERE session_id = ${sqlText(sessionHash)} AND revoked_at IS NULL;
    `);
      }
      async revokeAllSessionsForUser(appUserId) {
        if (!appUserId) return;
        await executeRawSql(`
      UPDATE apmams.user_sessions
      SET revoked_at = CURRENT_TIMESTAMP
      WHERE app_user_id = ${sqlText(appUserId)} AND revoked_at IS NULL;
    `);
      }
    };
    authService = new AuthService();
  }
});

// backend/app.ts
import express2 from "express";

// backend/index.ts
import { Router as Router11 } from "express";

// backend/controllers/ActivityController.ts
import { Router } from "express";

// backend/repositories/ActivityRepository.ts
init_initialData();
init_organizationUtils();

// src/utils/activityDate.ts
var MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];
function extractIsoDate(raw) {
  if (typeof raw !== "string") return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    const monthNum = Number(m);
    const dayNum = Number(d);
    if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
      return `${y}-${m}-${d}`;
    }
  }
  const parsed = Date.parse(trimmed);
  if (!Number.isNaN(parsed)) {
    const dt = new Date(parsed);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const d = String(dt.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return "";
}
function getMonthNumberFromLabel(label) {
  if (!label || typeof label !== "string") return null;
  const clean = label.trim().toLowerCase();
  if (!clean) return null;
  for (let i = 0; i < MONTH_NAMES.length; i++) {
    const full = MONTH_NAMES[i].toLowerCase();
    if (clean === full || clean.startsWith(full.slice(0, 3))) {
      return i + 1;
    }
  }
  const numMatch = clean.match(/^(\d{1,2})$/);
  if (numMatch) {
    const n = Number(numMatch[1]);
    if (n >= 1 && n <= 12) return n;
  }
  return null;
}
function getTargetYearFromFiscalYear(fiscalYear) {
  const yearDigits = fiscalYear?.match(/\d{4}/)?.[0];
  return yearDigits ? Number(yearDigits) : (/* @__PURE__ */ new Date()).getFullYear();
}
function extractCalendarDaysFromWeekLabel(weekLabel, monthLabel, fiscalYear) {
  if (!weekLabel || typeof weekLabel !== "string") return [];
  const monthNum = getMonthNumberFromLabel(monthLabel);
  if (!monthNum) return [];
  const yearNum = getTargetYearFromFiscalYear(fiscalYear);
  const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
  const parenMatch = weekLabel.match(/\(([^)]+)\)/);
  const rawSegment = parenMatch ? parenMatch[1] : /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(weekLabel) ? weekLabel : "";
  const daySegment = rawSegment.replace(/\b\d+\s*d(?:ays?)?\b/gi, "");
  if (!daySegment.trim()) return [];
  const daySet = /* @__PURE__ */ new Set();
  const rangeOrSingleMatches = daySegment.matchAll(/(\d{1,2})\s*(?:[-–—to]+\s*(\d{1,2}))?/gi);
  for (const m of rangeOrSingleMatches) {
    const a = Number(m[1]);
    const b = m[2] ? Number(m[2]) : a;
    if (a < 1 || a > daysInMonth) continue;
    const clampedEnd = Math.min(daysInMonth, Math.max(a, b));
    for (let d = a; d <= clampedEnd; d++) {
      daySet.add(d);
    }
  }
  return Array.from(daySet).sort((a, b) => a - b).map((d) => `${yearNum}-${String(monthNum).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
}
function deriveDateRangeFromTimeframe(monthLabel, weekLabel, fiscalYear) {
  const monthNum = getMonthNumberFromLabel(monthLabel);
  if (!monthNum) return null;
  const yearNum = getTargetYearFromFiscalYear(fiscalYear);
  const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
  const explicitDays = extractCalendarDaysFromWeekLabel(weekLabel, monthLabel, fiscalYear);
  if (explicitDays.length > 0) {
    return {
      startDate: explicitDays[0],
      endDate: explicitDays[explicitDays.length - 1]
    };
  }
  const weekLower = (weekLabel || "").trim().toLowerCase();
  let startYear = yearNum;
  let startMonth = monthNum;
  let startDay = 1;
  let endDay = Math.min(7, daysInMonth);
  const parseWeekOrdinal = (token) => {
    const clean = token.trim().toLowerCase();
    if (clean.includes("1st") || clean.includes("first") || clean === "1") return 1;
    if (clean.includes("2nd") || clean.includes("second") || clean === "2") return 2;
    if (clean.includes("3rd") || clean.includes("third") || clean === "3") return 3;
    if (clean.includes("4th") || clean.includes("fourth") || clean === "4") return 4;
    if (clean.includes("last") || clean.includes("5th") || clean.includes("fifth") || clean === "5") return 5;
    return null;
  };
  if (weekLower.includes("entire")) {
    startDay = 1;
    endDay = daysInMonth;
  } else if (weekLower.includes("last") && (weekLower.includes("first") || weekLower.includes("1st"))) {
    const prevMonth = monthNum === 1 ? 12 : monthNum - 1;
    const prevYear = monthNum === 1 ? yearNum - 1 : yearNum;
    const prevDays = new Date(prevYear, prevMonth, 0).getDate();
    startYear = prevYear;
    startMonth = prevMonth;
    startDay = Math.max(1, prevDays - 6);
    endDay = Math.min(7, daysInMonth);
  } else if (weekLower) {
    const tokens = weekLower.match(/(?:1st|2nd|3rd|4th|5th|first|second|third|fourth|fifth|last|\d+)/g) || [];
    const ordinals = tokens.map(parseWeekOrdinal).filter((n) => n !== null);
    if (ordinals.length >= 2) {
      const wStart = Math.min(ordinals[0], ordinals[1]);
      const wEnd = Math.max(ordinals[0], ordinals[1]);
      startDay = wStart >= 5 ? Math.max(1, daysInMonth - 6) : (wStart - 1) * 7 + 1;
      endDay = wEnd >= 5 ? daysInMonth : Math.min(wEnd * 7, daysInMonth);
    } else if (ordinals.length === 1) {
      const w = ordinals[0];
      if (w >= 5) {
        startDay = Math.max(1, daysInMonth - 6);
        endDay = daysInMonth;
      } else {
        startDay = (w - 1) * 7 + 1;
        endDay = Math.min(w * 7, daysInMonth);
      }
    }
  }
  const startStr = `${startYear}-${String(startMonth).padStart(2, "0")}-${String(startDay).padStart(2, "0")}`;
  const endStr = `${yearNum}-${String(monthNum).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;
  return {
    startDate: startStr,
    endDate: endStr < startStr ? startStr : endStr
  };
}
function resolveActivityDates(act) {
  const explicitStart = extractIsoDate(act.startDate) || extractIsoDate(act.scheduleStart) || extractIsoDate(act.date);
  const explicitEnd = extractIsoDate(act.endDate) || extractIsoDate(act.scheduleEnd);
  const effectiveFiscalYear = act.fiscalYear || (explicitStart ? explicitStart.slice(0, 4) : void 0);
  const yearDigits = String(effectiveFiscalYear || "").match(/\d{4}/)?.[0] || String((/* @__PURE__ */ new Date()).getFullYear());
  const derived = deriveDateRangeFromTimeframe(
    act.timeframeMonth,
    act.timeframeWeek,
    effectiveFiscalYear
  );
  const dadDate = extractIsoDate(act.designForm?.dateImplementation);
  if (dadDate) {
    const endDate2 = explicitEnd && explicitEnd >= dadDate ? explicitEnd : dadDate;
    return { startDate: dadDate, endDate: endDate2 };
  }
  const explicitSelectedDates = Array.isArray(act.selectedDates) ? act.selectedDates.map((d) => extractIsoDate(d)).filter(Boolean).sort() : [];
  const targetMonthNum = getMonthNumberFromLabel(act.timeframeMonth);
  if (explicitSelectedDates.length > 0) {
    const matchingMonthDates = targetMonthNum ? explicitSelectedDates.filter((d) => Number(d.slice(5, 7)) === targetMonthNum) : explicitSelectedDates;
    if (matchingMonthDates.length > 0) {
      return {
        startDate: matchingMonthDates[0],
        endDate: matchingMonthDates[matchingMonthDates.length - 1]
      };
    }
  }
  const isPlanRecord = Boolean(act.isActionPlanItem || act.source === "ACTION_PLAN" || act.timeframeMonth);
  if (isPlanRecord && derived) {
    const hasExplicitCalendarWeek = extractCalendarDaysFromWeekLabel(act.timeframeWeek, act.timeframeMonth, effectiveFiscalYear).length > 0;
    const isOldJanPlaceholder = !hasExplicitCalendarWeek && Boolean(targetMonthNum && targetMonthNum !== 1) && explicitStart === `${yearDigits}-01-15` && (!explicitEnd || explicitEnd === `${yearDigits}-01-20` || explicitEnd === `${yearDigits}-01-15`);
    const isOldJunPlaceholder = !hasExplicitCalendarWeek && explicitStart === `${yearDigits}-06-01` && (!explicitEnd || explicitEnd === `${yearDigits}-06-01`);
    const explicitMonthNum = explicitStart ? Number(explicitStart.slice(5, 7)) : null;
    const isMonthMismatch = Boolean(targetMonthNum && explicitMonthNum && targetMonthNum !== explicitMonthNum);
    if (!explicitStart || isOldJanPlaceholder || isOldJunPlaceholder || isMonthMismatch || hasExplicitCalendarWeek) {
      return derived;
    }
  }
  const startDate = explicitStart || derived?.startDate || `${yearDigits}-06-01`;
  let endDate = explicitEnd || (!explicitStart && derived ? derived.endDate : "") || startDate;
  if (endDate < startDate) {
    endDate = startDate;
  }
  return { startDate, endDate };
}

// backend/repositories/ActivityRepository.ts
init_database();
function buildOrgMatchCandidates(orgId) {
  const clean = (orgId || "").trim().toUpperCase();
  const canon = canonicalOrgId(orgId).toUpperCase();
  const set = /* @__PURE__ */ new Set([clean, canon]);
  if (canon === "CFMS" || clean === "CMFS") {
    set.add("CFMS");
    set.add("CMFS");
  }
  if (canon === "SENSSO" || clean === "SENSO" || clean === "SENSSO") {
    set.add("SENSO");
    set.add("SENSSO");
  }
  return Array.from(set).filter(Boolean);
}
function mapApprovalDecisionStatus(decision) {
  const upper = (decision || "").toUpperCase();
  if (upper.includes("APPROV") || upper.includes("ENDORS")) return "Approved";
  if (upper.includes("REJECT")) return "Rejected";
  if (upper.includes("DEFER")) return "Deferred";
  if (upper.includes("REVIS") || upper.includes("RETURN")) return "Revision Requested";
  return "Pending";
}
function computeProgressPercent(activity) {
  if (typeof activity.progress === "number") {
    return Math.max(0, Math.min(100, Math.round(activity.progress)));
  }
  if (activity.accomplishmentForm?.isCompleted && (activity.status === "Approved" || activity.approvalStatus === "Fully Approved")) {
    return 100;
  }
  const timeline = activity.timeline || [];
  if (timeline.length > 0) {
    const completed = timeline.filter((s) => s.status === "completed").length;
    return Math.max(10, Math.min(100, Math.round(completed / timeline.length * 100)));
  }
  if (activity.status === "Approved" || activity.approvalStatus === "Fully Approved") return 100;
  if (activity.designForm?.isCompleted) return 35;
  return 10;
}
var ActivityRepository = class {
  constructor() {
    this.activities = /* @__PURE__ */ new Map();
    this.isLoaded = false;
    this.seedDefaults();
  }
  seedDefaults() {
    for (const act of INITIAL_ACTIVITIES) {
      const cloned = JSON.parse(JSON.stringify(act));
      this.activities.set(cloned.id, cloned);
    }
  }
  async loadFromDatabase() {
    try {
      const rows = await query(`
        SELECT 
          app_activity_id as id,
          title,
          category,
          venue,
          (schedule_start AT TIME ZONE 'Asia/Manila')::date::text as "startDate",
          (schedule_end AT TIME ZONE 'Asia/Manila')::date::text as "endDate",
          (schedule_start AT TIME ZONE 'Asia/Manila')::date::text as "scheduleStart",
          (schedule_end AT TIME ZONE 'Asia/Manila')::date::text as "scheduleEnd",
          (schedule_start AT TIME ZONE 'Asia/Manila')::date::text as date,
          target_participants as "targetParticipants",
          status,
          progress,
          org_id_code as "orgId",
          fiscal_year as "fiscalYear",
          target_outputs as "targetOutputs",
          target_outputs as "expectedOutput",
          (
            SELECT string_agg(o.objective_text, E'
' ORDER BY o.objective_id)
            FROM apmams.activity_objectives o
            WHERE o.activity_id = apmams.activities.activity_id
          ) as "strategicObjectives",
          (
            SELECT f.funding_source
            FROM apmams.activity_financials f
            WHERE f.activity_id = apmams.activities.activity_id
            ORDER BY f.financial_id ASC
            LIMIT 1
          ) as "fundSource",
          key_performance_indicators as "keyPerformanceIndicators",
          budget::float as budget,
          allocated_budget::float as "allocatedBudget",
          expenses::float as expenses,
          source,
          workflow_status as "workflowStatus",
          approval_stage as "approvalStage",
          timeline,
          design_form as "designForm",
          accomplishment_form as "accomplishmentForm",
          financial_plan as "financialPlan",
          timeframe_month as "timeframeMonth",
          timeframe_week as "timeframeWeek",
          line_item_budget as "lineItemBudget",
          budget_line_items as "budgetLineItems",
          approval_status as "approvalStatus",
          approval_stage_index as "approvalStageIndex",
          current_approver_role as "currentApproverRole",
          approval_decisions as "approvalDecisions",
          rejection_remarks as "rejectionRemarks",
          rejected_by as "rejectedBy",
          rejected_at as "rejectedAt",
          deferred_remarks as "deferredRemarks",
          COALESCE(is_plan_confirmed, false) as "isPlanConfirmed",
          confirmed_by as "confirmedBy",
          confirmed_at as "confirmedAt",
          action_plan_status as "actionPlanStatus",
          action_plan_decision as "actionPlanDecision",
          version
        FROM apmams.activities
        ORDER BY activity_id ASC;
      `);
      if (rows && rows.length > 0) {
        let normalizedCount = 0;
        for (const row of rows) {
          const existing = this.activities.get(row.id) || {};
          const isHistoricalSeedWithDad = row.id?.startsWith("ACT-2026-") && row.id !== "ACT-2026-012" && Boolean(existing.designForm?.isCompleted);
          const resolvedDesignForm = row.designForm?.isCompleted ? row.designForm : isHistoricalSeedWithDad ? existing.designForm : row.designForm || void 0;
          const resolvedDates = resolveActivityDates({
            ...existing,
            ...row,
            designForm: resolvedDesignForm
          });
          let merged = {
            ...existing,
            ...row,
            id: row.id || existing.id,
            title: row.title || existing.title,
            orgId: row.orgId || existing.orgId,
            fiscalYear: row.fiscalYear || existing.fiscalYear,
            startDate: resolvedDates.startDate,
            endDate: resolvedDates.endDate,
            date: resolvedDates.startDate,
            status: row.status || existing.status,
            budget: Number(row.budget ?? existing.budget ?? 0),
            amount: Number(row.budget ?? existing.budget ?? 0),
            totalBudget: Number(row.allocatedBudget ?? existing.totalBudget ?? row.budget ?? 0),
            designForm: resolvedDesignForm,
            timeline: row.timeline || existing.timeline || [],
            timeframeMonth: row.timeframeMonth || existing.timeframeMonth,
            timeframeWeek: row.timeframeWeek || existing.timeframeWeek,
            selectedDates: Array.isArray(existing.selectedDates) && existing.selectedDates.length > 0 ? existing.selectedDates : extractCalendarDaysFromWeekLabel(
              row.timeframeWeek || existing.timeframeWeek,
              row.timeframeMonth || existing.timeframeMonth,
              row.fiscalYear || existing.fiscalYear
            ),
            strategicObjectives: row.strategicObjectives || existing.strategicObjectives,
            expectedOutput: row.expectedOutput || row.targetOutputs || existing.expectedOutput,
            fundSource: row.fundSource || existing.fundSource,
            lineItemBudget: row.lineItemBudget || existing.lineItemBudget,
            budgetLineItems: row.budgetLineItems || existing.budgetLineItems || [],
            approvalStatus: row.approvalStatus || existing.approvalStatus || row.status,
            approvalStageIndex: row.approvalStageIndex || existing.approvalStageIndex || 1,
            currentApproverRole: row.currentApproverRole || existing.currentApproverRole,
            approvalDecisions: row.approvalDecisions || existing.approvalDecisions || [],
            rejectionRemarks: row.rejectionRemarks || existing.rejectionRemarks,
            rejectedBy: row.rejectedBy || existing.rejectedBy,
            rejectedAt: row.rejectedAt || existing.rejectedAt,
            deferredRemarks: row.deferredRemarks || existing.deferredRemarks,
            actionPlanStatus: row.actionPlanStatus || existing.actionPlanStatus,
            actionPlanDecision: row.actionPlanDecision || existing.actionPlanDecision,
            version: row.version || existing.version || 1
          };
          let needsDbSync = Boolean(!row.designForm?.isCompleted && resolvedDesignForm?.isCompleted);
          const isActionPlanRecord = Boolean(
            merged.isActionPlanItem || merged.source === "ACTION_PLAN" || merged.isPlanConfirmed !== void 0 || merged.id?.startsWith("ACT-2027-") || merged.fiscalYear?.includes("2027")
          );
          if (isActionPlanRecord) {
            merged.isActionPlanItem = true;
            merged.source = "ACTION_PLAN";
            if (row.actionPlanStatus) {
              merged.actionPlanStatus = row.actionPlanStatus;
            } else if (merged.isPlanConfirmed || merged.status === "Approved" || merged.approvalStatus === "Fully Approved") {
              merged.actionPlanStatus = "Approved";
            } else if (merged.status === "Rejected" || merged.approvalStatus === "Rejected") {
              merged.actionPlanStatus = "Rejected";
            }
          }
          if (!merged.designForm?.isCompleted && merged.status !== "Rejected" && merged.approvalStatus !== "Rejected" && merged.actionPlanStatus !== "Rejected") {
            const expectedStage = isCollegeOrg(merged.orgId) ? "Stage 1: College Organization Submission" : "Stage 1: Organization Submission";
            const timelineInvalid = !merged.timeline || merged.timeline.length === 0 || merged.timeline[0]?.status !== "in_progress" || merged.timeline.some((s, idx) => idx > 0 && s.status !== "pending");
            if (merged.status !== "Draft" || merged.approvalStatus !== "Draft" || merged.workflowStatus !== "DRAFT" || merged.approvalStageIndex !== 1 || merged.approvalStage !== expectedStage || timelineInvalid) {
              merged = {
                ...merged,
                status: "Draft",
                workflowStatus: "DRAFT",
                approvalStatus: "Draft",
                approvalStageIndex: 1,
                approvalStage: expectedStage,
                timeline: getInitialTimelineForActionPlan(merged.orgId)
              };
              needsDbSync = true;
              normalizedCount++;
            }
          } else if (merged.designForm?.isCompleted && (merged.approvalStageIndex === void 0 || merged.approvalStageIndex <= 1) && merged.status !== "Rejected" && merged.approvalStatus !== "Rejected") {
            merged = {
              ...merged,
              approvalStageIndex: 2,
              status: "Pending",
              workflowStatus: "IN_PROGRESS",
              approvalStatus: "Pending Review",
              approvalStage: "Stage 2: Assigned Adviser Review",
              currentApproverRole: "ROLE_ADVISER",
              timeline: getWorkflowTimelineForOrg(merged.orgId, true)
            };
            needsDbSync = true;
            normalizedCount++;
          }
          this.activities.set(merged.id, merged);
          if (needsDbSync) {
            await this.save(merged);
          }
        }
        this.isLoaded = true;
        console.log(`[ActivityRepository] Loaded ${rows.length} activities from PostgreSQL (${normalizedCount} normalized to Stage 1 Draft without DAD).`);
      }
    } catch (err) {
      console.warn("[ActivityRepository] loadFromDatabase error:", err.message);
    }
  }
  findAll(filter) {
    let list = Array.from(this.activities.values());
    if (filter?.orgId && filter.orgId !== "ALL") {
      list = list.filter((a) => a.orgId.toUpperCase() === filter.orgId.toUpperCase());
    }
    if (filter?.fiscalYear) {
      list = list.filter((a) => a.fiscalYear === filter.fiscalYear);
    }
    if (filter?.status) {
      list = list.filter((a) => a.status === filter.status);
    }
    return list;
  }
  findById(id) {
    return this.activities.get(id);
  }
  async save(activity, actorUserId) {
    const previousSnapshot = this.activities.get(activity.id);
    const toPersist = { ...activity };
    this.activities.set(toPersist.id, toPersist);
    const actAny = toPersist;
    const yearDigits = String(toPersist.fiscalYear || "").match(/\d{4}/)?.[0] || "2027";
    const resolvedDates = resolveActivityDates(toPersist);
    const startDate = resolvedDates.startDate;
    const endDate = resolvedDates.endDate;
    toPersist.startDate = startDate;
    toPersist.endDate = endDate;
    const category = String(toPersist.strategicPillar || actAny.category || "Institutional Development").slice(0, 150);
    const targetOutputs = toPersist.expectedOutput || actAny.targetOutputs || "";
    const kpis = toPersist.kpiOutcome || actAny.keyPerformanceIndicators || "";
    const budget = Number(toPersist.designForm?.proposedBudget ?? toPersist.budget ?? toPersist.amount ?? 0) || 0;
    const allocatedBudget = Number(toPersist.totalBudget ?? actAny.allocatedBudget ?? budget) || 0;
    const expenses = Number(toPersist.accomplishmentForm?.actualBudget ?? actAny.expenses ?? 0) || 0;
    const progressPercent = computeProgressPercent(toPersist);
    const orgCandidates = buildOrgMatchCandidates(toPersist.orgId);
    const orgMatchSql = orgCandidates.map((c) => sqlEscape(c)).join(", ");
    const resolvedActionPlanExpr = `COALESCE(
      (SELECT action_plan_id FROM apmams.action_plans WHERE fiscal_year ILIKE ${sqlEscape("%" + yearDigits + "%")} OR folder_id ILIKE ${sqlEscape("%" + yearDigits + "%")} ORDER BY action_plan_id ASC LIMIT 1),
      (SELECT action_plan_id FROM apmams.action_plans ORDER BY action_plan_id ASC LIMIT 1)
    )`;
    const resolvedOrgExpr = `COALESCE(
      (SELECT organization_id FROM apmams.organizations WHERE UPPER(acronym) IN (${orgMatchSql}) OR UPPER(org_code) IN (${orgMatchSql}) ORDER BY organization_id ASC LIMIT 1),
      (SELECT organization_id FROM apmams.organizations ORDER BY organization_id ASC LIMIT 1)
    )`;
    const resolvedCreatorExpr = actorUserId ? `COALESCE((SELECT user_id FROM apmams.users WHERE app_user_id = ${sqlEscape(actorUserId)} LIMIT 1), (SELECT user_id FROM apmams.users ORDER BY user_id ASC LIMIT 1))` : `(SELECT user_id FROM apmams.users ORDER BY user_id ASC LIMIT 1)`;
    const fundingSource = String(
      toPersist.accomplishmentForm?.budgetSource || toPersist.designForm?.budgetSource || toPersist.fundSource || "Student Activity Fund"
    ).slice(0, 150);
    const isAccompSubmitted = Boolean(toPersist.accomplishmentForm?.isCompleted);
    const isFullyApproved = toPersist.status === "Approved" || toPersist.approvalStatus === "Fully Approved";
    const financialStatus = isAccompSubmitted ? isFullyApproved ? "Liquidated" : "Reconciled" : String(toPersist.status || "Draft").slice(0, 50);
    const objectivesList = (toPersist.designForm?.objectivesList?.filter(Boolean) || toPersist.accomplishmentForm?.objectives?.filter(Boolean) || (toPersist.strategicObjectives ? [toPersist.strategicObjectives] : [])).map((s) => String(s).trim()).filter(Boolean);
    const objectiveInsertsSql = objectivesList.length > 0 ? `
        DELETE FROM apmams.activity_objectives WHERE activity_id = v_activity_id;
        ${objectivesList.map((obj) => `
          INSERT INTO apmams.activity_objectives (activity_id, objective_text, target_indicator)
          VALUES (v_activity_id, ${sqlText(obj)}, ${sqlText(targetOutputs || "See expected output")});
        `).join("\n")}
      ` : "";
    const reqItems = [
      { title: "Detailed Activity Design (DAD) Form", done: Boolean(toPersist.designForm?.isCompleted) },
      { title: "Scanned Approved DAD", done: Boolean(toPersist.accomplishmentForm?.scannedDadFile) },
      { title: "Special Order (SO)", done: Boolean(toPersist.accomplishmentForm?.specialOrderFile) },
      { title: "Attendance Record", done: Boolean(toPersist.accomplishmentForm?.attendanceFile) },
      { title: "Program Flow", done: Boolean(toPersist.accomplishmentForm?.programFlowFile) },
      { title: "Accomplishment Report Submission", done: Boolean(toPersist.accomplishmentForm?.isCompleted) }
    ];
    const requirementsSql = `
      DELETE FROM apmams.activity_requirements WHERE activity_id = v_activity_id;
      ${reqItems.map((r) => `
        INSERT INTO apmams.activity_requirements (activity_id, title, is_completed, completed_at)
        VALUES (
          v_activity_id,
          ${sqlEscape(r.title)},
          ${r.done ? "TRUE" : "FALSE"},
          ${r.done ? "CURRENT_TIMESTAMP" : "NULL"}
        );
      `).join("\n")}
    `;
    const decisions = Array.isArray(toPersist.approvalDecisions) ? toPersist.approvalDecisions : [];
    const approvalsSql = decisions.length > 0 ? `
        DELETE FROM apmams.approvals WHERE activity_id = v_activity_id;
        ${decisions.map((d) => `
          INSERT INTO apmams.approvals (activity_id, approver_id, stage_name, status, remarks, decided_at)
          VALUES (
            v_activity_id,
            ${d.approverId ? `(SELECT user_id FROM apmams.users WHERE app_user_id = ${sqlEscape(d.approverId)} LIMIT 1)` : "NULL"},
            ${sqlEscape(String(d.stageName || "Review").slice(0, 150))},
            ${sqlEscape(mapApprovalDecisionStatus(d.decision))},
            ${d.remarks ? sqlText(d.remarks) : "NULL"},
            ${d.timestamp ? sqlEscape(d.timestamp) : "CURRENT_TIMESTAMP"}
          );
        `).join("\n")}
      ` : "";
    const isRejected = toPersist.status === "Rejected" || toPersist.approvalStatus === "Rejected";
    const calendarSql = isRejected ? `DELETE FROM apmams.calendar_events WHERE activity_id = v_activity_id;` : `
        INSERT INTO apmams.calendar_events (activity_id, organization_id, title, start_at, end_at, venue)
        VALUES (
          v_activity_id,
          v_org_id,
          ${sqlText(String(toPersist.title || "Untitled Activity").slice(0, 255))},
          ${sqlEscape(`${startDate}T08:00:00+08:00`)}::timestamptz,
          ${sqlEscape(`${endDate}T17:00:00+08:00`)}::timestamptz,
          ${sqlText(String(toPersist.venue || toPersist.designForm?.venue || "MSU Naawan Campus").slice(0, 255))}
        )
        ON CONFLICT (activity_id) WHERE activity_id IS NOT NULL DO UPDATE SET
          organization_id = EXCLUDED.organization_id,
          title = EXCLUDED.title,
          start_at = EXCLUDED.start_at,
          end_at = EXCLUDED.end_at,
          venue = EXCLUDED.venue;
      `;
    const progressRemark = String(toPersist.approvalStage || toPersist.status || "Draft");
    const sql = `
      BEGIN;
      DO $$
      DECLARE
        v_plan_id bigint;
        v_org_id bigint;
        v_creator_id bigint;
        v_activity_id bigint;
        v_last_pct integer;
        v_last_remark text;
      BEGIN
        v_plan_id := ${resolvedActionPlanExpr};
        v_org_id := ${resolvedOrgExpr};
        v_creator_id := ${resolvedCreatorExpr};

        INSERT INTO apmams.activities (
          action_plan_id, organization_id, title, category, venue, schedule_start, schedule_end,
          target_participants, status, progress, created_by,
          app_activity_id, org_id_code, fiscal_year, target_outputs, key_performance_indicators,
          budget, allocated_budget, expenses, source, workflow_status, approval_stage, timeline,
          design_form, accomplishment_form, financial_plan,
          timeframe_month, timeframe_week, line_item_budget, budget_line_items,
          approval_status, approval_stage_index, current_approver_role,
          approval_decisions, rejection_remarks, rejected_by, rejected_at,
          deferred_remarks, is_plan_confirmed, confirmed_by, confirmed_at,
          action_plan_status, action_plan_decision, version
        ) VALUES (
          v_plan_id,
          v_org_id,
          ${sqlText(String(toPersist.title || "Untitled Activity").slice(0, 255))},
          ${sqlEscape(category)},
          ${sqlText(String(toPersist.venue || toPersist.designForm?.venue || "MSU Naawan Campus").slice(0, 255))},
          ${sqlEscape(startDate)}::date,
          ${sqlEscape(endDate)}::date,
          ${Math.max(0, Math.floor(Number(toPersist.targetParticipants || 50)))},
          ${sqlEscape(String(toPersist.status || "Draft").slice(0, 50))},
          ${progressPercent},
          v_creator_id,
          ${sqlEscape(toPersist.id.slice(0, 50))},
          ${sqlEscape(String(toPersist.orgId).slice(0, 50))},
          ${sqlEscape(String(toPersist.fiscalYear || `FY ${yearDigits}`).slice(0, 50))},
          ${sqlText(targetOutputs)},
          ${sqlText(kpis)},
          ${budget},
          ${allocatedBudget},
          ${expenses},
          ${sqlEscape(String(toPersist.source || "ACTION_PLAN").slice(0, 50))},
          ${sqlEscape(String(toPersist.workflowStatus || "DRAFT").slice(0, 50))},
          ${sqlEscape(String(toPersist.approvalStage || "Stage 1: Organization Submission").slice(0, 150))},
          ${sqlEscape(toPersist.timeline || [])},
          ${sqlEscape(toPersist.designForm || null)},
          ${sqlEscape(toPersist.accomplishmentForm || null)},
          ${sqlEscape(actAny.financialPlan || null)},
          ${toPersist.timeframeMonth ? sqlEscape(String(toPersist.timeframeMonth).slice(0, 50)) : "NULL"},
          ${toPersist.timeframeWeek ? sqlEscape(String(toPersist.timeframeWeek).slice(0, 50)) : "NULL"},
          ${toPersist.lineItemBudget ? sqlText(toPersist.lineItemBudget) : "NULL"},
          ${sqlEscape(toPersist.budgetLineItems || [])},
          ${sqlEscape(String(toPersist.approvalStatus || toPersist.status || "Draft").slice(0, 50))},
          ${Math.max(1, Math.floor(Number(toPersist.approvalStageIndex || 1)))},
          ${toPersist.currentApproverRole ? sqlEscape(String(toPersist.currentApproverRole).slice(0, 100)) : "NULL"},
          ${sqlEscape(toPersist.approvalDecisions || [])},
          ${toPersist.rejectionRemarks ? sqlText(toPersist.rejectionRemarks) : "NULL"},
          ${toPersist.rejectedBy ? sqlEscape(String(toPersist.rejectedBy).slice(0, 100)) : "NULL"},
          ${toPersist.rejectedAt ? sqlEscape(toPersist.rejectedAt) : "NULL"},
          ${toPersist.deferredRemarks || toPersist.deferReason ? sqlText(toPersist.deferredRemarks || toPersist.deferReason) : "NULL"},
          ${toPersist.isPlanConfirmed ? "TRUE" : "FALSE"},
          ${toPersist.confirmedBy ? sqlEscape(String(toPersist.confirmedBy).slice(0, 100)) : "NULL"},
          ${toPersist.confirmedAt ? sqlEscape(toPersist.confirmedAt) : "NULL"},
          ${toPersist.actionPlanStatus ? sqlEscape(String(toPersist.actionPlanStatus).slice(0, 50)) : "NULL"},
          ${toPersist.actionPlanDecision ? sqlEscape(String(toPersist.actionPlanDecision).slice(0, 50)) : "NULL"},
          ${Math.max(1, Math.floor(Number(toPersist.version || 1)))}
        )
        ON CONFLICT (app_activity_id) DO UPDATE SET
          action_plan_id = COALESCE(EXCLUDED.action_plan_id, apmams.activities.action_plan_id),
          organization_id = COALESCE(EXCLUDED.organization_id, apmams.activities.organization_id),
          title = EXCLUDED.title,
          category = EXCLUDED.category,
          venue = EXCLUDED.venue,
          schedule_start = EXCLUDED.schedule_start,
          schedule_end = EXCLUDED.schedule_end,
          target_participants = EXCLUDED.target_participants,
          status = EXCLUDED.status,
          progress = EXCLUDED.progress,
          org_id_code = EXCLUDED.org_id_code,
          fiscal_year = EXCLUDED.fiscal_year,
          target_outputs = EXCLUDED.target_outputs,
          key_performance_indicators = EXCLUDED.key_performance_indicators,
          budget = EXCLUDED.budget,
          allocated_budget = EXCLUDED.allocated_budget,
          expenses = EXCLUDED.expenses,
          source = EXCLUDED.source,
          workflow_status = EXCLUDED.workflow_status,
          approval_stage = EXCLUDED.approval_stage,
          timeline = EXCLUDED.timeline,
          design_form = EXCLUDED.design_form,
          accomplishment_form = EXCLUDED.accomplishment_form,
          financial_plan = EXCLUDED.financial_plan,
          timeframe_month = EXCLUDED.timeframe_month,
          timeframe_week = EXCLUDED.timeframe_week,
          line_item_budget = EXCLUDED.line_item_budget,
          budget_line_items = EXCLUDED.budget_line_items,
          approval_status = EXCLUDED.approval_status,
          approval_stage_index = EXCLUDED.approval_stage_index,
          current_approver_role = EXCLUDED.current_approver_role,
          approval_decisions = EXCLUDED.approval_decisions,
          rejection_remarks = EXCLUDED.rejection_remarks,
          rejected_by = EXCLUDED.rejected_by,
          rejected_at = EXCLUDED.rejected_at,
          deferred_remarks = EXCLUDED.deferred_remarks,
          is_plan_confirmed = EXCLUDED.is_plan_confirmed,
          confirmed_by = EXCLUDED.confirmed_by,
          confirmed_at = EXCLUDED.confirmed_at,
          action_plan_status = EXCLUDED.action_plan_status,
          action_plan_decision = EXCLUDED.action_plan_decision,
          version = EXCLUDED.version,
          updated_at = CURRENT_TIMESTAMP
        RETURNING activity_id INTO v_activity_id;

        -- 1. Sync Financial Record
        INSERT INTO apmams.activity_financials (
          activity_id, estimated_budget, actual_expense, funding_source, financial_status, updated_at
        ) VALUES (
          v_activity_id,
          ${budget},
          ${expenses},
          ${sqlEscape(fundingSource)},
          ${sqlEscape(financialStatus)},
          CURRENT_TIMESTAMP
        )
        ON CONFLICT (activity_id) WHERE activity_id IS NOT NULL DO UPDATE SET
          estimated_budget = EXCLUDED.estimated_budget,
          actual_expense = EXCLUDED.actual_expense,
          funding_source = EXCLUDED.funding_source,
          financial_status = EXCLUDED.financial_status,
          updated_at = CURRENT_TIMESTAMP;

        -- 2. Sync Objectives
        ${objectiveInsertsSql}

        -- 3. Sync Requirements Checklist
        ${requirementsSql}

        -- 4. Sync Workflow Approvals
        ${approvalsSql}

        -- 5. Sync Progress Snapshot when stage/percentage changes
        SELECT progress_percent, remarks INTO v_last_pct, v_last_remark
        FROM apmams.activity_progress
        WHERE activity_id = v_activity_id
        ORDER BY progress_id DESC
        LIMIT 1;

        IF v_last_pct IS DISTINCT FROM ${progressPercent} OR v_last_remark IS DISTINCT FROM ${sqlText(progressRemark)} THEN
          INSERT INTO apmams.activity_progress (activity_id, recorded_by, progress_percent, remarks)
          VALUES (v_activity_id, v_creator_id, ${progressPercent}, ${sqlText(progressRemark)});
        END IF;

        -- 6. Sync Calendar Event
        ${calendarSql}

        -- 7. Update Action Plan summary metrics for the linked folder
        IF v_plan_id IS NOT NULL THEN
          UPDATE apmams.action_plans ap SET
            total_activities = COALESCE((SELECT count(*) FROM apmams.activities a WHERE a.action_plan_id = v_plan_id), 0),
            approved_count = COALESCE((SELECT count(*) FROM apmams.activities a WHERE a.action_plan_id = v_plan_id AND (a.status = 'Approved' OR a.approval_status = 'Fully Approved')), 0),
            pending_count = COALESCE((SELECT count(*) FROM apmams.activities a WHERE a.action_plan_id = v_plan_id AND a.status NOT IN ('Approved', 'Rejected')), 0),
            total_budget = COALESCE((SELECT sum(COALESCE(a.budget, 0)) FROM apmams.activities a WHERE a.action_plan_id = v_plan_id), 0),
            updated_at = CURRENT_TIMESTAMP
          WHERE ap.action_plan_id = v_plan_id;
        END IF;
      END $$;
      COMMIT;
    `;
    try {
      await executeRawSql(sql);
      return { ...toPersist };
    } catch (err) {
      if (previousSnapshot) {
        this.activities.set(toPersist.id, previousSnapshot);
      } else {
        this.activities.delete(toPersist.id);
      }
      console.error("[ActivityRepository] DB save failed:", err?.message || err);
      throw err;
    }
  }
  async batchSave(activities, actorUserId) {
    const savedList = [];
    for (const act of activities) {
      const saved = await this.save(act, actorUserId);
      savedList.push(saved);
    }
    return savedList;
  }
  async deleteById(id) {
    const existing = this.activities.get(id);
    const deleted = this.activities.delete(id);
    const sql = `
      BEGIN;
      DO $$
      DECLARE
        v_plan_id bigint;
      BEGIN
        SELECT action_plan_id INTO v_plan_id FROM apmams.activities WHERE app_activity_id = ${sqlEscape(id)} LIMIT 1;
        DELETE FROM apmams.activities WHERE app_activity_id = ${sqlEscape(id)};
        IF v_plan_id IS NOT NULL THEN
          UPDATE apmams.action_plans ap SET
            total_activities = COALESCE((SELECT count(*) FROM apmams.activities a WHERE a.action_plan_id = v_plan_id), 0),
            approved_count = COALESCE((SELECT count(*) FROM apmams.activities a WHERE a.action_plan_id = v_plan_id AND (a.status = 'Approved' OR a.approval_status = 'Fully Approved')), 0),
            pending_count = COALESCE((SELECT count(*) FROM apmams.activities a WHERE a.action_plan_id = v_plan_id AND a.status NOT IN ('Approved', 'Rejected')), 0),
            total_budget = COALESCE((SELECT sum(COALESCE(a.budget, 0)) FROM apmams.activities a WHERE a.action_plan_id = v_plan_id), 0),
            updated_at = CURRENT_TIMESTAMP
          WHERE ap.action_plan_id = v_plan_id;
        END IF;
      END $$;
      COMMIT;
    `;
    try {
      await executeRawSql(sql);
      return deleted;
    } catch (err) {
      if (existing) this.activities.set(id, existing);
      console.error("[ActivityRepository] DB delete failed:", err?.message || err);
      throw err;
    }
  }
  resetAllToStageOne() {
    this.seedDefaults();
    return this.findAll();
  }
};
var activityRepository = new ActivityRepository();

// backend/repositories/ActionPlanRepository.ts
init_initialData();
init_database();
var ActionPlanRepository = class {
  constructor() {
    this.folders = /* @__PURE__ */ new Map();
    this.isLoaded = false;
    this.seedDefaults();
    this.loadFromDatabase().catch((err) => {
      console.warn("[ActionPlanRepository] Failed initial DB load, using defaults:", err.message);
    });
  }
  seedDefaults() {
    for (const f of INITIAL_ACTION_PLAN_FOLDERS) {
      this.folders.set(f.id, { ...f });
    }
  }
  async loadFromDatabase() {
    try {
      const rows = await query(`
        SELECT 
          folder_id as id,
          fiscal_year as "fiscalYear",
          title,
          theme,
          status,
          submission_deadline as "submissionDeadline",
          created_at::text as "createdAt",
          created_by as "createdBy",
          total_activities as "totalActivitiesCount",
          approved_count as "approvedCount",
          pending_count as "pendingCount",
          total_budget::float as "allocatedBudget",
          description
        FROM apmams.action_plans
        ORDER BY action_plan_id ASC;
      `);
      if (rows && rows.length > 0) {
        for (const row of rows) {
          const existing = this.folders.get(row.id) || {};
          this.folders.set(row.id, {
            ...existing,
            ...row,
            id: row.id || existing.id,
            fiscalYear: row.fiscalYear || existing.fiscalYear,
            title: row.title || existing.title || `FY ${row.fiscalYear} Action Plan`,
            theme: row.theme || existing.theme,
            status: row.status || existing.status || "Open",
            submissionDeadline: row.submissionDeadline || existing.submissionDeadline,
            createdAt: row.createdAt || existing.createdAt || "2026-01-01",
            createdBy: row.createdBy || existing.createdBy || "System Administrator",
            allocatedBudget: Number(row.allocatedBudget ?? existing.allocatedBudget ?? 0),
            totalActivitiesCount: Number(row.totalActivitiesCount ?? existing.totalActivitiesCount ?? 0),
            approvedCount: Number(row.approvedCount ?? existing.approvedCount ?? 0),
            pendingCount: Number(row.pendingCount ?? existing.pendingCount ?? 0),
            description: row.description || existing.description
          });
        }
        this.isLoaded = true;
        console.log(`[ActionPlanRepository] Loaded ${rows.length} action plan folders from PostgreSQL.`);
      }
    } catch (err) {
      console.warn("[ActionPlanRepository] loadFromDatabase error:", err.message);
    }
  }
  findAll() {
    return Array.from(this.folders.values());
  }
  findById(id) {
    return this.folders.get(id);
  }
  async save(folder) {
    const previous = this.folders.get(folder.id);
    this.folders.set(folder.id, { ...folder });
    const sql = `
      INSERT INTO apmams.action_plans (
        organization_id, title, goal, description, academic_year, created_by,
        folder_id, fiscal_year, status, total_activities, total_budget,
        approved_count, pending_count, theme, submission_deadline
      ) VALUES (
        COALESCE((SELECT organization_id FROM apmams.organizations LIMIT 1), 1),
        ${sqlEscape(folder.title)},
        ${sqlEscape(folder.theme || folder.title)},
        ${sqlEscape(folder.description || "")},
        ${sqlEscape(folder.fiscalYear)},
        COALESCE((SELECT user_id FROM apmams.users LIMIT 1), 1),
        ${sqlEscape(folder.id)},
        ${sqlEscape(folder.fiscalYear)},
        ${sqlEscape(folder.status)},
        ${folder.totalActivitiesCount || 0},
        ${folder.allocatedBudget || 0},
        ${folder.approvedCount || 0},
        ${folder.pendingCount || 0},
        ${sqlEscape(folder.theme || "")},
        ${sqlEscape(folder.submissionDeadline || "")}
      )
      ON CONFLICT (folder_id) WHERE folder_id IS NOT NULL DO UPDATE SET
        title = EXCLUDED.title,
        status = EXCLUDED.status,
        total_activities = EXCLUDED.total_activities,
        total_budget = EXCLUDED.total_budget,
        approved_count = EXCLUDED.approved_count,
        pending_count = EXCLUDED.pending_count,
        theme = EXCLUDED.theme,
        submission_deadline = EXCLUDED.submission_deadline,
        description = EXCLUDED.description;
    `;
    try {
      await executeRawSql(sql);
    } catch (err) {
      if (previous) {
        this.folders.set(folder.id, previous);
      } else {
        this.folders.delete(folder.id);
      }
      console.error("[ActionPlanRepository] DB save failed:", err.message);
      throw err;
    }
    return { ...folder };
  }
  async deleteById(id) {
    const existing = this.folders.get(id);
    const fyName = existing?.fiscalYear || id;
    const deleted = this.folders.delete(id);
    const sql = `
      DELETE FROM apmams.action_plans 
      WHERE folder_id = ${sqlEscape(id)} OR fiscal_year = ${sqlEscape(fyName)};
    `;
    try {
      await executeRawSql(sql);
    } catch (err) {
      if (existing) {
        this.folders.set(id, existing);
      }
      console.error("[ActionPlanRepository] DB delete failed:", err.message);
      throw err;
    }
    return deleted;
  }
  async deleteByFiscalYear(fyName) {
    const removed = [];
    for (const [id, f] of Array.from(this.folders.entries())) {
      if (f.fiscalYear === fyName || f.id === `AP-${fyName.replace(/\s+/g, "")}`) {
        removed.push([id, f]);
        this.folders.delete(id);
      }
    }
    const sql = `
      DELETE FROM apmams.action_plans 
      WHERE fiscal_year = ${sqlEscape(fyName)} OR folder_id = ${sqlEscape(`AP-${fyName.replace(/\s+/g, "")}`)};
    `;
    try {
      await executeRawSql(sql);
    } catch (err) {
      for (const [id, f] of removed) {
        this.folders.set(id, f);
      }
      console.error("[ActionPlanRepository] DB delete failed:", err.message);
      throw err;
    }
    return removed.length > 0;
  }
};
var actionPlanRepository = new ActionPlanRepository();

// backend/services/WorkflowService.ts
init_initialData();
init_organizationUtils();

// backend/services/AuthorizationService.ts
init_initialData();
init_organizationUtils();
init_AuthService();
function getActiveSessionRole(user) {
  if (!user) return null;
  return normalizeOfficialRole(user.activeRole || user.role);
}
function requireRoles(...allowedRoles) {
  const normalizedAllowed = new Set(
    allowedRoles.map((r) => normalizeOfficialRole(r)).filter((r) => Boolean(r))
  );
  return async (req, res, next) => {
    return requireAuth(req, res, () => {
      const user = req.authUser;
      const activeRole = getActiveSessionRole(user);
      if (!user || !activeRole || !normalizedAllowed.has(activeRole)) {
        const assignedRoles = Array.isArray(user?.roles) ? user.roles.map((r) => normalizeOfficialRole(r)).filter((r) => Boolean(r)) : [];
        const holdsInactiveRequiredRole = assignedRoles.some((r) => normalizedAllowed.has(r));
        return res.status(403).json({
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          status: 403,
          success: false,
          code: holdsInactiveRequiredRole ? "ROLE_SWITCH_REQUIRED" : "FORBIDDEN",
          message: holdsInactiveRequiredRole ? "Forbidden: Your account holds the required role, but you must switch your active session role before performing this action." : "Forbidden: Your active role does not have permission to access this resource."
        });
      }
      return next();
    });
  };
}
function rejectImpersonationAttempt(req, res, options) {
  const user = req.authUser;
  if (!user) return false;
  const activeRole = getActiveSessionRole(user);
  const callerIsAdmin = isAdminRole(activeRole);
  if (!callerIsAdmin) {
    const headerUserId = req.headers["x-user-id"];
    if (typeof headerUserId === "string" && headerUserId.trim() && headerUserId.trim() !== user.id) {
      res.status(403).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 403,
        success: false,
        code: "IMPERSONATION_BLOCKED",
        message: "Forbidden: User identity cannot be overridden via x-user-id header."
      });
      return true;
    }
  }
  const headerRole = req.headers["x-role"];
  if (typeof headerRole === "string" && headerRole.trim()) {
    const normHeaderRole = normalizeOfficialRole(headerRole);
    if (!normHeaderRole || normHeaderRole !== activeRole) {
      res.status(403).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 403,
        success: false,
        code: "IMPERSONATION_BLOCKED",
        message: "Forbidden: Active role cannot be overridden via request headers."
      });
      return true;
    }
  }
  if (options?.checkHeaderOrgId !== false && !callerIsAdmin) {
    const headerOrgId = req.headers["x-org-id"];
    if (typeof headerOrgId === "string" && headerOrgId.trim() && (!user.orgId || !isSameOrg(headerOrgId.trim(), user.orgId))) {
      res.status(403).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 403,
        success: false,
        code: "IMPERSONATION_BLOCKED",
        message: "Forbidden: Organization scope cannot be overridden via x-org-id header."
      });
      return true;
    }
  }
  if (!callerIsAdmin) {
    const queryUserId = req.query?.userId;
    if (typeof queryUserId === "string" && queryUserId.trim() && queryUserId.trim() !== user.id) {
      res.status(403).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 403,
        success: false,
        code: "IMPERSONATION_BLOCKED",
        message: "Forbidden: User identity cannot be overridden via query parameters."
      });
      return true;
    }
  }
  if (!callerIsAdmin && options?.checkBodyUserId !== false && req.body && typeof req.body === "object" && !Array.isArray(req.body)) {
    const bodyUserId = req.body.userId;
    if (typeof bodyUserId === "string" && bodyUserId.trim() && bodyUserId.trim() !== user.id) {
      res.status(403).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 403,
        success: false,
        code: "IMPERSONATION_BLOCKED",
        message: "Forbidden: Actor userId in request body does not match authenticated session."
      });
      return true;
    }
    const bodyActorId = req.body.actorId;
    if (typeof bodyActorId === "string" && bodyActorId.trim() && bodyActorId.trim() !== user.id) {
      res.status(403).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 403,
        success: false,
        code: "IMPERSONATION_BLOCKED",
        message: "Forbidden: actorId in request body does not match authenticated session."
      });
      return true;
    }
  }
  if (options?.checkBodyRole && req.body && typeof req.body === "object" && !Array.isArray(req.body)) {
    const bodyRole = req.body.role;
    if (typeof bodyRole === "string" && bodyRole.trim()) {
      const normBodyRole = normalizeOfficialRole(bodyRole);
      if (!normBodyRole || normBodyRole !== activeRole) {
        res.status(403).json({
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          status: 403,
          success: false,
          code: "IMPERSONATION_BLOCKED",
          message: "Forbidden: Role in request body does not match active session role."
        });
        return true;
      }
    }
  }
  return false;
}
function resolveDeanCollegeId(user) {
  if (user.collegeId && user.collegeId !== "COLLEGE") {
    return canonicalOrgId(user.collegeId);
  }
  if (user.orgId && user.orgId !== "COLLEGE" && user.orgId !== "ALL") {
    return canonicalOrgId(user.orgId);
  }
  const hint = `${user.displayRole || ""} ${user.actualOrg || ""} ${user.email || ""}`.toUpperCase();
  if (hint.includes("CBIT")) return "CBIT";
  if (hint.includes("CELS") || hint.includes("ELSSA")) return "CELS";
  if (hint.includes("CFMS") || hint.includes("CMFS") || hint.includes("FIMSSO")) return "CFMS";
  if (hint.includes("CESS")) return "CESS";
  return "";
}
function canViewOrgPrivateData(user, targetOrgId) {
  if (!user || !targetOrgId) return false;
  const activeRole = getActiveSessionRole(user);
  if (!activeRole) return false;
  if (activeRole === "ROLE_ADMIN" || activeRole === "ROLE_OSD" || activeRole === "ROLE_OVCSAS") {
    return true;
  }
  if (activeRole === "ROLE_DEAN") {
    if (!isCollegeOrg(targetOrgId)) return false;
    const deanCollege = resolveDeanCollegeId(user);
    return Boolean(deanCollege) && isSameOrg(deanCollege, targetOrgId);
  }
  if (activeRole === "ROLE_ADVISER" || activeRole === "ROLE_ORGANIZATION") {
    if (!user.orgId || user.orgId === "ALL" || user.orgId === "ADMIN" || user.orgId === "COLLEGE") {
      return false;
    }
    return isSameOrg(user.orgId, targetOrgId);
  }
  return false;
}
function canModifyOrgActivity(user, targetOrgId) {
  if (!user || !targetOrgId) return false;
  const activeRole = getActiveSessionRole(user);
  if (activeRole === "ROLE_ADMIN") return true;
  if (activeRole === "ROLE_ORGANIZATION") {
    if (!user.orgId || user.orgId === "ALL" || user.orgId === "ADMIN" || user.orgId === "COLLEGE") {
      return false;
    }
    return isSameOrg(user.orgId, targetOrgId);
  }
  return false;
}
function sanitizeActivityForCrossOrgCalendar(act) {
  const redacted = {
    id: act.id,
    title: act.title,
    programActivity: act.programActivity || act.title,
    orgId: act.orgId,
    office: act.office || act.orgId,
    fiscalYear: act.fiscalYear,
    timeframe: act.timeframe,
    timeframeMonth: act.timeframeMonth,
    timeframeWeek: act.timeframeWeek,
    startDate: act.startDate,
    endDate: act.endDate,
    startTime: act.startTime,
    endTime: act.endTime,
    venue: act.venue,
    status: act.status,
    approvalStatus: act.approvalStatus,
    workflowStatus: act.workflowStatus,
    approvalStage: act.approvalStage,
    approvalStageIndex: act.approvalStageIndex,
    isActionPlanItem: act.isActionPlanItem,
    source: act.source,
    proposedBy: `${act.orgId} Organization`,
    description: "",
    budget: 0,
    amount: 0,
    totalBudget: 0,
    targetParticipants: 0
  };
  return redacted;
}
function isApprovedLikeStatus(act) {
  if (!act) return false;
  const s = (act.status || "").toUpperCase();
  const as = act.approvalStatus || "";
  const ws = (act.workflowStatus || "").toUpperCase();
  return s === "APPROVED" || as === "Fully Approved" || ws === "COMPLETED";
}
function enforceGenericActivityWritePolicy(caller, incoming, existing) {
  const activeRole = getActiveSessionRole(caller);
  const callerIsAdmin = activeRole === "ROLE_ADMIN";
  const callerIsOrgOfficer = activeRole === "ROLE_ORGANIZATION";
  if (!callerIsAdmin && !callerIsOrgOfficer) {
    return {
      ok: false,
      status: 403,
      code: "FORBIDDEN_ROLE",
      message: "Forbidden: Only Organization Officers (for their own organization) or System Administrators may create or edit activity records."
    };
  }
  const requestedOrg = (incoming.orgId || (!existing ? incoming.office : "") || "").trim();
  const targetOrg = existing ? existing.orgId : requestedOrg || caller.orgId || "";
  if (!targetOrg) {
    return {
      ok: false,
      status: 400,
      code: "VALIDATION_ERROR",
      message: "Validation failed: Organization (orgId) is required."
    };
  }
  if (callerIsOrgOfficer) {
    if (!caller.orgId || !isSameOrg(caller.orgId, targetOrg)) {
      return {
        ok: false,
        status: 403,
        code: "CROSS_ORG_FORBIDDEN",
        message: `Forbidden: Organization Officers of ${caller.orgId || "unassigned"} cannot create or modify records belonging to ${targetOrg}.`
      };
    }
    if (requestedOrg && !isSameOrg(caller.orgId, requestedOrg)) {
      return {
        ok: false,
        status: 403,
        code: "CROSS_ORG_FORBIDDEN",
        message: `Forbidden: Cannot assign or transfer an activity to unauthorized organization "${requestedOrg}".`
      };
    }
  } else if (existing && requestedOrg && !isSameOrg(existing.orgId, requestedOrg)) {
    return {
      ok: false,
      status: 403,
      code: "ORG_IMMUTABLE",
      message: "Forbidden: Cannot reassign an existing activity to a different organization."
    };
  }
  const incomingOverride = Boolean(
    incoming.designForm?.adminOverride?.isOverridden || incoming?.adminOverrideReason
  );
  const existingOverride = Boolean(
    existing?.designForm?.adminOverride?.isOverridden || existing?.adminOverrideReason
  );
  if (incomingOverride && !existingOverride && !callerIsAdmin) {
    return {
      ok: false,
      status: 403,
      code: "ADMIN_OVERRIDE_FORBIDDEN",
      message: "Forbidden: Only System Administrators may apply a venue conflict override."
    };
  }
  const canonicalOrg = existing ? existing.orgId : canonicalOrgId(targetOrg);
  const isCol = isCollegeOrg(canonicalOrg);
  const isActionPlan = Boolean(
    incoming.isActionPlanItem || incoming.source === "ACTION_PLAN" || incoming.isPlanConfirmed !== void 0 || incoming.timeframeMonth || incoming.id?.startsWith("ACT-2027-") || incoming.fiscalYear?.includes("2027") || existing?.isActionPlanItem || existing?.source === "ACTION_PLAN" || existing?.isPlanConfirmed !== void 0 || existing?.timeframeMonth || existing?.id?.startsWith("ACT-2027-") || existing?.fiscalYear?.includes("2027")
  );
  if (!existing) {
    if (isActionPlan && canModifyOrgActivity(caller, canonicalOrg)) {
      const isRejectedChoice = incoming.status === "Rejected" || incoming.approvalStatus === "Rejected" || incoming.actionPlanStatus === "Rejected";
      const isApprovedChoice = !isRejectedChoice && (incoming.status === "Approved" || incoming.approvalStatus === "Fully Approved" || incoming.actionPlanStatus === "Approved");
      const isFinalApproved = isApprovedChoice && Boolean(incoming.designForm?.isCompleted) && (incoming.status === "Approved" || incoming.approvalStatus === "Fully Approved");
      const stage1Title2 = isCol ? "Stage 1: College Organization Submission" : "Stage 1: Organization Submission";
      const cleanNew2 = {
        ...incoming,
        id: incoming.id || `ACT-${(/* @__PURE__ */ new Date()).getFullYear()}-${canonicalOrg}-${Math.floor(100 + Math.random() * 900)}`,
        orgId: canonicalOrg,
        office: incoming.office || canonicalOrg,
        status: isFinalApproved ? "Approved" : isRejectedChoice ? "Rejected" : "Draft",
        workflowStatus: isFinalApproved ? "COMPLETED" : isRejectedChoice ? "REJECTED" : "DRAFT",
        approvalStatus: isFinalApproved ? "Fully Approved" : isRejectedChoice ? "Rejected" : "Draft",
        actionPlanStatus: isApprovedChoice ? "Approved" : isRejectedChoice ? "Rejected" : incoming.actionPlanStatus || "Draft",
        actionPlanDecision: isApprovedChoice ? "Approved" : isRejectedChoice ? "Rejected" : incoming.actionPlanDecision,
        approvalStageIndex: 1,
        approvalStage: isFinalApproved ? "Approved by Organization" : isRejectedChoice ? "Rejected by Organization" : stage1Title2,
        currentApproverRole: isFinalApproved || isRejectedChoice ? void 0 : "ROLE_ORGANIZATION",
        timeline: getInitialTimelineForActionPlan(canonicalOrg),
        approvalDecisions: isFinalApproved ? [
          {
            id: `dec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            activityId: incoming.id || "",
            approverId: caller.id,
            approverName: caller.name,
            approverRole: activeRole || "ROLE_ORGANIZATION",
            stageName: "Organization Approval",
            decision: "APPROVE",
            remarks: incoming.rejectionRemarks || "Approved by Organization Officer",
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          }
        ] : isRejectedChoice ? [
          {
            id: `dec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            activityId: incoming.id || "",
            approverId: caller.id,
            approverName: caller.name,
            approverRole: activeRole || "ROLE_ORGANIZATION",
            stageName: "Organization Review",
            decision: "REJECT",
            remarks: incoming.rejectionRemarks || "Rejected by Organization",
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          }
        ] : [],
        workflowHistory: [],
        rejectedBy: isRejectedChoice ? incoming.rejectedBy || caller.name : void 0,
        rejectedAt: isRejectedChoice ? incoming.rejectedAt || (/* @__PURE__ */ new Date()).toISOString() : void 0,
        rejectionRemarks: isRejectedChoice ? incoming.rejectionRemarks || "Rejected by Organization" : void 0,
        deferredBy: void 0,
        deferredAt: void 0,
        deferReason: void 0,
        deferredRemarks: void 0
      };
      return { ok: true, activity: cleanNew2 };
    }
    if (isApprovedLikeStatus(incoming) || incoming.approvalStatus === "Approved at Current Stage" || typeof incoming.approvalStageIndex === "number" && incoming.approvalStageIndex > 2 || Array.isArray(incoming.approvalDecisions) && incoming.approvalDecisions.length > 0 || Array.isArray(incoming.timeline) && incoming.timeline.some((s) => s.id >= 2 && s.status === "completed")) {
      return {
        ok: false,
        status: 403,
        code: "WORKFLOW_BYPASS_BLOCKED",
        message: "Forbidden: Approval status, stage progression, and approver decisions cannot be set via generic activity creation."
      };
    }
    if (incoming.accomplishmentForm?.isCompleted) {
      return {
        ok: false,
        status: 403,
        code: "STAGE_BYPASS_BLOCKED",
        message: "Forbidden: Accomplishment report cannot be submitted before proposal approval stages are completed."
      };
    }
    const dadDone = Boolean(incoming.designForm?.isCompleted);
    const stage1Title = isCol ? "Stage 1: College Organization Submission" : "Stage 1: Organization Submission";
    const initialHistory = dadDone ? [
      {
        id: `wf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        stageId: 1,
        stageName: stage1Title,
        action: "SUBMIT",
        actorId: caller.id,
        actorName: caller.name,
        actorRole: activeRole || "ROLE_ORGANIZATION",
        remark: "Detailed Activity Design (DAD) form submitted.",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    ] : [];
    const cleanNew = {
      ...incoming,
      id: incoming.id || `ACT-${(/* @__PURE__ */ new Date()).getFullYear()}-${canonicalOrg}-${Math.floor(100 + Math.random() * 900)}`,
      orgId: canonicalOrg,
      office: canonicalOrg,
      status: dadDone ? "Pending" : "Draft",
      workflowStatus: dadDone ? "IN_PROGRESS" : "DRAFT",
      approvalStatus: dadDone ? "Pending Review" : "Draft",
      approvalStageIndex: dadDone ? 2 : 1,
      approvalStage: dadDone ? "Stage 2: Assigned Adviser Review" : stage1Title,
      currentApproverRole: dadDone ? "ROLE_ADVISER" : "ROLE_ORGANIZATION",
      timeline: dadDone ? getWorkflowTimelineForOrg(canonicalOrg, true) : getInitialTimelineForActionPlan(canonicalOrg),
      approvalDecisions: [],
      workflowHistory: initialHistory,
      rejectedBy: void 0,
      rejectedAt: void 0,
      rejectionRemarks: void 0,
      deferredBy: void 0,
      deferredAt: void 0,
      deferReason: void 0,
      deferredRemarks: void 0
    };
    return { ok: true, activity: cleanNew };
  }
  const existingWasApproved = isApprovedLikeStatus(existing);
  const existingWasRejected = existing.status === "Rejected" || existing.approvalStatus === "Rejected";
  if (!callerIsAdmin && !isActionPlan && (existingWasApproved || existingWasRejected)) {
    return {
      ok: false,
      status: 403,
      code: "LOCKED_ACTIVITY",
      message: "Forbidden: Activities that have already been finally approved or rejected cannot be modified."
    };
  }
  if (incoming.approvalDecisions !== void 0) {
    const canonicalizeDecisions = (list) => JSON.stringify(
      (Array.isArray(list) ? list : []).map((d) => ({
        id: d?.id || "",
        activityId: d?.activityId || "",
        approverId: d?.approverId || "",
        approverRole: d?.approverRole || "",
        stageName: d?.stageName || "",
        decision: d?.decision || "",
        remarks: d?.remarks || "",
        timestamp: d?.timestamp || ""
      }))
    );
    if (canonicalizeDecisions(incoming.approvalDecisions) !== canonicalizeDecisions(existing.approvalDecisions)) {
      return {
        ok: false,
        status: 403,
        code: "DECISION_TAMPER_BLOCKED",
        message: "Forbidden: Approver decisions cannot be modified through generic update endpoints."
      };
    }
  }
  if (!isActionPlan && !existingWasApproved && isApprovedLikeStatus(incoming)) {
    return {
      ok: false,
      status: 403,
      code: "WORKFLOW_BYPASS_BLOCKED",
      message: "Forbidden: Cannot change activity status to Approved through generic update endpoints."
    };
  }
  if (incoming.approvalStatus === "Approved at Current Stage" && existing.approvalStatus !== "Approved at Current Stage") {
    return {
      ok: false,
      status: 403,
      code: "WORKFLOW_BYPASS_BLOCKED",
      message: "Forbidden: Cannot set stage approval status through generic update endpoints."
    };
  }
  const existingDadDone = Boolean(existing.designForm?.isCompleted);
  const nextDesignForm = incoming.designForm !== void 0 ? incoming.designForm : existing.designForm;
  const nextDadDone = Boolean(nextDesignForm?.isCompleted);
  const existingAccompDone = Boolean(existing.accomplishmentForm?.isCompleted);
  const nextAccompForm = incoming.accomplishmentForm !== void 0 ? incoming.accomplishmentForm : existing.accomplishmentForm;
  const nextAccompDone = Boolean(nextAccompForm?.isCompleted);
  const ovcsasStageId = isCol ? 5 : 4;
  const accompStageId = isCol ? 6 : 5;
  const finalAdviserStageId = isCol ? 7 : 6;
  const ovcsasAlreadyCompleted = Boolean(
    existing.timeline?.find((s) => s.id === ovcsasStageId)?.status === "completed"
  );
  if (!existingAccompDone && nextAccompDone && !ovcsasAlreadyCompleted) {
    return {
      ok: false,
      status: 403,
      code: "STAGE_BYPASS_BLOCKED",
      message: "Forbidden: Accomplishment report cannot be submitted until OVCSAS approval is completed."
    };
  }
  const existingStageIdx = existing.approvalStageIndex || 1;
  const isTransitionStage1To2 = nextDadDone && existingStageIdx <= 1;
  const isTransitionAccomplishment = !existingAccompDone && nextAccompDone && ovcsasAlreadyCompleted;
  if (typeof incoming.approvalStageIndex === "number" && incoming.approvalStageIndex > existingStageIdx && !(isTransitionStage1To2 && incoming.approvalStageIndex === 2) && !(isTransitionAccomplishment && incoming.approvalStageIndex === finalAdviserStageId)) {
    return {
      ok: false,
      status: 403,
      code: "STAGE_BYPASS_BLOCKED",
      message: "Forbidden: Cannot advance workflow stage index through generic update endpoints."
    };
  }
  if (Array.isArray(incoming.timeline) && !isTransitionStage1To2 && !isTransitionAccomplishment) {
    const newlyCompletedApproverStep = incoming.timeline.some((incStep) => {
      if (incStep.status !== "completed") return false;
      const oldStep = existing.timeline?.find((s) => s.id === incStep.id);
      return oldStep?.status !== "completed";
    });
    if (newlyCompletedApproverStep) {
      return {
        ok: false,
        status: 403,
        code: "WORKFLOW_BYPASS_BLOCKED",
        message: "Forbidden: Cannot mark workflow stages completed through generic update endpoints."
      };
    }
  }
  let nextStatus = existing.status;
  let nextWorkflowStatus = existing.workflowStatus;
  let nextApprovalStatus = existing.approvalStatus;
  let nextApprovalStage = existing.approvalStage;
  let nextApprovalStageIndex = existingStageIdx;
  let nextCurrentApproverRole = existing.currentApproverRole;
  let nextTimeline = existing.timeline || getWorkflowTimelineForOrg(canonicalOrg, nextDadDone);
  let nextHistory = [...existing.workflowHistory || []];
  let nextActionPlanStatus = existing.actionPlanStatus;
  let nextActionPlanDecision = existing.actionPlanDecision;
  let nextRejectedBy = existing.rejectedBy;
  let nextRejectedAt = existing.rejectedAt;
  let nextRejectionRemarks = existing.rejectionRemarks;
  if (isTransitionStage1To2) {
    nextStatus = "Pending";
    nextWorkflowStatus = "IN_PROGRESS";
    nextApprovalStatus = "Pending Review";
    nextApprovalStage = "Stage 2: Assigned Adviser Review";
    nextApprovalStageIndex = 2;
    nextCurrentApproverRole = "ROLE_ADVISER";
    nextTimeline = getWorkflowTimelineForOrg(canonicalOrg, true);
    nextHistory.push({
      id: `wf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      stageId: 1,
      stageName: isCol ? "Stage 1: College Organization Submission" : "Stage 1: Organization Submission",
      action: "SUBMIT",
      actorId: caller.id,
      actorName: caller.name,
      actorRole: activeRole || "ROLE_ORGANIZATION",
      remark: "Detailed Activity Design (DAD) form submitted. Forwarded to Assigned Adviser.",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } else if (isTransitionAccomplishment) {
    nextStatus = "Pending";
    nextWorkflowStatus = "IN_PROGRESS";
    nextApprovalStatus = "Approved at Current Stage";
    nextApprovalStage = `Stage ${finalAdviserStageId}: Adviser Accomplishment Review & Final Sign-Off`;
    nextApprovalStageIndex = finalAdviserStageId;
    nextCurrentApproverRole = "ROLE_ADVISER";
    nextTimeline = (existing.timeline || getWorkflowTimelineForOrg(canonicalOrg, true)).map((step) => {
      if (step.id <= accompStageId) {
        return { ...step, status: "completed", updatedAt: step.updatedAt || (/* @__PURE__ */ new Date()).toISOString().split("T")[0] };
      }
      if (step.id === finalAdviserStageId) {
        return { ...step, status: "in_progress" };
      }
      return step;
    });
    nextHistory.push({
      id: `wf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      stageId: accompStageId,
      stageName: `Stage ${accompStageId}: Accomplishment Report Submission`,
      action: "SUBMIT",
      actorId: caller.id,
      actorName: caller.name,
      actorRole: activeRole || "ROLE_ORGANIZATION",
      remark: "Accomplishment and liquidation report submitted to Adviser for final sign-off.",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } else if (isActionPlan && canModifyOrgActivity(caller, canonicalOrg) && !nextDadDone) {
    const isRejectedChoice = incoming.status === "Rejected" || incoming.approvalStatus === "Rejected" || incoming.actionPlanStatus === "Rejected";
    const isApprovedChoice = !isRejectedChoice && (incoming.status === "Approved" || incoming.approvalStatus === "Fully Approved" || incoming.actionPlanStatus === "Approved");
    const isDraftChoice = !isRejectedChoice && !isApprovedChoice && (incoming.status === "Draft" || incoming.approvalStatus === "Draft" || incoming.actionPlanStatus === "Draft");
    if (isApprovedChoice) {
      nextStatus = "Draft";
      nextWorkflowStatus = "DRAFT";
      nextApprovalStatus = "Draft";
      nextApprovalStage = isCol ? "Stage 1: College Organization Submission" : "Stage 1: Organization Submission";
      nextApprovalStageIndex = 1;
      nextCurrentApproverRole = "ROLE_ORGANIZATION";
      nextActionPlanStatus = "Approved";
      nextActionPlanDecision = "Approved";
      nextRejectedBy = void 0;
      nextRejectedAt = void 0;
      nextRejectionRemarks = void 0;
    } else if (isRejectedChoice) {
      nextStatus = "Rejected";
      nextWorkflowStatus = "REJECTED";
      nextApprovalStatus = "Rejected";
      nextApprovalStage = "Rejected by Organization";
      nextApprovalStageIndex = 1;
      nextCurrentApproverRole = void 0;
      nextActionPlanStatus = "Rejected";
      nextActionPlanDecision = "Rejected";
      nextRejectedBy = incoming.rejectedBy || existing.rejectedBy || caller.name;
      nextRejectedAt = incoming.rejectedAt || existing.rejectedAt || (/* @__PURE__ */ new Date()).toISOString();
      nextRejectionRemarks = incoming.rejectionRemarks || existing.rejectionRemarks || "Rejected by Organization";
    } else if (isDraftChoice) {
      nextStatus = "Draft";
      nextWorkflowStatus = "DRAFT";
      nextApprovalStatus = "Draft";
      nextApprovalStage = isCol ? "Stage 1: College Organization Submission" : "Stage 1: Organization Submission";
      nextApprovalStageIndex = 1;
      nextCurrentApproverRole = "ROLE_ORGANIZATION";
      nextActionPlanStatus = "Draft";
      nextActionPlanDecision = void 0;
      nextRejectedBy = void 0;
      nextRejectedAt = void 0;
      nextRejectionRemarks = void 0;
    }
  } else if (!nextDadDone && !existingWasRejected && !isActionPlan) {
    nextStatus = "Draft";
    nextWorkflowStatus = "DRAFT";
    nextApprovalStatus = "Draft";
    nextApprovalStageIndex = 1;
    nextApprovalStage = isCol ? "Stage 1: College Organization Submission" : "Stage 1: Organization Submission";
    nextCurrentApproverRole = "ROLE_ORGANIZATION";
    nextTimeline = getInitialTimelineForActionPlan(canonicalOrg);
  }
  const safeUpdated = {
    ...existing,
    ...incoming,
    id: existing.id,
    orgId: existing.orgId,
    office: incoming.office ?? existing.office ?? existing.orgId,
    designForm: nextDesignForm,
    accomplishmentForm: nextAccompForm,
    status: nextStatus,
    workflowStatus: nextWorkflowStatus,
    approvalStatus: nextApprovalStatus,
    approvalStage: nextApprovalStage,
    approvalStageIndex: nextApprovalStageIndex,
    currentApproverRole: nextCurrentApproverRole,
    actionPlanStatus: nextActionPlanStatus,
    actionPlanDecision: nextActionPlanDecision,
    timeline: nextTimeline,
    approvalDecisions: existing.approvalDecisions || [],
    workflowHistory: nextHistory,
    rejectedBy: nextRejectedBy,
    rejectedAt: nextRejectedAt,
    rejectionRemarks: nextRejectionRemarks,
    deferredBy: existing.deferredBy,
    deferredAt: existing.deferredAt,
    deferReason: existing.deferReason,
    deferredRemarks: existing.deferredRemarks
  };
  return { ok: true, activity: safeUpdated };
}

// backend/services/WorkflowService.ts
init_AuthService();
var WorkflowService = class {
  /**
   * Determine whether an organization requires College Dean routing
   */
  isCollege(orgId) {
    return isCollegeOrg(orgId);
  }
  /**
   * Return the configured workflow stages for an organization
   */
  getStagesForOrg(orgId, dadCompleted = false) {
    return getWorkflowTimelineForOrg(orgId, dadCompleted);
  }
  /**
   * Maximum approval stages for the activity
   */
  getMaxStages(orgId) {
    return this.isCollege(orgId) ? 7 : 6;
  }
  /**
   * Calculate the current active stage index (1-based)
   */
  getCurrentStageIndex(activity) {
    if (!activity.designForm?.isCompleted) {
      return 1;
    }
    const maxStages = this.getMaxStages(activity.orgId);
    const finalStep = activity.timeline?.find((s) => s.id === maxStages);
    if (finalStep?.status === "completed" || activity.workflowStatus === "COMPLETED") {
      return maxStages;
    }
    if (activity.accomplishmentForm?.isCompleted) {
      return maxStages;
    }
    if (activity.approvalStatus === "Fully Approved" || activity.status === "Approved") {
      return maxStages;
    }
    if (activity.approvalStageIndex && activity.approvalStageIndex > 1) {
      return Math.min(activity.approvalStageIndex, maxStages);
    }
    if (activity.timeline && activity.timeline.length > 0) {
      const inProgress = activity.timeline.find((s) => s.status === "in_progress");
      if (inProgress && inProgress.id > 1) return Math.min(inProgress.id, maxStages);
      const lastCompleted = [...activity.timeline].reverse().find((s) => s.status === "completed");
      if (lastCompleted && lastCompleted.id >= 1) return Math.min(Math.max(lastCompleted.id + 1, 2), maxStages);
    }
    const stage = activity.approvalStage?.toLowerCase() || "";
    if (stage.includes("sign-off") || stage.includes("final")) return maxStages;
    if (stage.includes("accomplishment") || stage.includes("liquidation")) return this.isCollege(activity.orgId) ? 6 : 5;
    if (stage.includes("ovcsas")) return this.isCollege(activity.orgId) ? 5 : 4;
    if (stage.includes("osd")) return this.isCollege(activity.orgId) ? 4 : 3;
    if (stage.includes("dean")) return 3;
    if (stage.includes("adviser")) return 2;
    return 2;
  }
  withActiveRole(user) {
    const activeRole = getActiveSessionRole(user);
    if (!activeRole) return null;
    return {
      ...user,
      role: activeRole,
      activeRole
    };
  }
  isDeferredState(activity) {
    return activity.approvalStatus === "Deferred" || activity.status === "DEFERRED" || activity.status === "DEFERRED FOR REVISION" || activity.approvalStage === "DEFERRED FOR REVISION";
  }
  /**
   * Approve an activity individually at its current stage
   */
  approveActivity(activity, currentUser, remarks) {
    const effectiveUser = this.withActiveRole(currentUser);
    if (!effectiveUser) {
      return {
        success: false,
        message: "Forbidden: Active session role is not authorized to perform approvals.",
        statusCode: 403
      };
    }
    const activeRole = normalizeOfficialRole(effectiveUser.activeRole || effectiveUser.role);
    if (!activity.designForm?.isCompleted) {
      return {
        success: false,
        message: "Cannot approve activity: The Detailed Activity Design (DAD) form has not been filled out and submitted yet.",
        statusCode: 400
      };
    }
    const maxStages = this.getMaxStages(activity.orgId);
    const currentStage = this.getCurrentStageIndex(activity);
    const finalStep = activity.timeline?.find((s) => s.id === maxStages);
    const isFinalPendingAccomp = Boolean(activity.accomplishmentForm?.isCompleted && finalStep && finalStep.status !== "completed");
    if (!isFinalPendingAccomp && (activity.approvalStatus === "Fully Approved" || activity.status === "Approved" || activity.workflowStatus === "COMPLETED")) {
      return {
        success: false,
        message: "Activity has already completed all approval stages.",
        statusCode: 400
      };
    }
    if (activity.approvalStatus === "Rejected" || activity.status === "Rejected") {
      return {
        success: false,
        message: "Activity has been permanently rejected for this submission.",
        statusCode: 400
      };
    }
    if (this.isDeferredState(activity)) {
      return {
        success: false,
        message: "Cannot approve activity while deferred: the organization must revise and resubmit it first.",
        statusCode: 403
      };
    }
    const perm = evaluateStepPermission(effectiveUser, activity, currentStage);
    if (!perm.canApprove) {
      return {
        success: false,
        message: `Permission Denied: ${perm.reason}`,
        statusCode: 403
      };
    }
    const stages = this.getStagesForOrg(activity.orgId, true);
    const currentTimeline = activity.timeline && activity.timeline.length > 0 ? [...activity.timeline] : JSON.parse(JSON.stringify(stages));
    const currentStepObj = currentTimeline.find((s) => s.id === currentStage);
    const currentStepTitle = currentStepObj ? currentStepObj.title : `Stage ${currentStage}`;
    const isFinalStage = currentStage >= maxStages;
    const updatedTimeline = currentTimeline.map((step) => {
      if (step.id <= currentStage) {
        return {
          ...step,
          status: "completed",
          updatedAt: step.updatedAt || (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
        };
      }
      if (!isFinalStage && step.id === currentStage + 1) {
        return {
          ...step,
          status: "in_progress"
        };
      }
      return step;
    });
    const nextStepObj = updatedTimeline.find((s) => s.id === currentStage + 1);
    const nextStageTitle = nextStepObj ? nextStepObj.title : "Approved / Completed";
    const decisionRecord = {
      id: `dec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      activityId: activity.id,
      approverId: effectiveUser.id,
      approverName: effectiveUser.name,
      approverRole: effectiveUser.role,
      stageName: currentStepTitle,
      decision: "APPROVE",
      remarks: remarks || (isFinalStage ? "Final accomplishment review and sign-off granted." : `Approved at ${currentStepTitle}.`),
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      versionReviewed: activity.version || 1
    };
    const existingDecisions = activity.approvalDecisions || [];
    const updatedDecisions = [...existingDecisions, decisionRecord];
    const historyRecord = {
      id: `wf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      stageId: currentStage,
      stageName: currentStepTitle,
      action: isFinalStage ? "FINAL_APPROVE" : "APPROVE",
      actorId: effectiveUser.id,
      actorName: effectiveUser.name,
      actorRole: effectiveUser.role,
      remark: decisionRecord.remarks,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    const updatedHistory = [...activity.workflowHistory || [], historyRecord];
    const updatedActivity = {
      ...activity,
      approvalStatus: isFinalStage ? "Fully Approved" : "Approved at Current Stage",
      status: isFinalStage ? "Approved" : "Pending",
      workflowStatus: isFinalStage ? "COMPLETED" : "IN_PROGRESS",
      approvalStage: isFinalStage ? "Approved" : nextStageTitle,
      approvalStageIndex: isFinalStage ? maxStages : currentStage + 1,
      currentApproverRole: nextStepObj?.role,
      timeline: updatedTimeline,
      approvalDecisions: updatedDecisions,
      workflowHistory: updatedHistory,
      deferReason: void 0,
      deferredBy: void 0,
      deferredAt: void 0,
      deferredRemarks: void 0
    };
    return {
      success: true,
      updatedActivity,
      message: isFinalStage ? "Activity accomplishment report granted final sign-off and marked Fully Approved!" : `Approved at ${currentStepTitle}. Forwarded to ${nextStageTitle}.`,
      statusCode: 200
    };
  }
  /**
   * Defer activity with mandatory remarks
   */
  deferActivity(activity, currentUser, reason, requestedStepId) {
    const effectiveUser = this.withActiveRole(currentUser);
    if (!effectiveUser) {
      return {
        success: false,
        message: "Forbidden: Active session role is not authorized.",
        statusCode: 403
      };
    }
    if (!reason || !reason.trim()) {
      return {
        success: false,
        message: "A detailed reason/remark is mandatory when deferring an activity for revision.",
        statusCode: 400
      };
    }
    if (this.isDeferredState(activity) || activity.approvalStatus === "Rejected" || activity.status === "Rejected" || activity.approvalStatus === "Fully Approved" || activity.status === "Approved") {
      return {
        success: false,
        message: "Forbidden: Cannot overwrite an existing decision on a deferred, rejected, or completed activity.",
        statusCode: 403
      };
    }
    const actualStage = this.getCurrentStageIndex(activity);
    if (requestedStepId !== void 0 && Number(requestedStepId) !== actualStage) {
      return {
        success: false,
        message: `Stage bypass blocked: Activity is currently at stage ${actualStage}; cannot defer stage ${requestedStepId}.`,
        statusCode: 403
      };
    }
    const perm = evaluateStepPermission(effectiveUser, activity, actualStage);
    if (!perm.canDefer) {
      return {
        success: false,
        message: `Permission Denied: ${perm.reason}`,
        statusCode: 403
      };
    }
    const stages = this.getStagesForOrg(activity.orgId, true);
    const currentTimeline = activity.timeline && activity.timeline.length > 0 ? [...activity.timeline] : JSON.parse(JSON.stringify(stages));
    const currentStepObj = currentTimeline.find((s) => s.id === actualStage);
    const stageTitle = currentStepObj ? currentStepObj.title : `Stage ${actualStage}`;
    const decisionRecord = {
      id: `dec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      activityId: activity.id,
      approverId: effectiveUser.id,
      approverName: effectiveUser.name,
      approverRole: effectiveUser.role,
      stageName: stageTitle,
      decision: "DEFER",
      remarks: reason.trim(),
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      versionReviewed: activity.version || 1
    };
    const historyRecord = {
      id: `wf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      stageId: actualStage,
      stageName: stageTitle,
      action: "DEFER",
      actorId: effectiveUser.id,
      actorName: effectiveUser.name,
      actorRole: effectiveUser.role,
      remark: reason.trim(),
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    const updatedActivity = {
      ...activity,
      approvalStatus: "Deferred",
      status: "DEFERRED",
      approvalStage: "DEFERRED FOR REVISION",
      deferReason: reason.trim(),
      deferredRemarks: reason.trim(),
      deferredBy: `${effectiveUser.name} (${effectiveUser.role})`,
      deferredAt: (/* @__PURE__ */ new Date()).toISOString(),
      timeline: currentTimeline,
      approvalDecisions: [...activity.approvalDecisions || [], decisionRecord],
      workflowHistory: [...activity.workflowHistory || [], historyRecord]
    };
    return {
      success: true,
      updatedActivity,
      message: `Activity has been deferred for revision and returned to ${activity.orgId}.`,
      statusCode: 200
    };
  }
  /**
   * Final rejection by authorized institutional reviewer at the active workflow stage
   */
  rejectActivity(activity, currentUser, remarks, requestedStepId) {
    const effectiveUser = this.withActiveRole(currentUser);
    if (!effectiveUser) {
      return {
        success: false,
        message: "Forbidden: Active session role is not authorized.",
        statusCode: 403
      };
    }
    if (!remarks || !remarks.trim()) {
      return {
        success: false,
        message: "A mandatory remark/reason explaining the final rejection is required under institutional policy.",
        statusCode: 400
      };
    }
    const activeRole = normalizeOfficialRole(effectiveUser.activeRole || effectiveUser.role);
    const isActionPlan = Boolean(
      activity.isActionPlanItem || activity.source === "ACTION_PLAN" || activity.isPlanConfirmed !== void 0 || activity.timeframeMonth || activity.fiscalYear && activity.fiscalYear.includes("2027") || activity.id?.startsWith("ACT-2027-")
    );
    const isOrgOfficerForOrg = (activeRole === "ROLE_ORGANIZATION" || effectiveUser.role === "ROLE_ORGANIZATION" || effectiveUser.role === "Student Organization Officer" || effectiveUser.role === "Org President" || effectiveUser.role === "Org Treasurer") && isSameOrg(effectiveUser.orgId, activity.orgId);
    const callerIsAdmin = activeRole === "ROLE_ADMIN" || effectiveUser.role === "ROLE_ADMIN" || effectiveUser.role === "System Administrator";
    if (isActionPlan || isOrgOfficerForOrg) {
      if (!isOrgOfficerForOrg && !callerIsAdmin) {
        return {
          success: false,
          message: `Forbidden: Only officers of ${activity.orgId} or administrators can reject this action plan activity.`,
          statusCode: 403
        };
      }
      const updatedActivity2 = {
        ...activity,
        status: "Rejected",
        approvalStatus: "Rejected",
        workflowStatus: "REJECTED",
        actionPlanStatus: "Rejected",
        actionPlanDecision: "Rejected",
        approvalStage: "Rejected by Organization",
        approvalStageIndex: 1,
        isActionPlanItem: true,
        source: "ACTION_PLAN",
        isPlanConfirmed: activity.isPlanConfirmed ?? false,
        currentApproverRole: void 0,
        deferReason: void 0,
        deferredRemarks: void 0,
        deferredBy: void 0,
        deferredAt: void 0,
        rejectionRemarks: remarks.trim(),
        rejectedBy: effectiveUser.name,
        rejectedAt: (/* @__PURE__ */ new Date()).toISOString(),
        approvalDecisions: [
          ...activity.approvalDecisions || [],
          {
            id: `dec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            activityId: activity.id,
            approverId: effectiveUser.id,
            approverName: effectiveUser.name,
            approverRole: effectiveUser.role,
            stageName: "Organization Review",
            decision: "REJECT",
            remarks: remarks.trim(),
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            versionReviewed: activity.version || 1
          }
        ],
        workflowHistory: [
          ...activity.workflowHistory || [],
          {
            id: `wf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            stageId: 1,
            stageName: "Organization Review",
            action: "REJECT",
            actorId: effectiveUser.id,
            actorName: effectiveUser.name,
            actorRole: effectiveUser.role,
            remark: remarks.trim(),
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          }
        ]
      };
      return {
        success: true,
        updatedActivity: updatedActivity2,
        message: `Activity "${activity.title}" rejected by ${activity.orgId}.`,
        statusCode: 200
      };
    }
    if (this.isDeferredState(activity) || activity.approvalStatus === "Rejected" || activity.status === "Rejected" || activity.approvalStatus === "Fully Approved" || activity.status === "Approved") {
      return {
        success: false,
        message: "Forbidden: Cannot overwrite an existing decision on a deferred, rejected, or completed activity.",
        statusCode: 403
      };
    }
    const actualStage = this.getCurrentStageIndex(activity);
    if (requestedStepId !== void 0 && Number(requestedStepId) !== actualStage) {
      return {
        success: false,
        message: `Stage bypass blocked: Activity is currently at stage ${actualStage}; cannot reject stage ${requestedStepId}.`,
        statusCode: 403
      };
    }
    const perm = evaluateStepPermission(effectiveUser, activity, actualStage);
    if (!perm.canReject) {
      return {
        success: false,
        message: `Permission Denied: ${perm.reason}`,
        statusCode: 403
      };
    }
    const stages = this.getStagesForOrg(activity.orgId, true);
    const currentTimeline = activity.timeline && activity.timeline.length > 0 ? [...activity.timeline] : JSON.parse(JSON.stringify(stages));
    const currentStepObj = currentTimeline.find((s) => s.id === actualStage);
    const stageTitle = currentStepObj ? currentStepObj.title : `Stage ${actualStage}`;
    const decisionRecord = {
      id: `dec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      activityId: activity.id,
      approverId: effectiveUser.id,
      approverName: effectiveUser.name,
      approverRole: effectiveUser.role,
      stageName: stageTitle,
      decision: "REJECT",
      remarks: remarks.trim(),
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      versionReviewed: activity.version || 1
    };
    const historyRecord = {
      id: `wf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      stageId: actualStage,
      stageName: stageTitle,
      action: "DEFER",
      actorId: effectiveUser.id,
      actorName: effectiveUser.name,
      actorRole: effectiveUser.role,
      remark: `[REJECTED] ${remarks.trim()}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    const updatedActivity = {
      ...activity,
      approvalStatus: "Rejected",
      status: "Rejected",
      approvalStage: "REJECTED",
      rejectionRemarks: remarks.trim(),
      rejectedBy: `${effectiveUser.name} (${effectiveUser.role})`,
      rejectedAt: (/* @__PURE__ */ new Date()).toISOString(),
      timeline: currentTimeline,
      approvalDecisions: [...activity.approvalDecisions || [], decisionRecord],
      workflowHistory: [...activity.workflowHistory || [], historyRecord]
    };
    return {
      success: true,
      updatedActivity,
      message: "Activity has been permanently rejected for this submission.",
      statusCode: 200
    };
  }
  /**
   * Resubmit activity after revision by the owning Organization Officer
   */
  resubmitActivity(activity, currentUser, notes) {
    const effectiveUser = this.withActiveRole(currentUser);
    if (!effectiveUser) {
      return {
        success: false,
        message: "Forbidden: Active session role is not authorized.",
        statusCode: 403
      };
    }
    const isOwningOrgOfficer = effectiveUser.role === "ROLE_ORGANIZATION" && Boolean(effectiveUser.orgId) && isSameOrg(effectiveUser.orgId, activity.orgId);
    if (!isOwningOrgOfficer) {
      return {
        success: false,
        message: `Forbidden: Only ${activity.orgId} Organization Officers can resubmit this deferred activity.`,
        statusCode: 403
      };
    }
    if (activity.approvalStatus === "Rejected" || activity.status === "Rejected") {
      return {
        success: false,
        message: "Rejected activities cannot be resubmitted. Rejection is permanent for this submission.",
        statusCode: 400
      };
    }
    if (!this.isDeferredState(activity)) {
      return {
        success: false,
        message: "Only deferred activities awaiting revision can be resubmitted.",
        statusCode: 400
      };
    }
    if (!activity.designForm?.isCompleted) {
      return {
        success: false,
        message: "Cannot resubmit activity: Please fill out and submit the Detailed Activity Design (DAD) form first.",
        statusCode: 400
      };
    }
    const stages = this.getStagesForOrg(activity.orgId, true);
    const maxStages = this.getMaxStages(activity.orgId);
    const isAccompResubmission = Boolean(activity.accomplishmentForm?.isCompleted);
    const updatedTimeline = stages.map((s, idx) => {
      if (isAccompResubmission) {
        return {
          ...s,
          status: s.id < maxStages ? "completed" : "in_progress",
          updatedAt: s.id < maxStages ? s.updatedAt || (/* @__PURE__ */ new Date()).toISOString().split("T")[0] : void 0
        };
      }
      return {
        ...s,
        status: idx === 0 ? "completed" : idx === 1 ? "in_progress" : "pending",
        updatedAt: idx === 0 ? (/* @__PURE__ */ new Date()).toISOString().split("T")[0] : void 0
      };
    });
    const newVersion = (activity.version || 1) + 1;
    const targetStageId = isAccompResubmission ? maxStages : 2;
    const targetStageName = isAccompResubmission ? "Adviser Accomplishment Review & Final Sign-Off" : "Adviser Review";
    const historyRecord = {
      id: `wf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      stageId: targetStageId,
      stageName: targetStageName,
      action: "RESUBMIT",
      actorId: effectiveUser.id,
      actorName: effectiveUser.name,
      actorRole: effectiveUser.role,
      remark: notes || (isAccompResubmission ? `Revised Accomplishment Report (v${newVersion}) resubmitted by organization for final sign-off.` : `Revised proposal (v${newVersion}) resubmitted by organization.`),
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    const updatedActivity = {
      ...activity,
      version: newVersion,
      approvalStatus: "Pending Review",
      status: "Pending",
      workflowStatus: "IN_PROGRESS",
      approvalStage: `Stage ${targetStageId}: ${targetStageName}`,
      approvalStageIndex: targetStageId,
      currentApproverRole: "ROLE_ADVISER",
      deferReason: void 0,
      deferredBy: void 0,
      deferredAt: void 0,
      deferredRemarks: void 0,
      timeline: updatedTimeline,
      workflowHistory: [...activity.workflowHistory || [], historyRecord]
    };
    return {
      success: true,
      updatedActivity,
      message: isAccompResubmission ? `Revised Accomplishment Report (v${newVersion}) resubmitted to Adviser for final sign-off!` : `Activity proposal (v${newVersion}) resubmitted and forwarded to Adviser for review!`,
      statusCode: 200
    };
  }
  /**
   * Advance step (validates exact stage match before delegating to approveActivity)
   */
  advanceStep(activity, currentUser, requestedStepId, remarks) {
    const actualStage = this.getCurrentStageIndex(activity);
    if (requestedStepId !== void 0 && Number(requestedStepId) !== actualStage) {
      return {
        success: false,
        message: `Stage bypass blocked: Activity is currently at stage ${actualStage}; cannot advance stage ${requestedStepId}.`,
        statusCode: 403
      };
    }
    return this.approveActivity(activity, currentUser, remarks);
  }
  requestRevision(activity, currentUser, reason) {
    return this.deferActivity(activity, currentUser, reason);
  }
  confirmExternalClearance(activity, currentUser) {
    return this.approveActivity(activity, currentUser, "Official institutional clearance confirmed.");
  }
  setToDraft(activity, currentUser) {
    const effectiveUser = this.withActiveRole(currentUser);
    if (!effectiveUser) {
      return { success: false, message: "Forbidden: Active session role is not authorized.", statusCode: 403 };
    }
    const activeRole = normalizeOfficialRole(effectiveUser.activeRole || effectiveUser.role);
    const isOrgOfficerForOrg = (activeRole === "ROLE_ORGANIZATION" || effectiveUser.role === "ROLE_ORGANIZATION" || effectiveUser.role === "Student Organization Officer" || effectiveUser.role === "Org President" || effectiveUser.role === "Org Treasurer") && isSameOrg(effectiveUser.orgId, activity.orgId);
    const callerIsAdmin = activeRole === "ROLE_ADMIN" || effectiveUser.role === "ROLE_ADMIN" || effectiveUser.role === "System Administrator";
    if (!isOrgOfficerForOrg && !callerIsAdmin) {
      return {
        success: false,
        message: `Forbidden: Only officers of ${activity.orgId} or administrators can set this activity to draft.`,
        statusCode: 403
      };
    }
    const updatedActivity = {
      ...activity,
      status: "Draft",
      approvalStatus: "Draft",
      workflowStatus: "DRAFT",
      actionPlanStatus: "Draft",
      actionPlanDecision: void 0,
      approvalStage: isCollegeOrg(activity.orgId) ? "Stage 1: College Organization Submission" : "Stage 1: Organization Submission",
      approvalStageIndex: 1,
      isActionPlanItem: true,
      source: "ACTION_PLAN",
      isPlanConfirmed: false,
      currentApproverRole: "ROLE_ORGANIZATION",
      deferReason: void 0,
      deferredRemarks: void 0,
      deferredBy: void 0,
      deferredAt: void 0,
      rejectionRemarks: void 0,
      rejectedBy: void 0,
      rejectedAt: void 0
    };
    return {
      success: true,
      updatedActivity,
      message: `Activity "${activity.title}" status set to Draft.`,
      statusCode: 200
    };
  }
};
var workflowService = new WorkflowService();

// backend/services/AuditService.ts
init_database();
async function recordAuditLog(entry) {
  const appUserId = (entry.actor?.id || entry.appUserId || "").trim() || null;
  const userLookup = appUserId ? `(SELECT user_id FROM apmams.users WHERE app_user_id = ${sqlEscape(appUserId)} LIMIT 1)` : "NULL";
  const sql = `
    INSERT INTO apmams.audit_logs (
      user_id, app_user_id, action, entity_type, entity_id, details, ip_address
    ) VALUES (
      ${userLookup},
      ${appUserId ? sqlEscape(appUserId.slice(0, 50)) : "NULL"},
      ${sqlEscape(entry.action.slice(0, 150))},
      ${sqlEscape(entry.entityType.slice(0, 100))},
      ${entry.entityId ? sqlEscape(String(entry.entityId).slice(0, 100)) : "NULL"},
      ${entry.details ? sqlEscape(entry.details) : "NULL"},
      ${entry.ipAddress ? sqlEscape(String(entry.ipAddress).slice(0, 100)) : "NULL"}
    );
  `;
  try {
    await executeRawSql(sql);
  } catch (err) {
    console.warn("[AuditService] Failed to persist audit log:", err?.message || err);
  }
}

// backend/controllers/ActivityController.ts
init_initialData();
init_organizationUtils();

// src/utils/conflictDetection.ts
init_organizationUtils();
function normalizeVenue(v) {
  if (!v) return "";
  return v.toLowerCase().replace(/\b(msun|university|campus|grand|main|hall|center|room|facility)\b/g, "").replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
}
function areVenuesMatching(v1, v2) {
  if (!v1 || !v2) return false;
  const s1 = v1.trim().toLowerCase();
  const s2 = v2.trim().toLowerCase();
  if (s1 === s2) return true;
  const n1 = normalizeVenue(v1);
  const n2 = normalizeVenue(v2);
  if (!n1 || !n2) return false;
  if (n1 === n2 || n1.includes(n2) || n2.includes(n1)) return true;
  return false;
}
function parseTimeRange(timeStr) {
  if (!timeStr) return null;
  const clean = timeStr.trim();
  if (!clean || clean.toLowerCase() === "whole day" || clean.toLowerCase() === "1 day") {
    return { startMinutes: 8 * 60, endMinutes: 17 * 60 };
  }
  const parts = clean.split(/[-–—]|(?:\bto\b)/i).map((s) => s.trim());
  if (parts.length < 2) {
    const single = parseSingleTimeToMinutes(parts[0]);
    if (single !== null) {
      return { startMinutes: single, endMinutes: Math.min(single + 120, 24 * 60) };
    }
    return null;
  }
  const start = parseSingleTimeToMinutes(parts[0]);
  let end = parseSingleTimeToMinutes(parts[1]);
  if (start === null) return null;
  if (end === null) end = Math.min(start + 180, 24 * 60);
  if (end <= start) {
    if (!parts[1].toLowerCase().includes("am") && !parts[1].toLowerCase().includes("pm")) {
      end += 12 * 60;
    }
  }
  return { startMinutes: start, endMinutes: end };
}
function parseSingleTimeToMinutes(tStr) {
  const match = tStr.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const meridiem = match[3] ? match[3].toLowerCase() : null;
  if (meridiem === "pm" && hours < 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}
function doTimeIntervalsOverlap(rangeA, rangeB) {
  if (!rangeA || !rangeB) return true;
  return Math.max(rangeA.startMinutes, rangeB.startMinutes) < Math.min(rangeA.endMinutes, rangeB.endMinutes);
}
function doDatesOverlap(startA, endA, startB, endB) {
  if (!startA || !startB) return false;
  const eA = endA || startA;
  const eB = endB || startB;
  return startA <= eB && startB <= eA;
}
function getMonthKey(dateStr, timeframe) {
  if (dateStr && dateStr.length >= 7) {
    const monthNum = parseInt(dateStr.slice(5, 7), 10);
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    if (monthNum >= 1 && monthNum <= 12) return months[monthNum - 1];
  }
  if (timeframe) {
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    for (const m of months) {
      if (timeframe.toLowerCase().includes(m.toLowerCase())) return m;
    }
  }
  return "";
}
var STOP_WORDS = /* @__PURE__ */ new Set([
  "and",
  "the",
  "of",
  "in",
  "for",
  "to",
  "a",
  "an",
  "at",
  "on",
  "with",
  "by",
  "as",
  "msun",
  "naawan",
  "student",
  "students",
  "university",
  "college",
  "council",
  "organization",
  "activity",
  "program",
  "project",
  "annual",
  "semester",
  "academic",
  "year",
  "regular",
  "first",
  "second",
  "2nd",
  "1st",
  "series",
  "part",
  "phase",
  "conduct",
  "implementation"
]);
var SYNONYM_CLUSTERS = {
  tree: ["tree", "planting", "growing", "green", "forest", "forestration", "reforestation", "seedling", "environmental", "arboretum"],
  clean: ["clean", "cleanup", "clean-up", "coastal", "beach", "waste", "segregation", "recycling", "sanitation"],
  leadership: ["leadership", "summit", "training", "officers", "executive", "governance", "parliamentary", "empowerment"],
  assembly: ["assembly", "general", "meeting", "convocation", "fellowship", "gathering", "session"],
  mental: ["mental", "health", "wellness", "peer", "listener", "listening", "counseling", "mindfulness", "psychological"],
  tech: ["tech", "technology", "it", "coding", "programming", "hackathon", "bootcamp", "cyber", "cybersecurity", "software"],
  induction: ["induction", "orientation", "onboarding", "welcome", "acquaintance", "induction-ball"],
  sports: ["sports", "intramurals", "tournament", "championship", "athletic", "games", "fitness", "esports"]
};
function extractMeaningfulKeywords(text) {
  if (!text) return /* @__PURE__ */ new Set();
  const tokens = text.toLowerCase().replace(/[^a-z0-9]/g, " ").split(/\s+/).filter((t) => t.length > 2 && !STOP_WORDS.has(t));
  return new Set(tokens);
}
function calculateActivitySimilarity(actA, actB) {
  const wordsA = extractMeaningfulKeywords(`${actA.title || ""} ${actA.strategicObjectives || ""}`);
  const wordsB = extractMeaningfulKeywords(`${actB.title || ""} ${actB.strategicObjectives || ""}`);
  if (wordsA.size === 0 || wordsB.size === 0) {
    return { isSimilar: false, score: 0, matchedKeywords: [] };
  }
  const directMatches = [];
  wordsA.forEach((w) => {
    if (wordsB.has(w)) directMatches.push(w);
  });
  let clusterMatches = 0;
  const foundClusters = /* @__PURE__ */ new Set();
  for (const [clusterKey, synonyms] of Object.entries(SYNONYM_CLUSTERS)) {
    const hasA = synonyms.some((s) => wordsA.has(s));
    const hasB = synonyms.some((s) => wordsB.has(s));
    if (hasA && hasB) {
      clusterMatches++;
      foundClusters.add(clusterKey);
      if (!directMatches.includes(clusterKey)) {
        directMatches.push(clusterKey);
      }
    }
  }
  const minLen = Math.min(wordsA.size, wordsB.size);
  const jaccard = directMatches.length / minLen;
  const isSimilar = directMatches.length >= 2 || clusterMatches >= 1 && jaccard >= 0.25;
  const score = Math.min(1, jaccard + clusterMatches * 0.2);
  return { isSimilar, score, matchedKeywords: directMatches };
}
function detectActionPlanConflicts(target, allActivities) {
  const conflicts = [];
  const targetId = target.id || "";
  const targetOrg = target.orgId || "";
  const targetVenue = target.venue || target.designForm?.venue || "";
  const targetStartDate = target.startDate || target.designForm?.dateImplementation || "";
  const targetEndDate = target.endDate || targetStartDate;
  const targetMonth = target.timeframeMonth || getMonthKey(targetStartDate, target.timeframe);
  const targetFiscalYear = target.fiscalYear || "Fiscal Year 2027";
  for (const act of allActivities) {
    if (act.id === targetId || isSameOrg(act.orgId, targetOrg)) continue;
    if (act.status === "DEFERRED" || act.workflowStatus === "DISAPPROVED") continue;
    const actVenue = act.venue || act.designForm?.venue || "";
    const actStartDate = act.startDate || act.designForm?.dateImplementation || "";
    const actEndDate = act.endDate || actStartDate;
    const actMonth = act.timeframeMonth || getMonthKey(actStartDate, act.timeframe);
    const actFiscalYear = act.fiscalYear || "Fiscal Year 2027";
    const samePeriod = targetFiscalYear === actFiscalYear && (targetMonth && actMonth && targetMonth === actMonth || targetStartDate && actStartDate && doDatesOverlap(targetStartDate, targetEndDate, actStartDate, actEndDate));
    if (samePeriod) {
      const sim = calculateActivitySimilarity(
        { title: target.title || target.programActivity, strategicObjectives: target.strategicObjectives, description: target.description },
        { title: act.title || act.programActivity, strategicObjectives: act.strategicObjectives, description: act.description }
      );
      if (sim.isSimilar) {
        conflicts.push({
          id: `sim-${act.id}`,
          type: "similar_activity",
          severity: "blue",
          title: "Similar Activity Detected",
          message: `${act.orgId} has proposed a similar activity ("${act.title}") for the same period. Consider coordinating with the organization or conducting a joint activity.`,
          conflictingActivityId: act.id,
          conflictingActivityTitle: act.title,
          conflictingOrgId: act.orgId,
          conflictingDate: act.startDate || actMonth || "Same Period",
          conflictingTime: act.startTime ? `${act.startTime} - ${act.endTime || ""}` : void 0,
          conflictingVenue: act.venue || "Campus Venue",
          conflictingStatus: act.status || "Proposed",
          suggestedAction: "Reach out to the lead officers of " + act.orgId + " to explore synergy or co-hosting a combined campus program.",
          similarityScore: sim.score
        });
      }
    }
    if (targetVenue && actVenue && areVenuesMatching(targetVenue, actVenue)) {
      const hasExactDates = Boolean(targetStartDate && actStartDate);
      const exactDatesOverlap = hasExactDates && doDatesOverlap(targetStartDate, targetEndDate, actStartDate, actEndDate);
      const monthOverlap = Boolean(targetMonth && actMonth && targetMonth === actMonth);
      if (exactDatesOverlap || monthOverlap) {
        const isTimeframeOnly = !hasExactDates || target.timeframeMonth || target.timeframeWeek;
        const isActDadActive = Boolean(act.designForm?.isCompleted || act.timeline && act.timeline.some((s) => s.id >= 1 && s.status === "completed"));
        if (!isTimeframeOnly && exactDatesOverlap && isActDadActive) {
          conflicts.push({
            id: `conf-dad-${act.id}`,
            type: "confirmed_conflict",
            severity: "red",
            title: "Confirmed Venue Reservation Conflict",
            message: `The selected venue "${targetVenue}" is already reserved by ${act.orgId} for "${act.title}" on ${actStartDate}.`,
            conflictingActivityId: act.id,
            conflictingActivityTitle: act.title,
            conflictingOrgId: act.orgId,
            conflictingDate: actStartDate,
            conflictingTime: act.designForm?.durationDays ? `${act.designForm.durationDays} day(s)` : "Full Day",
            conflictingVenue: actVenue,
            conflictingStatus: act.status === "Approved" ? "Confirmed Reservation" : "Tentatively Reserved",
            isDadReservation: true,
            suggestedAction: "Select an alternate venue or adjust your implementation date to avoid collision with " + act.orgId + "."
          });
        } else {
          conflicts.push({
            id: `pot-conf-${act.id}`,
            type: "potential_conflict",
            severity: "yellow",
            title: "Potential Venue Conflict",
            message: `${act.orgId} has proposed an activity ("${act.title}") at your selected venue during an overlapping schedule (${actStartDate || targetMonth}).`,
            conflictingActivityId: act.id,
            conflictingActivityTitle: act.title,
            conflictingOrgId: act.orgId,
            conflictingDate: actStartDate || targetMonth || "Target Month",
            conflictingTime: act.startTime ? `${act.startTime} - ${act.endTime || ""}` : "To be specified in DAD",
            conflictingVenue: actVenue,
            conflictingStatus: act.status || "Proposed",
            isDadReservation: false,
            suggestedAction: "Review the proposed schedule. Action Plan proposals do not hold a venue reservation until a DAD form is officially filed."
          });
        }
      }
    }
  }
  return conflicts;
}
function detectDadVenueConflicts(dadForm, currentActivityId, currentOrgId, allActivities) {
  const conflicts = [];
  const targetVenue = dadForm.venue || "";
  const targetDate = dadForm.dateImplementation || "";
  let targetTimeRange = parseTimeRange(dadForm.durationDays ? String(dadForm.durationDays) : void 0);
  if (dadForm.venueRows && dadForm.venueRows.length > 0) {
    const v0 = dadForm.venueRows[0];
    if (v0.duration) {
      const parsed = parseTimeRange(v0.duration);
      if (parsed) targetTimeRange = parsed;
    }
  }
  if (!targetVenue || !targetDate) return conflicts;
  for (const act of allActivities) {
    if (act.id === currentActivityId || isSameOrg(act.orgId, currentOrgId)) continue;
    if (act.status === "DEFERRED" || act.workflowStatus === "DISAPPROVED") continue;
    const hasDad = Boolean(
      act.designForm && (act.designForm.isCompleted || act.timeline?.some((s) => s.id >= 1 && s.status === "completed") || act.status === "Approved")
    );
    if (!hasDad) continue;
    const actVenue = act.designForm?.venue || act.venue;
    const actDate = act.designForm?.dateImplementation || act.startDate;
    if (!areVenuesMatching(targetVenue, actVenue)) continue;
    if (targetDate !== actDate) continue;
    let actTimeRange = parseTimeRange(act.designForm?.durationDays ? String(act.designForm.durationDays) : void 0);
    if (act.designForm?.venueRows && act.designForm.venueRows.length > 0) {
      const row = act.designForm.venueRows[0];
      if (row.duration) {
        const p = parseTimeRange(row.duration);
        if (p) actTimeRange = p;
      }
    }
    if (doTimeIntervalsOverlap(targetTimeRange, actTimeRange)) {
      const isApproved = act.status === "Approved" || act.workflowStatus === "COMPLETED";
      const resStatus = isApproved ? "Confirmed Reservation" : "Tentatively Reserved";
      conflicts.push({
        id: `dad-conflict-${act.id}`,
        type: "confirmed_conflict",
        severity: "red",
        title: "Venue Scheduling Conflict",
        message: `The selected venue "${targetVenue}" is already requested by ${act.orgId} during your proposed implementation schedule (${targetDate}${act.designForm?.venueRows?.[0]?.duration ? `, ${act.designForm.venueRows[0].duration}` : ""}).`,
        conflictingActivityId: act.id,
        conflictingActivityTitle: act.title,
        conflictingOrgId: act.orgId,
        conflictingDate: actDate,
        conflictingTime: act.designForm?.venueRows?.[0]?.duration || "Full Day",
        conflictingVenue: actVenue,
        conflictingStatus: resStatus,
        isDadReservation: true,
        suggestedAction: "You must select another date or venue, or coordinate an administrative override with the System Administrator."
      });
    }
  }
  return conflicts;
}
function checkVenueAvailability(venue, date, allActivities, userTimeRangeStr) {
  if (!venue || !date) {
    return {
      venue: venue || "Unspecified Venue",
      date: date || "",
      overallStatus: "Available",
      slots: [],
      reservationsCount: 0
    };
  }
  const matchingActivities = allActivities.filter((act) => {
    if (act.status === "DEFERRED" || act.workflowStatus === "DISAPPROVED") return false;
    const v = act.designForm?.venue || act.venue;
    const d = act.designForm?.dateImplementation || act.startDate;
    const endD = act.endDate || d;
    return areVenuesMatching(v, venue) && (d <= date && date <= endD);
  });
  const slots = [];
  matchingActivities.forEach((act) => {
    const isDadActive = Boolean(
      act.designForm && (act.designForm.isCompleted || act.timeline?.some((s) => s.id >= 1 && s.status === "completed") || act.status === "Approved")
    );
    const isConfirmed = act.status === "Approved" || act.workflowStatus === "COMPLETED";
    const status = isConfirmed ? "Confirmed Reservation" : isDadActive ? "Tentatively Reserved" : "Tentatively Reserved";
    let timeRange = "8:00 AM - 5:00 PM";
    let startTime = "08:00";
    let endTime = "17:00";
    if (act.designForm?.venueRows?.[0]?.duration) {
      timeRange = act.designForm.venueRows[0].duration;
    } else if (act.startTime && act.endTime) {
      timeRange = `${act.startTime} - ${act.endTime}`;
      startTime = act.startTime;
      endTime = act.endTime;
    }
    slots.push({
      timeRange,
      startTime,
      endTime,
      organization: act.orgId,
      activityId: act.id,
      activityTitle: act.title,
      status,
      isDad: isDadActive
    });
  });
  slots.sort((a, b) => a.startTime.localeCompare(b.startTime));
  let overallStatus = "Available";
  if (slots.length > 0) {
    const userRange = parseTimeRange(userTimeRangeStr);
    if (userRange) {
      const overlappingSlot = slots.find((s) => {
        const sRange = parseTimeRange(s.timeRange);
        return doTimeIntervalsOverlap(userRange, sRange);
      });
      if (overlappingSlot) {
        overallStatus = overlappingSlot.status;
      } else {
        overallStatus = "Available";
      }
    } else {
      if (slots.some((s) => s.status === "Confirmed Reservation")) {
        overallStatus = "Confirmed Reservation";
      } else if (slots.some((s) => s.status === "Tentatively Reserved")) {
        overallStatus = "Tentatively Reserved";
      }
    }
  }
  return {
    venue,
    date,
    overallStatus,
    slots,
    reservationsCount: slots.length
  };
}

// backend/controllers/ActivityController.ts
init_AuthService();
var activityController = Router();
activityController.post("/check-conflict", requireAuth, (req, res) => {
  if (rejectImpersonationAttempt(req, res, { checkBodyUserId: false })) return;
  const { activity, designForm } = req.body || {};
  const allActs = activityRepository.findAll();
  let conflicts = [];
  if (designForm) {
    conflicts = detectDadVenueConflicts(
      designForm,
      activity?.id || "",
      activity?.orgId || req.authUser?.orgId || "",
      allActs
    );
  } else if (activity) {
    conflicts = detectActionPlanConflicts(activity, allActs);
  }
  return res.status(200).json({
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    status: 200,
    success: true,
    data: conflicts
  });
});
activityController.get("/venues/availability", requireAuth, (req, res) => {
  if (rejectImpersonationAttempt(req, res, { checkBodyUserId: false })) return;
  const { venue, date, timeRange } = req.query;
  const allActs = activityRepository.findAll();
  const result = checkVenueAvailability(
    typeof venue === "string" ? venue : "",
    typeof date === "string" ? date : "",
    allActs,
    typeof timeRange === "string" ? timeRange : void 0
  );
  return res.status(200).json({
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    status: 200,
    success: true,
    data: result
  });
});
activityController.get("/", requireAuth, (req, res) => {
  if (rejectImpersonationAttempt(req, res, { checkBodyUserId: false })) return;
  const { orgId, fiscalYear, status } = req.query;
  const caller = req.authUser;
  if (typeof orgId === "string" && orgId.trim() && orgId.trim().toUpperCase() !== "ALL") {
    if (!canViewOrgPrivateData(caller, orgId.trim())) {
      return res.status(403).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 403,
        success: false,
        code: "CROSS_ORG_FORBIDDEN",
        message: `Forbidden: You are not authorized to access internal activity records for organization "${orgId}".`
      });
    }
  }
  const rawActivities = activityRepository.findAll({
    orgId: typeof orgId === "string" ? orgId : void 0,
    fiscalYear: typeof fiscalYear === "string" ? fiscalYear : void 0,
    status: typeof status === "string" ? status : void 0
  });
  const scopedActivities = rawActivities.map(
    (act) => canViewOrgPrivateData(caller, act.orgId) ? act : sanitizeActivityForCrossOrgCalendar(act)
  );
  const response = {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    status: 200,
    success: true,
    message: `Retrieved ${scopedActivities.length} activities`,
    data: scopedActivities
  };
  return res.status(200).json(response);
});
activityController.post("/batch-save", requireAuth, async (req, res) => {
  if (rejectImpersonationAttempt(req, res, { checkBodyUserId: false })) return;
  try {
    const list = req.body;
    if (!Array.isArray(list)) {
      return res.status(400).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 400,
        success: false,
        message: "Expected an array of activities"
      });
    }
    const caller = req.authUser;
    const validatedList = [];
    for (const item of list) {
      const existing = item?.id ? activityRepository.findById(item.id) : void 0;
      const check = enforceGenericActivityWritePolicy(caller, item || {}, existing);
      if (!check.ok) {
        return res.status(check.status).json({
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          status: check.status,
          success: false,
          code: check.code,
          message: check.message
        });
      }
      validatedList.push(check.activity);
    }
    const savedList = await activityRepository.batchSave(validatedList, caller.id);
    actionPlanRepository.loadFromDatabase().catch(() => {
    });
    recordAuditLog({
      actor: caller,
      action: "ACTIVITY_BATCH_SAVE",
      entityType: "activity",
      entityId: caller.orgId || "BATCH",
      details: { count: savedList.length, ids: savedList.map((a) => a.id) },
      ipAddress: req.ip
    });
    return res.status(200).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 200,
      success: true,
      message: `Successfully saved ${savedList.length} activities.`,
      data: savedList
    });
  } catch (err) {
    return res.status(500).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 500,
      success: false,
      message: err.message || "Failed to batch save activities"
    });
  }
});
activityController.post("/confirm-plan", requireAuth, async (req, res) => {
  if (rejectImpersonationAttempt(req, res, { checkBodyUserId: false })) return;
  try {
    const caller = req.authUser;
    const { orgId, fiscalYear } = req.body || {};
    if (!orgId) {
      return res.status(400).json({ success: false, message: "Missing organization identifier (orgId)" });
    }
    const activeRole = normalizeOfficialRole(caller.activeRole || caller.role);
    const callerRoles = (caller.roles || []).map((r) => normalizeOfficialRole(r));
    const isSysAdmin = activeRole === "ROLE_ADMIN" || callerRoles.includes("ROLE_ADMIN");
    const isOrgOfficer = (activeRole === "ROLE_ORGANIZATION" || callerRoles.includes("ROLE_ORGANIZATION")) && isSameOrg(caller.orgId, orgId);
    if (!isSysAdmin && !isOrgOfficer) {
      return res.status(403).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 403,
        success: false,
        message: `Forbidden: You are not authorized to confirm Action Plan for organization ${orgId}.`
      });
    }
    const allActs = activityRepository.findAll();
    const fyDigits = fiscalYear ? String(fiscalYear).replace(/\D/g, "") : "";
    const targetActs = allActs.filter((a) => {
      const matchOrg = isSameOrg(a.orgId, orgId);
      if (!matchOrg) return false;
      if (!fyDigits || fiscalYear === "ALL") return true;
      const actFyDigits = (a.fiscalYear || "").replace(/\D/g, "");
      return actFyDigits === fyDigits;
    });
    let approvedCount = 0;
    let rejectedCount = 0;
    let draftCount = 0;
    let totalApprovedBudget = 0;
    const updatedList = [];
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    for (const act of targetActs) {
      const isRejected = act.actionPlanStatus === "Rejected" || act.actionPlanDecision === "Rejected" || act.status === "Rejected" || act.approvalStatus === "Rejected";
      const isApproved = !isRejected && (act.actionPlanStatus === "Approved" || act.actionPlanDecision === "Approved" || act.status === "Approved" || act.approvalStatus === "Fully Approved");
      if (isApproved) {
        approvedCount++;
        totalApprovedBudget += Number(act.budget || 0);
        const dadDone = Boolean(act.designForm?.isCompleted);
        const stage1Label = isCollegeOrg(act.orgId) ? "Stage 1: College Organization Submission" : "Stage 1: Organization Submission";
        const updated = {
          ...act,
          status: dadDone ? act.status : "Draft",
          approvalStatus: dadDone ? act.approvalStatus || "Pending Review" : "Draft",
          workflowStatus: dadDone ? act.workflowStatus || "IN_PROGRESS" : "DRAFT",
          approvalStage: dadDone ? act.approvalStage : stage1Label,
          approvalStageIndex: dadDone ? act.approvalStageIndex || 2 : 1,
          actionPlanStatus: "Approved",
          actionPlanDecision: "Approved",
          isActionPlanItem: true,
          source: "ACTION_PLAN",
          isPlanConfirmed: true,
          confirmedBy: caller.name,
          confirmedAt: timestamp
        };
        await activityRepository.save(updated, caller.id);
        updatedList.push(updated);
      } else if (isRejected) {
        rejectedCount++;
        const updated = {
          ...act,
          status: "Rejected",
          approvalStatus: "Rejected",
          workflowStatus: "REJECTED",
          actionPlanStatus: "Rejected",
          actionPlanDecision: "Rejected",
          isActionPlanItem: true,
          source: "ACTION_PLAN",
          isPlanConfirmed: true,
          confirmedBy: caller.name,
          confirmedAt: timestamp,
          rejectionRemarks: act.rejectionRemarks || "Rejected by Organization"
        };
        await activityRepository.save(updated, caller.id);
        updatedList.push(updated);
      } else {
        draftCount++;
        updatedList.push(act);
      }
    }
    actionPlanRepository.loadFromDatabase().catch(() => {
    });
    recordAuditLog({
      actor: caller,
      action: "ACTION_PLAN_CONFIRM",
      entityType: "action_plan",
      entityId: `${orgId}_${fiscalYear || "ALL"}`,
      details: { approvedCount, rejectedCount, draftCount, totalApprovedBudget },
      ipAddress: req.ip
    });
    return res.status(200).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 200,
      success: true,
      message: `Action plan confirmed successfully. ${approvedCount} activities approved, ${rejectedCount} rejected.`,
      data: {
        orgId,
        fiscalYear,
        approvedCount,
        rejectedCount,
        draftCount,
        totalApprovedBudget,
        activities: updatedList
      }
    });
  } catch (err) {
    return res.status(500).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 500,
      success: false,
      message: err.message || "Failed to confirm action plan"
    });
  }
});
activityController.post("/reset-stage-one", requireAdmin, (_req, res) => {
  const resetList = activityRepository.resetAllToStageOne();
  return res.status(200).json({
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    status: 200,
    success: true,
    message: "All activities successfully reset to Stage 1.",
    data: resetList
  });
});
activityController.get("/:id", requireAuth, (req, res) => {
  if (rejectImpersonationAttempt(req, res, { checkBodyUserId: false })) return;
  const activity = activityRepository.findById(req.params.id);
  if (!activity) {
    return res.status(404).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 404,
      success: false,
      message: `Activity with id "${req.params.id}" not found`
    });
  }
  if (!canViewOrgPrivateData(req.authUser, activity.orgId)) {
    return res.status(403).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 403,
      success: false,
      code: "CROSS_ORG_FORBIDDEN",
      message: `Forbidden: You do not have permission to view restricted internal details of ${activity.orgId} activities.`
    });
  }
  const response = {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    status: 200,
    success: true,
    message: "Activity retrieved successfully",
    data: activity
  };
  return res.status(200).json(response);
});
activityController.post("/", requireAuth, async (req, res) => {
  if (rejectImpersonationAttempt(req, res)) return;
  try {
    const rawBody = req.body || {};
    const existing = rawBody.id ? activityRepository.findById(rawBody.id) : void 0;
    if (!existing && (!rawBody.title || !String(rawBody.title).trim())) {
      return res.status(400).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 400,
        success: false,
        message: "Validation failed: Activity title is required."
      });
    }
    const check = enforceGenericActivityWritePolicy(req.authUser, rawBody, existing);
    if (!check.ok) {
      return res.status(check.status).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: check.status,
        success: false,
        code: check.code,
        message: check.message
      });
    }
    const toSave = check.activity;
    const allActsForPost = activityRepository.findAll();
    const isDadActivePost = Boolean(toSave.designForm?.isCompleted);
    const callerIsAdmin = isAdminRole(getActiveSessionRole(req.authUser));
    const hasAdminOverridePost = callerIsAdmin && Boolean(toSave.designForm?.adminOverride?.isOverridden || toSave?.adminOverrideReason);
    if (isDadActivePost && !hasAdminOverridePost) {
      const dadConflicts = detectDadVenueConflicts(
        toSave.designForm,
        toSave.id || "",
        toSave.orgId,
        allActsForPost
      );
      if (dadConflicts.length > 0) {
        return res.status(409).json({
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          status: 409,
          success: false,
          message: `Venue Scheduling Conflict: The selected venue is already requested by ${dadConflicts[0].conflictingOrgId} during your proposed implementation schedule.`,
          conflict: dadConflicts[0],
          conflicts: dadConflicts
        });
      }
    }
    const saved = await activityRepository.save(toSave, req.authUser.id);
    actionPlanRepository.loadFromDatabase().catch(() => {
    });
    recordAuditLog({
      actor: req.authUser,
      action: existing ? "ACTIVITY_UPDATE" : "ACTIVITY_CREATE",
      entityType: "activity",
      entityId: saved.id,
      details: { title: saved.title, orgId: saved.orgId, status: saved.status, approvalStage: saved.approvalStage },
      ipAddress: req.ip
    });
    const statusCode = existing ? 200 : 201;
    return res.status(statusCode).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: statusCode,
      success: true,
      message: existing ? `Activity "${saved.title}" updated successfully.` : `Activity "${saved.title}" created successfully.`,
      data: saved
    });
  } catch (err) {
    return res.status(500).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 500,
      success: false,
      message: err?.message || "Failed to save activity to database."
    });
  }
});
activityController.put("/:id", requireAuth, async (req, res) => {
  if (rejectImpersonationAttempt(req, res)) return;
  try {
    const existing = activityRepository.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 404,
        success: false,
        message: `Activity ${req.params.id} not found.`
      });
    }
    const check = enforceGenericActivityWritePolicy(req.authUser, req.body || {}, existing);
    if (!check.ok) {
      return res.status(check.status).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: check.status,
        success: false,
        code: check.code,
        message: check.message
      });
    }
    const toSave = check.activity;
    const allActsForPut = activityRepository.findAll();
    const isDadActivePut = Boolean(toSave.designForm?.isCompleted);
    const callerIsAdmin = isAdminRole(getActiveSessionRole(req.authUser));
    const hasAdminOverridePut = callerIsAdmin && Boolean(toSave.designForm?.adminOverride?.isOverridden || req.body?.adminOverrideReason);
    if (isDadActivePut && !hasAdminOverridePut) {
      const dadConflicts = detectDadVenueConflicts(
        toSave.designForm,
        req.params.id,
        toSave.orgId,
        allActsForPut
      );
      if (dadConflicts.length > 0) {
        return res.status(409).json({
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          status: 409,
          success: false,
          message: `Venue Scheduling Conflict: The selected venue is already requested by ${dadConflicts[0].conflictingOrgId} during your proposed implementation schedule.`,
          conflict: dadConflicts[0],
          conflicts: dadConflicts
        });
      }
    }
    const updated = await activityRepository.save(toSave, req.authUser.id);
    actionPlanRepository.loadFromDatabase().catch(() => {
    });
    recordAuditLog({
      actor: req.authUser,
      action: "ACTIVITY_UPDATE",
      entityType: "activity",
      entityId: updated.id,
      details: { title: updated.title, status: updated.status, approvalStage: updated.approvalStage },
      ipAddress: req.ip
    });
    return res.status(200).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 200,
      success: true,
      message: "Activity updated successfully",
      data: updated
    });
  } catch (err) {
    return res.status(500).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 500,
      success: false,
      message: err?.message || "Failed to update activity in database."
    });
  }
});
activityController.delete("/:id", requireAuth, async (req, res) => {
  if (rejectImpersonationAttempt(req, res)) return;
  const existing = activityRepository.findById(req.params.id);
  if (!existing) {
    return res.status(404).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 404,
      success: false,
      message: `Activity ${req.params.id} not found.`
    });
  }
  const caller = req.authUser;
  if (!canModifyOrgActivity(caller, existing.orgId)) {
    return res.status(403).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 403,
      success: false,
      code: "CROSS_ORG_FORBIDDEN",
      message: `Forbidden: You do not have permission to delete activities belonging to ${existing.orgId}.`
    });
  }
  const callerIsAdmin = isAdminRole(getActiveSessionRole(caller));
  if (!callerIsAdmin && (existing.status === "Approved" || existing.approvalStatus === "Fully Approved" || existing.workflowStatus === "COMPLETED")) {
    return res.status(403).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 403,
      success: false,
      code: "LOCKED_ACTIVITY",
      message: "Forbidden: Approved activities cannot be deleted by organization officers."
    });
  }
  try {
    await activityRepository.deleteById(req.params.id);
    actionPlanRepository.loadFromDatabase().catch(() => {
    });
    recordAuditLog({
      actor: caller,
      action: "ACTIVITY_DELETE",
      entityType: "activity",
      entityId: req.params.id,
      details: { title: existing.title, orgId: existing.orgId },
      ipAddress: req.ip
    });
    return res.status(200).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 200,
      success: true,
      message: `Activity "${req.params.id}" deleted successfully.`
    });
  } catch (err) {
    return res.status(500).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 500,
      success: false,
      message: err?.message || "Failed to delete activity from database."
    });
  }
});
activityController.post("/:id/approve", requireAuth, async (req, res) => {
  if (rejectImpersonationAttempt(req, res, { checkBodyUserId: true, checkBodyRole: true })) return;
  const activity = activityRepository.findById(req.params.id);
  if (!activity) {
    return res.status(404).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 404,
      success: false,
      message: `Activity ${req.params.id} not found.`
    });
  }
  const remarks = typeof req.body?.remarks === "string" ? req.body.remarks : void 0;
  const result = workflowService.approveActivity(activity, req.authUser, remarks);
  if (!result.success || !result.updatedActivity) {
    return res.status(result.statusCode).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: result.statusCode,
      success: false,
      message: result.message
    });
  }
  try {
    const saved = await activityRepository.save(result.updatedActivity, req.authUser.id);
    actionPlanRepository.loadFromDatabase().catch(() => {
    });
    recordAuditLog({
      actor: req.authUser,
      action: "WORKFLOW_APPROVE",
      entityType: "activity",
      entityId: saved.id,
      details: { approvalStage: saved.approvalStage, status: saved.status, remarks },
      ipAddress: req.ip
    });
    return res.status(200).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 200,
      success: true,
      message: result.message,
      data: saved
    });
  } catch (err) {
    return res.status(500).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 500,
      success: false,
      message: err?.message || "Failed to save approval decision."
    });
  }
});
activityController.post("/:id/reject", requireAuth, async (req, res) => {
  if (rejectImpersonationAttempt(req, res, { checkBodyUserId: true, checkBodyRole: true })) return;
  const activity = activityRepository.findById(req.params.id);
  if (!activity) {
    return res.status(404).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 404,
      success: false,
      message: `Activity ${req.params.id} not found.`
    });
  }
  const { remarks, stageId } = req.body || {};
  if (!remarks || !String(remarks).trim()) {
    return res.status(400).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 400,
      success: false,
      message: "A mandatory remark/reason explaining the final rejection is required under institutional policy."
    });
  }
  const result = workflowService.rejectActivity(activity, req.authUser, String(remarks), stageId);
  if (!result.success || !result.updatedActivity) {
    return res.status(result.statusCode).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: result.statusCode,
      success: false,
      message: result.message
    });
  }
  try {
    const saved = await activityRepository.save(result.updatedActivity, req.authUser.id);
    actionPlanRepository.loadFromDatabase().catch(() => {
    });
    recordAuditLog({
      actor: req.authUser,
      action: "WORKFLOW_REJECT",
      entityType: "activity",
      entityId: saved.id,
      details: { remarks: String(remarks), stageId },
      ipAddress: req.ip
    });
    return res.status(200).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 200,
      success: true,
      message: result.message,
      data: saved
    });
  } catch (err) {
    return res.status(500).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 500,
      success: false,
      message: err?.message || "Failed to save rejection."
    });
  }
});
activityController.post("/:id/draft", requireAuth, async (req, res) => {
  if (rejectImpersonationAttempt(req, res, { checkBodyUserId: true, checkBodyRole: true })) return;
  const activity = activityRepository.findById(req.params.id);
  if (!activity) {
    return res.status(404).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 404,
      success: false,
      message: `Activity ${req.params.id} not found.`
    });
  }
  const result = workflowService.setToDraft(activity, req.authUser);
  if (!result.success || !result.updatedActivity) {
    return res.status(result.statusCode).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: result.statusCode,
      success: false,
      message: result.message
    });
  }
  try {
    const saved = await activityRepository.save(result.updatedActivity, req.authUser.id);
    recordAuditLog({
      actor: req.authUser,
      action: "ACTIVITY_SET_DRAFT",
      entityType: "activity",
      entityId: saved.id,
      ipAddress: req.ip
    });
    return res.status(200).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 200,
      success: true,
      message: result.message,
      data: saved
    });
  } catch (err) {
    return res.status(500).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 500,
      success: false,
      message: err?.message || "Failed to set activity to Draft."
    });
  }
});
activityController.post("/:id/advance", requireAuth, async (req, res) => {
  if (rejectImpersonationAttempt(req, res, { checkBodyUserId: true, checkBodyRole: true })) return;
  const activity = activityRepository.findById(req.params.id);
  if (!activity) {
    return res.status(404).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 404,
      success: false,
      message: `Activity ${req.params.id} not found.`
    });
  }
  const payload = req.body || {};
  const result = workflowService.advanceStep(activity, req.authUser, payload.stepId, payload.remarks);
  if (!result.success || !result.updatedActivity) {
    return res.status(result.statusCode).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: result.statusCode,
      success: false,
      message: result.message
    });
  }
  try {
    const saved = await activityRepository.save(result.updatedActivity, req.authUser.id);
    recordAuditLog({
      actor: req.authUser,
      action: "WORKFLOW_ADVANCE",
      entityType: "activity",
      entityId: saved.id,
      details: { stepId: payload.stepId, remarks: payload.remarks, approvalStage: saved.approvalStage },
      ipAddress: req.ip
    });
    return res.status(200).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 200,
      success: true,
      message: result.message,
      data: saved
    });
  } catch (err) {
    return res.status(500).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 500,
      success: false,
      message: err?.message || "Failed to advance workflow stage."
    });
  }
});
activityController.post("/:id/defer", requireAuth, async (req, res) => {
  if (rejectImpersonationAttempt(req, res, { checkBodyUserId: true, checkBodyRole: true })) return;
  const activity = activityRepository.findById(req.params.id);
  if (!activity) {
    return res.status(404).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 404,
      success: false,
      message: `Activity ${req.params.id} not found.`
    });
  }
  const { reason, stageId } = req.body || {};
  const result = workflowService.deferActivity(activity, req.authUser, String(reason || ""), stageId);
  if (!result.success || !result.updatedActivity) {
    return res.status(result.statusCode).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: result.statusCode,
      success: false,
      message: result.message
    });
  }
  try {
    const saved = await activityRepository.save(result.updatedActivity, req.authUser.id);
    recordAuditLog({
      actor: req.authUser,
      action: "WORKFLOW_DEFER",
      entityType: "activity",
      entityId: saved.id,
      details: { reason: String(reason || ""), stageId },
      ipAddress: req.ip
    });
    return res.status(200).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 200,
      success: true,
      message: result.message,
      data: saved
    });
  } catch (err) {
    return res.status(500).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 500,
      success: false,
      message: err?.message || "Failed to defer activity."
    });
  }
});
activityController.post("/:id/resubmit", requireAuth, async (req, res) => {
  if (rejectImpersonationAttempt(req, res, { checkBodyUserId: true, checkBodyRole: true })) return;
  const activity = activityRepository.findById(req.params.id);
  if (!activity) {
    return res.status(404).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 404,
      success: false,
      message: `Activity ${req.params.id} not found.`
    });
  }
  const notes = typeof req.body?.notes === "string" ? req.body.notes : void 0;
  const result = workflowService.resubmitActivity(activity, req.authUser, notes);
  if (!result.success || !result.updatedActivity) {
    return res.status(result.statusCode).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: result.statusCode,
      success: false,
      message: result.message
    });
  }
  try {
    const saved = await activityRepository.save(result.updatedActivity, req.authUser.id);
    recordAuditLog({
      actor: req.authUser,
      action: "WORKFLOW_RESUBMIT",
      entityType: "activity",
      entityId: saved.id,
      details: { notes },
      ipAddress: req.ip
    });
    return res.status(200).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 200,
      success: true,
      message: result.message,
      data: saved
    });
  } catch (err) {
    return res.status(500).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 500,
      success: false,
      message: err?.message || "Failed to resubmit activity."
    });
  }
});
activityController.post("/:id/external-clearance", requireAuth, async (req, res) => {
  if (rejectImpersonationAttempt(req, res, { checkBodyUserId: true, checkBodyRole: true })) return;
  const activity = activityRepository.findById(req.params.id);
  if (!activity) {
    return res.status(404).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 404,
      success: false,
      message: `Activity ${req.params.id} not found.`
    });
  }
  const result = workflowService.confirmExternalClearance(activity, req.authUser);
  if (!result.success || !result.updatedActivity) {
    return res.status(result.statusCode).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: result.statusCode,
      success: false,
      message: result.message
    });
  }
  try {
    const saved = await activityRepository.save(result.updatedActivity, req.authUser.id);
    recordAuditLog({
      actor: req.authUser,
      action: "WORKFLOW_EXTERNAL_CLEARANCE",
      entityType: "activity",
      entityId: saved.id,
      ipAddress: req.ip
    });
    return res.status(200).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 200,
      success: true,
      message: result.message,
      data: saved
    });
  } catch (err) {
    return res.status(500).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 500,
      success: false,
      message: err?.message || "Failed to confirm clearance."
    });
  }
});
activityController.post("/:id/revision", requireAuth, async (req, res) => {
  if (rejectImpersonationAttempt(req, res, { checkBodyUserId: true, checkBodyRole: true })) return;
  const activity = activityRepository.findById(req.params.id);
  if (!activity) {
    return res.status(404).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 404,
      success: false,
      message: `Activity ${req.params.id} not found.`
    });
  }
  const payload = req.body || {};
  const result = workflowService.requestRevision(activity, req.authUser, payload.reason || "");
  if (!result.success || !result.updatedActivity) {
    return res.status(result.statusCode).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: result.statusCode,
      success: false,
      message: result.message
    });
  }
  try {
    const saved = await activityRepository.save(result.updatedActivity, req.authUser.id);
    recordAuditLog({
      actor: req.authUser,
      action: "WORKFLOW_REQUEST_REVISION",
      entityType: "activity",
      entityId: saved.id,
      details: { reason: payload.reason || "" },
      ipAddress: req.ip
    });
    return res.status(200).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 200,
      success: true,
      message: result.message,
      data: saved
    });
  } catch (err) {
    return res.status(500).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 500,
      success: false,
      message: err?.message || "Failed to save revision request."
    });
  }
});

// backend/controllers/ActionPlanController.ts
import { Router as Router2 } from "express";

// backend/repositories/FiscalYearRepository.ts
init_initialData();
init_database();
init_organizationUtils();
var FiscalYearRepository = class {
  constructor() {
    this.fiscalYears = /* @__PURE__ */ new Map();
    this.isLoaded = false;
    this.seedDefaults();
    this.loadFromDatabase().catch((err) => {
      console.warn("[FiscalYearRepository] Failed initial DB load, using defaults:", err.message);
    });
  }
  seedDefaults() {
    for (const fy of INITIAL_FISCAL_YEARS) {
      this.fiscalYears.set(fy.id, { ...fy });
    }
  }
  async loadFromDatabase() {
    try {
      const rows = await query(`
        SELECT 
          id,
          name,
          fiscal_year as "fiscalYear",
          start_date::text as "startDate",
          end_date::text as "endDate",
          submission_start_date::text as "submissionStartDate",
          submission_deadline::text as "submissionDeadline",
          status,
          template_id as "templateId",
          period_covered as "periodCovered",
          is_submission_active as "isSubmissionActive",
          published_at::text as "publishedAt",
          notes,
          participating_orgs as "participatingOrgs",
          created_at::text as "createdAt",
          updated_at::text as "updatedAt"
        FROM apmams.fiscal_years
        ORDER BY fiscal_year_id DESC;
      `);
      if (rows && rows.length > 0) {
        this.fiscalYears.clear();
        for (const row of rows) {
          const existing = this.fiscalYears.get(row.id) || {};
          this.fiscalYears.set(row.id, {
            ...existing,
            ...row,
            id: row.id,
            name: row.name || existing.name,
            fiscalYear: row.fiscalYear || existing.fiscalYear,
            startDate: row.startDate || existing.startDate,
            endDate: row.endDate || existing.endDate,
            submissionStartDate: row.submissionStartDate || row.submissionOpenDate || existing.submissionStartDate,
            submissionDeadline: row.submissionDeadline || row.submissionCloseDate || existing.submissionDeadline,
            submissionOpenDate: row.submissionStartDate || row.submissionOpenDate || existing.submissionStartDate,
            submissionCloseDate: row.submissionDeadline || row.submissionCloseDate || existing.submissionDeadline,
            status: row.status || existing.status || "Draft",
            templateId: row.templateId || existing.templateId || "TEMPLATE-MSUN-DEFAULT",
            periodCovered: row.periodCovered || existing.periodCovered || `January\u2013December ${row.name?.replace(/\D/g, "") || ""}`,
            isSubmissionActive: Boolean(row.isSubmissionActive),
            publishedAt: row.publishedAt || existing.publishedAt,
            notes: row.notes || existing.notes || "",
            participatingOrgs: Array.isArray(row.participatingOrgs) ? row.participatingOrgs : ["ALL"],
            createdAt: row.createdAt || existing.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
            updatedAt: row.updatedAt || existing.updatedAt || (/* @__PURE__ */ new Date()).toISOString()
          });
        }
        this.isLoaded = true;
        console.log(`[FiscalYearRepository] Loaded ${rows.length} fiscal years from PostgreSQL.`);
      }
    } catch (err) {
      console.warn("[FiscalYearRepository] loadFromDatabase error:", err.message);
    }
  }
  findAll() {
    return Array.from(this.fiscalYears.values());
  }
  findById(id) {
    return this.fiscalYears.get(id);
  }
  async save(fy) {
    const existing = this.fiscalYears.get(fy.id);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const saved = {
      ...fy,
      submissionStartDate: fy.submissionStartDate || fy.submissionOpenDate || fy.startDate,
      submissionDeadline: fy.submissionDeadline || fy.submissionCloseDate || fy.endDate,
      submissionOpenDate: fy.submissionStartDate || fy.submissionOpenDate || fy.startDate,
      submissionCloseDate: fy.submissionDeadline || fy.submissionCloseDate || fy.endDate,
      periodCovered: fy.periodCovered || `January\u2013December ${fy.name.replace(/\D/g, "")}`,
      updatedAt: now,
      createdAt: fy.createdAt || existing?.createdAt || now
    };
    this.fiscalYears.set(saved.id, saved);
    const sql = `
      INSERT INTO apmams.fiscal_years (
        id, name, fiscal_year, start_date, end_date, submission_start_date, submission_deadline,
        status, template_id, period_covered, is_submission_active, published_at, notes, participating_orgs,
        updated_at
      ) VALUES (
        ${sqlEscape(saved.id)},
        ${sqlEscape(saved.name)},
        ${sqlEscape(saved.fiscalYear)},
        ${sqlEscape(saved.startDate)},
        ${sqlEscape(saved.endDate)},
        ${sqlEscape(saved.submissionStartDate)},
        ${sqlEscape(saved.submissionDeadline)},
        ${sqlEscape(saved.status)},
        ${sqlEscape(saved.templateId || "TEMPLATE-MSUN-DEFAULT")},
        ${sqlEscape(saved.periodCovered)},
        ${saved.isSubmissionActive ? "TRUE" : "FALSE"},
        ${sqlEscape(saved.publishedAt || now)},
        ${sqlEscape(saved.notes || "")},
        ${sqlEscape(saved.participatingOrgs || ["ALL"])},
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        fiscal_year = EXCLUDED.fiscal_year,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        submission_start_date = EXCLUDED.submission_start_date,
        submission_deadline = EXCLUDED.submission_deadline,
        status = EXCLUDED.status,
        template_id = EXCLUDED.template_id,
        period_covered = EXCLUDED.period_covered,
        is_submission_active = EXCLUDED.is_submission_active,
        notes = EXCLUDED.notes,
        participating_orgs = EXCLUDED.participating_orgs,
        updated_at = NOW();
    `;
    try {
      await executeRawSql(sql);
    } catch (err) {
      if (existing) {
        this.fiscalYears.set(fy.id, existing);
      } else {
        this.fiscalYears.delete(fy.id);
      }
      console.error("[FiscalYearRepository] DB save failed:", err.message);
      throw err;
    }
    return saved;
  }
  async activate(id) {
    const existing = this.fiscalYears.get(id);
    if (!existing) return null;
    const activated = {
      ...existing,
      status: "Open",
      isSubmissionActive: true,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    return this.save(activated);
  }
  async close(id, newStatus) {
    const existing = this.fiscalYears.get(id);
    if (!existing) return null;
    const closed = {
      ...existing,
      status: newStatus || "Under Review",
      isSubmissionActive: false,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    return this.save(closed);
  }
  async archive(id) {
    const existing = this.fiscalYears.get(id);
    if (!existing) return null;
    const archived = {
      ...existing,
      status: "Archived",
      isSubmissionActive: false,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    return this.save(archived);
  }
  async deleteById(id) {
    const existing = this.fiscalYears.get(id);
    const fyName = existing?.name || id;
    const removedEntries = [];
    const deleted = this.fiscalYears.delete(id);
    if (existing) removedEntries.push([id, existing]);
    for (const [k, v] of Array.from(this.fiscalYears.entries())) {
      if (v.id === id || v.name === fyName || v.name === id) {
        removedEntries.push([k, v]);
        this.fiscalYears.delete(k);
      }
    }
    const sql = `
      DELETE FROM apmams.fiscal_years 
      WHERE id = ${sqlEscape(id)} OR name = ${sqlEscape(fyName)} OR fiscal_year = ${sqlEscape(fyName)};
    `;
    try {
      await executeRawSql(sql);
    } catch (err) {
      for (const [k, v] of removedEntries) {
        this.fiscalYears.set(k, v);
      }
      console.error("[FiscalYearRepository] DB delete failed:", err.message);
      throw err;
    }
    return deleted || removedEntries.length > 0;
  }
  /**
   * Automatically organize action plans and activities by registered organization for this fiscal year.
   * Fulfills Requirements 4, 5, 6, 7:
   * - Each organization has Proposed Action Plan, Approved Action Plan, and Deferred/Rejected sections
   * - Only one primary action plan per organization per fiscal year
   */
  getOrganizationsInFiscalYear(fiscalYearId) {
    const fy = this.fiscalYears.get(fiscalYearId);
    const fyDigits = (fy?.name || fiscalYearId).replace(/\D/g, "") || "2027";
    const allActivities = activityRepository.findAll();
    const yearActivities = allActivities.filter((act) => {
      const actYear = (act.fiscalYear || "").replace(/\D/g, "");
      if (actYear && actYear === fyDigits) return true;
      if (act.startDate && act.startDate.startsWith(fyDigits)) return true;
      return false;
    });
    const allFolders = actionPlanRepository.findAll();
    const results = ORGANIZATIONS.filter((org) => org.id && org.id !== "ADMIN" && org.id !== "COLLEGE").map((org) => {
      const orgActivities = yearActivities.filter((act) => isSameOrg(act.orgId, org.id));
      const proposedActivities = orgActivities.filter((act) => {
        const s = (act.status || "").toUpperCase();
        const ws = (act.workflowStatus || "").toUpperCase();
        if (s.includes("DEFERRED") || s.includes("REJECTED")) return false;
        if (s === "APPROVED" || ws === "COMPLETED") return false;
        return true;
      });
      const approvedActivities = orgActivities.filter((act) => {
        const s = (act.status || "").toUpperCase();
        const ws = (act.workflowStatus || "").toUpperCase();
        return s === "APPROVED" || ws === "COMPLETED";
      });
      const deferredRejectedActivities = orgActivities.filter((act) => {
        const s = (act.status || "").toUpperCase();
        return s.includes("DEFERRED") || s.includes("REJECTED");
      });
      const proposedBudget = proposedActivities.reduce((sum, a) => sum + (a.budget || a.amount || 0), 0);
      const approvedBudget = approvedActivities.reduce((sum, a) => sum + (a.budget || a.amount || 0), 0);
      const totalBudget = orgActivities.reduce((sum, a) => sum + (a.budget || a.amount || 0), 0);
      const primaryPlanId = `AP-${fyDigits}-${org.id}`;
      let status = "Draft";
      if (approvedActivities.length > 0 && proposedActivities.length === 0) {
        status = "Approved";
      } else if (proposedActivities.length > 0) {
        status = "Under Review";
      }
      const latestDate = orgActivities.reduce((latest, a) => {
        const d = a.submittedDate || a.startDate || "";
        return d > latest ? d : latest;
      }, "");
      return {
        orgId: org.id,
        orgName: org.name,
        category: org.category || org.nature || "Student Organization",
        fiscalYear: fy?.name || `FY ${fyDigits}`,
        primaryActionPlanId: primaryPlanId,
        version: 1,
        templateId: fy?.templateId || "TEMPLATE-MSUN-DEFAULT",
        status,
        proposedActivities,
        approvedActivities,
        deferredRejectedActivities,
        totalActivities: orgActivities.length,
        totalBudget,
        proposedBudget,
        approvedBudget,
        submissionDate: latestDate || `${fyDigits}-01-15`,
        signatory: orgActivities[0]?.proposedBy || `${org.id} President`
      };
    });
    return results;
  }
};
var fiscalYearRepository = new FiscalYearRepository();

// backend/controllers/ActionPlanController.ts
init_AuthService();
var actionPlanController = Router2();
actionPlanController.use(requireAuth);
actionPlanController.get("/", (req, res) => {
  if (rejectImpersonationAttempt(req, res)) return;
  const folders = actionPlanRepository.findAll();
  const response = {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    status: 200,
    success: true,
    message: `Retrieved ${folders.length} action plan repositories`,
    data: folders
  };
  return res.status(200).json(response);
});
actionPlanController.get(
  "/fetch-google-sheet",
  requireRoles("ROLE_ORGANIZATION", "ROLE_ADMIN"),
  async (req, res) => {
    if (rejectImpersonationAttempt(req, res)) return;
    try {
      const sheetUrl = req.query.url || "";
      if (!sheetUrl) {
        return res.status(400).json({ success: false, message: "Missing Google Sheet URL" });
      }
      const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
      if (!match) {
        return res.status(400).json({ success: false, message: "Invalid Google Sheet URL. Could not extract spreadsheet ID." });
      }
      const sheetId = match[1];
      const gidMatch = sheetUrl.match(/[#&?]gid=([0-9]+)/);
      const gidParam = gidMatch ? `&gid=${gidMatch[1]}` : "";
      const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx${gidParam}`;
      const googleRes = await fetch(exportUrl);
      if (!googleRes.ok) {
        throw new Error(`Google Sheets responded with HTTP status ${googleRes.status}: ${googleRes.statusText}`);
      }
      const arrayBuf = await googleRes.arrayBuffer();
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="google_sheet_${sheetId}.xlsx"`);
      return res.send(Buffer.from(arrayBuf));
    } catch (err) {
      console.error("[ActionPlanController] Error fetching Google Sheet:", err);
      return res.status(500).json({
        success: false,
        message: err?.message || "Failed to fetch Google Sheet spreadsheet"
      });
    }
  }
);
actionPlanController.post(
  "/fetch-google-sheet",
  requireRoles("ROLE_ORGANIZATION", "ROLE_ADMIN"),
  async (req, res) => {
    if (rejectImpersonationAttempt(req, res)) return;
    try {
      const sheetUrl = req.body?.url || "";
      if (!sheetUrl) {
        return res.status(400).json({ success: false, message: "Missing Google Sheet URL in request body" });
      }
      const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
      if (!match) {
        return res.status(400).json({ success: false, message: "Invalid Google Sheet URL. Could not extract spreadsheet ID." });
      }
      const sheetId = match[1];
      const gidMatch = sheetUrl.match(/[#&?]gid=([0-9]+)/);
      const gidParam = gidMatch ? `&gid=${gidMatch[1]}` : "";
      const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx${gidParam}`;
      const googleRes = await fetch(exportUrl);
      if (!googleRes.ok) {
        throw new Error(`Google Sheets responded with HTTP status ${googleRes.status}: ${googleRes.statusText}`);
      }
      const arrayBuf = await googleRes.arrayBuffer();
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="google_sheet_${sheetId}.xlsx"`);
      return res.send(Buffer.from(arrayBuf));
    } catch (err) {
      console.error("[ActionPlanController] Error fetching Google Sheet:", err);
      return res.status(500).json({
        success: false,
        message: err?.message || "Failed to fetch Google Sheet spreadsheet"
      });
    }
  }
);
actionPlanController.get("/:id", (req, res) => {
  if (rejectImpersonationAttempt(req, res)) return;
  const folder = actionPlanRepository.findById(req.params.id);
  if (!folder) {
    return res.status(404).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 404,
      success: false,
      message: `Action plan ${req.params.id} not found.`
    });
  }
  return res.status(200).json({
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    status: 200,
    success: true,
    message: "Action plan retrieved",
    data: folder
  });
});
actionPlanController.post("/", requireAdmin, async (req, res) => {
  if (rejectImpersonationAttempt(req, res)) return;
  try {
    const saved = await actionPlanRepository.save(req.body);
    recordAuditLog({
      actor: req.authUser,
      action: "ACTION_PLAN_SAVE",
      entityType: "action_plan",
      entityId: saved.id,
      details: { fiscalYear: saved.fiscalYear, title: saved.title, status: saved.status },
      ipAddress: req.ip
    });
    return res.status(201).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 201,
      success: true,
      message: "Action plan created",
      data: saved
    });
  } catch (err) {
    return res.status(500).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 500,
      success: false,
      message: err?.message || "Failed to save action plan folder."
    });
  }
});
actionPlanController.delete("/:id", requireAdmin, async (req, res) => {
  if (rejectImpersonationAttempt(req, res)) return;
  try {
    const target = actionPlanRepository.findById(req.params.id);
    const fyName = target?.fiscalYear || req.params.id;
    const fyDigits = fyName.replace(/\D/g, "");
    const hasActivities = activityRepository.findAll().some((a) => {
      const actYear = (a.fiscalYear || "").replace(/\D/g, "");
      return actYear && actYear === fyDigits || a.startDate && a.startDate.startsWith(fyDigits);
    });
    if (hasActivities) {
      return res.status(400).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 400,
        success: false,
        code: "CANNOT_DELETE_NON_EMPTY_ACTION_PLAN",
        message: `Cannot delete action plan folder for "${fyName}": it already contains registered activities or proposals.`
      });
    }
    await actionPlanRepository.deleteById(req.params.id);
    await actionPlanRepository.deleteByFiscalYear(fyName);
    await fiscalYearRepository.deleteById(fyName);
    recordAuditLog({
      actor: req.authUser,
      action: "ACTION_PLAN_DELETE",
      entityType: "action_plan",
      entityId: req.params.id,
      details: { fiscalYear: fyName },
      ipAddress: req.ip
    });
    return res.status(200).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 200,
      success: true,
      message: `Action plan folder for "${fyName}" deleted successfully.`
    });
  } catch (err) {
    return res.status(500).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 500,
      success: false,
      message: err.message || "Failed to delete action plan folder"
    });
  }
});

// backend/controllers/OrganizationController.ts
import { Router as Router3 } from "express";

// backend/repositories/OrganizationRepository.ts
init_initialData();
init_database();
var OrganizationRepository = class {
  constructor() {
    this.orgs = /* @__PURE__ */ new Map();
    this.isLoaded = false;
    this.seedDefaults();
    this.loadFromDatabase().catch((err) => {
      console.warn("[OrganizationRepository] Failed initial DB load, using defaults:", err.message);
    });
  }
  seedDefaults() {
    for (const org of ORGANIZATIONS) {
      this.orgs.set(org.id, { ...org });
    }
  }
  async loadFromDatabase() {
    try {
      const rows = await query(`
        SELECT 
          acronym as id,
          organization_name as name,
          acronym,
          org_type as type,
          description,
          president,
          email,
          registered_number as "registeredNumber",
          logo_url as logo,
          sub_orgs as "subOrgs",
          nature,
          status,
          date_of_application as "dateOfApplication",
          member_count as "memberCount",
          attachment_count as "attachmentCount",
          color,
          faculty_adviser as "facultyAdviser",
          office_location as "officeLocation",
          objectives,
          members_list as "membersList",
          attachments
        FROM apmams.organizations
        ORDER BY organization_id ASC;
      `);
      if (rows && rows.length > 0) {
        for (const row of rows) {
          const existing = this.orgs.get(row.id) || this.orgs.get(row.acronym) || {};
          const hasDbMembers = Array.isArray(row.membersList);
          const hasDbAttachments = Array.isArray(row.attachments);
          const membersList = hasDbMembers ? row.membersList : existing.membersList || [];
          const attachments = hasDbAttachments ? row.attachments : existing.attachments || [];
          const memberCount = Array.isArray(membersList) ? membersList.length : Number(row.memberCount ?? existing.memberCount ?? 0);
          const attachmentCount = Array.isArray(attachments) ? attachments.length : Number(row.attachmentCount ?? existing.attachmentCount ?? 0);
          this.orgs.set(row.id, {
            ...existing,
            ...row,
            id: row.id || existing.id,
            name: row.name || existing.name,
            acronym: existing.acronym || row.acronym,
            nature: row.nature || existing.nature || "Academic & Student Governance",
            status: row.status || existing.status || "Active",
            registeredNumber: row.registeredNumber || existing.registeredNumber || "MSUN-SO-2026",
            dateOfApplication: row.dateOfApplication || existing.dateOfApplication || "2026-01-10",
            memberCount,
            attachmentCount,
            color: row.color || existing.color || "blue",
            description: row.description || existing.description,
            president: row.president || existing.president || "Student President",
            facultyAdviser: row.facultyAdviser || existing.facultyAdviser || "Faculty Adviser",
            officeLocation: row.officeLocation || existing.officeLocation || "Campus Office",
            objectives: row.objectives || existing.objectives || [],
            membersList,
            attachments
          });
        }
        this.isLoaded = true;
        console.log(`[OrganizationRepository] Loaded ${rows.length} organizations from PostgreSQL.`);
      }
    } catch (err) {
      console.warn("[OrganizationRepository] loadFromDatabase error:", err.message);
    }
  }
  findAll() {
    return Array.from(this.orgs.values());
  }
  findById(id) {
    const direct = this.orgs.get(id);
    if (direct) return direct;
    const norm = (id || "").trim().toLowerCase();
    for (const org of this.orgs.values()) {
      if (org.id.toLowerCase() === norm || (org.acronym || "").toLowerCase() === norm) {
        return org;
      }
    }
    return void 0;
  }
  async save(org) {
    const membersList = Array.isArray(org.membersList) ? org.membersList : [];
    const attachments = Array.isArray(org.attachments) ? org.attachments : [];
    const normalized = {
      ...org,
      membersList,
      attachments,
      memberCount: Array.isArray(org.membersList) ? membersList.length : Math.max(0, Number(org.memberCount ?? 0)),
      attachmentCount: Array.isArray(org.attachments) ? attachments.length : Math.max(0, Number(org.attachmentCount ?? 0))
    };
    const previous = this.orgs.get(normalized.id);
    this.orgs.set(normalized.id, { ...normalized });
    const sql = `
      INSERT INTO apmams.organizations (
        organization_name, acronym, org_code, description, president, email, registered_number, sub_orgs,
        nature, status, date_of_application, member_count, attachment_count, color, faculty_adviser, office_location,
        objectives, members_list, attachments
      ) VALUES (
        ${sqlEscape(normalized.name)},
        ${sqlEscape(normalized.id || normalized.acronym)},
        ${sqlEscape(normalized.id || normalized.acronym)},
        ${sqlEscape(normalized.description || "")},
        ${sqlEscape(normalized.president || "")},
        ${sqlEscape(normalized.email || `${(normalized.id || "org").toLowerCase()}@msun.edu.ph`)},
        ${sqlEscape(normalized.registeredNumber || "")},
        ${sqlEscape(normalized.subOrgs || [])},
        ${sqlEscape(normalized.nature || "Academic & Student Governance")},
        ${sqlEscape(normalized.status || "Active")},
        ${sqlEscape(normalized.dateOfApplication || "2026-01-10")},
        ${normalized.memberCount},
        ${normalized.attachmentCount},
        ${sqlEscape(normalized.color || "blue")},
        ${sqlEscape(normalized.facultyAdviser || "")},
        ${sqlEscape(normalized.officeLocation || "")},
        ${sqlEscape(normalized.objectives || [])},
        ${sqlEscape(membersList)},
        ${sqlEscape(attachments)}
      )
      ON CONFLICT (acronym) DO UPDATE SET
        organization_name = EXCLUDED.organization_name,
        description = EXCLUDED.description,
        president = EXCLUDED.president,
        email = EXCLUDED.email,
        registered_number = EXCLUDED.registered_number,
        sub_orgs = EXCLUDED.sub_orgs,
        nature = EXCLUDED.nature,
        status = EXCLUDED.status,
        date_of_application = EXCLUDED.date_of_application,
        member_count = EXCLUDED.member_count,
        attachment_count = EXCLUDED.attachment_count,
        color = EXCLUDED.color,
        faculty_adviser = EXCLUDED.faculty_adviser,
        office_location = EXCLUDED.office_location,
        objectives = EXCLUDED.objectives,
        members_list = EXCLUDED.members_list,
        attachments = EXCLUDED.attachments;
    `;
    try {
      await executeRawSql(sql);
    } catch (err) {
      if (previous) {
        this.orgs.set(normalized.id, previous);
      } else {
        this.orgs.delete(normalized.id);
      }
      console.error("[OrganizationRepository] DB save failed:", err.message);
      throw err;
    }
    return { ...normalized };
  }
};
var organizationRepository = new OrganizationRepository();

// backend/controllers/OrganizationController.ts
init_AuthService();
var organizationController = Router3();
organizationController.use(requireAuth);
function normalizeOrgCounts(org) {
  const membersList = Array.isArray(org.membersList) ? org.membersList : [];
  const attachments = Array.isArray(org.attachments) ? org.attachments : [];
  return {
    ...org,
    membersList,
    attachments,
    memberCount: membersList.length,
    attachmentCount: attachments.length
  };
}
function sanitizeOrgForExternal(org) {
  const sanitized = { ...org };
  delete sanitized.membersList;
  delete sanitized.attachments;
  delete sanitized.memberCount;
  delete sanitized.attachmentCount;
  return sanitized;
}
organizationController.get("/", (req, res) => {
  if (rejectImpersonationAttempt(req, res)) return;
  const orgs = organizationRepository.findAll();
  const sanitizedOrgs = orgs.map((org) => {
    if (canViewOrgPrivateData(req.authUser, org.id)) {
      return normalizeOrgCounts(org);
    }
    return sanitizeOrgForExternal(org);
  });
  const response = {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    status: 200,
    success: true,
    message: `Retrieved ${sanitizedOrgs.length} student organizations`,
    data: sanitizedOrgs
  };
  return res.status(200).json(response);
});
organizationController.get("/:id", (req, res) => {
  if (rejectImpersonationAttempt(req, res)) return;
  const org = organizationRepository.findById(req.params.id);
  if (!org) {
    return res.status(404).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 404,
      success: false,
      message: `Organization ${req.params.id} not found.`
    });
  }
  const isAuth = canViewOrgPrivateData(req.authUser, org.id);
  const data = isAuth ? normalizeOrgCounts(org) : sanitizeOrgForExternal(org);
  return res.status(200).json({
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    status: 200,
    success: true,
    message: isAuth ? "Organization retrieved with full permissions" : "Organization general overview retrieved (members and attachments restricted)",
    data
  });
});
organizationController.get("/:id/members", (req, res) => {
  if (rejectImpersonationAttempt(req, res)) return;
  const org = organizationRepository.findById(req.params.id);
  if (!org) {
    return res.status(404).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 404,
      success: false,
      message: `Organization ${req.params.id} not found.`
    });
  }
  if (!canViewOrgPrivateData(req.authUser, org.id)) {
    return res.status(403).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 403,
      success: false,
      code: "FORBIDDEN",
      message: `403 Forbidden: Access to ${org.name} (${org.id}) members is restricted to authorized members and reviewers of this organization.`
    });
  }
  const members = org.membersList || [];
  return res.status(200).json({
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    status: 200,
    success: true,
    message: `Retrieved ${members.length} members for ${org.id}`,
    data: members
  });
});
organizationController.get("/:id/attachments", (req, res) => {
  if (rejectImpersonationAttempt(req, res)) return;
  const org = organizationRepository.findById(req.params.id);
  if (!org) {
    return res.status(404).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 404,
      success: false,
      message: `Organization ${req.params.id} not found.`
    });
  }
  if (!canViewOrgPrivateData(req.authUser, org.id)) {
    return res.status(403).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 403,
      success: false,
      code: "FORBIDDEN",
      message: `403 Forbidden: Access to ${org.name} (${org.id}) attachments is restricted to authorized members and reviewers of this organization.`
    });
  }
  const attachments = org.attachments || [];
  return res.status(200).json({
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    status: 200,
    success: true,
    message: `Retrieved ${attachments.length} attachments for ${org.id}`,
    data: attachments
  });
});
organizationController.post("/", requireAdmin, async (req, res) => {
  if (rejectImpersonationAttempt(req, res)) return;
  const body = req.body;
  if (!body.name || !body.acronym) {
    return res.status(400).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 400,
      success: false,
      message: "Organization name and acronym are required."
    });
  }
  const rawKey = (body.id || body.acronym || "").trim();
  const existing = organizationRepository.findById(rawKey);
  const orgId = existing ? existing.id : rawKey.toUpperCase();
  const membersList = Array.isArray(body.membersList) ? body.membersList : existing?.membersList || [];
  const attachments = Array.isArray(body.attachments) ? body.attachments : existing?.attachments || [];
  const toSave = {
    ...existing || {},
    ...body,
    id: orgId,
    name: body.name.trim(),
    acronym: (body.acronym || existing?.acronym || orgId).trim().toUpperCase(),
    status: body.status || existing?.status || "Active",
    registeredNumber: body.registeredNumber || existing?.registeredNumber || `MSUN-SO-${(/* @__PURE__ */ new Date()).getFullYear()}`,
    dateOfApplication: body.dateOfApplication || existing?.dateOfApplication || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    membersList,
    attachments,
    memberCount: membersList.length,
    attachmentCount: attachments.length
  };
  try {
    const saved = await organizationRepository.save(toSave);
    recordAuditLog({
      actor: req.authUser,
      action: existing ? "ORG_UPDATE" : "ORG_CREATE",
      entityType: "organization",
      entityId: saved.id,
      details: {
        name: saved.name,
        acronym: saved.acronym,
        memberCount: saved.memberCount,
        attachmentCount: saved.attachmentCount
      },
      ipAddress: req.ip
    });
    return res.status(existing ? 200 : 201).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: existing ? 200 : 201,
      success: true,
      message: `Organization "${saved.name}" (${saved.acronym}) ${existing ? "updated" : "created"} successfully`,
      data: saved
    });
  } catch (err) {
    return res.status(500).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 500,
      success: false,
      message: err?.message || "Failed to save organization to database."
    });
  }
});
organizationController.put("/:id", requireAdmin, async (req, res) => {
  if (rejectImpersonationAttempt(req, res)) return;
  const existing = organizationRepository.findById(req.params.id);
  if (!existing) {
    return res.status(404).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 404,
      success: false,
      message: `Organization ${req.params.id} not found.`
    });
  }
  const membersList = Array.isArray(req.body.membersList) ? req.body.membersList : existing.membersList || [];
  const attachments = Array.isArray(req.body.attachments) ? req.body.attachments : existing.attachments || [];
  const toSave = {
    ...existing,
    ...req.body,
    id: existing.id,
    membersList,
    attachments,
    memberCount: membersList.length,
    attachmentCount: attachments.length
  };
  try {
    const saved = await organizationRepository.save(toSave);
    recordAuditLog({
      actor: req.authUser,
      action: "ORG_UPDATE",
      entityType: "organization",
      entityId: saved.id,
      details: {
        name: saved.name,
        acronym: saved.acronym,
        memberCount: saved.memberCount,
        attachmentCount: saved.attachmentCount
      },
      ipAddress: req.ip
    });
    return res.status(200).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 200,
      success: true,
      message: `Organization "${saved.name}" updated successfully`,
      data: saved
    });
  } catch (err) {
    return res.status(500).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 500,
      success: false,
      message: err?.message || "Failed to update organization in database."
    });
  }
});

// backend/controllers/UserController.ts
init_UserRepository();
init_AuthService();
import { Router as Router4 } from "express";
var userController = Router4();
userController.get("/", requireAdmin, (req, res) => {
  if (rejectImpersonationAttempt(req, res)) return;
  const users = userRepository.findAll().map((u) => toPublicUser(u));
  const response = {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    status: 200,
    success: true,
    message: `Retrieved ${users.length} user accounts`,
    data: users
  };
  return res.status(200).json(response);
});
userController.get("/:id", requireAuth, (req, res) => {
  if (rejectImpersonationAttempt(req, res)) return;
  const callerRole = req.authUser?.activeRole || req.authUser?.role;
  const callerIsAdmin = isAdminRole(callerRole);
  const callerIsSelf = req.authUser?.id === req.params.id;
  if (!callerIsAdmin && !callerIsSelf) {
    return res.status(403).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 403,
      success: false,
      code: "FORBIDDEN",
      message: "Forbidden: You cannot inspect another user account."
    });
  }
  const user = userRepository.findById(req.params.id);
  if (!user) {
    return res.status(404).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 404,
      success: false,
      message: `User ${req.params.id} not found.`
    });
  }
  return res.status(200).json({
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    status: 200,
    success: true,
    message: "User retrieved",
    data: toPublicUser(user)
  });
});
userController.post("/", requireAdmin, async (req, res) => {
  if (rejectImpersonationAttempt(req, res)) return;
  try {
    const body = req.body || {};
    const rawPassword = typeof body.password === "string" ? body.password : typeof body.newPassword === "string" ? body.newPassword : "";
    const policy = validatePasswordPolicy(rawPassword);
    if (!policy.valid) {
      return res.status(400).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 400,
        success: false,
        code: "INVALID_PASSWORD",
        message: policy.message || "A valid password of at least 8 characters is required."
      });
    }
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
    const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
    const fullName = typeof body.name === "string" && body.name.trim() ? body.name.trim() : `${firstName} ${lastName}`.trim();
    if (!email || !email.includes("@") || !fullName) {
      return res.status(400).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 400,
        success: false,
        code: "VALIDATION_ERROR",
        message: "Full name and a valid institutional email address are required."
      });
    }
    const primaryRole = typeof body.role === "string" ? body.role.trim() : "";
    const rawRoles = Array.isArray(body.roles) && body.roles.length > 0 ? body.roles.map((r) => String(r).trim()).filter(Boolean) : primaryRole ? [primaryRole] : [];
    if (!primaryRole || rawRoles.length === 0 || !rawRoles.every((r) => isOfficialEndUserRole(r))) {
      return res.status(400).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 400,
        success: false,
        code: "INVALID_ROLE",
        message: "Accounts must be assigned one or more of the six official APMAMS end-user roles."
      });
    }
    const username = typeof body.username === "string" && body.username.trim() ? body.username.trim().toLowerCase() : email.split("@")[0];
    const studentId = typeof body.studentId === "string" ? body.studentId.trim() : "";
    if (!studentId || !/^\d{5,10}$/.test(studentId)) {
      return res.status(400).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 400,
        success: false,
        code: "INVALID_ID_NUMBER",
        message: "ID Number is required and must be between 5 and 10 numeric digits."
      });
    }
    const duplicateStudentId = await userRepository.existsDuplicateStudentId(studentId);
    if (duplicateStudentId) {
      return res.status(409).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 409,
        success: false,
        code: "DUPLICATE_ID_NUMBER",
        message: `An account with ID Number "${studentId}" already exists.`
      });
    }
    const duplicate = await userRepository.existsDuplicateEmailOrUsername(email, username);
    if (duplicate.conflict) {
      return res.status(409).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 409,
        success: false,
        code: "DUPLICATE_ACCOUNT",
        message: duplicate.field === "email" ? `An account with email "${email}" already exists.` : `An account with username "${username}" already exists.`
      });
    }
    const appUserId = typeof body.id === "string" && body.id.trim() ? body.id.trim() : `usr-${Date.now().toString(36)}`;
    const canonicalPrimary = normalizeOfficialRole(primaryRole) || primaryRole;
    const canonicalRoles = dedupeOfficialRoles(rawRoles);
    const passwordHash = await hashPassword(rawPassword);
    const newUser = toPublicUser({
      ...body,
      id: appUserId,
      name: fullName,
      firstName: firstName || fullName.split(" ")[0],
      lastName: lastName || fullName.split(" ").slice(1).join(" "),
      username,
      studentId,
      email,
      role: canonicalPrimary,
      roles: canonicalRoles,
      activeRole: canonicalPrimary,
      isActive: body.isActive !== false
    });
    const saved = await userRepository.createWithPasswordHash(
      newUser,
      passwordHash,
      Boolean(body.mustChangePassword)
    );
    recordAuditLog({
      actor: req.authUser,
      action: "USER_CREATE",
      entityType: "user",
      entityId: saved.id,
      details: { email: saved.email, role: saved.role, orgId: saved.orgId },
      ipAddress: req.ip
    });
    return res.status(201).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 201,
      success: true,
      message: "User account created successfully.",
      data: toPublicUser(saved)
    });
  } catch (err) {
    return res.status(500).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 500,
      success: false,
      message: "Failed to create user account."
    });
  }
});
userController.put("/:id", requireAuth, async (req, res) => {
  console.log(`[UserController.put] ID: ${req.params.id}, authUser: ${req.authUser?.id}, role: ${req.authUser?.role}`);
  if (rejectImpersonationAttempt(req, res, { checkBodyUserId: false })) return;
  try {
    const targetId = req.params.id;
    const existing = userRepository.findById(targetId);
    if (!existing) {
      return res.status(404).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 404,
        success: false,
        message: `User ${targetId} not found.`
      });
    }
    const callerRole = req.authUser?.activeRole || req.authUser?.role;
    const callerIsAdmin = isAdminRole(callerRole);
    const callerIsSelf = Boolean(
      req.authUser?.id && existing.id && req.authUser.id.toLowerCase() === existing.id.toLowerCase()
    );
    if (!callerIsAdmin && !callerIsSelf) {
      return res.status(403).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 403,
        success: false,
        code: "FORBIDDEN",
        message: "Forbidden: you cannot modify another user account."
      });
    }
    const body = req.body || {};
    if (!callerIsAdmin) {
      if (body.password !== void 0 || body.newPassword !== void 0) {
        return res.status(400).json({
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          status: 400,
          success: false,
          code: "PASSWORD_CHANGE_ENDPOINT_REQUIRED",
          message: "Password updates must be performed using the security change-password feature."
        });
      }
      const firstName = typeof body.firstName === "string" && body.firstName.trim() ? body.firstName.trim() : existing.firstName || "";
      const lastName = typeof body.lastName === "string" && body.lastName.trim() ? body.lastName.trim() : existing.lastName || "";
      const fullName = typeof body.name === "string" && body.name.trim() ? body.name.trim() : `${firstName} ${lastName}`.trim() || existing.name;
      const selfUpdated = toPublicUser({
        ...existing,
        firstName,
        lastName,
        name: fullName,
        avatar: typeof body.avatar === "string" ? body.avatar : existing.avatar,
        bio: typeof body.bio === "string" ? body.bio : existing.bio || ""
      });
      const saved2 = await userRepository.updateExisting(targetId, selfUpdated);
      recordAuditLog({
        actor: req.authUser,
        action: "PROFILE_UPDATE",
        entityType: "user",
        entityId: saved2.id,
        details: { hasCustomAvatar: Boolean(saved2.avatar && saved2.avatar.length > 4), bioUpdated: body.bio !== void 0 },
        ipAddress: req.ip
      });
      return res.status(200).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 200,
        success: true,
        message: "Profile updated successfully.",
        data: toPublicUser({
          ...saved2,
          activeRole: req.authUser?.activeRole || saved2.role
        })
      });
    }
    const nextEmail = typeof body.email === "string" && body.email.trim() ? body.email.trim().toLowerCase() : existing.email;
    const nextUsername = typeof body.username === "string" && body.username.trim() ? body.username.trim().toLowerCase() : existing.username || nextEmail.split("@")[0];
    const duplicate = await userRepository.existsDuplicateEmailOrUsername(
      nextEmail,
      nextUsername,
      targetId
    );
    if (duplicate.conflict) {
      return res.status(409).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 409,
        success: false,
        code: "DUPLICATE_ACCOUNT",
        message: duplicate.field === "email" ? `Another account already uses email "${nextEmail}".` : `Another account already uses username "${nextUsername}".`
      });
    }
    const nextStudentId = typeof body.studentId === "string" ? body.studentId.trim() : existing.studentId;
    if (nextStudentId) {
      if (!/^\d{5,10}$/.test(nextStudentId)) {
        return res.status(400).json({
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          status: 400,
          success: false,
          code: "INVALID_ID_NUMBER",
          message: "ID Number must be between 5 and 10 numeric digits."
        });
      }
      const duplicateStudentId = await userRepository.existsDuplicateStudentId(nextStudentId, targetId);
      if (duplicateStudentId) {
        return res.status(409).json({
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          status: 409,
          success: false,
          code: "DUPLICATE_ID_NUMBER",
          message: `Another account already uses ID Number "${nextStudentId}".`
        });
      }
    }
    const nextRole = typeof body.role === "string" && body.role.trim() ? body.role.trim() : existing.role;
    const nextRoles = Array.isArray(body.roles) && body.roles.length > 0 ? Array.from(new Set(body.roles.map((r) => String(r).trim()).filter(Boolean))) : existing.roles && existing.roles.length > 0 ? existing.roles : [nextRole];
    if (body.role !== void 0 || body.roles !== void 0) {
      if (!isOfficialEndUserRole(nextRole) || !nextRoles.every((r) => isOfficialEndUserRole(r))) {
        return res.status(400).json({
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          status: 400,
          success: false,
          code: "INVALID_ROLE",
          message: "Only the six official APMAMS end-user roles may be assigned."
        });
      }
    }
    let newPasswordHash;
    let mustChangePassword;
    const rawResetPassword = typeof body.newPassword === "string" && body.newPassword.length > 0 ? body.newPassword : typeof body.password === "string" && body.password.length > 0 ? body.password : "";
    if (rawResetPassword) {
      const policy = validatePasswordPolicy(rawResetPassword);
      if (!policy.valid) {
        return res.status(400).json({
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          status: 400,
          success: false,
          code: "INVALID_PASSWORD",
          message: policy.message || "Reset password must be at least 8 characters long."
        });
      }
      newPasswordHash = await hashPassword(rawResetPassword);
      mustChangePassword = body.mustChangePassword !== void 0 ? Boolean(body.mustChangePassword) : true;
    }
    const canonicalNextRoles = dedupeOfficialRoles(nextRoles);
    const canonicalNextRole = normalizeOfficialRole(nextRole) || canonicalNextRoles[0] || nextRole;
    const finalSavedRoles = canonicalNextRoles.length > 0 ? canonicalNextRoles : [canonicalNextRole];
    const updatedUser = toPublicUser({
      ...existing,
      ...body,
      id: targetId,
      email: nextEmail,
      username: nextUsername,
      studentId: nextStudentId,
      role: canonicalNextRole,
      roles: finalSavedRoles,
      activeRole: canonicalNextRole,
      isActive: body.isActive !== void 0 ? Boolean(body.isActive) : existing.isActive
    });
    const saved = await userRepository.updateExisting(targetId, updatedUser, {
      newPasswordHash,
      mustChangePassword
    });
    recordAuditLog({
      actor: req.authUser,
      action: callerIsSelf ? "PROFILE_UPDATE" : "USER_UPDATE",
      entityType: "user",
      entityId: saved.id,
      details: { email: saved.email, role: saved.role, isActive: saved.isActive, hasCustomAvatar: Boolean(saved.avatar && saved.avatar.length > 4) },
      ipAddress: req.ip
    });
    if (saved.isActive === false || newPasswordHash) {
      await authService.revokeAllSessionsForUser(targetId);
    }
    return res.status(200).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 200,
      success: true,
      message: newPasswordHash ? "Account and password hash updated successfully." : "User account updated successfully.",
      data: toPublicUser(saved)
    });
  } catch (err) {
    console.error("[UserController.put] Error:", err);
    return res.status(500).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 500,
      success: false,
      message: err?.message || "Failed to update user account."
    });
  }
});
userController.delete("/:id", requireAdmin, async (req, res) => {
  if (rejectImpersonationAttempt(req, res)) return;
  try {
    if (req.authUser?.id === req.params.id) {
      return res.status(400).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 400,
        success: false,
        message: "Cannot delete the currently signed-in administrator account."
      });
    }
    const deleted = await userRepository.deleteById(req.params.id);
    if (!deleted) {
      return res.status(404).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 404,
        success: false,
        message: `User ${req.params.id} not found.`
      });
    }
    recordAuditLog({
      actor: req.authUser,
      action: "USER_DELETE",
      entityType: "user",
      entityId: req.params.id,
      ipAddress: req.ip
    });
    return res.status(200).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 200,
      success: true,
      message: "User deleted"
    });
  } catch (err) {
    return res.status(500).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 500,
      success: false,
      message: "Failed to delete user account."
    });
  }
});

// backend/controllers/AuthController.ts
init_AuthService();
import { Router as Router5 } from "express";
var authController = Router5();
authController.get("/csrf-token", async (req, res) => {
  try {
    const token = extractSessionToken(req);
    if (!token) {
      return res.status(200).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 200,
        success: true,
        csrfToken: null,
        authenticated: false
      });
    }
    const result = await authService.validateSession(token);
    if (!result.ok) {
      return res.status(200).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 200,
        success: true,
        csrfToken: null,
        authenticated: false
      });
    }
    const csrfToken = generateCsrfToken(token);
    res.setHeader("X-CSRF-Token", csrfToken);
    return res.status(200).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 200,
      success: true,
      csrfToken,
      authenticated: true
    });
  } catch (err) {
    return res.status(500).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 500,
      success: false,
      message: "Failed to retrieve CSRF token."
    });
  }
});
authController.post("/login", async (req, res) => {
  try {
    const rawIdentifier = typeof req.body?.identifier === "string" ? req.body.identifier : typeof req.body?.email === "string" ? req.body.email : typeof req.body?.username === "string" ? req.body.username : "";
    const plainPassword = typeof req.body?.password === "string" ? req.body.password : "";
    const selectedRole = typeof req.body?.selectedRole === "string" ? req.body.selectedRole : void 0;
    const ip = (typeof req.headers["x-forwarded-for"] === "string" ? req.headers["x-forwarded-for"].split(",")[0].trim() : "") || req.socket.remoteAddress || "unknown";
    const userAgent = typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : "";
    const result = await authService.authenticate(rawIdentifier, plainPassword, selectedRole, {
      ip,
      userAgent
    });
    if (!result.ok) {
      clearSessionCookie(req, res);
      return res.status(result.status).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: result.status,
        success: false,
        code: result.code,
        message: result.message
      });
    }
    setSessionCookie(req, res, result.sessionToken, result.cookieMaxAge);
    const csrfToken = generateCsrfToken(result.sessionToken);
    res.setHeader("X-CSRF-Token", csrfToken);
    return res.status(200).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 200,
      success: true,
      csrfToken,
      requiresRoleSelection: result.requiresRoleSelection,
      availableRoles: result.availableRoles,
      data: toPublicUser(result.user)
    });
  } catch (err) {
    return res.status(500).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 500,
      success: false,
      message: "An unexpected error occurred during sign-in."
    });
  }
});
authController.get("/me", async (req, res) => {
  try {
    const token = extractSessionToken(req);
    const result = await authService.validateSession(token);
    if (!result.ok) {
      if (token) clearSessionCookie(req, res);
      return res.status(result.status).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: result.status,
        success: false,
        code: result.code,
        message: result.message
      });
    }
    const csrfToken = generateCsrfToken(token);
    res.setHeader("X-CSRF-Token", csrfToken);
    return res.status(200).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 200,
      success: true,
      csrfToken,
      data: toPublicUser(result.user)
    });
  } catch (err) {
    return res.status(500).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 500,
      success: false,
      message: "Session check failed."
    });
  }
});
authController.post("/switch-role", async (req, res) => {
  try {
    const token = extractSessionToken(req);
    const targetRole = typeof req.body?.role === "string" ? req.body.role : "";
    const result = await authService.switchActiveRole(token, targetRole);
    if (!result.ok) {
      return res.status(result.status).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: result.status,
        success: false,
        code: result.code,
        message: result.message
      });
    }
    let csrfToken;
    if (token) {
      setSessionCookie(req, res, token, result.cookieMaxAge);
      csrfToken = generateCsrfToken(token);
      res.setHeader("X-CSRF-Token", csrfToken);
    }
    return res.status(200).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 200,
      success: true,
      csrfToken,
      data: toPublicUser(result.user)
    });
  } catch (err) {
    return res.status(500).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 500,
      success: false,
      message: "Failed to switch active role."
    });
  }
});
authController.post("/change-password", async (req, res) => {
  try {
    const token = extractSessionToken(req);
    const currentPassword = typeof req.body?.currentPassword === "string" ? req.body.currentPassword : "";
    const newPassword = typeof req.body?.newPassword === "string" ? req.body.newPassword : "";
    const headerUserId = typeof req.headers["x-user-id"] === "string" ? req.headers["x-user-id"].trim() : void 0;
    const bodyUserId = typeof req.body?.userId === "string" ? req.body.userId.trim() : void 0;
    const bodyEmail = typeof req.body?.email === "string" ? req.body.email.trim() : void 0;
    const bodyStudentId = typeof req.body?.studentId === "string" ? req.body.studentId.trim() : void 0;
    const bodyUsername = typeof req.body?.username === "string" ? req.body.username.trim() : void 0;
    const result = await authService.changePassword(token, currentPassword, newPassword, {
      userId: bodyUserId || headerUserId,
      email: bodyEmail,
      studentId: bodyStudentId,
      username: bodyUsername
    });
    if (!result.ok) {
      return res.status(result.status).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: result.status,
        success: false,
        code: result.code,
        message: result.message
      });
    }
    if (result.sessionToken && result.cookieMaxAge) {
      setSessionCookie(req, res, result.sessionToken, result.cookieMaxAge);
    }
    return res.status(200).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 200,
      success: true,
      message: result.message
    });
  } catch (err) {
    console.error("[AuthController] change-password error:", err);
    return res.status(500).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 500,
      success: false,
      message: err.message || "Failed to update password."
    });
  }
});
authController.post("/logout", async (req, res) => {
  try {
    const token = extractSessionToken(req);
    await authService.logout(token);
    clearSessionCookie(req, res);
    return res.status(200).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 200,
      success: true,
      message: "Signed out successfully."
    });
  } catch (err) {
    clearSessionCookie(req, res);
    return res.status(200).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 200,
      success: true,
      message: "Signed out."
    });
  }
});

// backend/controllers/NotificationController.ts
import { Router as Router6 } from "express";

// backend/services/EmailService.ts
import nodemailer from "nodemailer";
var EmailService = class {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.initializeTransporter();
  }
  initializeTransporter() {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 465;
    const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
    const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
    const smtpSecure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : smtpPort === 465;
    if (smtpHost && smtpUser && smtpPass) {
      try {
        this.transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpSecure,
          auth: {
            user: smtpUser,
            pass: smtpPass
          }
        });
        this.isConfigured = true;
        console.log(`[EmailService] Custom SMTP configured successfully: ${smtpHost}:${smtpPort} (User: ${smtpUser})`);
      } catch (err) {
        console.warn("[EmailService] Failed to initialize Custom SMTP transport:", err);
        this.isConfigured = false;
      }
    } else if (smtpUser && smtpPass) {
      try {
        this.transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: smtpUser,
            pass: smtpPass
          }
        });
        this.isConfigured = true;
        console.log(`[EmailService] Gmail SMTP configured successfully for account: ${smtpUser}`);
      } catch (err) {
        console.warn("[EmailService] Failed to initialize Gmail SMTP transport:", err);
        this.isConfigured = false;
      }
    } else {
      this.isConfigured = false;
      console.log("[EmailService] GMAIL_USER / GMAIL_APP_PASSWORD not set in .env. Automated email simulation & logger active.");
    }
  }
  getStatus() {
    const smtpHost = process.env.SMTP_HOST;
    const sender = process.env.SMTP_FROM || process.env.GMAIL_USER || "no-reply-actionplan@msunaawan.edu.ph";
    return {
      isConfigured: this.isConfigured,
      service: smtpHost ? `SMTP (${smtpHost})` : "Gmail (smtp.gmail.com)",
      senderAccount: sender
    };
  }
  /**
   * Generates a direct Google Mail compose URL that opens the message in Gmail Web
   */
  generateGmailWebComposeUrl(toEmail, subject, bodyText) {
    const baseUrl = "https://mail.google.com/mail/?view=cm&fs=1";
    const params = new URLSearchParams({
      to: toEmail,
      su: subject,
      body: bodyText
    });
    return `${baseUrl}&${params.toString()}`;
  }
  /**
   * Sends an institutional email notification via Gmail SMTP or fallback logger + direct web link
   */
  async sendEmailNotification(options) {
    const {
      toEmail,
      toName,
      subject,
      previewText = "",
      activityId,
      activityTitle,
      stageName = "Action Plan Management",
      actorName,
      actorRole,
      remarks,
      statusBadge = "Update",
      eventType = "APPROVAL",
      systemUrl = "http://localhost:3000"
    } = options;
    const fromSender = process.env.SMTP_FROM || process.env.GMAIL_USER || process.env.SMTP_USER || "no-reply-actionplan@msunaawan.edu.ph";
    const senderDisplayName = options.fromName || `MSU at Naawan \u2014 ${actorRole}`;
    const plainTextBody = [
      `REPUBLIC OF THE PHILIPPINES`,
      `MINDANAO STATE UNIVERSITY AT NAAWAN`,
      `Office of Student Development (OSD) \u2022 9023 Naawan, Misamis Oriental`,
      `--------------------------------------------------`,
      `OFFICIAL ELECTRONIC NOTIFICATION`,
      ``,
      `Dear ${toName},`,
      ``,
      `This is an official automated clearance notification regarding your student organization activity:`,
      ``,
      `\u2022 Activity Title: ${activityTitle}`,
      activityId ? `\u2022 Activity Code: ${activityId}` : "",
      `\u2022 Status / Workflow Stage: ${stageName} [${statusBadge}]`,
      `\u2022 Processed By: ${actorName} (${actorRole})`,
      remarks ? `\u2022 Official Directives / Remarks: "${remarks}"` : "",
      ``,
      `Access the system directly to view complete attachments and liquidation records:`,
      `${systemUrl}`,
      ``,
      `--------------------------------------------------`,
      `Mindanao State University at Naawan`,
      `Action Plan: Monitoring and Management System (MSUN APMAMS)`
    ].filter(Boolean).join("\n");
    const gmailWebComposeUrl = this.generateGmailWebComposeUrl(toEmail, subject, plainTextBody);
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #0f172a; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: #0f172a; color: #ffffff; padding: 24px 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 16px; letter-spacing: 0.5px; text-transform: uppercase; font-weight: 800; color: #f8fafc; }
    .header h2 { margin: 4px 0 0; font-size: 13px; font-weight: 500; color: #94a3b8; }
    .badge { display: inline-block; padding: 6px 14px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; margin-top: 12px; }
    .badge-approval { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
    .badge-submission { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; }
    .badge-deferral { background: #fff1f2; color: #9f1239; border: 1px solid #fecdd3; }
    .content { padding: 30px; }
    .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 20px 0; font-size: 13px; }
    .meta-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9; }
    .meta-row:last-child { border-bottom: none; }
    .meta-label { color: #64748b; font-weight: 600; }
    .meta-value { color: #0f172a; font-weight: 700; text-align: right; }
    .remarks-box { background: #f0fdf4; border-left: 4px solid #16a34a; padding: 12px 16px; margin: 18px 0; border-radius: 0 8px 8px 0; font-style: italic; font-size: 13px; color: #166534; }
    .cta-btn { display: inline-block; background: #2563eb; color: #ffffff !important; padding: 12px 24px; border-radius: 10px; font-weight: 700; font-size: 13px; text-decoration: none; margin-top: 16px; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 30px; text-align: center; font-size: 11px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="font-size: 11px; letter-spacing: 1px; color: #f59e0b; font-weight: 800; margin-bottom: 4px;">REPUBLIC OF THE PHILIPPINES</div>
      <h1>Mindanao State University at Naawan</h1>
      <h2>Office of Student Development (OSD) \u2022 Official Electronic Notice</h2>
      <div class="badge ${eventType === "APPROVAL" ? "badge-approval" : eventType === "SUBMISSION" ? "badge-submission" : "badge-deferral"}">
        ${statusBadge}
      </div>
    </div>
    <div class="content">
      <p style="font-size: 14px; margin-top: 0;">Dear <strong>${toName}</strong>,</p>
      <p style="font-size: 13px; color: #334155; line-height: 1.6;">
        ${previewText || `This is an official notification regarding the activity proposal <strong>${activityTitle}</strong>.`}
      </p>

      <div class="meta-box">
        <div class="meta-row">
          <span class="meta-label">Activity Title:</span>
          <span class="meta-value">${activityTitle}</span>
        </div>
        ${activityId ? `
        <div class="meta-row">
          <span class="meta-label">Activity Code:</span>
          <span class="meta-value">${activityId}</span>
        </div>` : ""}
        <div class="meta-row">
          <span class="meta-label">Workflow Stage:</span>
          <span class="meta-value">${stageName}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Processed By:</span>
          <span class="meta-value">${actorName} (${actorRole})</span>
        </div>
      </div>

      ${remarks ? `
      <div class="remarks-box">
        <strong>Directives / Remarks:</strong> "${remarks}"
      </div>` : ""}

      <div style="text-align: center; margin: 24px 0 10px;">
        <a href="${systemUrl}" class="cta-btn">\u{1F680} Open Activity in MSUN Action Plan System</a>
      </div>
    </div>
    <div class="footer">
      This is an automated institutional communication generated by Mindanao State University at Naawan Action Plan: Monitoring and Management System (APMAMS).
    </div>
  </div>
</body>
</html>
`;
    if (this.isConfigured && this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from: `"${senderDisplayName}" <${fromSender}>`,
          to: toEmail,
          subject,
          text: plainTextBody,
          html: htmlBody
        });
        console.log(`[EmailService] \u{1F4E7} Gmail sent successfully: ${info.messageId} to ${toEmail}`);
        return {
          success: true,
          messageId: info.messageId,
          method: "GMAIL_SMTP",
          gmailWebComposeUrl,
          info: `Dispatched via Gmail SMTP to ${toEmail}`
        };
      } catch (err) {
        console.warn(`[EmailService] SMTP error sending to ${toEmail}, falling back to Web compose:`, err?.message || err);
      }
    }
    console.log(`[EmailService] \u{1F4E8} [Real-Time Notification] Delivered to: ${toEmail} | Subject: "${subject}" | Actor: ${actorName} (${actorRole})`);
    return {
      success: true,
      method: "WEB_GMAIL",
      gmailWebComposeUrl,
      info: `Notification queued and dispatched. Gmail Web direct compose available.`
    };
  }
};
var emailService = new EmailService();

// backend/controllers/NotificationController.ts
init_AuthService();
var notificationController = Router6();
notificationController.use(requireAuth);
var sseClients = /* @__PURE__ */ new Map();
notificationController.get("/stream", (req, res) => {
  if (rejectImpersonationAttempt(req, res)) return;
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive"
  });
  const clientId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const userId = req.authUser?.id;
  const orgId = req.authUser?.orgId;
  sseClients.set(clientId, { id: clientId, res, userId, orgId });
  res.write(`data: ${JSON.stringify({ type: "CONNECTED", clientId, timestamp: (/* @__PURE__ */ new Date()).toISOString() })}

`);
  const heartbeat = setInterval(() => {
    try {
      res.write(": keepalive\n\n");
    } catch {
      clearInterval(heartbeat);
      sseClients.delete(clientId);
    }
  }, 25e3);
  req.on("close", () => {
    clearInterval(heartbeat);
    sseClients.delete(clientId);
  });
});
function broadcastNotification(event) {
  const payload = JSON.stringify({ type: "NOTIFICATION", data: event });
  sseClients.forEach((client) => {
    try {
      if (!event.targetOrgId && !event.targetUserId || event.targetOrgId && client.orgId && client.orgId.toUpperCase() === event.targetOrgId.toUpperCase() || event.targetUserId && client.userId === event.targetUserId || !client.orgId && !client.userId) {
        client.res.write(`data: ${payload}

`);
      }
    } catch {
      sseClients.delete(client.id);
    }
  });
}
notificationController.post("/send-email", async (req, res) => {
  if (rejectImpersonationAttempt(req, res)) return;
  try {
    const payload = req.body;
    if (!payload.toEmail || !payload.subject || !payload.activityTitle) {
      return res.status(400).json({
        success: false,
        message: "toEmail, subject, and activityTitle are required fields."
      });
    }
    const result = await emailService.sendEmailNotification(payload);
    return res.status(200).json({
      success: true,
      message: result.method === "GMAIL_SMTP" ? `Official email dispatched automatically via SMTP to ${payload.toEmail}` : `Email notification logged and queued. Direct compose link ready.`,
      data: result
    });
  } catch (error) {
    console.error("[NotificationController] Failed to send email:", error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Internal server error dispatching email."
    });
  }
});
notificationController.post("/test-email", async (req, res) => {
  if (rejectImpersonationAttempt(req, res)) return;
  try {
    const toEmail = req.body?.toEmail || req.authUser?.email || "hazelanne.mapula@msunaawan.edu.ph";
    const toName = req.body?.toName || req.authUser?.name || "MSUN Administrator";
    const result = await emailService.sendEmailNotification({
      toEmail,
      toName,
      subject: "[MSUN APMAMS] Automated Email System Verification",
      previewText: "This is a test verification email from Mindanao State University at Naawan APMAMS.",
      activityTitle: "Automated Notification System Diagnostics",
      stageName: "System Health Check",
      actorName: req.authUser?.name || "System Admin",
      actorRole: "System Administrator",
      remarks: "Automated email notification transport verified.",
      statusBadge: "Verified",
      eventType: "SYSTEM"
    });
    return res.status(200).json({
      success: true,
      message: result.method === "GMAIL_SMTP" ? `Test email sent successfully via SMTP to ${toEmail}!` : `SMTP not configured in .env. Test notification logged.`,
      data: result
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err?.message || "Failed to dispatch test email."
    });
  }
});
notificationController.post("/broadcast", async (req, res) => {
  if (rejectImpersonationAttempt(req, res)) return;
  try {
    const { notification, email } = req.body;
    if (!notification || !notification.title) {
      return res.status(400).json({
        success: false,
        message: "Notification object is required."
      });
    }
    let emailResult = null;
    if (email && email.toEmail) {
      emailResult = await emailService.sendEmailNotification(email);
    }
    const actor = req.authUser;
    broadcastNotification({
      type: notification.type || "SYSTEM",
      title: notification.title,
      message: notification.message,
      activityId: notification.activityId,
      activityTitle: notification.activityTitle,
      actorName: actor?.name || notification.actorName,
      actorRole: actor?.activeRole || actor?.role || notification.actorRole,
      targetOrgId: notification.targetOrgId,
      targetUserId: notification.userId,
      timestamp: notification.timestamp || (/* @__PURE__ */ new Date()).toISOString(),
      emailId: notification.emailId,
      gmailComposeUrl: emailResult?.gmailWebComposeUrl
    });
    return res.status(200).json({
      success: true,
      message: "Real-time notification broadcasted successfully.",
      connectedClientsCount: sseClients.size,
      emailResult
    });
  } catch (error) {
    console.error("[NotificationController] Broadcast error:", error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Error broadcasting notification."
    });
  }
});
notificationController.get("/status", requireAdmin, (req, res) => {
  if (rejectImpersonationAttempt(req, res)) return;
  return res.status(200).json({
    status: "ONLINE",
    connectedRealtimeClients: sseClients.size,
    gmail: emailService.getStatus()
  });
});

// backend/controllers/FiscalYearController.ts
import { Router as Router7 } from "express";
init_AuthService();
var fiscalYearController = Router7();
fiscalYearController.use(requireAuth);
fiscalYearController.get("/", (req, res) => {
  if (rejectImpersonationAttempt(req, res)) return;
  const list = fiscalYearRepository.findAll();
  const response = {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    status: 200,
    success: true,
    message: `Retrieved ${list.length} fiscal years`,
    data: list
  };
  return res.status(200).json(response);
});
fiscalYearController.get("/:id", (req, res) => {
  if (rejectImpersonationAttempt(req, res)) return;
  const fy = fiscalYearRepository.findById(req.params.id);
  if (!fy) {
    return res.status(404).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 404,
      success: false,
      message: `Fiscal Year "${req.params.id}" not found`
    });
  }
  return res.status(200).json({
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    status: 200,
    success: true,
    message: "Fiscal year retrieved successfully",
    data: fy
  });
});
fiscalYearController.get("/:id/organizations", (req, res) => {
  if (rejectImpersonationAttempt(req, res)) return;
  const fy = fiscalYearRepository.findById(req.params.id);
  if (!fy) {
    return res.status(404).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 404,
      success: false,
      message: `Fiscal Year "${req.params.id}" not found`
    });
  }
  const queryOrgId = req.query.orgId;
  if (queryOrgId && !canViewOrgPrivateData(req.authUser, queryOrgId)) {
    return res.status(403).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 403,
      success: false,
      code: "FORBIDDEN",
      message: `Forbidden: You do not have permission to view organization action plans for "${queryOrgId}".`
    });
  }
  let orgPlans = fiscalYearRepository.getOrganizationsInFiscalYear(fy.id);
  if (queryOrgId) {
    orgPlans = orgPlans.filter((p) => p.orgId.toUpperCase() === queryOrgId.toUpperCase());
  } else {
    orgPlans = orgPlans.filter((p) => canViewOrgPrivateData(req.authUser, p.orgId));
  }
  const response = {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    status: 200,
    success: true,
    message: `Retrieved ${orgPlans.length} organization action plans for ${fy.name}`,
    data: orgPlans
  };
  return res.status(200).json(response);
});
fiscalYearController.post("/", requireAdmin, async (req, res) => {
  if (rejectImpersonationAttempt(req, res)) return;
  try {
    const raw = req.body;
    if (!raw.name || !raw.startDate || !raw.endDate) {
      return res.status(400).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 400,
        success: false,
        message: "Fiscal year name, start date, and end date are required"
      });
    }
    const yearDigits = raw.name.replace(/\D/g, "") || new Date(raw.startDate).getFullYear().toString();
    const normalizedId = raw.id || `FY-${yearDigits}`;
    const existing = fiscalYearRepository.findById(normalizedId);
    if (existing) {
      return res.status(409).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 409,
        success: false,
        message: `Fiscal Year with ID "${normalizedId}" already exists`
      });
    }
    const toSave = {
      id: normalizedId,
      name: raw.name.startsWith("FY") ? raw.name : `FY ${raw.name}`,
      fiscalYear: raw.fiscalYear || raw.name,
      startDate: raw.startDate,
      endDate: raw.endDate,
      submissionStartDate: raw.submissionStartDate || raw.startDate,
      submissionDeadline: raw.submissionDeadline || raw.endDate,
      submissionOpenDate: raw.submissionStartDate || raw.startDate,
      submissionCloseDate: raw.submissionDeadline || raw.endDate,
      status: raw.status || "Draft",
      templateId: raw.templateId || "TEMPLATE-MSUN-DEFAULT",
      periodCovered: raw.periodCovered || `January\u2013December ${yearDigits}`,
      isSubmissionActive: raw.status === "Open" || Boolean(raw.isSubmissionActive),
      publishedAt: raw.status === "Open" ? (/* @__PURE__ */ new Date()).toISOString() : void 0,
      notes: raw.notes || "",
      participatingOrgs: raw.participatingOrgs || ["ALL"],
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const saved = await fiscalYearRepository.save(toSave);
    recordAuditLog({
      actor: req.authUser,
      action: "FISCAL_YEAR_CREATE",
      entityType: "fiscal_year",
      entityId: saved.id,
      details: { name: saved.name, status: saved.status },
      ipAddress: req.ip
    });
    return res.status(201).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 201,
      success: true,
      message: `Fiscal Year "${saved.name}" provisioned successfully`,
      data: saved
    });
  } catch (err) {
    return res.status(500).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 500,
      success: false,
      message: err.message || "Failed to create fiscal year"
    });
  }
});
fiscalYearController.put("/:id", requireAdmin, async (req, res) => {
  if (rejectImpersonationAttempt(req, res)) return;
  try {
    const existing = fiscalYearRepository.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 404,
        success: false,
        message: `Fiscal Year "${req.params.id}" not found`
      });
    }
    const updated = await fiscalYearRepository.save({
      ...existing,
      ...req.body,
      id: existing.id
    });
    recordAuditLog({
      actor: req.authUser,
      action: "FISCAL_YEAR_UPDATE",
      entityType: "fiscal_year",
      entityId: updated.id,
      details: { name: updated.name, status: updated.status },
      ipAddress: req.ip
    });
    return res.status(200).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 200,
      success: true,
      message: `Fiscal Year "${updated.name}" updated successfully`,
      data: updated
    });
  } catch (err) {
    return res.status(500).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 500,
      success: false,
      message: err.message || "Failed to update fiscal year"
    });
  }
});
fiscalYearController.post("/:id/activate", requireAdmin, async (req, res) => {
  if (rejectImpersonationAttempt(req, res)) return;
  try {
    const activated = await fiscalYearRepository.activate(req.params.id);
    if (!activated) {
      return res.status(404).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 404,
        success: false,
        message: `Fiscal Year "${req.params.id}" not found`
      });
    }
    recordAuditLog({
      actor: req.authUser,
      action: "FISCAL_YEAR_ACTIVATE",
      entityType: "fiscal_year",
      entityId: activated.id,
      ipAddress: req.ip
    });
    return res.status(200).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 200,
      success: true,
      message: `Fiscal Year "${activated.name}" is now Activated and Open for Submissions`,
      data: activated
    });
  } catch (err) {
    return res.status(500).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 500,
      success: false,
      message: err.message || "Failed to activate fiscal year"
    });
  }
});
fiscalYearController.post("/:id/close", requireAdmin, async (req, res) => {
  if (rejectImpersonationAttempt(req, res)) return;
  try {
    const closed = await fiscalYearRepository.close(req.params.id, req.body?.status || "Under Review");
    if (!closed) {
      return res.status(404).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 404,
        success: false,
        message: `Fiscal Year "${req.params.id}" not found`
      });
    }
    recordAuditLog({
      actor: req.authUser,
      action: "FISCAL_YEAR_CLOSE",
      entityType: "fiscal_year",
      entityId: closed.id,
      ipAddress: req.ip
    });
    return res.status(200).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 200,
      success: true,
      message: `Fiscal Year "${closed.name}" closed (Status: ${closed.status})`,
      data: closed
    });
  } catch (err) {
    return res.status(500).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 500,
      success: false,
      message: err.message || "Failed to close fiscal year"
    });
  }
});
fiscalYearController.post("/:id/archive", requireAdmin, async (req, res) => {
  if (rejectImpersonationAttempt(req, res)) return;
  try {
    const archived = await fiscalYearRepository.archive(req.params.id);
    if (!archived) {
      return res.status(404).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 404,
        success: false,
        message: `Fiscal Year "${req.params.id}" not found`
      });
    }
    recordAuditLog({
      actor: req.authUser,
      action: "FISCAL_YEAR_ARCHIVE",
      entityType: "fiscal_year",
      entityId: archived.id,
      ipAddress: req.ip
    });
    return res.status(200).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 200,
      success: true,
      message: `Fiscal Year "${archived.name}" has been archived. All records preserved.`,
      data: archived
    });
  } catch (err) {
    return res.status(500).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 500,
      success: false,
      message: err.message || "Failed to archive fiscal year"
    });
  }
});
fiscalYearController.delete("/:id", requireAdmin, async (req, res) => {
  if (rejectImpersonationAttempt(req, res)) return;
  try {
    const existing = fiscalYearRepository.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 404,
        success: false,
        message: `Fiscal Year "${req.params.id}" not found`
      });
    }
    const fyDigits = (existing.name || existing.id).replace(/\D/g, "");
    const hasActivities = activityRepository.findAll().some((a) => {
      const actYear = (a.fiscalYear || "").replace(/\D/g, "");
      return actYear && actYear === fyDigits || a.startDate && a.startDate.startsWith(fyDigits);
    });
    if (hasActivities) {
      return res.status(400).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 400,
        success: false,
        code: "CANNOT_DELETE_NON_EMPTY_FY",
        message: `Cannot delete "${existing.name}": it already contains registered activities or proposals.`
      });
    }
    await fiscalYearRepository.deleteById(req.params.id);
    await actionPlanRepository.deleteByFiscalYear(existing.name);
    recordAuditLog({
      actor: req.authUser,
      action: "FISCAL_YEAR_DELETE",
      entityType: "fiscal_year",
      entityId: req.params.id,
      details: { name: existing.name },
      ipAddress: req.ip
    });
    return res.status(200).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 200,
      success: true,
      message: `Fiscal Year "${existing.name}" and associated action plan folder deleted successfully.`
    });
  } catch (err) {
    return res.status(500).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 500,
      success: false,
      message: err.message || "Failed to delete fiscal year"
    });
  }
});

// backend/controllers/TemplateController.ts
import { Router as Router8 } from "express";

// backend/repositories/TemplateRepository.ts
init_initialData();
init_database();
var TemplateRepository = class {
  constructor() {
    this.templates = /* @__PURE__ */ new Map();
    this.isLoaded = false;
    this.seedDefaults();
    this.loadFromDatabase().catch((err) => {
      console.warn("[TemplateRepository] Failed initial DB load, using defaults:", err.message);
    });
  }
  seedDefaults() {
    for (const t of INITIAL_ACTION_PLAN_TEMPLATES) {
      this.templates.set(t.id, { ...t });
    }
  }
  async loadFromDatabase() {
    try {
      const rows = await query(`
        SELECT 
          id,
          name,
          description,
          version,
          is_default as "isDefault",
          header_title as "headerTitle",
          header_subtitle as "headerSubTitle",
          header_color as "headerColor",
          header_text_color as "headerTextColor",
          sub_header_color as "subHeaderColor",
          sub_header_text_color as "subHeaderTextColor",
          footer_label as "footerLabel",
          budget_calculation_rule as "budgetCalculationRule",
          columns,
          status,
          allow_text_wrap as "allowTextWrap",
          show_borders as "showBorders",
          created_at::text as "createdAt",
          updated_at::text as "updatedAt"
        FROM apmams.action_plan_templates
        ORDER BY is_default DESC, template_id ASC;
      `);
      if (rows && rows.length > 0) {
        const defaultTemplates = new Map(
          INITIAL_ACTION_PLAN_TEMPLATES.map((t) => [t.id, { ...t }])
        );
        this.templates.clear();
        for (const row of rows) {
          const existing = defaultTemplates.get(row.id) || {};
          this.templates.set(row.id, {
            ...existing,
            ...row,
            id: row.id,
            name: row.name || existing.name,
            version: Number(row.version ?? existing.version ?? 1),
            isDefault: Boolean(row.isDefault),
            headerTitle: row.headerTitle || existing.headerTitle || "PLAN OF ACTIVITIES",
            headerSubTitle: row.headerSubTitle || existing.headerSubTitle || "[ORGANIZATION NAME]",
            headerColor: row.headerColor || existing.headerColor || "#800000",
            headerTextColor: row.headerTextColor || existing.headerTextColor || "#FFFFFF",
            subHeaderColor: row.subHeaderColor || existing.subHeaderColor || "#FCE5CD",
            subHeaderTextColor: row.subHeaderTextColor || existing.subHeaderTextColor || "#1E293B",
            footerLabel: row.footerLabel || existing.footerLabel || "",
            budgetCalculationRule: row.budgetCalculationRule || existing.budgetCalculationRule || "SUM_ALL",
            columns: Array.isArray(row.columns) ? row.columns : existing.columns || [],
            status: row.status || existing.status || "Published",
            allowTextWrap: row.allowTextWrap !== false,
            showBorders: row.showBorders !== false,
            createdAt: row.createdAt || existing.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
            updatedAt: row.updatedAt || existing.updatedAt || (/* @__PURE__ */ new Date()).toISOString()
          });
        }
        this.isLoaded = true;
        console.log(`[TemplateRepository] Loaded ${rows.length} templates from PostgreSQL.`);
      }
    } catch (err) {
      console.warn("[TemplateRepository] loadFromDatabase error:", err.message);
    }
  }
  findAll() {
    return Array.from(this.templates.values());
  }
  findById(id) {
    return this.templates.get(id);
  }
  async save(template) {
    const existing = this.templates.get(template.id);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const version = template.version || existing?.version || 1;
    const saved = {
      ...template,
      version,
      updatedAt: now,
      createdAt: template.createdAt || existing?.createdAt || now
    };
    this.templates.set(saved.id, saved);
    const sql = `
      INSERT INTO apmams.action_plan_templates (
        id, name, description, version, is_default, header_title, header_subtitle,
        header_color, header_text_color, sub_header_color, sub_header_text_color,
        footer_label, budget_calculation_rule, columns, status, allow_text_wrap, show_borders,
        updated_at
      ) VALUES (
        ${sqlEscape(saved.id)},
        ${sqlEscape(saved.name)},
        ${sqlEscape(saved.description || "")},
        ${saved.version},
        ${saved.isDefault ? "TRUE" : "FALSE"},
        ${sqlEscape(saved.headerTitle)},
        ${sqlEscape(saved.headerSubTitle || "[ORGANIZATION NAME]")},
        ${sqlEscape(saved.headerColor)},
        ${sqlEscape(saved.headerTextColor)},
        ${sqlEscape(saved.subHeaderColor || "#FCE5CD")},
        ${sqlEscape(saved.subHeaderTextColor || "#1E293B")},
        ${sqlEscape(saved.footerLabel || "")},
        ${sqlEscape(saved.budgetCalculationRule || "SUM_ALL")},
        ${sqlEscape(saved.columns)},
        ${sqlEscape(saved.status)},
        ${saved.allowTextWrap !== false ? "TRUE" : "FALSE"},
        ${saved.showBorders !== false ? "TRUE" : "FALSE"},
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        version = EXCLUDED.version,
        is_default = EXCLUDED.is_default,
        header_title = EXCLUDED.header_title,
        header_subtitle = EXCLUDED.header_subtitle,
        header_color = EXCLUDED.header_color,
        header_text_color = EXCLUDED.header_text_color,
        sub_header_color = EXCLUDED.sub_header_color,
        sub_header_text_color = EXCLUDED.sub_header_text_color,
        footer_label = EXCLUDED.footer_label,
        budget_calculation_rule = EXCLUDED.budget_calculation_rule,
        columns = EXCLUDED.columns,
        status = EXCLUDED.status,
        allow_text_wrap = EXCLUDED.allow_text_wrap,
        show_borders = EXCLUDED.show_borders,
        updated_at = NOW();
    `;
    try {
      await executeRawSql(sql);
    } catch (err) {
      if (existing) {
        this.templates.set(saved.id, existing);
      } else {
        this.templates.delete(saved.id);
      }
      console.error("[TemplateRepository] DB save failed:", err.message);
      throw err;
    }
    return saved;
  }
  async duplicate(id, newName) {
    const source = this.templates.get(id);
    if (!source) return null;
    const newId = `TEMPLATE-${Date.now().toString(36).toUpperCase()}`;
    const duplicated = {
      ...JSON.parse(JSON.stringify(source)),
      id: newId,
      name: newName || `Copy of ${source.name}`,
      version: 1,
      isDefault: false,
      status: "Draft",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    return this.save(duplicated);
  }
  async publish(id) {
    const existing = this.templates.get(id);
    if (!existing) return null;
    const published = {
      ...existing,
      status: "Published",
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    return this.save(published);
  }
  async delete(id) {
    const existing = this.templates.get(id);
    if (!existing) return false;
    if (existing.isDefault || id === "TEMPLATE-MSUN-DEFAULT") {
      throw new Error("Cannot delete default system template");
    }
    this.templates.delete(id);
    const sql = `DELETE FROM apmams.action_plan_templates WHERE id = ${sqlEscape(id)}`;
    try {
      await executeRawSql(sql);
    } catch (err) {
      this.templates.set(id, existing);
      console.error("[TemplateRepository] DB delete failed:", err.message);
      throw err;
    }
    return true;
  }
};
var templateRepository = new TemplateRepository();

// backend/controllers/TemplateController.ts
init_AuthService();
var templateController = Router8();
templateController.use(requireAuth);
templateController.get("/", (req, res) => {
  if (rejectImpersonationAttempt(req, res)) return;
  const templates = templateRepository.findAll();
  const response = {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    status: 200,
    success: true,
    message: `Retrieved ${templates.length} action plan templates`,
    data: templates
  };
  return res.status(200).json(response);
});
templateController.get("/:id", (req, res) => {
  if (rejectImpersonationAttempt(req, res)) return;
  const template = templateRepository.findById(req.params.id);
  if (!template) {
    return res.status(404).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 404,
      success: false,
      message: `Template with ID "${req.params.id}" not found`
    });
  }
  return res.status(200).json({
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    status: 200,
    success: true,
    message: "Template retrieved successfully",
    data: template
  });
});
templateController.post("/", requireAdmin, async (req, res) => {
  if (rejectImpersonationAttempt(req, res)) return;
  try {
    const raw = req.body;
    if (!raw.name || !raw.columns || !Array.isArray(raw.columns)) {
      return res.status(400).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 400,
        success: false,
        message: "Invalid template payload: name and columns array are required"
      });
    }
    const newId = raw.id || `TEMPLATE-${Date.now().toString(36).toUpperCase()}`;
    const toSave = {
      id: newId,
      name: raw.name,
      description: raw.description || "",
      version: Number(raw.version || 1),
      isDefault: Boolean(raw.isDefault),
      headerTitle: raw.headerTitle || "PLAN OF ACTIVITIES",
      headerSubTitle: raw.headerSubTitle || "[ORGANIZATION NAME]",
      headerColor: raw.headerColor || "#800000",
      headerTextColor: raw.headerTextColor || "#FFFFFF",
      subHeaderColor: raw.subHeaderColor || "#FCE5CD",
      subHeaderTextColor: raw.subHeaderTextColor || "#1E293B",
      footerLabel: raw.footerLabel || "Total Projected Budget (excluding office supplies, allowances and wages)",
      budgetCalculationRule: raw.budgetCalculationRule || "SUM_ALL",
      columns: raw.columns,
      status: raw.status || "Draft",
      allowTextWrap: raw.allowTextWrap !== false,
      showBorders: raw.showBorders !== false,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const saved = await templateRepository.save(toSave);
    recordAuditLog({
      actor: req.authUser,
      action: "TEMPLATE_CREATE",
      entityType: "template",
      entityId: saved.id,
      details: { name: saved.name, status: saved.status },
      ipAddress: req.ip
    });
    return res.status(201).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 201,
      success: true,
      message: "Action plan template created successfully",
      data: saved
    });
  } catch (err) {
    return res.status(500).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 500,
      success: false,
      message: err.message || "Failed to create template"
    });
  }
});
templateController.put("/:id", requireAdmin, async (req, res) => {
  if (rejectImpersonationAttempt(req, res)) return;
  try {
    const existing = templateRepository.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 404,
        success: false,
        message: `Template with ID "${req.params.id}" not found`
      });
    }
    const updated = await templateRepository.save({
      ...existing,
      ...req.body,
      id: existing.id
    });
    recordAuditLog({
      actor: req.authUser,
      action: "TEMPLATE_UPDATE",
      entityType: "template",
      entityId: updated.id,
      details: { name: updated.name, version: updated.version, status: updated.status },
      ipAddress: req.ip
    });
    return res.status(200).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 200,
      success: true,
      message: `Template "${updated.name}" updated successfully`,
      data: updated
    });
  } catch (err) {
    return res.status(500).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 500,
      success: false,
      message: err.message || "Failed to update template"
    });
  }
});
templateController.post("/:id/duplicate", requireAdmin, async (req, res) => {
  if (rejectImpersonationAttempt(req, res)) return;
  try {
    const duplicated = await templateRepository.duplicate(req.params.id, req.body?.name);
    if (!duplicated) {
      return res.status(404).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 404,
        success: false,
        message: `Source template with ID "${req.params.id}" not found`
      });
    }
    recordAuditLog({
      actor: req.authUser,
      action: "TEMPLATE_DUPLICATE",
      entityType: "template",
      entityId: duplicated.id,
      details: { sourceId: req.params.id, name: duplicated.name },
      ipAddress: req.ip
    });
    return res.status(201).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 201,
      success: true,
      message: `Template duplicated successfully as "${duplicated.name}"`,
      data: duplicated
    });
  } catch (err) {
    return res.status(500).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 500,
      success: false,
      message: err.message || "Failed to duplicate template"
    });
  }
});
templateController.post("/:id/publish", requireAdmin, async (req, res) => {
  if (rejectImpersonationAttempt(req, res)) return;
  try {
    const published = await templateRepository.publish(req.params.id);
    if (!published) {
      return res.status(404).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 404,
        success: false,
        message: `Template with ID "${req.params.id}" not found`
      });
    }
    recordAuditLog({
      actor: req.authUser,
      action: "TEMPLATE_PUBLISH",
      entityType: "template",
      entityId: published.id,
      details: { name: published.name, version: published.version },
      ipAddress: req.ip
    });
    return res.status(200).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 200,
      success: true,
      message: `Template "${published.name}" has been published`,
      data: published
    });
  } catch (err) {
    return res.status(500).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 500,
      success: false,
      message: err.message || "Failed to publish template"
    });
  }
});
templateController.delete("/:id", requireAdmin, async (req, res) => {
  if (rejectImpersonationAttempt(req, res)) return;
  try {
    const success = await templateRepository.delete(req.params.id);
    if (!success) {
      return res.status(404).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 404,
        success: false,
        message: `Template with ID "${req.params.id}" not found`
      });
    }
    recordAuditLog({
      actor: req.authUser,
      action: "TEMPLATE_DELETE",
      entityType: "template",
      entityId: req.params.id,
      ipAddress: req.ip
    });
    return res.status(200).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 200,
      success: true,
      message: "Action plan template deleted successfully"
    });
  } catch (err) {
    return res.status(400).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 400,
      success: false,
      message: err.message || "Failed to delete template"
    });
  }
});

// backend/controllers/OptionController.ts
import { Router as Router9 } from "express";

// backend/repositories/OptionRepository.ts
init_initialData();
init_database();
var OptionRepository = class {
  constructor() {
    this.options = /* @__PURE__ */ new Map();
    this.isLoaded = false;
    this.seedDefaults();
    this.loadFromDatabase().catch((err) => {
      console.warn("[OptionRepository] Failed initial DB load, using defaults:", err.message);
    });
  }
  seedDefaults() {
    for (const opt of INITIAL_DROPDOWN_OPTIONS) {
      this.options.set(opt.id, { ...opt });
    }
  }
  async loadFromDatabase() {
    try {
      const rows = await query(`
        SELECT 
          id,
          category,
          label,
          value,
          description,
          display_order as "order",
          is_active as "isActive",
          is_system_protected as "isSystemProtected",
          metadata,
          created_at::text as "createdAt",
          updated_at::text as "updatedAt"
        FROM apmams.system_dropdown_options
        ORDER BY category, display_order ASC, label ASC
      `);
      if (rows && rows.length > 0) {
        this.options.clear();
        for (const row of rows) {
          if (row.id === "opt_off_3" || row.value === "OSA" || row.label === "OSA") {
            continue;
          }
          this.options.set(row.id, {
            id: row.id,
            category: row.category,
            label: row.label,
            value: row.value,
            description: row.description || "",
            order: Number(row.order) || 0,
            isActive: Boolean(row.isActive),
            isSystemProtected: Boolean(row.isSystemProtected),
            metadata: row.metadata || {},
            createdAt: row.createdAt,
            updatedAt: row.updatedAt
          });
        }
        this.isLoaded = true;
        console.log(`[OptionRepository] Loaded ${this.options.size} dropdown options from PostgreSQL.`);
        const hasWeekCategory = rows.some((r) => r.category === "timeframe_week");
        if (!hasWeekCategory) {
          const weekSeeds = INITIAL_DROPDOWN_OPTIONS.filter((o) => o.category === "timeframe_week");
          await this.persistSeedsToDb(weekSeeds);
          for (const seed of weekSeeds) {
            if (!this.options.has(seed.id)) {
              this.options.set(seed.id, { ...seed });
            }
          }
        }
      } else {
        await this.persistSeedsToDb();
      }
    } catch (err) {
      console.warn("[OptionRepository] DB query failed, relying on defaults:", err.message);
    }
  }
  async persistSeedsToDb(seeds = INITIAL_DROPDOWN_OPTIONS) {
    for (const opt of seeds) {
      try {
        await executeRawSql(`
          INSERT INTO apmams.system_dropdown_options (
            id, category, label, value, description, display_order, is_active, is_system_protected, metadata
          ) VALUES (
            ${sqlEscape(opt.id)},
            ${sqlEscape(opt.category)},
            ${sqlEscape(opt.label)},
            ${sqlEscape(opt.value)},
            ${sqlEscape(opt.description || "")},
            ${opt.order || 0},
            ${opt.isActive !== false ? "TRUE" : "FALSE"},
            ${opt.isSystemProtected ? "TRUE" : "FALSE"},
            ${sqlEscape(opt.metadata || {})}
          ) ON CONFLICT (id) DO NOTHING;
        `);
      } catch (e) {
      }
    }
  }
  getAll(category, activeOnly = false) {
    let list = Array.from(this.options.values()).filter((o) => o.id !== "opt_off_3" && o.value !== "OSA" && o.label !== "OSA");
    if (category && category !== "ALL") {
      list = list.filter((o) => o.category === category);
    }
    if (activeOnly) {
      list = list.filter((o) => o.isActive !== false);
    }
    return list.sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
  }
  getById(id) {
    return this.options.get(id);
  }
  async create(option) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const clean = {
      ...option,
      id: option.id || `opt_${option.category}_${Date.now().toString(36)}`,
      order: option.order ?? this.getAll(option.category).length + 1,
      isActive: option.isActive !== false,
      isSystemProtected: Boolean(option.isSystemProtected),
      createdAt: now,
      updatedAt: now
    };
    this.options.set(clean.id, clean);
    try {
      await executeRawSql(`
        INSERT INTO apmams.system_dropdown_options (
          id, category, label, value, description, display_order, is_active, is_system_protected, metadata, created_at, updated_at
        ) VALUES (
          ${sqlEscape(clean.id)},
          ${sqlEscape(clean.category)},
          ${sqlEscape(clean.label)},
          ${sqlEscape(clean.value)},
          ${sqlEscape(clean.description || "")},
          ${clean.order},
          ${clean.isActive ? "TRUE" : "FALSE"},
          ${clean.isSystemProtected ? "TRUE" : "FALSE"},
          ${sqlEscape(clean.metadata || {})},
          ${sqlEscape(now)},
          ${sqlEscape(now)}
        ) ON CONFLICT (id) DO UPDATE SET
          label = EXCLUDED.label,
          value = EXCLUDED.value,
          description = EXCLUDED.description,
          display_order = EXCLUDED.display_order,
          is_active = EXCLUDED.is_active,
          updated_at = EXCLUDED.updated_at;
      `);
    } catch (err) {
      this.options.delete(clean.id);
      console.error("[OptionRepository] DB insert error:", err.message);
      throw err;
    }
    return clean;
  }
  async update(id, updates) {
    let existing = this.options.get(id);
    if (!existing) {
      await this.loadFromDatabase();
      existing = this.options.get(id);
    }
    if (!existing) return null;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const updated = {
      ...existing,
      ...updates,
      id: existing.id,
      // prevent changing id
      isSystemProtected: existing.isSystemProtected,
      // preserve protection
      updatedAt: now
    };
    this.options.set(id, updated);
    try {
      await executeRawSql(`
        UPDATE apmams.system_dropdown_options SET
          label = ${sqlEscape(updated.label)},
          value = ${sqlEscape(updated.value)},
          description = ${sqlEscape(updated.description || "")},
          display_order = ${updated.order},
          is_active = ${updated.isActive ? "TRUE" : "FALSE"},
          updated_at = ${sqlEscape(now)}
        WHERE id = ${sqlEscape(id)};
      `);
    } catch (err) {
      this.options.set(id, existing);
      console.error("[OptionRepository] DB update error:", err.message);
      throw err;
    }
    return updated;
  }
  async delete(id) {
    let existing = this.options.get(id);
    if (!existing) {
      await this.loadFromDatabase();
      existing = this.options.get(id);
    }
    if (!existing) return false;
    if (existing.isSystemProtected) {
      throw new Error(`Cannot delete protected system option: ${existing.label}`);
    }
    this.options.delete(id);
    try {
      await executeRawSql(`DELETE FROM apmams.system_dropdown_options WHERE id = ${sqlEscape(id)};`);
    } catch (err) {
      this.options.set(id, existing);
      console.error("[OptionRepository] DB delete error:", err.message);
      throw err;
    }
    return true;
  }
  async reorder(category, orderedIds) {
    const statements = [];
    const snapshots = /* @__PURE__ */ new Map();
    for (let i = 0; i < orderedIds.length; i++) {
      const id = orderedIds[i];
      const opt = this.options.get(id);
      if (opt && opt.category === category) {
        snapshots.set(id, { ...opt });
        opt.order = i + 1;
        opt.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
        statements.push(`
          UPDATE apmams.system_dropdown_options 
          SET display_order = ${opt.order}, updated_at = CURRENT_TIMESTAMP 
          WHERE id = ${sqlEscape(id)};
        `);
      }
    }
    if (statements.length === 0) return;
    try {
      await executeRawSql(`BEGIN;
${statements.join("\n")}
COMMIT;`);
    } catch (err) {
      for (const [id, prev] of snapshots.entries()) {
        this.options.set(id, prev);
      }
      console.error("[OptionRepository] DB reorder error:", err.message);
      throw err;
    }
  }
};
var optionRepository = new OptionRepository();

// backend/controllers/OptionController.ts
init_AuthService();
var optionController = Router9();
optionController.use(requireAuth);
optionController.get("/", (req, res) => {
  if (rejectImpersonationAttempt(req, res)) return;
  const category = req.query.category;
  const activeOnly = req.query.activeOnly === "true";
  const list = optionRepository.getAll(category, activeOnly);
  const response = {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    status: 200,
    success: true,
    message: `Retrieved ${list.length} dropdown options`,
    data: list
  };
  return res.status(200).json(response);
});
optionController.get("/:id", (req, res) => {
  if (rejectImpersonationAttempt(req, res)) return;
  const opt = optionRepository.getById(req.params.id);
  if (!opt) {
    return res.status(404).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 404,
      success: false,
      message: `Option "${req.params.id}" not found`,
      data: null
    });
  }
  const response = {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    status: 200,
    success: true,
    message: "Option retrieved successfully",
    data: opt
  };
  return res.status(200).json(response);
});
optionController.post("/", requireAdmin, async (req, res) => {
  if (rejectImpersonationAttempt(req, res)) return;
  try {
    const body = req.body;
    if (!body.category || !body.label) {
      return res.status(400).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 400,
        success: false,
        message: "Category and Label are required fields",
        data: null
      });
    }
    const created = await optionRepository.create({
      id: body.id || `opt_${body.category}_${Date.now().toString(36)}`,
      category: body.category,
      label: body.label.trim(),
      value: (body.value || body.label).trim(),
      description: body.description || "",
      order: body.order ? Number(body.order) : 0,
      isActive: body.isActive !== false,
      isSystemProtected: Boolean(body.isSystemProtected),
      metadata: body.metadata || {}
    });
    recordAuditLog({
      actor: req.authUser,
      action: "OPTION_CREATE",
      entityType: "system_option",
      entityId: created.id,
      details: { category: created.category, label: created.label },
      ipAddress: req.ip
    });
    const response = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 201,
      success: true,
      message: `Created dropdown option "${created.label}"`,
      data: created
    };
    return res.status(201).json(response);
  } catch (err) {
    return res.status(500).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 500,
      success: false,
      message: `Error creating option: ${err.message}`,
      data: null
    });
  }
});
optionController.put("/:id", requireAdmin, async (req, res) => {
  if (rejectImpersonationAttempt(req, res)) return;
  try {
    const updated = await optionRepository.update(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 404,
        success: false,
        message: `Option "${req.params.id}" not found`,
        data: null
      });
    }
    recordAuditLog({
      actor: req.authUser,
      action: "OPTION_UPDATE",
      entityType: "system_option",
      entityId: updated.id,
      details: { category: updated.category, label: updated.label, isActive: updated.isActive },
      ipAddress: req.ip
    });
    const response = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 200,
      success: true,
      message: `Updated option "${updated.label}"`,
      data: updated
    };
    return res.status(200).json(response);
  } catch (err) {
    return res.status(500).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 500,
      success: false,
      message: `Error updating option: ${err.message}`,
      data: null
    });
  }
});
optionController.delete("/:id", requireAdmin, async (req, res) => {
  if (rejectImpersonationAttempt(req, res)) return;
  try {
    const success = await optionRepository.delete(req.params.id);
    if (!success) {
      return res.status(404).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 404,
        success: false,
        message: `Option "${req.params.id}" not found`,
        data: null
      });
    }
    recordAuditLog({
      actor: req.authUser,
      action: "OPTION_DELETE",
      entityType: "system_option",
      entityId: req.params.id,
      ipAddress: req.ip
    });
    const response = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 200,
      success: true,
      message: `Option "${req.params.id}" removed successfully`,
      data: { id: req.params.id }
    };
    return res.status(200).json(response);
  } catch (err) {
    return res.status(400).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 400,
      success: false,
      message: err.message,
      data: null
    });
  }
});
optionController.post("/reorder", requireAdmin, async (req, res) => {
  if (rejectImpersonationAttempt(req, res)) return;
  try {
    const { category, orderedIds } = req.body;
    if (!category || !Array.isArray(orderedIds)) {
      return res.status(400).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 400,
        success: false,
        message: "category and orderedIds array are required",
        data: null
      });
    }
    await optionRepository.reorder(category, orderedIds);
    recordAuditLog({
      actor: req.authUser,
      action: "OPTION_REORDER",
      entityType: "system_option",
      entityId: category,
      details: { category, count: orderedIds.length },
      ipAddress: req.ip
    });
    const response = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 200,
      success: true,
      message: `Reordered options for category "${category}"`,
      data: { category }
    };
    return res.status(200).json(response);
  } catch (err) {
    return res.status(500).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 500,
      success: false,
      message: `Error reordering options: ${err.message}`,
      data: null
    });
  }
});

// backend/controllers/FileController.ts
import express, { Router as Router10 } from "express";
import crypto2 from "crypto";

// backend/repositories/FileRepository.ts
init_database();
var FileRepository = class {
  /**
   * Persist uploaded file metadata (and optional PostgreSQL bytea fallback bytes).
   * For DAD/Accomplishment files on saved activities, also syncs to apmams.activity_files.
   */
  async insertFileRecord(params) {
    const fileDataExpr = params.storageProvider === "postgres" && params.fallbackBuffer ? `decode('${params.fallbackBuffer.toString("hex")}', 'hex')` : "NULL";
    const insertSql = `
      INSERT INTO apmams.stored_files (
        file_id, storage_bucket, storage_path, storage_provider,
        file_name, mime_type, file_size, scope,
        org_id, activity_id, uploaded_by, file_data
      ) VALUES (
        ${sqlEscape(params.fileId)},
        ${sqlEscape(params.storageBucket)},
        ${sqlText(params.storagePath)},
        ${sqlEscape(params.storageProvider)},
        ${sqlText(params.fileName)},
        ${sqlEscape(params.mimeType)},
        ${Math.max(0, Math.floor(params.fileSize))},
        ${sqlEscape(params.scope)},
        ${params.orgId ? sqlEscape(params.orgId) : "NULL"},
        ${params.activityId ? sqlEscape(params.activityId) : "NULL"},
        ${params.uploadedBy ? sqlEscape(params.uploadedBy) : "NULL"},
        ${fileDataExpr}
      );
    `;
    await executeRawSql(insertSql);
    if ((params.scope === "dad" || params.scope === "accomplishment") && params.activityId) {
      try {
        const actRow = await queryRow(`
          SELECT
            a.activity_id as "activityId",
            (SELECT u.user_id FROM apmams.users u WHERE u.app_user_id = ${sqlEscape(params.uploadedBy || "")} LIMIT 1) as "numericUserId"
          FROM apmams.activities a
          WHERE a.app_activity_id = ${sqlEscape(params.activityId)}
          LIMIT 1;
        `);
        if (actRow?.activityId) {
          await executeRawSql(`
            INSERT INTO apmams.activity_files (
              activity_id, file_name, file_url, file_type, file_size, uploaded_by
            ) VALUES (
              ${actRow.activityId},
              ${sqlText(params.fileName)},
              ${sqlEscape(`/api/files/${params.fileId}`)},
              ${sqlEscape(params.mimeType.slice(0, 50))},
              ${Math.max(0, Math.floor(params.fileSize))},
              ${actRow.numericUserId ?? "NULL"}
            );
          `);
        }
      } catch (err) {
        console.warn("[FileRepository] activity_files sync skipped:", err.message);
      }
    }
    const created = await this.findById(params.fileId);
    if (!created) {
      throw new Error("Failed to verify persisted file record.");
    }
    return created;
  }
  async findById(fileId) {
    return queryRow(`
      SELECT
        file_id as "fileId",
        storage_bucket as "storageBucket",
        storage_path as "storagePath",
        storage_provider as "storageProvider",
        file_name as "fileName",
        mime_type as "mimeType",
        file_size::bigint as "fileSize",
        scope,
        org_id as "orgId",
        activity_id as "activityId",
        uploaded_by as "uploadedBy",
        created_at as "createdAt"
      FROM apmams.stored_files
      WHERE file_id = ${sqlEscape(fileId)}
      LIMIT 1;
    `);
  }
  async readPostgresBytes(fileId) {
    const row = await queryRow(`
      SELECT encode(file_data, 'hex') as "hexData"
      FROM apmams.stored_files
      WHERE file_id = ${sqlEscape(fileId)}
      LIMIT 1;
    `);
    if (!row?.hexData) return null;
    return Buffer.from(row.hexData, "hex");
  }
  async deleteById(fileId) {
    await executeRawSql(`
      DELETE FROM apmams.activity_files WHERE file_url = ${sqlEscape(`/api/files/${fileId}`)};
      DELETE FROM apmams.stored_files WHERE file_id = ${sqlEscape(fileId)};
    `);
  }
};
var fileRepository = new FileRepository();

// backend/services/StorageService.ts
import { createClient } from "@supabase/supabase-js";
var DEFAULT_STORAGE_BUCKET = (process.env.SUPABASE_STORAGE_BUCKET || "apmams-files").trim() || "apmams-files";
var cachedSupabaseClient = null;
var cachedConfigSignature = "";
var loggedFallbackNotice = false;
function getSupabaseCredentials() {
  const url = (process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "").trim();
  return { url, serviceKey };
}
function isSupabaseStorageConfigured() {
  const { url, serviceKey } = getSupabaseCredentials();
  return Boolean(url && serviceKey);
}
function getSupabaseAdminClient() {
  const { url, serviceKey } = getSupabaseCredentials();
  if (!url || !serviceKey) return null;
  const sig = `${url}|${serviceKey.slice(0, 12)}`;
  if (!cachedSupabaseClient || cachedConfigSignature !== sig) {
    cachedSupabaseClient = createClient(url, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    cachedConfigSignature = sig;
  }
  return cachedSupabaseClient;
}
async function uploadFileToStorageBackend(params) {
  const bucket = params.bucket || DEFAULT_STORAGE_BUCKET;
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    if (!loggedFallbackNotice) {
      loggedFallbackNotice = true;
      console.warn(
        "[StorageService] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured; using PostgreSQL fallback storage until configured."
      );
    }
    return {
      provider: "postgres",
      bucket,
      storagePath: params.storagePath
    };
  }
  const { error } = await supabase.storage.from(bucket).upload(params.storagePath, params.buffer, {
    contentType: params.mimeType,
    upsert: false
  });
  if (error) {
    throw new Error(`Supabase Storage upload failed: ${error.message}`);
  }
  return {
    provider: "supabase",
    bucket,
    storagePath: params.storagePath
  };
}
async function downloadFileFromSupabaseStorage(bucket, storagePath) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error(
      "Supabase Storage credentials (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY) are not configured on this server."
    );
  }
  const { data, error } = await supabase.storage.from(bucket).download(storagePath);
  if (error || !data) {
    throw new Error(`Failed to retrieve file from Supabase Storage: ${error?.message || "Object not found"}`);
  }
  const arrayBuf = await data.arrayBuffer();
  return Buffer.from(arrayBuf);
}
async function deleteFileFromSupabaseStorage(bucket, storagePath) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return;
  const { error } = await supabase.storage.from(bucket).remove([storagePath]);
  if (error) {
    console.warn("[StorageService] Supabase Storage remove warning:", error.message);
  }
}

// backend/controllers/FileController.ts
init_AuthService();
var fileController = Router10();
var MAX_SUPABASE_FILE_BYTES = 15 * 1024 * 1024;
var MAX_POSTGRES_FALLBACK_BYTES = 5 * 1024 * 1024;
var ALLOWED_EXTENSIONS = /* @__PURE__ */ new Set([
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "csv",
  "txt"
]);
var MIME_BY_EXT = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
  txt: "text/plain"
};
function normalizeScope(raw) {
  if (typeof raw !== "string") return null;
  const clean = raw.trim().toLowerCase();
  if (clean === "organization" || clean === "dad" || clean === "accomplishment" || clean === "avatar") {
    return clean;
  }
  return null;
}
function sanitizeFileName(rawName) {
  const str = typeof rawName === "string" ? rawName : "document";
  const base = str.replace(/[\\/]/g, "_").replace(/[^\w.\-() ]+/g, "_").trim();
  return (base || "document").slice(0, 180);
}
function sanitizePathSegment(raw, fallback) {
  const clean = (raw || "").replace(/[^A-Za-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "");
  return clean || fallback;
}
function formatReadableSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.max(1, Math.round(kb))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function inferShortFileType(fileName) {
  const ext = fileName.split(".").pop()?.toUpperCase() || "";
  if (ext === "XLSX" || ext === "XLS" || ext === "CSV") return "XLSX";
  if (ext === "DOCX" || ext === "DOC") return "DOCX";
  if (ext === "PNG" || ext === "JPG" || ext === "JPEG" || ext === "WEBP" || ext === "GIF") return ext;
  return ext || "PDF";
}
fileController.get("/status", requireAuth, (req, res) => {
  if (rejectImpersonationAttempt(req, res, { checkBodyUserId: false })) return;
  return res.status(200).json({
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    status: 200,
    success: true,
    data: {
      supabaseStorageConfigured: isSupabaseStorageConfigured(),
      provider: isSupabaseStorageConfigured() ? "supabase" : "postgres",
      bucket: DEFAULT_STORAGE_BUCKET,
      maxFileBytes: isSupabaseStorageConfigured() ? MAX_SUPABASE_FILE_BYTES : MAX_POSTGRES_FALLBACK_BYTES
    }
  });
});
fileController.post(
  "/upload",
  requireAuth,
  express.raw({ type: () => true, limit: "16mb" }),
  async (req, res) => {
    if (rejectImpersonationAttempt(req, res, { checkBodyUserId: false })) return;
    const caller = req.authUser;
    const activeRole = getActiveSessionRole(caller);
    const scope = normalizeScope(req.query.scope);
    if (!scope) {
      return res.status(400).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 400,
        success: false,
        message: "Valid file scope is required (organization, dad, accomplishment, avatar)."
      });
    }
    const queryOrgId = typeof req.query.orgId === "string" ? req.query.orgId.trim() : "";
    const queryActivityId = typeof req.query.activityId === "string" ? req.query.activityId.trim() : "";
    let resolvedOrgId = queryOrgId || caller.orgId || null;
    if (scope === "organization") {
      if (!isAdminRole(activeRole)) {
        return res.status(403).json({
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          status: 403,
          success: false,
          code: "ADMIN_REQUIRED",
          message: "Forbidden: Only System Administrators can upload organization accreditation documents."
        });
      }
      if (!resolvedOrgId) {
        return res.status(400).json({
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          status: 400,
          success: false,
          message: "orgId is required when uploading organization attachments."
        });
      }
    } else if (scope === "dad" || scope === "accomplishment") {
      const activity = queryActivityId ? activityRepository.findById(queryActivityId) : void 0;
      resolvedOrgId = activity?.orgId || queryOrgId || caller.orgId || null;
      if (!canModifyOrgActivity(caller, resolvedOrgId)) {
        return res.status(403).json({
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          status: 403,
          success: false,
          code: "ORG_UPLOAD_FORBIDDEN",
          message: `Forbidden: You do not have permission to upload ${scope} files for organization "${resolvedOrgId || "unknown"}".`
        });
      }
    } else if (scope === "avatar") {
      resolvedOrgId = caller.orgId || null;
    }
    const bodyBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    if (bodyBuffer.length === 0) {
      return res.status(400).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 400,
        success: false,
        message: "Uploaded file payload is empty."
      });
    }
    const maxBytes = isSupabaseStorageConfigured() ? MAX_SUPABASE_FILE_BYTES : MAX_POSTGRES_FALLBACK_BYTES;
    if (bodyBuffer.length > maxBytes) {
      return res.status(413).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 413,
        success: false,
        message: `File exceeds the maximum allowed upload size of ${Math.round(maxBytes / (1024 * 1024))} MB.`
      });
    }
    const rawFileName = req.query.fileName || req.headers["x-file-name"];
    const fileName = sanitizeFileName(rawFileName);
    const ext = fileName.includes(".") ? fileName.split(".").pop().toLowerCase() : "";
    if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
      return res.status(400).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 400,
        success: false,
        message: `Unsupported file type ".${ext || "unknown"}". Allowed: PDF, PNG, JPG, WEBP, GIF, DOC, DOCX, XLS, XLSX, CSV, TXT.`
      });
    }
    if (scope === "avatar" && !["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) {
      return res.status(400).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 400,
        success: false,
        message: "Avatar uploads must be an image file (PNG, JPG, WEBP, or GIF)."
      });
    }
    const headerMime = (req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
    const mimeType = headerMime && headerMime !== "application/octet-stream" ? headerMime : MIME_BY_EXT[ext] || "application/octet-stream";
    const fileId = `file_${Date.now().toString(36)}_${crypto2.randomBytes(5).toString("hex")}`;
    const folderParts = [
      scope,
      sanitizePathSegment(resolvedOrgId, "general"),
      sanitizePathSegment(queryActivityId || caller.id, "item")
    ];
    const storagePath = `${folderParts.join("/")}/${fileId}_${fileName}`;
    try {
      const stored = await uploadFileToStorageBackend({
        buffer: bodyBuffer,
        storagePath,
        mimeType,
        bucket: DEFAULT_STORAGE_BUCKET
      });
      const savedRecord = await fileRepository.insertFileRecord({
        fileId,
        storageBucket: stored.bucket,
        storagePath: stored.storagePath,
        storageProvider: stored.provider,
        fileName,
        mimeType,
        fileSize: bodyBuffer.length,
        scope,
        orgId: resolvedOrgId,
        activityId: queryActivityId || null,
        uploadedBy: caller.id,
        fallbackBuffer: stored.provider === "postgres" ? bodyBuffer : void 0
      });
      recordAuditLog({
        actor: caller,
        action: "FILE_UPLOAD",
        entityType: "stored_file",
        entityId: savedRecord.fileId,
        details: { fileName: savedRecord.fileName, scope, orgId: resolvedOrgId, activityId: queryActivityId || null, provider: savedRecord.storageProvider },
        ipAddress: req.ip
      });
      return res.status(201).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 201,
        success: true,
        message: `Uploaded "${fileName}" successfully.`,
        data: {
          id: savedRecord.fileId,
          fileId: savedRecord.fileId,
          fileName: savedRecord.fileName,
          fileUrl: `/api/files/${savedRecord.fileId}`,
          mimeType: savedRecord.mimeType,
          fileSize: formatReadableSize(bodyBuffer.length),
          sizeBytes: bodyBuffer.length,
          type: inferShortFileType(savedRecord.fileName),
          uploadDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
          storageBucket: savedRecord.storageBucket,
          storagePath: savedRecord.storagePath,
          storageProvider: savedRecord.storageProvider
        }
      });
    } catch (err) {
      console.error("[FileController.upload]", err);
      return res.status(500).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 500,
        success: false,
        message: err?.message || "Failed to upload file."
      });
    }
  }
);
fileController.get("/:id", requireAuth, async (req, res) => {
  if (rejectImpersonationAttempt(req, res, { checkBodyUserId: false })) return;
  const fileId = (req.params.id || "").trim();
  if (!/^[a-zA-Z0-9_-]{6,100}$/.test(fileId)) {
    return res.status(400).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 400,
      success: false,
      message: "Invalid file identifier."
    });
  }
  try {
    const record = await fileRepository.findById(fileId);
    if (!record) {
      return res.status(404).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 404,
        success: false,
        message: "File not found."
      });
    }
    const caller = req.authUser;
    if (record.scope !== "avatar") {
      if (!canViewOrgPrivateData(caller, record.orgId)) {
        return res.status(403).json({
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          status: 403,
          success: false,
          code: "FILE_ACCESS_FORBIDDEN",
          message: "Forbidden: You do not have permission to access files belonging to this organization."
        });
      }
    }
    let fileBytes = null;
    if (record.storageProvider === "supabase") {
      fileBytes = await downloadFileFromSupabaseStorage(record.storageBucket, record.storagePath);
    } else {
      fileBytes = await fileRepository.readPostgresBytes(record.fileId);
    }
    if (!fileBytes) {
      return res.status(404).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 404,
        success: false,
        message: "Stored file payload could not be located."
      });
    }
    const forceDownload = req.query.download === "1" || req.query.download === "true";
    const disposition = forceDownload ? "attachment" : "inline";
    const encodedName = encodeURIComponent(record.fileName);
    res.setHeader("Content-Type", record.mimeType || "application/octet-stream");
    res.setHeader("Content-Length", String(fileBytes.length));
    res.setHeader("Content-Disposition", `${disposition}; filename="${record.fileName.replace(/"/g, "")}"; filename*=UTF-8''${encodedName}`);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, max-age=3600");
    return res.status(200).send(fileBytes);
  } catch (err) {
    console.error("[FileController.get]", err);
    return res.status(500).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 500,
      success: false,
      message: err?.message || "Failed to retrieve file."
    });
  }
});
fileController.delete("/:id", requireAuth, async (req, res) => {
  if (rejectImpersonationAttempt(req, res, { checkBodyUserId: false })) return;
  const fileId = (req.params.id || "").trim();
  if (!/^[a-zA-Z0-9_-]{6,100}$/.test(fileId)) {
    return res.status(400).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 400,
      success: false,
      message: "Invalid file identifier."
    });
  }
  try {
    const record = await fileRepository.findById(fileId);
    if (!record) {
      return res.status(404).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 404,
        success: false,
        message: "File not found."
      });
    }
    const caller = req.authUser;
    const activeRole = getActiveSessionRole(caller);
    const allowed = record.scope === "organization" ? isAdminRole(activeRole) : record.scope === "avatar" ? isAdminRole(activeRole) || record.uploadedBy === caller.id : canModifyOrgActivity(caller, record.orgId);
    if (!allowed) {
      return res.status(403).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 403,
        success: false,
        code: "FILE_DELETE_FORBIDDEN",
        message: "Forbidden: You do not have permission to delete this file."
      });
    }
    if (record.storageProvider === "supabase") {
      await deleteFileFromSupabaseStorage(record.storageBucket, record.storagePath);
    }
    await fileRepository.deleteById(record.fileId);
    recordAuditLog({
      actor: caller,
      action: "FILE_DELETE",
      entityType: "stored_file",
      entityId: record.fileId,
      details: { fileName: record.fileName, scope: record.scope, orgId: record.orgId },
      ipAddress: req.ip
    });
    return res.status(200).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 200,
      success: true,
      message: `Deleted "${record.fileName}".`
    });
  } catch (err) {
    console.error("[FileController.delete]", err);
    return res.status(500).json({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: 500,
      success: false,
      message: err?.message || "Failed to delete file."
    });
  }
});

// backend/index.ts
init_AuthService();

// backend/middleware/securityMiddleware.ts
init_AuthService();
var DEFAULT_LOCAL_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173"
];
function resolveAllowedOrigins() {
  const allowed = /* @__PURE__ */ new Set();
  for (const local of DEFAULT_LOCAL_ORIGINS) {
    allowed.add(local.toLowerCase().trim());
  }
  const envOrigins = [
    process.env.ALLOWED_ORIGINS,
    process.env.CORS_ORIGIN,
    process.env.APP_URL,
    process.env.FRONTEND_URL
  ];
  for (const entry of envOrigins) {
    if (typeof entry === "string" && entry.trim()) {
      const parts = entry.split(",");
      for (const p of parts) {
        const cleaned = p.trim().replace(/\/+$/, "").toLowerCase();
        if (cleaned) allowed.add(cleaned);
      }
    }
  }
  const vercelHosts = [
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
  ];
  for (const host of vercelHosts) {
    if (typeof host === "string" && host.trim()) {
      const cleaned = host.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "").toLowerCase();
      if (cleaned) {
        allowed.add(`https://${cleaned}`);
      }
    }
  }
  return allowed;
}
function isOriginAllowed(origin, reqHost) {
  if (!origin || typeof origin !== "string") return true;
  const normalized = origin.trim().replace(/\/+$/, "").toLowerCase();
  if (/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/.test(normalized)) {
    return true;
  }
  if (/^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(normalized)) {
    return true;
  }
  if (reqHost && typeof reqHost === "string") {
    const cleanHost = reqHost.split(",")[0].trim().toLowerCase();
    if (cleanHost && (normalized === `https://${cleanHost}` || normalized === `http://${cleanHost}`)) {
      return true;
    }
  }
  const allowed = resolveAllowedOrigins();
  return allowed.has(normalized);
}
function applySecurityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "geolocation=(), camera=(), microphone=()");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' ws: wss:; frame-ancestors 'self'"
  );
  const isHttps = process.env.NODE_ENV === "production" || req.secure || req.headers["x-forwarded-proto"] === "https";
  if (isHttps) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  res.removeHeader("X-Powered-By");
  next();
}
function corsMiddleware(req, res, next) {
  const origin = req.headers.origin;
  const reqHost = req.headers["x-forwarded-host"] || req.headers.host || null;
  if (origin) {
    if (isOriginAllowed(origin, reqHost)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-Requested-With, X-CSRF-Token, X-Role, X-User-Id, X-Org-Id"
      );
      res.setHeader("Access-Control-Max-Age", "86400");
      if (req.method === "OPTIONS") {
        return res.sendStatus(204);
      }
    } else {
      return res.status(403).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 403,
        success: false,
        code: "CORS_ORIGIN_DENIED",
        message: `CORS policy violation: Origin "${origin}" is not authorized.`
      });
    }
  } else if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
}
function csrfProtection(req, res, next) {
  const method = req.method.toUpperCase();
  const isMutating = ["POST", "PUT", "DELETE", "PATCH"].includes(method);
  if (!isMutating) {
    return next();
  }
  const path = req.path || req.url || "";
  if (path.endsWith("/auth/login") || path === "/login") {
    return next();
  }
  const reqHost = req.headers["x-forwarded-host"] || req.headers.host || null;
  const origin = req.headers.origin;
  if (origin) {
    if (!isOriginAllowed(origin, reqHost)) {
      return res.status(403).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 403,
        success: false,
        code: "CSRF_ORIGIN_DENIED",
        message: `Cross-site request blocked: Origin "${origin}" is not an approved application origin.`
      });
    }
  }
  const referer = req.headers.referer;
  if (!origin && referer) {
    try {
      const refOrigin = new URL(referer).origin;
      if (!isOriginAllowed(refOrigin, reqHost)) {
        return res.status(403).json({
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          status: 403,
          success: false,
          code: "CSRF_REFERER_DENIED",
          message: `Cross-site request blocked: Referer "${refOrigin}" is not an approved application origin.`
        });
      }
    } catch {
      return res.status(403).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 403,
        success: false,
        code: "CSRF_INVALID_REFERER",
        message: "Cross-site request blocked: Malformed Referer header."
      });
    }
  }
  const token = extractSessionToken(req);
  const providedCsrf = req.headers["x-csrf-token"];
  if (token && typeof providedCsrf === "string" && providedCsrf.trim()) {
    const expectedCsrf = generateCsrfToken(token);
    if (providedCsrf.trim() !== expectedCsrf) {
      return res.status(403).json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: 403,
        success: false,
        code: "CSRF_TOKEN_INVALID",
        message: "Invalid CSRF token provided for authenticated session."
      });
    }
  }
  next();
}
function sanitizeErrorResponse(err, _req, res, next) {
  if (res.headersSent) {
    return next(err);
  }
  const isProduction = process.env.NODE_ENV === "production";
  const status = typeof err?.status === "number" && err.status >= 400 ? err.status : 500;
  console.error("[API Error Sanitizer]", err.message || err);
  const safeMessage = isProduction ? status >= 500 ? "An internal server error occurred. Please contact the administrator." : err.message : err.message || "An error occurred.";
  return res.status(status).json({
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    status,
    success: false,
    code: err.code || (status >= 500 ? "INTERNAL_SERVER_ERROR" : "REQUEST_ERROR"),
    message: safeMessage
  });
}

// backend/index.ts
var apiRouter = Router11();
apiRouter.use(applySecurityHeaders);
apiRouter.use(corsMiddleware);
apiRouter.use(csrfProtection);
apiRouter.use("/activities", activityController);
apiRouter.get("/venues/availability", requireAuth, (req, res) => {
  if (rejectImpersonationAttempt(req, res)) return;
  const { venue, date, timeRange } = req.query;
  const allActs = activityRepository.findAll();
  const result = checkVenueAvailability(
    typeof venue === "string" ? venue : "",
    typeof date === "string" ? date : "",
    allActs,
    typeof timeRange === "string" ? timeRange : void 0
  );
  return res.status(200).json({
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    status: 200,
    success: true,
    data: result
  });
});
apiRouter.use("/action-plans", actionPlanController);
apiRouter.use("/organizations", organizationController);
apiRouter.use("/auth", authController);
apiRouter.use("/users", userController);
apiRouter.use("/notifications", notificationController);
apiRouter.use("/fiscal-years", fiscalYearController);
apiRouter.use("/templates", templateController);
apiRouter.use("/options", optionController);
apiRouter.use("/files", fileController);
apiRouter.use(sanitizeErrorResponse);

// backend/schemaSync.ts
init_database();
init_initialData();
async function initPostgresDatabase() {
  console.log('[PostgreSQL] Initializing and validating schema "apmams" in database "APMaMS"...');
  const ddl = `
    SET search_path = apmams, public;

    -- Roles
    INSERT INTO apmams.roles (role_name) VALUES
      ('ROLE_ADMIN'),
      ('ROLE_OSD'),
      ('ROLE_DEAN'),
      ('ROLE_ADVISER'),
      ('ROLE_OVCSAS'),
      ('ROLE_ORGANIZATION'),
      ('ROLE_PRESIDENT'),
      ('ROLE_TREASURER'),
      ('System Administrator'),
      ('OSD Officer'),
      ('College Dean'),
      ('Faculty Adviser')
    ON CONFLICT (role_name) DO NOTHING;

    -- Update check constraints to support Draft, Deferred, and full lifecycle statuses
    ALTER TABLE apmams.activities DROP CONSTRAINT IF EXISTS activities_status_check;
    ALTER TABLE apmams.activities ADD CONSTRAINT activities_status_check CHECK (
      status::text = ANY (ARRAY[
        'Pending', 'Approved', 'APPROVED', 'Rejected', 'REJECTED', 'Draft', 'DRAFT',
        'SUBMITTED', 'RESUBMITTED', 'FOR_ADVISER_REVIEW', 'FOR_DEAN_REVIEW',
        'FOR_OSD_APPROVAL', 'FOR_OVCSAS_APPROVAL', 'FOR_OC_FINAL_APPROVAL',
        'Deferred', 'DEFERRED', 'DEFERRED FOR REVISION', 'Completed', 'COMPLETED',
        'IN_PROGRESS', 'Ongoing', 'Scheduled',
        'Pending Review', 'Approved at Current Stage',
        'Fully Approved', 'Accomplishment Submitted'
      ]::text[])
    );

    ALTER TABLE apmams.approvals DROP CONSTRAINT IF EXISTS approvals_status_check;
    ALTER TABLE apmams.approvals ADD CONSTRAINT approvals_status_check CHECK (
      status::text = ANY (ARRAY['Pending', 'Approved', 'Rejected', 'Deferred', 'Revision Requested']::text[])
    );

    ALTER TABLE apmams.activity_financials DROP CONSTRAINT IF EXISTS activity_financials_financial_status_check;
    ALTER TABLE apmams.activity_financials ADD CONSTRAINT activity_financials_financial_status_check CHECK (
      financial_status::text = ANY (ARRAY[
        'Pending', 'Approved', 'APPROVED', 'Rejected', 'REJECTED', 'Draft', 'DRAFT',
        'SUBMITTED', 'RESUBMITTED', 'FOR_ADVISER_REVIEW', 'FOR_DEAN_REVIEW',
        'FOR_OSD_APPROVAL', 'FOR_OVCSAS_APPROVAL', 'FOR_OC_FINAL_APPROVAL',
        'Deferred', 'DEFERRED', 'DEFERRED FOR REVISION', 'Completed', 'COMPLETED',
        'IN_PROGRESS', 'Ongoing', 'Scheduled',
        'Pending Review', 'Approved at Current Stage',
        'Fully Approved', 'Accomplishment Submitted', 'Reconciled', 'Liquidated'
      ]::text[])
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_activity_financials_activity_id_uidx
      ON apmams.activity_financials(activity_id) WHERE activity_id IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_calendar_events_activity_id_uidx
      ON apmams.calendar_events(activity_id) WHERE activity_id IS NOT NULL;

    -- Organizations
    ALTER TABLE apmams.organizations ADD COLUMN IF NOT EXISTS acronym varchar(50);
    ALTER TABLE apmams.organizations ADD COLUMN IF NOT EXISTS org_code varchar(50);
    ALTER TABLE apmams.organizations ADD COLUMN IF NOT EXISTS org_type varchar(50) DEFAULT 'COLLEGE';
    ALTER TABLE apmams.organizations ADD COLUMN IF NOT EXISTS president varchar(100);
    ALTER TABLE apmams.organizations ADD COLUMN IF NOT EXISTS email varchar(150);
    ALTER TABLE apmams.organizations ADD COLUMN IF NOT EXISTS registered_number varchar(100);
    ALTER TABLE apmams.organizations ADD COLUMN IF NOT EXISTS sub_orgs jsonb DEFAULT '[]'::jsonb;
    ALTER TABLE apmams.organizations ADD COLUMN IF NOT EXISTS nature varchar(255);
    ALTER TABLE apmams.organizations ADD COLUMN IF NOT EXISTS status varchar(50) DEFAULT 'Active';
    ALTER TABLE apmams.organizations ADD COLUMN IF NOT EXISTS date_of_application varchar(50);
    ALTER TABLE apmams.organizations ADD COLUMN IF NOT EXISTS member_count integer DEFAULT 0;
    ALTER TABLE apmams.organizations ADD COLUMN IF NOT EXISTS attachment_count integer DEFAULT 0;
    ALTER TABLE apmams.organizations ADD COLUMN IF NOT EXISTS color varchar(50);
    ALTER TABLE apmams.organizations ADD COLUMN IF NOT EXISTS faculty_adviser varchar(150);
    ALTER TABLE apmams.organizations ADD COLUMN IF NOT EXISTS office_location varchar(255);
    ALTER TABLE apmams.organizations ADD COLUMN IF NOT EXISTS objectives jsonb DEFAULT '[]'::jsonb;
    ALTER TABLE apmams.organizations ADD COLUMN IF NOT EXISTS members_list jsonb DEFAULT '[]'::jsonb;
    ALTER TABLE apmams.organizations ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;
    ALTER TABLE apmams.organizations DROP CONSTRAINT IF EXISTS uq_organizations_acronym;
    ALTER TABLE apmams.organizations ADD CONSTRAINT uq_organizations_acronym UNIQUE (acronym);

    -- Users
    ALTER TABLE apmams.users ADD COLUMN IF NOT EXISTS app_user_id varchar(50);
    ALTER TABLE apmams.users ADD COLUMN IF NOT EXISTS org_id_code varchar(50);
    ALTER TABLE apmams.users ADD COLUMN IF NOT EXISTS role_code varchar(50);
    ALTER TABLE apmams.users ADD COLUMN IF NOT EXISTS display_role varchar(100);
    ALTER TABLE apmams.users ADD COLUMN IF NOT EXISTS parent_org varchar(100);
    ALTER TABLE apmams.users ADD COLUMN IF NOT EXISTS actual_org varchar(100);
    ALTER TABLE apmams.users ADD COLUMN IF NOT EXISTS avatar text;
    ALTER TABLE apmams.users ALTER COLUMN avatar TYPE text;
    ALTER TABLE apmams.users ADD COLUMN IF NOT EXISTS bio text;
    ALTER TABLE apmams.users ADD COLUMN IF NOT EXISTS username varchar(100);
    ALTER TABLE apmams.users ADD COLUMN IF NOT EXISTS student_id varchar(20);
    ALTER TABLE apmams.users ADD COLUMN IF NOT EXISTS roles jsonb DEFAULT '[]'::jsonb;
    ALTER TABLE apmams.users ADD COLUMN IF NOT EXISTS password_hash text;
    ALTER TABLE apmams.users ALTER COLUMN password_hash DROP NOT NULL;
    ALTER TABLE apmams.users ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;
    ALTER TABLE apmams.users ADD COLUMN IF NOT EXISTS password_updated_at timestamptz;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_app_user_id ON apmams.users(app_user_id) WHERE app_user_id IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_student_id ON apmams.users(student_id) WHERE student_id IS NOT NULL;

    -- Server-Side Authentication Sessions Table
    CREATE TABLE IF NOT EXISTS apmams.user_sessions (
      session_id varchar(128) PRIMARY KEY,
      app_user_id varchar(50) NOT NULL,
      active_role varchar(50) NOT NULL,
      ip_address varchar(100),
      user_agent text,
      created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at timestamptz NOT NULL,
      revoked_at timestamptz,
      last_active_at timestamptz DEFAULT CURRENT_TIMESTAMP
    );
    ALTER TABLE apmams.user_sessions ADD COLUMN IF NOT EXISTS last_active_at timestamptz DEFAULT CURRENT_TIMESTAMP;
    CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON apmams.user_sessions(app_user_id);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON apmams.user_sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_last_active ON apmams.user_sessions(last_active_at);

    -- Action Plan Templates Table
    CREATE TABLE IF NOT EXISTS apmams.action_plan_templates (
      template_id SERIAL PRIMARY KEY,
      id varchar(100) UNIQUE NOT NULL,
      name varchar(255) NOT NULL,
      description text,
      version integer DEFAULT 1,
      is_default boolean DEFAULT false,
      header_title varchar(255) DEFAULT 'PLAN OF ACTIVITIES',
      header_subtitle varchar(255) DEFAULT '[ORGANIZATION NAME]',
      header_color varchar(50) DEFAULT '#800000',
      header_text_color varchar(50) DEFAULT '#FFFFFF',
      sub_header_color varchar(50) DEFAULT '#FCE5CD',
      sub_header_text_color varchar(50) DEFAULT '#1E293B',
      footer_label varchar(255) DEFAULT 'Total Projected Budget (excluding office supplies, allowances and wages)',
      budget_calculation_rule varchar(50) DEFAULT 'SUM_ALL',
      columns jsonb NOT NULL,
      status varchar(50) DEFAULT 'Published',
      allow_text_wrap boolean DEFAULT true,
      show_borders boolean DEFAULT true,
      created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
    );

    -- Fiscal Years Table
    CREATE TABLE IF NOT EXISTS apmams.fiscal_years (
      fiscal_year_id SERIAL PRIMARY KEY,
      id varchar(50) UNIQUE NOT NULL,
      name varchar(100) NOT NULL,
      fiscal_year varchar(20) NOT NULL,
      start_date date NOT NULL,
      end_date date NOT NULL,
      submission_start_date date,
      submission_deadline date,
      status varchar(50) NOT NULL DEFAULT 'Draft',
      template_id varchar(100),
      period_covered varchar(100),
      is_submission_active boolean DEFAULT false,
      published_at timestamptz,
      notes text,
      participating_orgs jsonb DEFAULT '["ALL"]'::jsonb,
      created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
    );

    -- System Dropdown Options Table
    CREATE TABLE IF NOT EXISTS apmams.system_dropdown_options (
      id varchar(100) PRIMARY KEY,
      category varchar(100) NOT NULL,
      label varchar(255) NOT NULL,
      value varchar(255) NOT NULL,
      description text,
      display_order integer DEFAULT 0,
      is_active boolean DEFAULT true,
      is_system_protected boolean DEFAULT false,
      metadata jsonb DEFAULT '{}'::jsonb,
      created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_dropdown_options_cat ON apmams.system_dropdown_options(category, is_active, display_order);

    -- Action Plans
    ALTER TABLE apmams.action_plans ADD COLUMN IF NOT EXISTS folder_id varchar(50);
    ALTER TABLE apmams.action_plans ADD COLUMN IF NOT EXISTS org_id_code varchar(50);
    ALTER TABLE apmams.action_plans ADD COLUMN IF NOT EXISTS fiscal_year varchar(20);
    ALTER TABLE apmams.action_plans ADD COLUMN IF NOT EXISTS status varchar(50) DEFAULT 'Pending';
    ALTER TABLE apmams.action_plans ADD COLUMN IF NOT EXISTS total_activities integer DEFAULT 0;
    ALTER TABLE apmams.action_plans ADD COLUMN IF NOT EXISTS approved_count integer DEFAULT 0;
    ALTER TABLE apmams.action_plans ADD COLUMN IF NOT EXISTS pending_count integer DEFAULT 0;
    ALTER TABLE apmams.action_plans ADD COLUMN IF NOT EXISTS theme varchar(255);
    ALTER TABLE apmams.action_plans ADD COLUMN IF NOT EXISTS submission_deadline varchar(50);
    ALTER TABLE apmams.action_plans ADD COLUMN IF NOT EXISTS total_budget numeric DEFAULT 0;
    ALTER TABLE apmams.action_plans ADD COLUMN IF NOT EXISTS folder_number varchar(50);
    ALTER TABLE apmams.action_plans ADD COLUMN IF NOT EXISTS signatories jsonb DEFAULT '[]'::jsonb;
    ALTER TABLE apmams.action_plans ADD COLUMN IF NOT EXISTS is_primary boolean DEFAULT true;
    ALTER TABLE apmams.action_plans ADD COLUMN IF NOT EXISTS version integer DEFAULT 1;
    ALTER TABLE apmams.action_plans ADD COLUMN IF NOT EXISTS template_id varchar(100);
    ALTER TABLE apmams.action_plans ADD COLUMN IF NOT EXISTS submitted_at timestamptz;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_action_plans_folder_id ON apmams.action_plans(folder_id) WHERE folder_id IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_action_plans_org_fy_primary ON apmams.action_plans(org_id_code, fiscal_year) WHERE is_primary = true AND org_id_code IS NOT NULL;

    -- Activities
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS app_activity_id varchar(50);
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS org_id_code varchar(50);
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS fiscal_year varchar(20);
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS target_outputs text;
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS key_performance_indicators text;
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS budget numeric DEFAULT 0;
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS allocated_budget numeric DEFAULT 0;
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS expenses numeric DEFAULT 0;
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS source varchar(50) DEFAULT 'ACTION_PLAN';
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS workflow_status varchar(50) DEFAULT 'DRAFT';
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS approval_stage varchar(150);
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS timeline jsonb DEFAULT '[]'::jsonb;
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS design_form jsonb;
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS accomplishment_form jsonb;
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS financial_plan jsonb;
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS timeframe_month varchar(50);
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS timeframe_week varchar(50);
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS line_item_budget text;
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS budget_line_items jsonb DEFAULT '[]'::jsonb;
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS approval_status varchar(50) DEFAULT 'Draft';
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS approval_stage_index integer DEFAULT 1;
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS current_approver_role varchar(100);
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS approval_decisions jsonb DEFAULT '[]'::jsonb;
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS rejection_remarks text;
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS rejected_by varchar(100);
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS rejected_at timestamptz;
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS deferred_remarks text;
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS is_plan_confirmed boolean DEFAULT false;
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS confirmed_by varchar(100);
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS action_plan_status varchar(50);
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS action_plan_decision varchar(50);
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS version integer DEFAULT 1;
    ALTER TABLE apmams.activities ALTER COLUMN approval_stage TYPE varchar(150);
    ALTER TABLE apmams.activities ALTER COLUMN fiscal_year TYPE varchar(50);
    ALTER TABLE apmams.activities ALTER COLUMN category TYPE varchar(150);
    ALTER TABLE apmams.activities ALTER COLUMN title TYPE varchar(255);
    ALTER TABLE apmams.activities ALTER COLUMN venue TYPE varchar(255);
    DROP INDEX IF EXISTS apmams.idx_activities_app_id;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_activities_app_id ON apmams.activities(app_activity_id);

    -- Uploaded Files & Supabase Storage Metadata Table
    CREATE TABLE IF NOT EXISTS apmams.stored_files (
      file_id varchar(100) PRIMARY KEY,
      storage_bucket varchar(100) NOT NULL DEFAULT 'apmams-files',
      storage_path text NOT NULL,
      storage_provider varchar(30) NOT NULL DEFAULT 'supabase',
      file_name varchar(255) NOT NULL,
      mime_type varchar(150) NOT NULL,
      file_size bigint NOT NULL DEFAULT 0,
      scope varchar(50) NOT NULL,
      org_id varchar(100),
      activity_id varchar(100),
      uploaded_by varchar(100),
      file_data bytea,
      created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_stored_files_org ON apmams.stored_files(org_id);
    CREATE INDEX IF NOT EXISTS idx_stored_files_activity ON apmams.stored_files(activity_id);
  `;
  await executeRawSql(ddl);
  try {
    await executeRawSql(`
      DELETE FROM apmams.activities WHERE org_id_code = 'TME' OR app_activity_id LIKE '%TME%';
      DELETE FROM apmams.users WHERE email LIKE '%tme.%' OR username LIKE '%tme%';
      DELETE FROM apmams.organizations WHERE acronym = 'TME' OR organization_name ILIKE '%Marine Echo%';
      DELETE FROM apmams.system_dropdown_options WHERE id = 'opt_off_3' OR UPPER(value) = 'OSA' OR UPPER(label) = 'OSA';
      DELETE FROM apmams.organizations WHERE acronym = 'OSA' OR organization_name ILIKE '%Office of Student Affairs%';

      -- Ensure deleted FY 2026 action plan folder and fiscal year are purged
      DELETE FROM apmams.fiscal_years WHERE id = 'FY-2026' OR fiscal_year = 'FY 2026' OR name = 'FY 2026';
      DELETE FROM apmams.action_plans WHERE folder_id = 'AP-FY2026' OR fiscal_year = 'FY 2026';
      UPDATE apmams.activities SET fiscal_year = 'FY 2027' WHERE fiscal_year = 'FY 2026' OR fiscal_year = '2026';

      -- Ensure sequential display ordering for offices
      UPDATE apmams.system_dropdown_options SET display_order = 3 WHERE id = 'opt_off_4';
      UPDATE apmams.system_dropdown_options SET display_order = 4 WHERE id = 'opt_off_5';
      UPDATE apmams.system_dropdown_options SET display_order = 5 WHERE id = 'opt_off_6';
      UPDATE apmams.system_dropdown_options SET display_order = 6 WHERE id = 'opt_off_7';
      UPDATE apmams.system_dropdown_options SET display_order = 7 WHERE id = 'opt_off_8';
      UPDATE apmams.system_dropdown_options SET display_order = 8 WHERE id = 'opt_off_9';
      UPDATE apmams.system_dropdown_options SET display_order = 9 WHERE id = 'opt_off_10';
    `);
  } catch (err) {
  }
  console.log("[PostgreSQL] Synchronizing organizations into apmams.organizations...");
  for (const org of ORGANIZATIONS) {
    const subOrgs = org.subOrgs || [];
    const membersList = Array.isArray(org.membersList) ? org.membersList : [];
    const attachments = Array.isArray(org.attachments) ? org.attachments : [];
    const memberCount = membersList.length;
    const attachmentCount = attachments.length;
    const sql = `
      INSERT INTO apmams.organizations (
        organization_name, acronym, org_code, description, president, email, registered_number, sub_orgs,
        nature, status, date_of_application, member_count, attachment_count, color, faculty_adviser, office_location,
        objectives, members_list, attachments
      ) VALUES (
        ${sqlEscape(org.name)},
        ${sqlEscape(org.id)},
        ${sqlEscape(org.id)},
        ${sqlEscape(org.description || org.nature || "")},
        ${sqlEscape(org.president || "")},
        ${sqlEscape(`${org.id.toLowerCase()}@msun.edu.ph`)},
        ${sqlEscape(org.registeredNumber || "")},
        ${sqlEscape(subOrgs)},
        ${sqlEscape(org.nature || "Academic & Student Governance")},
        ${sqlEscape(org.status || "Active")},
        ${sqlEscape(org.dateOfApplication || "2026-01-10")},
        ${memberCount},
        ${attachmentCount},
        ${sqlEscape(org.color || "blue")},
        ${sqlEscape(org.facultyAdviser || "")},
        ${sqlEscape(org.officeLocation || "")},
        ${sqlEscape(org.objectives || [])},
        ${sqlEscape(membersList)},
        ${sqlEscape(attachments)}
      ) ON CONFLICT (acronym) DO NOTHING;
    `;
    await executeRawSql(sql);
  }
  await executeRawSql(`
    UPDATE apmams.organizations
    SET
      member_count = CASE
        WHEN jsonb_typeof(members_list) = 'array' THEN jsonb_array_length(members_list)
        ELSE 0
      END,
      attachment_count = CASE
        WHEN jsonb_typeof(attachments) = 'array' THEN jsonb_array_length(attachments)
        ELSE 0
      END;
  `);
  const ACCOUNT_BCRYPT_HASHES = {
    "alchristian.molina@msunaawan.edu.ph": "$2b$12$GzRandiBgBrIoUnCOAsu/.5FrMed1WG9BFaV7vdmh4taGd./0aOhG",
    // ssc123
    "cristykc.patajo@msunaawan.edu.ph": "$2b$12$KnXA3gxTKbG.g7O0NAf03esXxdpc2bqJC60CnfI.DyaGR0fcmfvcO",
    // sscadviser123
    "kianchristian.estenzo@msunaawan.edu.ph": "$2b$12$8KG7DcfhYYBVpP/8Oljlsel0GXQf2eiWmYEaaHFv8xxNp4lbT2QKq",
    // cbit123
    "lourenmar.chio@msunaawan.edu.ph": "$2b$12$OgORfUkKiTvTJ9yJJkk.MOv6lLcQO8Q0Fiu.xNHCXgfzvSk6HIGry",
    // cbitadviser123
    "enelrad.cuteron@msunaawan.edu.ph": "$2b$12$NfpUjYAMCZ0u1jxpEP8NDOUOBhH31mURrAAs7dfk/64VXX.Idt0CW",
    // cbitdean123
    "valesayniel.junio@msunaawan.edu.ph": "$2b$12$llpm/N3FCU2hr8SjAMUywuBXLT9qETTQsGSoBs4/xIHClzT/yW/AS",
    // osd123
    "jozelmicah.mapula@msunaawan.edu.ph": "$2b$12$u11GPWgFPVBa5N3I93Cpie3QIN08HFB8ifIjseIP/bJIMkdUMIF1S",
    // ovcsas123
    "hazelanne.mapula@msunaawan.edu.ph": "$2b$12$kClB0fh2ilviT9Du/twW..l4RAQx97aM.1zA/2/ePvl0JFyVe97aW"
    // admin123
  };
  for (const user of INITIAL_USER_ACCOUNTS) {
    const orgRow = await queryRow(
      `SELECT organization_id FROM apmams.organizations WHERE acronym = ${sqlEscape(user.orgId)} LIMIT 1`
    );
    const roleRow = await queryRow(
      `SELECT role_id FROM apmams.roles WHERE role_name = ${sqlEscape(user.role)} OR role_name = 'ROLE_ORGANIZATION' LIMIT 1`
    );
    const orgIdVal = orgRow ? orgRow.organization_id : "NULL";
    const roleIdVal = roleRow ? roleRow.role_id : 1;
    const seedUsername = user.username || (user.email ? user.email.split("@")[0] : "");
    const seedRoles = Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : [user.role];
    const passwordHash = ACCOUNT_BCRYPT_HASHES[user.email.toLowerCase()] || "$2b$12$ivgYrQxPl6Jz/aop1NXjledjaEHV7m1u58Xx1AGC9kQllpkDh.anO";
    const sql = `
      INSERT INTO apmams.users (
        organization_id, role_id, first_name, last_name, email, is_active,
        app_user_id, org_id_code, role_code, display_role, parent_org, actual_org, avatar,
        username, student_id, roles, password_hash, must_change_password
      ) VALUES (
        ${orgIdVal},
        ${roleIdVal},
        ${sqlEscape(user.firstName || user.name.split(" ")[0])},
        ${sqlEscape(user.lastName || user.name.split(" ").slice(1).join(" ") || "")},
        ${sqlEscape(user.email)},
        ${user.isActive !== false ? "TRUE" : "FALSE"},
        ${sqlEscape(user.id)},
        ${sqlEscape(user.orgId)},
        ${sqlEscape(user.role)},
        ${sqlEscape(user.displayRole || user.role)},
        ${sqlEscape(user.parentOrg || "")},
        ${sqlEscape(user.actualOrg || "")},
        ${sqlEscape(user.avatar || "")},
        ${sqlEscape(seedUsername)},
        ${sqlEscape(user.studentId || "")},
        ${sqlEscape(seedRoles)},
        ${sqlEscape(passwordHash)},
        FALSE
      ) ON CONFLICT (email) DO NOTHING;
    `;
    await executeRawSql(sql);
  }
  const planCountRow = await queryRow("SELECT count(*) as count FROM apmams.action_plans");
  const planCount = parseInt(planCountRow?.count || "0", 10);
  if (planCount === 0) {
    console.log("[PostgreSQL] Seeding action plan folders into apmams.action_plans...");
    const defaultUserRow = await queryRow("SELECT user_id FROM apmams.users LIMIT 1");
    const defaultUserId = defaultUserRow ? defaultUserRow.user_id : 1;
    for (const folder of INITIAL_ACTION_PLAN_FOLDERS) {
      const sql = `
        INSERT INTO apmams.action_plans (
          organization_id, title, goal, description, academic_year, created_by,
          folder_id, fiscal_year, status, total_activities, total_budget,
          approved_count, pending_count, theme, submission_deadline
        ) VALUES (
          COALESCE((SELECT organization_id FROM apmams.organizations LIMIT 1), 1),
          ${sqlEscape(folder.title)},
          ${sqlEscape(folder.theme || folder.title)},
          ${sqlEscape(folder.description || "")},
          ${sqlEscape(folder.fiscalYear)},
          ${defaultUserId},
          ${sqlEscape(folder.id)},
          ${sqlEscape(folder.fiscalYear)},
          ${sqlEscape(folder.status)},
          ${folder.totalActivitiesCount || 0},
          ${folder.allocatedBudget || 0},
          ${folder.approvedCount || 0},
          ${folder.pendingCount || 0},
          ${sqlEscape(folder.theme || "")},
          ${sqlEscape(folder.submissionDeadline || "")}
        ) ON CONFLICT (folder_id) WHERE folder_id IS NOT NULL DO UPDATE SET
          title = EXCLUDED.title,
          status = EXCLUDED.status,
          total_activities = EXCLUDED.total_activities,
          total_budget = EXCLUDED.total_budget,
          approved_count = EXCLUDED.approved_count,
          pending_count = EXCLUDED.pending_count,
          theme = EXCLUDED.theme,
          submission_deadline = EXCLUDED.submission_deadline;
      `;
      await executeRawSql(sql);
    }
  }
  const actCountRow = await queryRow("SELECT count(*) as count FROM apmams.activities");
  const actCount = parseInt(actCountRow?.count || "0", 10);
  if (actCount === 0) {
    console.log("[PostgreSQL] Seeding activities into apmams.activities and activity_financials...");
    const defaultUserRow = await queryRow("SELECT user_id FROM apmams.users LIMIT 1");
    const defaultUserId = defaultUserRow ? defaultUserRow.user_id : 1;
    for (const act of INITIAL_ACTIVITIES) {
      const actAny = act;
      const orgRow = await queryRow(
        `SELECT organization_id FROM apmams.organizations WHERE acronym = ${sqlEscape(act.orgId)} LIMIT 1`
      );
      const yearDigits = act.fiscalYear.replace(/\D/g, "") || "2027";
      const planRow = await queryRow(
        `SELECT action_plan_id FROM apmams.action_plans WHERE fiscal_year ILIKE ${sqlEscape("%" + yearDigits + "%")} OR folder_id ILIKE ${sqlEscape("%" + yearDigits + "%")} LIMIT 1`
      );
      const fallbackPlan = await queryRow("SELECT action_plan_id FROM apmams.action_plans ORDER BY action_plan_id DESC LIMIT 1");
      const orgIdVal = orgRow ? orgRow.organization_id : 1;
      const planIdVal = planRow ? planRow.action_plan_id : fallbackPlan ? fallbackPlan.action_plan_id : 1;
      const startDate = act.startDate || actAny.scheduleStart || actAny.date || "2026-06-01";
      const endDate = act.endDate || actAny.scheduleEnd || actAny.date || startDate;
      const category = act.strategicPillar || actAny.category || "Institutional Development";
      const targetOutputs = act.expectedOutput || actAny.targetOutputs || "";
      const kpis = act.kpiOutcome || actAny.keyPerformanceIndicators || "";
      const budget = act.budget || act.amount || 0;
      const allocatedBudget = act.totalBudget || actAny.allocatedBudget || budget;
      const expenses = actAny.expenses || 0;
      const sql = `
        INSERT INTO apmams.activities (
          action_plan_id, organization_id, title, category, venue, schedule_start, schedule_end,
          target_participants, status, progress, created_by,
          app_activity_id, org_id_code, fiscal_year, target_outputs, key_performance_indicators,
          budget, allocated_budget, expenses, source, workflow_status, approval_stage, timeline,
          design_form, accomplishment_form, financial_plan
        ) VALUES (
          ${planIdVal},
          ${orgIdVal},
          ${sqlEscape(act.title)},
          ${sqlEscape(category)},
          ${sqlEscape(act.venue || "MSU Naawan Campus")},
          ${sqlEscape(startDate)},
          ${sqlEscape(endDate)},
          ${act.targetParticipants || 50},
          ${sqlEscape(act.status || "Pending")},
          ${act.status === "Approved" ? 100 : 25},
          ${defaultUserId},
          ${sqlEscape(act.id)},
          ${sqlEscape(act.orgId)},
          ${sqlEscape(act.fiscalYear || "2026")},
          ${sqlEscape(targetOutputs)},
          ${sqlEscape(kpis)},
          ${budget},
          ${allocatedBudget},
          ${expenses},
          ${sqlEscape(act.source || "ACTION_PLAN")},
          ${sqlEscape(act.workflowStatus || "DRAFT")},
          ${sqlEscape(act.approvalStage || "Stage 1: Organization Submission")},
          ${sqlEscape(act.timeline || [])},
          ${sqlEscape(act.designForm || null)},
          ${sqlEscape(act.accomplishmentForm || null)},
          ${sqlEscape(actAny.financialPlan || null)}
        ) ON CONFLICT DO NOTHING;
      `;
      await executeRawSql(sql);
      const insertedAct = await queryRow(
        `SELECT activity_id FROM apmams.activities WHERE app_activity_id = ${sqlEscape(act.id)} LIMIT 1`
      );
      if (insertedAct) {
        await executeRawSql(`
          INSERT INTO apmams.activity_financials (
            activity_id, estimated_budget, actual_expense, funding_source, financial_status
          ) VALUES (
            ${insertedAct.activity_id},
            ${budget},
            ${expenses},
            'Student Activity Fund',
            ${sqlEscape(act.status || "Pending")}
          ) ON CONFLICT DO NOTHING;
        `);
      }
    }
  }
  console.log("[PostgreSQL] Synchronizing action plan templates into apmams.action_plan_templates...");
  for (const tpl of INITIAL_ACTION_PLAN_TEMPLATES) {
    const sql = `
      INSERT INTO apmams.action_plan_templates (
        id, name, description, version, is_default, header_title, header_subtitle,
        header_color, header_text_color, sub_header_color, sub_header_text_color,
        footer_label, budget_calculation_rule, columns, status, allow_text_wrap, show_borders
      ) VALUES (
        ${sqlEscape(tpl.id)},
        ${sqlEscape(tpl.name)},
        ${sqlEscape(tpl.description || "")},
        ${tpl.version || 1},
        ${tpl.isDefault ? "TRUE" : "FALSE"},
        ${sqlEscape(tpl.headerTitle || "PLAN OF ACTIVITIES")},
        ${sqlEscape(tpl.headerSubTitle || "[ORGANIZATION NAME]")},
        ${sqlEscape(tpl.headerColor || "#800000")},
        ${sqlEscape(tpl.headerTextColor || "#FFFFFF")},
        ${sqlEscape(tpl.subHeaderColor || "#FCE5CD")},
        ${sqlEscape(tpl.subHeaderTextColor || "#1E293B")},
        ${sqlEscape(tpl.footerLabel || "")},
        ${sqlEscape(tpl.budgetCalculationRule || "SUM_ALL")},
        ${sqlEscape(tpl.columns)},
        ${sqlEscape(tpl.status || "Published")},
        ${tpl.allowTextWrap !== false ? "TRUE" : "FALSE"},
        ${tpl.showBorders !== false ? "TRUE" : "FALSE"}
      ) ON CONFLICT (id) DO NOTHING;
    `;
    await executeRawSql(sql);
  }
  console.log("[PostgreSQL] Synchronizing fiscal years into apmams.fiscal_years...");
  for (const fy of INITIAL_FISCAL_YEARS) {
    const sql = `
      INSERT INTO apmams.fiscal_years (
        id, name, fiscal_year, start_date, end_date, submission_start_date, submission_deadline,
        status, template_id, period_covered, is_submission_active, published_at, notes, participating_orgs
      ) VALUES (
        ${sqlEscape(fy.id)},
        ${sqlEscape(fy.name)},
        ${sqlEscape(fy.fiscalYear)},
        ${sqlEscape(fy.startDate)},
        ${sqlEscape(fy.endDate)},
        ${sqlEscape(fy.submissionStartDate || fy.submissionOpenDate || fy.startDate)},
        ${sqlEscape(fy.submissionDeadline || fy.submissionCloseDate || fy.endDate)},
        ${sqlEscape(fy.status)},
        ${sqlEscape(fy.templateId || "TEMPLATE-MSUN-DEFAULT")},
        ${sqlEscape(fy.periodCovered || `January\u2013December ${fy.name.replace(/\D/g, "")}`)},
        ${fy.isSubmissionActive ? "TRUE" : "FALSE"},
        ${sqlEscape(fy.publishedAt || (/* @__PURE__ */ new Date()).toISOString())},
        ${sqlEscape(fy.notes || "")},
        ${sqlEscape(fy.participatingOrgs || ["ALL"])}
      ) ON CONFLICT (id) DO NOTHING;
    `;
    await executeRawSql(sql);
  }
  for (const opt of INITIAL_DROPDOWN_OPTIONS) {
    const sql = `
      INSERT INTO apmams.system_dropdown_options (
        id, category, label, value, description, display_order, is_active, is_system_protected, metadata
      ) VALUES (
        ${sqlEscape(opt.id)},
        ${sqlEscape(opt.category)},
        ${sqlEscape(opt.label)},
        ${sqlEscape(opt.value)},
        ${sqlEscape(opt.description || "")},
        ${opt.order || 0},
        ${opt.isActive !== false ? "TRUE" : "FALSE"},
        ${opt.isSystemProtected ? "TRUE" : "FALSE"},
        ${sqlEscape(opt.metadata || {})}
      ) ON CONFLICT (id) DO NOTHING;
    `;
    await executeRawSql(sql);
  }
  console.log('[PostgreSQL] Database "APMaMS" schema "apmams" synchronized successfully!');
}

// backend/app.ts
init_database();
init_UserRepository();
init_AuthService();
var hasLoadedOnce = false;
var hasInitializedSchema = false;
var lastLoadedAtMs = 0;
var inflightLoad = null;
var SERVERLESS_REFRESH_TTL_MS = 3e3;
async function loadAllRepositoriesFromDatabase() {
  await Promise.all([
    organizationRepository.loadFromDatabase(),
    userRepository.loadFromDatabase(),
    actionPlanRepository.loadFromDatabase(),
    activityRepository.loadFromDatabase(),
    fiscalYearRepository.loadFromDatabase(),
    templateRepository.loadFromDatabase(),
    optionRepository.loadFromDatabase()
  ]);
  hasLoadedOnce = true;
  lastLoadedAtMs = Date.now();
}
async function ensureBackendReady(options) {
  assertValidDatabaseConfig();
  if (options?.runSchemaSync && !hasInitializedSchema) {
    await initPostgresDatabase();
    hasInitializedSchema = true;
  }
  const isServerless = Boolean(process.env.VERCEL);
  const now = Date.now();
  const needsRefresh = !hasLoadedOnce || isServerless && now - lastLoadedAtMs > SERVERLESS_REFRESH_TTL_MS;
  if (!needsRefresh) return;
  if (!inflightLoad) {
    inflightLoad = loadAllRepositoriesFromDatabase().catch((err) => {
      console.error("[PostgreSQL] Repository hydration error:", err?.message || err);
      throw err;
    }).finally(() => {
      inflightLoad = null;
    });
  }
  await inflightLoad;
}
function createApiApp(options) {
  const app2 = express2();
  app2.disable("x-powered-by");
  app2.set("trust proxy", 1);
  app2.use((req, res, next) => {
    if (req.originalUrl.startsWith("/api")) {
      const start = Date.now();
      res.on("finish", () => {
        console.log(`[API ${req.method}] ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start}ms)`);
      });
    }
    next();
  });
  app2.use(applySecurityHeaders);
  app2.use(corsMiddleware);
  app2.use(express2.json({ limit: "10mb" }));
  app2.use(express2.urlencoded({ extended: true, limit: "10mb" }));
  app2.get("/api/health", (_req, res) => {
    res.status(200).json({
      status: "UP",
      runtime: process.env.VERCEL ? "vercel-serverless" : "node-express",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  if (options?.enableServerlessHydration) {
    app2.use("/api", async (_req, res, next) => {
      try {
        await ensureBackendReady({ runSchemaSync: false });
        next();
      } catch (err) {
        return res.status(503).json({
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          status: 503,
          success: false,
          code: "DATABASE_UNAVAILABLE",
          message: err?.message || "Unable to connect to PostgreSQL database."
        });
      }
    });
  }
  app2.get("/api/database/status", requireAdmin, async (req, res) => {
    if (rejectImpersonationAttempt(req, res)) return;
    try {
      const statsJson = await executeRawSql(`
        SELECT json_build_object(
          'database', current_database(),
          'schema', current_schema(),
          'connectedUser', current_user,
          'organizations', (SELECT count(*) FROM apmams.organizations),
          'users', (SELECT count(*) FROM apmams.users),
          'activities', (SELECT count(*) FROM apmams.activities),
          'actionPlans', (SELECT count(*) FROM apmams.action_plans),
          'financials', (SELECT count(*) FROM apmams.activity_financials)
        );
      `);
      res.status(200).json({
        status: "CONNECTED",
        database: dbConfig.database,
        schema: dbConfig.schema,
        host: dbConfig.host,
        port: dbConfig.port,
        stats: JSON.parse(statsJson || "{}"),
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (err) {
      res.status(500).json({
        status: "DISCONNECTED",
        database: dbConfig.database,
        error: err.message
      });
    }
  });
  app2.use("/api", apiRouter);
  app2.use(sanitizeErrorResponse);
  return app2;
}

// backend/vercelHandler.ts
var config = {
  api: {
    bodyParser: false
  }
};
var app = createApiApp({ enableServerlessHydration: true });
function handler(req, res) {
  if (req.url) {
    try {
      const parsed = new URL(req.url, "http://localhost");
      const rewrittenSubPath = parsed.searchParams.get("__path");
      if (rewrittenSubPath !== null) {
        parsed.searchParams.delete("__path");
        const cleanSub = rewrittenSubPath.replace(/^\/+/, "");
        const qs = parsed.searchParams.toString();
        req.url = cleanSub ? `/api/${cleanSub}${qs ? `?${qs}` : ""}` : `/api${qs ? `?${qs}` : ""}`;
      } else if (!parsed.pathname.startsWith("/api")) {
        const cleanPath = parsed.pathname.startsWith("/") ? parsed.pathname : `/${parsed.pathname}`;
        const qs = parsed.searchParams.toString();
        req.url = `/api${cleanPath}${qs ? `?${qs}` : ""}`;
      }
    } catch {
      if (!req.url.startsWith("/api")) {
        req.url = req.url.startsWith("/") ? `/api${req.url}` : `/api/${req.url}`;
      }
    }
  }
  return app(req, res);
}
export {
  config,
  handler as default
};
