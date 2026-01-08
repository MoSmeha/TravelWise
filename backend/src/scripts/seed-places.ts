import { LocationCategory, LocationClassification, PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { generateEmbedding } from '../services/embedding.service';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();

// Helper to map string to enum (safe fallback)
function mapCategory(cat: string): LocationCategory {
  const normalized = cat.toUpperCase();
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

function mapPriceLevel(pl: string | number | null): number | null {
  if (pl === null) return null;
  if (typeof pl === 'number') return pl;
  
  const normalized = String(pl).toUpperCase();
  if (normalized === 'PRICE_LEVEL_INEXPENSIVE') return 1;
  if (normalized === 'PRICE_LEVEL_MODERATE') return 2;
  if (normalized === 'PRICE_LEVEL_EXPENSIVE') return 3;
  if (normalized === 'PRICE_LEVEL_VERY_EXPENSIVE') return 4;
  
  // Try parsing int
  const parsed = parseInt(String(pl));
  return isNaN(parsed) ? null : parsed;
}

async function main() {
  console.log('🚀 Starting TravelWise Data Seeding...');
  
  const dataPath = path.join(__dirname, '../../../data/data_to_seed.json');
  if (!fs.existsSync(dataPath)) {
    console.error(`❌ Data file not found at ${dataPath}`);
    process.exit(1);
  }
  
  console.log('📖 Reading data file...');
  const rawData = fs.readFileSync(dataPath, 'utf-8');
  const places = JSON.parse(rawData);
  
  console.log(`📦 Found ${places.length} places to process.`);

  // Cleanup old seed embedding data to prevent duplication on re-run
  console.log('🧹 Cleaning old seed embeddings...');
  await prisma.knowledgeEmbedding.deleteMany({
    where: {
      source: 'seed_data'
    }
  });

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (const place of places) {
    try {
      // 1. Prepare data
      // Handle description array -> string
      let description = '';
      if (Array.isArray(place.description)) {
        description = place.description.join(', ');
      } else if (typeof place.description === 'string') {
        description = place.description;
      }

      // Basic validation
      if (!place.name || (!place.latitude && !place.longitude)) {
        console.warn(`⚠️ Skipping ${place.name || 'Unnamed'}: missing name or coordinates`);
        skipped++;
        continue;
      }

      const placeData = {
        name: place.name,
        classification: mapClassification(place.classification || 'CONDITIONAL'),
        category: mapCategory(place.category || 'OTHER'),
        description: description,
        sources: place.sources || [],
        sourceUrls: place.sourceUrls || [],
        popularity: place.popularity || 0,
        googlePlaceId: place.googlePlaceId || null,
        rating: place.rating || null,
        totalRatings: place.totalRatings || null,
        priceLevel: mapPriceLevel(place.priceLevel), // Use helper
        latitude: place.latitude,
        longitude: place.longitude,
        address: place.address || null,
        city: place.city || 'Beirut', // Default if empty
        country: place.country || 'Lebanon',
        imageUrl: place.imageUrl || null,
        imageUrls: place.imageUrls || [],
        activityTypes: place.activityTypes || [],
        bestTimeToVisit: place.bestTimeToVisit || null,
        localTip: place.localTip || null,
        scamWarning: place.scamWarning || null,
      };

      let dbPlace;

      // 2. Upsert Place
      if (placeData.googlePlaceId) {
        dbPlace = await prisma.place.upsert({
          where: { googlePlaceId: placeData.googlePlaceId },
          update: placeData,
          create: placeData,
        });
      } else {
        // Find by name for rudimentary distinctness
        const existing = await prisma.place.findFirst({ 
            where: { name: placeData.name } 
        });
        
        if (existing) {
          dbPlace = await prisma.place.update({
            where: { id: existing.id },
            data: placeData,
          });
        } else {
          dbPlace = await prisma.place.create({
            data: placeData,
          });
        }
      }

      // 3. Create RAG Embedding
      // Content strategy: join important fields to make a searchable text blob
      const embeddingContent = `
        Place: ${dbPlace.name}
        Category: ${dbPlace.category}
        City: ${dbPlace.city}
        Description: ${dbPlace.description}
        Rating: ${dbPlace.rating || 'N/A'}
        Popularity: ${dbPlace.popularity}
        Types: ${dbPlace.activityTypes.join(', ')}
      `.trim().replace(/\s+/g, ' ');

      const embeddingVector = await generateEmbedding(embeddingContent);

      await prisma.knowledgeEmbedding.create({
        data: {
          content: embeddingContent,
          countryCode: 'LB', // Assuming Lebanon context based on data
          source: 'seed_data',
          metadata: {
            placeId: dbPlace.id,
            name: dbPlace.name,
            classification: dbPlace.classification,
            category: dbPlace.category,
            activityTypes: dbPlace.activityTypes
          },
          embeddingJson: embeddingVector
        }
      });

      processed++;
      if (processed % 10 === 0) {
        process.stdout.write('.');
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
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
