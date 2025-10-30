// Full kpiData.js - Run: console.log(JSON.stringify(generateFullData(), null, 2)); to get JSON
const quarters = [
  'Q1 2023', 'Q2 2023', 'Q3 2023', 'Q4 2023',
  'Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024',
  'Q1 2025', 'Q2 2025'
];

// Helper functions (from original)
const generateLinear = (start, end, irregularities = {}, variability = 0) => {
  const step = (end - start) / (quarters.length - 1);
  return quarters.map((q, i) => ({
    quarter: q,
    value: (irregularities[q] ?? (start + i * step)) + (Math.random() * 2 - 1) * variability
  }));
};

const generateDecreasing = (start, target, irregularities = {}, variability = 0) => {
  const step = (target - start) / (quarters.length - 1);
  return quarters.map((q, i) => ({
    quarter: q,
    avgDays: (irregularities[q] ?? (start + i * step)) + (Math.random() * 2 - 1) * variability,
    targetDays: target
  }));
};

const generateNumDen = (numStart, numEnd, denStart, denEnd, irregularities = {}, varNum = 0, varDen = 0) => {
  const numStep = (numEnd - numStart) / (quarters.length - 1);
  const denStep = (denEnd - denStart) / (quarters.length - 1);
  return quarters.map((q, i) => {
    let num = numStart + i * numStep + (Math.random() * 2 - 1) * varNum;
    let den = denStart + i * denStep + (Math.random() * 2 - 1) * varDen;
    if (irregularities[q]) {
      num = irregularities[q].numerator ?? num;
      den = irregularities[q].denominator ?? den;
    }
    return { quarter: q, numerator: Math.round(Math.max(0, num)), denominator: Math.round(Math.max(0, den)) };
  });
};

const generateSample = (start, end, irregularities = {}, variability = 0) => {
  const step = (end - start) / (quarters.length - 1);
  return quarters.map((q, i) => ({
    quarter: q,
    sample_n: Math.round(Math.max(0, (irregularities[q] ?? (start + i * step)) + (Math.random() * 2 - 1) * variability))
  }));
};

const generateStepCounts = (startedStart, startedStep, completedRatio = 0.95, openStart = 0, openStep = 0, irregularities = {}, variability = 0) => {
  return quarters.map((q, i) => {
    let started = startedStart + i * startedStep + (Math.random() * 2 - 1) * variability;
    let completed = started * completedRatio + (Math.random() * 2 - 1) * (variability * 0.5);
    let open = openStart + i * openStep + (Math.random() * 2 - 1) * (variability * 0.2);
    if (irregularities[q]) {
      started = irregularities[q].started_q ?? started;
      completed = irregularities[q].completed_q ?? completed;
      open = irregularities[q].open_end_q ?? open;
    }
    return { quarter: q, started_q: Math.round(Math.max(0, started)), completed_q: Math.round(Math.max(0, completed)), open_end_q: Math.round(Math.max(0, open)) };
  });
};

const generateBottleneck = (process, stepName, configs) => {
  return quarters.map((q, i) => {
    const obj = { quarter: q };
    for (const key in configs) {
      const { start, end, irregularities = {}, variability = 0 } = configs[key];
      if (typeof start !== 'number' || typeof end !== 'number') continue;

      const delta = (end - start) / (quarters.length - 1);
      let value = irregularities[q] ?? (start + i * delta);
      value += (Math.random() * 2 - 1) * variability;

      if (key.includes('pct') || key.includes('ratio') || key.includes('rate') || key.includes('share')) {
        value = Math.max(0, Math.min(100, value));
      } else if (key.includes('count') || key.includes('cycles') || key.includes('age_') || key.includes('incoming') || key.includes('capacity') || key.includes('wip')) {
        value = Math.round(Math.max(0, value));
      } else if (key.includes('days') || key.includes('util')) {
        value = Math.max(0, value);
      }

      obj[key] = value;
    }
    return obj;
  });
};

