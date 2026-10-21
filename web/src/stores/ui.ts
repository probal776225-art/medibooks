import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { DigitStyle, Language } from '../domain/types'

interface UiState {
  language: Language
  digits: DigitStyle
  setLanguage: (language: Language) => void
  toggleLanguage: () => void
}

/** Per-device UI preferences (Settings will also store the shop default in Phase 2). */
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      language: 'bn',
      digits: 'bn',
      setLanguage: (language) => set({ language, digits: language === 'bn' ? 'bn' : 'en' }),
      toggleLanguage: () =>
        set((s) => {
          const language = s.language === 'bn' ? 'en' : 'bn'
          return { language, digits: language === 'bn' ? 'bn' : 'en' }
        }),
    }),
    { name: 'baki.ui', storage: createJSONStorage(() => localStorage) },
  ),
)
