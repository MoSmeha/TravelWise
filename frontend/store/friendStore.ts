import { create } from 'zustand';

// Minimal Zustand store for UI state only
// Data fetching is handled by React Query hooks in hooks/queries/useFriends.ts

interface FriendUIState {
  activeTab: 'friends' | 'pending' | 'add';
  searchQuery: string;
  
  // Actions
  setActiveTab: (tab: 'friends' | 'pending' | 'add') => void;
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;
}

export const useFriendUIStore = create<FriendUIState>((set) => ({
  activeTab: 'friends',
  searchQuery: '',

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  clearSearch: () => set({ searchQuery: '' }),
}));
