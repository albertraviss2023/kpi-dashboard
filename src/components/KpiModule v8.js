// KpiModule.js — Production UI (sleek, interactive, accessible)
// - Overview: KPI rail with status colors, sparklines, sticky banner, disaggregation chips,
//             insights donuts, process step bars, process table with CSV, step trend modal
// - Reports: volumes (with toggles), Bottleneck curated metrics, fullscreen charts, CSVs
// - Global: command palette (Ctrl/⌘+K), deep-link (URL query sync), compare mode,
//           skeletons/empty states, a11y, reduced motion, performance-conscious
//
// NOTE: No new external dependencies. Works with your existing data imports.

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Grid,
  Paper,
  Stack,
  Typography,
  Avatar,
  Chip,
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
  LinearProgress,
  CssBaseline,
  Divider,
  Tooltip,
} from "@mui/material";
import { ThemeProvider, createTheme, alpha as muiAlpha } from "@mui/material/styles";
import {
  Assessment,
  BarChart,
  Assignment,
  Science,
  Gavel,
  ArrowUpward,
  ArrowDownward,
  TrendingFlat,
  Brightness4,
  Brightness7,
  GetApp,
  CheckCircleOutline,
  ShowChart,
  WarningAmberRounded,
  ErrorOutline,
  Close,
  OpenInFull,
  InfoOutlined,
} from "@mui/icons-material";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Line, Doughnut } from "react-chartjs-2";

import ndaLogo from "../assets/nda-logo.png";
import {
  quarterlyData,
  processStepData,
  quarterlyVolumes,
  inspectionVolumes,
  bottleneckData,
  kpiCounts,
} from "../data/kpiData";

/* ---------- ChartJS registration ---------- */
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  ChartTooltip,
  Legend,
  Filler
);

/* ---------- tokens & helpers ---------- */
const NDA_GREEN = "#2E7D32";
const NDA_GREEN_DARK = "#1B5E20";
const TRUE_AMBER = "#FFB300"; // true amber
const paletteTokens = {
  primary: NDA_GREEN,
  accent: "#2c58dd",
  ok: "#2E7D32",
  warn: TRUE_AMBER,
  bad: "#C62828",
  info: "#1976D2",
};
const alpha = (hex, a) => {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

const exportToCSV = (rows, columns, filename) => {
  if (!rows || rows.length === 0) return;
  const headers = columns.map((c) => c.label);
  const csv = [
    headers.join(","),
    ...rows.map((row) => columns.map((c) => String(row[c.key] ?? "—")).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

// “thick bars”
const ThickBarProps = {
  borderWidth: 1,
  borderRadius: 6,
  barPercentage: 0.95,
  categoryPercentage: 0.9,
  maxBarThickness: 48,
};

const ValueLabelPlugin = {
  id: "valueLabelPlugin",
  afterDatasetsDraw(chart) {
    const { ctx, data, chartArea } = chart;
    const metas = chart.getSortedVisibleDatasetMetas?.() || [];
    ctx.save();
    ctx.font = "11px Inter, system-ui, -apple-system, Segoe UI, Roboto";
    ctx.fillStyle = chart.options.color || "#222";
    metas.forEach((meta) => {
      const ds = data.datasets?.[meta.index];
      if (!ds) return;
      meta.data?.forEach((el, i) => {
        const raw = ds.data?.[i];
        if (raw == null || isNaN(raw)) return;
        const val = Number.isInteger(raw)
          ? Number(raw).toLocaleString()
          : Number(raw).toFixed(2);
        const x = el.x;
        const y = el.y - 6;
        if (y > chartArea.top - 6) {
          ctx.textAlign = "center";
          ctx.fillText(val, x, y);
        }
      });
    });
    ctx.restore();
  },
};

/* ---------- status helpers ---------- */
const statusColor = (status, t) => {
  if (status === "success") return t?.palette?.success?.main || paletteTokens.ok;
  if (status === "warning") return t?.palette?.warning?.main || paletteTokens.warn;
  return t?.palette?.error?.main || paletteTokens.bad;
};
const statusBg = (status, t) => muiAlpha(statusColor(status, t), 0.14);
const statusIcon = (status) =>
  status === "success" ? (
    <CheckCircleOutline fontSize="small" />
  ) : status === "warning" ? (
    <WarningAmberRounded fontSize="small" />
  ) : (
    <ErrorOutline fontSize="small" />
  );

/* ---------- dictionaries ---------- */
const KPI_NAME_MAP = {
  pct_new_apps_evaluated_on_time: {
    short: "New Apps on Time",
    long: "Percentage of New Applications Evaluated On Time",
  },
  pct_renewal_apps_evaluated_on_time: {
    short: "Renewals on Time",
    long: "Percentage of Renewal Applications Evaluated On Time",
  },
  pct_variation_apps_evaluated_on_time: {
    short: "Variations on Time",
    long: "Percentage of Variation Applications Evaluated On Time",
  },
  pct_fir_responses_on_time: {
    short: "F.I.R Responses on Time",
    long: "Percentage of Further Information Responses On Time",
  },
  pct_query_responses_evaluated_on_time: {
    short: "Query Responses on Time",
    long: "Percentage of Query Responses Evaluated On Time",
  },
  pct_granted_within_90_days: {
    short: "Granted ≤ 90 Days",
    long: "Percentage of Applications Granted Within 90 Days",
  },
  median_duration_continental: {
    short: "Median Duration",
    long: "Median Duration to Grant (Days, Continental)",
  },
  pct_new_apps_evaluated_on_time_ct: {
    short: "CT New Apps on Time",
    long: "Clinical Trials: Percentage of New Applications Evaluated On Time",
  },
  pct_amendment_apps_evaluated_on_time: {
    short: "Amendments on Time",
    long: "Clinical Trials: % of Amendment Applications Evaluated On Time",
  },
  pct_gcp_inspections_on_time: {
    short: "GCP Inspections on Time",
    long: "Clinical Trials: % of GCP Inspections Completed On Time",
  },
  pct_safety_reports_assessed_on_time: {
    short: "Safety Reports on Time",
    long: "Clinical Trials: % of Safety Reports Assessed On Time",
  },
  pct_gcp_compliant: {
    short: "GCP Compliant",
    long: "Clinical Trials: % of Sites Compliant with GCP",
  },
  pct_registry_submissions_on_time: {
    short: "Registry on Time",
    long: "Clinical Trials: % of Registry Submissions On Time",
  },
  pct_capa_evaluated_on_time: {
    short: "CAPA on Time",
    long: "Clinical Trials: % of CAPA Evaluations Completed On Time",
  },
  avg_turnaround_time: {
    short: "Avg TAT (Days)",
    long: "Clinical Trials: Average Turnaround Time (Days)",
  },
  pct_facilities_inspected_on_time: {
    short: "Facilities Inspected on Time",
    long: "GMP: % of Facilities Inspected On Time",
  },
  pct_inspections_waived_on_time: {
    short: "Waivers on Time",
    long: "GMP: % of Inspections Waived On Time",
  },
  pct_facilities_compliant: {
    short: "Facilities Compliant",
    long: "GMP: % of Facilities Compliant",
  },
  pct_capa_decisions_on_time: {
    short: "CAPA Decisions on Time",
    long: "GMP: % of CAPA Decisions on Time",
  },
  pct_applications_completed_on_time: {
    short: "Apps Completed on Time",
    long: "GMP: % of Applications Completed On Time",
  },
  avg_turnaround_time_gmp: {
    short: "Avg TAT (GMP)",
    long: "GMP: Average Turnaround Time (Days)",
  },
  median_turnaround_time: {
    short: "Median TAT",
    long: "GMP: Median Turnaround Time (Days)",
  },
  pct_reports_published_on_time: {
    short: "Reports on Time",
    long: "GMP: % of Reports Published On Time",
  },
};

const timeBasedKpis = new Set([
  "median_duration_continental",
  "avg_turnaround_time",
  "avg_turnaround_time_gmp",
  "median_turnaround_time",
]);

// KPIs that should drive the step panel in MEDIAN mode
const medianModeKpis = new Set([
  "median_duration_continental",
  "median_turnaround_time",
]);

/* ---------- Map KPI → relevant process steps ---------- */
const KPI_TO_STEPS = {
  MA: {
    pct_new_apps_evaluated_on_time: [
      "Preliminary Screening","Technical Dossier Review","Quality Review",
      "Safety & Efficacy Review","Queries to Applicant","Applicant Response Review",
      "Decision Issued","License Publication",
    ],
    pct_renewal_apps_evaluated_on_time: [
      "Preliminary Screening","Technical Dossier Review","Decision Issued",
    ],
    pct_variation_apps_evaluated_on_time: [
      "Preliminary Screening","Technical Dossier Review","Decision Issued",
    ],
    pct_fir_responses_on_time: ["Queries to Applicant"],
    pct_query_responses_evaluated_on_time: ["Applicant Response Review"],
    pct_granted_within_90_days: [
      "Technical Dossier Review","Queries to Applicant","Applicant Response Review","Decision Issued",
    ],
    median_duration_continental: [
      "Preliminary Screening","Technical Dossier Review","Quality Review",
      "Safety & Efficacy Review","Queries to Applicant","Applicant Response Review",
      "Decision Issued","License Publication",
    ],
  },
  CT: {
    pct_new_apps_evaluated_on_time_ct: [
      "Administrative Screening","Ethics Review","Technical Review",
      "GCP Inspection","Applicant Response Review","Decision Issued","Trial Registration",
    ],
    pct_amendment_apps_evaluated_on_time: [
      "Administrative Screening","Technical Review","Decision Issued",
    ],
    pct_gcp_inspections_on_time: ["GCP Inspection"],
    pct_safety_reports_assessed_on_time: ["Technical Review"],
    pct_gcp_compliant: ["GCP Inspection"],
    pct_registry_submissions_on_time: ["Trial Registration"],
    pct_capa_evaluated_on_time: ["Applicant Response Review"],
    avg_turnaround_time: [
      "Administrative Screening","Ethics Review","Technical Review",
      "GCP Inspection","Applicant Response Review","Decision Issued",
    ],
  },
  GMP: {
    pct_facilities_inspected_on_time: ["Inspection Planning","Inspection Conducted","Inspection Report Drafted"],
    pct_inspections_waived_on_time: ["Inspection Planning"],
    pct_facilities_compliant: ["Inspection Conducted","CAPA Review","Final Decision Issued"],
    pct_capa_decisions_on_time: ["CAPA Requested","CAPA Review","Final Decision Issued"],
    pct_applications_completed_on_time: ["Application Screening","Inspection Planning","Inspection Conducted","Final Decision Issued"],
    avg_turnaround_time_gmp: [
      "Application Screening","Inspection Planning","Inspection Conducted",
      "Inspection Report Drafted","CAPA Requested","CAPA Review",
      "Final Decision Issued","Report Publication",
    ],
    median_turnaround_time: [
      "Application Screening","Inspection Planning","Inspection Conducted",
      "Inspection Report Drafted","CAPA Requested","CAPA Review",
      "Final Decision Issued","Report Publication",
    ],
    pct_reports_published_on_time: ["Report Publication"],
  },
};

/* ---------- strip header ---------- */
const SectionStrip = ({ title, icon = null }) => (
  <Box
    sx={(t) => ({
      position: "relative",
      display: "inline-flex",
      alignItems: "center",
      gap: 1,
      px: 2.2,
      py: 0.8,
      mb: 1.5,
      color: t.palette.primary.main,
      fontWeight: 900,
      textTransform: "none",
      background: muiAlpha(t.palette.primary.main, 0.12),
      borderLeft: `6px solid ${t.palette.primary.main}`,
      clipPath: "polygon(0% 0%, 95% 0%, 100% 50%, 95% 100%, 0% 100%)",
    })}
  >
    {icon}
    <Typography variant="subtitle1" fontWeight={900} color="primary">
      {title}
    </Typography>
  </Box>
);

/* ---------- KPI→Volume mapping ---------- */
const KPI_TO_VOLUME_MAPPING = {
  CT: {
    pct_gcp_inspections_on_time: {
      keys: ["gcp_inspections_requested", "gcp_inspections_conducted"],
      label: "GCP Inspections",
      source: "qv",
    },
  },
};

function datasetsFromCounts(proc, kpiKey) {
  const series = kpiCounts?.[proc]?.[kpiKey];
  if (!Array.isArray(series)) return null;
  const labels = series.map((s) => s.quarter);
  return {
    labels,
    datasets: [
      {
        label: "On time",
        data: series.map((s) => (Number.isFinite(s.numerator) ? s.numerator : null)),
        backgroundColor: alpha(paletteTokens.ok, 0.75),
        borderColor: paletteTokens.ok,
        stack: "counts",
        yAxisID: "y",
        ...ThickBarProps,
      },
      {
        label: "Total",
        data: series.map((s) => (Number.isFinite(s.denominator) ? s.denominator : null)),
        backgroundColor: alpha(paletteTokens.accent, 0.6),
        borderColor: paletteTokens.accent,
        stack: "counts",
        yAxisID: "y",
        ...ThickBarProps,
      },
    ],
  };
}

function datasetsFromVolumes(proc, kpiKey) {
  const map = KPI_TO_VOLUME_MAPPING?.[proc]?.[kpiKey];
  if (!map || !Array.isArray(map.keys) || map.keys.length === 0) return null;

  const useQV = map.source !== "iv";
  const block = useQV ? (quarterlyVolumes[proc] || []) : (inspectionVolumes[proc] || []);
  const labels = block.map((d) => d.quarter);

  const palette = [
    { bg: alpha(paletteTokens.primary, 0.75), border: paletteTokens.primary },
    { bg: alpha(paletteTokens.info, 0.65), border: paletteTokens.info },
    { bg: alpha(paletteTokens.warn, 0.55), border: paletteTokens.warn },
  ];

  const datasets = map.keys.map((key, idx) => ({
    label:
      map.label && map.keys.length === 1
        ? map.label
        : key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    data: block.map((d) => (d[key] == null ? null : d[key])),
    backgroundColor: palette[idx % palette.length].bg,
    borderColor: palette[idx % palette.length].border,
    stack: map.keys.length > 1 ? "vols" : undefined,
    yAxisID: "y",
    ...ThickBarProps,
  }));

  return { labels, datasets };
}

// Generic fallback
function volumeSelectorForKpi(processKey, kpiId) {
  if (processKey === "MA") {
    return { key: "applications_completed", label: "Applications Completed" };
  }
  if (processKey === "CT") {
    if (kpiId === "pct_gcp_inspections_on_time") {
      return { key: "gcp_inspections_conducted", label: "GCP Inspections Conducted" };
    }
    return { key: "applications_completed", label: "Applications Completed" };
  }
  return { key: "inspections_conducted_total", label: "Inspections Conducted" };
}
function datasetsFromGenericVolumes(proc, kpiKey) {
  const qv = quarterlyVolumes[proc] || [];
  const iv = inspectionVolumes[proc] || [];
  const labels = (qv.length ? qv : iv).map((d) => d.quarter);
  const { key, label } = volumeSelectorForKpi(proc, kpiKey || "");
  const src = qv.length ? qv : iv;
  return {
    labels,
    datasets: [
      {
        label,
        data: src.map((v) => (v[key] == null ? null : v[key])),
        backgroundColor: alpha(paletteTokens.primary, 0.75),
        borderColor: paletteTokens.primary,
        yAxisID: "y",
        ...ThickBarProps,
      },
    ],
  };
}

/* ---------- tiny label for plot title ---------- */
const tinyLabelForKpi = (kpiId) => {
  const short = KPI_NAME_MAP[kpiId]?.short || kpiId;
  let t = short
    .replace(/on time/i, "")
    .replace(/avg /i, "average ")
    .replace(/\s{2,}/g, " ")
    .trim();
  t = t
    .replace(/\bApps\b/i, "Applications")
    .replace(/\bCT\b/i, "Clinical trials")
    .replace(/TAT.*$/i, "turnaround time");
  return t.charAt(0).toLowerCase() + t.slice(1);
};

/* ---------- small comps ---------- */
const TrendIcon = ({ trend, isTimeBased }) => {
  const sx = { verticalAlign: "middle", fontSize: 18 };
  if (isTimeBased) {
    if (trend === "down") return <ArrowDownward color="success" sx={sx} />;
    if (trend === "up") return <ArrowUpward color="error" sx={sx} />;
  } else {
    if (trend === "up") return <ArrowUpward color="success" sx={sx} />;
    if (trend === "down") return <ArrowDownward color="error" sx={sx} />;
  }
  return <TrendingFlat color="warning" sx={sx} />;
};

const Donut = ({ labels, data, palette = [paletteTokens.ok, paletteTokens.warn, paletteTokens.bad] }) => {
  const dataset = {
    labels,
    datasets: [
      {
        data,
        backgroundColor: palette.slice(0, data.length),
        borderColor: "#fff",
        borderWidth: 2,
        hoverOffset: 8,
      },
    ],
  };
  return (
    <Doughnut
      data={dataset}
      options={{
        cutout: "70%",
        plugins: { legend: { display: false } },
        maintainAspectRatio: false,
        responsive: true,
        animation: false,
      }}
    />
  );
};

/* ---------- helper: read step median from bottleneckData ---------- */
function getStepMedianForQuarter(processKey, stepName, quarter) {
  const rows = (bottleneckData[processKey] || {})[stepName] || [];
  const row = rows.find((r) => r.quarter === quarter);
  if (!row) return null;

  if (typeof row.ext_median_days === "number") return row.ext_median_days;
  if (typeof row.sched_median_days === "number") return row.sched_median_days;

  const touch = typeof row.touch_median_days === "number" ? row.touch_median_days : 0;
  const wait = typeof row.wait_median_days === "number" ? row.wait_median_days : 0;
  const total = touch + wait;
  return total > 0 ? total : null;
}

/* =====================================================================
   NEW: Utils — URL sync, Fullscreen, Sparkline, Command Palette, Skeleton
===================================================================== */
const lastN = (series = [], n = 6) => series.slice(Math.max(0, series.length - n));

/** URL state sync without react-router dependency */
const useUrlState = (stateObj, setters) => {
  // read on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    Object.entries(setters).forEach(([key, setter]) => {
      const val = params.get(key);
      if (val != null && setter) setter(val);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // write on state change
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    Object.entries(stateObj).forEach(([k, v]) => {
      if (v == null || v === "") params.delete(k);
      else params.set(k, v);
    });
    const url = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", url);
  }, [JSON.stringify(stateObj)]);
};

const FullscreenChart = ({ title, children, actionId }) => {
  const [open, setOpen] = useState(false);
  return (
    <Box position="relative">
      <Tooltip title="Fullscreen">
        <IconButton
          aria-label={`Fullscreen ${actionId || title}`}
          onClick={() => setOpen(true)}
          size="small"
          sx={{ position: "absolute", right: 8, top: 8, zIndex: 2 }}
        >
          <OpenInFull fontSize="small" />
        </IconButton>
      </Tooltip>
      <Box>{children}</Box>

      {open && (
        <Paper
          role="dialog"
          aria-modal="true"
          elevation={8}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          sx={{
            position: "fixed",
            inset: 0,
            zIndex: (t) => t.zIndex.modal + 10,
            bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(10,10,10,0.95)" : "rgba(255,255,255,0.98)"),
            p: { xs: 1, md: 2 },
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="h6" fontWeight={900}>{title}</Typography>
            <IconButton aria-label="Close fullscreen" onClick={() => setOpen(false)}><Close /></IconButton>
          </Stack>
          <Box sx={{ height: { xs: "80vh", md: "86vh" } }}>{children}</Box>
        </Paper>
      )}
    </Box>
  );
};

const Sparkline = ({ series = [], isPct = false, isTime = false }) => {
  const chartRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (chartRef.current) chartRef.current.destroy?.();

    const labels = series.map((d) => d.quarter);
    const data = series.map((d) => d.value ?? null);

    chartRef.current = new ChartJS(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            data,
            borderWidth: 2,
            fill: false,
            pointRadius: 0,
            tension: 0.35,
            borderColor: isTime ? paletteTokens.bad : paletteTokens.ok,
          },
        ],
      },
      options: {
        responsive: false,
        animation: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false } },
      },
    });

    return () => chartRef.current?.destroy?.();
  }, [JSON.stringify(series), isPct, isTime]);

  return (
    <canvas
      ref={canvasRef}
      width={140}
      height={40}
      aria-label="Mini trend"
      role="img"
      style={{ display: "block", width: 140, height: 40 }}
    />
  );
};

