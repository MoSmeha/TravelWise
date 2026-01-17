import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { generateEmbedding } from '../services/embedding.service';

// Load environment variables from backend root
dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('>>> Starting Reddit Data Ingestion...');

  const dataPath = path.join(__dirname, '../../../data/reddit_real_data.json');
  if (!fs.existsSync(dataPath)) {
    console.error(`[ERROR] Data file not found at ${dataPath}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(dataPath, 'utf-8');
  const data = JSON.parse(rawData);

  let totalCount = 0;
  
  // Clean existing knowledge for Lebanon (idempotency)
  console.log('[CLEANUP] Cleaning old Reddit embeddings for LB...');
  await prisma.knowledgeEmbedding.deleteMany({
    where: {
      countryCode: 'LB',
      source: 'reddit'
    }
  });

  for (const category of Object.keys(data)) {
    const items = data[category];
    if (!Array.isArray(items)) continue;

    console.log(`[INFO] Processing category: ${category} (${items.length} items)`);

    for (const item of items) {
      if (!item.text) continue;

      // Construct meaningful text for embedding
      // Include author to give it personality context in RAG
      // Include category
      const content = `[Category: ${category}] Reddit user u/${item.author} says: ${item.text}`;
      
      // Generate embedding
      try {
        const embedding = await generateEmbedding(content);
        const vectorStr = `[${embedding.join(',')}]`;
        
        // Use raw SQL to insert with native vector type
        await prisma.$executeRaw`
          INSERT INTO "KnowledgeEmbedding" (
            "id", "content", "countryCode", "source", "metadata", "embedding", "createdAt", "updatedAt"
          ) VALUES (
            ${`reddit_${Date.now()}_${totalCount}`},
            ${content},
            'LB',
            'reddit',
            ${JSON.stringify({
              ...item,
              originalCategory: category
            })}::jsonb,
            ${vectorStr}::vector,
            NOW(),
            NOW()
          )
        `;
        
        totalCount++;
        process.stdout.write('.');
      } catch (error: any) {
        console.error(`\n[ERROR] Failed to embed item from ${item.author}: ${error.message}`);
      }
    }
    console.log('\n');
  }

  console.log(`[SUCCESS] Ingestion Complete! Processed ${totalCount} items.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
