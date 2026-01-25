/**
 * Pie Chart Component
 * Displays data in a doughnut/pie chart format
 */

import React from 'react';
import { Paper, Typography, Box } from '@mui/material';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import type { ChartOptions } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

interface PieChartProps {
  title: string;
  data: { label: string; value: number }[];
  height?: number;
}

const COLORS = [
  '#1a237e',
  '#3949ab',
  '#5c6bc0',
  '#7986cb',
  '#9fa8da',
  '#c5cae9',
  '#303f9f',
  '#3f51b5',
  '#536dfe',
  '#8c9eff',
];

export default function PieChart({ title, data, height = 300 }: PieChartProps) {
  const chartData = {
    labels: data.map((d) => d.label),
    datasets: [
      {
        data: data.map((d) => d.value),
        backgroundColor: COLORS.slice(0, data.length),
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };

  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '60%',
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 15,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: 12,
        titleFont: {
          size: 14,
        },
        bodyFont: {
          size: 13,
        },
        displayColors: true,
        callbacks: {
          label: (context) => {
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((context.raw as number) / total * 100).toFixed(1);
            return ` ${context.label}: ${context.raw} (${percentage}%)`;
          },
        },
      },
    },
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 3,
        background: 'white',
        border: '1px solid #e0e0e0',
        height: '100%',
      }}
    >
      <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
        {title}
      </Typography>
      <Box sx={{ height }}>
        <Doughnut data={chartData} options={options} />
      </Box>
    </Paper>
  );
}