const CommandPalette = ({
  open,
  onClose,
  allQuarters,
  onPickKpi, // (process, kpiId)
  onPickStep, // (process, step)
  onPickQuarter, // (q)
}) => {
  const [query, setQuery] = useState("");

  const kpiItems = useMemo(() => {
    const entries = [];
    ["MA", "CT", "GMP"].forEach((proc) => {
      const block = quarterlyData[proc] || {};
      Object.keys(block).forEach((k) => entries.push({ type: "kpi", proc, id: k }));
    });
    return entries;
  }, []);
  const stepItems = useMemo(() => {
    const entries = [];
    ["MA", "CT", "GMP"].forEach((proc) => {
      const block = processStepData[proc] || {};
      Object.keys(block).forEach((step) => entries.push({ type: "step", proc, step }));
    });
    return entries;
  }, []);

  const qItems = (allQuarters || []).map((q) => ({ type: "quarter", q }));

  const fuse = (txt) => (s) =>
    !txt ||
    s.toLowerCase().includes(txt.toLowerCase()) ||
    txt.split(/\s+/).every((w) => s.toLowerCase().includes(w));

  const results = useMemo(() => {
    const f = fuse(query);
    return [
      ...kpiItems.filter((x) => f(x.id)),
      ...stepItems.filter((x) => f(x.step)),
      ...qItems.filter((x) => f(x.q)),
    ].slice(0, 30);
  }, [kpiItems, stepItems, qItems, query]);

  if (!open) return null;
  return (
    <Paper
      role="dialog"
      aria-modal="true"
      elevation={10}
      sx={{
        position: "fixed",
        left: "50%",
        top: "10%",
        transform: "translateX(-50%)",
        width: "min(760px, 96vw)",
        p: 2,
        zIndex: (t) => t.zIndex.modal + 20,
      }}
    >
      <Stack spacing={1}>
        <Typography variant="subtitle2" color="text.secondary">
          Type to find KPIs, steps, or quarters (Enter to select, Esc to close)
        </Typography>
        <input
          autoFocus
          aria-label="Command palette"
          placeholder="Search… (e.g., 'GCP inspections', 'Q1 2025')"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && onClose()}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,.2)",
            outline: "none",
            fontSize: 14,
          }}
        />
        <Divider />
        <Box sx={{ maxHeight: 360, overflow: "auto" }}>
          {results.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
              No matches.
            </Typography>
          )}
          <Stack spacing={0.5}>
            {results.map((r, i) => {
              const key = `${r.type}-${r.id || r.step || r.q}-${i}`;
              return (
                <Paper
                  key={key}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (r.type === "kpi") onPickKpi(r.proc, r.id);
                    if (r.type === "step") onPickStep(r.proc, r.step);
                    if (r.type === "quarter") onPickQuarter(r.q);
                    onClose();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (r.type === "kpi") onPickKpi(r.proc, r.id);
                      if (r.type === "step") onPickStep(r.proc, r.step);
                      if (r.type === "quarter") onPickQuarter(r.q);
                      onClose();
                    }
                  }}
                  sx={{
                    p: 1,
                    cursor: "pointer",
                    "&:hover": { background: (t) => muiAlpha(t.palette.primary.main, 0.06) },
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {r.type === "kpi" && `KPI · ${r.proc} · ${KPI_NAME_MAP[r.id]?.short || r.id}`}
                    {r.type === "step" && `Step · ${r.proc} · ${r.step}`}
                    {r.type === "quarter" && `Quarter · ${r.q}`}
                  </Typography>
                </Paper>
              );
            })}
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
};

