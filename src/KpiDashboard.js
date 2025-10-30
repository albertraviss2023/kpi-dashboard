import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Card, Grid, Paper, useTheme,
  IconButton, Divider, Chip
} from '@mui/material';
import {
  BarChart, Timeline, FilterAlt, FilterAltOff,
  Brightness4, Brightness7
} from '@mui/icons-material';
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip as ChartTooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  BarElement, CategoryScale, LinearScale,
  ChartTooltip, Legend, ArcElement
);

const KpiDashboard = () => {
  const [darkMode, setDarkMode] = useState(false);
  const theme = useTheme();

  // Color palette
  const colors = {
    primary: '#2E7D32',
    secondary: '#FFB300',
    success: '#66BB6A',
    warning: '#FFB300',
    error: '#DC143C',
    info: '#1976D2'
  };

  // Sample data - replace with your actual data
  const kpiData = [
    { id: 'kpi1', name: 'New CT Apps On Time', value: 85, target: 90, status: 'warning' },
    { id: 'kpi2', name: 'CT Amendments On Time', value: 92, target: 90, status: 'success' },
    { id: 'kpi3', name: 'GCP Inspections On Time', value: 78, target: 85, status: 'warning' },
    { id: 'kpi4', name: 'Safety Reports On Time', value: 95, target: 90, status: 'success' },
    { id: 'kpi5', name: 'GCP Compliance', value: 88, target: 90, status: 'warning' },
    { id: 'kpi6', name: 'Registry Submissions', value: 82, target: 85, status: 'warning' },
    { id: 'kpi7', name: 'CAPA Evaluations', value: 91, target: 90, status: 'success' },
    { id: 'kpi8', name: 'Avg CT Turnaround', value: 42, target: 45, status: 'success' }
  ];

  const processData = [
    { step: 'Application Review', actual: 3, target: 3, status: 'success' },
    { step: 'Admin Screening', actual: 5, target: 3, status: 'warning' },
    { step: 'Scientific Review', actual: 25, target: 20, status: 'error' },
    { step: 'GCP Assessment', actual: 40, target: 40, status: 'success' },
    { step: 'Decision Making', actual: 3, target: 3, status: 'success' }
  ];

  // Chart data preparation
  const performanceData = {
    labels: kpiData.map(kpi => kpi.name),
    datasets: [
      {
        label: 'Current',
        data: kpiData.map(kpi => kpi.value),
        backgroundColor: kpiData.map(kpi => 
          kpi.status === 'success' ? colors.success :
          kpi.status === 'warning' ? colors.warning : colors.error
        ),
        borderColor: kpiData.map(kpi => 
          kpi.status === 'success' ? colors.success :
          kpi.status === 'warning' ? colors.warning : colors.error
        ),
        borderWidth: 1,
        borderRadius: 4
      },
      {
        label: 'Target',
        data: kpiData.map(kpi => kpi.target),
        backgroundColor: `${colors.info}80`,
        borderColor: colors.info,
        borderWidth: 1,
        borderRadius: 4
      }
    ]
  };

  const statusData = {
    labels: ['On Target', 'Near Target', 'Below Target'],
    datasets: [{
      data: [
        kpiData.filter(kpi => kpi.status === 'success').length,
        kpiData.filter(kpi => kpi.status === 'warning').length,
        kpiData.filter(kpi => kpi.status === 'error').length
      ],
      backgroundColor: [colors.success, colors.warning, colors.error],
      borderColor: darkMode ? '#1e1e1e' : '#ffffff',
      borderWidth: 2
    }]
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    indexAxis: 'y',
    scales: {
      x: { 
        beginAtZero: true,
        max: 100,
        grid: { color: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' },
        ticks: { color: darkMode ? '#fff' : colors.primary }
      },
      y: {
        grid: { display: false },
        ticks: { color: darkMode ? '#fff' : colors.primary }
      }
    },
    plugins: {
      legend: { 
        position: 'top',
        labels: { color: darkMode ? '#fff' : colors.primary }
      },
      tooltip: {
        backgroundColor: darkMode ? '#424242' : '#ffffff',
        titleColor: darkMode ? '#fff' : colors.primary,
        bodyColor: darkMode ? '#fff' : colors.primary
      }
    },
    barPercentage: 0.9,
    categoryPercentage: 0.8
  };

  const doughnutOptions = {
    responsive: true,
    cutout: '70%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: darkMode ? '#424242' : '#ffffff',
        titleColor: darkMode ? '#fff' : colors.primary,
        bodyColor: darkMode ? '#fff' : colors.primary
      }
    }
  };

  return (
    <Box sx={{ p: 3, backgroundColor: darkMode ? '#121212' : '#f5f5f5' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold" color="primary">
          Clinical Trials Performance Dashboard
        </Typography>
        <IconButton onClick={() => setDarkMode(!darkMode)} color="inherit">
          {darkMode ? <Brightness7 /> : <Brightness4 />}
        </IconButton>
      </Box>

      {/* Overall Performance Card */}
      <Card sx={{ 
        p: 3, 
        mb: 3, 
        borderRadius: '16px',
        backgroundColor: darkMode ? '#1e1e1e' : '#ffffff',
        boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
      }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3, color: colors.primary }}>
          Overall Performance (Q2 2025)
        </Typography>

        <Grid container spacing={3}>
          {/* Main Performance Chart */}
          <Grid item xs={12} md={8}>
            <Typography variant="h6" gutterBottom sx={{ color: darkMode ? '#fff' : colors.primary }}>
              KPI Performance vs. Target
            </Typography>
            <Box sx={{ height: 400 }}>
              <Bar data={performanceData} options={chartOptions} />
            </Box>
          </Grid>

          {/* Status Summary */}
          <Grid item xs={12} md={4}>
            <Typography variant="h6" gutterBottom align="center" sx={{ color: darkMode ? '#fff' : colors.primary }}>
              KPI Status Summary
            </Typography>
            <Box sx={{ height: 200, position: 'relative', mb: 2 }}>
              <Doughnut data={statusData} options={doughnutOptions} />
              <Box sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center'
              }}>
                <Typography variant="h4" fontWeight="bold" color={colors.primary}>
                  {kpiData.filter(kpi => kpi.status === 'success').length}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  / {kpiData.length} On Target
                </Typography>
              </Box>
            </Box>

            {/* Status Legend */}
            <Box sx={{ mt: 2 }}>
              {statusData.labels.map((label, index) => (
                <Box key={label} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Box sx={{
                    width: 14,
                    height: 14,
                    backgroundColor: statusData.datasets[0].backgroundColor[index],
                    borderRadius: '50%',
                    mr: 1.5
                  }} />
                  <Typography variant="body2" sx={{ color: darkMode ? '#fff' : colors.primary }}>
                    {label} ({statusData.datasets[0].data[index]})
                  </Typography>
                </Box>
              ))}
            </Box>
          </Grid>
        </Grid>

       {/* Performance Insights */}
