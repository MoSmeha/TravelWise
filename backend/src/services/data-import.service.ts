import { LocationCategory, LocationClassification } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import prisma from '../lib/prisma';

// ==========================================
// DATA IMPORT SERVICE
// Imports pre-scraped data from JSON files into the database
// ==========================================

interface RedditEntry {
  type: string;
  author: string;
  text: string;
  activityTypes: string[];
  popularity: number;
  url: string;
}

interface TripAdvisorEntry {
  image: string;
  type: string;
  name: string;
  rankingPosition: number;
  category: string;
  rating: number;
  phone: string | null;
  address: string;
  email: string | null;
  webUrl: string;
  website: string | null;
  rankingDenominator: string;
  rankingString: string;
  numberOfReviews: number;
}

interface TikTokEntry {
  author: string;
  text: string;
  activityTypes: string[];
  popularity: number;
  url: string;
}

interface ExtractedPlace {
  name: string;
  description: string;
  sources: string[];
  sourceUrls: string[];
  popularity: number;
  activityTypes: string[];
  city: string;
  address?: string;
  rating?: number;
  category: LocationCategory;
  classification: LocationClassification;
  latitude?: number;
  longitude?: number;
  localTip?: string;
  imageUrl?: string;
  imageUrls?: string[];
  sourceReviews?: Array<{ source: string; text: string; author?: string }>;
}

// Known places with coordinates for Lebanon
const KNOWN_COORDINATES: Record<string, { lat: number; lng: number; city: string }> = {
  // Museums
  'mim museum': { lat: 33.8677, lng: 35.5417, city: 'Beirut' },
  'national museum': { lat: 33.8873, lng: 35.5118, city: 'Beirut' },
  'sursock museum': { lat: 33.8892, lng: 35.5241, city: 'Beirut' },
  'beit beirut': { lat: 33.8792, lng: 35.5058, city: 'Beirut' },
  
  // Restaurants & Cafes
  'tawlet': { lat: 33.8938, lng: 35.5118, city: 'Beirut' },
  't-marbouta': { lat: 33.8958, lng: 35.4858, city: 'Beirut' },
  'em nazih': { lat: 33.8928, lng: 35.4888, city: 'Beirut' },
  'barbar': { lat: 33.8828, lng: 35.4958, city: 'Beirut' },
  'cafe younis': { lat: 33.8938, lng: 35.4878, city: 'Beirut' },
  'al falamanki': { lat: 33.8798, lng: 35.5028, city: 'Beirut' },
  'enab': { lat: 33.8888, lng: 35.5068, city: 'Beirut' },
  'kalei': { lat: 33.8848, lng: 35.4978, city: 'Beirut' },
  
  // Landmarks & Viewpoints
  'pigeon rocks': { lat: 33.8938, lng: 35.4698, city: 'Beirut' },
  'raouche': { lat: 33.8948, lng: 35.4708, city: 'Beirut' },
  'corniche': { lat: 33.8908, lng: 35.4778, city: 'Beirut' },
  'zaitunay bay': { lat: 33.9018, lng: 35.5128, city: 'Beirut' },
  
  // Areas & Neighborhoods
  'downtown beirut': { lat: 33.8959, lng: 35.5006, city: 'Beirut' },
  'hamra': { lat: 33.8938, lng: 35.4858, city: 'Beirut' },
  'gemmayzeh': { lat: 33.8898, lng: 35.5138, city: 'Beirut' },
  'mar mikhael': { lat: 33.8898, lng: 35.5178, city: 'Beirut' },
  'badaro': { lat: 33.8768, lng: 35.5078, city: 'Beirut' },
  
  // Outside Beirut
  'jeita grotto': { lat: 33.9397, lng: 35.6436, city: 'Jounieh' },
  'harissa': { lat: 33.9778, lng: 35.6442, city: 'Jounieh' },
  'byblos': { lat: 34.1208, lng: 35.6481, city: 'Byblos' },
  'baalbek': { lat: 34.0067, lng: 36.2039, city: 'Baalbek' },
  'cedars': { lat: 34.2436, lng: 36.0728, city: 'Bcharre' },
  'tyre': { lat: 33.2705, lng: 35.1986, city: 'Tyre' },
  'sidon': { lat: 33.5571, lng: 35.3729, city: 'Sidon' },
  'tripoli': { lat: 34.4360, lng: 35.8497, city: 'Tripoli' },
  'batroun': { lat: 34.2553, lng: 35.6583, city: 'Batroun' },
  'jounieh': { lat: 33.9808, lng: 35.6178, city: 'Jounieh' },
  'chouf': { lat: 33.6842, lng: 35.5864, city: 'Chouf' },
  'deir el qamar': { lat: 33.6944, lng: 35.5614, city: 'Chouf' },
  'beiteddine': { lat: 33.6947, lng: 35.5731, city: 'Chouf' },
  'yammouneh': { lat: 34.0608, lng: 36.0347, city: 'Yammouneh' },
  'balou3 bal3a': { lat: 34.1786, lng: 35.9394, city: 'Tannourine' },
  'anfeh': { lat: 34.3575, lng: 35.7367, city: 'Anfeh' },
  'naqoura': { lat: 33.1167, lng: 35.1333, city: 'Naqoura' },
};

