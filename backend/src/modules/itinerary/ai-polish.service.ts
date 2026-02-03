import { ChecklistCategory } from '../../generated/prisma/client.js';
import { getOpenAIClient, isOpenAIConfigured } from '../shared/utils/openai.utils.js';
import { ItineraryPrompts } from '../prompts/itinerary.prompts.js';
import { ItineraryDayResult } from './itinerary.types.js';

/**
 * Generate AI-powered enhancements for an itinerary including warnings,
 * tourist trap alerts, local tips, and packing checklist items.
 */
export async function generateAIPolish(
  days: ItineraryDayResult[],
  cityName: string
): Promise<{
  warnings: Array<{ title: string; description: string }>;
  touristTraps: Array<{ name: string; reason: string }>;
  localTips: string[];
  checklist: Array<{ category: string; item: string; reason: string }>;
}> {
  if (!isOpenAIConfigured()) {
    return { warnings: [], touristTraps: [], localTips: [], checklist: [] };
  }
  
  const openai = getOpenAIClient();
  
  let context = `Itinerary for ${cityName}:\n\n`;
  
  days.forEach(day => {
    context += `Day ${day.dayNumber}: ${day.description}\n`;
    day.locations.forEach(loc => {
      context += `- ${loc.name} (${loc.category}): ${loc.description?.substring(0, 100) || 'No description'}\n`;
      if (loc.rating) context += `  Rating: ${loc.rating}/5 (${loc.totalRatings} reviews)\n`;
    });
    context += '\n';
  });
  
  const prompt = ItineraryPrompts.polishPrompt(cityName, context);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5.2',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });
    
    const content = response.choices[0].message.content;
    if (content) {
      const parsed = JSON.parse(content);
      
      const validatedChecklist = (parsed.checklist || []).map((item: any) => {
        const validCategory = mapToValidChecklistCategory(item.category);
        return {
          ...item,
          category: validCategory,
        };
      }).filter((item: any) => item.category !== null);
      
      return {
        warnings: parsed.warnings || [],
        touristTraps: parsed.touristTraps || [],
        localTips: parsed.localTips || [],
        checklist: validatedChecklist,
      };
    }
  } catch (error) {
    console.error('AI Polish generation failed:', error);
  }
  
  return { warnings: [], touristTraps: [], localTips: [], checklist: [] };
}

/**
 * Map AI-generated category strings to valid ChecklistCategory enum values.
 * Returns null if the category cannot be mapped.
 */
export function mapToValidChecklistCategory(category: string): ChecklistCategory | null {
  const normalized = category.toUpperCase().trim();
  
  const validCategories: ChecklistCategory[] = [
    ChecklistCategory.ESSENTIALS,
    ChecklistCategory.WEATHER,
    ChecklistCategory.TERRAIN,
    ChecklistCategory.ACTIVITY,
    ChecklistCategory.SAFETY,
    ChecklistCategory.DOCUMENTATION,
  ];
  
  const exactMatch = validCategories.find(c => c === normalized);
  if (exactMatch) return exactMatch;
  
  const categoryMap: Record<string, ChecklistCategory> = {
    'TEC': ChecklistCategory.ESSENTIALS,
    'TECH': ChecklistCategory.ESSENTIALS,
    'TECHNOLOGY': ChecklistCategory.ESSENTIALS,
    'ELECTRONICS': ChecklistCategory.ESSENTIALS,
    'CLOTHING': ChecklistCategory.WEATHER,
    'CLOTHES': ChecklistCategory.WEATHER,
    'TOILETRIES': ChecklistCategory.ESSENTIALS,
    'HEALTH': ChecklistCategory.SAFETY,
    'MEDICAL': ChecklistCategory.SAFETY,
    'MEDICINE': ChecklistCategory.SAFETY,
    'MISC': ChecklistCategory.ESSENTIALS,
    'OTHER': ChecklistCategory.ESSENTIALS,
    'DOCUMENTS': ChecklistCategory.DOCUMENTATION,
    'DOCUMENT': ChecklistCategory.DOCUMENTATION,
    'PAPERS': ChecklistCategory.DOCUMENTATION,
  };
  
  const mapped = categoryMap[normalized];
  if (mapped) {
    console.log(`[CHECKLIST] Mapped invalid category "${category}" to "${mapped}"`);
    return mapped;
  }
  
  console.warn(`[CHECKLIST] Unable to map category "${category}" to a valid ChecklistCategory. Skipping item.`);
  return null;
}
