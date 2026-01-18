import { ChecklistCategory } from '../generated/prisma/client.js';
import { WeatherForecast } from './weather.service';
import { checklistProvider } from '../providers/checklist.provider.pg';
import {
  IChecklistProvider,
  ChecklistItemRecord,
  CreateChecklistItemData,
} from '../provider-contract/checklist.provider-contract';
import { CreateChecklistItemInput, UpdateChecklistItemInput } from '../schemas/checklist.schema';


export class ChecklistService {
  constructor(private provider: IChecklistProvider = checklistProvider) {}

  /**
   * Get all checklist items for an itinerary
   */
  async getItineraryChecklist(itineraryId: string): Promise<ChecklistItemRecord[]> {
    return this.provider.findByItineraryId(itineraryId);
  }

  /**
   * Update a checklist item's checked status
   */
  async updateItem(itemId: string, input: UpdateChecklistItemInput): Promise<ChecklistItemRecord> {
    return this.provider.updateIsChecked(itemId, input.isChecked);
  }

  /**
   * Create a custom checklist item
   */
  async createItem(itineraryId: string, input: CreateChecklistItemInput): Promise<ChecklistItemRecord> {
    return this.provider.create({
      itineraryId,
      category: input.category as ChecklistCategory,
      item: input.item,
      reason: input.reason || null,
      source: 'user',
    });
  }

  /**
   * Delete a checklist item
   */
  async deleteItem(itemId: string): Promise<void> {
    return this.provider.delete(itemId);
  }

  /**
   * Bulk create checklist items (used by itinerary generation)
   */
  async createBulkItems(items: CreateChecklistItemData[]): Promise<{ count: number }> {
    return this.provider.createMany(items);
  }
}

// Singleton instance for use throughout the app
export const checklistService = new ChecklistService();


export interface ChecklistItemData {
  category: ChecklistCategory;
  item: string;
  reason: string;
  source: 'essential' | 'weather' | 'terrain' | 'activity' | 'safety';
  priority: 'high' | 'medium' | 'low';
}

// Essential items everyone needs
const ESSENTIAL_ITEMS: ChecklistItemData[] = [
  { category: 'ESSENTIALS', item: 'Passport', reason: 'Required for international travel', source: 'essential', priority: 'high' },
  { category: 'ESSENTIALS', item: 'Travel insurance documents', reason: 'Keep digital and physical copies', source: 'essential', priority: 'high' },
  { category: 'ESSENTIALS', item: 'Phone charger', reason: 'For navigation and communication', source: 'essential', priority: 'high' },
  { category: 'ESSENTIALS', item: 'Power bank', reason: 'Backup power for long days exploring', source: 'essential', priority: 'medium' },
  { category: 'ESSENTIALS', item: 'Cash (USD and local currency)', reason: 'Many places in Lebanon prefer cash', source: 'essential', priority: 'high' },
  { category: 'DOCUMENTATION', item: 'Passport photocopy', reason: 'Store separately from original', source: 'essential', priority: 'medium' },
  { category: 'DOCUMENTATION', item: 'Hotel booking confirmations', reason: 'May be requested at immigration', source: 'essential', priority: 'medium' },
  { category: 'DOCUMENTATION', item: 'Flight tickets', reason: 'Print or save offline copies', source: 'essential', priority: 'high' },
];

// Weather-based items
const WEATHER_ITEMS: Record<string, ChecklistItemData[]> = {
  hot: [
    { category: 'WEATHER', item: 'Sunscreen SPF 30+', reason: 'High UV expected', source: 'weather', priority: 'high' },
    { category: 'WEATHER', item: 'Sunglasses', reason: 'Protect eyes from bright sun', source: 'weather', priority: 'medium' },
    { category: 'WEATHER', item: 'Hat or cap', reason: 'Sun protection for head', source: 'weather', priority: 'medium' },
    { category: 'WEATHER', item: 'Refillable water bottle', reason: 'Stay hydrated in heat', source: 'weather', priority: 'high' },
    { category: 'WEATHER', item: 'Light breathable clothing', reason: 'Temperatures above 30°C expected', source: 'weather', priority: 'medium' },
  ],
  rain: [
    { category: 'WEATHER', item: 'Umbrella', reason: 'Rain expected during your trip', source: 'weather', priority: 'high' },
    { category: 'WEATHER', item: 'Waterproof jacket', reason: 'Stay dry during walks', source: 'weather', priority: 'high' },
    { category: 'WEATHER', item: 'Waterproof bag for electronics', reason: 'Protect phone and camera', source: 'weather', priority: 'medium' },
  ],
  cold: [
    { category: 'WEATHER', item: 'Warm jacket', reason: 'Temperatures below 15°C expected', source: 'weather', priority: 'high' },
    { category: 'WEATHER', item: 'Thermal layers', reason: 'Layer up for cold mornings', source: 'weather', priority: 'medium' },
    { category: 'WEATHER', item: 'Warm socks', reason: 'Keep feet warm', source: 'weather', priority: 'low' },
  ],
  thunderstorm: [
    { category: 'WEATHER', item: 'Rain poncho', reason: 'Sudden storms possible', source: 'weather', priority: 'high' },
    { category: 'SAFETY', item: 'Weather alert app', reason: 'Monitor storm warnings', source: 'weather', priority: 'medium' },
  ],
};

