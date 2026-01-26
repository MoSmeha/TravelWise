
import { create } from 'zustand';

interface ItineraryState {
  activeItineraryId: string | null;
  

  setActiveItinerary: (id: string) => void;
  

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
