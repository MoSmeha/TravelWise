import express from 'express';
import prisma from '../lib/prisma.js';

const router = express.Router();

// WEBHOOK ROUTES FOR n8n INTEGRATION
// Endpoints for automation workflows

// GET /api/webhooks/upcoming-trips
// Returns itineraries with flights in the next 1-2 days
router.get('/upcoming-trips', async (req, res) => {
  try {
    const { hoursAhead = '48' } = req.query;
    
    const now = new Date();
    const cutoff = new Date(now.getTime() + parseInt(hoursAhead as string) * 60 * 60 * 1000);
    
    const upcomingTrips = await prisma.userItinerary.findMany({
      where: {
        flightDate: {
          gte: now,
          lte: cutoff,
        },
        notificationsEnabled: true,
      },
      include: {
        days: {
          include: {
            items: {
              include: {
                place: true,
              },
            },
          },
          orderBy: { dayNumber: 'asc' },
        },
        checklist: {
          where: { isChecked: false },
        },
      },
    });
    
    res.json({
      data: upcomingTrips.map(trip => {
        // Get first day items
        const firstDay = trip.days.find(d => d.dayNumber === 1);
        const firstDayPlaces = firstDay?.items.map(i => i.place.name) || [];
        
        return {
          id: trip.id,
          country: trip.country,
          flightDate: trip.flightDate,
          hoursUntilFlight: trip.flightDate 
            ? Math.round((trip.flightDate.getTime() - now.getTime()) / (1000 * 60 * 60))
            : null,
          numberOfDays: trip.numberOfDays,
          travelStyles: trip.travelStyles,
          uncheckedItemsCount: trip.checklist.length,
          firstDayPlaces,
        };
      }),
      count: upcomingTrips.length,
    });
  } catch (error) {
    console.error('Error fetching upcoming trips:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming trips' });
  }
});

// GET /api/webhooks/unchecked-items
// Returns itineraries with unchecked checklist items, flight in <24 hours
router.get('/unchecked-items', async (_req: express.Request, res: express.Response) => {
  try {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    const tripsWithUncheckedItems = await prisma.userItinerary.findMany({
      where: {
        flightDate: {
          gte: now,
          lte: tomorrow,
        },
        notificationsEnabled: true,
        checklist: {
          some: { isChecked: false },
        },
      },
      include: {
        checklist: {
          where: { isChecked: false },
          orderBy: { category: 'asc' },
        },
      },
    });
    
    res.json({
      data: tripsWithUncheckedItems.map(trip => ({
        id: trip.id,
        country: trip.country,
        flightDate: trip.flightDate,
        hoursUntilFlight: trip.flightDate 
          ? Math.round((trip.flightDate.getTime() - now.getTime()) / (1000 * 60 * 60))
          : null,
        uncheckedItems: trip.checklist.map(item => ({
          category: item.category,
          item: item.item,
          reason: item.reason,
        })),
        uncheckedCount: trip.checklist.length,
      })),
      count: tripsWithUncheckedItems.length,
    });
  } catch (error) {
    console.error('Error fetching unchecked items:', error);
    res.status(500).json({ error: 'Failed to fetch unchecked items' });
  }
});

// GET /api/webhooks/health
// Health check for n8n to verify connectivity
router.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'TravelWise Webhooks',
  });
});

export default router;
