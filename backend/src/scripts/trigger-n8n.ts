
import prisma from '../lib/prisma.js';

const EMAIL = 'mohamad.smeha.cs@gmail.com';

async function main() {
  console.log(`Looking for user: ${EMAIL}...`);
  const user = await prisma.user.findUnique({ where: { email: EMAIL } });
  
  if (!user) {
    console.error(`User ${EMAIL} not found! Please create the user first.`);
    process.exit(1);
  }

  console.log(`Found user ID: ${user.id}`);

  const latestItinerary = await prisma.userItinerary.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });

  if (!latestItinerary) {
    console.error('No itinerary found for this user! Please create an itinerary first.');
    process.exit(1);
  }

  console.log(`Found itinerary: ${latestItinerary.id} (Current Flight Date: ${latestItinerary.flightDate?.toISOString() || 'None'})`);

  // Calculate target date: 2 days from now, set to noon to be safely within the "00:00 to 00:00+1" window
  const now = new Date();
  const targetDate = new Date(now);
  targetDate.setDate(now.getDate() + 2);
  targetDate.setHours(12, 0, 0, 0);

  console.log(`Updating Flight Date to: ${targetDate.toISOString()} to satisfy n8n pickup window...`);

  await prisma.userItinerary.update({
    where: { id: latestItinerary.id },
    data: {
      flightDate: targetDate,
      notificationsEnabled: true
    }
  });

  console.log('Itinerary updated successfully!');
  console.log('The n8n "Weather Check" workflow should now pick up this trip upon next execution.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
