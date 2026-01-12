/**
 * Itinerary Store
 * Persists the active itinerary ID for cross-screen access (e.g., checklist tab)
 */

import { create } from 'zustand';

interface ItineraryState {
  /** The currently active itinerary ID */
  activeItineraryId: string | null;
  
  /** Set the active itinerary ID */
  setActiveItinerary: (id: string) => void;
  
  /** Clear the active itinerary */
  clearActiveItinerary: () => void;
}

export const useItineraryStore = create<ItineraryState>((set) => ({
  activeItineraryId: null,

  setActiveItinerary: (id: string) => {
    set({ activeItineraryId: id });
  },

  clearActiveItinerary: () => {
    set({ activeItineraryId: null });
  },
}));
