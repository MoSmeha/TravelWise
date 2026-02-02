

import prisma from '../../lib/prisma.js';
import {
  IWebhookProvider,
  RawUpcomingTripRecord,
  RawUncheckedItemsRecord,
  RawTripForWeatherCheckRecord,
  CreateWeatherChecklistData,
  CreateWeatherNotificationData,
  NotificationRecord,
} from './webhook.contract.js';

class WebhookPgProvider implements IWebhookProvider {

  async findUpcomingTrips(startDate: Date, endDate: Date): Promise<RawUpcomingTripRecord[]> {
    return prisma.userItinerary.findMany({
      where: {
        flightDate: {
          gte: startDate,
          lte: endDate,
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
  }


  async findTripsWithUncheckedItems(startDate: Date, endDate: Date): Promise<RawUncheckedItemsRecord[]> {
    return prisma.userItinerary.findMany({
      where: {
        flightDate: {
          gte: startDate,
          lte: endDate,
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
  }


  async findTripsForWeatherCheck(startDate: Date, endDate: Date): Promise<RawTripForWeatherCheckRecord[]> {
    return prisma.userItinerary.findMany({
      where: {
        flightDate: {
          gte: startDate,
          lt: endDate,
        },
        notificationsEnabled: true,
      },
      include: {
        user: { select: { id: true, email: true, name: true } },
        days: {
          include: {
            items: {
              include: {
                place: {
                  select: {
                    id: true,
                    name: true,
                    latitude: true,
                    longitude: true,
                    category: true,
                  },
                },
              },
            },
            hotel: {
              select: { name: true, latitude: true, longitude: true },
            },
          },
          orderBy: { dayNumber: 'asc' },
        },
      },
    });
  }


  async createWeatherChecklist(data: CreateWeatherChecklistData): Promise<{ count: number }> {
    const result = await prisma.checklistItem.createMany({
      data: data.items.map(item => ({
        itineraryId: data.itineraryId,
        category: (item.category as any) || 'WEATHER',
        item: item.item,
        reason: item.reason || null,
        source: 'n8n-weather',
        isChecked: false,
      })),
      skipDuplicates: true,
    });

    return { count: result.count };
  }


  async createWeatherNotification(data: CreateWeatherNotificationData): Promise<NotificationRecord> {
    return prisma.notification.create({
      data: {
        userId: data.userId,
        type: 'TRIP_REMINDER',
        title: data.title,
        message: data.message,
        data: { itineraryId: data.itineraryId, weatherSummary: data.weatherSummary },
        read: false,
      },
    });
  }
}

export const webhookProvider = new WebhookPgProvider();

export { WebhookPgProvider };