const SkeletonBlock = ({ h = 240 }) => (
  <Box
    role="status"
    aria-label="Loading"
    sx={{ height: h, borderRadius: 2, bgcolor: (t) => muiAlpha(t.palette.text.primary, 0.06) }}
  />
);

/* =====================================================================
   STICKY TOP (shared)
===================================================================== */
const StickyTop = ({
  viewTab,
  setViewTab,
  themeMode,
  setThemeMode,
  // Overview
  activeProcess,
  setActiveProcess,
  selectedQuarter,
  setSelectedQuarter,
  // Reports
  reportsProcess,
  setReportsProcess,
  reportsQuarter,
  setReportsQuarter,
  reportsView,
  setReportsView,
  allQuarters,
}) => {
  return (
    <Paper
      elevation={0}
      sx={(t) => ({
        position: "sticky",
        top: 0,
        zIndex: t.zIndex.appBar + 20,
        px: { xs: 1.5, md: 2.5 },
        pt: 1.25,
        pb: 1,
        borderRadius: 0,
        backdropFilter: "blur(6px)",
        backgroundColor: t.palette.mode === "dark" ? "rgba(18,18,18,0.78)" : "rgba(255,255,255,0.92)",
        borderBottom: "1px solid",
        borderColor: "divider",
      })}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        alignItems={{ xs: "flex-start", md: "center" }}
        justifyContent="space-between"
        sx={{ mb: 1 }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar src={ndaLogo} alt="NDA Logo" variant="rounded" sx={{ width: 48, height: 48 }} />
          <Box>
            <Typography variant="h5" fontWeight={900} color="primary">
              Uganda National Drug Authority
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Regulatory KPI Dashboard
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <Tabs
            value={viewTab}
            onChange={(_, v) => setViewTab(v)}
            textColor="primary"
            indicatorColor="primary"
            sx={{ "& .MuiTab-root": { fontWeight: 700 } }}
          >
            <Tab icon={<Assessment />} iconPosition="start" value="Overview" label="Overview" />
            <Tab icon={<BarChart />} iconPosition="start" value="Reports" label="Reports" />
          </Tabs>
          <IconButton
            onClick={() => setThemeMode(themeMode === "dark" ? "light" : "dark")}
            color="inherit"
            size="small"
            aria-label="toggle theme"
            title="Toggle theme"
          >
            {themeMode === "dark" ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
        </Stack>
      </Stack>

      <Divider sx={{ mb: 1 }} />

      {viewTab === "Overview" ? (
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <Typography variant="subtitle1" fontWeight={700} sx={{ mr: 1 }} color="primary">
            Filters
          </Typography>
          <ToggleButtonGroup
            exclusive
            value={activeProcess}
            onChange={(_, v) => v && setActiveProcess(v)}
            size="small"
            color="primary"
            aria-label="Process filter"
          >
            <ToggleButton value="MA"><Assignment sx={{ mr: 0.5 }} /> MA</ToggleButton>
            <ToggleButton value="CT"><Science sx={{ mr: 0.5 }} /> CT</ToggleButton>
            <ToggleButton value="GMP"><Gavel sx={{ mr: 0.5 }} /> GMP</ToggleButton>
          </ToggleButtonGroup>

          <FormControl size="small" variant="outlined" sx={{ minWidth: 160 }}>
            <InputLabel>Quarter</InputLabel>
            <Select
              label="Quarter"
              value={selectedQuarter}
              onChange={(e) => setSelectedQuarter(e.target.value)}
            >
              {allQuarters.map((q) => (
                <MenuItem key={q} value={q}>{q}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      ) : (
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <Typography variant="subtitle1" fontWeight={700} sx={{ mr: 1 }} color="primary">
            Filters
          </Typography>

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Process (for table)</InputLabel>
            <Select
              label="Process (for table)"
              value={reportsProcess}
              onChange={(e) => {
                setReportsProcess(e.target.value);
              }}
            >
              <MenuItem value="MA">MA — Marketing Authorization</MenuItem>
              <MenuItem value="CT">CT — Clinical Trials</MenuItem>
              <MenuItem value="GMP">GMP — Compliance</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>View</InputLabel>
            <Select
              label="View"
              value={reportsView}
              onChange={(e) => setReportsView(e.target.value)}
            >
              <MenuItem value="Bottleneck Metrics">Bottleneck Metrics</MenuItem>
              <MenuItem value="Quarterly Volumes">Quarterly Volumes</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Quarter (table)</InputLabel>
            <Select
              label="Quarter (table)"
              value={reportsQuarter}
              onChange={(e) => setReportsQuarter(e.target.value)}
            >
              {allQuarters.map((q) => (
                <MenuItem key={q} value={q}>{q}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      )}
    </Paper>
  );
};

/* =====================================================================
   OVERVIEW components
===================================================================== */

/* ---------- Overview Volumes Chart (also used in Reports) ---------- */
const OverviewVolumesChart = ({ activeProcess, overviewMode }) => {
  const qv = quarterlyVolumes[activeProcess] || [];
  const iv = inspectionVolumes[activeProcess] || [];
  const labels = (qv.length ? qv : iv).map((d) => d.quarter);

  let datasets = [];
  if (activeProcess === "MA") {
    if (overviewMode.MA === "apps") {
      datasets = [
        {
          label: "Applications received",
          data: qv.map((d) => d.applications_received),
          backgroundColor: alpha(paletteTokens.accent, 0.65),
          borderColor: paletteTokens.accent,
          stack: "apps_totals",
          yAxisID: "y",
          ...ThickBarProps,
        },
        {
          label: "Applications completed",
          data: qv.map((d) => d.applications_completed),
          backgroundColor: alpha(paletteTokens.primary, 0.75),
          borderColor: paletteTokens.primary,
          stack: "apps_totals",
          yAxisID: "y",
          ...ThickBarProps,
        },
      ];
    } else {
      datasets = [
        {
          label: "Approvals granted",
          data: qv.map((d) => d.approvals_granted),
          backgroundColor: alpha(paletteTokens.ok, 0.75),
          borderColor: paletteTokens.ok,
          yAxisID: "y",
          ...ThickBarProps,
        },
      ];
    }
  } else if (activeProcess === "CT") {
    if (overviewMode.CT === "apps") {
      datasets = [
        {
          label: "Applications received",
          data: qv.map((d) => d.applications_received),
          backgroundColor: alpha(paletteTokens.accent, 0.65),
          borderColor: paletteTokens.accent,
          stack: "apps_totals",
          yAxisID: "y",
          ...ThickBarProps,
        },
        {
          label: "Applications completed",
          data: qv.map((d) => d.applications_completed),
          backgroundColor: alpha(paletteTokens.primary, 0.75),
          borderColor: paletteTokens.primary,
          stack: "apps_totals",
          yAxisID: "y",
          ...ThickBarProps,
        },
      ];
    } else {
      datasets = [
        {
          label: "GCP inspections requested",
          data: qv.map((d) => d.gcp_inspections_requested),
          backgroundColor: alpha(paletteTokens.info, 0.65),
          borderColor: paletteTokens.info,
          stack: "gcp_totals",
          yAxisID: "y",
          ...ThickBarProps,
        },
        {
          label: "GCP inspections conducted",
          data: qv.map((d) => d.gcp_inspections_conducted),
          backgroundColor: alpha(paletteTokens.ok, 0.75),
          borderColor: paletteTokens.ok,
          stack: "gcp_totals",
          yAxisID: "y",
          ...ThickBarProps,
        },
      ];
    }
  } else {
    datasets = [
      {
        label: "Inspections requested — Domestic",
        data: iv.map((d) => d.requested_domestic),
        backgroundColor: alpha(paletteTokens.accent, 0.55),
        borderColor: paletteTokens.accent,
        stack: "requested",
        yAxisID: "y",
        ...ThickBarProps,
      },
      {
        label: "Inspections requested — Foreign",
        data: iv.map((d) => d.requested_foreign),
        backgroundColor: alpha(paletteTokens.warn, 0.55),
        borderColor: paletteTokens.warn,
        stack: "requested",
        yAxisID: "y",
        ...ThickBarProps,
      },
      {
        label: "Inspections requested — Reliance/Joint",
        data: iv.map((d) => (d.requested_reliance ?? 0) + (d.requested_desk ?? 0)),
        backgroundColor: alpha(paletteTokens.bad, 0.5),
        borderColor: paletteTokens.bad,
        stack: "requested",
        yAxisID: "y",
        ...ThickBarProps,
      },
      {
        label: "Inspections conducted — Domestic",
        data: iv.map((d) => d.conducted_domestic),
        backgroundColor: alpha(paletteTokens.primary, 0.75),
        borderColor: paletteTokens.primary,
        stack: "conducted",
        yAxisID: "y",
        ...ThickBarProps,
      },
      {
        label: "Inspections conducted — Foreign",
        data: iv.map((d) => d.conducted_foreign),
        backgroundColor: alpha(paletteTokens.info, 0.65),
        borderColor: paletteTokens.info,
        stack: "conducted",
        yAxisID: "y",
        ...ThickBarProps,
      },
      {
        label: "Inspections conducted — Reliance/Joint",
        data: iv.map((d) => (d.conducted_reliance ?? 0) + (d.conducted_desk ?? 0)),
        backgroundColor: alpha("#7a4cff", 0.65),
        borderColor: "#7a4cff",
        stack: "conducted",
        yAxisID: "y",
        ...ThickBarProps,
      },
    ];
  }

  const data = { labels, datasets };
  if (!labels?.length || datasets.every((ds) => ds.data.every((d) => d == null))) {
    return <SkeletonBlock h={220} />;
  }

  return (
    <FullscreenChart title={`${activeProcess} volumes`} actionId={`overview-${activeProcess}`}>
      <Box sx={{ height: 340 }}>
        <Bar
          data={data}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: "top" },
              tooltip: {
                callbacks: {
                  label: (ctx) =>
                    `${ctx.dataset.label}: ${Number(ctx.raw).toLocaleString()} (Quarter: ${ctx.label})`,
                },
              },
            },
            scales: {
              x: { grid: { display: false } },
              y: { beginAtZero: true, grid: { color: alpha("#000", 0.06) } },
            },
          }}
          plugins={[ValueLabelPlugin]}
        />
      </Box>
    </FullscreenChart>
  );
};

/* ---------- Process Steps bar chart (GREEN / RED only) ---------- */
const ProcessStepsBarChart = ({ currentSteps, selectedQuarter, useMedianForSteps }) => {
  if (!currentSteps || currentSteps.length === 0) {
    return (
      <Typography color="text.secondary">
        No process step data available for {selectedQuarter}
      </Typography>
    );
  }

  const labels = currentSteps.map((r) => r.step);
  const targetData = currentSteps.map((r) => r.targetDays);
  const actualData = currentSteps.map((r) => r.metricDays);

  const actualColors = currentSteps.map((r) =>
    r.metricDays <= r.targetDays ? paletteTokens.ok : paletteTokens.bad
  );

  const data = {
    labels,
    datasets: [
      {
        label: "Target days",
        data: targetData,
        backgroundColor: alpha(paletteTokens.accent, 0.4),
        borderColor: paletteTokens.accent,
        ...ThickBarProps,
      },
      {
        label: useMedianForSteps ? "Median days" : "Average days",
        data: actualData,
        backgroundColor: actualColors,
        borderColor: "transparent",
        ...ThickBarProps,
      },
    ],
  };

  return (
    <Card sx={{ mt: 2 }}>
      <CardContent sx={{ p: 2 }}>
        <Typography variant="h6" fontWeight={900} color="primary" gutterBottom>
          Process steps: actual vs target — {selectedQuarter}
        </Typography>
        <FullscreenChart title="Process steps — actual vs target" actionId="steps-actual-target">
          <Box sx={{ height: 300, mt: 1 }}>
            <Bar
              data={data}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: "top" } },
                scales: {
                  x: { grid: { display: false }, ticks: { maxRotation: 45, autoSkip: false } },
                  y: { beginAtZero: true, grid: { color: alpha("#000", 0.06) } },
                },
                animation: { duration: 500 },
              }}
              plugins={[ValueLabelPlugin]}
            />
          </Box>
        </FullscreenChart>
      </CardContent>
    </Card>
  );
};

