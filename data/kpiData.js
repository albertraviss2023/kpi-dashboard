// kpiData.js — Complete, seedable generator for GMP, CT, MA
// Usage:
//   console.log(JSON.stringify(generateFullData({ seed: 42 }), null, 2));
//   or without seed for fresh random each run: generateFullData()

// -------------------------------
// Global time axis
// -------------------------------
const quarters = [
  'Q1 2023', 'Q2 2023', 'Q3 2023', 'Q4 2023',
  'Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024',
  'Q1 2025', 'Q2 2025'
];

// -------------------------------
// Small utilities
// -------------------------------
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const round0 = (v) => Math.round(v);
const pct = (num, den, safe = 0) => (den > 0 ? (num / den) * 100 : safe);
const sanitize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_");

// Seedable PRNG (mulberry32)
function mulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function rngFactory(seed) {
  if (typeof seed === "number") return mulberry32(seed);
  return Math.random; // non-deterministic
}

// -------------------------------
// Helper generators (seed-aware)
// -------------------------------
function generateLinear(start, end, irregularities = {}, variability = 0, rnd = Math.random) {
  const step = (end - start) / (quarters.length - 1);
  return quarters.map((q, i) => ({
    quarter: q,
    value: clamp((irregularities[q] ?? (start + i * step)) + (rnd() * 2 - 1) * variability, -1e9, 1e9)
  }));
}

function generateDecreasing(start, target, irregularities = {}, variability = 0, rnd = Math.random) {
  const step = (target - start) / (quarters.length - 1);
  return quarters.map((q, i) => ({
    quarter: q,
    avgDays: clamp((irregularities[q] ?? (start + i * step)) + (rnd() * 2 - 1) * variability, 0, 3650),
    targetDays: target
  }));
}

function generateNumDen(numStart, numEnd, denStart, denEnd, irregularities = {}, varNum = 0, varDen = 0, rnd = Math.random) {
  const numStep = (numEnd - numStart) / (quarters.length - 1);
  const denStep = (denEnd - denStart) / (quarters.length - 1);
  return quarters.map((q, i) => {
    let num = numStart + i * numStep + (rnd() * 2 - 1) * varNum;
    let den = denStart + i * denStep + (rnd() * 2 - 1) * varDen;
    if (irregularities[q]) {
      num = irregularities[q].numerator ?? num;
      den = irregularities[q].denominator ?? den;
    }
    num = Math.max(0, num);
    den = Math.max(0, den);
    // ensure numerator <= denominator for rate metrics
    if (den > 0 && num > den) num = den * clamp(0.7 + rnd() * 0.3, 0, 1);
    return { quarter: q, numerator: round0(num), denominator: round0(den) };
  });
}

function generateSample(start, end, irregularities = {}, variability = 0, rnd = Math.random) {
  const step = (end - start) / (quarters.length - 1);
  return quarters.map((q, i) => ({
    quarter: q,
    sample_n: round0(Math.max(0, (irregularities[q] ?? (start + i * step)) + (rnd() * 2 - 1) * variability))
  }));
}

function generateStepCounts(startedStart, startedStep, completedRatio = 0.95, openStart = 0, openStep = 0, irregularities = {}, variability = 0, rnd = Math.random) {
  return quarters.map((q, i) => {
    let started = startedStart + i * startedStep + (rnd() * 2 - 1) * variability;
    let completed = started * completedRatio + (rnd() * 2 - 1) * (variability * 0.5);
    let open = openStart + i * openStep + (rnd() * 2 - 1) * (variability * 0.2);
    if (irregularities[q]) {
      started = irregularities[q].started_q ?? started;
      completed = irregularities[q].completed_q ?? completed;
      open = irregularities[q].open_end_q ?? open;
    }
    started = Math.max(0, started);
    completed = clamp(completed, 0, started); // can't complete > started within the quarter
    open = Math.max(0, open);
    return {
      quarter: q,
      started_q: round0(started),
      completed_q: round0(completed),
      open_end_q: round0(open)
    };
  });
}

function generateBottleneck(configs, rnd = Math.random) {
  return quarters.map((q, i) => {
    const obj = { quarter: q };
    for (const key in configs) {
      const { start, end, irregularities = {}, variability = 0, type = "num" } = configs[key];
      const delta = (end - start) / (quarters.length - 1);
      let value = irregularities[q] ?? (start + i * delta);
      value += (rnd() * 2 - 1) * variability;

      if (type === "pct") value = clamp(value, 0, 100);
      if (type === "days") value = Math.max(0, value);
      if (type === "count") value = round0(Math.max(0, value));
      if (type === "ratio" || type === "util") value = Math.max(0, value);

      obj[key] = value;
    }
    return obj;
  });
}

