import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';

interface KPICardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactElement;
  color?: string;
}

export default function KPICard({
  title,
  value,
  subtitle,
  icon,
  color = 'primary.main',
}: KPICardProps) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography color="text.secondary" gutterBottom variant="overline">
              {title}
            </Typography>
            <Typography variant="h4" component="div">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </Typography>
          </Box>
          <Box sx={{ color: color, display: 'flex' }}>
             {React.cloneElement(icon as any, { fontSize: 'large' })}
          </Box>
        </Box>
        
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
