import { Card, CardContent, Typography, Box } from '@mui/material';
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
  '#3b82f6', // Bright Blue
  '#ef4444', // Red
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#6366f1', // Indigo
  '#14b8a6', // Teal
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
        hoverOffset: 4,
      },
    ],
  };

  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 20,
          font: {
            family: "'Inter', sans-serif",
            size: 13,
            weight: 500,
          },
          color: '#64748b',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        padding: 12,
        titleFont: {
          family: "'Inter', sans-serif",
          size: 14,
        },
        bodyFont: {
          family: "'Inter', sans-serif",
          size: 13,
        },
        cornerRadius: 8,
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
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          {title}
        </Typography>
        <Box sx={{ height: height }}>
          <Doughnut data={chartData} options={options} />
        </Box>
      </CardContent>
    </Card>
  );
}