// -------------------------------
// Metadata (names, order, SLAs)
// -------------------------------
const processMetadata = {
  MA: {
    displayName: "Marketing Authorization",
    stepOrder: [
      "Application Received",
      "Preliminary Screening",
      "Technical Dossier Review",
      "Quality Review",
      "Safety & Efficacy Review",
      "Queries to Applicant",
      "Applicant Response Review",
      "Decision Issued",
      "License Publication"
    ],
    stepSLA: {
      "Preliminary Screening": 5,
      "Technical Dossier Review": 60,
      "Quality Review": 30,
      "Safety & Efficacy Review": 40,
      "Queries to Applicant": 10, // external SLA to respond
      "Applicant Response Review": 20,
      "Decision Issued": 7,
      "License Publication": 5
    }
  },
  CT: {
    displayName: "Clinical Trials",
    stepOrder: [
      "Application Received",
      "Administrative Screening",
      "Ethics Review",
      "Technical Review",
      "GCP Inspection",
      "Queries to Applicant",
      "Applicant Response Review",
      "Decision Issued",
      "Trial Registration"
    ],
    stepSLA: {
      "Administrative Screening": 5,
      "Ethics Review": 30,
      "Technical Review": 40,
      "GCP Inspection": 30, // scheduling SLA often separated; here simplified
      "Queries to Applicant": 10,
      "Applicant Response Review": 15,
      "Decision Issued": 7,
      "Trial Registration": 3
    }
  },
  GMP: {
    displayName: "Good Manufacturing Practice",
    stepOrder: [
      "Application Received",
      "Application Screening",
      "Inspection Planning",
      "Inspection Conducted",
      "Inspection Report Drafted",
      "CAPA Requested",
      "CAPA Review",
      "Final Decision Issued",
      "Report Publication"
    ],
    stepSLA: {
      "Application Screening": 10,
      "Inspection Planning": 25,   // scheduling
      "Inspection Conducted": 10,  // conduct window
      "Inspection Report Drafted": 14,
      "CAPA Requested": 7,
      "CAPA Review": 30,
      "Final Decision Issued": 7,
      "Report Publication": 10
    }
  }
};

// Friendly names for KPIs (optional for UI)
const kpiDictionary = {
  MA: {
    pct_new_apps_evaluated_on_time: "New applications evaluated on time",
    pct_renewal_apps_evaluated_on_time: "Renewals evaluated on time",
    pct_variation_apps_evaluated_on_time: "Variations evaluated on time",
    pct_fir_responses_on_time: "FIR responses sent on time",
    pct_query_responses_evaluated_on_time: "Query responses evaluated on time",
    pct_granted_within_90_days: "Approvals granted ≤ 90 days",
    median_duration_continental: "Median duration (continental supply)"
  },
  CT: {
    pct_new_apps_evaluated_on_time_ct: "New CT apps evaluated on time",
    pct_amendment_apps_evaluated_on_time: "Amendments evaluated on time",
    pct_gcp_inspections_on_time: "GCP inspections conducted on time",
    pct_safety_reports_assessed_on_time: "Safety reports assessed on time",
    pct_gcp_compliant: "GCP compliant sites",
    pct_registry_submissions_on_time: "Registry submissions on time",
    pct_capa_evaluated_on_time: "CAPAs evaluated on time",
    avg_turnaround_time: "Average turnaround time (days)"
  },
  GMP: {
    pct_inspections_waived_on_time: "Inspections waived on time",
    pct_facilities_inspected_on_time: "Facilities inspected on time",
    pct_facilities_compliant: "Facilities compliant (GMP)",
    pct_capa_decisions_on_time: "CAPA decisions on time",
    pct_applications_completed_on_time: "Applications completed on time",
    avg_turnaround_time_gmp: "Average turnaround time (days)",
    median_turnaround_time: "Median turnaround time (days)",
    pct_reports_published_on_time: "Reports published on time"
  }
};

