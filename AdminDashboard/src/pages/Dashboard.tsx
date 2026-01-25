/**
 * Dashboard Page
 * Main admin dashboard with KPIs and charts
 */

import React, { useEffect, useState } from 'react';
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
import { api } from '../services/api';

interface OverviewStats {
  totalUsers: number;
  totalItineraries: number;
  totalPosts: number;
  totalFriendships: number;
  newUsersLast7Days: number;
  newUsersLast30Days: number;
  verifiedUsers: number;
  unverifiedUsers: number;
}

interface ItineraryStats {
  byCountry: { country: string; count: number }[];
  byTravelStyle: { style: string; count: number }[];
  budgetDistribution: { range: string; count: number }[];
}

interface UserStats {
  growth: { date: string; count: number }[];
}

interface EngagementStats {
  totalLikes: number;
  totalComments: number;
}

export default function Dashboard() {
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [itineraryStats, setItineraryStats] = useState<ItineraryStats | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [engagement, setEngagement] = useState<EngagementStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [overviewData, itineraryData, userData, engagementData] =
          await Promise.all([
            api.getOverviewStats(),
            api.getItineraryStats(),
            api.getUserStats(14),
            api.getEngagementStats(),
          ]);

        setOverview(overviewData);
        setItineraryStats(itineraryData);
        setUserStats(userData);
        setEngagement(engagementData);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load dashboard data';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

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

  // Format user growth data for chart
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
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 4 }}>
        Dashboard Overview
      </Typography>

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KPICard
            title="Total Users"
            value={overview?.totalUsers || 0}
            subtitle={`${overview?.newUsersLast7Days || 0} new this week`}
            icon={<PeopleIcon />}
            color="#1a237e"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KPICard
            title="Itineraries"
            value={overview?.totalItineraries || 0}
            subtitle="Generated trips"
            icon={<FlightIcon />}
            color="#00897b"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KPICard
            title="Posts"
            value={overview?.totalPosts || 0}
            subtitle={`${engagement?.totalLikes || 0} total likes`}
            icon={<PhotoIcon />}
            color="#f4511e"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KPICard
            title="Friendships"
            value={overview?.totalFriendships || 0}
            subtitle="Connections made"
            icon={<GroupIcon />}
            color="#7b1fa2"
          />
        </Grid>
      </Grid>

      {/* Second Row - More Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KPICard
            title="Verified Users"
            value={overview?.verifiedUsers || 0}
            subtitle={`${overview?.unverifiedUsers || 0} unverified`}
            icon={<TrendingUpIcon />}
            color="#388e3c"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KPICard
            title="New (30 Days)"
            value={overview?.newUsersLast30Days || 0}
            subtitle="User signups"
            icon={<PeopleIcon />}
            color="#1976d2"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KPICard
            title="Total Likes"
            value={engagement?.totalLikes || 0}
            subtitle="Post engagement"
            icon={<FavoriteIcon />}
            color="#c62828"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KPICard
            title="Comments"
            value={engagement?.totalComments || 0}
            subtitle="User interactions"
            icon={<PhotoIcon />}
            color="#5e35b1"
          />
        </Grid>
      </Grid>

      {/* Charts Row */}
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

      {/* More Charts */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <BarChart
            title="User Registrations (Last 14 Days)"
            data={userGrowthData}
            color="#1a237e"
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
            color="#00897b"
          />
        </Grid>
      </Grid>
    </Box>
  );
}