// Updated generateQuarterlyData with flattening
const generateQuarterlyData = () => {
  const baseData = {
    MA: {
      pct_new_apps_evaluated_on_time: {
        baseline: 65,
        target: 90,
        data: generateLinear(68, 95, { 'Q3 2023': 70, 'Q1 2025': 90 }, 3)
      },
      pct_renewal_apps_evaluated_on_time: {
        baseline: 70,
        target: 90,
        data: generateLinear(72, 95, {}, 3)
      },
      pct_variation_apps_evaluated_on_time: {
        baseline: 60,
        target: 85,
        data: generateLinear(62, 86, { 'Q3 2023': 63, 'Q1 2025': 90 }, 3)
      },
      pct_fir_responses_on_time: {
        baseline: 55,
        target: 75,
        data: generateLinear(58, 80, { 'Q4 2024': 76, 'Q1 2025': 76 }, 3)
      },
      pct_query_responses_evaluated_on_time: {
        baseline: 80,
        target: 90,
        data: generateLinear(82, 90, { 'Q3 2024': 88, 'Q4 2024': 89, 'Q1 2025': 89 }, 2)
      },
      pct_granted_within_90_days: {
        baseline: 40,
        target: 60,
        data: generateLinear(42, 70, { 'Q1 2025': 65 }, 4)
      },
      median_duration_continental: {
        baseline: 120,
        target: 90,
        data: generateLinear(118, 70, { 'Q3 2024': 50, 'Q4 2024': 45, 'Q1 2025': 50 }, 5)
      }
    },
    CT: {
      pct_new_apps_evaluated_on_time_ct: {
        baseline: 75,
        target: 85,
        data: generateLinear(55, 90, { 'Q1 2023': 55, 'Q3 2023': 75, 'Q4 2023': 65 }, 4)
      },
      pct_amendment_apps_evaluated_on_time: {
        baseline: 70,
        target: 80,
        data: generateLinear(72, 81, {}, 3)
      },
      pct_gcp_inspections_on_time: {
        baseline: 60,
        target: 75,
        data: generateLinear(62, 71, {}, 3)
      },
      pct_safety_reports_assessed_on_time: {
        baseline: 85,
        target: 95,
        data: generateLinear(86, 95, {}, 2)
      },
      pct_gcp_compliant: {
        baseline: 80,
        target: 90,
        data: generateLinear(82, 91, {}, 3)
      },
      pct_registry_submissions_on_time: {
        baseline: 90,
        target: 100,
        data: generateLinear(91, 100, {}, 2)
      },
      pct_capa_evaluated_on_time: {
        baseline: 65,
        target: 80,
        data: generateLinear(67, 76, {}, 3)
      },
      avg_turnaround_time: {
        baseline: 50,
        target: 30,
        data: generateLinear(48, 30, {}, 4)
      }
    },
    GMP: {
      pct_inspections_waived_on_time: {
        baseline: 75,
        target: 90,
        data: generateLinear(77, 85, { 'Q2 2025': 85 }, 3)
      },
      pct_facilities_inspected_on_time: {
        baseline: 70,
        target: 85,
        data: generateLinear(72, 90, {}, 3),
        disaggregations: {
          inspectionType: {
            'On-site domestic': {
              data: generateLinear(75, 95, {}, 3)
            },
            'On-site foreign': {
              data: generateLinear(69, 84, {}, 3)
            },
            'Reliance/Joint on-site foreign': {
              data: generateLinear(67, 84, {}, 3)
            }
          }
        }
      },
      pct_facilities_compliant: {
        baseline: 75,
        target: 85,
        data: generateLinear(76, 80, { 'Q2 2025': 80 }, 3),
        disaggregations: {
          inspectionType: {
            'On-site domestic': {
              data: generateLinear(78, 87, {}, 3)
            },
            'On-site foreign': {
              data: generateLinear(74, 83, {}, 3)
            },
            'Reliance/Joint on-site foreign': {
              data: generateLinear(72, 70, { 'Q2 2025': 70 }, 3)
            },
            'Reliance/Joint desk-based foreign': {
              data: generateLinear(72, 75, { 'Q2 2025': 75 }, 3)
            }
          }
        }
      },
      pct_capa_decisions_on_time: {
        baseline: 70,
        target: 80,
        data: generateLinear(72, 81, {}, 3),
        disaggregations: {
          inspectionSource: {
            'Direct: Foreign + Domestic Done by NRA': {
              data: generateLinear(75, 84, {}, 3)
            },
            'Reliance: Rec joint Inspections': {
              data: generateLinear(69, 78, {}, 3)
            }
          }
        }
      },
      pct_applications_completed_on_time: {
        baseline: 80,
        target: 90,
        data: generateLinear(81, 90, {}, 2),
        disaggregations: {
          applicantType: {
            'Domestic Applicant': {
              data: generateLinear(83, 92, {}, 2)
            },
            'Foreign Applicant - Direct': {
              data: generateLinear(79, 88, {}, 2)
            },
            'Foreign Applicant - Reliance': {
              data: generateLinear(77, 86, {}, 2)
            }
          }
        }
      },
      avg_turnaround_time_gmp: {
        baseline: 70,
        target: 45,
        data: generateLinear(68, 25, { 'Q2 2025': 25 }, 5),
        disaggregations: {
          inspectionType: {
            'On-site domestic': {
              data: generateLinear(65, 20, { 'Q2 2025': 20 }, 4)
            },
            'On-site foreign': {
              data: generateLinear(71, 53, {}, 4)
            },
            'Reliance/Joint on-site foreign': {
              data: generateLinear(73, 55, {}, 4)
            }
          }
        }
      },
      median_turnaround_time: {
        baseline: 65,
        target: 40,
        data: generateLinear(63, 45, {}, 4),
        disaggregations: {
          inspectionType: {
            'On-site domestic': {
              data: generateLinear(60, 42, {}, 3)
            },
            'On-site foreign': {
              data: generateLinear(66, 48, {}, 3)
            }
          }
        }
      },
      pct_reports_published_on_time: {
        baseline: 65,
        target: 80,
        data: generateLinear(67, 76, {}, 3),
        disaggregations: {
          inspectionType: {
            'On-site domestic': {
              data: generateLinear(50, 78, { 'Q1 2023': 50, 'Q2 2023': 65, 'Q4 2024': 67 }, 4)
            },
            'On-site foreign': {
              data: generateLinear(70, 80, { 'Q3 2023': 70, 'Q4 2023': 76, 'Q1 2024': 69 }, 3)
            },
            'Reliance/Joint on-site foreign': {
              data: generateLinear(70, 72, { 'Q3 2023': 65, 'Q4 2023': 75, 'Q1 2024': 67 }, 3)
            }
          }
        }
      }
    }
  };

  // Flatten disags for GMP
  const gmp = baseData.GMP;
  for (const [kpiId, kpi] of Object.entries(gmp)) {
    if (kpi.disaggregations) {
      for (const [disagType, disags] of Object.entries(kpi.disaggregations)) {
        for (const [label, disagKpi] of Object.entries(disags)) {
          const sanitizedLabel = label.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
          const newKpiId = `${kpiId}_${sanitizedLabel}`;
          baseData.GMP[newKpiId] = {
            baseline: kpi.baseline,
            target: kpi.target,
            data: disagKpi.data
          };
        }
      }
      delete kpi.disaggregations;
    }
  }

  return baseData;
};

