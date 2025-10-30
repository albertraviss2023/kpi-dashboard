// KpiModule.min.js — Complete fixed KPI module with enhanced volumes and yearly views
import React, { useEffect, useMemo, useState } from "react";
import {
  Box, Paper, Stack, Typography, Avatar, Chip, Tabs, Tab, Select, MenuItem,
  FormControl, InputLabel, Card, CardContent, IconButton, ToggleButtonGroup, ToggleButton, LinearProgress, CssBaseline, Divider
} from "@mui/material";
import { ThemeProvider, createTheme, alpha as alpha } from "@mui/material/styles";
import {
  Assessment, Assignment, Science, Gavel, ArrowUpward, ArrowDownward, TrendingFlat,
  Brightness4, Brightness7, BarChart as BarIcon, InfoOutlined, Download
} from "@mui/icons-material";

import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Tooltip as ChartTooltip, Legend, Filler
} from "chart.js";
import { Bar, Line, Doughnut } from "react-chartjs-2";

import ndaLogo from "../assets/nda-logo.png";
import {
  quarterlyData, processStepData, quarterlyVolumes, inspectionVolumes, bottleneckData
} from "../data/kpiData";
import "../theme/nda.css";

/* --- ChartJS + theme tokens --- */
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, ChartTooltip, Legend, Filler);
const TOK = { primary: "#2E7D32", warn: "#FFB300", bad: "#C62828", info: "#1976D2", secondary: "#7B1FA2" };
const rgba = (hex, a) => {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
};
const pct = (v) => `${Math.round(v)}%`;
const asNum = (v, d = 2) => Number(v).toFixed(d);

/* --- Enhanced utilities --- */
const getAllQuarters = () => {
  const s = new Set();
  ["MA", "CT", "GMP"].forEach((p) => Object.values(quarterlyData[p] || {}).forEach((k) => k.data.forEach((d) => s.add(d.quarter))));
  return [...s].sort((A, B) => { 
    const [qa, ya] = A.split(" "), [qb, yb] = B.split(" "); 
    return ya !== yb ? +ya - +yb : +qa.slice(1) - +qb.slice(1); 
  });
};

const timeKPIs = new Set(["median_duration_continental", "avg_turnaround_time", "avg_turnaround_time_gmp", "median_turnaround_time"]);

const KPI_STEPS = {
  MA: {
    pct_new_apps_evaluated_on_time: ["Preliminary Screening","Technical Dossier Review","Quality Review","Safety & Efficacy Review","Queries to Applicant","Applicant Response Review","Decision Issued","License Publication"],
    pct_renewal_apps_evaluated_on_time: ["Preliminary Screening","Technical Dossier Review","Decision Issued"],
    pct_variation_apps_evaluated_on_time: ["Preliminary Screening","Technical Dossier Review","Decision Issued"],
    pct_fir_responses_on_time: ["Queries to Applicant"],
    pct_query_responses_evaluated_on_time: ["Applicant Response Review"],
    pct_granted_within_90_days: ["Technical Dossier Review","Queries to Applicant","Applicant Response Review","Decision Issued"],
    median_duration_continental: ["Preliminary Screening","Technical Dossier Review","Quality Review","Safety & Efficacy Review","Queries to Applicant","Applicant Response Review","Decision Issued","License Publication"]
  },
  CT: {
    pct_new_apps_evaluated_on_time_ct: ["Administrative Screening","Ethics Review","Technical Review","GCP Inspection","Applicant Response Review","Decision Issued","Trial Registration"],
    pct_amendment_apps_evaluated_on_time: ["Administrative Screening","Technical Review","Decision Issued"],
    pct_gcp_inspections_on_time: ["GCP Inspection"],
    pct_safety_reports_assessed_on_time: ["Technical Review"],
    pct_gcp_compliant: ["GCP Inspection"],
    pct_registry_submissions_on_time: ["Trial Registration"],
    pct_capa_evaluated_on_time: ["Applicant Response Review"],
    avg_turnaround_time: ["Administrative Screening","Ethics Review","Technical Review","GCP Inspection","Applicant Response Review","Decision Issued"]
  },
  GMP: {
    pct_facilities_inspected_on_time: ["Inspection Planning","Inspection Conducted","Inspection Report Drafted"],
    pct_inspections_waived_on_time: ["Inspection Planning"],
    pct_facilities_compliant: ["Inspection Conducted","CAPA Review","Final Decision Issued"],
    pct_capa_decisions_on_time: ["CAPA Requested","CAPA Review","Final Decision Issued"],
    pct_applications_completed_on_time: ["Application Screening","Inspection Planning","Inspection Conducted","Final Decision Issued"],
    avg_turnaround_time_gmp: ["Application Screening","Inspection Planning","Inspection Conducted","Inspection Report Drafted","CAPA Requested","CAPA Review","Final Decision Issued","Report Publication"],
    median_turnaround_time: ["Application Screening","Inspection Planning","Inspection Conducted","Inspection Report Drafted","CAPA Requested","CAPA Review","Final Decision Issued","Report Publication"],
    pct_reports_published_on_time: ["Report Publication"]
  }
};

const statusOf = (val, target, isTime) => {
  if (val == null) return "error";
  if (isTime) return val <= target ? "success" : val <= target * 1.05 ? "warning" : "error";
  return val >= target ? "success" : val >= target * 0.95 ? "warning" : "error";
};

const kpiSummary = (proc, quarter, disDim = null, disCat = null) => {
  const block = quarterlyData[proc] || {};
  return Object.keys(block).map((id) => {
    const k = block[id]; if (!k) return null;
    const series = (disDim && disCat && k.disaggregations?.[disDim]?.[disCat]?.data) || k.data;
    const i = series.findIndex((x) => x.quarter === quarter);
    const prev = i > 0 ? series[i - 1]?.value : null;
    const val = i >= 0 ? series[i]?.value ?? null : null;
    const isTime = timeKPIs.has(id);
    const trend = prev != null && val != null ? (val > prev ? "up" : val < prev ? "down" : "flat") : "flat";
    return { id, k, val, trend, status: statusOf(val, k.target, isTime), isTime };
  }).filter(Boolean);
};

