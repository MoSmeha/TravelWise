/**
 * Itineraries Page
 * Admin view of all itineraries
 */

import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import ConstructionIcon from '@mui/icons-material/Construction';

export default function Itineraries() {
  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 4 }}>
        Itineraries
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
          Itineraries Management Coming Soon
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          This page will show all generated itineraries with filtering and detailed views.
        </Typography>
      </Paper>
    </Box>
  );
}
