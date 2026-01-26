import 'dotenv/config';
import { LocationCategory, LocationClassification, PriceLevel, PrismaClient } from "../src/generated/prisma/client";
import { hash } from "argon2";
import fs from "fs";
import path from "path";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });


function mapCategory(cat: string): LocationCategory {
  if (!cat) return LocationCategory.OTHER;
  
  const normalized = cat.toUpperCase().trim();
  
  if (normalized in LocationCategory) {
    return normalized as LocationCategory;
  }
  return LocationCategory.OTHER;
}


function mapClassification(cls: string): LocationClassification {
  const normalized = cls.toUpperCase();
  if (normalized in LocationClassification) {
    return normalized as LocationClassification;
  }
  return LocationClassification.CONDITIONAL;
}


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


  const dataPath = path.join(process.cwd(), "../frontend/data/data_to_seed.json");
  
  if (!fs.existsSync(dataPath)) {
    console.error(`❌ Data file not found at ${dataPath}`);
    console.error("Please ensure data_to_seed.json exists in frontend/data/");
    process.exit(1);
  }

  const rawData = fs.readFileSync(dataPath, "utf-8");
  const places = JSON.parse(rawData);

  console.log(`📦 Found ${places.length} places to seed.`);


  console.log("🧹 Clearing existing places...");
  await prisma.place.deleteMany({});

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (const place of places) {
    try {

      let description = "";
      if (Array.isArray(place.description)) {
        description = place.description.join(", ");
      } else if (typeof place.description === "string") {
        description = place.description;
      }


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

  console.log(`\n\n🎉 Places seeding completed!`);
  console.log(`✅ Processed: ${processed}`);
  console.log(`⚠️ Skipped: ${skipped}`);
  console.log(`❌ Errors: ${errors}`);


  console.log("\n🚀 Seeding users...");
  
  const password = "Password123-";
  const passwordHash = await hash(password);

  const users = [
    {
      email: "user1@example.com",
      username: "user1",
      name: "User One",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=user1",
    },
    {
      email: "user2@example.com",
      username: "user2",
      name: "User Two",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=user2",
    },
    {
      email: "user3@example.com",
      username: "user3",
      name: "User Three",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=user3",
    },
    {
      email: "a@a.co",
      username: "auser",
      name: "Alice",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=alice",
      password: "Pass1-",
    },
    {
      email: "b@b.co",
      username: "buser",
      name: "Bob",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=bob",
      password: "Pass1-",
    },
    {
      email: "c@c.co",
      username: "cuser",
      name: "Charlie",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=charlie",
      password: "Pass1-",
    },
     {
      email: "d@d.co",
      username: "duser",
      name: "David",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=david",
      password: "Pass1-",
    },
     {
      email: "e@e.co",
      username: "euser",
      name: "Eve",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=eve",
      password: "Pass1-",
    },
  ];

  for (const user of users) {
    const userPasswordHash = (user as any).password 
      ? await hash((user as any).password) 
      : passwordHash;
    
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        passwordHash: userPasswordHash,
        name: user.name,
        username: user.username,
        avatarUrl: user.avatarUrl,
        emailVerified: true
      },
      create: {
        email: user.email,
        username: user.username,
        name: user.name,
        passwordHash: userPasswordHash,
        avatarUrl: user.avatarUrl,
        emailVerified: true,
      },
    });
    console.log(`✅ Upserted user: ${user.username}`);
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