// Updated generateProcessStepData with flattening
const generateProcessStepData = () => {
  const baseData = {
    MA: {
      'Application Received': {
        data: generateDecreasing(1.5, 1, { 'Q3 2023': 1.1, 'Q4 2023': 1 }, 0.5)
      },
      'Preliminary Screening': {
        data: generateDecreasing(7, 3, { 'Q4 2024': 3.2, 'Q1 2025': 3.1 }, 1),
        disaggregations: {
          applicantType: {
            'Domestic Applicant': { data: generateDecreasing(6, 2.5, { 'Q4 2024': 2.8, 'Q1 2025': 2.7 }, 0.8) },
            'Foreign Applicant - Direct': { data: generateDecreasing(8, 3.5, { 'Q4 2024': 3.6, 'Q1 2025': 3.4 }, 1.2) },
            'Foreign Applicant - Reliance': { data: generateDecreasing(7.5, 3.2, { 'Q4 2024': 3.3, 'Q1 2025': 3.1 }, 1) }
          }
        }
      },
      'Technical Dossier Review': {
        data: generateDecreasing(60, 30, {}, 3)
      },
      'Quality Review': {
        data: generateDecreasing(40, 25, {}, 2)
      },
      'Safety & Efficacy Review': {
        data: generateDecreasing(50, 35, {}, 2.5)
      },
      'Queries to Applicant': {
        data: generateDecreasing(5, 2, {}, 0.5)
      },
      'Applicant Response Review': {
        data: generateDecreasing(30, 15, {}, 2)
      },
      'Decision Issued': {
        data: generateDecreasing(8, 3, { 'Q4 2024': 3.2, 'Q1 2025': 3.1 }, 1)
      },
      'License Publication': {
        data: generateDecreasing(5, 2, { 'Q3 2023': 4, 'Q4 2023': 3.5, 'Q1 2024': 3 }, 0.5)
      }
    },
    CT: {
      'Application Received': {
        data: generateDecreasing(1.2, 1, { 'Q3 2023': 1 }, 0.3)
      },
      'Administrative Screening': {
        data: generateDecreasing(7, 3, { 'Q4 2024': 3.1, 'Q1 2025': 3 }, 1),
        disaggregations: {
          relianceType: {
            'Domestic': { data: generateDecreasing(6.5, 2.8, { 'Q4 2024': 2.9, 'Q1 2025': 2.8 }, 0.9) },
            'Reliance': { data: generateDecreasing(7.5, 3.2, { 'Q4 2024': 3.3, 'Q1 2025': 3.1 }, 1.1) }
          }
        }
      },
      'Ethics Review': {
        data: generateDecreasing(35, 25, { 'Q3 2024': 25.5, 'Q4 2024': 25.2 }, 2)
      },
      'Technical Review': {
        data: generateDecreasing(45, 30, { 'Q1 2025': 30.5 }, 3)
      },
      'GCP Inspection': {
        data: generateDecreasing(55, 40, { 'Q1 2025': 40.5 }, 3)
      },
      'Queries to Applicant': {
        data: generateDecreasing(5, 2, {}, 0.5)
      },
      'Applicant Response Review': {
        data: generateDecreasing(20, 10, { 'Q4 2024': 10.5, 'Q1 2025': 10.2 }, 1.5)
      },
      'Decision Issued': {
        data: generateDecreasing(7, 3, { 'Q4 2024': 3.1, 'Q1 2025': 3 }, 1)
      },
      'Trial Registration': {
        data: generateDecreasing(3, 1, { 'Q3 2023': 2, 'Q4 2023': 1.5, 'Q1 2024': 1.3 }, 0.3)
      }
    },
    GMP: {
      'Application Received': {
        data: generateDecreasing(1.2, 5, { 'Q3 2023': 1, 'Q2 2025': 5 }, 0.5)
      },
      'Application Screening': {
        data: generateDecreasing(4, 8, { 'Q1 2025': 2, 'Q2 2025': 8 }, 1),
        disaggregations: {
          inspectionType: {
            'On-site domestic': { data: generateDecreasing(3.5, 7, { 'Q1 2025': 1.8, 'Q2 2025': 7.5 }, 0.9) },
            'On-site foreign': { data: generateDecreasing(4.5, 9, { 'Q1 2025': 2.2, 'Q2 2025': 8.5 }, 1.2) },
            'Reliance/Joint on-site foreign': { data: generateDecreasing(4.2, 8.5, { 'Q1 2025': 2, 'Q2 2025': 8.2 }, 1.1) }
          }
        }
      },
      'Inspection Planning': {
        data: generateDecreasing(20, 10, { 'Q4 2024': 10.5, 'Q1 2025': 10.2 }, 2),
        disaggregations: {
          inspectionType: {
            'On-site domestic': { data: generateDecreasing(18, 9, { 'Q4 2024': 9.5, 'Q1 2025': 9.2 }, 1.8) },
            'On-site foreign': { data: generateDecreasing(22, 11, { 'Q4 2024': 11.5, 'Q1 2025': 11.2 }, 2.2) }
          }
        }
      },
      'Inspection Conducted': {
        data: generateDecreasing(6, 5, { 'Q3 2024': 5, 'Q4 2024': 5 }, 0.5)
      },
      'Inspection Report Drafted': {
        data: generateDecreasing(15, 7, { 'Q4 2024': 7.5, 'Q1 2025': 7.2 }, 1.5)
      },
      'CAPA Requested': {
        data: generateDecreasing(4, 2, { 'Q3 2024': 2.1, 'Q4 2024': 2 }, 0.5)
      },
      'CAPA Review': {
        data: generateDecreasing(25, 15, { 'Q3 2024': 15.5, 'Q4 2024': 15.2 }, 2)
      },
      'Final Decision Issued': {
        data: generateDecreasing(7, 3, { 'Q4 2024': 3.1, 'Q1 2025': 3 }, 1)
      },
      'Report Publication': {
        data: generateDecreasing(10, 5, { 'Q2 2023': 9, 'Q3 2023': 8, 'Q4 2023': 7, 'Q1 2024': 6.5 }, 1)
      }
    }
  };

  // Flatten disags for all processes
  for (const [process, steps] of Object.entries(baseData)) {
    for (const [stepName, step] of Object.entries(steps)) {
      if (step.disaggregations) {
        for (const [disagType, disags] of Object.entries(step.disaggregations)) {
          for (const [label, disagStep] of Object.entries(disags)) {
            const sanitizedLabel = label.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
            const newStepName = `${stepName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${sanitizedLabel}`;
            baseData[process][newStepName] = {
              data: disagStep.data
            };
          }
        }
        delete step.disaggregations;
      }
    }
  }

  return baseData;
};