// -------------------------------
// KPI Percent/Time series (w/ disaggregations) — seed aware
// -------------------------------
function generateQuarterlyData(rnd) {
  const L = (s, e, irr = {}, v = 0) => generateLinear(s, e, irr, v, rnd);

  const base = {
    MA: {
      pct_new_apps_evaluated_on_time: { baseline: 65, target: 90, data: L(68, 92, { 'Q3 2023': 70, 'Q1 2025': 89 }, 3) },
      pct_renewal_apps_evaluated_on_time: { baseline: 70, target: 90, data: L(72, 93, {}, 3) },
      pct_variation_apps_evaluated_on_time: { baseline: 60, target: 85, data: L(62, 86, { 'Q3 2023': 63 }, 3) },
      pct_fir_responses_on_time: { baseline: 55, target: 75, data: L(58, 78, { 'Q4 2024': 74 }, 3) },
      pct_query_responses_evaluated_on_time: { baseline: 80, target: 90, data: L(82, 90, { 'Q3 2024': 88 }, 2) },
      pct_granted_within_90_days: { baseline: 40, target: 60, data: L(45, 66, { 'Q1 2025': 63 }, 3) },
      median_duration_continental: { baseline: 120, target: 90, data: L(118, 95, { 'Q4 2024': 92 }, 4) },
      // Disaggregations example
      pct_new_apps_evaluated_on_time__disag: {
        by_applicantType: {
          'Domestic Applicant': { data: L(70, 94, {}, 2) },
          'Foreign Applicant - Direct': { data: L(66, 90, {}, 2) },
          'Foreign Applicant - Reliance': { data: L(64, 88, {}, 2) }
        }
      }
    },
    CT: {
      pct_new_apps_evaluated_on_time_ct: { baseline: 75, target: 85, data: L(60, 88, { 'Q3 2023': 72, 'Q4 2023': 68 }, 4) },
      pct_amendment_apps_evaluated_on_time: { baseline: 70, target: 80, data: L(72, 80, {}, 3) },
      pct_gcp_inspections_on_time: { baseline: 60, target: 75, data: L(62, 72, {}, 3) },
      pct_safety_reports_assessed_on_time: { baseline: 85, target: 95, data: L(86, 95, {}, 2) },
      pct_gcp_compliant: { baseline: 80, target: 90, data: L(82, 90, {}, 3) },
      pct_registry_submissions_on_time: { baseline: 90, target: 100, data: L(92, 99, {}, 2) },
      pct_capa_evaluated_on_time: { baseline: 65, target: 80, data: L(67, 76, {}, 3) },
      avg_turnaround_time: { baseline: 50, target: 30, data: L(48, 31, {}, 3) },
      // Disaggregation example
      pct_gcp_inspections_on_time__disag: {
        by_reliance: {
          'Domestic': { data: L(64, 77, {}, 2) },
          'Reliance': { data: L(60, 74, {}, 2) }
        }
      }
    },
    GMP: {
      pct_inspections_waived_on_time: { baseline: 75, target: 90, data: L(77, 86, { 'Q2 2025': 85 }, 3) },
      pct_facilities_inspected_on_time: {
        baseline: 70,
        target: 85,
        data: L(72, 88, {}, 3),
        disaggregations: {
          inspectionType: {
            'On-site domestic': { data: L(75, 93, {}, 2) },
            'On-site foreign': { data: L(69, 84, {}, 2) },
            'Reliance/Joint on-site foreign': { data: L(67, 84, {}, 2) },
            'Reliance/Joint desk-based foreign': { data: L(66, 80, {}, 2) }
          }
        }
      },
      pct_facilities_compliant: {
        baseline: 75,
        target: 85,
        data: L(76, 82, { 'Q2 2025': 80 }, 3),
        disaggregations: {
          inspectionType: {
            'On-site domestic': { data: L(78, 88, {}, 3) },
            'On-site foreign': { data: L(74, 83, {}, 3) },
            'Reliance/Joint on-site foreign': { data: L(72, 78, {}, 3) },
            'Reliance/Joint desk-based foreign': { data: L(72, 76, {}, 3) }
          }
        }
      },
      pct_capa_decisions_on_time: {
        baseline: 70,
        target: 80,
        data: L(72, 81, {}, 3),
        disaggregations: {
          inspectionSource: {
            'Direct: Foreign + Domestic Done by NRA': { data: L(75, 84, {}, 3) },
            'Reliance: Rec joint Inspections': { data: L(69, 78, {}, 3) }
          }
        }
      },
      pct_applications_completed_on_time: {
        baseline: 80,
        target: 90,
        data: L(81, 90, {}, 2),
        disaggregations: {
          applicantType: {
            'Domestic Applicant': { data: L(83, 92, {}, 2) },
            'Foreign Applicant - Direct': { data: L(79, 88, {}, 2) },
            'Foreign Applicant - Reliance': { data: L(77, 86, {}, 2) }
          }
        }
      },
      avg_turnaround_time_gmp: {
        baseline: 70,
        target: 45,
        data: L(68, 40, { 'Q2 2025': 42 }, 4),
        disaggregations: {
          inspectionType: {
            'On-site domestic': { data: L(65, 35, {}, 3) },
            'On-site foreign': { data: L(71, 50, {}, 3) },
            'Reliance/Joint on-site foreign': { data: L(73, 52, {}, 3) }
          }
        }
      },
      median_turnaround_time: {
        baseline: 65,
        target: 40,
        data: L(63, 43, {}, 3),
        disaggregations: {
          inspectionType: {
            'On-site domestic': { data: L(60, 40, {}, 3) },
            'On-site foreign': { data: L(66, 46, {}, 3) }
          }
        }
      },
      pct_reports_published_on_time: {
        baseline: 65,
        target: 80,
        data: L(67, 77, {}, 3),
        disaggregations: {
          inspectionType: {
            'On-site domestic': { data: L(60, 78, {}, 3) },
            'On-site foreign': { data: L(70, 80, {}, 3) },
            'Reliance/Joint on-site foreign': { data: L(68, 75, {}, 3) }
          }
        }
      }
    }
  };

  // Flatten any disaggregations for easy selection in UI
  const flattened = JSON.parse(JSON.stringify(base));
  for (const [proc, kpis] of Object.entries(base)) {
    for (const [kpiId, val] of Object.entries(kpis)) {
      if (val.disaggregations) {
        for (const [type, groups] of Object.entries(val.disaggregations)) {
          for (const [label, obj] of Object.entries(groups)) {
            const newId = `${kpiId}_${sanitize(label)}`;
            flattened[proc][newId] = { baseline: val.baseline, target: val.target, data: obj.data };
          }
        }
        delete flattened[proc][kpiId].disaggregations;
      }
      if (val["pct_new_apps_evaluated_on_time__disag"]) {
        for (const [type, groups] of Object.entries(val["pct_new_apps_evaluated_on_time__disag"])) {
          for (const [label, obj] of Object.entries(groups)) {
            const newId = `${kpiId}_${sanitize(label)}`;
            flattened[proc][newId] = { baseline: val.baseline, target: val.target, data: obj.data };
          }
        }
        delete flattened[proc][kpiId]["pct_new_apps_evaluated_on_time__disag"];
      }
    }
  }
  return flattened;
}

