import 'dotenv/config';
import prisma from '../modules/shared/lib/prisma.js';
import { generateEmbedding } from '../modules/ai/embedding.service.js';

/**
 * Generate Knowledge Embeddings Script
 * 
 * Generates vector embeddings for all existing Places in the database.
 * These embeddings power the RAG system's ability to answer questions.
 * 
 * Usage: npx ts-node src/scripts/generate-embeddings.ts
 * 
 * Note: Run this AFTER seeding places with `npx prisma db seed`
 */
async function main() {
  console.log('>>> Starting Knowledge Embedding Generation...');
  
  // Get all places from database
  const places = await prisma.place.findMany();
  
  if (places.length === 0) {
    console.error('[ERROR] No places found in database. Run `npx prisma db seed` first.');
    process.exit(1);
  }
  
  console.log(`[INFO] Found ${places.length} places to process.`);

  // Cleanup old seed embeddings to prevent duplication on re-run
  console.log('[CLEANUP] Cleaning old seed embeddings...');
  await prisma.knowledgeEmbedding.deleteMany({
    where: { source: 'seed_data' }
  });

  let processed = 0;
  let errors = 0;

  for (const place of places) {
    try {
      // Create searchable text blob from place data
      const embeddingContent = `
        Place: ${place.name}
        Category: ${place.category}
        Classification: ${place.classification}
        City: ${place.city}
        Description: ${place.description}
        Rating: ${place.rating || 'N/A'}
        Popularity: ${place.popularity}
        Types: ${place.activityTypes.join(', ')}
        ${place.localTip ? `Local Tip: ${place.localTip}` : ''}
        ${place.scamWarning ? `Warning: ${place.scamWarning}` : ''}
      `.trim().replace(/\s+/g, ' ');

      const embeddingVector = await generateEmbedding(embeddingContent);
      const vectorStr = `[${embeddingVector.join(',')}]`;

      // Use raw SQL to insert with native vector type
      await prisma.$executeRaw`
        INSERT INTO "KnowledgeEmbedding" (
          "id", "content", "countryCode", "source", "metadata", "embedding", "createdAt", "updatedAt"
        ) VALUES (
          ${`embed_${place.id}`},
          ${embeddingContent},
          'LB',
          'seed_data',
          ${JSON.stringify({
            placeId: place.id,
            name: place.name,
            classification: place.classification,
            category: place.category,
            activityTypes: place.activityTypes
          })}::jsonb,
          ${vectorStr}::vector,
          NOW(),
          NOW()
        )
      `;

      processed++;
      if (processed % 10 === 0) {
        process.stdout.write('.');
      }

    } catch (e: any) {
      console.error(`\n[ERROR] Error processing ${place.name}: ${e.message}`);
      errors++;
    }
  }

  console.log(`\n\n[COMPLETED] Embedding generation completed!`);
  console.log(`[SUCCESS] Processed: ${processed}`);
  console.log(`[ERROR] Errors: ${errors}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