// Other generators (from original, full)
const generateKpiCounts = () => ({
  MA: {
    pct_new_apps_evaluated_on_time: generateNumDen(198, 362, 220, 580, { 'Q2 2023': {numerator: 100, denominator: 240}, 'Q3 2023': {numerator: 253, denominator: 500}, 'Q4 2023': {numerator: 228, denominator: 500}, 'Q1 2024': {numerator: 208, denominator: 300}, 'Q2 2024': {numerator: 560, denominator: 600}, 'Q3 2024': {numerator: 200, denominator: 260}, 'Q4 2024': {numerator: 405, denominator: 595}, 'Q1 2025': {numerator: 400, denominator: 526}, 'Q2 2025': {numerator: 560, denominator: 800 } }, 20, 30),
    pct_renewal_apps_evaluated_on_time: generateNumDen(142, 39, 160, 30, {}, 10, 5),
    pct_variation_apps_evaluated_on_time: generateNumDen(112, 22, 130, 25, { 'Q4 2024': {numerator: 134, denominator: 155 } }, 8, 5),
    pct_fir_responses_on_time: generateNumDen(210, 50, 280, 50, {}, 15, 10),
    pct_query_responses_evaluated_on_time: generateNumDen(210, 35, 240, 40, {}, 12, 8),
    pct_granted_within_90_days: generateNumDen(75, 25, 120, 25, {}, 8, 5),
    median_duration_continental: generateSample(30, 48, {}, 5)
  },
  CT: {
    pct_new_apps_evaluated_on_time_ct: generateNumDen(42, 20, 55, 19, {}, 5, 3),
    pct_amendment_apps_evaluated_on_time: generateNumDen(35, 12, 45, 12, {}, 4, 3),
    pct_gcp_inspections_on_time: generateNumDen(10, 8, 15, 9, {}, 2, 2),
    pct_safety_reports_assessed_on_time: generateNumDen(160, 38, 180, 38, {}, 10, 5),
    pct_gcp_compliant: generateNumDen(22, 8, 25, 8, {}, 3, 2),
    pct_registry_submissions_on_time: generateNumDen(60, 14, 65, 10, {}, 5, 3),
    pct_capa_evaluated_on_time: generateNumDen(25, 8, 35, 9, {}, 3, 2),
    avg_turnaround_time: generateSample(45, 25, {}, 4)
  },
  GMP: {
    pct_facilities_inspected_on_time: generateNumDen(28, 10, 35, 8, {}, 3, 2),
    pct_inspections_waived_on_time: generateNumDen(7, 3, 9, 5, {}, 1, 1),
    pct_facilities_compliant: generateNumDen(35, 7, 45, 7, {}, 4, 2),
    pct_capa_decisions_on_time: generateNumDen(24, 7, 30, 8, {}, 3, 2),
    pct_applications_completed_on_time: generateNumDen(55, 12, 65, 11, {}, 5, 3),
    avg_turnaround_time_gmp: generateSample(40, 15, {}, 4),
    median_turnaround_time: generateSample(40, 15, {}, 4),
    pct_reports_published_on_time: generateNumDen(28, 9, 40, 9, {}, 3, 2)
  }
});

const generateQuarterlyVolumes = () => ({
  MA: quarters.map((q, i) => ({
    quarter: q,
    applications_received: Math.round(200 + i * 40 + (Math.random() * 20 - 10)),
    applications_completed: Math.round(90 + i * 50 + (Math.random() * 20 - 10)),
    fir_sent: Math.round(140 + i * 20 + (Math.random() * 10 - 5)),
    fir_responses_received: Math.round(150 + i * 20 + (Math.random() * 10 - 5)),
    query_cycles_total: Math.round(180 + i * 30 + (Math.random() * 15 - 7.5)),
    approvals_granted: Math.round(50 + i * 10 + (Math.random() * 5 - 2.5)),
    reliance_used_count: i >= 5 ? Math.round((i - 5) * 7 + (Math.random() * 4 - 2)) : 0
  })),
  CT: quarters.map((q, i) => ({
    quarter: q,
    applications_received: Math.round(i * 10 + (Math.random() * 4 - 2)),
    applications_completed: Math.round(Math.max(0, (i - 3) * 12 + (Math.random() * 4 - 2))),
    queries_sent: Math.round(i * 15 + (Math.random() * 6 - 3)),
    queries_responses_received: Math.round((i * 15) + 5 + (Math.random() * 6 - 3)),
    trials_registered: Math.round(30 + i * 5 + (Math.random() * 4 - 2)),
    gcp_inspections_requested: Math.round(Math.max(0, (i - 3) * 4 + (Math.random() * 2 - 1))),
    gcp_inspections_conducted: Math.round(Math.max(0, (i - 4) * 4 + (Math.random() * 2 - 1)))
  })),
  GMP: quarters.map((q, i) => ({
    quarter: q,
    applications_received: Math.round(55 + i * 5 + (Math.random() * 4 - 2)),
    applications_completed: Math.round(26 + i * 8 + (Math.random() * 4 - 2)),
    inspections_requested_total: Math.round(15 + i * 5 + (Math.random() * 4 - 2)),
    inspections_conducted_total: Math.round(8 + i * 4 + (Math.random() * 3 - 1.5)),
    inspections_domestic: Math.round(Math.max(0, (i - 1) * 3 + (i === 0 ? 0 : 1) + (Math.random() * 2 - 1))),
    inspections_foreign: Math.round(18 - i + (Math.random() * 2 - 1)),
    inspections_reliance_joint: i >= 5 ? Math.round((i - 4) * 2 + (Math.random() * 2 - 1)) : 0,
    capas_requested: Math.round(10 + i * 5 + (Math.random() * 4 - 2)),
    capas_closed: i >= 4 ? Math.round((i - 3) * 7 + (Math.random() * 3 - 1.5)) : 0,
    reports_published: Math.round(21 + i * 3 + (Math.random() * 3 - 1.5))
  }))
});

