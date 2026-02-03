/**
 * Travel style configuration for the trip planner.
 * Maps TravelStyle enum values to display labels and icons.
 */

import { 
  Compass, 
  Landmark, 
  Leaf, 
  Sun, 
  Building2, 
  Users,
  LucideIcon,
} from 'lucide-react-native';
import type { TravelStyle } from '../types/api';

export interface TravelStyleConfig {
  key: TravelStyle;
  label: string;
  icon: LucideIcon;
}

/**
 * Available travel styles with their display configuration.
 * Used in the new trip form for style selection.
 */
export const TRAVEL_STYLES: TravelStyleConfig[] = [
  { key: 'ADVENTURE', label: 'Adventure', icon: Compass },
  { key: 'CULTURAL', label: 'Culture & History', icon: Landmark },
  { key: 'NATURE_ECO', label: 'Nature & Eco', icon: Leaf },
  { key: 'BEACH_RELAXATION', label: 'Relaxation', icon: Sun },
  { key: 'URBAN_CITY', label: 'Urban', icon: Building2 },
  { key: 'FAMILY_GROUP', label: 'Family', icon: Users },
];

/** Default styles selected when creating a new trip */
export const DEFAULT_TRAVEL_STYLES: TravelStyle[] = ['CULTURAL', 'ADVENTURE'];

/** Maximum number of travel styles a user can select */
export const MAX_TRAVEL_STYLES = 3;
