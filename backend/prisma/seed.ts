import { LocationCategory, LocationClassification, PriceLevel, PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

// Helper to map string to LocationCategory enum
// Helper to map string to LocationCategory enum
function mapCategory(cat: string): LocationCategory {
  if (!cat) return LocationCategory.OTHER;
  
  const normalized = cat.toUpperCase().trim();
  
  if (normalized in LocationCategory) {
    return normalized as LocationCategory;
  }
  return LocationCategory.OTHER;
}

// Helper to map string to LocationClassification enum
function mapClassification(cls: string): LocationClassification {
  const normalized = cls.toUpperCase();
  if (normalized in LocationClassification) {
    return normalized as LocationClassification;
  }
  return LocationClassification.CONDITIONAL;
}

// Helper to map string to PriceLevel enum
function mapPriceLevel(level: string | null): PriceLevel | null {
  if (!level) return null;
  const normalized = level.toUpperCase();
  if (normalized in PriceLevel) {
    return normalized as PriceLevel;
  }
  return null;
}

async function main() {
  console.log("🚀 Seeding database from data_to_seed.json...");

  // Load data from JSON file
  const dataPath = path.join(__dirname, "../../frontend/data/data_to_seed.json");
  
  if (!fs.existsSync(dataPath)) {
    console.error(`❌ Data file not found at ${dataPath}`);
    console.error("Please ensure data_to_seed.json exists in frontend/data/");
    process.exit(1);
  }

  const rawData = fs.readFileSync(dataPath, "utf-8");
  const places = JSON.parse(rawData);

  console.log(`📦 Found ${places.length} places to seed.`);

  // Clear existing places to avoid duplicates
  console.log("🧹 Clearing existing places...");
  await prisma.place.deleteMany({});

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (const place of places) {
    try {
      // Handle description array -> string
      let description = "";
      if (Array.isArray(place.description)) {
        description = place.description.join(", ");
      } else if (typeof place.description === "string") {
        description = place.description;
      }

      // Basic validation
      if (!place.name || (!place.latitude && !place.longitude)) {
        console.warn(`⚠️ Skipping ${place.name || "Unnamed"}: missing name or coordinates`);
        skipped++;
        continue;
      }

      await prisma.place.create({
        data: {
          name: place.name,
          classification: mapClassification(place.classification || "CONDITIONAL"),
          category: mapCategory(place.category || "OTHER"),
          description: description,
          sources: place.sources || [],
          sourceUrls: place.sourceUrls || [],
          popularity: place.popularity || 0,
          googlePlaceId: place.googlePlaceId || null,
          rating: place.rating || null,
          totalRatings: place.totalRatings || null,
          latitude: place.latitude,
          longitude: place.longitude,
          address: place.address || null,
          city: place.city || "Beirut",
          country: place.country || "Lebanon",
          imageUrl: place.imageUrl || null,
          imageUrls: place.imageUrls || [],
          activityTypes: place.activityTypes || [],
          bestTimeToVisit: place.bestTimeToVisit || null,
          localTip: place.localTip || null,
          scamWarning: place.scamWarning || null,
          // New fields
          topReviews: place.topReviews || [],
          openingHours: place.openingHours || null,
          priceLevel: mapPriceLevel(place.priceLevel),
          costMinUSD: place.costMinUSD || null,
          costMaxUSD: place.costMaxUSD || null,
        },
      });

      processed++;
      if (processed % 10 === 0) {
        process.stdout.write(".");
      }
    } catch (e: any) {
      console.error(`\n❌ Error processing ${place.name}: ${e.message}`);
      errors++;
    }
  }

  console.log(`\n\n🎉 Seeding completed!`);
  console.log(`✅ Processed: ${processed}`);
  console.log(`⚠️ Skipped: ${skipped}`);
  console.log(`❌ Errors: ${errors}`);
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
