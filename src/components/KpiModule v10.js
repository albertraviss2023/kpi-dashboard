// KpiModule.js — compact refactor (functionally equivalent)
// ⚠️ No new deps. Keeps all features; compresses repeated code via small utilities.

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box, Grid, Paper, Stack, Typography, Avatar, Chip, Tabs, Tab, Select, MenuItem,
  FormControl, InputLabel, Card, CardContent, IconButton, ToggleButtonGroup, ToggleButton,
  LinearProgress, CssBaseline, Divider, Tooltip
} from "@mui/material";
import { ThemeProvider, createTheme, alpha as muiAlpha } from "@mui/material/styles";
import {
  Assessment, BarChart, Assignment, Science, Gavel, ArrowUpward, ArrowDownward, TrendingFlat,
  Brightness4, Brightness7, GetApp, CheckCircleOutline, ShowChart, WarningAmberRounded,
  ErrorOutline, Close, OpenInFull, InfoOutlined
} from "@mui/icons-material";

import Plot from 'react-plotly.js';

import ndaLogo from "../assets/nda-logo.png";
import {
  quarterlyData, processStepData, quarterlyVolumes, inspectionVolumes,
  bottleneckData, kpiCounts
} from "../data/kpiData";
import '../theme/nda.css';
/* ---------------- tokens ---------------- */
const NDA_GREEN = "#2E7D32";
const NDA_GREEN_DARK = "#1B5E20";
const TRUE_AMBER = "#FFB300";
const tokens = {
  primary: NDA_GREEN, accent: "#2c58dd", ok: "#2E7D32", warn: TRUE_AMBER, bad: "#C62828", info: "#1976D2"
};
const a = (hex, alpha) => {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/* ---------------- Small helpers ---------------- */
const statusColor = (s, t) => s === "success" ? t.palette.success.main : s === "warning" ? t.palette.warning.main : t.palette.error.main;
const statusBg = (s, t) => muiAlpha(statusColor(s, t), 0.14);
const statusIcon = (s) => s === "success" ? <CheckCircleOutline fontSize="small" /> : s === "warning" ? <WarningAmberRounded fontSize="small" /> : <ErrorOutline fontSize="small" />;
const lastN = (arr = [], n = 6) => arr.slice(Math.max(0, arr.length - n));
const pct = (v) => `${Math.round(v)}%`;
const asNum = (v, d = 2) => Number(v).toFixed(d);
const csv = (rows, cols, fname) => {
  if (!rows?.length) return;
  const head = cols.map(c => c.label).join(",");
  const body = rows.map(r => cols.map(c => String(r[c.key] ?? "—")).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([head + "\n" + body], { type: "text/csv" }));
  const aTag = document.createElement("a"); aTag.href = url; aTag.download = fname; aTag.click(); URL.revokeObjectURL(url);
};
const tinyKpiLabel = (k) =>
  (k || "").replace(/pct_/,'').replace(/on time/i,'').replace(/avg /i,'average ').replace(/\bApps\b/i,'Applications')
    .replace(/\bCT\b/i,'Clinical trials').replace(/TAT.*$/i,'turnaround time').trim().replace(/\s{2,}/g,' ').replace(/^./,c=>c.toLowerCase());

/* ---------------- KPI names + step mapping ---------------- */
const KPI_NAME = {
  pct_new_apps_evaluated_on_time: { short: "New Apps on Time", long: "Percentage of New Applications Evaluated On Time" },
  pct_renewal_apps_evaluated_on_time: { short: "Renewals on Time", long: "Percentage of Renewal Applications Evaluated On Time" },
  pct_variation_apps_evaluated_on_time: { short: "Variations on Time", long: "Percentage of Variation Applications Evaluated On Time" },
  pct_fir_responses_on_time: { short: "F.I.R Responses on Time", long: "Percentage of Further Information Responses On Time" },
  pct_query_responses_evaluated_on_time: { short: "Query Responses on Time", long: "Percentage of Query Responses Evaluated On Time" },
  pct_granted_within_90_days: { short: "Granted ≤ 90 Days", long: "Percentage of Applications Granted Within 90 Days" },
  median_duration_continental: { short: "Median Duration", long: "Median Duration to Grant (Days, Continental)" },
  pct_new_apps_evaluated_on_time_ct: { short: "CT New Apps on Time", long: "Clinical Trials: Percentage of New Applications Evaluated On Time" },
  pct_amendment_apps_evaluated_on_time: { short: "Amendments on Time", long: "Clinical Trials: % of Amendment Applications Evaluated On Time" },
  pct_gcp_inspections_on_time: { short: "GCP Inspections on Time", long: "Clinical Trials: % of GCP Inspections Completed On Time" },
  pct_safety_reports_assessed_on_time: { short: "Safety Reports on Time", long: "Clinical Trials: % of Safety Reports Assessed On Time" },
  pct_gcp_compliant: { short: "GCP Compliant", long: "Clinical Trials: % of Sites Compliant with GCP" },
  pct_registry_submissions_on_time: { short: "Registry on Time", long: "Clinical Trials: % of Registry Submissions On Time" },
  pct_capa_evaluated_on_time: { short: "CAPA on Time", long: "Clinical Trials: % of CAPA Evaluations Completed On Time" },
  avg_turnaround_time: { short: "Avg TAT (Days)", long: "Clinical Trials: Average Turnaround Time (Days)" },
  pct_facilities_inspected_on_time: { short: "Facilities Inspected on Time", long: "GMP: % of Facilities Inspected On Time" },
  pct_inspections_waived_on_time: { short: "Waivers on Time", long: "GMP: % of Inspections Waived On Time" },
  pct_facilities_compliant: { short: "Facilities Compliant", long: "GMP: % of Facilities Compliant" },
  pct_capa_decisions_on_time: { short: "CAPA Decisions on Time", long: "GMP: % of CAPA Decisions on Time" },
  pct_applications_completed_on_time: { short: "Apps Completed on Time", long: "GMP: % of Applications Completed On Time" },
  avg_turnaround_time_gmp: { short: "Avg TAT (GMP)", long: "GMP: Average Turnaround Time (Days)" },
  median_turnaround_time: { short: "Median TAT", long: "GMP: Median Turnaround Time (Days)" },
  pct_reports_published_on_time: { short: "Reports on Time", long: "GMP: % of Reports Published On Time" },
};
const timeKPIs = new Set(["median_duration_continental","avg_turnaround_time","avg_turnaround_time_gmp","median_turnaround_time"]);
const medianKPIs = new Set(["median_duration_continental","median_turnaround_time"]);
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

/* ---------------- Micro UI ---------------- */
const Strip = ({ title, icon=null }) => (
  <Box sx={t=>({
    display:"inline-flex",alignItems:"center",gap:1,px:2.2,py:.8,mb:1.5,color:t.palette.primary.main,
    fontWeight:900,background:muiAlpha(t.palette.primary.main,.12),borderLeft:`6px solid ${t.palette.primary.main}`,
    clipPath:"polygon(0% 0%, 95% 0%, 100% 50%, 95% 100%, 0% 100%)"
  })}>{icon}<Typography variant="subtitle1" fontWeight={900} color="primary">{title}</Typography></Box>
);

const TrendIcon = ({ trend, isTime }) => {
  const sx = { verticalAlign: "middle", fontSize: 18 };
  if (isTime) return trend === "down" ? <ArrowDownward color="success" sx={sx}/> : trend === "up" ? <ArrowUpward color="error" sx={sx}/> : <TrendingFlat color="warning" sx={sx}/>;
  return trend === "up" ? <ArrowUpward color="success" sx={sx}/> : trend === "down" ? <ArrowDownward color="error" sx={sx}/> : <TrendingFlat color="warning" sx={sx}/>;
};

const Fullscreen = ({ title, id, children }) => {
  const [open,setOpen]=useState(false);
  return (
    <Box position="relative">
      <Tooltip title="Fullscreen">
        <IconButton size="small" onClick={()=>setOpen(true)} sx={{position:"absolute",right:8,top:8,zIndex:2}} aria-label={`Fullscreen ${id||title}`}>
          <OpenInFull fontSize="small"/>
        </IconButton>
      </Tooltip>
      <Box>{children}</Box>
      {open && (
        <Paper role="dialog" aria-modal="true" elevation={8}
          onKeyDown={e=>e.key==="Escape"&&setOpen(false)}
          sx={{position:"fixed",inset:0,zIndex:t=>t.zIndex.modal+10,bgcolor:t=>t.palette.mode==="dark"?"rgba(10,10,10,.95)":"rgba(255,255,255,.98)",p:{xs:1,md:2}}}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{mb:1}}>
            <Typography variant="h6" fontWeight={900}>{title}</Typography>
            <IconButton onClick={()=>setOpen(false)} aria-label="Close fullscreen"><Close/></IconButton>
          </Stack>
          <Box sx={{height:{xs:"80vh",md:"86vh"}}}>{children}</Box>
        </Paper>
      )}
    </Box>
  );
};