// Map activity types to location categories
function mapActivityToCategory(activityTypes: string[]): LocationCategory {
  const typeSet = new Set(activityTypes.map(t => t.toLowerCase()));
  
  if (typeSet.has('food')) return LocationCategory.RESTAURANT;
  if (typeSet.has('nature')) return LocationCategory.HIKING;
  if (typeSet.has('culture')) return LocationCategory.MUSEUM;
  if (typeSet.has('entertainment')) return LocationCategory.ACTIVITY;
  
  return LocationCategory.OTHER;
}

// Extract place name from text
function extractPlaceName(text: string): string | null {
  // Look for bolded text (Reddit format)
  const boldMatch = text.match(/\*\*([^*]+)\*\*/);
  if (boldMatch) return boldMatch[1].trim();
  
  // Look for @ mentions (TikTok format)
  const atMatch = text.match(/@(\w+)/);
  if (atMatch) return atMatch[1].replace(/_/g, ' ').trim();
  
  return null;
}

// Extract city from text or address
function extractCity(text: string, address?: string): string {
  const combinedText = `${text} ${address || ''}`.toLowerCase();
  
  const cities = [
    'beirut', 'byblos', 'baalbek', 'tripoli', 'sidon', 'tyre', 
    'jounieh', 'batroun', 'chouf', 'zahle', 'bcharre', 'ehden',
    'naqoura', 'anfeh', 'yammouneh', 'tannourine',
  ];
  
  for (const city of cities) {
    if (combinedText.includes(city)) {
      return city.charAt(0).toUpperCase() + city.slice(1);
    }
  }
  
  return 'Beirut'; // Default to Beirut
}

// Get coordinates for a place
function getCoordinates(placeName: string, city: string): { lat: number; lng: number } | null {
  const nameLower = placeName.toLowerCase();
  
  // Check known coordinates
  for (const [key, coords] of Object.entries(KNOWN_COORDINATES)) {
    if (nameLower.includes(key) || key.includes(nameLower)) {
      return { lat: coords.lat, lng: coords.lng };
    }
  }
  
  // Default coordinates for cities
  const cityCoords: Record<string, { lat: number; lng: number }> = {
    'Beirut': { lat: 33.8938, lng: 35.5018 },
    'Byblos': { lat: 34.1208, lng: 35.6481 },
    'Baalbek': { lat: 34.0067, lng: 36.2039 },
    'Tripoli': { lat: 34.4360, lng: 35.8497 },
    'Sidon': { lat: 33.5571, lng: 35.3729 },
    'Tyre': { lat: 33.2705, lng: 35.1986 },
    'Jounieh': { lat: 33.9808, lng: 35.6178 },
    'Batroun': { lat: 34.2553, lng: 35.6583 },
  };
  
  return cityCoords[city] || cityCoords['Beirut'];
}

// Determine classification based on sources and context
function determineClassification(
  sources: string[],
  popularity: number,
  text: string
): LocationClassification {
  const textLower = text.toLowerCase();
  
  // Check for explicit hidden gem mentions
  if (textLower.includes('hidden gem') || textLower.includes('local favorite') || textLower.includes('locals go')) {
    return LocationClassification.HIDDEN_GEM;
  }
  
  // Check for tourist trap indicators
  if (textLower.includes('tourist trap') || textLower.includes('overpriced') || textLower.includes('avoid')) {
    return LocationClassification.TOURIST_TRAP;
  }
  
  // High popularity + multiple sources = likely conditional
  if (popularity > 100 && sources.length > 1) {
    return LocationClassification.CONDITIONAL;
  }
  
  // Reddit recommendations tend to be hidden gems
  if (sources.includes('reddit') && !sources.includes('tripadvisor')) {
    return LocationClassification.HIDDEN_GEM;
  }
  
  // TripAdvisor top attractions with high reviews = conditional
  if (sources.includes('tripadvisor') && popularity > 500) {
    return LocationClassification.CONDITIONAL;
  }
  
  return LocationClassification.HIDDEN_GEM;
}