/* ---------- KPI rail (Overview) ---------- */
const KPIRail = ({ items, selectedKpi, setSelectedKpi, scrollToDetailsRef, selectedQuarter }) => (
  <Box
    sx={{
      display: "flex",
      flexDirection: "row",
      alignItems: "stretch",
      gap: 2,
      overflowX: "auto",
      overflowY: "hidden",
      pb: 1,
      scrollSnapType: "x proximity",
      WebkitOverflowScrolling: "touch",
      "&::-webkit-scrollbar": { height: 8 },
      "&::-webkit-scrollbar-thumb": { background: "rgba(0,0,0,0.25)", borderRadius: 8 },
    }}
  >
    {items.map((item) => (
      <Card
        key={item.kpiId}
        onClick={() => setSelectedKpi((s) => (s === item.kpiId ? null : item.kpiId))}
        sx={(t) => ({
          width: "clamp(220px, 18vw, 300px)",
          minHeight: 170,
          flex: "0 0 auto",
          scrollSnapAlign: "start",
          cursor: "pointer",
          transition: "transform .18s ease, box-shadow .18s ease, border-color .18s ease",
          border: `1px solid ${
            selectedKpi === item.kpiId ? t.palette.primary.main : "rgba(0,0,0,0.08)"
          }`,
          "&:hover": {
            boxShadow: `0 10px 28px ${muiAlpha(t.palette.primary.main, 0.18)}`,
            transform: "translateY(-2px)",
          },
          display: "flex",
          flexDirection: "column",
        })}
      >
        <KpiCardContents
          item={item}
          selected={selectedKpi === item.kpiId}
          selectedQuarter={selectedQuarter}
          onArrowClick={(e) => {
            e.stopPropagation();
            setSelectedKpi(item.kpiId);
            requestAnimationFrame(() => {
              const el = scrollToDetailsRef?.current;
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            });
          }}
        />
      </Card>
    ))}
  </Box>
);

/* ---------- KPI Card contents (sparkline, compare badge) ---------- */
const KpiCardContents = ({ item, selected, onArrowClick, selectedQuarter }) => {
  const isPct = String(item.kpiId).startsWith("pct_");
  const isTime = item.isTime;
  const series = item.kpi?.data || [];
  const last = series.find((d) => d.quarter === selectedQuarter);
  const curIdx = series.findIndex((d) => d.quarter === selectedQuarter);
  const prevIdx = curIdx > 0 ? curIdx - 1 : -1;
  const prev = prevIdx >= 0 ? series[prevIdx] : null;

  const value = last?.value ?? item.value ?? null;
  const valDisplay =
    value == null ? "No data" : isPct ? `${Math.round(value)}%` : Number(value).toFixed(2);

  const delta = value != null && prev?.value != null ? value - prev.value : null;
  const deltaTxt =
    delta == null
      ? ""
      : isPct
      ? `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`
      : `${delta > 0 ? "+" : ""}${delta.toFixed(2)}`;

  const progress = (() => {
    if (value == null) return 0;
    if (isPct) return Math.min(100, (value / item.kpi.target) * 100);
    if (isTime) return Math.min(100, (item.kpi.target / value) * 100);
    return Math.min(100, (value / item.kpi.target) * 100);
  })();

  const names = KPI_NAME_MAP[item.kpiId] || {};
  const short = names.short || item.kpi.short || item.kpi.title || item.kpiId;

  return (
    <CardContent sx={{ pb: "14px !important", display: "flex", flexDirection: "column", gap: 1, flexGrow: 1 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ minHeight: 48 }}>
        <Tooltip
          arrow
          title={
            <Box sx={{ p: 0.5 }}>
              <Typography variant="caption">Quarter: {selectedQuarter}</Typography><br/>
              <Typography variant="caption">
                Target: {isPct ? `${item.kpi.target}%` : item.kpi.target}
              </Typography>
            </Box>
          }
        >
          <Typography
            variant="subtitle1"
            fontWeight={800}
            sx={(t) => ({
              color: statusColor(item.status, t),
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            })}
          >
            {short}
          </Typography>
        </Tooltip>

        <IconButton size="small" onClick={onArrowClick} aria-label="Open KPI trend" title="Open trend">
          <TrendIcon trend={item.trend} isTimeBased={item.isTime} />
        </IconButton>
      </Stack>

      <Stack direction="row" alignItems="baseline" spacing={1}>
        <Typography
          variant="h4"
          fontWeight={900}
          sx={(t) => ({
            color:
              value == null
                ? t.palette.text.secondary
                : item.status === "success"
                ? t.palette.success.main
                : item.status === "warning"
                ? t.palette.warning.main
                : t.palette.error.main,
          })}
        >
          {valDisplay}
        </Typography>
        {delta != null && (
          <Chip
            size="small"
            label={`${deltaTxt} vs prev`}
            color={isTime ? (delta < 0 ? "success" : "error") : (delta > 0 ? "success" : "error")}
            variant="outlined"
            sx={{ fontWeight: 700 }}
          />
        )}
      </Stack>

      {value != null && (
        <LinearProgress
          aria-label="Progress to target"
          variant="determinate"
          value={progress}
          color={item.status === "success" ? "success" : item.status === "warning" ? "warning" : "error"}
          sx={{ height: 8, borderRadius: 4 }}
        />
      )}

      <Box sx={{ mt: 1 }}>
        <Sparkline series={lastN(series, 6)} isPct={isPct} isTime={isTime} />
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, fontStyle: "italic" }}>
        {selectedQuarter} • {tinyLabelForKpi(item.kpiId)}
      </Typography>
    </CardContent>
  );
};

