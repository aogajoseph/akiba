import { create } from 'zustand';

import { getHasSeenOnboarding, setHasSeenOnboarding } from '@/src/services/onboarding';

type OnboardingState = {
  hasSeenOnboarding: boolean | null;
  hydrate: () => Promise<void>;
  markComplete: () => Promise<void>;
};

let hydratePromise: Promise<void> | null = null;

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  hasSeenOnboarding: null,

  hydrate: async () => {
    if (hydratePromise) {
      return hydratePromise;
    }

    hydratePromise = (async () => {
      try {
        const value = await getHasSeenOnboarding();
        set({ hasSeenOnboarding: value });
      } catch {
        set({ hasSeenOnboarding: false });
      } finally {
        hydratePromise = null;
      }
    })();

    return hydratePromise;
  },

  markComplete: async () => {
    await setHasSeenOnboarding();
    if (get().hasSeenOnboarding !== true) {
      set({ hasSeenOnboarding: true });
    }
  },
}));
