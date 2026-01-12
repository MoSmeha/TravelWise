import {
  CrowdLevel,
  LocationCategory,
  LocationClassification,
  PrismaClient,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database (Place model)...");

  // Clear existing places to avoid duplicates if re-seeding
  await prisma.place.deleteMany({});
  
  // Beirut locations
  const beirutLocations = [
    // HIDDEN GEMS
    {
      name: "Tawlet",
      classification: LocationClassification.HIDDEN_GEM,
      category: LocationCategory.RESTAURANT,
      description:
        "Farm-to-table restaurant serving authentic Lebanese home cooking from different regions. Run by local women cooks.",
      costMinUSD: 3.5,
      costMaxUSD: 7,
      bestTimeToVisit: "Lunch time, weekdays",
      latitude: 33.8938,
      longitude: 35.5118,
      address: "Mar Mikhael, Beirut",
      city: "Beirut",
      sources: ["Local recommendations", "Food blogs"],
      activityTypes: ["food", "culture"],
      popularity: 80,
    },
    {
      name: "Horsh Beirut",
      classification: LocationClassification.HIDDEN_GEM,
      category: LocationCategory.PARK,
      description:
        "Large pine forest in the heart of Beirut. Free entry on weekends. Locals use it for jogging and picnics.",
      costMinUSD: 0,
      costMaxUSD: 0,
      bestTimeToVisit: "Early morning or late afternoon",
      latitude: 33.8708,
      longitude: 35.5158,
      address: "Horsh Beirut, Beirut",
      city: "Beirut",
      sources: ["Local knowledge"],
      activityTypes: ["nature", "activity"],
      popularity: 60,
    },
    {
      name: "Souk el Tayeb",
      classification: LocationClassification.HIDDEN_GEM,
      category: LocationCategory.MARKET,
      description:
        "Farmers market with local produce, artisanal products, and street food. Saturday mornings only.",
      costMinUSD: 1,
      costMaxUSD: 6,
      bestTimeToVisit: "Saturday morning, arrive early",
      latitude: 33.8958,
      longitude: 35.5078,
      address: "Trablos Street, Beirut",
      city: "Beirut",
      sources: ["Local recommendations"],
      activityTypes: ["food", "culture", "shopping"],
      popularity: 85,
    },
    {
      name: "Barbar Restaurant",
      classification: LocationClassification.HIDDEN_GEM,
      category: LocationCategory.RESTAURANT,
      description:
        "24/7 shawarma and Lebanese fast food. Where locals go after a night out. Cheap and delicious.",
      costMinUSD: 2,
      costMaxUSD: 5,
      bestTimeToVisit: "Late night (after midnight)",
      latitude: 33.8828,
      longitude: 35.4958,
      address: "Hamra, Beirut",
      city: "Beirut",
      sources: ["Local knowledge"],
      activityTypes: ["food", "nightlife"],
      popularity: 90,
    },
    {
      name: "Corniche Manara",
      classification: LocationClassification.HIDDEN_GEM,
      category: LocationCategory.VIEWPOINT,
      description:
        "Seaside promenade where locals walk, jog, and socialize. Free. Best at sunset.",
      costMinUSD: 0,
      costMaxUSD: 0,
      bestTimeToVisit: "Sunset or early morning",
      latitude: 33.8908,
      longitude: 35.4778,
      address: "Corniche, Beirut",
      city: "Beirut",
      sources: ["Local knowledge"],
      activityTypes: ["nature", "activity"],
      popularity: 95,
    },

    // CONDITIONAL
    {
      name: "Zaitunay Bay",
      classification: LocationClassification.CONDITIONAL,
      category: LocationCategory.RESTAURANT,
      description:
        "Marina with upscale restaurants. Beautiful but overpriced. Good for a drink at sunset, avoid dinner.",
      costMinUSD: 10,
      costMaxUSD: 35,
      bestTimeToVisit: "Sunset for drinks only, avoid peak dining hours",
      latitude: 33.9018,
      longitude: 35.5128,
      address: "Zaitunay Bay, Beirut",
      city: "Beirut",
      localTip: "Walk along Corniche instead, grab food at Barbar",
      sources: ["Reviews", "Local feedback"],
      activityTypes: ["food", "luxury"],
      popularity: 70,
    },
    {
      name: "Pigeon Rocks",
      classification: LocationClassification.CONDITIONAL,
      category: LocationCategory.VIEWPOINT,
      description:
        "Famous rock formations. Free to view but surrounded by overpriced cafes. Just take photos and leave.",
      costMinUSD: 0,
      costMaxUSD: 0,
      bestTimeToVisit: "Early morning before crowds",
      latitude: 33.8938,
      longitude: 35.4698,
      address: "Raouche, Beirut",
      city: "Beirut",
      localTip: "View from Corniche, skip the cafes",
      sources: ["Tourist sites", "Local warnings"],
      activityTypes: ["nature", "sightseeing"],
      popularity: 98,
    },

    // TOURIST TRAPS
    {
      name: "Skybar Beirut",
      classification: LocationClassification.TOURIST_TRAP,
      category: LocationCategory.BAR,
      description:
        "Rooftop bar with pool. Instagram famous but extremely overpriced. Locals avoid it.",
      costMinUSD: 20,
      costMaxUSD: 60,
      bestTimeToVisit: "Never - tourist trap",
      latitude: 33.8998,
      longitude: 35.4888,
      address: "Biel, Beirut",
      city: "Beirut",
      scamWarning: "Overpriced, Instagram hype, locals never go. Try Mar Mikhael instead.",
      sources: ["Reviews", "Local consensus"],
      activityTypes: ["nightlife", "luxury"],
      popularity: 50,
    },
    {
      name: "Downtown Beirut Souks",
      classification: LocationClassification.TOURIST_TRAP,
      category: LocationCategory.SHOPPING,
      description:
        "Reconstructed shopping area. Expensive international brands. Not authentic Lebanese experience.",
      costMinUSD: 25,
      costMaxUSD: 120,
      bestTimeToVisit: "Never - go to real souks instead",
      latitude: 33.8958,
      longitude: 35.5048,
      address: "Downtown, Beirut",
      city: "Beirut",
      localTip: "Souk el Tayeb or Bourj Hammoud markets",
      sources: ["Local feedback"],
      activityTypes: ["shopping"],
      popularity: 40,
    },
  ];

  for (const loc of beirutLocations) {
    await prisma.place.create({
      data: loc,
    });
  }

  console.log(` Created ${beirutLocations.length} locations in Beirut`);

  // Batroun locations (hidden gems)
  const batrounLocations = [
    {
      name: "Pierre & Friends",
      classification: LocationClassification.HIDDEN_GEM,
      category: LocationCategory.BEACH,
      description:
        "Local beach with fresh seafood restaurant. Authentic, affordable, beautiful sea views.",
      costMinUSD: 5,
      costMaxUSD: 10,
      bestTimeToVisit: "Lunch time, weekdays",
      latitude: 34.2563,
      longitude: 35.6593,
      address: "Batroun coast",
      city: "Batroun",
      sources: ["Local recommendations"],
      activityTypes: ["food", "nature", "beach"],
      popularity: 88,
    },
    {
      name: "Batroun Old Souk",
      classification: LocationClassification.HIDDEN_GEM,
      category: LocationCategory.MARKET,
      description:
        "Traditional market with local crafts and food. Not touristy yet.",
      costMinUSD: 1,
      costMaxUSD: 6,
      bestTimeToVisit: "Morning hours",
      latitude: 34.2553,
      longitude: 35.6573,
      address: "Old Town, Batroun",
      city: "Batroun",
      sources: ["Local knowledge"],
      activityTypes: ["culture", "shopping"],
      popularity: 82,
    },
  ];

  for (const loc of batrounLocations) {
    await prisma.place.create({
      data: loc,
    });
  }

  console.log(` Created ${batrounLocations.length} locations in Batroun`);
  
  // Note: Warnings are still useful but assuming they are stored in a way accessible to the new system or generated by AI. 
  // The new system seems to generate them via AI or store them in Warning table.
  // We can keep the Warning table population if the AI polish function or other parts use it.
  // Checking itinerary.service.ts -> it uses AI polish for warnings, doesn't query Warning table directly, 
  // BUT the Warning table exists and might be useful for future or fallback.
  // The 'Country' table also exists. We can keep those.
  
  // Create Lebanon
  const lebanon = await prisma.country.upsert({
    where: { code: "LB" },
    update: {},
    create: {
      name: "Lebanon",
      code: "LB",
      currency: "LBP/USD",
    },
  });

  const warnings = [
    {
      title: "Taxi Overcharging",
      description:
        "Taxis often overcharge tourists. Always agree on price before getting in. Use apps like Uber/Bolt when available.",
      severity: "HIGH",
      category: "TRANSPORT",
      countryId: lebanon.id,
    },
    {
      title: "Currency Confusion",
      description:
        "Lebanon uses both LBP and USD. Exchange rates fluctuate. Vendors may quote in either currency. Always clarify which currency.",
      severity: "CRITICAL",
      category: "PRICING",
      countryId: lebanon.id,
    },
  ];

  for (const warning of warnings) {
    // Check if exists
    // Warning doesn't have unique constraint other than ID, so we might duplicate.
    // For now simple create
    await prisma.warning.create({
      data: warning,
    });
  }
  
  console.log(` Created ${warnings.length} warnings for Lebanon`);

  console.log(" Seeding completed!");
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