// Process Reddit data
function processRedditData(data: Record<string, RedditEntry[]>): ExtractedPlace[] {
  const places: ExtractedPlace[] = [];
  const seenNames = new Set<string>();
  
  for (const [_category, entries] of Object.entries(data)) {
    for (const entry of entries) {
      const placeName = extractPlaceName(entry.text);
      if (!placeName || seenNames.has(placeName.toLowerCase())) continue;
      
      seenNames.add(placeName.toLowerCase());
      const city = extractCity(entry.text);
      const coords = getCoordinates(placeName, city);
      
      places.push({
        name: placeName,
        description: entry.text.slice(0, 500),
        sources: ['reddit'],
        sourceUrls: [entry.url],
        popularity: entry.popularity,
        activityTypes: entry.activityTypes,
        city,
        category: mapActivityToCategory(entry.activityTypes),
        classification: determineClassification(['reddit'], entry.popularity, entry.text),
        latitude: coords?.lat,
        longitude: coords?.lng,
      });
    }
  }
  
  return places;
}

// Process TripAdvisor data
function processTripAdvisorData(data: TripAdvisorEntry[]): ExtractedPlace[] {
  const places: ExtractedPlace[] = [];
  
  for (const entry of data) {
    if (!entry.name) continue;
    
    const city = extractCity(entry.name, entry.address);
    const coords = getCoordinates(entry.name, city);
    
    // Determine category from TripAdvisor type
    const nameLower = entry.name.toLowerCase();
    
    const placeCategory: LocationCategory = (() => {
      if (nameLower.includes('museum')) return LocationCategory.MUSEUM;
      if (nameLower.includes('mosque') || nameLower.includes('cathedral') || nameLower.includes('church')) {
        return LocationCategory.RELIGIOUS_SITE;
      }
      if (nameLower.includes('beach') || nameLower.includes('rock')) return LocationCategory.BEACH;
      if (nameLower.includes('mall') || nameLower.includes('souk')) return LocationCategory.SHOPPING;
      if (nameLower.includes('garden') || nameLower.includes('park')) return LocationCategory.PARK;
      if (entry.category === 'attraction') return LocationCategory.HISTORICAL_SITE;
      return LocationCategory.OTHER;
    })();
    
    // Classification based on ranking and reviews
    const placeClassification: LocationClassification = (() => {
      if (entry.rankingPosition <= 10 && entry.rating >= 4.5) {
        return LocationClassification.HIDDEN_GEM; // Top-rated = likely authentic
      }
      if (entry.numberOfReviews > 1000 && entry.rating < 4.0) {
        return LocationClassification.TOURIST_TRAP;
      }
      return LocationClassification.CONDITIONAL;
    })();
    
    places.push({
      name: entry.name,
      description: `${entry.rankingString}. Rating: ${entry.rating}/5 from ${entry.numberOfReviews} reviews.`,
      sources: ['tripadvisor'],
      sourceUrls: [entry.webUrl],
      popularity: entry.numberOfReviews,
      activityTypes: ['culture'],
      city,
      address: entry.address,
      rating: entry.rating,
      category: placeCategory,
      classification: placeClassification,
      latitude: coords?.lat,
      longitude: coords?.lng,
      imageUrl: entry.image, // TripAdvisor image
      imageUrls: entry.image ? [entry.image] : [],
    });
  }
  
  return places;
}

// Process TikTok data
function processTikTokData(data: Record<string, TikTokEntry[]>): ExtractedPlace[] {
  const places: ExtractedPlace[] = [];
  const seenUrls = new Set<string>();
  
  for (const [_category, entries] of Object.entries(data)) {
    for (const entry of entries) {
      if (seenUrls.has(entry.url)) continue;
      seenUrls.add(entry.url);
      
      // Extract places mentioned in TikTok caption
      const lines = entry.text.split('\n').filter(l => l.trim());
      
      for (const line of lines) {
        // Look for emoji + place format (e.g., "🍳 Breakfast at Al Falamanki")
        const placeMatch = line.match(/[🍳💎🎨💗☕🍽💫🤍🌅✨️📍]\s*(?:at\s+)?(.+)/i);
        if (placeMatch) {
          const placeName = placeMatch[1].replace(/\s+at\s+/g, ' ').trim();
          if (placeName.length < 3 || placeName.length > 50) continue;
          
          const city = extractCity(line);
          const coords = getCoordinates(placeName, city);
          
          places.push({
            name: placeName,
            description: entry.text.slice(0, 300),
            sources: ['tiktok'],
            sourceUrls: [entry.url],
            popularity: entry.popularity,
            activityTypes: entry.activityTypes,
            city,
            category: mapActivityToCategory(entry.activityTypes),
            classification: LocationClassification.CONDITIONAL, // TikTok viral = conditional
            latitude: coords?.lat,
            longitude: coords?.lng,
          });
        }
      }
    }
  }
  
  return places;
}

