import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });
const prisma = new PrismaClient();

async function main() {
  const placesCount = await prisma.place.count();
  const embeddingCount = await prisma.knowledgeEmbedding.count({
    where: { source: 'seed_data' }
  });

  console.log('📊 Verification Results:');
  console.log(`- Total Places: ${placesCount}`);
  console.log(`- Seed Embeddings: ${embeddingCount}`);
  
  const sample = await prisma.place.findFirst();
  if (sample) {
    console.log(`\nSample Place: ${sample.name} (${sample.classification})`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