// Activity-based items
const ACTIVITY_ITEMS: Record<string, ChecklistItemData[]> = {
  hiking: [
    { category: 'TERRAIN', item: 'Hiking shoes/boots', reason: 'Essential for trails and rough terrain', source: 'terrain', priority: 'high' },
    { category: 'TERRAIN', item: 'Hiking poles', reason: 'Helpful on steep trails', source: 'terrain', priority: 'low' },
    { category: 'SAFETY', item: 'First aid kit', reason: 'For minor injuries on trail', source: 'safety', priority: 'medium' },
    { category: 'ESSENTIALS', item: 'Trail snacks', reason: 'Energy for long hikes', source: 'activity', priority: 'medium' },
  ],
  beach: [
    { category: 'ACTIVITY', item: 'Swimsuit', reason: 'Beach activities planned', source: 'activity', priority: 'high' },
    { category: 'ACTIVITY', item: 'Beach towel', reason: 'For beach and pool use', source: 'activity', priority: 'medium' },
    { category: 'ACTIVITY', item: 'Sandals/flip-flops', reason: 'For beach and casual walking', source: 'activity', priority: 'medium' },
    { category: 'ACTIVITY', item: 'Reef-safe sunscreen', reason: 'Protect marine life', source: 'activity', priority: 'medium' },
  ],
  mosque: [
    { category: 'ACTIVITY', item: 'Modest clothing (covers shoulders/knees)', reason: 'Required for mosque visits', source: 'activity', priority: 'high' },
    { category: 'ACTIVITY', item: 'Head covering (for women)', reason: 'Required in mosques', source: 'activity', priority: 'high' },
    { category: 'ACTIVITY', item: 'Socks', reason: 'Shoes removed at mosques', source: 'activity', priority: 'medium' },
  ],
  church: [
    { category: 'ACTIVITY', item: 'Modest clothing', reason: 'Respectful attire for religious sites', source: 'activity', priority: 'medium' },
  ],
  nightlife: [
    { category: 'ACTIVITY', item: 'ID/passport copy', reason: 'May be checked at venues', source: 'activity', priority: 'high' },
    { category: 'ACTIVITY', item: 'Cash for nightlife', reason: 'Many bars prefer cash', source: 'activity', priority: 'medium' },
  ],
  museum: [
    { category: 'ACTIVITY', item: 'Comfortable walking shoes', reason: 'Long museum visits', source: 'activity', priority: 'medium' },
  ],
  nature: [
    { category: 'SAFETY', item: 'Insect repellent', reason: 'Mosquitoes in natural areas', source: 'safety', priority: 'medium' },
    { category: 'TERRAIN', item: 'Comfortable walking shoes', reason: 'Outdoor exploration', source: 'terrain', priority: 'high' },
  ],
  food: [
    { category: 'SAFETY', item: 'Antacids/digestive aids', reason: 'New cuisines may affect digestion', source: 'safety', priority: 'low' },
  ],
};

// Safety items for specific conditions
const SAFETY_ITEMS: Record<string, ChecklistItemData[]> = {
  mosquitoes: [
    { category: 'SAFETY', item: 'DEET insect repellent', reason: 'Mosquitoes present in area', source: 'safety', priority: 'high' },
    { category: 'SAFETY', item: 'Long sleeves/pants for evenings', reason: 'Protect from mosquito bites', source: 'safety', priority: 'medium' },
  ],
  sun: [
    { category: 'SAFETY', item: 'After-sun lotion', reason: 'Soothe sunburn if it occurs', source: 'safety', priority: 'low' },
  ],
};

