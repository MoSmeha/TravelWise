import { create } from 'zustand';
import { getItemAsync, setItemAsync, deleteItemAsync } from 'expo-secure-store';

interface OnboardingState {
  hasSeenOnboarding: boolean;
  isCheckingOnboarding: boolean;
  currentUserId: string | null;
  
  checkOnboardingForUser: (userId: string) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => void;
}

const getStorageKey = (userId: string) => `onboarding_seen_${userId}`;

export const useOnboarding = create<OnboardingState>((set, get) => ({
  hasSeenOnboarding: false,
  isCheckingOnboarding: true,
  currentUserId: null,

  checkOnboardingForUser: async (userId: string) => {
    console.log('[ONBOARDING] Checking for user:', userId);
    set({ isCheckingOnboarding: true, currentUserId: userId });
    try {
      const key = getStorageKey(userId);
      const value = await getItemAsync(key);
      console.log('[ONBOARDING] Storage value for', key, ':', value);
      set({ hasSeenOnboarding: value === 'true' });
    } catch (error) {
      console.error('[ONBOARDING] Check failed:', error);
      set({ hasSeenOnboarding: false });
    } finally {
      set({ isCheckingOnboarding: false });
    }
  },

  completeOnboarding: async () => {
    const { currentUserId } = get();
    if (!currentUserId) {
      console.error('[ONBOARDING] No user ID set, cannot complete onboarding');
      return;
    }
    try {
      const key = getStorageKey(currentUserId);
      console.log('[ONBOARDING] Completing onboarding for:', key);
      await setItemAsync(key, 'true');
      set({ hasSeenOnboarding: true });
    } catch (error) {
      console.error('[ONBOARDING] Complete failed:', error);
    }
  },

  resetOnboarding: () => {
    console.log('[ONBOARDING] Resetting state');
    set({ 
      hasSeenOnboarding: false, 
      isCheckingOnboarding: true,
      currentUserId: null 
    });
  },
}));
