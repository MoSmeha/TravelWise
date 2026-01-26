import { create } from 'zustand';



interface FriendUIState {
  activeTab: 'friends' | 'pending' | 'add';
  searchQuery: string;
  

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