// -------------------------------
// Process Step Timings (avgDays + targets) w/ flattened disags
// -------------------------------
function generateProcessStepData(rnd) {
  const D = (s, t, irr = {}, v = 0) => generateDecreasing(s, t, irr, v, rnd);

  const base = {
    MA: {
      'Application Received': { data: D(1.2, 1.0, { 'Q3 2023': 1.0 }, 0.2) },
      'Preliminary Screening': {
        data: D(7, 4, { 'Q4 2024': 4.2 }, 0.8),
        disaggregations: {
          applicantType: {
            'Domestic Applicant': { data: D(6, 3.2, {}, 0.7) },
            'Foreign Applicant - Direct': { data: D(8, 4.2, {}, 1.0) },
            'Foreign Applicant - Reliance': { data: D(7.5, 3.8, {}, 0.9) }
          }
        }
      },
      'Technical Dossier Review': { data: D(60, 35, {}, 2.5) },
      'Quality Review': { data: D(40, 26, {}, 2) },
      'Safety & Efficacy Review': { data: D(50, 32, {}, 2.2) },
      'Queries to Applicant': { data: D(5, 2, {}, 0.4) },
      'Applicant Response Review': { data: D(30, 16, {}, 1.5) },
      'Decision Issued': { data: D(8, 3.5, {}, 0.8) },
      'License Publication': { data: D(5, 2.5, {}, 0.4) }
    },
    CT: {
      'Application Received': { data: D(1.0, 1.0, {}, 0.1) },
      'Administrative Screening': {
        data: D(7, 3.5, {}, 0.8),
        disaggregations: {
          relianceType: {
            'Domestic': { data: D(6.5, 3.2, {}, 0.6) },
            'Reliance': { data: D(7.5, 3.8, {}, 0.9) }
          }
        }
      },
      'Ethics Review': { data: D(35, 26, {}, 1.6) },
      'Technical Review': { data: D(45, 32, {}, 2.2) },
      'GCP Inspection': { data: D(55, 42, {}, 2.0) },
      'Queries to Applicant': { data: D(5, 2, {}, 0.4) },
      'Applicant Response Review': { data: D(20, 11, {}, 1.0) },
      'Decision Issued': { data: D(7, 3.2, {}, 0.7) },
      'Trial Registration': { data: D(3, 1.2, {}, 0.2) }
    },
    GMP: {
      'Application Received': { data: D(1.2, 1.0, {}, 0.2) },
      'Application Screening': {
        data: D(10, 6, {}, 1.0),
        disaggregations: {
          inspectionType: {
            'On-site domestic': { data: D(9, 5.5, {}, 0.8) },
            'On-site foreign': { data: D(11, 6.5, {}, 1.0) },
            'Reliance/Joint on-site foreign': { data: D(10.5, 6.3, {}, 0.9) }
          }
        }
      },
      'Inspection Planning': {
        data: D(28, 18, {}, 1.8),
        disaggregations: {
          inspectionType: {
            'On-site domestic': { data: D(26, 16, {}, 1.5) },
            'On-site foreign': { data: D(30, 20, {}, 2.0) }
          }
        }
      },
      'Inspection Conducted': { data: D(8, 6, {}, 0.5) },
      'Inspection Report Drafted': { data: D(15, 8, {}, 1.0) },
      'CAPA Requested': { data: D(4, 2.2, {}, 0.3) },
      'CAPA Review': { data: D(28, 18, {}, 1.5) },
      'Final Decision Issued': { data: D(7, 3.5, {}, 0.6) },
      'Report Publication': { data: D(10, 5.5, {}, 0.5) }
    }
  };

  // Flatten
  const flat = JSON.parse(JSON.stringify(base));
  for (const [proc, steps] of Object.entries(base)) {
    for (const [step, obj] of Object.entries(steps)) {
      if (obj.disaggregations) {
        for (const [type, groups] of Object.entries(obj.disaggregations)) {
          for (const [label, v] of Object.entries(groups)) {
            const newStepName = `${sanitize(step)}_${sanitize(label)}`;
            flat[proc][newStepName] = { data: v.data };
          }
        }
        delete flat[proc][step].disaggregations;
      }
    }
  }
  return flat;
}

// -------------------------------
// KPI Numerator/Denominator (counts) + Samples
// -------------------------------
function generateKpiCounts(rnd) {
  const ND = (a,b,c,d,irr,vn,vd) => generateNumDen(a,b,c,d,irr,vn,vd,rnd);
  const S = (a,b,irr,v) => generateSample(a,b,irr,v,rnd);

  return {
    MA: {
      pct_new_apps_evaluated_on_time: ND(220, 520, 300, 640, { 'Q2 2025': { numerator: 520, denominator: 640 } }, 18, 24),
      pct_renewal_apps_evaluated_on_time: ND(140, 220, 180, 260, {}, 12, 12),
      pct_variation_apps_evaluated_on_time: ND(110, 180, 160, 220, {}, 10, 10),
      pct_fir_responses_on_time: ND(180, 300, 240, 360, {}, 14, 14),
      pct_query_responses_evaluated_on_time: ND(200, 320, 240, 360, {}, 12, 12),
      pct_granted_within_90_days: ND(60, 180, 140, 260, {}, 8, 10),
      median_duration_continental: S(40, 65, {}, 6)
    },
    CT: {
      pct_new_apps_evaluated_on_time_ct: ND(40, 85, 55, 100, {}, 6, 6),
      pct_amendment_apps_evaluated_on_time: ND(30, 65, 42, 80, {}, 5, 6),
      pct_gcp_inspections_on_time: ND(10, 35, 15, 45, {}, 2, 3),
      pct_safety_reports_assessed_on_time: ND(160, 240, 180, 260, {}, 10, 12),
      pct_gcp_compliant: ND(22, 55, 25, 60, {}, 3, 4),
      pct_registry_submissions_on_time: ND(60, 95, 65, 100, {}, 4, 5),
      pct_capa_evaluated_on_time: ND(24, 60, 36, 75, {}, 3, 4),
      avg_turnaround_time: S(42, 32, {}, 4)
    },
    GMP: {
      pct_facilities_inspected_on_time: ND(28, 82, 35, 95, {}, 3, 4),
      pct_inspections_waived_on_time: ND(7, 20, 9, 25, {}, 1, 2),
      pct_facilities_compliant: ND(34, 75, 44, 90, {}, 3, 4),
      pct_capa_decisions_on_time: ND(22, 60, 30, 74, {}, 3, 4),
      pct_applications_completed_on_time: ND(50, 120, 62, 140, {}, 5, 6),
      avg_turnaround_time_gmp: S(60, 42, {}, 5),
      median_turnaround_time: S(55, 40, {}, 4),
      pct_reports_published_on_time: ND(26, 70, 36, 86, {}, 3, 4)
    }
  };
}