const stepsFor = (proc, quarter, selectedKpi) => {
  const all = processStepData[proc] || {};
  const allow = selectedKpi ? (KPI_STEPS[proc]?.[selectedKpi] || []) : Object.keys(all);
  return allow.filter((s) => all[s]).map((step) => {
    const row = (all[step].data || []).find((d) => d.quarter === quarter) || {};
    return { step, avgDays: row.avgDays ?? null, targetDays: row.targetDays ?? null };
  }).filter((r) => r.avgDays != null && r.targetDays != null);
};

/* --- Enhanced UI atoms --- */
const Strip = ({ title, icon, action }) => (
  <Box sx={(t) => ({ 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "space-between",
    px: 2, 
    py: 0.6, 
    mb: 1, 
    color: t.palette.primary.main, 
    fontWeight: 800, 
    background: alpha(t.palette.primary.main, .1), 
    borderLeft: `6px solid ${t.palette.primary.main}` 
  })}>
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      {icon}
      <Typography variant="subtitle1" fontWeight={800}>{title}</Typography>
    </Box>
    {action}
  </Box>
);

const Donut = ({ labels, data, colors = [TOK.primary, TOK.warn, TOK.bad] }) => (
  <Doughnut
    data={{ 
      labels, 
      datasets: [{ 
        data, 
        backgroundColor: colors, 
        borderColor: "#fff", 
        borderWidth: 2 
      }] 
    }}
    options={{ 
      cutout: "70%", 
      plugins: { legend: { display: false } }, 
      maintainAspectRatio: false 
    }}
  />
);

const LineChart = ({ data, title, height = 420 }) => (
  <Card><CardContent>
    <Typography variant="h6" fontWeight={900} color="primary" gutterBottom>{title}</Typography>
    <Box sx={{ height }}>
      <Line 
        data={data} 
        options={{ 
          responsive: true, 
          maintainAspectRatio: false, 
          plugins: { legend: { position: "top" } }, 
          scales: { 
            x: { grid: { display: false } }, 
            y: { beginAtZero: true, grid: { color: rgba("#000000", .06) } } 
          } 
        }} 
      />
    </Box>
  </CardContent></Card>
);

const BarChart = ({ data, title, height = 420 }) => (
  <Card><CardContent>
    <Typography variant="h6" fontWeight={900} color="primary" gutterBottom>{title}</Typography>
    <Box sx={{ height }}>
      <Bar 
        data={data} 
        options={{ 
          responsive: true, 
          maintainAspectRatio: false, 
          plugins: { legend: { position: "top" } }, 
          scales: { 
            x: { grid: { display: false } }, 
            y: { beginAtZero: true, grid: { color: rgba("#000000", .06) } } 
          } 
        }} 
      />
    </Box>
  </CardContent></Card>
);

/* --- Enhanced Top bar --- */
const TopBar = ({ tab, setTab, themeMode, setThemeMode, proc, setProc, quarter, setQuarter, allQuarters }) => (
  <Paper sx={(t) => ({ 
    position: "sticky", 
    top: 0, 
    zIndex: 10, 
    px: 2, 
    py: 1, 
    borderRadius: 0, 
    background: t.palette.mode === "dark" ? "rgba(18,18,18,.9)" : "rgba(255,255,255,.95)", 
    backdropFilter: "blur(6px)", 
    borderBottom: "1px solid", 
    borderColor: "divider" 
  })}>
    <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "flex-start", md: "center" }} justifyContent="space-between">
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Avatar src={ndaLogo} alt="NDA" variant="rounded" sx={{ width: 40, height: 40 }} />
        <Box>
          <Typography variant="h6" fontWeight={900} color="primary">Uganda National Drug Authority</Typography>
          <Typography variant="caption" color="text.secondary">Regulatory KPI Dashboard</Typography>
        </Box>
      </Stack>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Tabs value={tab} onChange={(_, v) => setTab(v)} textColor="primary" indicatorColor="primary" sx={{ "& .MuiTab-root": { fontWeight: 700 } }}>
          <Tab icon={<Assessment />} iconPosition="start" value="Overview" label="Overview" />
          <Tab icon={<BarIcon />} iconPosition="start" value="Reports" label="Reports" />
        </Tabs>
        <IconButton size="small" onClick={() => setThemeMode(themeMode === "dark" ? "light" : "dark")}>
          {themeMode === "dark" ? <Brightness7 /> : <Brightness4 />}
        </IconButton>
      </Stack>
    </Stack>
    <Divider sx={{ my: 1 }} />
    <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
      <Typography variant="subtitle2" fontWeight={800} color="primary">Filters</Typography>
      <ToggleButtonGroup exclusive value={proc} onChange={(_, v) => v && setProc(v)} size="small" color="primary">
        <ToggleButton value="MA"><Assignment sx={{ mr: .5 }} />MA</ToggleButton>
        <ToggleButton value="CT"><Science sx={{ mr: .5 }} />CT</ToggleButton>
        <ToggleButton value="GMP"><Gavel sx={{ mr: .5 }} />GMP</ToggleButton>
      </ToggleButtonGroup>
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel>Quarter</InputLabel>
        <Select label="Quarter" value={quarter} onChange={(e) => setQuarter(e.target.value)}>
          {allQuarters.map((q) => <MenuItem key={q} value={q}>{q}</MenuItem>)}
        </Select>
      </FormControl>
    </Stack>
  </Paper>
);

/* --- Enhanced KPI Cards --- */
const TrendIcon = ({ dir, time }) => {
  const IconUp = time ? ArrowUpward : ArrowUpward;
  const IconDown = time ? ArrowDownward : ArrowDownward;
  return dir === "up" ? <IconUp color={time ? "error" : "success"} fontSize="inherit" /> : 
         dir === "down" ? <IconDown color={time ? "success" : "error"} fontSize="inherit" /> : 
         <TrendingFlat color="warning" fontSize="inherit" />;
};