const SparklinePlot = ({ series=[], isTime=false }) => {
  if (!series.length) return <Box sx={{width:140,height:40, bgcolor:'grey.200'}} />;
  const labels = series.map(d=>d.quarter);
  const data = series.map(d=>d.value ?? null).filter(Boolean);
  const color = isTime ? tokens.bad : tokens.ok;
  const plotlyData = [{ type: 'scatter', mode: 'lines', x: labels, y: data, line: {color, width:2}, hoverinfo:'skip' }];
  const layout = {
    width:140,
    height:40,
    margin:{l:0,r:0,t:0,b:0},
    xaxis:{showgrid:false, zeroline:false, showticklabels:false, showline:false},
    yaxis:{showgrid:false, zeroline:false, showticklabels:false, showline:false},
    showlegend: false,
    hovermode: false,
    dragmode: false
  };
  return <Plot data={plotlyData} layout={layout} config={{staticPlot: true, displayModeBar: false}} />;
};

/* ---------------- URL sync ---------------- */
const useUrlState = (stateObj, setters) => {
  // read on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    Object.entries(setters).forEach(([key, setter]) => {
      const val = params.get(key);
      if (val != null && setter) setter(val);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // write on state change
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    Object.entries(stateObj).forEach(([k, v]) => {
      if (v == null || v === "") params.delete(k);
      else params.set(k, v);
    });
    const url = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", url);
  }, [JSON.stringify(stateObj)]);
};


/* ---------------- Data adapters ---------------- */
const getAllQuarters = () => {
  const s=new Set(); ["MA","CT","GMP"].forEach(p=>Object.values(quarterlyData[p]||{}).forEach(k=>k.data.forEach(d=>s.add(d.quarter))));
  return [...s].sort((A,B)=>{ const [qa,ya]=A.split(" "),[qb,yb]=B.split(" "); return ya!==yb?+ya-+yb:+qa.slice(1)-+qb.slice(1); });
};
const stepMedianFor = (proc, step, q) => {
  const rows=(bottleneckData[proc]||{})[step]||[]; const r=rows.find(x=>x.quarter===q); if(!r) return null;
  if (typeof r.ext_median_days==="number") return r.ext_median_days;
  if (typeof r.sched_median_days==="number") return r.sched_median_days;
  const touch=+r.touch_median_days||0, wait=+r.wait_median_days||0; return touch+wait || null;
};
const kpiSummary = (proc, quarter, disDim=null, disCat=null) => {
  const block=quarterlyData[proc]||{};
  return Object.keys(block).map(kid=>{
    const k=block[kid]; if(!k) return null;
    const series = (disDim && disCat && k.disaggregations?.[disDim]?.[disCat]?.data) || k.data;
    const idx=series.findIndex(x=>x.quarter===quarter), prevIdx=idx>0?idx-1:-1;
    const value=idx>=0 ? (series[idx]?.value??null) : null, prev=prevIdx>=0 ? (series[prevIdx]?.value??null) : null;
    const isTime=timeKPIs.has(kid);
    const status = value==null ? "error" : (isTime ? (value<=k.target?"success": value<=k.target*1.05?"warning":"error")
                                                 : (value>=k.target?"success": value>=k.target*0.95?"warning":"error"));
    const trend = (prev!=null && value!=null) ? (value>prev?"up": value<prev?"down":"flat") : "flat";
    return { kpiId:kid, kpi:k, value, trend, status, isTime };
  }).filter(Boolean);
};
const stepsFor = (proc, quarter, selectedKpi) => {
  const all=processStepData[proc]||{};
  const allow = selectedKpi ? (KPI_STEPS[proc]?.[selectedKpi]||[]) : Object.keys(all);
  return allow.filter(s=>all[s]).map(step=>{
    const s=all[step].data; const row = s.find(d=>d.quarter===quarter) || {};
    return { step, avgDays: row.avgDays??null, targetDays: row.targetDays??null, medianDays: stepMedianFor(proc,step,quarter) };
  }).map(r=> ({...r, metricDays: (selectedKpi && medianKPIs.has(selectedKpi)) ? r.medianDays : (r.medianDays || r.avgDays),
                variance: (r.metricDays !=null && r.targetDays!=null) ? (r.metricDays - r.targetDays ) : null }))
    .filter(r=>r.metricDays!=null && r.targetDays!=null);
};
const countOnOff = (rows) =>
  rows.reduce((acc, r) => {
    acc[r.metricDays <= r.targetDays ? "on" : "off"] += 1;
    return acc;
  }, { on: 0, off: 0 });

/* ---------------- Reusable charts ---------------- */
const BarChartPlot = ({ data, title, id, height=340 }) => {
  const { labels, datasets } = data;
  const plotlyData = datasets.map((ds) => ({
    type: 'bar',
    x: labels,
    y: ds.data,
    name: ds.label,
    marker: {
      color: Array.isArray(ds.backgroundColor) ? ds.backgroundColor : ds.backgroundColor || tokens.primary
    },
    text: ds.data.map(d => Number.isFinite(d) ? d.toLocaleString() : '—'),
    textposition: 'auto',
    textfont: { size: 11 }
  }));
  const barmode = datasets.every(d => d.stack) ? 'stack' : 'group';
  const layout = {
    title: { text: title, x: 0.5, font: { size: 16 } },
    height,
    margin: { t: 50, l: 40, r: 40, b: 40 },
    xaxis: { title: { text: '' }, gridcolor: a('#000', 0.06), showline: true, linewidth: 1 },
    yaxis: { title: { text: '' }, gridcolor: a('#000', 0.06), showline: true, linewidth: 1 },
    barmode,
    legend: { yanchor: 'top', y: 0.99, xanchor: 'left', x: 0.01 }
  };
  return (
    <Fullscreen title={title} id={id}>
      <Plot data={plotlyData} layout={layout} config={{ responsive: true, displayModeBar: true }} style={{ width: '100%', height: '100%' }} />
    </Fullscreen>
  );
};
const LineChartPlot = ({ data, title, id, height=340, maxPct=false }) => {
  const { labels, datasets } = data;
  const plotlyData = datasets.map((ds) => ({
    type: 'scatter',
    mode: 'lines',
    x: labels,
    y: ds.data,
    name: ds.label,
    line: {
      color: ds.borderColor,
      width: ds.borderWidth || 2,
      dash: ds.borderDash ? 'dash' : 'solid'
    },
    fill: ds.fill ? 'tonexty' : null,
    marker: { size: ds.pointRadius || 4 }
  }));
  const layout = {
    title: { text: title, x: 0.5, font: { size: 16 } },
    height,
    margin: { t: 50, l: 40, r: 40, b: 40 },
    xaxis: { title: { text: '' }, showgrid: false },
    yaxis: {
      title: { text: '' },
      gridcolor: a('#000', 0.06),
      range: maxPct ? [0, 100] : undefined
    },
    legend: { yanchor: 'top', y: 0.99, xanchor: 'left', x: 0.01 }
  };
  return (
    <Fullscreen title={title} id={id}>
      <Plot data={plotlyData} layout={layout} config={{ responsive: true, displayModeBar: true }} style={{ width: '100%', height: '100%' }} />
    </Fullscreen>
  );
};

