/**
 * Bar Chart Component
 * Displays data in a bar chart format
 */

import React from 'react';
import { Paper, Typography, Box } from '@mui/material';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import type { ChartOptions } from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface BarChartProps {
  title: string;
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
}

export default function BarChart({
  title,
  data,
  height = 300,
  color = '#1a237e',
}: BarChartProps) {
  const chartData = {
    labels: data.map((d) => d.label),
    datasets: [
      {
        label: title,
        data: data.map((d) => d.value),
        backgroundColor: `${color}cc`,
        borderColor: color,
        borderWidth: 1,
        borderRadius: 6,
        barThickness: 'flex' as const,
        maxBarThickness: 50,
      },
    ],
  };

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
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
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          maxRotation: 45,
          minRotation: 0,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0,0,0,0.05)',
        },
        ticks: {
          stepSize: 1,
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
        <Bar data={chartData} options={options} />
      </Box>
    </Paper>
  );
}