<Box
  sx={{
    mt: 3,
    p: 2,
    backgroundColor: darkMode ? '#2a2a2a' : '#f9f9f9',
    borderRadius: '8px'
  }}
>
  <Typography
    variant="h6"
    gutterBottom
    sx={{ color: darkMode ? '#fff' : colors.primary }}
  >
    Performance Insights
  </Typography>

  {(() => {
    const total = kpiData.length;
    const successCount = kpiData.filter(kpi => kpi.status === 'success').length;
    const warningCount = kpiData.filter(kpi => kpi.status === 'warning').length;
    const errorCount = kpiData.filter(kpi => kpi.status === 'error').length;
    const successPct = Math.round((successCount / total) * 100);

    return (
      <>
        <Typography
          variant="body1"
          sx={{ color: darkMode ? '#e0e0e0' : '#555', mb: 1 }}
        >
          {successCount} KPIs ({successPct}%) are meeting or exceeding targets.
        </Typography>

        <Typography
          variant="body1"
          sx={{ color: darkMode ? '#e0e0e0' : '#555', mb: 1 }}
        >
          {warningCount} KPIs need attention (within 10% of target).
        </Typography>

        <Typography
          variant="body1"
          sx={{ color: darkMode ? '#e0e0e0' : '#555' }}
        >
          {errorCount > 0
            ? `${errorCount} KPIs require immediate action.`
            : 'All KPIs are at or near target levels.'}
        </Typography>
      </>
    );
  })()}
</Box>


        {/* Process Performance */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ 
            display: 'flex', 
            alignItems: 'center',
            color: darkMode ? '#fff' : colors.primary
          }}>
            <Timeline sx={{ mr: 1 }} /> Process Step Performance
          </Typography>
          
          <Paper sx={{ 
            p: 2, 
            backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
            borderRadius: '12px'
          }}>
            <Grid container spacing={2} sx={{ mb: 1 }}>
              <Grid item xs={5}>
                <Typography variant="subtitle2" fontWeight="bold">Process Step</Typography>
              </Grid>
              <Grid item xs={3}>
                <Typography variant="subtitle2" fontWeight="bold" align="right">Actual Days</Typography>
              </Grid>
              <Grid item xs={2}>
                <Typography variant="subtitle2" fontWeight="bold" align="right">Target</Typography>
              </Grid>
              <Grid item xs={2}>
                <Typography variant="subtitle2" fontWeight="bold" align="center">Status</Typography>
              </Grid>
            </Grid>

            <Divider sx={{ my: 1 }} />

            {processData.map((step, index) => (
              <React.Fragment key={index}>
                <Grid container spacing={2} alignItems="center" sx={{ py: 1 }}>
                  <Grid item xs={5}>
                    <Typography variant="body2">{step.step}</Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="body2" align="right">{step.actual}</Typography>
                  </Grid>
                  <Grid item xs={2}>
                    <Typography variant="body2" align="right">{step.target}</Typography>
                  </Grid>
                  <Grid item xs={2}>
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                      <Tooltip title={step.status === 'success' ? 'On Target' : step.status === 'warning' ? 'Near Target' : 'Below Target'}>
                        <Box sx={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          backgroundColor: step.status === 'success' ? colors.success :
                                          step.status === 'warning' ? colors.warning : colors.error
                        }} />
                      </Tooltip>
                    </Box>
                  </Grid>
                </Grid>
                {index < processData.length - 1 && <Divider sx={{ my: 1 }} />}
              </React.Fragment>
            ))}
          </Paper>
        </Box>
      </Card>
    </Box>
  );
};

export default KpiDashboard;