import { Card, CardContent, Typography, Box } from '@mui/material';
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
  color = '#004e89',
}: BarChartProps) {
  const chartData = {
    labels: data.map((d) => d.label),
    datasets: [
      {
        label: title,
        data: data.map((d) => d.value),
        backgroundColor: color,
        borderRadius: 8,
        borderSkipped: false,
        barThickness: 'flex' as const,
        maxBarThickness: 40,
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
        displayColors: false,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          maxRotation: 0,
          font: {
            family: "'Inter', sans-serif",
            size: 12,
          },
          color: '#64748b',
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: '#f1f5f9',
        },
        ticks: {
          font: {
            family: "'Inter', sans-serif",
            size: 12,
          },
          color: '#64748b',
          padding: 8,
        },
        border: {
          display: false,
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
          <Bar data={chartData} options={options} />
        </Box>
      </CardContent>
    </Card>
  );
}