// -------------------------------
// Volumes (more realistic ranges)
// -------------------------------
function generateQuarterlyVolumes(rnd) {
  return {
    MA: quarters.map((q, i) => {
      const apps_in = round0(260 + i * 45 + (rnd() * 30 - 15));
      const comps = round0(apps_in * clamp(0.35 + 0.02 * i + (rnd() * 0.04 - 0.02), 0.3, 0.95));
      const fir = round0(140 + i * 25 + (rnd() * 15 - 7));
      const fir_resp = clamp(fir + round0(rnd() * 20 - 10), 0, 99999);
      const query_cycles = round0(180 + i * 28 + (rnd() * 20 - 10));
      const approvals = round0(60 + i * 12 + (rnd() * 8 - 4));
      const reliance = i >= 4 ? round0((i - 3) * 10 + (rnd() * 6 - 3)) : 0;
      return {
        quarter: q,
        applications_received: apps_in,
        applications_completed: comps,
        fir_sent: fir,
        fir_responses_received: fir_resp,
        query_cycles_total: query_cycles,
        approvals_granted: approvals,
        reliance_used_count: reliance
      };
    }),
    CT: quarters.map((q, i) => {
      const rec = round0(25 + i * 8 + (rnd() * 6 - 3));
      const completed = round0(Math.max(0, rec * clamp(0.6 + 0.03 * i + (rnd() * 0.05 - 0.025), 0.5, 0.95)));
      const queries = round0(40 + i * 10 + (rnd() * 8 - 4));
      const query_resp = clamp(queries + round0(rnd() * 8 - 4), 0, 99999);
      const trials_reg = round0(28 + i * 4 + (rnd() * 4 - 2));
      const gcp_req = round0(Math.max(0, 6 + i * 2 + (rnd() * 3 - 1.5)));
      const gcp_cond = round0(Math.max(0, gcp_req * clamp(0.6 + 0.03 * i + (rnd() * 0.08 - 0.04), 0.4, 1)));
      return {
        quarter: q,
        applications_received: rec,
        applications_completed: completed,
        queries_sent: queries,
        queries_responses_received: query_resp,
        trials_registered: trials_reg,
        gcp_inspections_requested: gcp_req,
        gcp_inspections_conducted: gcp_cond
      };
    }),
    GMP: quarters.map((q, i) => {
      const apps_in = round0(60 + i * 6 + (rnd() * 5 - 2.5));
      const apps_comp = round0(apps_in * clamp(0.45 + 0.03 * i + (rnd() * 0.06 - 0.03), 0.35, 0.95));
      const insp_req = round0(18 + i * 5 + (rnd() * 4 - 2));
      const insp_cond = round0(insp_req * clamp(0.5 + 0.03 * i + (rnd() * 0.08 - 0.04), 0.4, 1));
      const dom = round0(Math.max(0, 5 + i * 2 + (rnd() * 3 - 1.5)));
      const foreign = round0(Math.max(0, 14 - i + (rnd() * 3 - 1.5)));
      const reliance_joint = i >= 4 ? round0((i - 3) * 2 + (rnd() * 2 - 1)) : 0;
      const capas_req = round0(12 + i * 5 + (rnd() * 4 - 2));
      const capas_closed = round0(Math.max(0, capas_req * clamp(0.5 + 0.05 * i + (rnd() * 0.08 - 0.04), 0.4, 1)));
      const reports_pub = round0(22 + i * 3 + (rnd() * 3 - 1.5));
      return {
        quarter: q,
        applications_received: apps_in,
        applications_completed: apps_comp,
        inspections_requested_total: insp_req,
        inspections_conducted_total: insp_cond,
        inspections_domestic: dom,
        inspections_foreign: foreign,
        inspections_reliance_joint: reliance_joint,
        capas_requested: capas_req,
        capas_closed: capas_closed,
        reports_published: reports_pub
      };
    })
  };
}

// -------------------------------
// Inspection Volumes by type (CT/GMP)
// -------------------------------
function generateInspectionVolumes(rnd) {
  return {
    CT: quarters.map((q, i) => ({
      quarter: q,
      requested_domestic: round0(Math.max(0, 2 + i * 1 + (rnd() * 2 - 1))),
      requested_foreign: round0(Math.max(0, 1 + i * 1 + (rnd() * 2 - 1))),
      requested_reliance: round0(6 + (rnd() * 2 - 1)),
      conducted_domestic: round0(Math.max(0, 1 + i * 1 + (rnd() * 2 - 1))),
      conducted_foreign: round0(Math.max(0, i * 1 + (rnd() * 2 - 1))),
      conducted_reliance: round0(Math.max(0, (i - 2) * 1 + (rnd() * 1 - 0.5)))
    })),
    GMP: quarters.map((q, i) => ({
      quarter: q,
      requested_domestic: round0(12 + i * 2 + (rnd() * 2 - 1)),
      requested_foreign: round0(20 - i + (rnd() * 2 - 1)),
      requested_reliance: i >= 3 ? round0((i - 2) * 2 + (rnd() * 2 - 1)) : 0,
      requested_desk: i >= 4 ? round0((i - 3) * 1 + (rnd() * 1 - 0.5)) : 0,
      conducted_domestic: round0(Math.max(0, (i - 1) * 2 + 1 + (rnd() * 2 - 1))),
      conducted_foreign: round0(Math.max(0, 14 - i + (rnd() * 2 - 1))),
      conducted_reliance: i >= 5 ? round0((i - 4) * 2 + (rnd() * 2 - 1)) : 0,
      conducted_desk: i >= 5 ? round0((i - 4) * 1 + (rnd() * 1 - 0.5)) : 0
    }))
  };
}