/* ---------------- Tiny components ---------------- */
const DonutPlot = ({ labels, data, palette=[tokens.ok,tokens.warn,tokens.bad] }) => (
  <Plot
    data={[
      {
        type: 'pie',
        labels,
        values: data,
        marker: { colors: palette.slice(0, data.length) },
        hole: 0.7,
        textinfo: 'none',
        hoverinfo: 'label+value+percent',
        showlegend: false
      }
    ]}
    layout={{
      height: 120,
      margin: { l: 0, r: 0, t: 0, b: 0 },
      paper_bgcolor: 'transparent'
    }}
    config={{ displayModeBar: false, staticPlot: true }}
  />
);
const Skeleton = ({ h=240 }) => <Box role="status" aria-label="Loading" sx={{height:h,borderRadius:2,bgcolor:t=>muiAlpha(t.palette.text.primary,.06)}}/>;

/* ---------------- StickyTop ---------------- */
const StickyTop = (p) => {
  const {
    viewTab,setViewTab,themeMode,setThemeMode,
    activeProcess,setActiveProcess,selectedQuarter,setSelectedQuarter,
    reportsProcess,setReportsProcess,reportsQuarter,setReportsQuarter,reportsView,setReportsView,allQuarters
  } = p;
  return (
    <Paper elevation={0} sx={t=>({
      position:"sticky",top:0,zIndex:t.zIndex.appBar+20,px:{xs:1.5,md:2.5},pt:1.25,pb:1,borderRadius:0,backdropFilter:"blur(6px)",
      backgroundColor:t.palette.mode==="dark"?"rgba(18,18,18,.78)":"rgba(255,255,255,.92)",borderBottom:"1px solid",borderColor:"divider"
    })}>
      <Stack direction={{xs:"column",md:"row"}} spacing={2} alignItems={{xs:"flex-start",md:"center"}} justifyContent="space-between" sx={{mb:1}}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar src={ndaLogo} alt="NDA Logo" variant="rounded" sx={{width:48,height:48}}/>
          <Box>
            <Typography variant="h5" fontWeight={900} color="primary">Uganda National Drug Authority</Typography>
            <Typography variant="body2" color="text.secondary">Regulatory KPI Dashboard</Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <Tabs value={viewTab} onChange={(_,v)=>setViewTab(v)} textColor="primary" indicatorColor="primary" sx={{"& .MuiTab-root":{fontWeight:700}}}>
            <Tab icon={<Assessment/>} iconPosition="start" value="Overview" label="Overview"/>
            <Tab icon={<BarChart/>} iconPosition="start" value="Reports" label="Reports"/>
          </Tabs>
          <IconButton onClick={()=>setThemeMode(themeMode==="dark"?"light":"dark")} size="small" aria-label="toggle theme">
            {themeMode==="dark"?<Brightness7/>:<Brightness4/>}
          </IconButton>
        </Stack>
      </Stack>

      <Divider sx={{mb:1}}/>
      {viewTab==="Overview" ? (
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <Typography variant="subtitle1" fontWeight={700} sx={{mr:1}} color="primary">Filters</Typography>
          <ToggleButtonGroup exclusive value={activeProcess} onChange={(_,v)=>v&&setActiveProcess(v)} size="small" color="primary" aria-label="Process filter">
            <ToggleButton value="MA"><Assignment sx={{mr:.5}}/>MA</ToggleButton>
            <ToggleButton value="CT"><Science sx={{mr:.5}}/>CT</ToggleButton>
            <ToggleButton value="GMP"><Gavel sx={{mr:.5}}/>GMP</ToggleButton>
          </ToggleButtonGroup>
          <FormControl size="small" sx={{minWidth:160}}>
            <InputLabel>Quarter</InputLabel>
            <Select label="Quarter" value={selectedQuarter} onChange={(e)=>setSelectedQuarter(e.target.value)}>
              {allQuarters.map(q=><MenuItem key={q} value={q}>{q}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>
      ) : (
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <Typography variant="subtitle1" fontWeight={700} sx={{mr:1}} color="primary">Filters</Typography>
          <FormControl size="small" sx={{minWidth:160}}>
            <InputLabel>Process (for table)</InputLabel>
            <Select label="Process (for table)" value={reportsProcess} onChange={(e)=>p.setReportsProcess(e.target.value)}>
              <MenuItem value="MA">MA — Marketing Authorization</MenuItem>
              <MenuItem value="CT">CT — Clinical Trials</MenuItem>
              <MenuItem value="GMP">GMP — Compliance</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{minWidth:160}}>
            <InputLabel>View</InputLabel>
            <Select label="View" value={reportsView} onChange={(e)=>setReportsView(e.target.value)}>
              <MenuItem value="Bottleneck Metrics">Bottleneck Metrics</MenuItem>
              <MenuItem value="Quarterly Volumes">Quarterly Volumes</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{minWidth:140}}>
            <InputLabel>Quarter (table)</InputLabel>
            <Select label="Quarter (table)" value={reportsQuarter} onChange={(e)=>setReportsQuarter(e.target.value)}>
              {allQuarters.map(q=><MenuItem key={q} value={q}>{q}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>
      )}
    </Paper>
  );
};

/* ---------------- KPI rail + card ---------------- */
const KpiCard = ({ item, selected, onOpenTrend, quarter }) => {
  const isPct = String(item.kpiId).startsWith("pct_");
  const val = item.value; const display = val==null ? "No data" : isPct ? pct(val) : asNum(val);
  const series = item.kpi?.data||[]; const idx=series.findIndex(d=>d.quarter===quarter); const prev=idx>0?series[idx-1]:null;
  const delta = (val!=null && prev?.value!=null) ? (val - prev.value) : null;
  const deltaTxt = delta==null ? "" : isPct ? `${delta>0?"+":""}${delta.toFixed(1)}%` : `${delta>0?"+":""}${delta.toFixed(2)}`;
  const progress = val==null ? 0 : ( item.isTime ? Math.min(100, (item.kpi.target / val)*100) : Math.min(100,(val/item.kpi.target)*100) );
  const short = KPI_NAME[item.kpiId]?.short || item.kpi.short || item.kpi.title || item.kpiId;

  return (
    <CardContent sx={{ pb:"14px !important", display:"flex", flexDirection:"column", gap:1, flexGrow:1 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{minHeight:48}}>
        <Tooltip arrow title={<Box sx={{p:.5}}><Typography variant="caption">Quarter: {quarter}</Typography><br/><Typography variant="caption">Target: {isPct?pct(item.kpi.target):item.kpi.target}</Typography></Box>}>
          <Typography variant="subtitle1" fontWeight={800}
            sx={t=>({ color: statusColor(item.status,t), display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" })}>
            {short}
          </Typography>
        </Tooltip>
        <IconButton size="small" onClick={onOpenTrend} aria-label="Open KPI trend" title="Open trend">
          <TrendIcon trend={item.trend} isTime={item.isTime}/>
        </IconButton>
      </Stack>

      <Stack direction="row" alignItems="baseline" spacing={1}>
        <Typography variant="h4" fontWeight={900} sx={t=>({ color: val==null ? t.palette.text.secondary : statusColor(item.status,t) })}>
          {display}
        </Typography>
        {delta!=null && (
          <Chip size="small" label={`${deltaTxt} vs prev`} color={item.isTime ? (delta<0?"success":"error") : (delta>0?"success":"error")} variant="outlined" sx={{fontWeight:700}}/>
        )}
      </Stack>

      {val!=null && <LinearProgress aria-label="Progress to target" variant="determinate" value={progress}
        color={item.status==="success"?"success": item.status==="warning"?"warning":"error"} sx={{height:8,borderRadius:4}}/>}

      <Box sx={{mt:1}}><SparklinePlot series={lastN(series,6)} isTime={item.isTime}/></Box>
      <Typography variant="caption" color="text.secondary" sx={{mt:.5,fontStyle:"italic"}}>{quarter} • {tinyKpiLabel(item.kpiId)}</Typography>
    </CardContent>
  );
};

const KPIRail = ({ items, selectedKpi, setSelectedKpi, scrollRef, quarter }) => (
  <Box sx={{display:"flex",gap:2,overflowX:"auto",pb:1,scrollSnapType:"x proximity","&::-webkit-scrollbar":{height:8},"&::-webkit-scrollbar-thumb":{background:"rgba(0,0,0,.25)",borderRadius:8}}}>
    {items.map(item=>(
      <Card key={item.kpiId} onClick={()=>setSelectedKpi(s=>s===item.kpiId?null:item.kpiId)}
        sx={t=>({ width:"clamp(220px,18vw,300px)", minHeight:170, flex:"0 0 auto", scrollSnapAlign:"start", cursor:"pointer",
          transition:"transform .18s ease, box-shadow .18s ease, border-color .18s ease",
          border:`1px solid ${selectedKpi===item.kpiId?t.palette.primary.main:"rgba(0,0,0,.08)"}`,
          "&:hover":{boxShadow:`0 10px 28px ${muiAlpha(t.palette.primary.main,.18)}`, transform:"translateY(-2px)"},
          display:"flex", flexDirection:"column" })}>
        <KpiCard item={item} selected={selectedKpi===item.kpiId}
          quarter={quarter}
          onOpenTrend={(e)=>{ e.stopPropagation(); setSelectedKpi(item.kpiId); requestAnimationFrame(()=>scrollRef?.current?.scrollIntoView({behavior:"smooth",block:"start"})); }}/>
      </Card>
    ))}
  </Box>
);

/* ---------------- Disaggregations ---------------- */
const Disaggs = ({ kpi, dim, setDim, cat, setCat }) => {
  const dims = kpi?.disaggregations ? Object.keys(kpi.disaggregations) : [];
  if (!dims.length) return null;
  const cats = dim ? Object.keys(kpi.disaggregations[dim]||{}) : [];
  return (
    <Box sx={{mt:1.25}}>
      <Typography variant="body2" sx={{mb:.5,fontWeight:700}}>Filter by:</Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" sx={{mb:1}}>
        <Typography variant="caption" sx={{fontWeight:700,mr:.5}}>dimension:</Typography>
        {dims.map(d=><Chip key={d} label={d} variant={dim===d?"filled":"outlined"} color="success"
          onClick={()=>{ if (dim===d){ setDim(null); setCat(null);} else { setDim(d); setCat(null);} }}/>)}
      </Stack>
      {!!cats.length && (
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Typography variant="caption" sx={{fontWeight:700,mr:.5}}>{dim}:</Typography>
          {cats.map(c=><Chip key={c} label={c} variant={cat===c?"filled":"outlined"} color="success" onClick={()=>setCat(cat===c?null:c)}/>)}
        </Stack>
      )}
    </Box>
  );
};

/* ---------------- Banners ---------------- */
const KpiBanner = ({ kpi, kpiId, status, value, quarter }) => {
  if (!kpi) return <Box sx={{mt:1,p:2,bgcolor:'error.light',borderRadius:1}}><Typography color="error">KPI data not available for {kpiId}</Typography></Box>;
  const isPct = String(kpiId).startsWith("pct_");
  const fmt = (v)=> v==null ? "—" : isPct ? pct(v) : asNum(v);
  const long = KPI_NAME[kpiId]?.long || kpi.title || kpiId;
  const delta = value==null || kpi.target==null ? null : value - kpi.target;
  const deltaText = delta==null ? "" : isPct ? `${delta>0?"+":""}${delta.toFixed(1)}%` : `${delta>0?"+":""}${delta.toFixed(1)}`;
  return (
    <Box sx={t=>({
      mt:1,display:"inline-flex",alignItems:"center",gap:2,px:2.2,py:1,borderLeft:`6px solid ${statusColor(status,t)}`,
      color:statusColor(status,t), background:statusBg(status,t), borderRadius:1,
      clipPath:"polygon(0% 0%, 95% 0%, 100% 50%, 95% 100%, 0% 100%)"
    })}>
      <Typography variant="subtitle1" fontWeight={900} sx={{mr:1}}>{long}</Typography>
      <Divider orientation="vertical" flexItem sx={{borderColor:muiAlpha("#000",.12)}}/>
      <Stack direction="row" spacing={2} sx={{color:"inherit"}}>
        <Typography variant="body2"><b>Current ({quarter})</b>: {fmt(value)}</Typography>
        <Typography variant="body2"><b>Target</b>: {fmt(kpi.target)}</Typography>
        <Typography variant="body2"><b>Baseline</b>: {fmt(kpi.baseline)}</Typography>
        <Typography variant="body2" sx={{display:"inline-flex",alignItems:"center",gap:.5}}>
          {statusIcon(status)} <b>Status</b>: {status==="success"?"On Target": status==="warning"?"Near Target":"Below Target"}
          {delta!=null && <span style={{fontStyle:"italic",marginLeft:6}}>({deltaText})</span>}
        </Typography>
      </Stack>
    </Box>
  );
};

/* ---------------- Insights (donuts) ---------------- */
const Insights = ({ statusCounts, stepCounts, quarter }) => {
  return (
    <Paper elevation={0} sx={{p:2,borderRadius:2,boxShadow:3}}>
      <Strip title="KPI Compliance" icon={<CheckCircleOutline fontSize="small" color="primary"/>}/>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card sx={{height:"100%",boxShadow:3,display:"flex",flexDirection:"column"}}>
            <CardContent sx={{p:2,flexGrow:1}}>
              <Typography variant="h6" fontWeight={900} align="center" color="primary">KPI performance status</Typography>
              <Box sx={{height:120,display:"flex",justifyContent:"center"}}><DonutPlot labels={["On track","At risk","Off track"]} data={[statusCounts.success,statusCounts.warning,statusCounts.error]}/></Box>
              <Typography variant="body2" align="center" sx={{mt:1.5}}>
                <b>{statusCounts.success}</b> on track, <b>{statusCounts.warning}</b> at risk, <b>{statusCounts.error}</b> off track.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{height:"100%",boxShadow:3,display:"flex",flexDirection:"column"}}>
            <CardContent sx={{p:2,flexGrow:1}}>
              <Typography variant="h6" fontWeight={900} align="center" color="primary">Process steps on-track vs off-track</Typography>
              <Box sx={{height:120,display:"flex",justifyContent:"center"}}><DonutPlot labels={["On-track","Off-track"]} data={[stepCounts.on,stepCounts.off]} palette={[tokens.ok,tokens.bad]}/></Box>
              <Typography variant="body2" align="center" sx={{mt:1.5}}><b>{stepCounts.on}</b> steps on-track, <b>{stepCounts.off}</b> off-track.</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Paper>
  );
};

/* ---------------- KPI details ---------------- */
const KpiDetails = ({ proc, kpiId, quarter, disDim, disCat }) => {
  if (!kpiId) return null;
  const k = quarterlyData[proc]?.[kpiId]; if(!k) return <Typography color="text.secondary">KPI data not available</Typography>;
  let series = k.data;
  if (disDim && disCat && k.disaggregations?.[disDim]?.[disCat]?.data) series = k.disaggregations[disDim][disCat].data;
  const long = KPI_NAME[kpiId]?.long || k.title || kpiId;
  const lineData = {
    labels: series.map(d=>d.quarter),
    datasets: [
      { label: disCat || "Performance", data: series.map(d=>d.value), borderColor:tokens.primary, backgroundColor:a(tokens.primary,.2), fill:true, tension:.35, borderWidth:2 },
      { label: "Target", data: series.map(()=>k.target), borderColor:tokens.bad, borderDash:[6,4], pointStyle:false },
      { label: "Baseline", data: series.map(()=>k.baseline), borderColor:tokens.accent, borderDash:[3,3], pointStyle:false }
    ]
  };
  return (
    <Card sx={{mt:2,boxShadow:3}}>
      <CardContent>
        <Strip title={long}/>
        <LineChartPlot data={lineData} title={`${long} — trend`} id={`kpi-${proc}-${kpiId}`} height={340} maxPct={String(kpiId).startsWith("pct_")}/>
      </CardContent>
    </Card>
  );
};

/* ---------------- Steps: bar + modal + tables ---------------- */
const StepsBar = ({ rows, quarter, useMedian }) => {
  if (!rows?.length) return <Typography color="text.secondary">No process step data available for {quarter}</Typography>;
  const labels = rows.map(r=>r.step);
  const barData = {
    labels,
    datasets:[
      { label:"Target days", data:rows.map(r=>r.targetDays), backgroundColor:a(tokens.accent,.4), borderColor:tokens.accent },
      { label: useMedian?"Median days":"Average days", data:rows.map(r=>r.metricDays), backgroundColor:rows.map(r=>r.metricDays<=r.targetDays?tokens.ok:tokens.bad), borderColor:"transparent" }
    ]
  };
  return (
    <Card sx={{mt:2}}><CardContent sx={{p:2}}>
      <Typography variant="h6" fontWeight={900} color="primary" gutterBottom>Process steps: actual vs target — {quarter}</Typography>
      <div style={{height:300}}>
        <BarChartPlot data={barData} title="Process steps — actual vs target" id="steps-actual-target" height={300} />
      </div>
    </CardContent></Card>
  );
};

const StepTrendModal = ({ spec, onClose }) => {
  if (!spec) return null; const { proc, step } = spec;
  const s = processStepData[proc]?.[step]?.data || []; if (!s.length) return null;
  const lineData = { 
    labels: s.map(d=>d.quarter),
    datasets:[
      { label:"Actual days", data:s.map(d=>d.avgDays), borderColor:tokens.primary, backgroundColor:a(tokens.primary,.2), fill:true },
      { label:"Target days", data:s.map(d=>d.targetDays), borderColor:tokens.accent, borderDash:[6,4], pointStyle:false }
    ]
  };
  return (
    <Paper elevation={6} sx={{position:"fixed",zIndex:1300,left:"50%",top:"10%",transform:"translateX(-50%)",width:"min(960px,92vw)",maxHeight:"80vh",overflow:"auto",p:2,borderRadius:2}} aria-label={`Modal for ${step} details`}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="h6" fontWeight={900}>{step} — Actual vs Target</Typography>
        <Chip label="Close" onClick={onClose} color="primary"/>
      </Stack>
      <div style={{height:360}}>
        <LineChartPlot data={lineData} title={`${step} — Actual vs Target`} id="step-trend" height={360} />
      </div>
    </Paper>
  );
};

const ProcessTable = ({ proc, quarter, rows, setStep, useMedian }) => {
  if (!rows?.length) return <Typography color="text.secondary">No process step data available</Typography>;
  const cols = [
    { key:"metricDays", label:useMedian?"Median days":"Average days" },
    { key:"targetDays", label:"Target days" },
    { key:"variance", label:"Variance" },
    { key:"trend", label:"Trend" }
  ];
  const augmented = rows.map(r=>{
    const s=processStepData[proc][r.step].data; const idx=s.findIndex(d=>d.quarter===quarter);
    const prev = idx>0 ? s[idx-1] : null;
    const prevVal = useMedian ? stepMedianFor(proc,r.step, prev?.quarter) : (prev?.avgDays??null);
    const curVal = r.metricDays ?? null;
    const trend = (prevVal!=null && curVal!=null) ? (curVal<prevVal?"improving": curVal>prevVal?"declining":"flat") : "flat";
    return {...r, trend};
  });

  return (
    <Card sx={{mt:2,boxShadow:3}}><CardContent>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
        <Strip title="Process step analysis" icon={<BarChart fontSize="small" color="primary"/>}/>
        <IconButton onClick={()=>csv(augmented.map(r=>({...r,quarter,step:r.step})), [{key:"step",label:"Step"},...cols], `process_steps_${proc}_${quarter}.csv`)} aria-label="Export CSV" title="Download CSV"><GetApp/></IconButton>
      </Stack>
      <Box sx={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}} aria-label="Process step analysis table">
          <thead><tr style={{background:a(tokens.primary,.08),textAlign:"left"}}>
            {["Process name", cols[0].label, "Target days", "Variance", "Trend"].map(h=>
              <th key={h} style={{padding:"10px 12px",fontWeight:800,color:NDA_GREEN}}>{h}</th>)}
          </tr></thead>
          <tbody>
            {augmented.map(r=>{
              const on=r.metricDays<=r.targetDays;
              return (
                <tr key={r.step} style={{borderBottom:"1px solid rgba(0,0,0,.06)",cursor:"pointer"}} onClick={()=>setStep?.(r.step)} tabIndex={0} onKeyDown={e=>e.key==="Enter"&&setStep?.(r.step)}>
                  <td style={{padding:"10px 12px"}}>{r.step}</td>
                  <td style={{padding:"10px 12px",color:on?tokens.ok:tokens.bad,fontWeight:700}}>{asNum(r.metricDays)}</td>
                  <td style={{padding:"10px 12px"}}>{asNum(r.targetDays)}</td>
                  <td style={{padding:"10px 12px",color:on?tokens.ok:tokens.bad,fontWeight:700}}>{r.variance>0?"+":""}{asNum(r.variance)}</td>
                  <td style={{padding:"10px 12px"}}>
                    <IconButton size="small" onClick={e=>{e.stopPropagation(); setStep?.(r.step);}} aria-label="Show trend" title="Show trend"><ShowChart fontSize="small"/></IconButton>
                    {r.trend==="improving"&&<ArrowDownward color="success" fontSize="small"/>}
                    {r.trend==="declining"&&<ArrowUpward color="error" fontSize="small"/>}
                    {r.trend==="flat"&&<TrendingFlat color="warning" fontSize="small"/>}
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

/* ---------------- Overview volumes (also used in Reports) ---------------- */
const OverviewVolumes = ({ proc, mode }) => {
  const qv=quarterlyVolumes[proc]||[], iv=inspectionVolumes[proc]||[], labels=(qv.length?qv:iv).map(d=>d.quarter);
  const D=(label,data,clr)=>({ label, data, backgroundColor:a(clr,.65), borderColor:clr });
  let datasets=[];
  if(proc==="MA"){
    datasets = mode.MA==="apps"
      ? [ D("Applications received", qv.map(d=>d.applications_received), tokens.accent), D("Applications completed", qv.map(d=>d.applications_completed), tokens.primary) ]
      : [ D("Approvals granted", qv.map(d=>d.approvals_granted), tokens.ok) ];
  } else if(proc==="CT"){
    datasets = mode.CT==="apps"
      ? [ D("Applications received", qv.map(d=>d.applications_received), tokens.accent), D("Applications completed", qv.map(d=>d.applications_completed), tokens.primary) ]
      : [ D("GCP inspections requested", qv.map(d=>d.gcp_inspections_requested), tokens.info), D("GCP inspections conducted", qv.map(d=>d.gcp_inspections_conducted), tokens.ok) ];
  } else {
    datasets = [
      D("Inspections requested — Domestic", iv.map(d=>d.requested_domestic), tokens.accent),
      D("Inspections requested — Foreign",  iv.map(d=>d.requested_foreign), tokens.warn),
      D("Inspections requested — Reliance/Joint", iv.map(d=>(d.requested_reliance??0)+(d.requested_desk??0)), tokens.bad),
      D("Inspections conducted — Domestic", iv.map(d=>d.conducted_domestic), tokens.primary),
      D("Inspections conducted — Foreign",  iv.map(d=>d.conducted_foreign), tokens.info),
      D("Inspections conducted — Reliance/Joint", iv.map(d=>(d.conducted_reliance??0)+(d.conducted_desk??0)), "#7a4cff")
    ];
  }
  if (!labels.length || datasets.every(ds=>ds.data.every(d=>d==null))) return <Skeleton h={220}/>;
  const volumeData = {labels, datasets};
  return <div style={{height:340}}>
    <BarChartPlot data={volumeData} title={`${proc} volumes`} id={`overview-${proc}`} height={340} />
  </div>;
};

/* ---------------- Bottleneck (Reports) helpers ---------------- */
const metricDefs = (proc)=>{
  const base=[
    { key:"cycle_time_median", label:"Cycle time (median)", tip:"Touch + Wait median days", from:"combo" },
    { key:"ext_median_days", label:"External responsiveness (median)", tip:"Median days waiting on external", from:"bn" },
    { key:"opening_backlog", label:"Opening backlog", tip:"Items carried into the quarter", from:"bn" },
    { key:"carry_over_rate", label:"Carry-over rate", tip:"Share that rolled into next quarter", from:"bn", fmt:v=>v==null?"—":pct(v*100/100) },
    { key:"avg_query_cycles", label:"Avg query cycles", tip:"Average number of query rounds", from:"bn" },
    { key:"fpy_pct", label:"FPY %", tip:"First-pass yield", from:"bn", fmt:v=>v==null?"—":pct(v) },
    { key:"wait_share_pct", label:"Wait share %", tip:"Share of cycle time spent waiting", from:"bn", fmt:v=>v==null?"—":pct(v) },
  ];
  const extra=[]; if(proc==="MA") extra.push({key:"work_to_staff_ratio",label:"Work-to-staff ratio",tip:"Demand vs staff hours",from:"bn",fmt:v=>v==null?"—":Number(v).toFixed(2)});
  if(proc!=="MA") extra.push({key:"sched_median_days",label:"Scheduling lead time (median)",tip:"Days from request to scheduled",from:"bn"});
  return [...base,...extra];
};
const SingleStepTrend = ({ spec, onClose }) => {
  if(!spec) return null; const { process, step, metricKey, title } = spec;
  const bn=(bottleneckData[process]||{})[step]||[]; const ps=processStepData[process]?.[step]?.data||[];
  const labels=(bn.length?bn:ps).map(d=>d.quarter);
  const data=(bn.length?bn:ps).map(d=>{
    if(metricKey==="cycle_time_median"){ const t=d.touch_median_days??0,w=d.wait_median_days??0; return (t||w)?t+w:null; }
    return d[metricKey] ?? null;
  });
  const lineData = { labels, datasets:[{ label:`${step} — ${title}`, data, borderColor:tokens.primary, backgroundColor:a(tokens.primary,.2), fill:true }] };
  return (
    <Paper elevation={6} sx={{position:"fixed",zIndex:1300,left:"50%",top:"10%",transform:"translateX(-50%)",width:"min(980px,94vw)",maxHeight:"80vh",overflow:"auto",p:2,borderRadius:2}}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}><Typography variant="h6" fontWeight={900}>{title} — {step}</Typography><IconButton onClick={onClose}><Close/></IconButton></Stack>
      <div style={{height:360}}>
        <LineChartPlot data={lineData} title={`${title} — ${step}`} id="single-step" height={360} />
      </div>
    </Paper>
  );
};
const MultiStepTrend = ({ spec, onClose }) => {
  if(!spec) return null; const { process, metricKey, title } = spec;
  const stepsObj=processStepData[process]||{}; const stepKeys=Object.keys(stepsObj); if(!stepKeys.length) return null;
  const labels=(stepsObj[stepKeys[0]].data||[]).map(d=>d.quarter);
  const palette=[tokens.primary,tokens.info,tokens.ok,"#7a4cff","#00897B","#AF4448","#6D4C41","#455A64","#9E9D24"];
  const datasets = stepKeys.map((step,idx)=>{
    const bn=(bottleneckData[process]||{})[step]||[]; const ps=stepsObj[step]?.data||[]; const ser=bn.length?bn:ps;
    const data=labels.map(q=>{
      const d=ser.find(x=>x.quarter===q)||{};
      if(metricKey==="cycle_time_median"){ const t=d.touch_median_days??0,w=d.wait_median_days??0; return (t||w)?t+w:null; }
      return d[metricKey] ?? null;
    });
    return { label:step, data, borderColor:palette[idx%palette.length], backgroundColor:"transparent" };
  });
  const lineData = {labels, datasets};
  return (
    <Paper elevation={6} sx={{position:"fixed",zIndex:1300,left:"50%",top:"8%",transform:"translateX(-50%)",width:"min(1100px,96vw)",maxHeight:"84vh",overflow:"auto",p:2,borderRadius:2}}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}><Typography variant="h6" fontWeight={900}>{title} — trend by process step</Typography><IconButton onClick={onClose}><Close/></IconButton></Stack>
      <div style={{height:420}}>
        <LineChartPlot data={lineData} title={`${title} — trend by step`} id="multi-step" height={420} />
      </div>
    </Paper>
  );
};

/* ---------------- Reports shell ---------------- */
const Reports = ({ proc, quarter, view, volumesMode, setVolumesMode, setSingle, setMulti }) => {
  const [compareOn,setCompareOn]=useState(false); const [compareQuarter,setCompareQuarter]=useState(quarter);
  const VSpec = useMemo(()=>{
    const mk = (title, cols, rows, chart)=>({
      title, cols, rows, Controls:()=>(
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{mb:1}}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip label={compareOn?"Compare: ON":"Compare: OFF"} color={compareOn?"primary":"default"} onClick={()=>setCompareOn(s=>!s)}/>
            {compareOn && (
              <FormControl size="small" sx={{minWidth:140}}>
                <InputLabel>Compare to</InputLabel>
                <Select label="Compare to" value={compareQuarter} onChange={e=>setCompareQuarter(e.target.value)}>
                  {rows.map(r=><MenuItem key={r.quarter} value={r.quarter}>{r.quarter}</MenuItem>)}
                </Select>
              </FormControl>
            )}
          </Stack>
          {proc!=="GMP" && (
            <ToggleButtonGroup size="small" exclusive value={volumesMode[proc]} onChange={(_,v)=>v&&setVolumesMode(s=>({...s,[proc]:v}))}>
              {proc==="MA" ? (<><ToggleButton value="apps">Apps: received vs completed</ToggleButton><ToggleButton value="approvals">Approvals granted</ToggleButton></>)
                           : (<><ToggleButton value="apps">Apps: received vs completed</ToggleButton><ToggleButton value="gcp">GCP: requested vs conducted</ToggleButton></>)}
            </ToggleButtonGroup>
          )}
        </Stack>
      ),
      Chart:()=> chart
    });

    if (proc==="MA"){
      return mk("MA — Applications vs Completed / Approvals",
        [{key:"applications_received",label:"Applications received"},{key:"applications_completed",label:"Applications completed"},{key:"approvals_granted",label:"Approvals granted"}],
        quarterlyVolumes.MA||[],
        <OverviewVolumes proc="MA" mode={volumesMode}/>
      );
    }
    if (proc==="CT"){
      return mk("CT — Applications vs Completed / GCP Inspections",
        [{key:"applications_received",label:"Applications received"},{key:"applications_completed",label:"Applications completed"},{key:"gcp_inspections_requested",label:"GCP inspections requested"},{key:"gcp_inspections_conducted",label:"GCP inspections conducted"}],
        quarterlyVolumes.CT||[],
        <OverviewVolumes proc="CT" mode={volumesMode}/>
      );
    }
    return mk("GMP — Inspections requested vs conducted",
      [{key:"inspections_requested_total",label:"Total inspections requested"},{key:"inspections_conducted_total",label:"Total inspections conducted"},{key:"inspections_domestic",label:"Domestic (conducted)"},{key:"inspections_foreign",label:"Foreign (conducted)"},{key:"inspections_reliance_joint",label:"Reliance/Joint (conducted)"}],
      quarterlyVolumes.GMP||[],
      <OverviewVolumes proc="GMP" mode={volumesMode}/>
    );
    // eslint-disable-next-line
  },[proc, volumesMode, compareOn, compareQuarter]);

  const rows = VSpec.rows;
  return (
    <Card sx={{mt:1,boxShadow:3}}><CardContent>
      {view==="Quarterly Volumes" ? (
        <>
          <Strip title={`Quarterly volumes — ${proc}`} icon={<BarChart fontSize="small" color="primary"/>}/>
          <Card sx={{mb:2}}><CardContent>
            <Typography variant="h6" fontWeight={900} color="primary" gutterBottom>{VSpec.title}</Typography>
            <VSpec.Controls/>
            <VSpec.Chart/>
          </CardContent></Card>

          <Stack direction="row" justifyContent="space-between" alignItems="center" mt={2} mb={1}>
            <Typography variant="subtitle1" fontWeight={800} color="primary">Quarterly volume table — {proc}</Typography>
            <IconButton onClick={()=>csv(rows,[{key:"quarter",label:"Quarter"},...VSpec.cols], `quarterly_volumes_${proc}.csv`)} aria-label="Export CSV" title="Download CSV"><GetApp/></IconButton>
          </Stack>

          <Box sx={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}} aria-label="Quarterly volumes table">
              <thead><tr style={{background:a(tokens.primary,.08),textAlign:"left"}}>
                <th style={{padding:"10px 12px",fontWeight:800,color:NDA_GREEN}}>Quarter</th>
                {VSpec.cols.map(c=><th key={c.key} style={{padding:"10px 12px",fontWeight:800,color:NDA_GREEN}}>{c.label}</th>)}
              </tr></thead>
              <tbody>
                {rows.map(row=>(
                  <tr key={row.quarter} style={{borderBottom:"1px solid rgba(0,0,0,.06)"}}>
                    <td style={{padding:"10px 12px",fontWeight:700}}>{row.quarter}</td>
                    {VSpec.cols.map(c=>{
                      const val=row[c.key]; const base = rows.find(r=>r.quarter===compareQuarter);
                      const baseVal = (base && typeof base[c.key]==="number") ? base[c.key] : null;
                      return (
                        <td key={c.key} style={{padding:"10px 12px"}}>
                          {typeof val==="number" ? (
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <span>{val.toLocaleString()}</span>
                              {compareOn && baseVal!=null && (
                                <Chip size="small" variant="outlined" color={val-baseVal>=0?"success":"error"}
                                      label={`${val-baseVal>0?"+":""}${(val-baseVal).toLocaleString()}`} sx={{height:22}}/>
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
      ) : (
        <>
          <Strip title={`Bottleneck metrics — ${proc} (${quarter})`} icon={<Assessment fontSize="small" color="primary"/>}/>
          <Stack direction="row" spacing={1} alignItems="center" sx={{mb:1}}>
            {/* Compare toggle for bottlenecks */}
            {/* Reusing simple local state for compare */}
          </Stack>
          {/* Curated metrics table */}
          <Card sx={{mt:2,boxShadow:3}}><CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="subtitle1" fontWeight={800} color="primary">Process Bottleneck Analysis</Typography>
              <Tooltip title="Click any column header to see multi-step trend; click any cell to see that step's trend."><InfoOutlined fontSize="small"/></Tooltip>
              <IconButton onClick={()=>{
                const cols=metricDefs(proc);
                const current = Object.entries(processStepData[proc]||{}).map(([step,ser])=>{
                  const q=ser.data.find(d=>d.quarter===quarter)||{};
                  const bn=(bottleneckData[proc]||{})[step]?.find(d=>d.quarter===quarter)||{};
                  const touch=bn.touch_median_days??null, wait=bn.wait_median_days??null;
                  const row={step, quarter};
                  cols.forEach(c=>{
                    row[c.key] = c.key==="cycle_time_median" ? ( (touch==null&&wait==null) ? "—" : Number(touch||0)+Number(wait||0) )
                                                             : (bn[c.key] ?? "—");
                  });
                  return row;
                });
                csv(current, [{key:"quarter",label:"Quarter"},{key:"step",label:"Step"},...metricDefs(proc)], `per_step_curated_${proc}_${quarter}.csv`);
              }} aria-label="Export CSV" title="Download CSV"><GetApp/></IconButton>
            </Stack>
            <Box sx={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}} aria-label="Bottleneck curated metrics table">
                <thead>
                  <tr style={{background:a(tokens.primary,.08),textAlign:"left"}}>
                    <th style={{padding:"10px 12px",fontWeight:800,color:NDA_GREEN}}>Step</th>
                    {metricDefs(proc).map(c=>(
                      <th key={c.key} style={{padding:"10px 12px",fontWeight:800,color:NDA_GREEN}}>
                        <Tooltip title={`${c.label}: ${c.tip||""}  (Click to view trend by step)`}>
                          <span style={{cursor:"pointer",textDecoration:"underline"}}
                                onClick={()=>setMulti({process:proc,metricKey:c.key,title:c.label})}>
                            {c.label} <OpenInFull style={{fontSize:14,verticalAlign:"middle",marginLeft:4}}/>
                          </span>
                        </Tooltip>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(processStepData[proc]||{}).map(([step,ser])=>{
                    const q=ser.data.find(d=>d.quarter===quarter)||{};
                    const bn=(bottleneckData[proc]||{})[step]?.find(d=>d.quarter===quarter)||{};
                    const touch=bn.touch_median_days??null, wait=bn.wait_median_days??null;
                    return (
                      <tr key={step} style={{borderBottom:"1px solid rgba(0,0,0,.06)"}}>
                        <td style={{padding:"10px 12px"}}>{step}</td>
                        {metricDefs(proc).map(c=>{
                          let val = c.key==="cycle_time_median" ? ( (touch==null&&wait==null) ? "—" : Number(touch||0)+Number(wait||0) ) : (bn[c.key] ?? "—");
                          const display = (c.fmt && val!=="—" && val!=null) ? c.fmt(val) : val;
                          return (
                            <td key={c.key} style={{padding:"10px 12px",whiteSpace:"nowrap",cursor:"pointer"}}
                                onClick={()=>setSingle({process:proc,step,metricKey:c.key,title:c.label})}>
                              {display}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Box>
          </CardContent></Card>
        </>
      )}
    </CardContent></Card>
  );
};

/* ---------------- Command Palette (minimal) ---------------- */
const CommandPalette = ({ open, onClose, allQuarters, onPickKpi, onPickStep, onPickQuarter }) => {
  const [q,setQ]=useState("");
  const kpiItems=useMemo(()=>{ const arr=[]; ["MA","CT","GMP"].forEach(p=>Object.keys(quarterlyData[p]||{}).forEach(id=>arr.push({type:"kpi",proc:p,id}))); return arr;},[]);
  const stepItems=useMemo(()=>{ const arr=[]; ["MA","CT","GMP"].forEach(p=>Object.keys(processStepData[p]||{}).forEach(s=>arr.push({type:"step",proc:p,step:s}))); return arr;},[]);
  const qItems=allQuarters.map(x=>({type:"quarter",q:x}));
  const fuse=(txt)=>s=>!txt||s.toLowerCase().includes(txt.toLowerCase())||txt.split(/\s+/).every(w=>s.toLowerCase().includes(w));
  const results=useMemo(()=>{ const f=fuse(q); return [...kpiItems.filter(x=>f(x.id)),...stepItems.filter(x=>f(x.step)),...qItems.filter(x=>f(x.q))].slice(0,30); },[kpiItems,stepItems,qItems,q]);
  if(!open) return null;
  return (
    <Paper role="dialog" aria-modal="true" elevation={10} sx={{position:"fixed",left:"50%",top:"10%",transform:"translateX(-50%)",width:"min(760px,96vw)",p:2,zIndex:t=>t.zIndex.modal+20}}>
      <Stack spacing={1}>
        <Typography variant="subtitle2" color="text.secondary">Type to find KPIs, steps, or quarters (Enter to select, Esc to close)</Typography>
        <input autoFocus aria-label="Command palette" placeholder="Search… (e.g., 'GCP inspections', 'Q1 2025')"
          value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==="Escape"&&onClose()}
          style={{padding:"10px 12px",borderRadius:10,border:"1px solid rgba(0,0,0,.2)",outline:"none",fontSize:14}}/>
        <Divider/>
        <Box sx={{maxHeight:360,overflow:"auto"}}>
          {results.length===0 && <Typography variant="body2" color="text.secondary" sx={{p:1}}>No matches.</Typography>}
          <Stack spacing={0.5}>
            {results.map((r,i)=>{
              const key=`${r.type}-${r.id||r.step||r.q}-${i}`;
              const choose=()=>{ if(r.type==="kpi") onPickKpi(r.proc,r.id); if(r.type==="step") onPickStep(r.proc,r.step); if(r.type==="quarter") onPickQuarter(r.q); onClose(); };
              return (
                <Paper key={key} role="button" tabIndex={0} onClick={choose} onKeyDown={e=>e.key==="Enter"&&choose()}
                  sx={{p:1,cursor:"pointer","&:hover":{background:t=>muiAlpha(t.palette.primary.main,.06)}}}>
                  <Typography variant="body2" sx={{fontWeight:700}}>
                    {r.type==="kpi" && `KPI · ${r.proc} · ${KPI_NAME[r.id]?.short || r.id}`}
                    {r.type==="step" && `Step · ${r.proc} · ${r.step}`}
                    {r.type==="quarter" && `Quarter · ${r.q}`}
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

/* ---------------- Main ---------------- */
const KpiModuleInner = ({ themeMode, setThemeMode }) => {
  const [tab,setTab]=useState("Overview");

  const [proc,setProc]=useState("MA");
  const [q,setQ]=useState("Q2 2025");
  const [kpi,setKpi]=useState(null);
  const [disDim,setDisDim]=useState(null);
  const [disCat,setDisCat]=useState(null);

  const [rProc,setRProc]=useState("MA");
  const [rQ,setRQ]=useState("Q2 2025");
  const [rView,setRView]=useState("Quarterly Volumes");
  const [volMode,setVolMode]=useState({MA:"apps",CT:"apps",GMP:"inspections"});

  const [stepModal, setStepModal] = useState(null);
  const [singleTrend, setSingleTrend] = useState(null);
  const [multiTrend, setMultiTrend] = useState(null);

  const detailsRef=useRef(null);
  const [palOpen,setPalOpen]=useState(false);

  useEffect(()=>{ const h=(e)=>{ const mod=e.ctrlKey||e.metaKey; if(mod&&e.key.toLowerCase()==="k"){ e.preventDefault(); setPalOpen(s=>!s);} }; window.addEventListener("keydown",h); return ()=>window.removeEventListener("keydown",h); },[]);
  useUrlState(
    { tab, process: tab==="Overview"?proc:rProc, quarter: tab==="Overview"?q:rQ, rview:rView, kpi:kpi||"" },
    {
      tab:setTab,
      process:(v)=>{ if(!v) return; tab==="Overview"?setProc(v):setRProc(v); },
      quarter:(v)=>{ if(!v) return; tab==="Overview"?setQ(v):setRQ(v); },
      rview:setRView,
      kpi:(v)=>{ if(v && quarterlyData[proc]?.[v]) setKpi(v); else setKpi(null); }
    }
  );

  useEffect(()=>{ setDisDim(null); setDisCat(null); },[proc]);

  const allQuarters = useMemo(getAllQuarters,[]);
  const kpis = useMemo(()=>kpiSummary(proc,q,disDim,disCat),[proc,q,disDim,disCat]);
  const useMedian = kpi ? medianKPIs.has(kpi) : false;
  const overallSteps = useMemo(()=>stepsFor(proc,q,null),[proc,q]);
  const overallStepCounts = useMemo(()=>countOnOff(overallSteps),[overallSteps]);
  const steps = useMemo(()=>stepsFor(proc,q,kpi),[proc,q,kpi]);
  const stepCounts = useMemo(()=>countOnOff(steps),[steps]);

  useEffect(() => {
    if (kpi && detailsRef.current) {
      detailsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [kpi]);

  return (
    <Box sx={{width:"100%"}}>
      <StickyTop
        viewTab={tab} setViewTab={(v)=>{setTab(v); if(v==="Reports") setRProc(proc);} }
        themeMode={themeMode} setThemeMode={setThemeMode}
        activeProcess={proc} setActiveProcess={(p)=>{setProc(p); setKpi(null);}}
        selectedQuarter={q} setSelectedQuarter={(v)=>setQ(v)}
        reportsProcess={rProc} setReportsProcess={setRProc}
        reportsQuarter={rQ} setReportsQuarter={setRQ}
        reportsView={rView} setReportsView={setRView}
        allQuarters={allQuarters}
      />

      <Box sx={{px:{xs:1,md:2},py:{xs:1,md:2}}}>
        {tab==="Overview" ? (
          <Stack spacing={2}>
            <Insights 
              statusCounts={kpis.reduce((acc,i)=>{acc[i.status]++;return acc;},{success:0,warning:0,error:0})}
              stepCounts={overallStepCounts} quarter={q}/>
            <Box>
              <Strip
                title={proc==="MA"?"Marketing Authorization KPIs": proc==="CT"?"Clinical Trials KPIs":"GMP Compliance KPIs"}
                icon={proc==="MA"?<Assignment fontSize="small" color="primary"/>:proc==="CT"?<Science fontSize="small" color="primary"/>:<Gavel fontSize="small" color="primary"/>}
              />
              <KPIRail items={kpis} selectedKpi={kpi} setSelectedKpi={setKpi} scrollRef={detailsRef} quarter={q}/>
            </Box>
            {kpi && (
              <Box ref={detailsRef} sx={{ scrollMarginTop: 100 }}>
                {quarterlyData[proc]?.[kpi] && (
                  <KpiBanner kpi={quarterlyData[proc][kpi]} kpiId={kpi} status={kpis.find(i=>i.kpiId===kpi)?.status} value={kpis.find(i=>i.kpiId===kpi)?.value} quarter={q}/>
                )}
                {quarterlyData[proc][kpi]?.disaggregations && (
                  <Disaggs kpi={quarterlyData[proc][kpi]} dim={disDim} setDim={setDisDim} cat={disCat} setCat={setDisCat}/>
                )}
                <KpiDetails proc={proc} kpiId={kpi} quarter={q} disDim={disDim} disCat={disCat}/>
                <StepsBar rows={steps} quarter={q} useMedian={useMedian}/>
                <ProcessTable proc={proc} quarter={q} rows={steps} setStep={(s)=>setStepModal({proc,step:s})} useMedian={useMedian}/>
              </Box>
            )}
          </Stack>
        ) : (
          <Reports proc={rProc} quarter={rQ} view={rView} volumesMode={volMode} setVolumesMode={setVolMode}
                   setSingle={setSingleTrend} setMulti={setMultiTrend}/>
        )}
      </Box>

      <StepTrendModal spec={stepModal} onClose={()=>setStepModal(null)}/>
      <SingleStepTrend spec={singleTrend} onClose={()=>setSingleTrend(null)}/>
      <MultiStepTrend spec={multiTrend} onClose={()=>setMultiTrend(null)}/>

      <CommandPalette
        open={palOpen} onClose={()=>setPalOpen(false)} allQuarters={allQuarters}
        onPickQuarter={(qq)=>tab==="Overview"?setQ(qq):setRQ(qq)}
        onPickKpi={(p,k)=>{setTab("Overview"); setProc(p); setKpi(k);}}
        onPickStep={(p,step)=>{setTab("Overview"); setProc(p); setStepModal({proc:p,step});}}
      />
    </Box>
  );
};

const KpiModule = () => {
  const [themeMode,setThemeMode]=useState("light");
  useEffect(()=>{ 
    const isDark=themeMode==="dark";
    // Plotly theme update if needed
  },[themeMode]);
  useEffect(()=>{ 
    // reduced motion for Plotly
  },[]);
  const theme=useMemo(()=>createTheme({
    palette:{ mode:themeMode, primary:{main:NDA_GREEN,dark:NDA_GREEN_DARK}, warning:{main:TRUE_AMBER} },
    shape:{borderRadius:12},
    typography:{fontFamily:'Inter, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Noto Sans"'},
    components:{
      MuiPaper:{ defaultProps:{elevation:0}, styleOverrides:{root:{transition:"box-shadow .18s ease, transform .18s ease"}} },
      MuiCard:{ styleOverrides:{ root:{ borderRadius:14, "&:hover":{ boxShadow:(t)=>`0 10px 28px ${muiAlpha(t.palette.primary.main,.14)}` } } } },
      MuiLinearProgress:{ styleOverrides:{ root:{ backgroundColor:"rgba(0,0,0,.06)" } } },
    }
  }),[themeMode]);

  return (<ThemeProvider theme={theme}><CssBaseline/><KpiModuleInner themeMode={themeMode} setThemeMode={setThemeMode}/></ThemeProvider>);
};
export default KpiModule;