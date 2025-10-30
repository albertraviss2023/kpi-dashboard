import React, { useState, useMemo, useEffect } from 'react';
import {
    Box, Grid, Paper, Stack, Divider, Typography, Avatar, Chip, Tooltip,
    Tabs, Tab, Select, MenuItem, FormControl, InputLabel,
    Card, CardContent, Collapse, Modal, IconButton, useMediaQuery, LinearProgress, Skeleton, Fade, Slide,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    ThemeProvider, createTheme,
} from '@mui/material';
import {
    ArrowUpward, ArrowDownward, TrendingFlat, Timeline, BarChart, Assignment, Science, Gavel,
    CheckCircle, Warning, Error, FilterAlt, FilterAltOff, Close, InfoOutlined,
    Brightness4, Brightness7,
} from '@mui/icons-material';
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip as ChartTooltip, Legend, ArcElement, LineElement, PointElement, Filler } from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { quarterlyData, processStepData } from '../data/kpiData';
import ndaLogo from '../assets/nda-logo.png';

ChartJS.register(BarElement, CategoryScale, LinearScale, ChartTooltip, Legend, ArcElement, LineElement, PointElement, Filler);

// --- DATA MAPPINGS & CONFIGURATION ---
const ndaColors = {
    primary: '#2E7D32', secondary: '#FFB300', accent: '#2c58ddff', success: '#66BB6A',
    warning: '#FFB300', error: '#DC143C', info: '#1976D2',
};

const kpiNameMap = {
    'pct_new_apps_evaluated_on_time': '1. Percentage of new applications for marketing authorization of medicines evaluated within a specified time',
    'pct_renewal_apps_evaluated_on_time': '2. Percentage of renewals applications for marketing authorization of medicines evaluated within a specified time',
    'pct_variation_apps_evaluated_on_time': '3. Percentage of applications for variation of registered medicinal products evaluated within a specified time',
    'pct_fir_responses_on_time': '4. Percentage of further information requests responses received within a specified timeline',
    'pct_query_responses_evaluated_on_time': '5. Percentage of query responses/additional data evaluated within a specified time',
    'pct_granted_within_90_days': '6. Percentage of medical products and technologies granted MA within 90 working days',
    'median_duration_continental': '7. Median timelines taken by NDA to process continentally reviewed application from the time it is received to decision (days)',
    'pct_new_apps_evaluated_on_time_ct': '1. Percentage of new clinical trial applications evaluated within timeline',
    'pct_amendment_apps_evaluated_on_time': '2. Percentage of clinical trial amendments evaluated within timeline',
    'pct_gcp_inspections_on_time': '3. Percentage of approved & ongoing clinical trials inspected as per the GCP plan',
    'pct_safety_reports_assessed_on_time': '4. Percentage of safety reports assessed within timeline',
    'pct_gcp_compliant': '5. Percentage of clinical trials compliant with GCP requirements',
    'pct_registry_submissions_on_time': '6. Percentage of clinical trials registered in national registry',
    'pct_capa_evaluated_on_time': '7. Percentage of CAPA evaluations completed within timeline',
    'avg_turnaround_time': '8. Average turnaround time for clinical trial applications (days)',
    'pct_facilities_inspected_on_time': '1. Percentage of manufacturing facilities inspected for GMP as per plan',
    'pct_inspections_waived_on_time': '2. Percentage of GMP on-site inspections waived for pharmaceutical manufacturing facilities within set timelines',
    'pct_facilities_compliant': '3. Percentage of pharmaceutical manufacturing facilities compliant with GMP requirements',
    'pct_capa_decisions_on_time': '4. Percentage of final CAPA decisions issued within a specified timeline',
    'pct_applications_completed_on_time': '5. Percentage of GMP inspection applications for pharmaceutical manufacturing facilities completed within the set timeline',
    'avg_turnaround_time_gmp': '6. Average turnaround time (in days) to complete GMP applications for pharmaceutical manufacturing facilities',
    'median_turnaround_time': '7. Median turnaround time (in days) to complete GMP inspection applications for pharmaceutical manufacturing facilities',
    'pct_reports_published_on_time': '8. Percentage of GMP inspection reports published on the regulator\'s website within a specified timeline'
};

const shortKpiNameMap = {
    'pct_new_apps_evaluated_on_time': '1. New Apps On Time',
    'pct_renewal_apps_evaluated_on_time': '2. Renewal Apps On Time',
    'pct_variation_apps_evaluated_on_time': '3. Variation Apps On Time',
    'pct_fir_responses_on_time': '4. FIR Responses On Time',
    'pct_query_responses_evaluated_on_time': '5. Query Responses On Time',
    'pct_granted_within_90_days': '6. MA Granted in 90 Days',
    'median_duration_continental': '7. Median Continental Review',
    'pct_new_apps_evaluated_on_time_ct': '1. New CT Apps On Time',
    'pct_amendment_apps_evaluated_on_time': '2. CT Amendments On Time',
    'pct_gcp_inspections_on_time': '3. GCP Inspections On Time',
    'pct_safety_reports_assessed_on_time': '4. Safety Reports On Time',
    'pct_gcp_compliant': '5. GCP Compliance',
    'pct_registry_submissions_on_time': '6. Registry Submissions',
    'pct_capa_evaluated_on_time': '7. CAPA Evaluations On Time',
    'avg_turnaround_time': '8. Avg CT Turnaround',
    'pct_facilities_inspected_on_time': '1. GMP Inspections On Time',
    'pct_inspections_waived_on_time': '2. GMP Inspections Waived',
    'pct_facilities_compliant': '3. GMP Facilities Compliant',
    'pct_capa_decisions_on_time': '4. CAPA Decisions On Time',
    'pct_applications_completed_on_time': '5. GMP Apps Completed',
    'avg_turnaround_time_gmp': '6. Avg GMP Turnaround',
    'median_turnaround_time': '7. Median GMP Turnaround',
    'pct_reports_published_on_time': '8. GMP Reports Published'
};

const timeBasedKpis = ['median_duration_continental', 'avg_turnaround_time', 'avg_turnaround_time_gmp', 'median_turnaround_time'];

const processIcons = { MA: <Assignment fontSize="large" />, CT: <Science fontSize="large" />, GMP: <Gavel fontSize="large" /> };

