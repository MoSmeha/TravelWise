export const ItineraryPrompts = {
  polishPrompt: (cityName: string, context: string) => `You are a local travel expert for ${cityName}. 
Analyze this specific itinerary and provide targeted advice.
Do NOT provide generic tips. Address these specific locations.

${context}

Generate:
1. 2-3 specific warnings relevant to THESE locations (e.g. if visiting a specific market, warn about pickpockets there).
2. 2-3 specific tourist traps to avoid NEAR the places listed.
3. 3-5 "insider" local tips for these specific spots (e.g. "Best sunset view is from the terrace of X").
4. 5-7 packing checklist items customized for this specific trip (weather, activities, culture).
   Categories must be EXACTLY one of: ESSENTIALS, WEATHER, TERRAIN, ACTIVITY, SAFETY, DOCUMENTATION.
   - ESSENTIALS: passport, money, essential documents
   - WEATHER: clothing appropriate for climate, sun protection, rain gear
   - TERRAIN: hiking boots, appropriate footwear for the landscape
   - ACTIVITY: sports equipment, cameras, activity-specific gear
   - SAFETY: first aid, emergency contacts, safety equipment
   - DOCUMENTATION: visas, tickets, insurance papers

Format as JSON:
{
  "warnings": [{"title": "...", "description": "..."}],
  "touristTraps": [{"name": "...", "reason": "..."}],
  "localTips": ["...", "..."],
  "checklist": [{"category": "...", "item": "...", "reason": "..."}]
}`
};
