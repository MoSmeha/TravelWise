import { Box, Typography, Paper } from '@mui/material';
import ConstructionIcon from '@mui/icons-material/Construction';

export default function Itineraries() {
  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Itineraries
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage generated travel plans
        </Typography>
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: 8,
          borderRadius: 3,
          backgroundColor: 'white',
          border: '1px solid #f1f5f9',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <ConstructionIcon sx={{ fontSize: 64, color: '#94a3b8', mb: 1 }} />
        <Typography variant="h6" fontWeight={600} color="text.primary">
          Itineraries Management Coming Soon
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 400 }}>
          This page will show all generated itineraries with filtering and detailed views.
        </Typography>
      </Paper>
    </Box>
  );
}