// -------------------------------
// Process Step Counts (started/completed/open)
// -------------------------------
function generateProcessStepCounts(rnd) {
  const SC = (a,b,c,o,os,irr,v) => generateStepCounts(a,b,c,o,os,irr,v,rnd);

  return {
    MA: {
      'Preliminary Screening': SC(220, 40, 0.98, 2, 2, { 'Q1 2025': { open_end_q: 18 }, 'Q2 2025': { open_end_q: 22 } }, 10),
      'Technical Dossier Review': SC(200, 42, 0.92, 5, 8, { 'Q4 2024': { open_end_q: 55 } }, 15),
      'Quality Review': SC(230, 30, 0.95, 0, 5, {}, 12),
      'Safety & Efficacy Review': SC(220, 30, 0.95, 8, 3, {}, 12),
      'Queries to Applicant': SC(150, 22, 0.97, 1, 3, {}, 8),
      'Applicant Response Review': SC(140, 20, 0.96, 3, 2, {}, 8),
      'Decision Issued': SC(120, 18, 0.94, 2, 2, {}, 8),
      'License Publication': SC(110, 18, 0.96, 0, 2, {}, 8)
    },
    CT: {
      'Administrative Screening': SC(40, 10, 0.98, 0, 1, { 'Q2 2025': { open_end_q: 4 } }, 3),
      'Technical Review': SC(35, 11, 0.86, 0, 2, {}, 3),
      'Ethics Review': SC(30, 10, 0.92, 0, 2, {}, 2),
      'GCP Inspection': SC(10, 4, 0.82, 0, 1, {}, 1),
      'Queries to Applicant': SC(35, 12, 0.97, 0, 1, {}, 4),
      'Applicant Response Review': SC(33, 12, 0.96, 0, 1, {}, 4),
      'Decision Issued': SC(28, 10, 0.95, 0, 1, {}, 3),
      'Trial Registration': SC(34, 6, 1.0, 1, 0, {}, 3)
    },
    GMP: {
      'Application Screening': SC(60, 6, 0.93, 0, 1, { 'Q2 2025': { open_end_q: 7 } }, 3),
      'Inspection Planning': SC(20, 6, 0.92, 0, 2, {}, 3),
      'Inspection Conducted': SC(10, 5, 0.9, 0, 1, {}, 2),
      'Inspection Report Drafted': SC(12, 4, 0.9, 0, 1, {}, 2),
      'CAPA Requested': SC(14, 5, 0.88, 0, 2, {}, 3),
      'CAPA Review': SC(10, 5, 0.78, 2, 2, {}, 2),
      'Final Decision Issued': SC(10, 4, 0.92, 0, 1, {}, 2),
      'Report Publication': SC(16, 4, 0.92, 0, 1, {}, 2)
    }
  };
}

