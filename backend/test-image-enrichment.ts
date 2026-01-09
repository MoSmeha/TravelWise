
import { generateItinerary } from './src/services/itinerary.service';
import prisma from './src/lib/prisma';
import { BudgetLevel, TravelStyle, LocationClassification, LocationCategory } from '@prisma/client';

async function testImageEnrichment() {
  console.log('🧪 Starting Image Enrichment Test...');

  // 1. Create a dummy place without an image but with a valid Google Place ID
  // Using "National Museum of Beirut" PLACE ID: ChIJLbFCyzMXHxURh0Gq0vMzTjo
  const placeName = "Test Museum " + Date.now();
  const validGooglePlaceId = "ChIJLbFCyzMXHxURh0Gq0vMzTjo"; 

  console.log(`📝 Creating test place: ${placeName}`);
  
  const place = await prisma.place.create({
    data: {
      name: placeName,
      classification: LocationClassification.HIDDEN_GEM, // Ensure it's picked up
      category: LocationCategory.MUSEUM,
      description: "A test museum for image enrichment.",
      latitude: 33.8784,
      longitude: 35.5134,
      googlePlaceId: validGooglePlaceId,
      popularity: 1000,
      city: "Beirut",
      // IMPORTANT: No imageUrl set initially
    }
  });

  console.log(`✅ Created place with ID: ${place.id}`);

  // 2. Generate an itinerary that should include this place
  console.log('🔄 Generating itinerary...');
  
  try {
    const result = await generateItinerary({
      cityId: "Beirut",
      numberOfDays: 1,
      budgetLevel: BudgetLevel.MEDIUM,
      travelStyle: TravelStyle.CULTURE, // Match the place category
      budgetUSD: 500
    });

    // 3. Check if the place in the result has an image URL
    let found = false;
    for (const day of result.days) {
      for (const loc of day.locations) {
        if (loc.id === place.id) {
            found = true;
            console.log(`📍 Found our test place in itinerary.`);
            if (loc.imageUrl) {
                console.log(`✅ SUCCESS: Image URL found: ${loc.imageUrl.substring(0, 50)}...`);
            } else {
                console.error(`❌ FAILURE: Image URL is missing!`);
            }
        }
      }
    }
    
    if (!found) {
        console.warn(`⚠️ Warning: Test place was not selected in the itinerary. Try adjusting popularity or filters.`);
    }

    // 4. Verify Database Update
    const updatedPlace = await prisma.place.findUnique({ where: { id: place.id } });
    if (updatedPlace?.imageUrl) {
        console.log(`✅ DATABASE SUCCESS: Place record updated with image.`);
    } else {
        console.error(`❌ DATABASE FAILURE: Place record NOT updated.`);
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    // Cleanup
    console.log('🧹 Cleaning up...');
    await prisma.place.delete({ where: { id: place.id } });
  }
}

testImageEnrichment();