const KpiCard = ({ item, quarter, onClick }) => {
  const isPct = String(item.id).startsWith("pct_");
  const display = item.val == null ? "—" : isPct ? pct(item.val) : asNum(item.val);
  const progress = item.val == null ? 0 : item.isTime ? 
    Math.min(100, (item.k.target / item.val) * 100) : 
    Math.min(100, (item.val / item.k.target) * 100);
  const color = (t) => item.status === "success" ? t.palette.success.main : 
                         item.status === "warning" ? t.palette.warning.main : 
                         t.palette.error.main;

  return (
    <Card 
      onClick={onClick} 
      sx={(t) => ({ 
        width: 260, 
        cursor: "pointer", 
        border: `1px solid ${alpha(color(t), .4)}`,
        transition: "all 0.2s ease-in-out",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: t.shadows[4]
        }
      })}
    >
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle2" fontWeight={800} sx={(t) => ({ color: color(t) })}>
            {item.k.title || item.id}
          </Typography>
          <Box sx={{ fontSize: 18, lineHeight: 0 }}>
            <TrendIcon dir={item.trend} time={item.isTime} />
          </Box>
        </Stack>
        <Typography variant="h4" fontWeight={900} sx={(t) => ({ color: item.val == null ? t.palette.text.secondary : color(t) })}>
          {display}
        </Typography>
        <LinearProgress 
          variant="determinate" 
          value={progress} 
          sx={{ mt: 1.2, height: 8, borderRadius: 6 }} 
          color={item.status === "success" ? "success" : item.status === "warning" ? "warning" : "error"} 
        />
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary">{quarter}</Typography>
          <Typography variant="caption" color="text.secondary">
            Target: {item.isTime ? asNum(item.k.target) : pct(item.k.target)}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
};

/* --- Enhanced Summary Panel --- */
const SummaryPanel = ({ proc, quarter, kpis, steps }) => {
  const status = kpis.reduce((a, r) => (a[r.status] = (a[r.status] || 0) + 1, a), { success: 0, warning: 0, error: 0 });
  const stepOn = steps.reduce((a, r) => a + (r.avgDays <= r.targetDays ? 1 : 0), 0);
  const stepOff = steps.length - stepOn;

  const totalKpis = kpis.length;
  const performanceScore = totalKpis > 0 ? Math.round((status.success / totalKpis) * 100) : 0;

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Strip 
        title={`${proc === "MA" ? "Marketing Authorization" : proc === "CT" ? "Clinical Trials" : "GMP Compliance"} — Overview`} 
        icon={<Assessment fontSize="small" color="primary" />} 
      />
      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <Card sx={{ flex: 1 }}><CardContent>
          <Typography variant="subtitle1" fontWeight={900} align="center" color="primary">
            Overall KPI Performance — {quarter}
          </Typography>
          <Box sx={{ height: 150, mt: 1 }}>
            <Donut 
              labels={["On Target", "At Risk", "Off Target"]} 
              data={[status.success, status.warning, status.error]} 
            />
          </Box>
          <Typography variant="body2" align="center" sx={{ mt: 1.5 }}>
            <Box component="span" sx={{ color: TOK.primary, fontWeight: 700 }}>{status.success}</Box> on target,{" "}
            <Box component="span" sx={{ color: TOK.warn, fontWeight: 700 }}>{status.warning}</Box> at risk,{" "}
            <Box component="span" sx={{ color: TOK.bad, fontWeight: 700 }}>{status.error}</Box> off target.
          </Typography>
          <Typography variant="body2" align="center" sx={{ mt: 1, fontWeight: 700, color: "primary" }}>
            Performance Score: {performanceScore}%
          </Typography>
        </CardContent></Card>
        
        <Card sx={{ flex: 1 }}><CardContent>
          <Typography variant="subtitle1" fontWeight={900} align="center" color="primary">
            Process Steps Status — {quarter}
          </Typography>
          <Box sx={{ height: 150, mt: 1 }}>
            <Donut 
              labels={["On-track", "Off-track"]} 
              data={[stepOn, stepOff]} 
              colors={[TOK.primary, TOK.bad]}
            />
          </Box>
          <Typography variant="body2" align="center" sx={{ mt: 1.5 }}>
            <Box component="span" sx={{ color: TOK.primary, fontWeight: 700 }}>{stepOn}</Box> on-track,{" "}
            <Box component="span" sx={{ color: TOK.bad, fontWeight: 700 }}>{stepOff}</Box> off-track.
          </Typography>
          <Typography variant="body2" align="center" sx={{ mt: 1 }}>
            {steps.length} process steps monitored
          </Typography>
        </CardContent></Card>
      </Stack>
    </Paper>
  );
};

/* --- Enhanced Details Components --- */
const KpiTrend = ({ proc, kpiId, quarter, disDim, disCat }) => {
  const k = quarterlyData[proc]?.[kpiId]; 
  if (!k) return null;
  
  let series = k.data;
  if (disDim && disCat && k.disaggregations?.[disDim]?.[disCat]?.data) {
    series = k.disaggregations[disDim][disCat].data;
  }
  
  const data = {
    labels: series.map((d) => d.quarter),
    datasets: [
      { 
        label: "Performance", 
        data: series.map((d) => d.value), 
        borderColor: TOK.primary, 
        backgroundColor: rgba(TOK.primary, .2), 
        fill: true, 
        tension: .35, 
        borderWidth: 2 
      },
      { 
        label: "Target", 
        data: series.map(() => k.target), 
        borderColor: TOK.bad, 
        borderDash: [6, 4], 
        pointStyle: false 
      }
    ]
  };
  
  return <LineChart data={data} title={`${k.title || kpiId} — Trend`} />;
};

