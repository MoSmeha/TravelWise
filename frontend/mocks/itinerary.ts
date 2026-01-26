
export const MOCK_ITINERARY_RESPONSE = {
  "itinerary": {
    "id": "mock-itinerary-1",
    "numberOfDays": 3,
    "budgetLevel": "MEDIUM",
    "travelStyle": "MIXED"
  },
  "city": {
    "id": "beirut-1",
    "name": "Beirut",
    "latitude": 33.8938,
    "longitude": 35.5018
  },
  "country": {
    "id": "lebanon-1",
    "name": "Lebanon",
    "code": "LB",
    "currency": "LBP/USD"
  },
  "days": [
    {
      "id": "day-1",
      "dayNumber": 1,
      "description": "Day 1 - 3 locations",
      "notes": null,
      "locations": [
        {
          "id": "loc-1",
          "name": "Tawlet",
          "classification": "HIDDEN_GEM",
          "category": "RESTAURANT",
          "description": "Farm-to-table restaurant serving authentic Lebanese home cooking from different regions. Run by local women cooks.",
          "costMinLBP": 300000,
          "costMaxLBP": 600000,
          "costMinUSD": 3.5,
          "costMaxUSD": 7,
          "crowdLevel": "MODERATE",
          "bestTimeToVisit": "Lunch time, weekdays",
          "latitude": 33.8938,
          "longitude": 35.5118,
          "address": "Mar Mikhael, Beirut",
          "localAlternative": null,
          "confidenceScore": 0.95,
          "dataSources": ["Local recommendations", "Food blogs"],
          "aiReasoning": "Authentic local food, fair pricing, supports local communities"
        },
        {
          "id": "loc-2",
          "name": "Horsh Beirut",
          "classification": "HIDDEN_GEM",
          "category": "PARK",
          "description": "Large pine forest in the heart of Beirut. Free entry on weekends. Locals use it for jogging and picnics.",
          "costMinLBP": 0,
          "costMaxLBP": 0,
          "costMinUSD": 0,
          "costMaxUSD": 0,
          "crowdLevel": "QUIET",
          "bestTimeToVisit": "Early morning or late afternoon",
          "latitude": 33.8708,
          "longitude": 35.5158,
          "address": "Horsh Beirut, Beirut",
          "localAlternative": null,
          "confidenceScore": 0.92,
          "dataSources": ["Local knowledge"],
          "aiReasoning": "Free, peaceful, used by locals, not touristy"
        },
        {
          "id": "loc-3",
          "name": "Barbar Restaurant",
          "classification": "HIDDEN_GEM",
          "category": "RESTAURANT",
          "description": "24/7 shawarma and Lebanese fast food. Where locals go after a night out. Cheap and delicious.",
          "costMinLBP": 150000,
          "costMaxLBP": 400000,
          "costMinUSD": 2,
          "costMaxUSD": 5,
          "crowdLevel": "BUSY",
          "bestTimeToVisit": "Late night (after midnight)",
          "latitude": 33.8828,
          "longitude": 35.4958,
          "address": "Hamra, Beirut",
          "localAlternative": null,
          "confidenceScore": 0.93,
          "dataSources": ["Local knowledge"],
          "aiReasoning": "Local favorite, cheap, authentic, no tourist markup"
        }
      ]
    },
    {
      "id": "day-2",
      "dayNumber": 2,
      "description": "Day 2 - 3 locations",
      "notes": null,
      "locations": [
        {
          "id": "loc-4",
          "name": "Souk el Tayeb",
          "classification": "HIDDEN_GEM",
          "category": "MARKET",
          "description": "Farmers market with local produce, artisanal products, and street food. Saturday mornings only.",
          "costMinLBP": 100000,
          "costMaxLBP": 500000,
          "costMinUSD": 1,
          "costMaxUSD": 6,
          "crowdLevel": "BUSY",
          "bestTimeToVisit": "Saturday morning, arrive early",
          "latitude": 33.8958,
          "longitude": 35.5078,
          "address": "Trablos Street, Beirut",
          "localAlternative": null,
          "confidenceScore": 0.88,
          "dataSources": ["Local recommendations"],
          "aiReasoning": "Local vendors, fair prices, authentic products"
        },
        {
          "id": "loc-5",
          "name": "Corniche Manara",
          "classification": "HIDDEN_GEM",
          "category": "VIEWPOINT",
          "description": "Seaside promenade where locals walk, jog, and socialize. Free. Best at sunset.",
          "costMinLBP": 0,
          "costMaxLBP": 0,
          "costMinUSD": 0,
          "costMaxUSD": 0,
          "crowdLevel": "MODERATE",
          "bestTimeToVisit": "Sunset or early morning",
          "latitude": 33.8908,
          "longitude": 35.4778,
          "address": "Corniche, Beirut",
          "localAlternative": null,
          "confidenceScore": 0.90,
          "dataSources": ["Local knowledge"],
          "aiReasoning": "Free, authentic local experience, beautiful views"
        },
        {
          "id": "loc-6",
          "name": "Zaitunay Bay",
          "classification": "CONDITIONAL",
          "category": "RESTAURANT",
          "description": "Marina with upscale restaurants. Beautiful but overpriced. Good for a drink at sunset, avoid dinner.",
          "costMinLBP": 800000,
          "costMaxLBP": 3000000,
          "costMinUSD": 10,
          "costMaxUSD": 35,
          "crowdLevel": "BUSY",
          "bestTimeToVisit": "Sunset for drinks only, avoid peak dining hours",
          "latitude": 33.9018,
          "longitude": 35.5128,
          "address": "Zaitunay Bay, Beirut",
          "localAlternative": "Walk along Corniche instead, grab food at Barbar",
          "confidenceScore": 0.78,
          "dataSources": ["Reviews", "Local feedback"],
          "aiReasoning": "Scenic but touristy pricing, better alternatives exist"
        }
      ]
    },
    {
      "id": "day-3",
      "dayNumber": 3,
      "description": "Day 3 - 2 locations",
      "notes": null,
      "locations": [
        {
          "id": "loc-7",
          "name": "Pigeon Rocks",
          "classification": "CONDITIONAL",
          "category": "VIEWPOINT",
          "description": "Famous rock formations. Free to view but surrounded by overpriced cafes. Just take photos and leave.",
          "costMinLBP": 0,
          "costMaxLBP": 0,
          "costMinUSD": 0,
          "costMaxUSD": 0,
          "crowdLevel": "OVERCROWDED",
          "bestTimeToVisit": "Early morning before crowds",
          "latitude": 33.8938,
          "longitude": 35.4698,
          "address": "Raouche, Beirut",
          "localAlternative": "View from Corniche, skip the cafes",
          "confidenceScore": 0.75,
          "dataSources": ["Tourist sites", "Local warnings"],
          "aiReasoning": "Natural beauty but tourist trap cafes, view is free"
        },
        {
          "id": "loc-8",
          "name": "Downtown Beirut Souks",
          "classification": "TOURIST_TRAP",
          "category": "SHOPPING",
          "description": "Reconstructed shopping area. Expensive international brands. Not authentic Lebanese experience.",
          "costMinLBP": 2000000,
          "costMaxLBP": 10000000,
          "costMinUSD": 25,
          "costMaxUSD": 120,
          "crowdLevel": "MODERATE",
          "bestTimeToVisit": "Never - go to real souks instead",
          "latitude": 33.8958,
          "longitude": 35.5048,
          "address": "Downtown, Beirut",
          "localAlternative": "Souk el Tayeb or Bourj Hammoud markets",
          "confidenceScore": 0.88,
          "dataSources": ["Local feedback"],
          "aiReasoning": "Artificial, expensive, not authentic Lebanese culture"
        }
      ]
    }
  ],
  "warnings": [
    {
      "id": "warn-1",
      "title": "Taxi Overcharging",
      "description": "Taxis often overcharge tourists. Always agree on price before getting in. Use apps like Uber/Bolt when available.",
      "severity": "HIGH",
      "category": "TRANSPORT",
      "location": null
    },
    {
      "id": "warn-2",
      "title": "Currency Confusion",
      "description": "Lebanon uses both LBP and USD. Exchange rates fluctuate. Vendors may quote in either currency. Always clarify which currency.",
      "severity": "CRITICAL",
      "category": "PRICING",
      "location": null
    },
    {
      "id": "warn-3",
      "title": "Cash Economy",
      "description": "Many places only accept cash. ATMs may have withdrawal limits. Carry enough cash but be discreet.",
      "severity": "HIGH",
      "category": "GENERAL",
      "location": null
    }
  ]
};
