import { Grid, Typography, Box, CircularProgress, Alert } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import FlightIcon from '@mui/icons-material/Flight';
import PhotoIcon from '@mui/icons-material/Photo';
import GroupIcon from '@mui/icons-material/Group';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import FavoriteIcon from '@mui/icons-material/Favorite';
import KPICard from '../components/Dashboard/KPICard';
import PieChart from '../components/Dashboard/PieChart';
import BarChart from '../components/Dashboard/BarChart';
import { useDashboardStats } from '../hooks/useDashboardStats';

export default function Dashboard() {
  const { overview, itineraryStats, userStats, engagement, isLoading, error } =
    useDashboardStats();

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 400,
        }}
      >
        <CircularProgress size={48} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {error}
      </Alert>
    );
  }

  const userGrowthData =
    userStats?.growth.map((g) => ({
      label: new Date(g.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      value: g.count,
    })) || [];

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome back, here's what's happening today.
        </Typography>
      </Box>

      {/* KPI Cards Row 1 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KPICard
            title="Total Users"
            value={overview?.totalUsers || 0}
            subtitle={`${overview?.newUsersLast7Days || 0} new this week`}
            icon={<PeopleIcon />}
            color="#3b82f6"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KPICard
            title="Itineraries"
            value={overview?.totalItineraries || 0}
            subtitle="Generated trips"
            icon={<FlightIcon />}
            color="#10b981"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KPICard
            title="Posts"
            value={overview?.totalPosts || 0}
            subtitle={`${engagement?.totalLikes || 0} total likes`}
            icon={<PhotoIcon />}
            color="#f59e0b"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KPICard
            title="Friendships"
            value={overview?.totalFriendships || 0}
            subtitle="Connections made"
            icon={<GroupIcon />}
            color="#8b5cf6"
          />
        </Grid>
      </Grid>

      {/* KPI Cards Row 2 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KPICard
            title="Verified Users"
            value={overview?.verifiedUsers || 0}
            subtitle={`${overview?.unverifiedUsers || 0} unverified`}
            icon={<TrendingUpIcon />}
            color="#06b6d4"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KPICard
            title="New (30 Days)"
            value={overview?.newUsersLast30Days || 0}
            subtitle="User signups"
            icon={<PeopleIcon />}
            color="#f43f5e"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KPICard
            title="Total Likes"
            value={engagement?.totalLikes || 0}
            subtitle="Post engagement"
            icon={<FavoriteIcon />}
            color="#ef4444"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KPICard
            title="Comments"
            value={engagement?.totalComments || 0}
            subtitle="User interactions"
            icon={<PhotoIcon />}
            color="#ec4899"
          />
        </Grid>
      </Grid>

      {/* Pie Charts Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <PieChart
            title="Itineraries by Country"
            data={
              itineraryStats?.byCountry.map((c) => ({
                label: c.country,
                value: c.count,
              })) || []
            }
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <PieChart
            title="Popular Travel Styles"
            data={
              itineraryStats?.byTravelStyle.map((s) => ({
                label: s.style,
                value: s.count,
              })) || []
            }
          />
        </Grid>
      </Grid>

      {/* Bar Charts Row */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <BarChart
            title="User Registrations (Last 14 Days)"
            data={userGrowthData}
            color="#3b82f6"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <BarChart
            title="Budget Distribution"
            data={
              itineraryStats?.budgetDistribution.map((b) => ({
                label: b.range,
                value: b.count,
              })) || []
            }
            color="#10b981"
          />
        </Grid>
      </Grid>
    </Box>
  );
}
