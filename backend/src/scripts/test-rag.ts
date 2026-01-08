import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { askAboutItinerary } from '../services/rag-retrieval.service';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Testing RAG System with Global Knowledge...');
  
  // Test 1: Reddit Data Query (NomNom Chicken mentioned in dataset)
  console.log('\n❓ Test 1: "Where can I find Korean fried chicken?" (Should use Reddit data)');
  const res1 = await askAboutItinerary("Where can I find Korean fried chicken?", "dummy-id");
  console.log(`📝 Answer:\n${res1.answer}`);
  console.log(`🔍 Sources: ${res1.sources.join(', ')}`);
  
  // Test 2: General Knowledge Query (No embedding likely)
  console.log('\n❓ Test 2: "What is the currency of Lebanon?" (Should use General Knowledge)');
  const res2 = await askAboutItinerary("What is the currency of Lebanon?", "dummy-id");
  console.log(`📝 Answer:\n${res2.answer}`);
  console.log(`🔍 Sources: ${res2.sources.join(', ')}`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