const generateInspectionVolumes = () => ({
  CT: quarters.map((q, i) => ({
    quarter: q,
    requested_domestic: Math.round(Math.max(0, (i - 4) * 2 + (Math.random() * 2 - 1))),
    requested_foreign: Math.round(Math.max(0, (i - 5) * 2 + (Math.random() * 2 - 1))),
    requested_reliance: Math.round(6 + (Math.random() * 2 - 1)),
    conducted_domestic: Math.round(Math.max(0, (i - 5) * 2 + (Math.random() * 2 - 1))),
    conducted_foreign: Math.round(Math.max(0, i - 2 + (Math.random() * 2 - 1))),
    conducted_reliance: Math.round(Math.max(0, (i - 4) * 1 + (Math.random() * 1 - 0.5)))
  })),
  GMP: quarters.map((q, i) => ({
    quarter: q,
    requested_domestic: Math.round(12 + i * 2 + (Math.random() * 2 - 1)),
    requested_foreign: Math.round(23 - i + (Math.random() * 2 - 1)),
    requested_reliance: i >= 3 ? Math.round((i - 2) * 2 + (Math.random() * 2 - 1)) : 0,
    requested_desk: i >= 4 ? Math.round((i - 3) * 1 + (Math.random() * 1 - 0.5)) : 0,
    conducted_domestic: Math.round(Math.max(0, (i - 1) * 3 + (i === 1 ? 1 : 0) + (Math.random() * 2 - 1))),
    conducted_foreign: Math.round(18 - i + (Math.random() * 2 - 1)),
    conducted_reliance: i >= 5 ? Math.round((i - 4) * 2 + (Math.random() * 2 - 1)) : 0,
    conducted_desk: i >= 5 ? Math.round((i - 4) * 1 + (Math.random() * 1 - 0.5)) : 0
  }))
});

const generateProcessStepCounts = () => ({
  MA: {
    'Preliminary Screening': generateStepCounts(200, 40, 0.99, 0, 2, { 'Q3 2024': {open_end_q: 5}, 'Q4 2024': {open_end_q: 10}, 'Q1 2025': {open_end_q: 15}, 'Q2 2025': {open_end_q: 20 } }, 10),
    'Technical Dossier Review': generateStepCounts(190, 40, 0.93, 0, 10, { 'Q4 2023': {open_end_q: 10}, 'Q1 2024': {open_end_q: 20}, 'Q2 2024': {open_end_q: 30}, 'Q3 2024': {open_end_q: 40}, 'Q4 2024': {open_end_q: 50}, 'Q1 2025': {open_end_q: 60}, 'Q2 2025': {open_end_q: 70 } }, 15),
    'Quality Review': generateStepCounts(230, 30, 0.95, 0, 5, { 'Q2 2023': {open_end_q: 5}, 'Q3 2023': {open_end_q: 10}, 'Q4 2023': {open_end_q: 15}, 'Q1 2024': {open_end_q: 20}, 'Q2 2024': {open_end_q: 25}, 'Q3 2024': {open_end_q: 30}, 'Q4 2024': {open_end_q: 35}, 'Q1 2025': {open_end_q: 40}, 'Q2 2025': {open_end_q: 45 } }, 12),
    'Safety & Efficacy Review': generateStepCounts(220, 30, 0.95, 22, 2, {}, 12),
    'Queries to Applicant': generateStepCounts(140, 20, 0.98, 1, 3, { 'Q1 2023': {open_end_q: 1}, 'Q2 2023': {open_end_q: 4} }, 8),
    'Applicant Response Review': generateStepCounts(130, 20, 0.97, 4, 2, {}, 8),
    'Decision Issued': generateStepCounts(110, 20, 0.93, 2, 2, {}, 8),
    'License Publication': generateStepCounts(100, 20, 0.96, 0, 2, { 'Q4 2023': {open_end_q: 2}, 'Q1 2024': {open_end_q: 4} }, 8)
  },
  CT: {
    'Administrative Screening': generateStepCounts(0, 10, 0.99, 0, 0.5, { 'Q3 2024': {open_end_q: 1}, 'Q4 2024': {open_end_q: 2}, 'Q1 2025': {open_end_q: 3}, 'Q2 2025': {open_end_q: 4 } }, 3),
    'Technical Review': generateStepCounts(0, 10, 0.84, 0, 1.5, { 'Q1 2024': {open_end_q: 2}, 'Q2 2024': {open_end_q: 4} }, 3),
    'Ethics Review': generateStepCounts(4, 9, 0.93, 0, 1.5, { 'Q2 2024': {open_end_q: 2}, 'Q3 2024': {open_end_q: 4} }, 2),
    'GCP Inspection': generateStepCounts(0, 4, 0.83, 0, 1, { 'Q3 2023': {open_end_q: 1}, 'Q4 2023': {open_end_q: 2} }, 1),
    'Queries to Applicant': generateStepCounts(0, 15, 0.98, 0, 1.5, { 'Q4 2023': {open_end_q: 2}, 'Q1 2024': {open_end_q: 4} }, 4),
    'Applicant Response Review': generateStepCounts(0, 15, 0.97, 0, 1.5, { 'Q1 2024': {open_end_q: 2}, 'Q2 2024': {open_end_q: 4} }, 4),
    'Decision Issued': generateStepCounts(0, 11, 0.96, 0, 0.8, { 'Q4 2023': {open_end_q: 1}, 'Q1 2024': {open_end_q: 2} }, 3),
    'Trial Registration': generateStepCounts(30, 5, 1, 2, 0, {}, 3)
  },
  GMP: {
    'Application Screening': generateStepCounts(55, 5, 1.1, 0, 0.7, { 'Q4 2024': {open_end_q: 2}, 'Q1 2025': {open_end_q: 4}, 'Q2 2025': {open_end_q: 6} }, 3),
    'Inspection Planning': generateStepCounts(15, 5, 1, 0, 2, { 'Q1 2024': {open_end_q: 3}, 'Q2 2024': {open_end_q: 6} }, 3),
    'Inspection Conducted': generateStepCounts(5, 5, 1.1, 0, 1, { 'Q3 2024': {open_end_q: 2}, 'Q4 2024': {open_end_q: 4} }, 2),
    'Inspection Report Drafted': generateStepCounts(10, 4, 1.1, 0, 1, { 'Q3 2023': {open_end_q: 1}, 'Q4 2023': {open_end_q: 2} }, 2),
    'CAPA Requested': generateStepCounts(10, 5, 1.1, 0, 1.5, { 'Q1 2024': {open_end_q: 2}, 'Q2 2024': {open_end_q: 4} }, 3),
    'CAPA Review': generateStepCounts(5, 5, 0.7, 2, 2, { 'Q1 2023': {completed_q: 0}, 'Q2 2023': {completed_q: 0} }, 2),
    'Final Decision Issued': generateStepCounts(8, 4, 0.93, 0, 0.8, { 'Q4 2023': {open_end_q: 1}, 'Q1 2024': {open_end_q: 2} }, 2),
    'Report Publication': generateStepCounts(14, 4, 1.1, 0, 0.7, { 'Q1 2024': {open_end_q: 1}, 'Q2 2024': {open_end_q: 2} }, 2)
  }
});