// -------------------------------
// Bottleneck blocks (touch/wait/capacity/backlog/age bands etc.)
// -------------------------------
function generateBottleneckData(rnd) {
  const BN = (cfg) => generateBottleneck(cfg, rnd);

  return {
    MA: {
      'Technical Dossier Review': BN({
        touch_median_days: { start: 22, end: 12, variability: 1, type: "days" },
        touch_p90_days:    { start: 40, end: 24, variability: 2, type: "days" },
        wait_median_days:  { start: 26, end: 17, variability: 1.2, type: "days" },
        wait_share_pct:    { start: 74, end: 58, variability: 3, type: "pct" },
        wip_count:         { start: 18, end: 70, variability: 5, type: "count" },
        capacity_cases_q:  { start: 18, end: 62, variability: 4, type: "count" },
        wip_cap_ratio:     { start: 0.9, end: 1.2, variability: 0.06, type: "ratio" },
        incoming_cases_q:  { start: 200, end: 560, variability: 24, type: "count" },
        work_to_staff_ratio: { start: 0.8, end: 1.2, variability: 0.1, type: "ratio" },
        cap_ratio_hours:   { start: 0.65, end: 0.9, variability: 0.05, type: "ratio" },
        throughput_util:   { start: 0.7, end: 0.95, variability: 0.05, type: "util" },
        opening_backlog:   { start: 100, end: 60, variability: 5, type: "count" },
        closing_backlog:   { start: 80, end: 70, variability: 5, type: "count" },
        carry_over_rate:   { start: 0.15, end: 0.24, variability: 0.02, type: "ratio" },
        age_0_30:          { start: 10, end: 30, variability: 2, type: "count" },
        age_31_60:         { start: 8, end: 24, variability: 2, type: "count" },
        age_61_90:         { start: 4, end: 10, variability: 1, type: "count" },
        age_90_plus:       { start: 2, end: 6, variability: 1, type: "count" },
        avg_query_cycles:  { start: 1.0, end: 1.3, variability: 0.08, type: "ratio" },
        p90_query_cycles:  { start: 3, end: 3, variability: 0.2, type: "count" },
        fpy_pct:           { start: 76, end: 62, variability: 3, type: "pct" }
      }),
      'Queries to Applicant': BN({
        ext_median_days:   { start: 16, end: 8, variability: 1, type: "days" },
        ext_p90_days:      { start: 34, end: 16, variability: 2, type: "days" },
        ext_past_sla_pct:  { start: 52, end: 18, variability: 3, type: "pct" },
        ext_sla_days:      { start: 10, end: 10, variability: 0, type: "days" },
        touch_median_days: { start: 3.6, end: 1.8, variability: 0.3, type: "days" },
        touch_p90_days:    { start: 6.0, end: 2.8, variability: 0.5, type: "days" },
        wait_median_days:  { start: 1.8, end: 0.9, variability: 0.2, type: "days" },
        wait_share_pct:    { start: 33, end: 30, variability: 2, type: "pct" },
        wip_count:         { start: 6, end: 26, variability: 2, type: "count" },
        capacity_cases_q:  { start: 160, end: 340, variability: 10, type: "count" },
        wip_cap_ratio:     { start: 0.05, end: 0.09, variability: 0.01, type: "ratio" },
        incoming_cases_q:  { start: 140, end: 320, variability: 10, type: "count" },
        throughput_util:   { start: 0.58, end: 0.85, variability: 0.05, type: "util" },
        opening_backlog:   { start: 30, end: 24, variability: 2, type: "count" },
        closing_backlog:   { start: 8, end: 26, variability: 2, type: "count" },
        carry_over_rate:   { start: 0.04, end: 0.1, variability: 0.01, type: "ratio" },
        avg_query_cycles:  { start: 2.0, end: 1.7, variability: 0.08, type: "ratio" },
        p90_query_cycles:  { start: 3, end: 3, variability: 0.2, type: "count" },
        fpy_pct:           { start: 45, end: 60, variability: 3, type: "pct" }
      }),
      'Decision Issued': BN({
        ext_median_days:   { start: 11, end: 3, variability: 0.8, type: "days" },
        ext_p90_days:      { start: 24, end: 7, variability: 1.2, type: "days" },
        ext_past_sla_pct:  { start: 35, end: 9, variability: 2, type: "pct" },
        ext_sla_days:      { start: 7, end: 7, variability: 0, type: "days" },
        touch_median_days: { start: 4.0, end: 2.2, variability: 0.3, type: "days" },
        wait_median_days:  { start: 2.8, end: 1.1, variability: 0.2, type: "days" },
        throughput_util:   { start: 0.7, end: 0.88, variability: 0.05, type: "util" },
        wip_count:         { start: 8, end: 18, variability: 2, type: "count" },
        opening_backlog:   { start: 28, end: 18, variability: 2, type: "count" },
        closing_backlog:   { start: 10, end: 19, variability: 2, type: "count" },
        carry_over_rate:   { start: 0.06, end: 0.11, variability: 0.01, type: "ratio" },
        fpy_pct:           { start: 85, end: 93, variability: 3, type: "pct" }
      })
    },
    CT: {
      'Technical Review': BN({
        ext_median_days:   { start: 14, end: 5, variability: 1, type: "days" },
        ext_p90_days:      { start: 30, end: 12, variability: 2, type: "days" },
        ext_past_sla_pct:  { start: 39, end: 12, variability: 3, type: "pct" },
        touch_median_days: { start: 22, end: 13, variability: 1.2, type: "days" },
        wait_median_days:  { start: 18, end: 9, variability: 1, type: "days" },
        wait_share_pct:    { start: 50, end: 41, variability: 3, type: "pct" },
        wip_count:         { start: 6, end: 12, variability: 2, type: "count" },
        capacity_cases_q:  { start: 42, end: 85, variability: 5, type: "count" },
        wip_cap_ratio:     { start: 0.1, end: 0.15, variability: 0.02, type: "ratio" },
        incoming_cases_q:  { start: 38, end: 88, variability: 5, type: "count" },
        throughput_util:   { start: 0.74, end: 0.92, variability: 0.05, type: "util" },
        opening_backlog:   { start: 26, end: 10, variability: 2, type: "count" },
        closing_backlog:   { start: 22, end: 12, variability: 2, type: "count" },
        carry_over_rate:   { start: 0.18, end: 0.14, variability: 0.02, type: "ratio" },
        avg_query_cycles:  { start: 1.1, end: 1.3, variability: 0.1, type: "ratio" },
        p90_query_cycles:  { start: 3, end: 3, variability: 0.2, type: "count" },
        fpy_pct:           { start: 50, end: 66, variability: 3, type: "pct" }
      }),
      'GCP Inspection': BN({
        ext_median_days:   { start: 16, end: 7, variability: 1, type: "days" },
        ext_p90_days:      { start: 34, end: 16, variability: 2, type: "days" },
        ext_past_sla_pct:  { start: 34, end: 16, variability: 3, type: "pct" },
        touch_median_days: { start: 5.6, end: 3.8, variability: 0.5, type: "days" },
        wait_median_days:  { start: 20, end: 11, variability: 1.2, type: "days" },
        wait_share_pct:    { start: 83, end: 74, variability: 3, type: "pct" },
        wip_count:         { start: 3, end: 8, variability: 1, type: "count" },
        capacity_cases_q:  { start: 12, end: 28, variability: 2, type: "count" },
        opening_backlog:   { start: 12, end: 7, variability: 1, type: "count" },
        closing_backlog:   { start: 10, end: 8, variability: 1, type: "count" },
        carry_over_rate:   { start: 0.28, end: 0.24, variability: 0.02, type: "ratio" },
        sched_median_days: { start: 44, end: 26, variability: 2, type: "days" },
        sched_p90_days:    { start: 95, end: 50, variability: 4, type: "days" },
        sched_past_sla_pct:{ start: 52, end: 26, variability: 3, type: "pct" }
      })
    },
    GMP: {
      'Inspection Planning': BN({
        ext_median_days:   { start: 20, end: 11, variability: 1.2, type: "days" },
        ext_p90_days:      { start: 46, end: 28, variability: 2, type: "days" },
        ext_past_sla_pct:  { start: 52, end: 25, variability: 3, type: "pct" },
        touch_median_days: { start: 10, end: 5.5, variability: 0.8, type: "days" },
        wait_median_days:  { start: 22, end: 13, variability: 1.0, type: "days" },
        wait_share_pct:    { start: 70, end: 65, variability: 3, type: "pct" },
        wip_count:         { start: 6, end: 18, variability: 2, type: "count" },
        capacity_cases_q:  { start: 30, end: 52, variability: 3, type: "count" },
        opening_backlog:   { start: 24, end: 15, variability: 2, type: "count" },
        closing_backlog:   { start: 20, end: 18, variability: 2, type: "count" },
        carry_over_rate:   { start: 0.28, end: 0.25, variability: 0.02, type: "ratio" },
        sched_median_days: { start: 44, end: 26, variability: 2, type: "days" },
        sched_p90_days:    { start: 95, end: 50, variability: 4, type: "days" }
      }),
      'CAPA Review': BN({
        ext_median_days:   { start: 34, end: 16, variability: 1.6, type: "days" },
        ext_p90_days:      { start: 80, end: 35, variability: 2.2, type: "days" },
        ext_past_sla_pct:  { start: 62, end: 26, variability: 3, type: "pct" },
        touch_median_days: { start: 11, end: 6.5, variability: 0.9, type: "days" },
        wait_median_days:  { start: 14, end: 9.5, variability: 1.0, type: "days" },
        wait_share_pct:    { start: 59, end: 55, variability: 3, type: "pct" },
        wip_count:         { start: 8, end: 20, variability: 2, type: "count" },
        opening_backlog:   { start: 36, end: 18, variability: 2, type: "count" },
        closing_backlog:   { start: 22, end: 20, variability: 2, type: "count" },
        carry_over_rate:   { start: 0.32, end: 0.27, variability: 0.02, type: "ratio" },
        avg_query_cycles:  { start: 2.0, end: 1.5, variability: 0.15, type: "ratio" },
        p90_query_cycles:  { start: 3, end: 3, variability: 0.2, type: "count" },
        fpy_pct:           { start: 44, end: 60, variability: 3, type: "pct" }
      }),
      'Report Publication': BN({
        ext_median_days:   { start: 14, end: 5, variability: 0.8, type: "days" },
        ext_p90_days:      { start: 28, end: 10, variability: 1.2, type: "days" },
        ext_past_sla_pct:  { start: 28, end: 10, variability: 2, type: "pct" },
        touch_median_days: { start: 3.8, end: 2.0, variability: 0.3, type: "days" },
        wait_median_days:  { start: 2.1, end: 1.2, variability: 0.2, type: "days" },
        wait_share_pct:    { start: 37, end: 34, variability: 2, type: "pct" },
        wip_count:         { start: 4, end: 6, variability: 1, type: "count" },
        opening_backlog:   { start: 14, end: 5, variability: 1, type: "count" },
        closing_backlog:   { start: 10, end: 6, variability: 1, type: "count" },
        carry_over_rate:   { start: 0.16, end: 0.11, variability: 0.01, type: "ratio" },
        avg_query_cycles:  { start: 0.4, end: 0.3, variability: 0.05, type: "ratio" },
        p90_query_cycles:  { start: 1, end: 1, variability: 0.1, type: "count" },
        fpy_pct:           { start: 84, end: 91, variability: 3, type: "pct" }
      })
    }
  };
}

