import {
  CrowdLevel,
  LocationCategory,
  LocationClassification,
  PrismaClient,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

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

  console.log(" Created country: Lebanon");

  // Create cities
  const beirut = await prisma.city.upsert({
    where: { name_countryId: { name: "Beirut", countryId: lebanon.id } },
    update: {},
    create: {
      name: "Beirut",
      latitude: 33.8938,
      longitude: 35.5018,
      countryId: lebanon.id,
    },
  });

  const batroun = await prisma.city.upsert({
    where: { name_countryId: { name: "Batroun", countryId: lebanon.id } },
    update: {},
    create: {
      name: "Batroun",
      latitude: 34.2553,
      longitude: 35.6583,
      countryId: lebanon.id,
    },
  });

  await prisma.city.upsert({
    where: { name_countryId: { name: "Byblos", countryId: lebanon.id } },
    update: {},
    create: {
      name: "Byblos",
      latitude: 34.1208,
      longitude: 35.6481,
      countryId: lebanon.id,
    },
  });

  await prisma.city.upsert({
    where: { name_countryId: { name: "Tripoli", countryId: lebanon.id } },
    update: {},
    create: {
      name: "Tripoli",
      latitude: 34.4367,
      longitude: 35.8497,
      countryId: lebanon.id,
    },
  });

  console.log(" Created cities: Beirut, Batroun, Byblos, Tripoli");

  // Beirut locations
  const beirutLocations = [
    // HIDDEN GEMS
    {
      name: "Tawlet",
      classification: LocationClassification.HIDDEN_GEM,
      category: LocationCategory.RESTAURANT,
      description:
        "Farm-to-table restaurant serving authentic Lebanese home cooking from different regions. Run by local women cooks.",
      costMinLBP: 300000,
      costMaxLBP: 600000,
      costMinUSD: 3.5,
      costMaxUSD: 7,
      crowdLevel: CrowdLevel.MODERATE,
      bestTimeToVisit: "Lunch time, weekdays",
      latitude: 33.8938,
      longitude: 35.5118,
      address: "Mar Mikhael, Beirut",
      confidenceScore: 0.95,
      dataSources: ["Local recommendations", "Food blogs"],
      aiReasoning:
        "Authentic local food, fair pricing, supports local communities",
    },
    {
      name: "Horsh Beirut",
      classification: LocationClassification.HIDDEN_GEM,
      category: LocationCategory.PARK,
      description:
        "Large pine forest in the heart of Beirut. Free entry on weekends. Locals use it for jogging and picnics.",
      costMinLBP: 0,
      costMaxLBP: 0,
      costMinUSD: 0,
      costMaxUSD: 0,
      crowdLevel: CrowdLevel.QUIET,
      bestTimeToVisit: "Early morning or late afternoon",
      latitude: 33.8708,
      longitude: 35.5158,
      address: "Horsh Beirut, Beirut",
      confidenceScore: 0.92,
      dataSources: ["Local knowledge"],
      aiReasoning: "Free, peaceful, used by locals, not touristy",
    },
    {
      name: "Souk el Tayeb",
      classification: LocationClassification.HIDDEN_GEM,
      category: LocationCategory.MARKET,
      description:
        "Farmers market with local produce, artisanal products, and street food. Saturday mornings only.",
      costMinLBP: 100000,
      costMaxLBP: 500000,
      costMinUSD: 1,
      costMaxUSD: 6,
      crowdLevel: CrowdLevel.BUSY,
      bestTimeToVisit: "Saturday morning, arrive early",
      latitude: 33.8958,
      longitude: 35.5078,
      address: "Trablos Street, Beirut",
      confidenceScore: 0.88,
      dataSources: ["Local recommendations"],
      aiReasoning: "Local vendors, fair prices, authentic products",
    },
    {
      name: "Barbar Restaurant",
      classification: LocationClassification.HIDDEN_GEM,
      category: LocationCategory.RESTAURANT,
      description:
        "24/7 shawarma and Lebanese fast food. Where locals go after a night out. Cheap and delicious.",
      costMinLBP: 150000,
      costMaxLBP: 400000,
      costMinUSD: 2,
      costMaxUSD: 5,
      crowdLevel: CrowdLevel.BUSY,
      bestTimeToVisit: "Late night (after midnight)",
      latitude: 33.8828,
      longitude: 35.4958,
      address: "Hamra, Beirut",
      confidenceScore: 0.93,
      dataSources: ["Local knowledge"],
      aiReasoning: "Local favorite, cheap, authentic, no tourist markup",
    },
    {
      name: "Corniche Manara",
      classification: LocationClassification.HIDDEN_GEM,
      category: LocationCategory.VIEWPOINT,
      description:
        "Seaside promenade where locals walk, jog, and socialize. Free. Best at sunset.",
      costMinLBP: 0,
      costMaxLBP: 0,
      costMinUSD: 0,
      costMaxUSD: 0,
      crowdLevel: CrowdLevel.MODERATE,
      bestTimeToVisit: "Sunset or early morning",
      latitude: 33.8908,
      longitude: 35.4778,
      address: "Corniche, Beirut",
      confidenceScore: 0.9,
      dataSources: ["Local knowledge"],
      aiReasoning: "Free, authentic local experience, beautiful views",
    },

    // CONDITIONAL
    {
      name: "Zaitunay Bay",
      classification: LocationClassification.CONDITIONAL,
      category: LocationCategory.RESTAURANT,
      description:
        "Marina with upscale restaurants. Beautiful but overpriced. Good for a drink at sunset, avoid dinner.",
      costMinLBP: 800000,
      costMaxLBP: 3000000,
      costMinUSD: 10,
      costMaxUSD: 35,
      crowdLevel: CrowdLevel.BUSY,
      bestTimeToVisit: "Sunset for drinks only, avoid peak dining hours",
      latitude: 33.9018,
      longitude: 35.5128,
      address: "Zaitunay Bay, Beirut",
      localAlternative: "Walk along Corniche instead, grab food at Barbar",
      confidenceScore: 0.78,
      dataSources: ["Reviews", "Local feedback"],
      aiReasoning: "Scenic but touristy pricing, better alternatives exist",
    },
    {
      name: "Pigeon Rocks",
      classification: LocationClassification.CONDITIONAL,
      category: LocationCategory.VIEWPOINT,
      description:
        "Famous rock formations. Free to view but surrounded by overpriced cafes. Just take photos and leave.",
      costMinLBP: 0,
      costMaxLBP: 0,
      costMinUSD: 0,
      costMaxUSD: 0,
      crowdLevel: CrowdLevel.OVERCROWDED,
      bestTimeToVisit: "Early morning before crowds",
      latitude: 33.8938,
      longitude: 35.4698,
      address: "Raouche, Beirut",
      localAlternative: "View from Corniche, skip the cafes",
      confidenceScore: 0.75,
      dataSources: ["Tourist sites", "Local warnings"],
      aiReasoning: "Natural beauty but tourist trap cafes, view is free",
    },

    // TOURIST TRAPS
    {
      name: "Skybar Beirut",
      classification: LocationClassification.TOURIST_TRAP,
      category: LocationCategory.BAR,
      description:
        "Rooftop bar with pool. Instagram famous but extremely overpriced. Locals avoid it.",
      costMinLBP: 1500000,
      costMaxLBP: 5000000,
      costMinUSD: 20,
      costMaxUSD: 60,
      crowdLevel: CrowdLevel.OVERCROWDED,
      bestTimeToVisit: "Never - tourist trap",
      latitude: 33.8998,
      longitude: 35.4888,
      address: "Biel, Beirut",
      localAlternative:
        "Rooftop bars in Mar Mikhael or Gemmayzeh for 1/3 the price",
      confidenceScore: 0.92,
      dataSources: ["Reviews", "Local consensus"],
      aiReasoning: "Overpriced, Instagram hype, locals never go",
    },
    {
      name: "Downtown Beirut Souks",
      classification: LocationClassification.TOURIST_TRAP,
      category: LocationCategory.SHOPPING,
      description:
        "Reconstructed shopping area. Expensive international brands. Not authentic Lebanese experience.",
      costMinLBP: 2000000,
      costMaxLBP: 10000000,
      costMinUSD: 25,
      costMaxUSD: 120,
      crowdLevel: CrowdLevel.MODERATE,
      bestTimeToVisit: "Never - go to real souks instead",
      latitude: 33.8958,
      longitude: 35.5048,
      address: "Downtown, Beirut",
      localAlternative: "Souk el Tayeb or Bourj Hammoud markets",
      confidenceScore: 0.88,
      dataSources: ["Local feedback"],
      aiReasoning: "Artificial, expensive, not authentic Lebanese culture",
    },
  ];

  for (const loc of beirutLocations) {
    await prisma.location.create({
      data: {
        ...loc,
        cityId: beirut.id,
      },
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
      costMinLBP: 400000,
      costMaxLBP: 800000,
      costMinUSD: 5,
      costMaxUSD: 10,
      crowdLevel: CrowdLevel.MODERATE,
      bestTimeToVisit: "Lunch time, weekdays",
      latitude: 34.2563,
      longitude: 35.6593,
      address: "Batroun coast",
      confidenceScore: 0.9,
      dataSources: ["Local recommendations"],
      aiReasoning: "Local favorite, great food, reasonable prices",
    },
    {
      name: "Batroun Old Souk",
      classification: LocationClassification.HIDDEN_GEM,
      category: LocationCategory.MARKET,
      description:
        "Traditional market with local crafts and food. Not touristy yet.",
      costMinLBP: 100000,
      costMaxLBP: 500000,
      costMinUSD: 1,
      costMaxUSD: 6,
      crowdLevel: CrowdLevel.QUIET,
      bestTimeToVisit: "Morning hours",
      latitude: 34.2553,
      longitude: 35.6573,
      address: "Old Town, Batroun",
      confidenceScore: 0.87,
      dataSources: ["Local knowledge"],
      aiReasoning: "Authentic, local prices, traditional crafts",
    },
  ];

  for (const loc of batrounLocations) {
    await prisma.location.create({
      data: {
        ...loc,
        cityId: batroun.id,
      },
    });
  }

  console.log(` Created ${batrounLocations.length} locations in Batroun`);

  // Warnings for Lebanon
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
    {
      title: "Cash Economy",
      description:
        "Many places only accept cash. ATMs may have withdrawal limits. Carry enough cash but be discreet.",
      severity: "HIGH",
      category: "GENERAL",
      countryId: lebanon.id,
    },
    {
      title: "Nighttime Safety",
      description:
        "Some areas are unsafe at night. Ask locals which neighborhoods to avoid after dark. Stay in well-lit, populated areas.",
      severity: "CRITICAL",
      category: "SAFETY",
      countryId: lebanon.id,
    },
    {
      title: "Restaurant Scams",
      description:
        "Tourist-heavy restaurants may add hidden charges. Always ask for itemized bill. Check prices before ordering.",
      severity: "MEDIUM",
      category: "SCAM",
      countryId: lebanon.id,
    },
    {
      title: "Fake Tour Guides",
      description:
        "Unlicensed guides approach tourists at historical sites. They overcharge and provide poor information. Book through reputable agencies.",
      severity: "MEDIUM",
      category: "SCAM",
      countryId: lebanon.id,
    },
  ];

  for (const warning of warnings) {
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