const disaggregationOptions = {
    'pct_facilities_inspected_on_time': { 'inspectionType': ['On-site domestic', 'On-site foreign', 'Reliance/Joint on-site foreign'] },
    'pct_facilities_compliant': { 'inspectionType': ['On-site domestic', 'On-site foreign', 'Reliance/Joint on-site foreign'] },
    'pct_capa_decisions_on_time': { 'inspectionSource': ['Direct: Foreign + Domestic Done by NRA', 'Reliance: Rec joint Inspections'] },
    'pct_applications_completed_on_time': { 'applicantType': ['Domestic Applicant', 'Foreign Applicant - Direct', 'Foreign Applicant - Reliance'] },
    'avg_turnaround_time_gmp': { 'inspectionType': ['On-site domestic', 'On-site foreign', 'Reliance/Joint on-site foreign'] },
    'median_turnaround_time': { 'inspectionType': ['On-site domestic', 'On-site foreign'] },
    'pct_reports_published_on_time': { 'inspectionType': ['On-site domestic', 'On-site foreign', 'Reliance/Joint on-site foreign', 'Reliance/Joint desk-based foreign'] }
};

// --- HELPER FUNCTIONS & REUSABLE COMPONENTS ---
const alpha = (color, value) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${value})`;
};

// ADD THIS FUNCTION FOR LABEL WRAPPING
const wrapLabel = (text, maxCharsPerLine = 30, maxLines = 3) => {
    if (!text || typeof text !== 'string') return text;
    
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
        if ((currentLine + word).length > maxCharsPerLine && currentLine !== '') {
            lines.push(currentLine.trim());
            currentLine = word + ' ';
            
            if (lines.length >= maxLines) break;
        } else {
            currentLine += word + ' ';
        }
    }

    if (currentLine.trim() !== '' && lines.length < maxLines) {
        lines.push(currentLine.trim());
    }

    if (lines.length === maxLines && text.length > lines.join(' ').length) {
        const lastLine = lines[maxLines - 1];
        if (lastLine.length > 3) {
            lines[maxLines - 1] = lastLine.substring(0, lastLine.length - 3) + '...';
        }
    }

    return lines;
};

const TrendIcon = ({ trend, isTimeBased }) => {
    const iconStyle = { verticalAlign: 'middle', fontSize: '1.2rem' };
    if (isTimeBased) {
        if (trend === 'up') return <ArrowUpward color="error" sx={iconStyle} />;
        if (trend === 'down') return <ArrowDownward color="success" sx={iconStyle} />;
    } else {
        if (trend === 'up') return <ArrowUpward color="success" sx={iconStyle} />;
        if (trend === 'down') return <ArrowDownward color="error" sx={iconStyle} />;
    }
    return <TrendingFlat color="warning" sx={iconStyle} />;
};

const EmptyState = ({ message, theme }) => (
    <Card sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', width: '100%', minHeight: 200, mt: 2, bgcolor: alpha(theme.palette.primary.main, 0.04), border: `1px dashed ${alpha(theme.palette.primary.main, 0.2)}` }}>
        <InfoOutlined color="primary" sx={{ fontSize: 48, mb: 2 }} />
        <Typography variant="h6" gutterBottom>No Data Available</Typography>
        <Typography color="text.secondary">{message}</Typography>
    </Card>
);

const KpiCardSkeleton = () => (
    <Grid item xs={12} sm={6} md={4} lg={4}>
        <Card sx={{ height: '100%' }}>
            <CardContent>
                <Skeleton variant="text" width="80%" height={40} />
                <Skeleton variant="text" width="40%" height={48} sx={{ mt: 2 }} />
                <Skeleton variant="text" width="60%" height={20} sx={{ mt: 1 }}/>
                <Skeleton variant="rectangular" height={6} sx={{ mt: 1.5, borderRadius: 3 }} />
            </CardContent>
        </Card>
    </Grid>
);

const KpiCard = ({ kpiId, kpi, value, status, trend, isTimeBased, isSelected, isHighlighted, isFiltered, index, onClick }) => {
    const isPercentage = kpiId.startsWith('pct_');
    const valueDisplay = value !== null ? (isPercentage ? `${value}%` : value) : 'N/A';
    const targetDisplay = isPercentage ? `${kpi.target}%` : kpi.target;
    const shortName = shortKpiNameMap[kpiId] || kpiId;
    const fullName = kpiNameMap[kpiId] || kpiId;
    const progressValue = isPercentage ? (value / kpi.target) * 100 : (kpi.target / value) * 100;

    return (
        <Grid item xs={12} sm={6} md={4} lg={4}>
            <Fade in={true} style={{ transitionDelay: `${index * 50}ms` }}>
                <Card
                    onClick={onClick}
                    elevation={isSelected || isHighlighted ? 8 : 2}
                    sx={{
                        height: '100%',
                        cursor: 'pointer',
                        border: '2px solid',
                        borderColor: isSelected ? 'primary.main' : isHighlighted ? 'secondary.main' : 'transparent',
                        transform: isSelected || isHighlighted ? 'translateY(-4px)' : 'none',
                        transition: 'all 0.3s ease-in-out',
                        '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: (theme) => theme.shadows[10],
                        },
                    }}
                >
                    <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                            <Tooltip title={fullName} placement="top-start">
                                <Typography
                                    variant="subtitle1"
                                    fontWeight="bold"
                                    sx={{
                                        minHeight: '3.6em',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 3,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}
                                >
                                    {shortName}
                                </Typography>
                            </Tooltip>
                            {isFiltered && <Chip label="Filtered" color="primary" size="small" variant="outlined" icon={<FilterAlt fontSize="small" />} />}
                        </Stack>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" mt={1}>
                            <Typography variant="h4" component="div" fontWeight="bold" color={value !== null ? `${status}.main` : 'text.secondary'}>
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
                                value={Math.min(100, progressValue)}
                                color={status}
                                sx={{ height: 6, borderRadius: 3, mt: 1.5 }}
                            />
                        )}
                    </CardContent>
                </Card>
            </Fade>
        </Grid>
    );
};

const ProcessStepModal = ({ stepName, stepData, quarter, onClose, darkMode }) => {
    const currentData = stepData.data.find(item => item.quarter === quarter);
    const variance = currentData.avgDays - currentData.targetDays;
    const status = variance <= 0 ? 'success' : variance <= currentData.targetDays * 0.2 ? 'warning' : 'error';
    const chartData = {
        labels: stepData.data.map(item => item.quarter),
        datasets: [
            {
                label: 'Actual Days',
                data: stepData.data.map(item => item.avgDays),
                borderColor: ndaColors.primary,
                backgroundColor: alpha(ndaColors.primary, darkMode ? 0.4 : 0.2),
                tension: 0.4,
                fill: true,
                borderWidth: 3,
                pointBackgroundColor: stepData.data.map(item => item.quarter === quarter ? ndaColors.secondary : ndaColors.primary),
                pointRadius: stepData.data.map(item => item.quarter === quarter ? 6 : 3)
            },
            {
                label: 'Target Days',
                data: stepData.data.map(item => item.targetDays),
                borderColor: ndaColors.accent,
                borderDash: [5, 5],
                borderWidth: 2,
                pointStyle: false
            }
        ]
    };
    return (
        <Modal open onClose={onClose}>
            <Slide direction="up" in={true} timeout={500}>
                <Box sx={{
                    position: 'absolute',
                    top: '10%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '40%',
                    maxWidth: '90vw',
                    minWidth: '600px',
                    bgcolor: darkMode ? 'background.default' : 'background.paper',
                    boxShadow: 24,
                    p: 4,
                    borderRadius: 2,
                    maxHeight: '80vh',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2
                }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h4" fontWeight="bold" color="primary">{stepName}</Typography>
                        <IconButton onClick={onClose}><Close /></IconButton>
                    </Stack>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                            <Card sx={{ p: 2, height: '100%', bgcolor: alpha(ndaColors.primary, 0.1) }}>
                                <Typography variant="subtitle1" color="text.secondary">Current Quarter ({quarter})</Typography>
                                <Typography variant="h4" fontWeight="bold" color="primary">{currentData.avgDays} days</Typography>
                            </Card>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Card sx={{ p: 2, height: '100%', bgcolor: alpha(ndaColors.success, 0.1) }}>
                                <Typography variant="subtitle1" color="text.secondary">Target Days</Typography>
                                <Typography variant="h4" fontWeight="bold" color="success.main">{currentData.targetDays} days</Typography>
                            </Card>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Card sx={{ p: 2, height: '100%', bgcolor: alpha(status === 'success' ? ndaColors.success : status === 'warning' ? ndaColors.warning : ndaColors.error, 0.1) }}>
                                <Typography variant="subtitle1" color="text.secondary">Status</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    {status === 'success' ? <CheckCircle color="success" sx={{ fontSize: 40, mr: 1 }} /> : status === 'warning' ? <Warning color="warning" sx={{ fontSize: 40, mr: 1 }} /> : <Error color="error" sx={{ fontSize: 40, mr: 1 }} />}
                                    <Box>
                                        <Typography variant="h6">{status === 'success' ? 'On Target' : status === 'warning' ? 'Near Target' : 'Below Target'}</Typography>
                                        <Typography variant="body2" color="text.secondary">({variance > 0 ? '+' : ''}{variance.toFixed(1)} days)</Typography>
                                    </Box>
                                </Box>
                            </Card>
                        </Grid>
                    </Grid>
                    <Box sx={{ height: 300, width: '100%', mt: 2 }}>
                        <Line
                            data={chartData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                interaction: { mode: 'index', intersect: false },
                                scales: {
                                    y: { 
                                        beginAtZero: true, 
                                        grid: { color: darkMode ? alpha('#fff', 0.1) : alpha('#000', 0.05) }, 
                                        ticks: { color: darkMode ? '#fff' : ndaColors.accent },
                                        title: { display: true, text: 'Days', color: darkMode ? '#fff' : ndaColors.accent }
                                    },
                                    x: { 
                                        grid: { display: false }, 
                                        ticks: { color: darkMode ? '#fff' : ndaColors.accent },
                                        title: { display: true, text: 'Quarter', color: darkMode ? '#fff' : ndaColors.accent }
                                    }
                                },
                                plugins: {
                                    legend: { 
                                        position: 'top', 
                                        labels: { 
                                            color: darkMode ? '#fff' : ndaColors.accent, 
                                            font: { weight: 'bold' },
                                            padding: 15,
                                            boxWidth: 12,
                                            boxHeight: 12
                                        } 
                                    },
                                    tooltip: {
                                                backgroundColor: darkMode ? 'rgba(50, 50, 50, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                                                titleColor: darkMode ? '#fff' : ndaColors.primary, // Green - good contrast
                                                bodyColor: darkMode ? '#fff' : '#333333', // Dark gray instead of blue - better contrast
                                                borderColor: darkMode ? '#444' : ndaColors.primary,
                                                borderWidth: 1,
                                                cornerRadius: 6,
                                                padding: 12
                                              }
                                },
                                elements: {
                                    line: { tension: 0.4 },
                                    point: { radius: 3, hoverRadius: 6 }
                                }
                            }}
                        />
                    </Box>
                    <TableContainer component={Paper} sx={{ mt: 2, borderRadius: '12px' }}>
                        <Table>
                            <TableHead sx={{ bgcolor: darkMode ? '#333' : alpha(ndaColors.primary, 0.9) }}>
                                <TableRow>
                                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Quarter</TableCell>
                                    <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>Actual Days</TableCell>
                                    <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>Target Days</TableCell>
                                    <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>Variance</TableCell>
                                    <TableCell align="center" sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {stepData.data.map((row) => {
                                    const rowVariance = row.avgDays - row.targetDays;
                                    const rowStatus = rowVariance <= 0 ? 'success' : rowVariance <= row.targetDays * 0.2 ? 'warning' : 'error';
                                    return (
                                        <TableRow key={row.quarter} sx={{ '&:hover': { bgcolor: darkMode ? '#2a2a2a' : '#f5f5f5' } }}>
                                            <TableCell>{row.quarter}</TableCell>
                                            <TableCell align="right">{row.avgDays}</TableCell>
                                            <TableCell align="right">{row.targetDays}</TableCell>
                                            <TableCell align="right" sx={{ color: rowStatus === 'success' ? ndaColors.success : rowStatus === 'warning' ? ndaColors.warning : ndaColors.error }}>
                                                {rowVariance > 0 ? '+' : ''}{rowVariance.toFixed(1)}
                                            </TableCell>
                                            <TableCell align="center">
                                                {rowStatus === 'success' ? <CheckCircle color="success" /> : rowStatus === 'warning' ? <Warning color="warning" /> : <Error color="error" />}
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

// --- MAIN DASHBOARD COMPONENT ---
const KpiModule = () => {
    // --- STATE MANAGEMENT ---
    const [darkMode, setDarkMode] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('MA');
    const [selectedKpi, setSelectedKpi] = useState(null);
    const [hoveredKpi, setHoveredKpi] = useState(null);
    const [selectedQuarter, setSelectedQuarter] = useState('Q2 2025');
    const [activeDisaggregation, setActiveDisaggregation] = useState(null);
    const [activeDimension, setActiveDimension] = useState(null);
    const [selectedStep, setSelectedStep] = useState(null);
    const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

    // --- EFFECTS ---
    useEffect(() => { setDarkMode(prefersDarkMode); }, [prefersDarkMode]);

    useEffect(() => {
        setIsLoading(true);
        const timer = setTimeout(() => setIsLoading(false), 800);
        return () => clearTimeout(timer);
    }, [activeTab, selectedQuarter]);

    // --- THEMING ---
    const theme = useMemo(() => createTheme({
        palette: {
            mode: darkMode ? 'dark' : 'light',
            primary: { main: ndaColors.primary },
            secondary: { main: ndaColors.secondary },
            success: { main: ndaColors.success },
            warning: { main: ndaColors.warning },
            error: { main: ndaColors.error },
            info: { main: ndaColors.info },
            background: { default: darkMode ? '#121212' : '#f4f6f8', paper: darkMode ? '#1e1e1e' : '#ffffff' },
        },
        typography: { fontFamily: '"Public Sans", sans-serif' },
        components: {
            MuiCard: { styleOverrides: { root: { borderRadius: '16px', boxShadow: 'rgba(145, 158, 171, 0.2) 0px 0px 2px 0px, rgba(145, 158, 171, 0.12) 0px 12px 24px -4px' } } },
            MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
            MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } } }
        },
    }), [darkMode]);

    // --- DATA CALCULATIONS (useMemo) ---
    const allQuarters = [...new Set(Object.values(quarterlyData.MA).flatMap(kpi => kpi.data.map(item => item.quarter)))].sort((a, b) => {
        const [qA, yearA] = a.split(' '); const [qB, yearB] = b.split(' '); const yearDiff = parseInt(yearA, 10) - parseInt(yearB, 10);
        if (yearDiff !== 0) return yearDiff; return parseInt(qA.substring(1), 10) - parseInt(qB.substring(1), 10);
    });

    const calculations = useMemo(() => {
        const getKpiDataPoint = (kpiData, quarter, disaggregation, dimension) => {
            if (disaggregation && dimension && kpiData.disaggregations?.[disaggregation]?.[dimension]) {
                return kpiData.disaggregations[disaggregation][dimension].find(item => item.quarter === quarter);
            }
            return kpiData.data.find(item => item.quarter === quarter);
        };
        const getKpiStatus = (value, target, isTimeBased) => {
            if (value === null || target === undefined) return 'error';
            if (isTimeBased) {
                if (value <= target) return 'success'; if (value <= target * 1.1) return 'warning'; return 'error';
            } else {
                if (value >= target) return 'success'; if (value >= target * 0.9) return 'warning'; return 'error';
            }
        };
        const getKpiTrend = (kpiData, quarter, disaggregation, dimension) => {
            const dataSet = (disaggregation && dimension && kpiData.disaggregations?.[disaggregation]?.[dimension]) ? kpiData.disaggregations[disaggregation][dimension] : kpiData.data;
            const currentIndex = dataSet.findIndex(item => item.quarter === quarter);
            if (currentIndex < 1) return 'flat';
            const currentValue = dataSet[currentIndex].value; const prevValue = dataSet[currentIndex - 1].value;
            if (currentValue > prevValue) return 'up'; if (currentValue < prevValue) return 'down'; return 'flat';
        };
        const kpiSummary = Object.keys(quarterlyData[activeTab]).map(kpiId => {
            const kpi = quarterlyData[activeTab][kpiId];
            const dataPoint = getKpiDataPoint(kpi, selectedQuarter, activeDisaggregation, activeDimension);
            const value = dataPoint ? dataPoint.value : null;
            const isTimeBased = timeBasedKpis.includes(kpiId);
            const status = getKpiStatus(value, kpi.target, isTimeBased);
            const trend = getKpiTrend(kpi, selectedQuarter, activeDisaggregation, activeDimension);
            return { kpiId, kpi, value, status, trend, isTimeBased };
        });
        const kpiStatusSummary = kpiSummary.reduce((acc, curr) => { acc[curr.status] = (acc[curr.status] || 0) + 1; return acc; }, { success: 0, warning: 0, error: 0 });
        const trendSummary = kpiSummary.reduce((acc, curr) => { acc[curr.trend] = (acc[curr.trend] || 0) + 1; return acc; }, { up: 0, down: 0, flat: 0 });
        const processSummary = Object.values(processStepData[activeTab]).reduce((acc, step) => {
            const quarterData = step.data.find(item => item.quarter === selectedQuarter); if (!quarterData) return acc;
            const variance = quarterData.avgDays - quarterData.targetDays;
            if (variance <= 0) acc.onTime++; else if (variance <= quarterData.targetDays * 0.2) acc.near++; else acc.delayed++;
            return acc;
        }, { onTime: 0, near: 0, delayed: 0, total: Object.keys(processStepData[activeTab]).length });
        return { kpiSummary, kpiStatusSummary, trendSummary, processSummary };
    }, [activeTab, selectedQuarter, activeDisaggregation, activeDimension]);

    // --- EVENT HANDLERS ---
    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue); setSelectedKpi(null); setActiveDisaggregation(null); setActiveDimension(null); setSelectedStep(null);
    };
    const handleKpiSelect = (kpiId) => {
        setSelectedKpi(prevKpiId => (prevKpiId === kpiId ? null : kpiId));
        setSelectedStep(null);
    };
    const handleQuarterChange = (event) => setSelectedQuarter(event.target.value);
    const handleDisaggregationSelect = (dimension, category) => { setActiveDisaggregation(dimension); setActiveDimension(category); };
    const clearDisaggregation = () => { setActiveDisaggregation(null); setActiveDimension(null); };

    // --- RENDER FUNCTIONS ---
    const renderHeader = () => (
        <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: '16px', maxWidth: '90vw', mx: 'auto' }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
                <Stack direction="row" alignItems="center" spacing={2}>
                    <Avatar src={ndaLogo} alt="NDA Logo" sx={{ width: 64, height: 64 }} variant="rounded" />
                    <Box>
                        <Typography variant="h4" fontWeight="bold" color="primary">Uganda National Drug Authority</Typography>
                        <Typography variant="subtitle1" color="text.secondary">Regulatory KPI Dashboard</Typography>
                    </Box>
                </Stack>
                <Stack direction="row" spacing={2} alignItems="center">
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>Quarter</InputLabel>
                        <Select value={selectedQuarter} onChange={handleQuarterChange} label="Quarter">{allQuarters.map(q => <MenuItem key={q} value={q}>{q}</MenuItem>)}</Select>
                    </FormControl>
                    <IconButton onClick={() => setDarkMode(!darkMode)} color="inherit">{darkMode ? <Brightness7 /> : <Brightness4 />}</IconButton>
                </Stack>
            </Stack>
            <Tabs value={activeTab} onChange={handleTabChange} variant="fullWidth" sx={{ mt: 2, '& .Mui-selected': { color: 'primary.main', fontWeight: 'bold' }, '& .MuiTabs-indicator': { height: '4px', borderRadius: '4px 4px 0 0' } }}>
                <Tab label="Marketing Authorization" value="MA" icon={<Assignment />} iconPosition="start" />
                <Tab label="Clinical Trials" value="CT" icon={<Science />} iconPosition="start" />
                <Tab label="GMP Compliance" value="GMP" icon={<Gavel />} iconPosition="start" />
            </Tabs>
        </Paper>
    );

    const renderKpiDetails = () => {
        if (!selectedKpi) return null;
        const kpi = quarterlyData[activeTab][selectedKpi];
        const dataPoint = (activeDisaggregation && activeDimension && kpi.disaggregations?.[activeDisaggregation]?.[activeDimension])
            ? kpi.disaggregations[activeDisaggregation][activeDimension].find(item => item.quarter === selectedQuarter)
            : kpi.data.find(item => item.quarter === selectedQuarter);

        if (!dataPoint) return <EmptyState theme={theme} message={`No detailed data found for ${shortKpiNameMap[selectedKpi]} in ${selectedQuarter}.`} />;

        const isPercentage = selectedKpi.startsWith('pct_');
        const valueDisplay = dataPoint.value !== null ? (isPercentage ? `${dataPoint.value}%` : dataPoint.value) : 'N/A';
        const targetDisplay = isPercentage ? `${kpi.target}%` : kpi.target;
        const baselineDisplay = isPercentage ? `${kpi.baseline}%` : kpi.baseline;
        const variance = dataPoint.value - kpi.target;
        const varianceDisplay = isPercentage ? `${variance.toFixed(1)}%` : variance.toFixed(1);
        const status = calculations.kpiSummary.find(k => k.kpiId === selectedKpi).status;

        const chartData = {
            labels: (activeDisaggregation && activeDimension && kpi.disaggregations?.[activeDisaggregation]?.[activeDimension]
                ? kpi.disaggregations[activeDisaggregation][activeDimension]
                : kpi.data).map(item => item.quarter),
            datasets: [
                {
                    label: activeDimension || 'Performance',
                    data: (activeDisaggregation && activeDimension && kpi.disaggregations?.[activeDisaggregation]?.[activeDimension]
                        ? kpi.disaggregations[activeDisaggregation][activeDimension]
                        : kpi.data).map(item => item.value),
                    borderColor: ndaColors.primary,
                    backgroundColor: alpha(ndaColors.primary, 0.2),
                    tension: 0.4,
                    fill: true,
                    borderWidth: 2,
                    pointBackgroundColor: (activeDisaggregation && activeDimension && kpi.disaggregations?.[activeDisaggregation]?.[activeDimension]
                        ? kpi.disaggregations[activeDisaggregation][activeDimension]
                        : kpi.data).map(item => item.quarter === selectedQuarter ? ndaColors.secondary : ndaColors.primary),
                    pointRadius: (activeDisaggregation && activeDimension && kpi.disaggregations?.[activeDisaggregation]?.[activeDimension]
                        ? kpi.disaggregations[activeDisaggregation][activeDimension]
                        : kpi.data).map(item => item.quarter === selectedQuarter ? 6 : 3),
                    pointHoverRadius: 8
                },
                {
                    label: 'Target',
                    data: (activeDisaggregation && activeDimension && kpi.disaggregations?.[activeDisaggregation]?.[activeDimension]
                        ? kpi.disaggregations[activeDisaggregation][activeDimension]
                        : kpi.data).map(() => kpi.target),
                    borderColor: ndaColors.error,
                    borderDash: [5, 5],
                    borderWidth: 1,
                    pointStyle: false
                },
                {
                    label: 'Baseline',
                    data: (activeDisaggregation && activeDimension && kpi.disaggregations?.[activeDisaggregation]?.[activeDimension]
                        ? kpi.disaggregations[activeDisaggregation][activeDimension]
                        : kpi.data).map(() => kpi.baseline),
                    borderColor: ndaColors.info,
                    borderDash: [2, 2],
                    borderWidth: 2,
                    pointStyle: false
                }
            ]
        };

        return (
            <Slide direction="up" in={true}>
                <Card sx={{ p: 3, mb: 3, borderRadius: '16px', maxWidth: '90vw', mx: 'auto' }}>
                    <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', color: ndaColors.accent }}>
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
                        <Box sx={{ mt: 2, mb: 3 }}>
                            <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                                <FilterAlt sx={{ mr: 1 }} /> Filter by:
                            </Typography>
                            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                                {Object.entries(disaggregationOptions[selectedKpi]).map(([dimension, categories]) => (
                                    <Box key={dimension} sx={{ display: 'flex', alignItems: 'center' }}>
                                        <Typography variant="body2" sx={{ mr: 1, fontWeight: 'bold' }}>{dimension}:</Typography>
                                        {categories.map(category => (
                                            <Chip
                                                key={category}
                                                label={category}
                                                onClick={() => handleDisaggregationSelect(dimension, category)}
                                                variant={activeDisaggregation === dimension && activeDimension === category ? 'filled' : 'outlined'}
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
                                <Typography variant="subtitle1" color="text.secondary">Current Value ({selectedQuarter})</Typography>
                                <Typography variant="h4" fontWeight="bold" color="primary">{valueDisplay}</Typography>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <Card sx={{ p: 2, height: '100%', bgcolor: alpha(ndaColors.success, 0.1) }}>
                                <Typography variant="subtitle1" color="text.secondary">Target Value</Typography>
                                <Typography variant="h4" fontWeight="bold" color="success">{targetDisplay}</Typography>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <Card sx={{ p: 2, height: '100%', bgcolor: alpha(ndaColors.info, 0.1) }}>
                                <Typography variant="subtitle1" color="text.secondary">Baseline</Typography>
                                <Typography variant="h4" fontWeight="bold" color="info">{baselineDisplay}</Typography>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <Card sx={{ p: 2, height: '100%', bgcolor: alpha(status === 'success' ? ndaColors.success : status === 'warning' ? ndaColors.warning : ndaColors.error, 0.1) }}>
                                <Typography variant="subtitle1" color="text.secondary">Status</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    {status === 'success' ? <CheckCircle color="success" sx={{ fontSize: 40, mr: 1 }} /> :
                                     status === 'warning' ? <Warning color="warning" sx={{ fontSize: 40, mr: 1 }} /> :
                                     <Error color="error" sx={{ fontSize: 40, mr: 1 }} />}
                                    <Box>
                                        <Typography variant="h6">{status === 'success' ? 'On Target' : status === 'warning' ? 'Near Target' : 'Below Target'}</Typography>
                                        <Typography variant="body2" color="text.secondary">({variance >= 0 ? '+' : ''}{varianceDisplay})</Typography>
                                    </Box>
                                </Box>
                            </Card>
                        </Grid>
                    </Grid>
                    <Box sx={{ mt: 3, height: 350, width: '100%' }}>
                        <Line
                            data={chartData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                interaction: { mode: 'index', intersect: false },
                                scales: {
                                    y: {
                                        beginAtZero: true,
                                        min: 0,
                                        max: isPercentage ? 100 : undefined,
                                        grid: {
                                            color: darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
                                            lineWidth: 1,
                                            drawBorder: false
                                        },
                                        ticks: {
                                            color: darkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.7)',
                                            padding: 8,
                                            font: { size: 12 }
                                        }
                                    },
                                    x: {
                                        grid: { display: false },
                                        ticks: {
                                            color: darkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.7)',
                                            font: { size: 12 }
                                        }
                                    }
                                },
                                plugins: {
                                    legend: {
                                        position: 'top',
                                        labels: {
                                            color: darkMode ? '#fff' : ndaColors.accent,
                                            font: { weight: 'bold' },
                                            padding: 20,
                                            boxWidth: 12,
                                            boxHeight: 12
                                        }
                                    },
                                    tooltip: {
                                                backgroundColor: darkMode ? 'rgba(50, 50, 50, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                                                titleColor: darkMode ? '#fff' : ndaColors.primary, // Green - good contrast
                                                bodyColor: darkMode ? '#fff' : '#333333', // Dark gray instead of blue - better contrast
                                                borderColor: darkMode ? '#444' : ndaColors.primary,
                                                borderWidth: 1,
                                                cornerRadius: 6,
                                                padding: 12
                                              }
                                       },
                                elements: {
                                    line: { tension: 0.4 },
                                    point: { radius: 3, hoverRadius: 8 }
                                }
                            }}
                        />
                    </Box>
                </Card>
            </Slide>
        );
    };

    const renderProcessStepAnalysis = () => {
        const steps = processStepData[activeTab];
        const currentQuarterData = Object.entries(steps).map(([step, stepData]) => {
            const quarterData = stepData.data.find(item => item.quarter === selectedQuarter);
            if (!quarterData) return null;
            const variance = quarterData.avgDays - quarterData.targetDays;
            
            // Determine trend
            const quarters = stepData.data.map(item => item.quarter);
            const currentIndex = quarters.indexOf(selectedQuarter);
            let trend = 'flat';
            if (currentIndex > 0) {
                const currentValue = quarterData.avgDays;
                const prevValue = stepData.data[currentIndex - 1].avgDays;
                if (currentValue < prevValue) trend = 'improving';
                else if (currentValue > prevValue) trend = 'declining';
            }
            
            return { step, ...quarterData, variance, trend };
        }).filter(item => item !== null);

        const chartData = {
            labels: currentQuarterData.map(step => step.step),
            datasets: [
                {
                    label: 'Actual Days',
                    data: currentQuarterData.map(step => step.avgDays),
                    backgroundColor: currentQuarterData.map(step => alpha(
                        step.variance <= 0 ? ndaColors.success : 
                        step.variance <= step.targetDays * 0.2 ? ndaColors.warning : 
                        ndaColors.error, 0.8)),
                    borderColor: currentQuarterData.map(step => 
                        step.variance <= 0 ? ndaColors.success : 
                        step.variance <= step.targetDays * 0.2 ? ndaColors.warning : 
                        ndaColors.error),
                    borderWidth: 1,
                    borderRadius: 4,
                    barPercentage: 0.45,
                    categoryPercentage: 0.4
                },
                {
                    label: 'Target Days',
                    data: currentQuarterData.map(step => step.targetDays),
                    backgroundColor: alpha(ndaColors.accent, 0.6),
                    borderColor: ndaColors.accent,
                    borderWidth: 1,
                    borderRadius: 4,
                    barPercentage: 0.45,
                    categoryPercentage: 0.4
                }
            ]
        };

        return (
            <Card sx={{ p: 3, mb: 3, borderRadius: '16px', maxWidth: '90vw', mx: 'auto' }}>
                <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', fontWeight: 'bold', color: ndaColors.accent }}>
                    <Timeline sx={{ mr: 1 }} /> Process Step Analysis ({selectedQuarter})
                </Typography>
                
                <Box sx={{ height: 400, width: '100%' }}>
                    <Bar 
                        data={chartData} 
                        options={{ 
                            responsive: true, 
                            maintainAspectRatio: false,
                            interaction: { mode: 'index', intersect: false },
                            plugins: {
                                legend: {
                                    position: 'top',
                                    labels: {
                                        color: darkMode ? '#fff' : ndaColors.accent,
                                        font: { weight: 'bold' }
                                    }
                                },
                                 tooltip: {
                                                backgroundColor: darkMode ? 'rgba(50, 50, 50, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                                                titleColor: darkMode ? '#fff' : ndaColors.primary, // Green - good contrast
                                                bodyColor: darkMode ? '#fff' : '#333333', // Dark gray instead of blue - better contrast
                                                borderColor: darkMode ? '#444' : ndaColors.primary,
                                                borderWidth: 1,
                                                cornerRadius: 6,
                                                padding: 12
                                              }
                                           },
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    title: {
                                        display: true,
                                        text: 'Days',
                                        color: darkMode ? '#fff' : ndaColors.accent
                                    },
                                    grid: { color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' },
                                    ticks: { color: darkMode ? '#fff' : ndaColors.accent }
                                },
                                x: {
                                    grid: { display: false },
                                    ticks: { 
                                        color: darkMode ? '#fff' : ndaColors.accent,
                                        font: { weight: 'bold' }
                                    }
                                }
                            }
                        }} 
                    />
                </Box>
                
                <TableContainer component={Paper} sx={{ mt: 3, borderRadius: '12px' }}>
                    <Table>
                        <TableHead sx={{ bgcolor: alpha(ndaColors.primary, 0.1) }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold', color: 'text.primary' }}>Process Name</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold', color: 'text.primary' }}>Actual Days</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold', color: 'text.primary' }}>Target Days</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold', color: 'text.primary' }}>Variance</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 'bold', color: 'text.primary' }}>Status Trend</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {currentQuarterData.map(({ step, avgDays, targetDays, variance, trend }) => {
                                const status = variance <= 0 ? 'success' : variance <= targetDays * 0.2 ? 'warning' : 'error';
                                return (
                                    <TableRow 
                                        key={step} 
                                        sx={{ '&:hover': { bgcolor: alpha(ndaColors.primary, 0.05) } }}
                                    >
                                        <TableCell>{step}</TableCell>
                                        <TableCell align="right">{avgDays}</TableCell>
                                        <TableCell align="right">{targetDays}</TableCell>
                                        <TableCell 
                                            align="right" 
                                            sx={{ 
                                                color: `${status}.main`,
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            {variance > 0 ? '+' : ''}{variance.toFixed(1)}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Box 
                                                sx={{ cursor: 'pointer' }}
                                                onClick={() => setSelectedStep(step)}
                                            >
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

    const renderSummaryCharts = () => {
    const { kpiStatusSummary, trendSummary, processSummary } = calculations;
    const donutData = {
        labels: ['On Target', 'Near Target', 'Below Target'],
        datasets: [{
            data: [kpiStatusSummary.success, kpiStatusSummary.warning, kpiStatusSummary.error],
            backgroundColor: [ndaColors.success, ndaColors.warning, ndaColors.error],
            borderColor: darkMode ? '#1e1e1e' : '#ffffff',
            borderWidth: 2,
            hoverOffset: 8
        }]
    };

    const performanceData = {
        labels: calculations.kpiSummary.map(kpi => shortKpiNameMap[kpi.kpiId] || kpiNameMap[kpi.kpiId] || kpi.kpiId),
        datasets: [
            {
                label: 'Current',
                data: calculations.kpiSummary.map(kpi => kpi.value),
                backgroundColor: calculations.kpiSummary.map(kpi => alpha(kpi.status === 'success' ? ndaColors.success : kpi.status === 'warning' ? ndaColors.warning : ndaColors.error, 0.8)),
                borderColor: calculations.kpiSummary.map(kpi => kpi.status === 'success' ? ndaColors.success : kpi.status === 'warning' ? ndaColors.warning : ndaColors.error),
                borderWidth: 1,
                borderRadius: 4
            },
            {
                label: 'Target',
                data: calculations.kpiSummary.map(kpi => kpi.kpi.target),
                backgroundColor: alpha(ndaColors.accent, 0.6),
                borderColor: ndaColors.accent,
                borderWidth: 1,
                borderRadius: 4
            }
        ]
    };

    return (
        <Card sx={{ p: 3, mb: 3, borderRadius: '16px', maxWidth: '90vw', mx: 'auto' }}>
            <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', fontWeight: 'bold', color: ndaColors.accent }}>
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
            
            {/* REORGANIZED GRID LAYOUT */}
            <Grid container spacing={4}>
                {/* First row: Bar chart full width */}
                <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom sx={{ color: darkMode ? 'text.primary' : 'text.primary' }}>
                        KPI Performance vs. Target
                    </Typography>
                    <Box sx={{ 
                        height: { xs: 400, md: 450 }, // Reduced height
                        width: '100%', 
                        minHeight: '400px'
                    }}>
                        <Bar
                            data={performanceData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                indexAxis: 'y',
                                interaction: { mode: 'index', intersect: false },
                                scales: {
                                    x: {
                                        beginAtZero: true,
                                        max: 100,
                                        title: {
                                            display: true,
                                            text: 'Value (%)',
                                            color: darkMode ? '#fff' : ndaColors.accent,
                                            font: { size: 14, weight: 'bold' }
                                        },
                                        grid: {
                                            color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'
                                        },
                                        ticks: {
                                            color: darkMode ? '#fff' : ndaColors.accent,
                                            font: { size: 12 }
                                        }
                                    },
                                    y: {
                                        grid: { display: false },
                                        ticks: {
                                            color: darkMode ? '#fff' : ndaColors.accent,
                                            font: { 
                                                size: 11,
                                                weight: 'bold',
                                                lineHeight: 1.2
                                            },
                                            padding: 20,
                                            callback: function(value) {
                                                const label = this.getLabelForValue(value);
                                                if (typeof label === 'string') {
                                                    return wrapLabel(label, 35, 3);
                                                }
                                                return label;
                                            }
                                        }
                                    }
                                },
                                plugins: {
                                    legend: {
                                        position: 'top',
                                        labels: {
                                            color: darkMode ? '#fff' : ndaColors.accent,
                                            font: { size: 12, weight: 'bold' },
                                            padding: 20,
                                            boxWidth: 12,
                                            boxHeight: 12
                                        }
                                    },
                                    tooltip: {
                                        backgroundColor: darkMode ? 'rgba(50, 50, 50, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                                        titleColor: darkMode ? '#fff' : ndaColors.primary,
                                        bodyColor: darkMode ? '#fff' : '#333333',
                                        borderColor: darkMode ? '#444' : ndaColors.primary,
                                        borderWidth: 1,
                                        cornerRadius: 6,
                                        padding: 12
                                    }
                                },
                                animation: { duration: 1500, easing: 'easeOutQuart' },
                                barThickness: 20,
                                maxBarThickness: 22,
                                categoryPercentage: 0.8,
                                barPercentage: 0.8,
                                borderRadius: 4,
                                layout: {
                                    padding: { 
                                        left: 50,
                                        right: 20, 
                                        top: 10, 
                                        bottom: 10 
                                    }
                                }
                            }}
                        />
                    </Box>
                </Grid>

                {/* Second row: Insights and Donut chart side by side */}
                <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom sx={{ color: darkMode ? 'text.primary' : 'text.primary' }}>
                        Performance Insights
                    </Typography>
                    <Fade in={true} timeout={1000}>
                        <div>
                            <Typography variant="body1" color={darkMode ? 'text.primary' : 'text.primary'}>
                                Out of {calculations.kpiSummary.length} KPIs, {kpiStatusSummary.success} ({((kpiStatusSummary.success / calculations.kpiSummary.length) * 100).toFixed(0)}%) are on or above target, {kpiStatusSummary.warning} ({((kpiStatusSummary.warning / calculations.kpiSummary.length) * 100).toFixed(0)}%) are near target, and {kpiStatusSummary.error} ({((kpiStatusSummary.error / calculations.kpiSummary.length) * 100).toFixed(0)}%) are below target.
                            </Typography>
                            <Typography variant="body1" sx={{ mt: 1 }} color={darkMode ? 'text.primary' : 'text.primary'}>
                                Trend Analysis: {trendSummary.up} KPIs improved, {trendSummary.down} declined, and {trendSummary.flat} remained stable.
                            </Typography>
                            <Typography variant="body1" sx={{ mt: 1 }} color={darkMode ? 'text.primary' : 'text.primary'}>
                                Process Steps: {processSummary.onTime} on or below target, {processSummary.near} near target, and {processSummary.delayed} significantly delayed.
                            </Typography>
                        </div>
                    </Fade>
                </Grid>

                <Grid item xs={12} md={6}>
                    <Typography variant="h6" align="center" gutterBottom sx={{ color: darkMode ? 'text.primary' : 'text.primary' }}>
                        KPI Status Summary
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Box sx={{ height: 180, width: 180, position: 'relative', mr: 2 }}>
                            <Doughnut
                                data={donutData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    cutout: '70%',
                                    plugins: {
                                        legend: { display: false },
                                        tooltip: {
                                            backgroundColor: darkMode ? 'rgba(50, 50, 50, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                                            titleColor: darkMode ? '#fff' : ndaColors.primary,
                                            bodyColor: darkMode ? '#fff' : '#333333',
                                            borderColor: darkMode ? '#444' : ndaColors.primary,
                                            borderWidth: 1,
                                            cornerRadius: 6,
                                            padding: 12
                                        }
                                    },
                                    animation: { duration: 1500, easing: 'easeOutQuart' }
                                }}
                            />
                            <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                                <Typography variant="h5" sx={{ fontWeight: 'bold', color: ndaColors.primary }}>
                                    {kpiStatusSummary.success}
                                </Typography>
                                <Typography variant="body2" color={darkMode ? 'text.secondary' : 'text.secondary'}>/ {calculations.kpiSummary.length}</Typography>
                                <Typography variant="caption" display="block" color={darkMode ? 'text.secondary' : 'text.secondary'}>On Target</Typography>
                            </Box>
                        </Box>
                        <Box sx={{ mt: 0 }}>
                            {donutData.labels.map((label, index) => (
                                <Box key={label} sx={{ display: 'flex', alignItems: 'center', my: 0.5 }}>
                                    <Box sx={{ width: 12, height: 12, bgcolor: donutData.datasets[0].backgroundColor[index], borderRadius: '50%', mr: 1 }} />
                                    <Typography variant="body2" color={darkMode ? 'text.primary' : 'text.primary'}>{label} ({donutData.datasets[0].data[index]})</Typography>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                </Grid>
            </Grid>
        </Card>
    );
};

    // --- MAIN RETURN ---
    return (
        <ThemeProvider theme={theme}>
            <Box sx={{ width: '100%', minHeight: '100vh', p: { xs: 1, sm: 2, md: 3 }, bgcolor: 'background.default', maxWidth: '90vw', mx: 'auto' }}>
                {renderHeader()}
                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <Card sx={{ p: 3, borderRadius: '16px', mb: 3, maxWidth: '90vw', minWidth: '1200px', mx: 'auto' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                                {React.cloneElement(processIcons[activeTab], { sx: { color: ndaColors.primary } })}
                                <Typography variant="h5" sx={{ ml: 5, fontWeight: 'bold', color: ndaColors.primary }}>
                                    {activeTab === 'MA' && 'Marketing Authorization KPIs'}
                                    {activeTab === 'CT' && 'Clinical Trials KPIs'}
                                    {activeTab === 'GMP' && 'GMP Compliance KPIs'}
                                </Typography>
                            </Box>
                            <Grid container spacing={3}>
                                {isLoading ? (
                                    Array.from(new Array(8)).map((_, index) => <KpiCardSkeleton key={index} />)
                                ) : (
                                    calculations.kpiSummary.map(({ kpiId, kpi, value, status, trend, isTimeBased }, index) => (
                                        <KpiCard
                                            key={kpiId}
                                            index={index}
                                            kpiId={kpiId}
                                            kpi={kpi}
                                            value={value}
                                            status={status}
                                            trend={trend}
                                            isTimeBased={isTimeBased}
                                            isSelected={selectedKpi === kpiId}
                                            isHighlighted={hoveredKpi === kpiId}
                                            isFiltered={selectedKpi === kpiId && activeDimension !== null}
                                            onClick={() => handleKpiSelect(kpiId)}
                                        />
                                    ))
                                )}
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
};

export default KpiModule;