// Merge duplicate places from different sources
function mergePlaces(allPlaces: ExtractedPlace[]): ExtractedPlace[] {
  const merged: Map<string, ExtractedPlace> = new Map();
  
  for (const place of allPlaces) {
    const key = place.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    if (merged.has(key)) {
      const existing = merged.get(key)!;
      // Merge sources
      existing.sources = [...new Set([...existing.sources, ...place.sources])];
      existing.sourceUrls = [...existing.sourceUrls, ...place.sourceUrls];
      // Use higher popularity
      existing.popularity = Math.max(existing.popularity, place.popularity);
      // Merge activity types
      existing.activityTypes = [...new Set([...existing.activityTypes, ...place.activityTypes])];
      // Use rating if available
      if (place.rating && !existing.rating) existing.rating = place.rating;
      // Recalculate classification with merged data
      existing.classification = determineClassification(
        existing.sources,
        existing.popularity,
        existing.description + ' ' + place.description
      );
    } else {
      merged.set(key, { ...place });
    }
  }
  
  return Array.from(merged.values());
}

// Main import function
export async function importScrapedData(): Promise<{ imported: number; skipped: number }> {
  const dataDir = path.join(__dirname, '../../../frontend/data');
  
  console.log('📁 Reading scraped data files...');
  
  // Read JSON files
  const redditData = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'reddit_real_data.json'), 'utf-8')
  );
  const tripAdvisorData = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'tripadvisor_real_data.json'), 'utf-8')
  );
  const tiktokData = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'tiktok_real_data.json'), 'utf-8')
  );
  
  console.log('🔍 Processing Reddit data...');
  const redditPlaces = processRedditData(redditData);
  console.log(`   Found ${redditPlaces.length} places from Reddit`);
  
  console.log('🔍 Processing TripAdvisor data...');
  const tripAdvisorPlaces = processTripAdvisorData(tripAdvisorData);
  console.log(`   Found ${tripAdvisorPlaces.length} places from TripAdvisor`);
  
  console.log('🔍 Processing TikTok data...');
  const tiktokPlaces = processTikTokData(tiktokData);
  console.log(`   Found ${tiktokPlaces.length} places from TikTok`);
  
  // Merge all places
  const allPlaces = [...redditPlaces, ...tripAdvisorPlaces, ...tiktokPlaces];
  const mergedPlaces = mergePlaces(allPlaces);
  console.log(`📊 After merging: ${mergedPlaces.length} unique places`);
  
  // Import to database
  let imported = 0;
  let skipped = 0;
  
  for (const place of mergedPlaces) {
    try {
      // Skip if no coordinates
      if (!place.latitude || !place.longitude) {
        console.warn(`   ⚠️ Skipping ${place.name}: no coordinates`);
        skipped++;
        continue;
      }
      
      // Check if already exists
      const existing = await prisma.place.findFirst({
        where: { name: place.name },
      });
      
      if (existing) {
        // Update existing place with new sources
        await prisma.place.update({
          where: { id: existing.id },
          data: {
            sources: [...new Set([...existing.sources, ...place.sources])],
            sourceUrls: [...existing.sourceUrls, ...place.sourceUrls],
            popularity: Math.max(existing.popularity, place.popularity),
            activityTypes: [...new Set([...existing.activityTypes, ...place.activityTypes])],
            updatedAt: new Date(),
          },
        });
        console.log(`   🔄 Updated: ${place.name}`);
      } else {
        // Create new place
        await prisma.place.create({
          data: {
            name: place.name,
            description: place.description,
            classification: place.classification,
            category: place.category,
            sources: place.sources,
            sourceUrls: place.sourceUrls,
            popularity: place.popularity,
            activityTypes: place.activityTypes,
            city: place.city,
            country: 'Lebanon',
            address: place.address,
            latitude: place.latitude,
            longitude: place.longitude,
            rating: place.rating,
            localTip: place.localTip,
          },
        });
        console.log(`   ✅ Imported: ${place.name}`);
        imported++;
      }
    } catch (error) {
      console.error(`   ❌ Error importing ${place.name}:`, error);
      skipped++;
    }
  }
  
  console.log(`\n🎉 Import complete! Imported: ${imported}, Skipped: ${skipped}`);
  return { imported, skipped };
}

// Export for CLI usage
export default importScrapedData;
