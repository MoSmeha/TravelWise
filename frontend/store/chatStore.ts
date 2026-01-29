import { create } from 'zustand';

interface ChatStore {
  activeConversationId: string | null;
  setActiveConversation: (conversationId: string | null) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  activeConversationId: null,
  setActiveConversation: (conversationId) => set({ activeConversationId: conversationId }),
}));