/* --- Completely Fixed RelatedVolumes Component --- */
const RelatedVolumes = ({ proc, kpiId, quarter }) => {
  const qv = quarterlyVolumes[proc] || [];
  const iv = inspectionVolumes[proc] || [];
  
  // Extract year from selected quarter (e.g., "Q2 2025" -> "2025")
  const selectedYear = quarter.split(' ')[1];
  
  // Filter data for the selected year (all quarters)
  const yearlyData = qv.filter(d => d.quarter.includes(selectedYear)) || 
                    iv.filter(d => d.quarter.includes(selectedYear));
  
  if (!yearlyData.length) {
    console.log(`No data found for ${proc} in year ${selectedYear}`);
    return null;
  }

  const labels = yearlyData.map(d => d.quarter);

  // MA KPIs - Show all quarters in the selected year
  if (proc === "MA") {
    switch(kpiId) {
      case "pct_new_apps_evaluated_on_time":
        return (
          <BarChart 
            data={{
              labels,
              datasets: [
                { 
                  label: "New Apps Submitted", 
                  data: yearlyData.map(d => d.new_apps_submitted || 0), 
                  backgroundColor: rgba(TOK.info, 0.7), 
                  borderColor: TOK.info 
                },
                { 
                  label: "New Apps Evaluated", 
                  data: yearlyData.map(d => d.new_apps_evaluated || 0), 
                  backgroundColor: rgba(TOK.primary, 0.7), 
                  borderColor: TOK.primary 
                }
              ]
            }} 
            title={`New Applications - Submitted vs Evaluated (${selectedYear})`} 
            height={300}
          />
        );
      
      case "pct_renewal_apps_evaluated_on_time":
        return (
          <BarChart 
            data={{
              labels,
              datasets: [
                { 
                  label: "Renewal Apps Submitted", 
                  data: yearlyData.map(d => d.renewal_apps_submitted || 0), 
                  backgroundColor: rgba(TOK.info, 0.7), 
                  borderColor: TOK.info 
                },
                { 
                  label: "Renewal Apps Evaluated", 
                  data: yearlyData.map(d => d.renewal_apps_evaluated || 0), 
                  backgroundColor: rgba(TOK.primary, 0.7), 
                  borderColor: TOK.primary 
                }
              ]
            }} 
            title={`Renewal Applications - Submitted vs Evaluated (${selectedYear})`} 
            height={300}
          />
        );
      
      case "pct_variation_apps_evaluated_on_time":
        return (
          <BarChart 
            data={{
              labels,
              datasets: [
                { 
                  label: "Variation Apps Submitted", 
                  data: yearlyData.map(d => d.variation_apps_submitted || 0), 
                  backgroundColor: rgba(TOK.info, 0.7), 
                  borderColor: TOK.info 
                },
                { 
                  label: "Variation Apps Evaluated", 
                  data: yearlyData.map(d => d.variation_apps_evaluated || 0), 
                  backgroundColor: rgba(TOK.primary, 0.7), 
                  borderColor: TOK.primary 
                }
              ]
            }} 
            title={`Variation Applications - Submitted vs Evaluated (${selectedYear})`} 
            height={300}
          />
        );
      
      case "pct_fir_responses_on_time":
        return (
          <BarChart 
            data={{
              labels,
              datasets: [
                { 
                  label: "FIR Queries Issued", 
                  data: yearlyData.map(d => d.fir_queries_issued || 0), 
                  backgroundColor: rgba(TOK.warn, 0.7), 
                  borderColor: TOK.warn 
                },
                { 
                  label: "FIR Responses Received", 
                  data: yearlyData.map(d => d.fir_responses_received || 0), 
                  backgroundColor: rgba(TOK.primary, 0.7), 
                  borderColor: TOK.primary 
                }
              ]
            }} 
            title={`FIR Queries vs Responses (${selectedYear})`} 
            height={300}
          />
        );
      
      case "pct_query_responses_evaluated_on_time":
        return (
          <BarChart 
            data={{
              labels,
              datasets: [
                { 
                  label: "Queries Issued", 
                  data: yearlyData.map(d => d.queries_issued || 0), 
                  backgroundColor: rgba(TOK.warn, 0.7), 
                  borderColor: TOK.warn 
                },
                { 
                  label: "Query Responses Evaluated", 
                  data: yearlyData.map(d => d.query_responses_evaluated || 0), 
                  backgroundColor: rgba(TOK.primary, 0.7), 
                  borderColor: TOK.primary 
                }
              ]
            }} 
            title={`Queries vs Responses Evaluated (${selectedYear})`} 
            height={300}
          />
        );
      
      case "pct_granted_within_90_days":
        return (
          <BarChart 
            data={{
              labels,
              datasets: [
                { 
                  label: "Applications Submitted", 
                  data: yearlyData.map(d => d.applications_received || 0), 
                  backgroundColor: rgba(TOK.info, 0.7), 
                  borderColor: TOK.info 
                },
                { 
                  label: "Applications Granted", 
                  data: yearlyData.map(d => d.applications_granted || 0), 
                  backgroundColor: rgba(TOK.primary, 0.7), 
                  borderColor: TOK.primary 
                }
              ]
            }} 
            title={`MA Applications - Submitted vs Granted (${selectedYear})`} 
            height={300}
          />
        );
      
      default:
        return (
          <Card><CardContent>
            <Typography variant="h6" color="text.secondary" align="center">
              No volume data available for {kpiId}
            </Typography>
          </CardContent></Card>
        );
    }
  }

  // CT KPIs - Show all quarters in the selected year
  if (proc === "CT") {
    switch(kpiId) {
      case "pct_new_apps_evaluated_on_time_ct":
        return (
          <BarChart 
            data={{
              labels,
              datasets: [
                { 
                  label: "New CT Apps Submitted", 
                  data: yearlyData.map(d => d.new_ct_apps_submitted || 0), 
                  backgroundColor: rgba(TOK.info, 0.7), 
                  borderColor: TOK.info 
                },
                { 
                  label: "New CT Apps Evaluated", 
                  data: yearlyData.map(d => d.new_ct_apps_evaluated || 0), 
                  backgroundColor: rgba(TOK.primary, 0.7), 
                  borderColor: TOK.primary 
                }
              ]
            }} 
            title={`New Clinical Trial Applications - Submitted vs Evaluated (${selectedYear})`} 
            height={300}
          />
        );
      
      case "pct_amendment_apps_evaluated_on_time":
        return (
          <BarChart 
            data={{
              labels,
              datasets: [
                { 
                  label: "Amendment Apps Submitted", 
                  data: yearlyData.map(d => d.amendment_apps_submitted || 0), 
                  backgroundColor: rgba(TOK.info, 0.7), 
                  borderColor: TOK.info 
                },
                { 
                  label: "Amendment Apps Evaluated", 
                  data: yearlyData.map(d => d.amendment_apps_evaluated || 0), 
                  backgroundColor: rgba(TOK.primary, 0.7), 
                  borderColor: TOK.primary 
                }
              ]
            }} 
            title={`Amendment Applications - Submitted vs Evaluated (${selectedYear})`} 
            height={300}
          />
        );
      
      case "pct_gcp_inspections_on_time":
        return (
          <BarChart 
            data={{
              labels,
              datasets: [
                { 
                  label: "GCP Inspections Requested", 
                  data: yearlyData.map(d => d.gcp_inspections_requested || 0), 
                  backgroundColor: rgba(TOK.warn, 0.7), 
                  borderColor: TOK.warn 
                },
                { 
                  label: "GCP Inspections Conducted", 
                  data: yearlyData.map(d => d.gcp_inspections_conducted || 0), 
                  backgroundColor: rgba(TOK.primary, 0.7), 
                  borderColor: TOK.primary 
                }
              ]
            }} 
            title={`GCP Inspections - Requested vs Conducted (${selectedYear})`} 
            height={300}
          />
        );
      
      case "pct_safety_reports_assessed_on_time":
        return (
          <BarChart 
            data={{
              labels,
              datasets: [
                { 
                  label: "Safety Reports Submitted", 
                  data: yearlyData.map(d => d.safety_reports_submitted || 0), 
                  backgroundColor: rgba(TOK.info, 0.7), 
                  borderColor: TOK.info 
                },
                { 
                  label: "Safety Reports Assessed", 
                  data: yearlyData.map(d => d.safety_reports_assessed || 0), 
                  backgroundColor: rgba(TOK.primary, 0.7), 
                  borderColor: TOK.primary 
                }
              ]
            }} 
            title={`Safety Reports - Submitted vs Assessed (${selectedYear})`} 
            height={300}
          />
        );
      
      case "pct_gcp_compliant":
        return (
          <BarChart 
            data={{
              labels,
              datasets: [
                { 
                  label: "GCP Assessments", 
                  data: yearlyData.map(d => d.gcp_assessments || 0), 
                  backgroundColor: rgba(TOK.info, 0.7), 
                  borderColor: TOK.info 
                },
                { 
                  label: "GCP Compliant", 
                  data: yearlyData.map(d => d.gcp_compliant || 0), 
                  backgroundColor: rgba(TOK.primary, 0.7), 
                  borderColor: TOK.primary 
                }
              ]
            }} 
            title={`GCP Assessments vs Compliant (${selectedYear})`} 
            height={300}
          />
        );
      
      case "pct_registry_submissions_on_time":
        return (
          <BarChart 
            data={{
              labels,
              datasets: [
                { 
                  label: "Registry Submissions", 
                  data: yearlyData.map(d => d.registry_submissions || 0), 
                  backgroundColor: rgba(TOK.primary, 0.7), 
                  borderColor: TOK.primary 
                }
              ]
            }} 
            title={`Registry Submissions (${selectedYear})`} 
            height={300}
          />
        );
      
      case "pct_capa_evaluated_on_time":
        return (
          <BarChart 
            data={{
              labels,
              datasets: [
                { 
                  label: "CAPA Issued", 
                  data: yearlyData.map(d => d.capa_issued || 0), 
                  backgroundColor: rgba(TOK.warn, 0.7), 
                  borderColor: TOK.warn 
                },
                { 
                  label: "CAPA Evaluated", 
                  data: yearlyData.map(d => d.capa_evaluated || 0), 
                  backgroundColor: rgba(TOK.primary, 0.7), 
                  borderColor: TOK.primary 
                }
              ]
            }} 
            title={`CAPA Issued vs Evaluated (${selectedYear})`} 
            height={300}
          />
        );
      
      default:
        return (
          <Card><CardContent>
            <Typography variant="h6" color="text.secondary" align="center">
              No volume data available for {kpiId}
            </Typography>
          </CardContent></Card>
        );
    }
  }

  // GMP KPIs - Show all quarters in the selected year
  if (proc === "GMP") {
    const gmpData = iv.filter(d => d.quarter.includes(selectedYear));
    if (!gmpData.length) {
      console.log(`No GMP data found for year ${selectedYear}`);
      return (
        <Card><CardContent>
          <Typography variant="h6" color="text.secondary" align="center">
            No GMP volume data available for {selectedYear}
          </Typography>
        </CardContent></Card>
      );
    }

    switch(kpiId) {
      case "pct_facilities_inspected_on_time":
        return (
          <BarChart 
            data={{
              labels,
              datasets: [
                { 
                  label: "Domestic Submitted", 
                  data: gmpData.map(d => d.inspection_apps_domestic || 0), 
                  backgroundColor: rgba(TOK.info, 0.6), 
                  borderColor: TOK.info 
                },
                { 
                  label: "Domestic Inspected", 
                  data: gmpData.map(d => d.inspected_domestic || 0), 
                  backgroundColor: rgba(TOK.primary, 0.6), 
                  borderColor: TOK.primary 
                },
                { 
                  label: "Foreign Submitted", 
                  data: gmpData.map(d => d.inspection_apps_foreign || 0), 
                  backgroundColor: rgba(TOK.warn, 0.6), 
                  borderColor: TOK.warn 
                },
                { 
                  label: "Foreign Inspected", 
                  data: gmpData.map(d => d.inspected_foreign || 0), 
                  backgroundColor: rgba(TOK.secondary, 0.6), 
                  borderColor: TOK.secondary 
                }
              ]
            }} 
            title={`GMP Inspection Applications vs Inspected Facilities (${selectedYear})`} 
            height={350}
          />
        );
      
      case "pct_inspections_waived_on_time":
        return (
          <BarChart 
            data={{
              labels,
              datasets: [
                { 
                  label: "Waived Inspections", 
                  data: gmpData.map(d => (d.waived_domestic || 0) + (d.waived_foreign || 0) + (d.waived_reliance || 0) + (d.waived_desk || 0)), 
                  backgroundColor: rgba(TOK.primary, 0.7), 
                  borderColor: TOK.primary 
                }
              ]
            }} 
            title={`Waived Inspections (${selectedYear})`} 
            height={300}
          />
        );
      
      case "pct_facilities_compliant":
        return (
          <BarChart 
            data={{
              labels,
              datasets: [
                { 
                  label: "Domestic Inspected", 
                  data: gmpData.map(d => d.inspected_domestic || 0), 
                  backgroundColor: rgba(TOK.info, 0.6), 
                  borderColor: TOK.info 
                },
                { 
                  label: "Domestic Compliant", 
                  data: gmpData.map(d => d.compliant_domestic || 0), 
                  backgroundColor: rgba(TOK.primary, 0.6), 
                  borderColor: TOK.primary 
                },
                { 
                  label: "Foreign Inspected", 
                  data: gmpData.map(d => d.inspected_foreign || 0), 
                  backgroundColor: rgba(TOK.warn, 0.6), 
                  borderColor: TOK.warn 
                },
                { 
                  label: "Foreign Compliant", 
                  data: gmpData.map(d => d.compliant_foreign || 0), 
                  backgroundColor: rgba(TOK.secondary, 0.6), 
                  borderColor: TOK.secondary 
                }
              ]
            }} 
            title={`GMP Inspections vs Compliant Facilities (${selectedYear})`} 
            height={350}
          />
        );
      
      case "pct_capa_decisions_on_time":
        return (
          <BarChart 
            data={{
              labels,
              datasets: [
                { 
                  label: "Domestic CAPA", 
                  data: gmpData.map(d => d.capa_domestic || 0), 
                  backgroundColor: rgba(TOK.primary, 0.6), 
                  borderColor: TOK.primary 
                },
                { 
                  label: "Foreign CAPA", 
                  data: gmpData.map(d => d.capa_foreign || 0), 
                  backgroundColor: rgba(TOK.info, 0.6), 
                  borderColor: TOK.info 
                },
                { 
                  label: "Reliance CAPA", 
                  data: gmpData.map(d => d.capa_reliance || 0), 
                  backgroundColor: rgba(TOK.warn, 0.6), 
                  borderColor: TOK.warn 
                },
                { 
                  label: "Desk CAPA", 
                  data: gmpData.map(d => d.capa_desk || 0), 
                  backgroundColor: rgba(TOK.secondary, 0.6), 
                  borderColor: TOK.secondary 
                }
              ]
            }} 
            title={`CAPA Decisions by Inspection Source (${selectedYear})`} 
            height={350}
          />
        );
      
      case "pct_applications_completed_on_time":
        return (
          <BarChart 
            data={{
              labels,
              datasets: [
                { 
                  label: "Domestic Applications", 
                  data: gmpData.map(d => d.applications_domestic || 0), 
                  backgroundColor: rgba(TOK.primary, 0.6), 
                  borderColor: TOK.primary 
                },
                { 
                  label: "Foreign Applications", 
                  data: gmpData.map(d => d.applications_foreign || 0), 
                  backgroundColor: rgba(TOK.info, 0.6), 
                  borderColor: TOK.info 
                },
                { 
                  label: "Reliance Applications", 
                  data: gmpData.map(d => d.applications_reliance || 0), 
                  backgroundColor: rgba(TOK.warn, 0.6), 
                  borderColor: TOK.warn 
                },
                { 
                  label: "Desk Applications", 
                  data: gmpData.map(d => d.applications_desk || 0), 
                  backgroundColor: rgba(TOK.secondary, 0.6), 
                  borderColor: TOK.secondary 
                }
              ]
            }} 
            title={`GMP Applications by Source (${selectedYear})`} 
            height={350}
          />
        );
      
      case "pct_reports_published_on_time":
        return (
          <BarChart 
            data={{
              labels,
              datasets: [
                { 
                  label: "Domestic Reports", 
                  data: gmpData.map(d => d.reports_domestic || 0), 
                  backgroundColor: rgba(TOK.primary, 0.6), 
                  borderColor: TOK.primary 
                },
                { 
                  label: "Foreign Reports", 
                  data: gmpData.map(d => d.reports_foreign || 0), 
                  backgroundColor: rgba(TOK.info, 0.6), 
                  borderColor: TOK.info 
                },
                { 
                  label: "Reliance Reports", 
                  data: gmpData.map(d => d.reports_reliance || 0), 
                  backgroundColor: rgba(TOK.warn, 0.6), 
                  borderColor: TOK.warn 
                },
                { 
                  label: "Desk Reports", 
                  data: gmpData.map(d => d.reports_desk || 0), 
                  backgroundColor: rgba(TOK.secondary, 0.6), 
                  borderColor: TOK.secondary 
                }
              ]
            }} 
            title={`GMP Reports Published by Inspection Type (${selectedYear})`} 
            height={350}
          />
        );
      
      default:
        return (
          <Card><CardContent>
            <Typography variant="h6" color="text.secondary" align="center">
              No volume data available for {kpiId}
            </Typography>
          </CardContent></Card>
        );
    }
  }

  return (
    <Card><CardContent>
      <Typography variant="h6" color="text.secondary" align="center">
        No volume data configured for this KPI
      </Typography>
    </CardContent></Card>
  );
};