// -------------------------------
// Full generator
// -------------------------------
function generateFullData(opts = {}) {
  const rnd = rngFactory(opts.seed);

  const quarterlyData = generateQuarterlyData(rnd);
  const processStepData = generateProcessStepData(rnd);
  const kpiCounts = generateKpiCounts(rnd);
  const quarterlyVolumes = generateQuarterlyVolumes(rnd);
  const inspectionVolumes = generateInspectionVolumes(rnd);
  const bottleneckData = generateBottleneckData(rnd);
  const processStepCounts = generateProcessStepCounts(rnd);

  // Derive convenience: KPI computed percentages from counts (helps validation)
  const kpiRates = {};
  for (const [proc, kpis] of Object.entries(kpiCounts)) {
    kpiRates[proc] = {};
    for (const [kpiId, series] of Object.entries(kpis)) {
      kpiRates[proc][kpiId] = series.map(({ quarter, numerator, denominator }) => ({
        quarter,
        numerator,
        denominator,
        value: +pct(numerator, denominator).toFixed(1)
      }));
    }
  }

  return {
    quarters,
    processMetadata,
    kpiDictionary,
    quarterlyData,       // %/days timeseries (flattened disags included)
    processStepData,     // avgDays + targets per step (flattened disags included)
    kpiCounts,           // numerator/denominator for KPI rates
    kpiRates,            // derived percentage series from kpiCounts
    quarterlyVolumes,    // intake/output/process volumes
    inspectionVolumes,   // CT/GMP inspection breakdowns
    bottleneckData,      // touch/wait/capacity/backlog/age bands etc.
    processStepCounts    // started/completed/open by step
  };
}

// Export for Node/CommonJS and ESM
if (typeof module !== "undefined") module.exports = { generateFullData, quarters };
export { generateFullData, quarters };
