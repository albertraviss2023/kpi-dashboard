// src/modules/KpiModule.jsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Grid, Paper, Stack, Typography, Avatar, Chip, Tooltip,
  Tabs, Tab, Select, MenuItem, FormControl, InputLabel,
  Card, CardContent, Modal, IconButton, useMediaQuery,
  LinearProgress, Skeleton, Fade, Slide,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  ThemeProvider, createTheme
} from '@mui/material';
import {
  ArrowUpward, ArrowDownward, TrendingFlat, Timeline, BarChart, Assignment, Science, Gavel,
  CheckCircle, Warning, Error, FilterAlt, FilterAltOff, Close, InfoOutlined,
  Brightness4, Brightness7
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import {
  Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip as ChartTooltip,
  Legend, ArcElement, LineElement, PointElement, Filler
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { quarterlyData, processStepData } from '../data/kpiData_bak';
import ndaLogo from '../assets/nda-logo.png';

ChartJS.register(BarElement, CategoryScale, LinearScale, ChartTooltip, Legend, ArcElement, LineElement, PointElement, Filler);

/* ----------------------- CONFIG & MAPPINGS ----------------------- */
const ndaColors = {
  primary: '#2E7D32', secondary: '#FFB300', accent: '#2c58ddff',
  success: '#66BB6A', warning: '#FFB300', error: '#DC143C', info: '#1976D2'
};

const kpiNameMap = {
  // ----- MA -----
  pct_new_apps_evaluated_on_time: '1. Percentage of new applications for marketing authorization of medicines evaluated within a specified timeline',
  pct_renewal_apps_evaluated_on_time: '2. Percentage of renewals applications for marketing authorization of medicines evaluated within a specified time',
  pct_variation_apps_evaluated_on_time: '3. Percentage of applications for variation of registered medicinal products evaluated within a specified time',
  pct_fir_responses_on_time: '4. Percentage of further information requests responses received within a specified timeline',
  pct_query_responses_evaluated_on_time: '5. Percentage of query responses/additional data evaluated within a specified time',
  pct_granted_within_90_days: '6. Percentage of medical products and technologies granted MA within 90 working days',
  median_duration_continental: '7. Median timelines taken by NDA to process continentally reviewed application from the time it is received to decision (days)',
  // ----- CT -----
  pct_new_apps_evaluated_on_time_ct: '1. Percentage of new clinical trial applications evaluated within timeline',
  pct_amendment_apps_evaluated_on_time: '2. Percentage of clinical trial amendments evaluated within timeline',
  pct_gcp_inspections_on_time: '3. Percentage of approved & ongoing clinical trials inspected as per the GCP plan',
  pct_safety_reports_assessed_on_time: '4. Percentage of safety reports assessed within timeline',
  pct_gcp_compliant: '5. Percentage of clinical trials compliant with GCP requirements',
  pct_registry_submissions_on_time: '6. Percentage of clinical trials registered in national registry',
  pct_capa_evaluated_on_time: '7. Percentage of CAPA evaluations completed within timeline',
  avg_turnaround_time: '8. Average turnaround time for clinical trial applications (days)',
  // ----- GMP -----
  pct_facilities_inspected_on_time: '1. Percentage of manufacturing facilities inspected for GMP as per plan',
  pct_inspections_waived_on_time: '2. Percentage of GMP on-site inspections waived for pharmaceutical manufacturing facilities within set timelines',
  pct_facilities_compliant: '3. Percentage of pharmaceutical manufacturing facilities compliant with GMP requirements',
  pct_capa_decisions_on_time: '4. Percentage of final CAPA decisions issued within a specified timeline',
  pct_applications_completed_on_time: '5. Percentage of GMP inspection applications for pharmaceutical manufacturing facilities completed within the set timeline',
  avg_turnaround_time_gmp: '6. Average turnaround time (in days) to complete GMP applications for pharmaceutical manufacturing facilities',
  median_turnaround_time: '7. Median turnaround time (in days) to complete GMP inspection applications for pharmaceutical manufacturing facilities',
  pct_reports_published_on_time: "8. Percentage of GMP inspection reports published on the regulator's website within a specified timeline"
};

const shortKpiNameMap = {
  pct_new_apps_evaluated_on_time: '1. New Apps On Time',
  pct_renewal_apps_evaluated_on_time: '2. Renewal Apps On Time',
  pct_variation_apps_evaluated_on_time: '3. Variation Apps On Time',
  pct_fir_responses_on_time: '4. FIR Responses On Time',
  pct_query_responses_evaluated_on_time: '5. Query Responses On Time',
  pct_granted_within_90_days: '6. MA Granted in 90 Days',
  median_duration_continental: '7. Median Continental Review',
  pct_new_apps_evaluated_on_time_ct: '1. New CT Apps On Time',
  pct_amendment_apps_evaluated_on_time: '2. CT Amendments On Time',
  pct_gcp_inspections_on_time: '3. GCP Inspections On Time',
  pct_safety_reports_assessed_on_time: '4. Safety Reports On Time',
  pct_gcp_compliant: '5. GCP Compliance',
  pct_registry_submissions_on_time: '6. Registry Submissions',
  pct_capa_evaluated_on_time: '7. CAPA Evaluations On Time',
  avg_turnaround_time: '8. Avg CT Turnaround',
  pct_facilities_inspected_on_time: '1. GMP Inspections On Time',
  pct_inspections_waived_on_time: '2. GMP Inspections Waived',
  pct_facilities_compliant: '3. GMP Facilities Compliant',
  pct_capa_decisions_on_time: '4. CAPA Decisions On Time',
  pct_applications_completed_on_time: '5. GMP Apps Completed',
  avg_turnaround_time_gmp: '6. Avg GMP Turnaround',
  median_turnaround_time: '7. Median GMP Turnaround',
  pct_reports_published_on_time: '8. GMP Reports Published'
};

const timeBasedKpis = ['median_duration_continental', 'avg_turnaround_time', 'avg_turnaround_time_gmp', 'median_turnaround_time'];

const processIcons = { MA: <Assignment fontSize="large" />, CT: <Science fontSize="large" />, GMP: <Gavel fontSize="large" /> };

const disaggregationOptions = {
  pct_facilities_inspected_on_time: { inspectionType: ['On-site domestic', 'On-site foreign', 'Reliance/Joint on-site foreign'] },
  pct_facilities_compliant: { inspectionType: ['On-site domestic', 'On-site foreign', 'Reliance/Joint on-site foreign'] },
  pct_capa_decisions_on_time: { inspectionSource: ['Direct: Foreign + Domestic Done by NRA', 'Reliance: Rec joint Inspections'] },
  pct_applications_completed_on_time: { applicantType: ['Domestic Applicant', 'Foreign Applicant - Direct', 'Foreign Applicant - Reliance'] },
  avg_turnaround_time_gmp: { inspectionType: ['On-site domestic', 'On-site foreign', 'Reliance/Joint on-site foreign'] },
  median_turnaround_time: { inspectionType: ['On-site domestic', 'On-site foreign'] },
  pct_reports_published_on_time: { inspectionType: ['On-site domestic', 'On-site foreign', 'Reliance/Joint on-site foreign', 'Reliance/Joint desk-based foreign'] }
};

/* ----------------------- HELPERS ----------------------- */
const wrapLabel = (text, maxCharsPerLine = 30, maxLines = 3) => {
  if (!text || typeof text !== 'string') return text;
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    if ((line + w).length > maxCharsPerLine && line) {
      lines.push(line.trim());
      line = w + ' ';
      if (lines.length >= maxLines) break;
    } else line += w + ' ';
  }
  if (line.trim() && lines.length < maxLines) lines.push(line.trim());
  if (lines.length === maxLines && text.length > lines.join(' ').length) {
    const last = lines[maxLines - 1];
    if (last.length > 3) lines[maxLines - 1] = last.slice(0, -3) + '...';
  }
  return lines;
};

const getKpiDataPoint = (kpiData, quarter, disaggregation, dimension) => {
  if (disaggregation && dimension && kpiData.disaggregations?.[disaggregation]?.[dimension]) {
    return kpiData.disaggregations[disaggregation][dimension].find(d => d.quarter === quarter);
  }
  return kpiData.data.find(d => d.quarter === quarter);
};

const getStatus = (value, target, isTimeBased) => {
  if (value === null || value === undefined || target === undefined) return 'error';
  if (isTimeBased) return value <= target ? 'success' : value <= target * 1.1 ? 'warning' : 'error';
  return value >= target ? 'success' : value >= target * 0.9 ? 'warning' : 'error';
};

const getTrend = (kpiData, quarter, disaggregation, dimension) => {
  const arr = (disaggregation && dimension && kpiData.disaggregations?.[disaggregation]?.[dimension])
    ? kpiData.disaggregations[disaggregation][dimension]
    : kpiData.data;
  const idx = arr.findIndex(d => d.quarter === quarter);
  if (idx < 1) return 'flat';
  const cur = arr[idx].value, prev = arr[idx - 1].value;
  if (cur > prev) return 'up';
  if (cur < prev) return 'down';
  return 'flat';
};

const TrendIcon = ({ trend, isTimeBased }) => {
  const sx = { verticalAlign: 'middle', fontSize: '1.15rem' };
  if (isTimeBased) {
    if (trend === 'up') return <ArrowUpward color="error" sx={sx} />;
    if (trend === 'down') return <ArrowDownward color="success" sx={sx} />;
  } else {
    if (trend === 'up') return <ArrowUpward color="success" sx={sx} />;
    if (trend === 'down') return <ArrowDownward color="error" sx={sx} />;
  }
  return <TrendingFlat color="warning" sx={sx} />;
};

const makeBaseChartOptions = (darkMode) => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: {
      position: 'top',
      labels: {
        color: darkMode ? '#fff' : ndaColors.accent,
        font: { weight: 'bold' },
        padding: 16,
        boxWidth: 12,
        boxHeight: 12
      }
    },
    tooltip: {
      backgroundColor: darkMode ? 'rgba(50,50,50,0.95)' : 'rgba(255,255,255,0.95)',
      titleColor: darkMode ? '#fff' : ndaColors.primary,
      bodyColor: darkMode ? '#fff' : '#333',
      borderColor: darkMode ? '#444' : ndaColors.primary,
      borderWidth: 1,
      cornerRadius: 6,
      padding: 12
    }
  }
});