const StepsBar = ({ proc, quarter, selectedKpi }) => {
  const rows = stepsFor(proc, quarter, selectedKpi);
  if (!rows.length) return null;
  
  const data = {
    labels: rows.map((r) => r.step),
    datasets: [
      { 
        label: "Target days", 
        data: rows.map((r) => r.targetDays), 
        backgroundColor: rgba(TOK.info, .4), 
        borderColor: TOK.info 
      },
      { 
        label: "Average days", 
        data: rows.map((r) => r.avgDays), 
        backgroundColor: rows.map((r) => r.avgDays <= r.targetDays ? TOK.primary : TOK.bad), 
        borderColor: "transparent" 
      }
    ]
  };
  
  return <BarChart data={data} title={`Process Steps — Actual vs Target (${quarter})`} height={300} />;
};

const StepsTable = ({ proc, quarter, selectedKpi }) => {
  const rows = stepsFor(proc, quarter, selectedKpi);
  if (!rows.length) return null;
  
  return (
    <Card><CardContent>
      <Typography variant="h6" fontWeight={900} color="primary" gutterBottom>
        Process Step Analysis
      </Typography>
      <Box sx={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: rgba(TOK.primary, .08), textAlign: "left" }}>
              {["Step", "Average days", "Target days", "Variance", "Status"].map((h) => (
                <th key={h} style={{ padding: "10px 12px", fontWeight: 800, color: TOK.primary }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const variance = r.avgDays - r.targetDays;
              const status = variance <= 0 ? "On Track" : "Delayed";
              const statusColor = variance <= 0 ? TOK.primary : TOK.bad;
              
              return (
                <tr key={r.step} style={{ borderBottom: "1px solid rgba(0,0,0,.06)" }}>
                  <td style={{ padding: "10px 12px" }}>{r.step}</td>
                  <td style={{ padding: "10px 12px", fontWeight: 700, color: statusColor }}>
                    {asNum(r.avgDays)}
                  </td>
                  <td style={{ padding: "10px 12px" }}>{asNum(r.targetDays)}</td>
                  <td style={{ padding: "10px 12px", fontWeight: 700, color: statusColor }}>
                    {variance > 0 ? "+" : ""}{asNum(variance)}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <Chip 
                      label={status} 
                      size="small" 
                      color={variance <= 0 ? "success" : "error"}
                      variant="outlined"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Box>
    </CardContent></Card>
  );
};

/* --- Enhanced Reports Section --- */
const metricDefs = (proc) => {
  const base = [
    { key: "cycle_time_median", label: "Cycle Time (Median)", tip: "Touch + Wait median days" },
    { key: "ext_median_days", label: "External Responsiveness (Median)" },
    { key: "opening_backlog", label: "Opening Backlog" },
    { key: "carry_over_rate", label: "Carry-over Rate", fmt: (v) => (v == null ? "—" : pct(v)) },
    { key: "avg_query_cycles", label: "Avg Query Cycles" },
    { key: "fpy_pct", label: "FPY %", fmt: (v) => (v == null ? "—" : pct(v)) },
    { key: "wait_share_pct", label: "Wait Share %", fmt: (v) => (v == null ? "—" : pct(v)) }
  ];
  
  const extra = [];
  if (proc === "MA") {
    extra.push({ 
      key: "work_to_staff_ratio", 
      label: "Work-to-Staff Ratio", 
      fmt: (v) => (v == null ? "—" : Number(v).toFixed(2)) 
    });
  }
  if (proc !== "MA") {
    extra.push({ key: "sched_median_days", label: "Scheduling Lead Time (Median)" });
  }
  
  return [...base, ...extra];
};

const VolumesChart = ({ proc }) => {
  const qv = quarterlyVolumes[proc] || [];
  const iv = inspectionVolumes[proc] || [];
  const labels = (qv.length ? qv : iv).map((d) => d.quarter);
  
  const D = (label, data, clr) => ({ 
    label, 
    data, 
    backgroundColor: rgba(clr, .65), 
    borderColor: clr 
  });
  
  let datasets = [];
  if (proc === "MA") {
    datasets = [
      D("Applications Received", qv.map((d) => d.applications_received || 0), TOK.info),
      D("Applications Completed", qv.map((d) => d.applications_completed || 0), TOK.primary),
      D("Approvals Granted", qv.map((d) => d.approvals_granted || 0), TOK.warn)
    ];
  } else if (proc === "CT") {
    datasets = [
      D("Applications Received", qv.map((d) => d.applications_received || 0), TOK.info),
      D("Applications Completed", qv.map((d) => d.applications_completed || 0), TOK.primary),
      D("GCP Requested", qv.map((d) => d.gcp_inspections_requested || 0), TOK.warn),
      D("GCP Conducted", qv.map((d) => d.gcp_inspections_conducted || 0), TOK.bad)
    ];
  } else {
    datasets = [
      D("Inspections Requested — Domestic", iv.map((d) => d.requested_domestic || 0), TOK.info),
      D("Inspections Requested — Foreign", iv.map((d) => d.requested_foreign || 0), TOK.warn),
      D("Inspections Requested — Reliance/Desk/Joint", iv.map((d) => (d.requested_reliance || 0) + (d.requested_desk || 0)), TOK.bad),
      D("Inspections Conducted — Domestic", iv.map((d) => d.conducted_domestic || 0), TOK.primary),
      D("Inspections Conducted — Foreign", iv.map((d) => d.conducted_foreign || 0), TOK.secondary),
      D("Inspections Conducted — Reliance/Desk/Joint", iv.map((d) => (d.conducted_reliance || 0) + (d.conducted_desk || 0)), "#00897B")
    ];
  }
  
  if (!labels.length) return null;
  return <BarChart data={{ labels, datasets }} title={`${proc} — Quarterly Volumes`} />;
};

const BottlenecksTable = ({ proc, quarter }) => {
  const cols = metricDefs(proc);
  const stepsObj = processStepData[proc] || {};
  const entries = Object.keys(stepsObj);
  if (!entries.length) return null;

  return (
    <Card><CardContent>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="h6" fontWeight={900} color="primary">
            Bottleneck Metrics — {proc} ({quarter})
          </Typography>
          <InfoOutlined fontSize="small" color="action" />
        </Stack>
        <IconButton size="small" color="primary">
          <Download />
        </IconButton>
      </Stack>
      
      <Box sx={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: rgba(TOK.primary, .08), textAlign: "left" }}>
              <th style={{ padding: "10px 12px", fontWeight: 800, color: TOK.primary }}>Step</th>
              {cols.map((c) => (
                <th key={c.key} style={{ padding: "10px 12px", fontWeight: 800, color: TOK.primary }}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((step) => {
              const bnRow = (bottleneckData[proc]?.[step] || []).find((d) => d.quarter === quarter) || {};
              const touch = bnRow.touch_median_days ?? null;
              const wait = bnRow.wait_median_days ?? null;
              
              const values = cols.map((c) => {
                let val;
                if (c.key === "cycle_time_median") {
                  val = (touch == null && wait == null) ? null : Number(touch || 0) + Number(wait || 0);
                } else {
                  val = bnRow[c.key] ?? null;
                }
                return c.fmt ? c.fmt(val) : (val == null ? "—" : asNum(val));
              });
              
              return (
                <tr key={step} style={{ borderBottom: "1px solid rgba(0,0,0,.06)" }}>
                  <td style={{ padding: "10px 12px", fontWeight: 600 }}>{step}</td>
                  {values.map((v, i) => (
                    <td key={cols[i].key} style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                      {v}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </Box>
    </CardContent></Card>
  );
};

const Reports = ({ proc, quarter }) => (
  <Stack spacing={2}>
    <Strip 
      title="Reports" 
      icon={<BarIcon fontSize="small" color="primary" />}
      action={
        <IconButton size="small" color="primary">
          <Download />
        </IconButton>
      }
    />
    <VolumesChart proc={proc} />
    <BottlenecksTable proc={proc} quarter={quarter} />
  </Stack>
);

/* --- Enhanced Main Component --- */
const KpiModule = () => {
  const [themeMode, setThemeMode] = useState("light");
  const [tab, setTab] = useState("Overview");
  const [proc, setProc] = useState("MA");
  const [quarter, setQuarter] = useState("Q2 2025");
  const [kpi, setKpi] = useState(null);
  const [disDim, setDisDim] = useState(null);
  const [disCat, setDisCat] = useState(null);

  useEffect(() => {
    const isDark = themeMode === "dark";
    ChartJS.defaults.color = isDark ? "#e6e6e6" : "#222";
    ChartJS.defaults.borderColor = isDark ? "rgba(255,255,255,.12)" : "rgba(0,0,0,.12)";
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    ChartJS.defaults.animation = !m.matches;
  }, [themeMode]);

  const theme = useMemo(() => createTheme({
    palette: { 
      mode: themeMode, 
      primary: { main: TOK.primary }, 
      warning: { main: TOK.warn },
      error: { main: TOK.bad },
      info: { main: TOK.info }
    },
    shape: { borderRadius: 12 },
    typography: { 
      fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, Arial',
      button: { fontWeight: 700 }
    }
  }), [themeMode]);

  const allQuarters = useMemo(getAllQuarters, []);
  const kpis = useMemo(() => kpiSummary(proc, quarter, disDim, disCat), [proc, quarter, disDim, disCat]);

  const handleTabChange = (newTab) => {
    setTab(newTab);
    if (newTab !== "Overview") {
      setKpi(null);
      setDisDim(null);
      setDisCat(null);
    }
  };

  const handleProcChange = (newProc) => {
    setProc(newProc);
    setKpi(null);
    setDisDim(null);
    setDisCat(null);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <TopBar
        tab={tab} 
        setTab={handleTabChange}
        themeMode={themeMode} 
        setThemeMode={setThemeMode}
        proc={proc} 
        setProc={handleProcChange}
        quarter={quarter} 
        setQuarter={setQuarter}
        allQuarters={allQuarters}
      />

      {tab === "Overview" && (
        <Box sx={{ px: { xs: 1, md: 2 }, py: 2 }}>
          <SummaryPanel 
            proc={proc} 
            quarter={quarter} 
            kpis={kpis} 
            steps={stepsFor(proc, quarter, null)} 
          />
          
          <Strip 
            title="KPI Cards" 
            icon={<Assessment fontSize="small" color="primary" />}
          />
          
          <Box sx={{ 
            display: "flex", 
            gap: 1.5, 
            overflowX: "auto", 
            pb: 1,
            "&::-webkit-scrollbar": { height: 8 },
            "&::-webkit-scrollbar-track": { background: "rgba(0,0,0,0.1)", borderRadius: 4 },
            "&::-webkit-scrollbar-thumb": { background: "rgba(0,0,0,0.2)", borderRadius: 4 }
          }}>
            {kpis.map((item) => (
              <KpiCard 
                key={item.id} 
                item={item} 
                quarter={quarter} 
                onClick={() => setKpi(kpi === item.id ? null : item.id)} 
              />
            ))}
          </Box>

          {kpi && (
            <Stack spacing={2} sx={{ mt: 2 }}>
              {quarterlyData[proc]?.[kpi]?.disaggregations && (
                <Card><CardContent>
                  <Typography variant="subtitle2" fontWeight={900} sx={{ mb: 1 }}>
                    Filter by Dimension
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {Object.keys(quarterlyData[proc][kpi].disaggregations).map((d) => (
                      <Chip 
                        key={d} 
                        label={d} 
                        variant={disDim === d ? "filled" : "outlined"} 
                        color="primary"
                        onClick={() => { 
                          if (disDim === d) { 
                            setDisDim(null); 
                            setDisCat(null); 
                          } else { 
                            setDisDim(d); 
                            setDisCat(null); 
                          } 
                        }} 
                      />
                    ))}
                    {disDim && Object.keys(quarterlyData[proc][kpi].disaggregations[disDim] || {}).map((c) => (
                      <Chip 
                        key={c} 
                        label={c} 
                        variant={disCat === c ? "filled" : "outlined"} 
                        color="success"
                        onClick={() => setDisCat(disCat === c ? null : c)} 
                      />
                    ))}
                  </Stack>
                </CardContent></Card>
              )}

              <KpiTrend proc={proc} kpiId={kpi} quarter={quarter} disDim={disDim} disCat={disCat} />
              <RelatedVolumes proc={proc} kpiId={kpi} quarter={quarter} />
              <StepsBar proc={proc} quarter={quarter} selectedKpi={kpi} />
              <StepsTable proc={proc} quarter={quarter} selectedKpi={kpi} />
            </Stack>
          )}
        </Box>
      )}

      {tab === "Reports" && (
        <Box sx={{ px: { xs: 1, md: 2 }, py: 2 }}>
          <Reports proc={proc} quarter={quarter} />
        </Box>
      )}
    </ThemeProvider>
  );
};

export default KpiModule;