const generateBottleneckData = () => ({
  MA: {
    'Technical Dossier Review': generateBottleneck('MA', 'Technical Dossier Review', {
      touch_median_days: { start: 20, end: 11, variability: 1 },
      touch_p90_days: { start: 38, end: 20, variability: 2 },
      wait_median_days: { start: 26, end: 17, variability: 1.5 },
      wait_share_pct: { start: 76, end: 58, irregularities: { 'Q4 2023': 70 }, variability: 3 },
      wip_count: { start: 0, end: 70, irregularities: { 'Q1 2023': 0, 'Q2 2023': 0, 'Q3 2023': 0, 'Q4 2023': 10 }, variability: 5 },
      capacity_cases_q: { start: 15, end: 60, variability: 4 },
      wip_cap_ratio: { start: 1, end: 1.17, irregularities: { 'Q1 2025': 1.09 }, variability: 0.05 },
      incoming_cases_q: { start: 190, end: 550, variability: 20 },
      work_to_staff_ratio: { start: 0.75, end: 1.2, variability: 0.1 },
      cap_ratio_hours: { start: 0.64, end: 0.91, variability: 0.05 },
      throughput_util: { start: 0.68, end: 0.95, variability: 0.05 },
      opening_backlog: { start: 105, end: 60, irregularities: { 'Q1 2023': 105, 'Q2 2023': 100 }, variability: 5 },
      closing_backlog: { start: 0, end: 70, variability: 5 },
      carry_over_rate: { start: 0, end: 0.24, irregularities: { 'Q3 2023': 0.03 }, variability: 0.02 },
      age_0_30: { start: 12, end: 30, variability: 2 },
      age_31_60: { start: 0, end: 24, irregularities: { 'Q1 2023': 0, 'Q2 2023': 0 }, variability: 2 },
      age_61_90: { start: 0, end: 10, irregularities: { 'Q1 2023': 0 }, variability: 1 },
      age_90_plus: { start: 0, end: 6, irregularities: { 'Q1 2023': 0 }, variability: 1 },
      avg_query_cycles: { start: 1, end: 1.3, irregularities: { 'Q1 2025': 1.2 }, variability: 0.1 },
      p90_query_cycles: { start: 3, end: 3, variability: 0.2 },
      fpy_pct: { start: 78, end: 60, irregularities: { 'Q3 2023': 74 }, variability: 3 }
    }),
    'Queries to Applicant': generateBottleneck('MA', 'Queries to Applicant', {
      ext_median_days: { start: 17, end: 8, variability: 1 },
      ext_p90_days: { start: 34, end: 16, variability: 2 },
      ext_past_sla_pct: { start: 54, end: 18, variability: 3 },
      ext_sla_days: { start: 10, end: 10, variability: 0 },
      touch_median_days: { start: 3.6, end: 1.8, variability: 0.5 },
      touch_p90_days: { start: 6.4, end: 2.8, variability: 0.5 },
      wait_median_days: { start: 1.8, end: 0.9, variability: 0.3 },
      wait_share_pct: { start: 33, end: 33, variability: 2 },
      wip_count: { start: 1, end: 28, variability: 2 },
      capacity_cases_q: { start: 160, end: 340, variability: 10 },
      wip_cap_ratio: { start: 0, end: 0.08, variability: 0.01 },
      incoming_cases_q: { start: 140, end: 320, variability: 10 },
      work_to_staff_ratio: { start: 0.94, end: 0.94, variability: 0.05 },
      cap_ratio_hours: { start: 0.48, end: 0.75, variability: 0.05 },
      throughput_util: { start: 0.56, end: 0.83, variability: 0.05 },
      opening_backlog: { start: 34, end: 25, variability: 2 },
      closing_backlog: { start: 1, end: 28, variability: 2 },
      carry_over_rate: { start: 0, end: 0.09, variability: 0.01 },
      age_0_30: { start: 3, end: 21, variability: 2 },
      age_31_60: { start: 0, end: 6, variability: 1 },
      age_61_90: { start: 1, end: 1, variability: 0.5 },
      age_90_plus: { start: 0, end: 0, variability: 0 },
      avg_query_cycles: { start: 2, end: 1.7, variability: 0.1 },
      p90_query_cycles: { start: 3, end: 3, variability: 0.2 },
      fpy_pct: { start: 42, end: 60, variability: 3 }
    }),
    'Decision Issued': generateBottleneck('MA', 'Decision Issued', {
      ext_median_days: { start: 12, end: 3, variability: 1 },
      ext_p90_days: { start: 25, end: 7, variability: 1.5 },
      ext_past_sla_pct: { start: 36, end: 9, variability: 2 },
      ext_sla_days: { start: 7, end: 7, variability: 0 },
      touch_median_days: { start: 4.1, end: 2.3, variability: 0.5 },
      touch_p90_days: { start: 8.5, end: 4.0, variability: 0.5 },
      wait_median_days: { start: 2.8, end: 1.0, variability: 0.3 },
      wait_share_pct: { start: 48, end: 30, variability: 3 },
      wip_count: { start: 2, end: 20, variability: 2 },
      capacity_cases_q: { start: 140, end: 320, variability: 10 },
      wip_cap_ratio: { start: 0, end: 0.06, variability: 0.01 },
      incoming_cases_q: { start: 110, end: 290, variability: 10 },
      work_to_staff_ratio: { start: 0.82, end: 0.91, variability: 0.05 },
      cap_ratio_hours: { start: 0.62, end: 0.8, variability: 0.05 },
      throughput_util: { start: 0.69, end: 0.87, variability: 0.05 },
      opening_backlog: { start: 36, end: 18, variability: 2 },
      closing_backlog: { start: 2, end: 20, variability: 2 },
      carry_over_rate: { start: 0, end: 0.07, variability: 0.01 },
      age_0_30: { start: 0, end: 15, variability: 2 },
      age_31_60: { start: 4, end: 4, variability: 1 },
      age_61_90: { start: 1, end: 1, variability: 0.5 },
      age_90_plus: { start: 0, end: 0, variability: 0 },
      avg_query_cycles: { start: 0, end: 0.2, variability: 0.05 },
      p90_query_cycles: { start: 1, end: 1, variability: 0.1 },
      fpy_pct: { start: 84, end: 93, variability: 3 }
    })
  },
  CT: {
    'Technical Review': generateBottleneck('CT', 'Technical Review', {
      ext_median_days: { start: 14, end: 5, variability: 1 },
      ext_p90_days: { start: 30, end: 12, variability: 2 },
      ext_past_sla_pct: { start: 39, end: 12, variability: 3 },
      ext_sla_days: { start: 10, end: 10, variability: 0 },
      touch_median_days: { start: 22, end: 13, variability: 1.5 },
      touch_p90_days: { start: 40, end: 22, variability: 2 },
      wait_median_days: { start: 18, end: 9, variability: 1 },
      wait_share_pct: { start: 50, end: 41, variability: 3 },
      wip_count: { start: 0, end: 12, variability: 2 },
      capacity_cases_q: { start: 40, end: 85, variability: 5 },
      wip_cap_ratio: { start: 0, end: 0.14, variability: 0.02 },
      incoming_cases_q: { start: 0, end: 88, variability: 5 },
      work_to_staff_ratio: { start: 0.46, end: 1.18, variability: 0.1 },
      cap_ratio_hours: { start: 0.63, end: 0.9, variability: 0.05 },
      throughput_util: { start: 0.74, end: 0.92, variability: 0.05 },
      opening_backlog: { start: 28, end: 10, variability: 2 },
      closing_backlog: { start: 0, end: 12, variability: 2 },
      carry_over_rate: { start: 0, end: 0.14, variability: 0.02 },
      age_0_30: { start: 0, end: 8, variability: 1 },
      age_31_60: { start: 0, end: 3, variability: 1 },
      age_61_90: { start: 1, end: 1, variability: 0.5 },
      age_90_plus: { start: 0, end: 0, variability: 0 },
      avg_query_cycles: { start: 1, end: 1.3, variability: 0.1 },
      p90_query_cycles: { start: 3, end: 3, variability: 0.2 },
      fpy_pct: { start: 48, end: 66, variability: 3 }
    }),
    'GCP Inspection': generateBottleneck('CT', 'GCP Inspection', {
      ext_median_days: { start: 16, end: 7, variability: 1 },
      ext_p90_days: { start: 34, end: 16, variability: 2 },
      ext_past_sla_pct: { start: 34, end: 16, variability: 3 },
      ext_sla_days: { start: 15, end: 15, variability: 0 },
      touch_median_days: { start: 5.6, end: 3.8, variability: 0.5 },
      touch_p90_days: { start: 11.0, end: 6.5, variability: 1 },
      wait_median_days: { start: 20, end: 11, variability: 1.5 },
      wait_share_pct: { start: 83, end: 74, variability: 3 },
      wip_count: { start: 0, end: 8, variability: 1 },
      capacity_cases_q: { start: 10, end: 28, variability: 2 },
      wip_cap_ratio: { start: 0, end: 0.29, variability: 0.03 },
      incoming_cases_q: { start: 0, end: 28, variability: 2 },
      work_to_staff_ratio: { start: 0.39, end: 1.02, variability: 0.1 },
      cap_ratio_hours: { start: 0.52, end: 0.7, variability: 0.05 },
      throughput_util: { start: 0.53, end: 0.8, variability: 0.05 },
      opening_backlog: { start: 16, end: 7, variability: 1 },
      closing_backlog: { start: 0, end: 8, variability: 1 },
      carry_over_rate: { start: 0.06, end: 0.24, variability: 0.02 },
      age_0_30: { start: 0, end: 6, variability: 1 },
      age_31_60: { start: 1, end: 1, variability: 0.5 },
      age_61_90: { start: 1, end: 1, variability: 0.5 },
      age_90_plus: { start: 0, end: 0, variability: 0 },
      sched_median_days: { start: 38, end: 20, variability: 2 },
      sched_p90_days: { start: 72, end: 36, variability: 3 },
      sched_past_sla_pct: { start: 49, end: 22, variability: 3 },
      sched_sla_days: { start: 20, end: 20, variability: 0 }
    })
  },
  GMP: {
    'Inspection Planning': generateBottleneck('GMP', 'Inspection Planning', {
      ext_median_days: { start: 20, end: 11, variability: 1.5 },
      ext_p90_days: { start: 46, end: 28, variability: 2 },
      ext_past_sla_pct: { start: 52, end: 25, variability: 3 },
      ext_sla_days: { start: 20, end: 20, variability: 0 },
      touch_median_days: { start: 10.0, end: 5.5, variability: 1 },
      touch_p90_days: { start: 18, end: 9, variability: 1 },
      wait_median_days: { start: 22, end: 13, variability: 1.5 },
      wait_share_pct: { start: 70, end: 70, variability: 3 },
      wip_count: { start: 0, end: 18, variability: 2 },
      capacity_cases_q: { start: 34, end: 52, variability: 3 },
      wip_cap_ratio: { start: 0, end: 0.35, variability: 0.03 },
      incoming_cases_q: { start: 15, end: 60, variability: 4 },
      work_to_staff_ratio: { start: 0.7, end: 1.15, variability: 0.1 },
      cap_ratio_hours: { start: 0.48, end: 0.75, variability: 0.05 },
      throughput_util: { start: 0.64, end: 0.82, variability: 0.05 },
      opening_backlog: { start: 24, end: 15, variability: 2 },
      closing_backlog: { start: 0, end: 18, variability: 2 },
      carry_over_rate: { start: 0, end: 0.25, variability: 0.02 },
      age_0_30: { start: 1, end: 10, variability: 1 },
      age_31_60: { start: 0, end: 5, variability: 1 },
      age_61_90: { start: 2, end: 2, variability: 0.5 },
      age_90_plus: { start: 0, end: 1, variability: 0.5 },
      sched_median_days: { start: 44, end: 26, variability: 2 },
      sched_p90_days: { start: 95, end: 50, variability: 4 },
      sched_past_sla_pct: { start: 75, end: 30, variability: 4 },
      sched_sla_days: { start: 30, end: 30, variability: 0 }
    }),
    'CAPA Review': generateBottleneck('GMP', 'CAPA Review', {
      ext_median_days: { start: 34, end: 16, variability: 2 },
      ext_p90_days: { start: 80, end: 35, variability: 3 },
      ext_past_sla_pct: { start: 62, end: 26, variability: 3 },
      ext_sla_days: { start: 30, end: 30, variability: 0 },
      touch_median_days: { start: 11.0, end: 6.5, variability: 1 },
      touch_p90_days: { start: 20, end: 11, variability: 1.5 },
      wait_median_days: { start: 14.0, end: 9.5, variability: 1 },
      wait_share_pct: { start: 59, end: 59, variability: 3 },
      wip_count: { start: 2, end: 20, variability: 2 },
      capacity_cases_q: { start: 24, end: 42, variability: 3 },
      wip_cap_ratio: { start: 0, end: 0.48, variability: 0.04 },
      incoming_cases_q: { start: 5, end: 50, variability: 3 },
      work_to_staff_ratio: { start: 0.56, end: 1.19, variability: 0.1 },
      cap_ratio_hours: { start: 0.64, end: 0.82, variability: 0.05 },
      throughput_util: { start: 0.62, end: 0.8, variability: 0.05 },
      opening_backlog: { start: 36, end: 18, variability: 2 },
      closing_backlog: { start: 2, end: 20, variability: 2 },
      carry_over_rate: { start: 0, end: 0.27, variability: 0.02 },
      age_0_30: { start: 1, end: 10, variability: 1 },
      age_31_60: { start: 0, end: 7, variability: 1 },
      age_61_90: { start: 2, end: 2, variability: 0.5 },
      age_90_plus: { start: 1, end: 1, variability: 0.5 },
      avg_query_cycles: { start: 2, end: 1.5, variability: 0.2 },
      p90_query_cycles: { start: 3, end: 3, variability: 0.2 },
      fpy_pct: { start: 42, end: 60, variability: 3 }
    }),
    'Report Publication': generateBottleneck('GMP', 'Report Publication', {
      ext_median_days: { start: 14, end: 5, variability: 1 },
      ext_p90_days: { start: 28, end: 10, variability: 1.5 },
      ext_past_sla_pct: { start: 28, end: 10, variability: 2 },
      ext_sla_days: { start: 10, end: 10, variability: 0 },
      touch_median_days: { start: 3.8, end: 2.0, variability: 0.5 },
      touch_p90_days: { start: 6.2, end: 3.5, variability: 0.5 },
      wait_median_days: { start: 2.1, end: 1.2, variability: 0.3 },
      wait_share_pct: { start: 37, end: 37, variability: 2 },
      wip_count: { start: 0, end: 6, variability: 1 },
      capacity_cases_q: { start: 34, end: 52, variability: 3 },
      wip_cap_ratio: { start: 0, end: 0.12, variability: 0.01 },
      incoming_cases_q: { start: 14, end: 50, variability: 3 },
      work_to_staff_ratio: { start: 0.6, end: 0.96, variability: 0.05 },
      cap_ratio_hours: { start: 0.58, end: 0.76, variability: 0.05 },
      throughput_util: { start: 0.72, end: 0.9, variability: 0.05 },
      opening_backlog: { start: 14, end: 5, variability: 1 },
      closing_backlog: { start: 0, end: 6, variability: 1 },
      carry_over_rate: { start: 0.02, end: 0.11, variability: 0.01 },
      age_0_30: { start: 0, end: 5, variability: 1 },
      age_31_60: { start: 1, end: 1, variability: 0.5 },
      age_61_90: { start: 0, end: 0, variability: 0 },
      age_90_plus: { start: 0, end: 0, variability: 0 },
      avg_query_cycles: { start: 0, end: 0.3, variability: 0.05 },
      p90_query_cycles: { start: 1, end: 1, variability: 0.1 },
      fpy_pct: { start: 82, end: 91, variability: 3 }
    })
  }
});

// Full data generator
const generateFullData = () => ({
  quarterlyData: generateQuarterlyData(),
  processStepData: generateProcessStepData(),
  kpiCounts: generateKpiCounts(),
  quarterlyVolumes: generateQuarterlyVolumes(),
  inspectionVolumes: generateInspectionVolumes(),
  bottleneckData: generateBottleneckData(),
  processStepCounts: generateProcessStepCounts()
});

// To generate JSON: console.log(JSON.stringify(generateFullData(), null, 2));