// Determine weather conditions from forecast
function analyzeWeather(forecast: WeatherForecast[]): string[] {
  const conditions: string[] = [];
  
  const hasHot = forecast.some(f => f.tempMax >= 28);
  const hasCold = forecast.some(f => f.tempMin <= 12);
  const hasRain = forecast.some(f => 
    f.condition === 'rain' || f.condition === 'drizzle' || f.precipitation > 50
  );
  const hasThunderstorm = forecast.some(f => f.condition === 'thunderstorm');
  
  if (hasHot) conditions.push('hot');
  if (hasCold) conditions.push('cold');
  if (hasRain) conditions.push('rain');
  if (hasThunderstorm) conditions.push('thunderstorm');
  
  return conditions;
}

// Map activity types to checklist categories
function mapActivityTypes(activityTypes: string[]): string[] {
  const mappings: Record<string, string[]> = {
    'culture': ['museum', 'church', 'mosque'],
    'nature': ['hiking', 'nature'],
    'food': ['food'],
    'nightlife': ['nightlife'],
    'entertainment': ['nightlife'],
    'adventure': ['hiking', 'nature'],
  };
  
  const activities: string[] = [];
  
  for (const type of activityTypes) {
    const mapped = mappings[type.toLowerCase()];
    if (mapped) {
      activities.push(...mapped);
    }
  }
  
  return [...new Set(activities)];
}

// Determine safety concerns based on activities and location
function determineSafetyConcerns(activityTypes: string[], forecast: WeatherForecast[]): string[] {
  const concerns: string[] = [];
  
  const hasOutdoor = activityTypes.some(a => 
    ['nature', 'hiking', 'beach', 'adventure'].includes(a.toLowerCase())
  );
  
  const hasHot = forecast.some(f => f.tempMax >= 28);
  const hasWarm = forecast.some(f => f.tempMax >= 22);
  
  if (hasOutdoor && hasWarm) {
    concerns.push('mosquitoes');
  }
  
  if (hasHot) {
    concerns.push('sun');
  }
  
  return concerns;
}

// Main function to generate checklist
export function generateChecklist(
  activityTypes: string[],
  forecast: WeatherForecast[],
  hasBeach: boolean = false
): ChecklistItemData[] {
  const items: ChecklistItemData[] = [];
  const addedItems = new Set<string>();
  
  // Helper to add item without duplicates
  const addItem = (item: ChecklistItemData) => {
    if (!addedItems.has(item.item)) {
      items.push(item);
      addedItems.add(item.item);
    }
  };
  
  // 1. Always add essentials
  ESSENTIAL_ITEMS.forEach(addItem);
  
  // 2. Add weather-based items
  const weatherConditions = analyzeWeather(forecast);
  for (const condition of weatherConditions) {
    const weatherItems = WEATHER_ITEMS[condition];
    if (weatherItems) {
      weatherItems.forEach(addItem);
    }
  }
  
  // 3. Add activity-based items
  const activities = mapActivityTypes(activityTypes);
  
  // Add beach if specified
  if (hasBeach) {
    activities.push('beach');
  }
  
  for (const activity of activities) {
    const activityItems = ACTIVITY_ITEMS[activity];
    if (activityItems) {
      activityItems.forEach(addItem);
    }
  }
  
  // 4. Add safety items
  const safetyConcerns = determineSafetyConcerns(activityTypes, forecast);
  for (const concern of safetyConcerns) {
    const safetyItems = SAFETY_ITEMS[concern];
    if (safetyItems) {
      safetyItems.forEach(addItem);
    }
  }
  
  // Sort by priority and category
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const categoryOrder = { 
    ESSENTIALS: 0, 
    DOCUMENTATION: 1, 
    WEATHER: 2, 
    ACTIVITY: 3, 
    TERRAIN: 4, 
    SAFETY: 5 
  };
  
  return items.sort((a, b) => {
    const catDiff = (categoryOrder[a.category] || 99) - (categoryOrder[b.category] || 99);
    if (catDiff !== 0) return catDiff;
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

// Generate checklist summary for notifications
export function generateChecklistSummary(items: ChecklistItemData[]): string {
  const highPriority = items.filter(i => i.priority === 'high');
  const categories = [...new Set(items.map(i => i.category))];
  
  return `${items.length} items across ${categories.length} categories. ${highPriority.length} high priority items.`;
}