const makeAxis = (darkMode, { xTitle, yTitle, yMax }) => ({
  scales: {
    y: {
      beginAtZero: true,
      ...(yMax ? { max: yMax } : {}),
      title: { display: !!yTitle, text: yTitle || '', color: darkMode ? '#fff' : ndaColors.accent },
      grid: { color: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' },
      ticks: { color: darkMode ? '#fff' : ndaColors.accent, padding: 6, font: { size: 12 } }
    },
    x: {
      title: { display: !!xTitle, text: xTitle || '', color: darkMode ? '#fff' : ndaColors.accent },
      grid: { display: false },
      ticks: { color: darkMode ? '#fff' : ndaColors.accent, font: { size: 12 } }
    }
  }
});

/* ----------------------- SKELETON & EMPTY ----------------------- */
const EmptyState = ({ message }) => (
  <Card sx={{
    p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', textAlign: 'center', width: '100%', minHeight: 200, mt: 2,
    bgcolor: theme => alpha(theme.palette.primary.main, 0.04),
    border: theme => `1px dashed ${alpha(theme.palette.primary.main, 0.2)}`
  }}>
    <InfoOutlined color="primary" sx={{ fontSize: 48, mb: 2 }} />
    <Typography variant="h6" gutterBottom>No Data Available</Typography>
    <Typography color="text.secondary">{message}</Typography>
  </Card>
);

const KpiCardSkeleton = () => (
  <Grid item xs={12} sm={6} md={4} lg={4}>
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Skeleton variant="text" width="80%" height={36} />
        <Skeleton variant="text" width="40%" height={44} sx={{ mt: 1 }} />
        <Skeleton variant="text" width="60%" height={20} sx={{ mt: 1 }} />
        <Skeleton variant="rectangular" height={6} sx={{ mt: 1.5, borderRadius: 3 }} />
      </CardContent>
    </Card>
  </Grid>
);

/* ----------------------- KPI CARD ----------------------- */
const KpiCard = ({ kpiId, kpi, value, status, trend, isTimeBased, isSelected, isFiltered, index, onClick }) => {
  const isPercentage = kpiId.startsWith('pct_');
  const valueDisplay = value !== null && value !== undefined ? (isPercentage ? `${value}%` : value) : 'N/A';
  const targetDisplay = isPercentage ? `${kpi.target}%` : kpi.target;

  let progressValue = 0;
  if (value !== null && value !== undefined && value !== 0) {
    progressValue = isTimeBased ? Math.min(100, (kpi.target / value) * 100) : Math.min(100, (value / kpi.target) * 100);
  }

  return (
    <Grid item xs={12} sm={6} md={4} lg={4}>
      <Fade in style={{ transitionDelay: `${index * 40}ms` }}>
        <Card
          onClick={onClick}
          elevation={isSelected ? 4 : 2}
          sx={{
            height: '100%', cursor: 'pointer', borderRadius: 2,
            border: '1px solid',
            borderColor: isSelected ? 'primary.main' : 'divider',
            background: theme => isSelected ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.03)}, ${alpha(theme.palette.primary.main, 0.06)})` : theme.palette.background.paper,
            transition: 'all .25s',
            '&:hover': { transform: 'translateY(-2px)', boxShadow: theme => `0 10px 24px ${alpha(theme.palette.primary.main, 0.14)}` }
          }}
        >
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
              <Tooltip title={kpiNameMap[kpiId] || kpiId} placement="top-start">
                <Typography
                  variant="subtitle1"
                  fontWeight="bold"
                  sx={{
                    minHeight: '3.4em',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}
                >
                  {shortKpiNameMap[kpiId] || kpiId}
                </Typography>
              </Tooltip>
              {isFiltered && <Chip label="Filtered" color="primary" size="small" variant="outlined" icon={<FilterAlt fontSize="small" />} />}
            </Stack>

            <Stack direction="row" justifyContent="space-between" alignItems="center" mt={1}>
              <Typography variant="h4" fontWeight="bold" color={value !== null ? `${status}.main` : 'text.secondary'}>
                {valueDisplay}
              </Typography>
              <TrendIcon trend={trend} isTimeBased={isTimeBased} />
            </Stack>

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              Target: {targetDisplay}
            </Typography>

            {value !== null && (
              <LinearProgress
                variant="determinate"
                value={progressValue}
                color={status}
                sx={{ height: 6, borderRadius: 3, mt: 1.25 }}
              />
            )}
          </CardContent>
        </Card>
      </Fade>
    </Grid>
  );
};

/* ----------------------- PROCESS STEP MODAL ----------------------- */
const ProcessStepModal = ({ stepName, stepData, quarter, onClose, darkMode }) => {
  const current = stepData.data.find(d => d.quarter === quarter);
  const variance = current ? (current.avgDays - current.targetDays) : 0;
  const status = variance <= 0 ? 'success' : variance <= (current?.targetDays || 1) * 0.2 ? 'warning' : 'error';

  const labels = stepData.data.map(d => d.quarter);
  const chartData = {
    labels,
    datasets: [
      {
        label: 'Actual Days',
        data: stepData.data.map(d => d.avgDays),
        borderColor: ndaColors.primary,
        backgroundColor: alpha(ndaColors.primary, darkMode ? 0.35 : 0.2),
        tension: 0.4, fill: true, borderWidth: 3,
        pointBackgroundColor: labels.map(q => q === quarter ? ndaColors.secondary : ndaColors.primary),
        pointRadius: labels.map(q => q === quarter ? 6 : 3)
      },
      {
        label: 'Target Days',
        data: stepData.data.map(d => d.targetDays),
        borderColor: ndaColors.accent,
        borderDash: [5, 5], borderWidth: 2, pointStyle: false
      }
    ]
  };

  return (
    <Modal open onClose={onClose}>
      <Slide direction="up" in timeout={400}>
        <Box sx={{
          position: 'absolute', top: { xs: '6%', md: '10%' }, left: '50%', transform: 'translateX(-50%)',
          width: { xs: '92vw', md: 900 }, bgcolor: darkMode ? 'background.default' : 'background.paper',
          boxShadow: 24, p: 3, borderRadius: 2, maxHeight: '82vh', overflowY: 'auto'
        }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h5" fontWeight="bold" color="primary">{stepName}</Typography>
            <IconButton onClick={onClose}><Close /></IconButton>
          </Stack>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={4}>
              <Card sx={{ p: 2, height: '100%', bgcolor: alpha(ndaColors.primary, 0.1) }}>
                <Typography variant="subtitle2" color="text.secondary">Current Quarter ({quarter})</Typography>
                <Typography variant="h5" fontWeight="bold" color="primary">{current?.avgDays ?? '—'} days</Typography>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card sx={{ p: 2, height: '100%', bgcolor: alpha(ndaColors.success, 0.1) }}>
                <Typography variant="subtitle2" color="text.secondary">Target Days</Typography>
                <Typography variant="h5" fontWeight="bold" color="success.main">{current?.targetDays ?? '—'} days</Typography>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card sx={{ p: 2, height: '100%', bgcolor: alpha(status === 'success' ? ndaColors.success : status === 'warning' ? ndaColors.warning : ndaColors.error, 0.1) }}>
                <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {status === 'success' ? <CheckCircle color="success" sx={{ fontSize: 34, mr: 1 }} /> :
                    status === 'warning' ? <Warning color="warning" sx={{ fontSize: 34, mr: 1 }} /> :
                      <Error color="error" sx={{ fontSize: 34, mr: 1 }} />}
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {status === 'success' ? 'On Target' : status === 'warning' ? 'Near Target' : 'Below Target'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">({variance > 0 ? '+' : ''}{variance.toFixed(1)} days)</Typography>
                  </Box>
                </Box>
              </Card>
            </Grid>
          </Grid>

          <Box sx={{ height: 300, width: '100%' }}>
            <Line data={chartData} options={{ ...makeBaseChartOptions(darkMode), ...makeAxis(darkMode, { xTitle: 'Quarter', yTitle: 'Days' }), elements: { line: { tension: 0.4 }, point: { radius: 3, hoverRadius: 6 } } }} />
          </Box>

          <TableContainer component={Paper} sx={{ mt: 2, borderRadius: 2 }}>
            <Table>
              <TableHead sx={{ bgcolor: darkMode ? '#333' : alpha(ndaColors.primary, 0.9) }}>
                <TableRow>
                  {['Quarter', 'Actual Days', 'Target Days', 'Variance', 'Status'].map(h => (
                    <TableCell key={h} align={h === 'Quarter' ? 'left' : 'right'} sx={{ color: 'white', fontWeight: 'bold' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {stepData.data.map(row => {
                  const v = row.avgDays - row.targetDays;
                  const s = v <= 0 ? 'success' : v <= row.targetDays * 0.2 ? 'warning' : 'error';
                  return (
                    <TableRow key={row.quarter} sx={{ '&:hover': { bgcolor: darkMode ? '#2a2a2a' : '#f7f7f7' } }}>
                      <TableCell>{row.quarter}</TableCell>
                      <TableCell align="right">{row.avgDays}</TableCell>
                      <TableCell align="right">{row.targetDays}</TableCell>
                      <TableCell align="right" sx={{ color: s === 'success' ? ndaColors.success : s === 'warning' ? ndaColors.warning : ndaColors.error }}>
                        {v > 0 ? '+' : ''}{v.toFixed(1)}
                      </TableCell>
                      <TableCell align="right">
                        {s === 'success' ? <CheckCircle color="success" /> : s === 'warning' ? <Warning color="warning" /> : <Error color="error" />}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Slide>
    </Modal>
  );
};

/* ----------------------- MAIN COMPONENT ----------------------- */
export default function KpiModule() {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [darkMode, setDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('MA');
  const [selectedKpi, setSelectedKpi] = useState(null);
  const [selectedQuarter, setSelectedQuarter] = useState('');
  const [activeDisaggregation, setActiveDisaggregation] = useState(null);
  const [activeDimension, setActiveDimension] = useState(null);
  const [selectedStep, setSelectedStep] = useState(null);

  useEffect(() => setDarkMode(prefersDarkMode), [prefersDarkMode]);

  const allQuarters = useMemo(() => {
    const set = new Set();
    Object.values(quarterlyData).forEach(proc =>
      Object.values(proc).forEach(kpi =>
        kpi.data?.forEach(d => set.add(d.quarter))
      )
    );
    const arr = Array.from(set);
    const ord = q => {
      const [Q, Y] = q.split(' ');
      return parseInt(Y, 10) * 10 + parseInt(Q.replace('Q', ''), 10);
    };
    return arr.sort((a, b) => ord(a) - ord(b));
  }, []);

  useEffect(() => {
    if (!selectedQuarter && allQuarters.length) setSelectedQuarter(allQuarters[allQuarters.length - 1]); // default to latest
  }, [allQuarters, selectedQuarter]);

  useEffect(() => {
    setIsLoading(true);
    const t = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(t);
  }, [activeTab, selectedQuarter]);

  const theme = useMemo(() => createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: { main: ndaColors.primary },
      secondary: { main: ndaColors.secondary },
      success: { main: ndaColors.success },
      warning: { main: ndaColors.warning },
      error: { main: ndaColors.error },
      info: { main: ndaColors.info },
      background: { default: darkMode ? '#111315' : '#f4f6f8', paper: darkMode ? '#1a1c1f' : '#ffffff' }
    },
    typography: { fontFamily: '"Public Sans", sans-serif' },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            boxShadow: 'rgba(145,158,171,0.2) 0px 0px 2px, rgba(145,158,171,0.12) 0px 12px 24px -4px',
            transition: 'all .25s'
          }
        }
      },
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
      MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } } }
    }
  }), [darkMode]);

  const calculations = useMemo(() => {
    if (!selectedQuarter) return { kpiSummary: [], kpiStatusSummary: { success: 0, warning: 0, error: 0 }, trendSummary: { up: 0, down: 0, flat: 0 }, processSummary: { onTime: 0, near: 0, delayed: 0, total: 0 } };

    const kpiSummary = Object.keys(quarterlyData[activeTab]).map(kpiId => {
      const kpi = quarterlyData[activeTab][kpiId];
      const dp = getKpiDataPoint(kpi, selectedQuarter, activeDisaggregation, activeDimension);
      const value = dp ? dp.value : null;
      const isTime = timeBasedKpis.includes(kpiId);
      const status = getStatus(value, kpi.target, isTime);
      const trend = getTrend(kpi, selectedQuarter, activeDisaggregation, activeDimension);
      return { kpiId, kpi, value, status, trend, isTimeBased: isTime };
    });

    const kpiStatusSummary = kpiSummary.reduce((acc, cur) => { acc[cur.status] = (acc[cur.status] || 0) + 1; return acc; }, { success: 0, warning: 0, error: 0 });
    const trendSummary = kpiSummary.reduce((acc, cur) => { acc[cur.trend] = (acc[cur.trend] || 0) + 1; return acc; }, { up: 0, down: 0, flat: 0 });

    const steps = processStepData[activeTab];
    const processSummary = Object.values(steps).reduce((acc, step) => {
      const q = step.data.find(d => d.quarter === selectedQuarter);
      if (!q) return acc;
      const v = q.avgDays - q.targetDays;
      if (v <= 0) acc.onTime++; else if (v <= q.targetDays * 0.2) acc.near++; else acc.delayed++;
      return acc;
    }, { onTime: 0, near: 0, delayed: 0, total: Object.keys(steps).length });

    return { kpiSummary, kpiStatusSummary, trendSummary, processSummary };
  }, [activeTab, selectedQuarter, activeDisaggregation, activeDimension]);

  const handleTabChange = (_e, v) => {
    setActiveTab(v);
    setSelectedKpi(null);
    setActiveDisaggregation(null);
    setActiveDimension(null);
    setSelectedStep(null);
  };
  const handleKpiSelect = (kpiId) => {
    setSelectedKpi(prev => (prev === kpiId ? null : kpiId));
    setSelectedStep(null);
  };
  const clearDisaggregation = () => { setActiveDisaggregation(null); setActiveDimension(null); };

  /* ----------------------- HEADER ----------------------- */
  const renderHeader = () => (
    <Paper
      elevation={0}
      sx={{
        p: 2, mb: 3, borderRadius: 2,
        position: 'sticky', top: 8, zIndex: 10,
        border: theme => `1px solid ${alpha(theme.palette.divider, 0.7)}`
      }}
    >
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
        <Stack direction="row" alignItems="center" spacing={2}>
          <Avatar src={ndaLogo} alt="NDA Logo" sx={{ width: 56, height: 56 }} variant="rounded" />
          <Box>
            <Typography variant="h5" fontWeight="bold" color="primary">Uganda National Drug Authority</Typography>
            <Typography variant="subtitle2" color="text.secondary">Regulatory KPI Dashboard</Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Quarter</InputLabel>
            <Select value={selectedQuarter} onChange={(e) => setSelectedQuarter(e.target.value)} label="Quarter">
              {allQuarters.map(q => <MenuItem key={q} value={q}>{q}</MenuItem>)}
            </Select>
          </FormControl>
          <IconButton onClick={() => setDarkMode(v => !v)} color="inherit">
            {darkMode ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
        </Stack>
      </Stack>

      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        variant="fullWidth"
        sx={{
          mt: 2,
          '& .Mui-selected': { color: 'primary.main', fontWeight: 'bold' },
          '& .MuiTabs-indicator': { height: 4, borderRadius: '4px 4px 0 0' }
        }}
      >
        <Tab label="Marketing Authorization" value="MA" icon={<Assignment />} iconPosition="start" />
        <Tab label="Clinical Trials" value="CT" icon={<Science />} iconPosition="start" />
        <Tab label="GMP Compliance" value="GMP" icon={<Gavel />} iconPosition="start" />
      </Tabs>

      {/* Mini summary bar */}
      <Stack direction="row" spacing={1.5} sx={{ mt: 2, flexWrap: 'wrap' }}>
        <Chip icon={<CheckCircle sx={{ color: 'success.main' }} />} variant="outlined" color="success" label={`On/Above Target: ${calculations.kpiStatusSummary.success}`} />
        <Chip icon={<Warning sx={{ color: 'warning.main' }} />} variant="outlined" color="warning" label={`Near Target: ${calculations.kpiStatusSummary.warning}`} />
        <Chip icon={<Error sx={{ color: 'error.main' }} />} variant="outlined" color="error" label={`Below Target: ${calculations.kpiStatusSummary.error}`} />
        <Chip icon={<Timeline />} variant="outlined" label={`Trends ↑ ${calculations.trendSummary.up} | ↓ ${calculations.trendSummary.down} | → ${calculations.trendSummary.flat}`} />
      </Stack>
    </Paper>
  );

  /* ----------------------- KPI DETAILS ----------------------- */
  const renderKpiDetails = () => {
    if (!selectedKpi) return null;
    const kpi = quarterlyData[activeTab][selectedKpi];
    const dp = (activeDisaggregation && activeDimension && kpi.disaggregations?.[activeDisaggregation]?.[activeDimension])
      ? kpi.disaggregations[activeDisaggregation][activeDimension].find(i => i.quarter === selectedQuarter)
      : kpi.data.find(i => i.quarter === selectedQuarter);

    if (!dp) return <EmptyState message={`No detailed data for ${shortKpiNameMap[selectedKpi]} in ${selectedQuarter}.`} />;

    const isPercentage = selectedKpi.startsWith('pct_');
    const valueDisplay = dp.value !== null && dp.value !== undefined ? (isPercentage ? `${dp.value}%` : dp.value) : 'N/A';
    const targetDisplay = isPercentage ? `${kpi.target}%` : kpi.target;
    const baselineDisplay = isPercentage ? `${kpi.baseline}%` : kpi.baseline;
    const variance = dp.value - kpi.target;
    const varianceDisplay = isPercentage ? `${variance.toFixed(1)}%` : variance.toFixed(1);
    const row = calculations.kpiSummary.find(k => k.kpiId === selectedKpi);
    const status = row?.status || 'error';

    const series = (activeDisaggregation && activeDimension && kpi.disaggregations?.[activeDisaggregation]?.[activeDimension])
      ? kpi.disaggregations[activeDisaggregation][activeDimension]
      : kpi.data;

    const chartData = {
      labels: series.map(i => i.quarter),
      datasets: [
        {
          label: activeDimension || 'Performance',
          data: series.map(i => i.value),
          borderColor: ndaColors.primary,
          backgroundColor: alpha(ndaColors.primary, 0.2),
          tension: 0.4, fill: true, borderWidth: 2,
          pointBackgroundColor: series.map(i => i.quarter === selectedQuarter ? ndaColors.secondary : ndaColors.primary),
          pointRadius: series.map(i => i.quarter === selectedQuarter ? 6 : 3),
          pointHoverRadius: 7
        },
        {
          label: 'Target',
          data: series.map(() => kpi.target),
          borderColor: ndaColors.error, borderDash: [5, 5], borderWidth: 1, pointStyle: false
        },
        {
          label: 'Baseline',
          data: series.map(() => kpi.baseline),
          borderColor: ndaColors.info, borderDash: [2, 2], borderWidth: 2, pointStyle: false
        }
      ]
    };

    return (
      <Slide direction="up" in>
        <Card sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', color: ndaColors.accent }}>
            {kpiNameMap[selectedKpi] || selectedKpi}
            {activeDisaggregation && activeDimension && (
              <Chip
                label={`${activeDisaggregation}: ${activeDimension}`}
                onDelete={clearDisaggregation}
                deleteIcon={<FilterAltOff />}
                sx={{ ml: 2, mt: { xs: 1, sm: 0 } }}
                color="primary"
                variant="outlined"
              />
            )}
          </Typography>

          {disaggregationOptions[selectedKpi] && (
            <Box sx={{ mt: 1.5, mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <FilterAlt sx={{ mr: 1 }} /> Filter by:
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                {Object.entries(disaggregationOptions[selectedKpi]).map(([dimension, categories]) => (
                  <Box key={dimension} sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ mr: 1, fontWeight: 'bold' }}>{dimension}:</Typography>
                    {categories.map(cat => (
                      <Chip
                        key={cat}
                        label={cat}
                        onClick={() => { setActiveDisaggregation(dimension); setActiveDimension(cat); }}
                        variant={activeDisaggregation === dimension && activeDimension === cat ? 'filled' : 'outlined'}
                        color="primary"
                        sx={{ mr: 1, mb: 1 }}
                      />
                    ))}
                  </Box>
                ))}
              </Stack>
            </Box>
          )}

          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <Card sx={{ p: 2, height: '100%', bgcolor: alpha(ndaColors.primary, 0.1) }}>
                <Typography variant="subtitle2" color="text.secondary">Current Value ({selectedQuarter})</Typography>
                <Typography variant="h5" fontWeight="bold" color="primary">{valueDisplay}</Typography>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ p: 2, height: '100%', bgcolor: alpha(ndaColors.success, 0.1) }}>
                <Typography variant="subtitle2" color="text.secondary">Target Value</Typography>
                <Typography variant="h5" fontWeight="bold" color="success.main">{targetDisplay}</Typography>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ p: 2, height: '100%', bgcolor: alpha(ndaColors.info, 0.1) }}>
                <Typography variant="subtitle2" color="text.secondary">Baseline</Typography>
                <Typography variant="h5" fontWeight="bold" color="info.main">{baselineDisplay}</Typography>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ p: 2, height: '100%', bgcolor: alpha(status === 'success' ? ndaColors.success : status === 'warning' ? ndaColors.warning : ndaColors.error, 0.1) }}>
                <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {status === 'success' ? <CheckCircle color="success" sx={{ fontSize: 34, mr: 1 }} /> :
                    status === 'warning' ? <Warning color="warning" sx={{ fontSize: 34, mr: 1 }} /> :
                      <Error color="error" sx={{ fontSize: 34, mr: 1 }} />}
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {status === 'success' ? 'On Target' : status === 'warning' ? 'Near Target' : 'Below Target'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">({variance >= 0 ? '+' : ''}{varianceDisplay})</Typography>
                  </Box>
                </Box>
              </Card>
            </Grid>
          </Grid>

          <Box sx={{ mt: 2.5, height: 340, width: '100%' }}>
            <Line
              data={chartData}
              options={{
                ...makeBaseChartOptions(darkMode),
                ...makeAxis(darkMode, { yMax: isPercentage ? 100 : undefined }),
                elements: { line: { tension: 0.4 }, point: { radius: 3, hoverRadius: 8 } }
              }}
            />
          </Box>
        </Card>
      </Slide>
    );
  };

  /* ----------------------- PROCESS ANALYSIS ----------------------- */
  const renderProcessStepAnalysis = () => {
    const steps = processStepData[activeTab];

    const current = Object.entries(steps).map(([step, data]) => {
      const q = data.data.find(d => d.quarter === selectedQuarter);
      if (!q) return null;
      const variance = q.avgDays - q.targetDays;

      const qs = data.data.map(d => d.quarter);
      const idx = qs.indexOf(selectedQuarter);
      let trend = 'flat';
      if (idx > 0) {
        const cur = q.avgDays, prev = data.data[idx - 1].avgDays;
        trend = cur < prev ? 'improving' : cur > prev ? 'declining' : 'flat';
      }
      return { step, ...q, variance, trend };
    }).filter(Boolean);

    const chartData = {
      labels: current.map(s => s.step),
      datasets: [
        {
          label: 'Actual Days',
          data: current.map(s => s.avgDays),
          backgroundColor: current.map(s => alpha(
            s.variance <= 0 ? ndaColors.success : s.variance <= s.targetDays * 0.2 ? ndaColors.warning : ndaColors.error, 0.85)),
          borderColor: current.map(s =>
            s.variance <= 0 ? ndaColors.success : s.variance <= s.targetDays * 0.2 ? ndaColors.warning : ndaColors.error),
          borderWidth: 1, borderRadius: 4, barPercentage: 0.5, categoryPercentage: 0.48
        },
        {
          label: 'Target Days',
          data: current.map(s => s.targetDays),
          backgroundColor: alpha(ndaColors.accent, 0.6),
          borderColor: ndaColors.accent,
          borderWidth: 1, borderRadius: 4, barPercentage: 0.5, categoryPercentage: 0.48
        }
      ]
    };

    return (
      <Card sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', fontWeight: 'bold', color: ndaColors.accent }}>
          <Timeline sx={{ mr: 1 }} /> Process Step Analysis ({selectedQuarter})
        </Typography>

        <Box sx={{ height: 380, width: '100%' }}>
          <Bar
            data={chartData}
            options={{ ...makeBaseChartOptions(darkMode), ...makeAxis(darkMode, { yTitle: 'Days' }) }}
          />
        </Box>

        <TableContainer component={Paper} sx={{ mt: 2, borderRadius: 2 }}>
          <Table>
            <TableHead sx={{ bgcolor: alpha(ndaColors.primary, 0.1) }}>
              <TableRow>
                {['Process Name', 'Actual Days', 'Target Days', 'Variance', 'Status/Trend'].map(h => (
                  <TableCell key={h} align={h === 'Process Name' ? 'left' : 'right'} sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {current.map(({ step, avgDays, targetDays, variance, trend }) => {
                const s = variance <= 0 ? 'success' : variance <= targetDays * 0.2 ? 'warning' : 'error';
                return (
                  <TableRow key={step} hover>
                    <TableCell>{step}</TableCell>
                    <TableCell align="right">{avgDays}</TableCell>
                    <TableCell align="right">{targetDays}</TableCell>
                    <TableCell align="right" sx={{ color: `${s}.main`, fontWeight: 'bold' }}>
                      {variance > 0 ? '+' : ''}{variance.toFixed(1)}
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ cursor: 'pointer' }} onClick={() => setSelectedStep(step)}>
                        {trend === 'improving' && <ArrowDownward color="success" fontSize="small" />}
                        {trend === 'declining' && <ArrowUpward color="error" fontSize="small" />}
                        {trend === 'flat' && <TrendingFlat color="warning" fontSize="small" />}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {selectedStep && (
          <ProcessStepModal
            stepName={selectedStep}
            stepData={steps[selectedStep]}
            quarter={selectedQuarter}
            onClose={() => setSelectedStep(null)}
            darkMode={darkMode}
          />
        )}
      </Card>
    );
  };

  /* ----------------------- SUMMARY CHARTS ----------------------- */
  const renderSummaryCharts = () => {
    const { kpiStatusSummary, trendSummary } = calculations;

    const donutData = {
      labels: ['On Target', 'Near Target', 'Below Target'],
      datasets: [{
        data: [kpiStatusSummary.success, kpiStatusSummary.warning, kpiStatusSummary.error],
        backgroundColor: [ndaColors.success, ndaColors.warning, ndaColors.error],
        borderColor: darkMode ? '#1a1c1f' : '#ffffff',
        borderWidth: 2, hoverOffset: 8
      }]
    };

    const performanceData = {
      labels: calculations.kpiSummary.map(k => shortKpiNameMap[k.kpiId] || kpiNameMap[k.kpiId] || k.kpiId),
      datasets: [
        {
          label: 'Current',
          data: calculations.kpiSummary.map(k => k.value),
          backgroundColor: calculations.kpiSummary.map(k => alpha(k.status === 'success' ? ndaColors.success : k.status === 'warning' ? ndaColors.warning : ndaColors.error, 0.85)),
          borderColor: calculations.kpiSummary.map(k => k.status === 'success' ? ndaColors.success : k.status === 'warning' ? ndaColors.warning : ndaColors.error),
          borderWidth: 1, borderRadius: 4
        },
        {
          label: 'Target',
          data: calculations.kpiSummary.map(k => k.kpi.target),
          backgroundColor: alpha(ndaColors.accent, 0.6),
          borderColor: ndaColors.accent, borderWidth: 1, borderRadius: 4
        }
      ]
    };

    return (
      <Card sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', fontWeight: 'bold', color: ndaColors.accent }}>
          <BarChart sx={{ mr: 1 }} /> Overall Performance ({selectedQuarter})
          {activeDisaggregation && activeDimension && (
            <Chip
              label={`${activeDisaggregation}: ${activeDimension}`}
              onDelete={clearDisaggregation}
              deleteIcon={<FilterAltOff />}
              sx={{ ml: 2 }}
              color="primary"
              variant="outlined"
            />
          )}
        </Typography>

        <Grid container spacing={4}>
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>KPI Performance vs. Target</Typography>
            <Box sx={{ height: { xs: 380, md: 440 }, width: '100%' }}>
              <Bar
                data={performanceData}
                options={{
                  ...makeBaseChartOptions(darkMode),
                  indexAxis: 'y',
                  ...makeAxis(darkMode, { xTitle: 'Value (%)' }),
                  layout: { padding: { left: 40, right: 16, top: 8, bottom: 8 } },
                  animation: { duration: 1200, easing: 'easeOutQuart' },
                  barThickness: 20, maxBarThickness: 22, categoryPercentage: 0.8, barPercentage: 0.8,
                  scales: {
                    ...makeAxis(darkMode, { xTitle: 'Value (%)' }).scales,
                    y: {
                      ...makeAxis(darkMode, { xTitle: 'Value (%)' }).scales.y,
                      grid: { display: false },
                      ticks: {
                        color: darkMode ? '#fff' : ndaColors.accent,
                        font: { size: 11, weight: 'bold', lineHeight: 1.2 },
                        padding: 14,
                        callback: function (val) {
                          const label = this.getLabelForValue(val);
                          return typeof label === 'string' ? wrapLabel(label, 35, 3) : label;
                        }
                      }
                    }
                  }
                }}
              />
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>Performance Insights</Typography>
            <Fade in timeout={800}>
              <div>
                <Typography variant="body1">
                  Out of {calculations.kpiSummary.length} KPIs, {kpiStatusSummary.success} ({((kpiStatusSummary.success / Math.max(1, calculations.kpiSummary.length)) * 100).toFixed(0)}%) are on/above target,
                  {' '}{kpiStatusSummary.warning} ({((kpiStatusSummary.warning / Math.max(1, calculations.kpiSummary.length)) * 100).toFixed(0)}%) are near target, and
                  {' '}{kpiStatusSummary.error} ({((kpiStatusSummary.error / Math.max(1, calculations.kpiSummary.length)) * 100).toFixed(0)}%) are below target.
                </Typography>
                <Typography variant="body1" sx={{ mt: 1 }}>
                  Trend: {trendSummary.up} improved, {trendSummary.down} declined, {trendSummary.flat} stable.
                </Typography>
                <Typography variant="body1" sx={{ mt: 1 }}>
                  Process steps: {calculations.processSummary.onTime} on/≤ target, {calculations.processSummary.near} near, {calculations.processSummary.delayed} delayed.
                </Typography>
              </div>
            </Fade>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" align="center" gutterBottom>KPI Status Summary</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Box sx={{ height: 180, width: 180, position: 'relative', mr: 2 }}>
                <Doughnut
                  data={donutData}
                  options={{
                    responsive: true, maintainAspectRatio: false, cutout: '70%',
                    plugins: { legend: { display: false }, tooltip: makeBaseChartOptions(darkMode).plugins.tooltip },
                    animation: { duration: 1200, easing: 'easeOutQuart' }
                  }}
                />
                <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: ndaColors.primary }}>{kpiStatusSummary.success}</Typography>
                  <Typography variant="body2" color="text.secondary">/ {calculations.kpiSummary.length}</Typography>
                  <Typography variant="caption" color="text.secondary">On Target</Typography>
                </Box>
              </Box>
              <Box sx={{ mt: 0 }}>
                {donutData.labels.map((label, i) => (
                  <Box key={label} sx={{ display: 'flex', alignItems: 'center', my: 0.5 }}>
                    <Box sx={{ width: 12, height: 12, bgcolor: donutData.datasets[0].backgroundColor[i], borderRadius: '50%', mr: 1 }} />
                    <Typography variant="body2">{label} ({donutData.datasets[0].data[i]})</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Card>
    );
  };

  /* ----------------------- RENDER ----------------------- */
  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ width: '100%', minHeight: '100vh', p: { xs: 1, sm: 2, md: 3 }, bgcolor: 'background.default', maxWidth: '1400px', mx: 'auto' }}>
        {renderHeader()}

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card sx={{ p: 3, borderRadius: 2, mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                {React.cloneElement(processIcons[activeTab], { sx: { color: 'primary.main' } })}
                <Typography variant="h6" sx={{ ml: 2, fontWeight: 'bold', color: 'primary.main' }}>
                  {activeTab === 'MA' && 'Marketing Authorization KPIs'}
                  {activeTab === 'CT' && 'Clinical Trials KPIs'}
                  {activeTab === 'GMP' && 'GMP Compliance KPIs'}
                </Typography>
              </Box>

              <Grid container spacing={2.5}>
                {isLoading
                  ? Array.from({ length: 9 }).map((_, i) => <KpiCardSkeleton key={i} />)
                  : calculations.kpiSummary.map(({ kpiId, kpi, value, status, trend, isTimeBased }, idx) => (
                      <KpiCard
                        key={kpiId}
                        index={idx}
                        kpiId={kpiId}
                        kpi={kpi}
                        value={value}
                        status={status}
                        trend={trend}
                        isTimeBased={isTimeBased}
                        isSelected={selectedKpi === kpiId}
                        isFiltered={selectedKpi === kpiId && activeDimension !== null}
                        onClick={() => handleKpiSelect(kpiId)}
                      />
                    ))
                }
              </Grid>
            </Card>

            {selectedKpi && renderKpiDetails()}
            {renderProcessStepAnalysis()}
            {renderSummaryCharts()}
          </Grid>
        </Grid>
      </Box>
    </ThemeProvider>
  );
}
