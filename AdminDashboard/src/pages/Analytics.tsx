/**
 * Analytics Page
 * Detailed analytics and charts
 */

import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import ConstructionIcon from '@mui/icons-material/Construction';

export default function Analytics() {
  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 4 }}>
        Analytics
      </Typography>

      <Paper
        elevation={0}
        sx={{
          p: 6,
          borderRadius: 3,
          border: '1px solid #e0e0e0',
          textAlign: 'center',
        }}
      >
        <ConstructionIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          Advanced Analytics Coming Soon
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          This page will show detailed analytics, trends, and exportable reports.
        </Typography>
      </Paper>
    </Box>
  );
}
