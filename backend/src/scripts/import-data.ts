#!/usr/bin/env npx ts-node

/**
 * Data Import Script
 * 
 * Imports pre-scraped data from JSON files into the database.
 * 
 * Usage:
 *   npx ts-node src/scripts/import-data.ts
 *   
 * Or add to package.json:
 *   "import-data": "ts-node src/scripts/import-data.ts"
 */

import { importScrapedData } from '../services/data-import.service';

async function main() {
  console.log('🚀 Starting TravelWise Data Import\n');
  console.log('='.repeat(50));
  
  try {
    const result = await importScrapedData();
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 IMPORT SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Successfully imported: ${result.imported} places`);
    console.log(`⚠️ Skipped: ${result.skipped} places`);
    console.log('='.repeat(50));
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  }
}

main();