/* ---------- Disaggregation filters (chips) ---------- */
const DisaggFilters = ({
  kpi,
  activeDisaggDim,
  setActiveDisaggDim,
  activeDisaggCat,
  setActiveDisaggCat,
}) => {
  const dims = kpi?.disaggregations ? Object.keys(kpi.disaggregations) : [];
  if (!dims.length) return null;
  const cats = activeDisaggDim ? Object.keys(kpi.disaggregations[activeDisaggDim] || {}) : [];

  return (
    <Box sx={{ mt: 1.25 }}>
      <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 700 }}>
        Filter by:
      </Typography>

      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 1 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, mr: 0.5 }}>
          dimension:
        </Typography>
        {dims.map((d) => (
          <Chip
            key={d}
            label={d}
            variant={activeDisaggDim === d ? "filled" : "outlined"}
            color="success"
            onClick={() => {
              if (activeDisaggDim === d) {
                setActiveDisaggDim(null);
                setActiveDisaggCat(null);
              } else {
                setActiveDisaggDim(d);
                setActiveDisaggCat(null);
              }
            }}
          />
        ))}
      </Stack>

      {cats.length > 0 && (
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Typography variant="caption" sx={{ fontWeight: 700, mr: 0.5 }}>
            {activeDisaggDim}:
          </Typography>
          {cats.map((c) => (
            <Chip
              key={c}
              label={c}
              variant={activeDisaggCat === c ? "filled" : "outlined"}
              color="success"
              onClick={() => setActiveDisaggCat(activeDisaggCat === c ? null : c)}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
};

/* ---------- KPI status banner ---------- */
const KpiStatusBanner = ({ kpi, kpiId, status, value, selectedQuarter }) => {
  if (!kpi) {
    return (
      <Box sx={{ mt: 1, p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
        <Typography color="error">KPI data not available for {kpiId}</Typography>
      </Box>
    );
  }
  const isPct = String(kpiId).startsWith("pct_");
  const names = KPI_NAME_MAP[kpiId] || {};
  const long = names.long || kpi.title || kpiId;
  const fmt = (v) => (v == null ? "—" : isPct ? `${Math.round(v)}%` : Number(v).toFixed(2));
  const delta = value == null || kpi.target == null ? null : value - kpi.target;
  const deltaText =
    delta == null ? "" : isPct ? `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%` : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}`;

  return (
    <Box
      sx={(t) => ({
        mt: 1,
        display: "inline-flex",
        alignItems: "center",
        gap: 2,
        px: 2.2,
        py: 1,
        borderLeft: `6px solid ${statusColor(status, t)}`,
        color: statusColor(status, t),
        background: statusBg(status, t),
        borderRadius: 1,
        clipPath: "polygon(0% 0%, 95% 0%, 100% 50%, 95% 100%, 0% 100%)",
      })}
    >
      <Typography variant="subtitle1" fontWeight={900} sx={{ mr: 1 }}>
        {long}
      </Typography>

      <Divider orientation="vertical" flexItem sx={{ borderColor: muiAlpha("#000", 0.12) }} />

      <Stack direction="row" spacing={2} sx={{ color: "inherit" }}>
        <Typography variant="body2">
          <b>Current ({selectedQuarter})</b>: {fmt(value)}
        </Typography>
        <Typography variant="body2">
          <b>Target</b>: {fmt(kpi.target)}
        </Typography>
        <Typography variant="body2">
          <b>Baseline</b>: {fmt(kpi.baseline)}
        </Typography>
        <Typography variant="body2" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
          {statusIcon(status)} <b>Status</b>:{" "}
          {status === "success" ? "On Target" : status === "warning" ? "Near Target" : "Below Target"}
          {delta != null && <span style={{ fontStyle: "italic", marginLeft: 6 }}>({deltaText})</span>}
        </Typography>
      </Stack>
    </Box>
  );
};

/* ---------- Insights (donuts + dynamic bar) ---------- */
const Insights = ({
  activeProcess,
  selectedKpi,
  kpiStatusCounts,
  stepsOnTrackCounts,
  selectedQuarter,
}) => {
  let chartData = null;

  if (selectedKpi && selectedKpi.startsWith("pct_")) {
    chartData =
      datasetsFromCounts(activeProcess, selectedKpi) ||
      datasetsFromVolumes(activeProcess, selectedKpi) ||
      datasetsFromGenericVolumes(activeProcess, selectedKpi);
  } else if (selectedKpi) {
    chartData =
      datasetsFromVolumes(activeProcess, selectedKpi) ||
      datasetsFromGenericVolumes(activeProcess, selectedKpi);
  } else {
    chartData = datasetsFromGenericVolumes(activeProcess, selectedKpi);
  }

  const { labels, datasets } = chartData || { labels: [], datasets: [] };

  if (!datasets.length || datasets.every((ds) => ds.data.every((v) => v == null))) {
    return <Typography color="text.secondary">No volume data available for {activeProcess}</Typography>;
  }

  const tiny = selectedKpi ? tinyLabelForKpi(selectedKpi) : "volumes";
  const dynamicTitle = `Quarter ${selectedQuarter} — ${tiny}`;

  return (
    <Paper elevation={0} sx={{ p: 2, borderRadius: 2, boxShadow: 3 }}>
      <SectionStrip title="KPI Compliance" icon={<CheckCircleOutline fontSize="small" color="primary" />} />

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: "100%", boxShadow: 3, display: "flex", flexDirection: "column" }}>
            <CardContent sx={{ p: 2, flexGrow: 1 }}>
              <Typography variant="h6" fontWeight={900} align="center" color="primary">
                KPI performance status
              </Typography>
              <Box sx={{ height: 120, display: "flex", justifyContent: "center" }}>
                <Donut
                  labels={["On track", "At risk", "Off track"]}
                  data={[kpiStatusCounts.success, kpiStatusCounts.warning, kpiStatusCounts.error]}
                  palette={[paletteTokens.ok, paletteTokens.warn, paletteTokens.bad]}
                />
              </Box>
              <Typography variant="body2" align="center" sx={{ mt: 1.5 }}>
                <b>{kpiStatusCounts.success}</b> on track,{" "}
                <b>{kpiStatusCounts.warning}</b> at risk,{" "}
                <b>{kpiStatusCounts.error}</b> off track.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: "100%", boxShadow: 3, display: "flex", flexDirection: "column" }}>
            <CardContent sx={{ p: 2, flexGrow: 1 }}>
              <Typography variant="h6" fontWeight={900} align="center" color="primary">
                Process steps on-track vs off-track
              </Typography>
              <Box sx={{ height: 120, display: "flex", justifyContent: "center" }}>
                <Donut labels={["On-track", "Off-track"]} data={[stepsOnTrackCounts.on, stepsOnTrackCounts.off]} palette={[paletteTokens.ok, paletteTokens.bad]} />
              </Box>
              <Typography variant="body2" align="center" sx={{ mt: 1.5 }}>
                <b>{stepsOnTrackCounts.on}</b> steps on-track,{" "}
                <b>{stepsOnTrackCounts.off}</b> off-track.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: "100%", boxShadow: 3, display: "flex", flexDirection: "column" }}>
            <CardContent sx={{ p: 2, flexGrow: 1 }}>
              <Typography variant="h6" fontWeight={900} align="center" color="primary">
                {dynamicTitle}
              </Typography>
              <FullscreenChart title={dynamicTitle} actionId={`insights-${activeProcess}`}>
                <Box sx={{ height: 300 }}>
                  <Bar
                    data={{ labels, datasets }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: "top" },
                        tooltip: {
                          callbacks: {
                            label: (ctx) =>
                              `${ctx.dataset.label}: ${Number(ctx.raw).toLocaleString()} (Quarter: ${ctx.label})`,
                          },
                        },
                      },
                      scales: {
                        x: { grid: { display: false } },
                        y: { beginAtZero: true, grid: { color: alpha("#000", 0.06) } },
                      },
                      animation: false,
                    }}
                    plugins={[ValueLabelPlugin]}
                  />
                </Box>
              </FullscreenChart>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Paper>
  );
};

/* ---------- KPI details (trend line, right panel) ---------- */
const KpiDetails = ({
  activeProcess,
  selectedKpi,
  selectedQuarter,
  detailsAnchorRef,
  activeDisaggDim,
  activeDisaggCat,
}) => {
  if (!selectedKpi) return null;
  const kpi = quarterlyData[activeProcess]?.[selectedKpi];
  if (!kpi) return <Typography color="text.secondary">KPI data not available</Typography>;

  let series = kpi.data;
  if (
    activeDisaggDim &&
    activeDisaggCat &&
    kpi.disaggregations &&
    kpi.disaggregations[activeDisaggDim] &&
    kpi.disaggregations[activeDisaggDim][activeDisaggCat] &&
    Array.isArray(kpi.disaggregations[activeDisaggDim][activeDisaggCat].data)
  ) {
    series = kpi.disaggregations[activeDisaggDim][activeDisaggCat].data;
  }

  const isPct = String(selectedKpi).startsWith("pct_");
  const names = KPI_NAME_MAP[selectedKpi] || {};
  const longName = names.long || kpi.title || selectedKpi;

  const lineData = {
    labels: series.map((d) => d.quarter),
    datasets: [
      {
        label: activeDisaggCat || "Performance",
        data: series.map((d) => d.value),
        borderColor: paletteTokens.primary,
        backgroundColor: alpha(paletteTokens.primary, 0.2),
        fill: true,
        tension: 0.35,
        borderWidth: 2,
      },
      {
        label: "Target",
        data: series.map(() => kpi.target),
        borderColor: paletteTokens.bad,
        borderDash: [6, 4],
        pointStyle: false,
      },
      {
        label: "Baseline",
        data: series.map(() => kpi.baseline),
        borderColor: paletteTokens.accent,
        borderDash: [3, 3],
        pointStyle: false,
      },
    ],
  };

  return (
    <Card ref={detailsAnchorRef} sx={{ mt: 2, boxShadow: 3 }}>
      <CardContent>
        <SectionStrip title={longName} />
        <FullscreenChart title={`${longName} — trend`} actionId={`kpi-${activeProcess}-${selectedKpi}`}>
          <Box sx={{ mt: 2, height: 340 }}>
            <Line
              data={lineData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: "top" } },
                scales: {
                  y: { beginAtZero: true, max: isPct ? 100 : undefined, grid: { color: alpha("#000", 0.06) } },
                  x: { grid: { display: false } },
                },
              }}
            />
          </Box>
        </FullscreenChart>
      </CardContent>
    </Card>
  );
};

/* ---------- Process Step Trend Modal (Overview) ---------- */
const StepModal = ({ activeProcess, selectedStep, onClose }) => {
  if (!selectedStep) return null;
  const stepSeries = processStepData[activeProcess]?.[selectedStep]?.data || [];
  if (stepSeries.length === 0) return null;

  const line = {
    labels: stepSeries.map((d) => d.quarter),
    datasets: [
      {
        label: "Actual days",
        data: stepSeries.map((d) => d.avgDays),
        borderColor: paletteTokens.primary,
        backgroundColor: alpha(paletteTokens.primary, 0.2),
        tension: 0.35,
        fill: true,
      },
      {
        label: "Target days",
        data: stepSeries.map((d) => d.targetDays),
        borderColor: paletteTokens.accent,
        borderDash: [6, 4],
        pointStyle: false,
      },
    ],
  };

  return (
    <Paper
      elevation={6}
      sx={{
        position: "fixed",
        zIndex: 1300,
        left: "50%",
        top: "10%",
        transform: "translateX(-50%)",
        width: "min(960px, 92vw)",
        maxHeight: "80vh",
        overflow: "auto",
        p: 2,
        borderRadius: 2,
      }}
      aria-label={`Modal for ${selectedStep} details`}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="h6" fontWeight={900}>
          {selectedStep} — Actual vs Target
        </Typography>
        <Chip label="Close" onClick={onClose} color="primary" />
      </Stack>
      <Box sx={{ height: 360 }}>
        <Line
          data={line}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: "top" } },
            scales: {
              x: { grid: { display: false } },
              y: { beginAtZero: true, grid: { color: alpha("#000", 0.06) } },
            },
          }}
        />
      </Box>
    </Paper>
  );
};

/* ---------- Process Analysis table (Overview) ---------- */
const ProcessAnalysisOverview = ({
  activeProcess,
  selectedQuarter,
  currentSteps,
  setSelectedStep,
  useMedianForSteps,
}) => {
  if (!currentSteps.length) {
    return <Typography color="text.secondary">No process step data available</Typography>;
  }

  const rows = currentSteps.map((r) => {
    const series = processStepData[activeProcess][r.step].data;
    const idx = series.findIndex((d) => d.quarter === selectedQuarter);

    let prevVal = null;
    if (idx > 0) {
      if (useMedianForSteps) {
        const prevQ = series[idx - 1].quarter;
        prevVal = getStepMedianForQuarter(activeProcess, r.step, prevQ);
      } else {
        prevVal = series[idx - 1]?.avgDays ?? null;
      }
    }
    const curVal = r.metricDays ?? null;

    const trend =
      prevVal != null && curVal != null
        ? curVal < prevVal
          ? "improving"
          : curVal > prevVal
          ? "declining"
          : "flat"
        : "flat";

    return { ...r, trend };
  });

  const columns = [
    { key: "metricDays", label: useMedianForSteps ? "Median days" : "Average days" },
    { key: "targetDays", label: "Target days" },
    { key: "variance", label: "Variance" },
    { key: "trend", label: "Trend" },
  ];

  return (
    <Card sx={{ mt: 2, boxShadow: 3 }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
          <SectionStrip title="Process step analysis" icon={<BarChart fontSize="small" color="primary" />} />
          <IconButton
            onClick={() =>
              exportToCSV(
                rows.map((r) => ({ ...r, quarter: selectedQuarter, step: r.step })),
                [{ key: "step", label: "Step" }, ...columns],
                `process_steps_${activeProcess}_${selectedQuarter}.csv`
              )
            }
            aria-label="Export process analysis to CSV"
            title="Download CSV"
          >
            <GetApp />
          </IconButton>
        </Stack>
        <Box sx={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }} aria-label="Process step analysis table">
            <thead>
              <tr style={{ background: alpha(paletteTokens.primary, 0.08), textAlign: "left" }}>
                {["Process name", columns[0].label, "Target days", "Variance", "Trend"].map((h) => (
                  <th key={h} style={{ padding: "10px 12px", fontWeight: 800, color: NDA_GREEN }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const onTrack = r.metricDays <= r.targetDays;
                return (
                  <tr
                    key={r.step}
                    style={{ borderBottom: "1px solid rgba(0,0,0,.06)", cursor: "pointer" }}
                    onClick={() => setSelectedStep?.(r.step)}
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && setSelectedStep?.(r.step)}
                  >
                    <td style={{ padding: "10px 12px" }}>{r.step}</td>
                    <td style={{ padding: "10px 12px", color: onTrack ? paletteTokens.ok : paletteTokens.bad, fontWeight: 700 }}>
                      {Number(r.metricDays).toFixed(2)}
                    </td>
                    <td style={{ padding: "10px 12px" }}>{Number(r.targetDays).toFixed(2)}</td>
                    <td style={{ padding: "10px 12px", color: onTrack ? paletteTokens.ok : paletteTokens.bad, fontWeight: 700 }}>
                      {r.variance > 0 ? "+" : ""}
                      {Number(r.variance).toFixed(2)}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStep?.(r.step);
                        }}
                        aria-label="Show trend"
                        title="Show trend"
                      >
                        <ShowChart fontSize="small" />
                      </IconButton>
                      {r.trend === "improving" && <ArrowDownward color="success" fontSize="small" />}
                      {r.trend === "declining" && <ArrowUpward color="error" fontSize="small" />}
                      {r.trend === "flat" && <TrendingFlat color="warning" fontSize="small" />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Box>
      </CardContent>
    </Card>
  );
};

/* =====================================================================
   REPORTS — enhanced: curated Bottleneck metrics + trend modals + compare
===================================================================== */

/* ---- Curated Bottleneck metrics (definitions) ---- */
const curatedMetricDefs = (process) => {
  const base = [
    { key: "cycle_time_median", label: "Cycle time (median)", tip: "Touch + Wait median days for step", from: "combo" },
    { key: "ext_median_days", label: "External responsiveness (median)", tip: "Median days waiting on external parties", from: "bn" },
    { key: "opening_backlog", label: "Opening backlog", tip: "Items carried into the quarter", from: "bn" },
    { key: "carry_over_rate", label: "Carry-over rate", tip: "Share of work that rolled into next quarter", from: "bn", fmt: (v) => (v == null ? "—" : `${Math.round(v * 100)}%`) },
    { key: "avg_query_cycles", label: "Avg query cycles", tip: "Average number of query rounds with applicant/site", from: "bn" },
    { key: "fpy_pct", label: "FPY %", tip: "First-pass yield (no rework)", from: "bn", fmt: (v) => (v == null ? "—" : `${Math.round(v)}%`) },
    { key: "wait_share_pct", label: "Wait share %", tip: "Share of cycle time spent waiting", from: "bn", fmt: (v) => (v == null ? "—" : `${Math.round(v)}%`) },
  ];
  const extra = [];
  if (process === "MA") {
    extra.push({ key: "work_to_staff_ratio", label: "Work-to-staff ratio", tip: "Demand vs available staff hours", from: "bn", fmt: (v) => (v == null ? "—" : Number(v).toFixed(2)) });
  }
  if (process === "CT" || process === "GMP") {
    extra.push({ key: "sched_median_days", label: "Scheduling lead time (median)", tip: "Days from request to scheduled date", from: "bn" });
  }
  return [...base, ...extra];
};

/* ---- Reports: Single-step & Multi-step trend modals ---- */
const SingleStepMetricTrendModal = ({ openSpec, onClose }) => {
  if (!openSpec) return null;
  const { process, step, metricKey, title } = openSpec;

  const bnSeries = (bottleneckData[process] || {})[step] || [];
  const psSeries = processStepData[process]?.[step]?.data || [];

  const labels = (bnSeries.length ? bnSeries : psSeries).map((d) => d.quarter);
  const metricData = (bnSeries.length ? bnSeries : psSeries).map((d) => {
    if (metricKey === "cycle_time_median") {
      const touch = d.touch_median_days ?? 0;
      const wait = d.wait_median_days ?? 0;
      return touch || wait ? touch + wait : null;
    }
    return d[metricKey] ?? null;
  });

  const line = {
    labels,
    datasets: [
      {
        label: `${step} — ${title}`,
        data: metricData,
        borderColor: paletteTokens.primary,
        backgroundColor: alpha(paletteTokens.primary, 0.2),
        tension: 0.35,
        fill: true,
      },
    ],
  };

  return (
    <Paper
      elevation={6}
      sx={{
        position: "fixed",
        zIndex: 1300,
        left: "50%",
        top: "10%",
        transform: "translateX(-50%)",
        width: "min(980px, 94vw)",
        maxHeight: "80vh",
        overflow: "auto",
        p: 2,
        borderRadius: 2,
      }}
      aria-label={`Modal for ${title} trend`}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="h6" fontWeight={900}>
          {title} — {step}
        </Typography>
        <IconButton onClick={onClose} aria-label="Close trend"><Close /></IconButton>
      </Stack>
      <Box sx={{ height: 360 }}>
        <Line
          data={line}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: "top" } },
            scales: {
              x: { grid: { display: false } },
              y: { beginAtZero: true, grid: { color: alpha("#000", 0.06) } },
            },
          }}
        />
      </Box>
    </Paper>
  );
};

const MultiStepMetricTrendModal = ({ openSpec, onClose }) => {
  if (!openSpec) return null;
  const { process, metricKey, title } = openSpec;

  const stepsObj = processStepData[process] || {};
  const stepKeys = Object.keys(stepsObj);
  if (stepKeys.length === 0) return null;

  const firstSeries = stepsObj[stepKeys[0]].data || [];
  const labels = firstSeries.map((d) => d.quarter);

  const palette = [
    paletteTokens.primary,
    paletteTokens.info,
    paletteTokens.ok,
    "#7a4cff",
    "#00897B",
    "#AF4448",
    "#6D4C41",
    "#455A64",
    "#9E9D24",
  ];

  const datasets = stepKeys.map((step, idx) => {
    const bnSeries = (bottleneckData[process] || {})[step] || [];
    const psSeries = stepsObj[step]?.data || [];
    const series = bnSeries.length ? bnSeries : psSeries;

    const data = labels.map((q) => {
      const d = series.find((x) => x.quarter === q) || {};
      if (metricKey === "cycle_time_median") {
        const t = d.touch_median_days ?? 0;
        const w = d.wait_median_days ?? 0;
        return t || w ? t + w : null;
      }
      return d[metricKey] ?? null;
    });

    return {
      label: step,
      data,
      borderColor: palette[idx % palette.length],
      backgroundColor: "transparent",
      tension: 0.35,
      pointRadius: 2,
    };
  });

  const line = { labels, datasets };

  return (
    <Paper
      elevation={6}
      sx={{
        position: "fixed",
        zIndex: 1300,
        left: "50%",
        top: "8%",
        transform: "translateX(-50%)",
        width: "min(1100px, 96vw)",
        maxHeight: "84vh",
        overflow: "auto",
        p: 2,
        borderRadius: 2,
      }}
      aria-label={`Modal for ${title} multi-step trend`}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="h6" fontWeight={900}>
          {title} — trend by process step
        </Typography>
        <IconButton onClick={onClose} aria-label="Close trend"><Close /></IconButton>
      </Stack>
      <Box sx={{ height: 420 }}>
        <Line
          data={line}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: "top" } },
            scales: {
              x: { grid: { display: false } },
              y: { beginAtZero: true, grid: { color: alpha("#000", 0.06) } },
            },
          }}
        />
      </Box>
    </Paper>
  );
};

/* ---- Reports: curated Bottleneck table (with interactions) ---- */
const ProcessAnalysisReports = ({
  activeProcess,
  selectedQuarter,
  currentSteps,
  setSingleStepTrend,
  setMultiStepTrend,
  compareOn,
  compareQuarter,
}) => {
  const cols = curatedMetricDefs(activeProcess);

  const rows = useMemo(() => {
    return currentSteps.map((r) => {
      const step = r.step;
      const q = selectedQuarter;
      const bnSeries = (bottleneckData[activeProcess] || {})[step] || [];
      const bnQ = bnSeries.find((d) => d.quarter === q) || {};
      const touch = bnQ.touch_median_days ?? null;
      const wait = bnQ.wait_median_days ?? null;

      const row = { step };
      cols.forEach((c) => {
        if (c.key === "cycle_time_median") {
          row[c.key] = touch == null && wait == null ? "—" : Number(touch || 0) + Number(wait || 0);
        } else if (c.from === "bn") {
          row[c.key] = bnQ[c.key] ?? "—";
        } else {
          row[c.key] = "—";
        }
      });
      return row;
    });
  }, [activeProcess, selectedQuarter, currentSteps, cols]);

  const headCols = [{ key: "step", label: "Step" }, ...cols];

  const getCompareVal = (step, key) => {
    if (!compareOn) return null;
    const bnSeries = (bottleneckData[activeProcess] || {})[step] || [];
    const bnQ = bnSeries.find((d) => d.quarter === compareQuarter) || {};
    if (key === "cycle_time_median") {
      const touch = bnQ.touch_median_days ?? null;
      const wait = bnQ.wait_median_days ?? null;
      return touch == null && wait == null ? null : Number(touch || 0) + Number(wait || 0);
    }
    return bnQ[key] ?? null;
  };

  return (
    <Card sx={{ mt: 2, boxShadow: 3 }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
          <SectionStrip title="Process Bottleneck Analysis" icon={<Assessment fontSize="small" color="primary" />} />
          <IconButton
            onClick={() =>
              exportToCSV(
                rows.map((r) => ({ quarter: selectedQuarter, ...r })),
                [{ key: "quarter", label: "Quarter" }, ...[{ key: "step", label: "Step" }, ...cols]],
                `per_step_curated_${activeProcess}_${selectedQuarter}.csv`
              )
            }
            aria-label="Export Bottleneck metrics CSV"
            title="Download CSV"
          >
            <GetApp />
          </IconButton>
        </Stack>
        <Box sx={{ overflowX: "auto" }}>
          <table
            style={{ width: "100%", borderCollapse: "collapse" }}
            aria-label="Bottleneck curated metrics table"
          >
            <thead>
              <tr style={{ background: alpha(paletteTokens.primary, 0.08), textAlign: "left" }}>
                {headCols.map((c) => (
                  <th key={c.key} style={{ padding: "10px 12px", fontWeight: 800, color: NDA_GREEN }}>
                    {c.key === "step" ? (
                      c.label
                    ) : (
                      <Tooltip title={`${c.label}: ${c.tip || ""}  (Click to view trend by step)`}>
                        <span
                          style={{ cursor: "pointer", textDecoration: "underline" }}
                          onClick={() =>
                            setMultiStepTrend({
                              process: activeProcess,
                              metricKey: c.key,
                              title: c.label,
                            })
                          }
                        >
                          {c.label} <OpenInFull style={{ fontSize: 14, verticalAlign: "middle", marginLeft: 4 }} />
                        </span>
                      </Tooltip>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.step} style={{ borderBottom: "1px solid rgba(0,0,0,.06)" }}>
                  {headCols.map((c) => {
                    const def = cols.find((x) => x.key === c.key);
                    let val = r[c.key];
                    const compVal = c.key !== "step" ? getCompareVal(r.step, c.key) : null;

                    const renderVal = () => {
                      let display = val;
                      if (def?.fmt && display !== "—" && display != null) display = def.fmt(display);
                      if (c.key === "step") return display;

                      if (display === "—" || display == null || typeof display !== "number") {
                        return display ?? "—";
                      }

                      if (!compareOn || compVal == null || typeof compVal !== "number") {
                        return display;
                      }

                      const delta = display - compVal;
                      const label = `${delta > 0 ? "+" : ""}${(def?.fmt ? def.fmt(delta) : delta.toFixed?.(2) ?? `${delta}`)}`;
                      const isGood = def?.key?.includes("pct") || def?.key === "fpy_pct" ? delta >= 0 : delta <= 0;

                      return (
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <span>{display}</span>
                          <Chip
                            size="small"
                            variant="outlined"
                            color={isGood ? "success" : "error"}
                            label={label}
                            sx={{ height: 22 }}
                          />
                        </Stack>
                      );
                    };

                    return (
                      <td
                        key={c.key}
                        style={{
                          padding: "10px 12px",
                          cursor: c.key !== "step" ? "pointer" : "default",
                          whiteSpace: "nowrap",
                        }}
                        onClick={
                          c.key !== "step"
                            ? () =>
                                setSingleStepTrend({
                                  process: activeProcess,
                                  step: r.step,
                                  metricKey: c.key,
                                  title: def?.label || c.key,
                                })
                            : undefined
                        }
                      >
                        {renderVal()}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      </CardContent>
    </Card>
  );
};

/* ---- Reports: main wrapper (volumes + curated Bottlenecks) ---- */
const Reports = ({
  reportsProcess,
  reportsQuarter,
  reportsView,
  volumesMode,
  setVolumesMode,
  setSingleStepTrend,
  setMultiStepTrend,
}) => {
  // Compare mode controls
  const [compareOn, setCompareOn] = useState(false);
  const [compareQuarter, setCompareQuarter] = useState(reportsQuarter);

  const buildVolumesSpec = (proc) => {
    if (proc === "MA") {
      return {
        title: "MA — Applications vs Completed / Approvals",
        columns: [
          { key: "applications_received", label: "Applications received" },
          { key: "applications_completed", label: "Applications completed" },
          { key: "approvals_granted", label: "Approvals granted" },
        ],
        rows: quarterlyVolumes.MA || [],
        renderToggle: () => (
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                label={compareOn ? "Compare: ON" : "Compare: OFF"}
                color={compareOn ? "primary" : "default"}
                onClick={() => setCompareOn((s) => !s)}
                aria-label="Toggle compare mode"
              />
              {compareOn && (
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>Compare to</InputLabel>
                  <Select
                    label="Compare to"
                    value={compareQuarter}
                    onChange={(e) => setCompareQuarter(e.target.value)}
                  >
                    {(quarterlyVolumes.MA || []).map((r) => r.quarter).map((q) => (
                      <MenuItem key={q} value={q}>{q}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Stack>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={volumesMode.MA}
              onChange={(_, v) => v && setVolumesMode((s) => ({ ...s, MA: v }))}
              aria-label="MA volumes mode"
            >
              <ToggleButton value="apps">Apps: received vs completed</ToggleButton>
              <ToggleButton value="approvals">Approvals granted</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        ),
        renderChart: () => <OverviewVolumesChart activeProcess="MA" overviewMode={volumesMode} />,
      };
    }
    if (proc === "CT") {
      return {
        title: "CT — Applications vs Completed / GCP Inspections",
        columns: [
          { key: "applications_received", label: "Applications received" },
          { key: "applications_completed", label: "Applications completed" },
          { key: "gcp_inspections_requested", label: "GCP inspections requested" },
          { key: "gcp_inspections_conducted", label: "GCP inspections conducted" },
        ],
        rows: quarterlyVolumes.CT || [],
        renderToggle: () => (
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                label={compareOn ? "Compare: ON" : "Compare: OFF"}
                color={compareOn ? "primary" : "default"}
                onClick={() => setCompareOn((s) => !s)}
                aria-label="Toggle compare mode"
              />
              {compareOn && (
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>Compare to</InputLabel>
                  <Select
                    label="Compare to"
                    value={compareQuarter}
                    onChange={(e) => setCompareQuarter(e.target.value)}
                  >
                    {(quarterlyVolumes.CT || []).map((r) => r.quarter).map((q) => (
                      <MenuItem key={q} value={q}>{q}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Stack>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={volumesMode.CT}
              onChange={(_, v) => v && setVolumesMode((s) => ({ ...s, CT: v }))}
              aria-label="CT volumes mode"
            >
              <ToggleButton value="apps">Apps: received vs completed</ToggleButton>
              <ToggleButton value="gcp">GCP: requested vs conducted</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        ),
        renderChart: () => <OverviewVolumesChart activeProcess="CT" overviewMode={volumesMode} />,
      };
    }
    // GMP
    return {
      title: "GMP — Inspections requested vs conducted",
      columns: [
        { key: "inspections_requested_total", label: "Total inspections requested" },
        { key: "inspections_conducted_total", label: "Total inspections conducted" },
        { key: "inspections_domestic", label: "Domestic (conducted)" },
        { key: "inspections_foreign", label: "Foreign (conducted)" },
        { key: "inspections_reliance_joint", label: "Reliance/Joint (conducted)" },
      ],
      rows: quarterlyVolumes.GMP || [],
      renderToggle: () => (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Chip
            label={compareOn ? "Compare: ON" : "Compare: OFF"}
            color={compareOn ? "primary" : "default"}
            onClick={() => setCompareOn((s) => !s)}
            aria-label="Toggle compare mode"
          />
          {compareOn && (
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Compare to</InputLabel>
              <Select
                label="Compare to"
                value={compareQuarter}
                onChange={(e) => setCompareQuarter(e.target.value)}
              >
                {(quarterlyVolumes.GMP || []).map((r) => r.quarter).map((q) => (
                  <MenuItem key={q} value={q}>{q}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Stack>
      ),
      renderChart: () => <OverviewVolumesChart activeProcess="GMP" overviewMode={volumesMode} />,
    };
  };

  const volumesSpec = useMemo(
    () => buildVolumesSpec(reportsProcess),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reportsProcess, volumesMode, compareOn, compareQuarter]
  );

  return (
    <Card sx={{ mt: 1, boxShadow: 3 }}>
      <CardContent>
        {reportsView === "Quarterly Volumes" && (
          <>
            <SectionStrip
              title={`Quarterly volumes — ${reportsProcess}`}
              icon={<BarChart fontSize="small" color="primary" />}
            />

            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={900} color="primary" gutterBottom>
                  {volumesSpec.title}
                </Typography>
                {volumesSpec.renderToggle?.()}
                {volumesSpec.renderChart()}
              </CardContent>
            </Card>

            <Stack direction="row" justifyContent="space-between" alignItems="center" mt={2} mb={1}>
              <Typography variant="subtitle1" fontWeight={800} color="primary">
                Quarterly volume table — {reportsProcess}
              </Typography>
              <IconButton
                onClick={() =>
                  exportToCSV(
                    volumesSpec.rows,
                    [{ key: "quarter", label: "Quarter" }, ...volumesSpec.columns],
                    `quarterly_volumes_${reportsProcess}.csv`
                  )
                }
                aria-label="Export quarterly volumes CSV"
                title="Download CSV"
              >
                <GetApp />
              </IconButton>
            </Stack>

            <Box sx={{ overflowX: "auto" }}>
              <table
                style={{ width: "100%", borderCollapse: "collapse" }}
                aria-label="Quarterly volumes table"
              >
                <thead>
                  <tr style={{ background: alpha(paletteTokens.primary, 0.08), textAlign: "left" }}>
                    <th style={{ padding: "10px 12px", fontWeight: 800, color: NDA_GREEN }}>
                      Quarter
                    </th>
                    {volumesSpec.columns.map((c) => (
                      <th key={c.key} style={{ padding: "10px 12px", fontWeight: 800, color: NDA_GREEN }}>
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {volumesSpec.rows.map((row) => (
                    <tr key={row.quarter} style={{ borderBottom: "1px solid rgba(0,0,0,.06)" }}>
                      <td style={{ padding: "10px 12px", fontWeight: 700 }}>{row.quarter}</td>
                      {volumesSpec.columns.map((c) => {
                        const val = row[c.key];
                        const baseRow = compareOn ? volumesSpec.rows.find((r) => r.quarter === compareQuarter) : null;
                        const baseVal = baseRow && typeof baseRow[c.key] === "number" ? baseRow[c.key] : null;

                        return (
                          <td key={c.key} style={{ padding: "10px 12px" }}>
                            {typeof val === "number" ? (
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <span>{val.toLocaleString()}</span>
                                {compareOn && baseVal != null && (
                                  <Chip
                                    size="small"
                                    variant="outlined"
                                    color={val - baseVal >= 0 ? "success" : "error"}
                                    label={`${val - baseVal > 0 ? "+" : ""}${(val - baseVal).toLocaleString()}`}
                                    sx={{ height: 22 }}
                                  />
                                )}
                              </Stack>
                            ) : (val ?? "No data")}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          </>
        )}
        
        {reportsView === "Bottleneck Metrics" && (
          <>
            <SectionStrip
              title={`Bottleneck metrics — ${reportsProcess} (${reportsQuarter})`}
              icon={<Assessment fontSize="small" color="primary" />}
            />
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <Chip
                label={compareOn ? "Compare: ON" : "Compare: OFF"}
                color={compareOn ? "primary" : "default"}
                onClick={() => setCompareOn((s) => !s)}
                aria-label="Toggle compare mode"
              />
              {compareOn && (
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>Compare to</InputLabel>
                  <Select
                    label="Compare to"
                    value={compareQuarter}
                    onChange={(e) => setCompareQuarter(e.target.value)}
                  >
                    {(Object.values(processStepData[reportsProcess] || {})?.[Object.keys(processStepData[reportsProcess] || {})[0]]?.data || [])
                      .map((r) => r.quarter)
                      .map((q) => <MenuItem key={q} value={q}>{q}</MenuItem>)
                    }
                  </Select>
                </FormControl>
              )}
              <Tooltip title="Click any column header to see multi-step trend; click any cell to see that step's trend.">
                <InfoOutlined fontSize="small" />
              </Tooltip>
            </Stack>

            <ProcessAnalysisReports
              activeProcess={reportsProcess}
              selectedQuarter={reportsQuarter}
              currentSteps={
                Object.entries(processStepData[reportsProcess] || {})
                  .map(([step, series]) => {
                    const q = series.data.find((d) => d.quarter === reportsQuarter);
                    return q ? { step, ...q } : null;
                  })
                  .filter(Boolean)
              }
              setSingleStepTrend={setSingleStepTrend}
              setMultiStepTrend={setMultiStepTrend}
              compareOn={compareOn}
              compareQuarter={compareQuarter}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
};

/* =====================================================================
   MAIN MODULE
===================================================================== */
const KpiModuleInner = ({ themeMode, setThemeMode }) => {
  const [viewTab, setViewTab] = useState("Overview");

  // Overview state
  const [activeProcess, setActiveProcess] = useState("MA");
  const [selectedQuarter, setSelectedQuarter] = useState("Q2 2025");
  const [selectedKpi, setSelectedKpi] = useState(null);
  const [activeDisaggDim, setActiveDisaggDim] = useState(null);
  const [activeDisaggCat, setActiveDisaggCat] = useState(null);

  // Reports state
  const [reportsProcess, setReportsProcess] = useState("MA");
  const [reportsQuarter, setReportsQuarter] = useState("Q2 2025");
  const [reportsView, setReportsView] = useState("Quarterly Volumes");
  const [volumesMode, setVolumesMode] = useState({ MA: "apps", CT: "apps", GMP: "inspections" });

  // Overview step trend modal
  const [selectedStep, setSelectedStep] = useState(null);

  // Reports modals
  const [singleStepTrend, setSingleStepTrend] = useState(null);
  const [multiStepTrend, setMultiStepTrend] = useState(null);

  // refs for smooth scrolling to trend details
  const detailsRef = useRef(null);

  // NEW: command palette
  const [paletteOpen, setPaletteOpen] = useState(false);
  useEffect(() => {
    const h = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((s) => !s);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // NEW: URL deep-linking for core filters
  useUrlState(
    {
      tab: viewTab,
      process: viewTab === "Overview" ? activeProcess : reportsProcess,
      quarter: viewTab === "Overview" ? selectedQuarter : reportsQuarter,
      rview: reportsView,
      kpi: selectedKpi || "",
    },
    {
      tab: setViewTab,
      process: (v) => {
        if (!v) return;
        if (viewTab === "Overview") setActiveProcess(v);
        else setReportsProcess(v);
      },
      quarter: (v) => {
        if (!v) return;
        if (viewTab === "Overview") setSelectedQuarter(v);
        else setReportsQuarter(v);
      },
      rview: setReportsView,
      kpi: (v) => {
        if (v && quarterlyData[activeProcess]?.[v]) {
          setSelectedKpi(v);
        } else {
          setSelectedKpi(null);
        }
      },
    }
  );

  useEffect(() => {
    setActiveDisaggDim(null);
    setActiveDisaggCat(null);
  }, [activeProcess]);

  const allQuarters = useMemo(() => {
    const set = new Set();
    ["MA", "CT", "GMP"].forEach((p) => {
      Object.values(quarterlyData[p] || {}).forEach((k) =>
        k.data.forEach((d) => set.add(d.quarter))
      );
    });
    return Array.from(set).sort((a, b) => {
      const [qa, ya] = a.split(" ");
      const [qb, yb] = b.split(" ");
      if (ya !== yb) return parseInt(ya) - parseInt(yb);
      return parseInt(qa.substring(1)) - parseInt(qb.substring(1));
    });
  }, []);

  const effectiveKpiSummary = useMemo(() => {
    const block = quarterlyData[activeProcess] || {};
    return Object.keys(block).map((kpiId) => {
      const kpi = block[kpiId];
      if (!kpi) return null;
      const series = kpi.data;
      const idx = series.findIndex((x) => x.quarter === selectedQuarter);
      const prevIdx = idx > 0 ? idx - 1 : -1;
      let value = idx >= 0 ? series[idx]?.value ?? null : null;
      let prev = prevIdx >= 0 ? series[prevIdx]?.value ?? null : null;
      const isTime = timeBasedKpis.has(kpiId);
      let status = value == null ? "error" : (isTime ? (value <= kpi.target ? "success" : value <= kpi.target * 1.05 ? "warning" : "error") : (value >= kpi.target ? "success" : value >= kpi.target * 0.95 ? "warning" : "error"));
      let trend = "flat";
      if (prev != null && value != null) {
        trend = value > prev ? "up" : value < prev ? "down" : "flat";
      }
      let item = { kpiId, kpi, value, trend, status, isTime };
      if (activeDisaggDim && activeDisaggCat && kpi.disaggregations?.[activeDisaggDim]?.[activeDisaggCat]) {
        const disaggSeries = kpi.disaggregations[activeDisaggDim][activeDisaggCat].data;
        const disIdx = disaggSeries.findIndex((x) => x.quarter === selectedQuarter);
        const disPrevIdx = disIdx > 0 ? disIdx - 1 : -1;
        value = disIdx >= 0 ? disaggSeries[disIdx]?.value ?? null : null;
        prev = disPrevIdx >= 0 ? disaggSeries[disPrevIdx]?.value ?? null : null;
        status = value == null ? "error" : (isTime ? (value <= kpi.target ? "success" : value <= kpi.target * 1.05 ? "warning" : "error") : (value >= kpi.target ? "success" : value >= kpi.target * 0.95 ? "warning" : "error"));
        trend = "flat";
        if (prev != null && value != null) {
          trend = value > prev ? "up" : value < prev ? "down" : "flat";
        }
        item = { ...item, value, status, trend };
      }
      return item;
    }).filter(Boolean);
  }, [activeProcess, selectedQuarter, activeDisaggDim, activeDisaggCat]);

  const useMedianForSteps = selectedKpi ? medianModeKpis.has(selectedKpi) : false;

  const currentSteps = useMemo(() => {
    const allSteps = processStepData[activeProcess] || {};
    const allowed = selectedKpi
      ? (KPI_TO_STEPS[activeProcess]?.[selectedKpi] || [])
      : Object.keys(allSteps);

    return allowed
      .filter((step) => allSteps[step])
      .map((step) => {
        const series = allSteps[step].data;
        const q = series.find((d) => d.quarter === selectedQuarter) || {};
        const avgDays = q.avgDays ?? null;
        const targetDays = q.targetDays ?? null;
        const medianDays = getStepMedianForQuarter(activeProcess, step, selectedQuarter);
        const metricDays = useMedianForSteps ? medianDays : avgDays;
        const variance = (metricDays != null && targetDays != null) ? metricDays - targetDays : null;

        return {
          step,
          avgDays,
          medianDays,
          metricDays,
          targetDays,
          variance,
        };
      })
      .filter((r) => r.metricDays != null && r.targetDays != null);
  }, [activeProcess, selectedQuarter, selectedKpi, useMedianForSteps]);

  // insights logic → green if metricDays ≤ targetDays; else red
  const stepsOnTrackCounts = useMemo(() => {
    let on = 0, off = 0;
    currentSteps.forEach((r) => {
      if (r.metricDays <= r.targetDays) on += 1;
      else off += 1;
    });
    return { on, off };
  }, [currentSteps]);

  return (
    <Box sx={{ width: "100%" }}>
      <StickyTop
        viewTab={viewTab}
        setViewTab={(v) => {
          setViewTab(v);
          if (v === "Reports") setReportsProcess(activeProcess);
        }}
        themeMode={themeMode}
        setThemeMode={setThemeMode}
        activeProcess={activeProcess}
        setActiveProcess={(p) => {
          setActiveProcess(p);
          setSelectedKpi(null);
        }}
        selectedQuarter={selectedQuarter}
        setSelectedQuarter={(q) => {
          setSelectedQuarter(q);
        }}
        reportsProcess={reportsProcess}
        setReportsProcess={setReportsProcess}
        reportsQuarter={reportsQuarter}
        setReportsQuarter={setReportsQuarter}
        reportsView={reportsView}
        setReportsView={setReportsView}
        allQuarters={allQuarters}
      />

      {/* Sticky KPI band + long-name banner */}
      {viewTab === "Overview" && (
        <Paper
          elevation={0}
          sx={(t) => ({
            position: "sticky",
            top: 84,
            zIndex: t.zIndex.appBar + 15,
            background: t.palette.mode === "dark" ? "rgba(18,18,18,0.9)" : "rgba(255,255,255,0.96)",
            backdropFilter: "blur(4px)",
            borderBottom: "1px solid",
            borderColor: "divider",
            px: { xs: 1, md: 2 },
            py: 1,
          })}
        >
          <SectionStrip
            title={
              activeProcess === "MA"
                ? "Marketing Authorization KPIs"
                : activeProcess === "CT"
                ? "Clinical Trials KPIs"
                : "GMP Compliance KPIs"
            }
            icon={
              activeProcess === "MA" ? (
                <Assignment fontSize="small" color="primary" />
              ) : activeProcess === "CT" ? (
                <Science fontSize="small" color="primary" />
              ) : (
                <Gavel fontSize="small" color="primary" />
              )
            }
          />
          <KPIRail
            items={effectiveKpiSummary}
            selectedKpi={selectedKpi}
            setSelectedKpi={setSelectedKpi}
            scrollToDetailsRef={detailsRef}
            selectedQuarter={selectedQuarter}
            activeDisaggDim={activeDisaggDim}
            activeDisaggCat={activeDisaggCat}
            />


          {selectedKpi && quarterlyData[activeProcess]?.[selectedKpi] && (
            <KpiStatusBanner
              kpi={quarterlyData[activeProcess][selectedKpi]}
              kpiId={selectedKpi}
              status={effectiveKpiSummary.find((item) => item.kpiId === selectedKpi)?.status}
              value={effectiveKpiSummary.find((item) => item.kpiId === selectedKpi)?.value}
              selectedQuarter={selectedQuarter}
            />
          )}
          {selectedKpi && quarterlyData[activeProcess][selectedKpi]?.disaggregations && (
            <DisaggFilters
              kpi={quarterlyData[activeProcess][selectedKpi]}
              activeDisaggDim={activeDisaggDim}
              setActiveDisaggDim={setActiveDisaggDim}
              activeDisaggCat={activeDisaggCat}
              setActiveDisaggCat={setActiveDisaggCat}
            />
          )}
        </Paper>
      )}

      <Box sx={{ px: { xs: 1, md: 2 }, py: { xs: 1, md: 2 } }}>
        {viewTab === "Overview" ? (
          <Stack spacing={2}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={5}>
                <Insights
                  activeProcess={activeProcess}
                  selectedKpi={selectedKpi}
                  selectedQuarter={selectedQuarter}
                  kpiStatusCounts={(() => {
                    const c = { success: 0, warning: 0, error: 0 };
                    effectiveKpiSummary.forEach((k) => c[k.status]++);
                    return c;
                  })()}
                  stepsOnTrackCounts={stepsOnTrackCounts}
                />
              </Grid>
              <Grid item xs={12} md={7}>
                <KpiDetails
                  activeProcess={activeProcess}
                  selectedKpi={selectedKpi}
                  selectedQuarter={selectedQuarter}
                  detailsAnchorRef={detailsRef}
                  activeDisaggDim={activeDisaggDim}
                  activeDisaggCat={activeDisaggCat}
                />
              </Grid>
            </Grid>

            <ProcessStepsBarChart
              currentSteps={currentSteps}
              selectedQuarter={selectedQuarter}
              useMedianForSteps={useMedianForSteps}
            />

            <ProcessAnalysisOverview
              activeProcess={activeProcess}
              selectedQuarter={selectedQuarter}
              currentSteps={currentSteps}
              setSelectedStep={setSelectedStep}
              useMedianForSteps={useMedianForSteps}
            />
          </Stack>
        ) : (
          <Reports
            reportsProcess={reportsProcess}
            reportsQuarter={reportsQuarter}
            reportsView={reportsView}
            volumesMode={volumesMode}
            setVolumesMode={setVolumesMode}
            setSingleStepTrend={setSingleStepTrend}
            setMultiStepTrend={setMultiStepTrend}
          />
        )}
      </Box>

      {/* Overview step modal */}
      <StepModal
        activeProcess={viewTab === "Overview" ? (activeProcess || "MA") : reportsProcess}
        selectedStep={selectedStep}
        onClose={() => setSelectedStep(null)}
      />

      {/* Reports modals */}
      <SingleStepMetricTrendModal openSpec={singleStepTrend} onClose={() => setSingleStepTrend(null)} />
      <MultiStepMetricTrendModal openSpec={multiStepTrend} onClose={() => setMultiStepTrend(null)} />

      {/* Command Palette */}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        allQuarters={allQuarters}
        onPickQuarter={(q) => (viewTab === "Overview" ? setSelectedQuarter(q) : setReportsQuarter(q))}
        onPickKpi={(proc, kpi) => {
          setViewTab("Overview");
          setActiveProcess(proc);
          setSelectedKpi(kpi);
        }}
        onPickStep={(proc, step) => {
          setViewTab("Overview");
          setActiveProcess(proc);
          setSelectedStep(step);
        }}
      />
    </Box>
  );
};

const KpiModule = () => {
  const [themeMode, setThemeMode] = useState("light");

  useEffect(() => {
    const isDark = themeMode === "dark";
    ChartJS.defaults.color = isDark ? "#e6e6e6" : "#222";
    ChartJS.defaults.borderColor = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)";
  }, [themeMode]);

  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    ChartJS.defaults.animation = !m.matches;
  }, []);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: themeMode,
          primary: { main: NDA_GREEN, dark: NDA_GREEN_DARK },
          warning: { main: TRUE_AMBER },
        },
        shape: { borderRadius: 12 },
        typography: {
          fontFamily:
            'Inter, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji"',
        },
        components: {
          MuiPaper: {
            defaultProps: { elevation: 0 },
            styleOverrides: { root: { transition: "box-shadow .18s ease, transform .18s ease" } }
          },
          MuiCard: {
            styleOverrides: {
              root: {
                borderRadius: 14,
                "&:hover": {
                  boxShadow: (t) => `0 10px 28px ${muiAlpha(t.palette.primary.main, 0.14)}`
                }
              }
            }
          },
          MuiLinearProgress: { styleOverrides: { root: { backgroundColor: "rgba(0,0,0,0.06)" } } },
        },
      }),
    [themeMode]
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <KpiModuleInner themeMode={themeMode} setThemeMode={setThemeMode} />
    </ThemeProvider>
  );
};

export default KpiModule;
