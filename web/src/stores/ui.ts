import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { DigitStyle, Language } from '../domain/types'

interface UiState {
  language: Language
  digits: DigitStyle
  setLanguage: (language: Language) => void
  setDigits: (digits: DigitStyle) => void
  toggleLanguage: () => void
}

/** Per-device UI preferences: language and digits (changing the language also resets the digits to match). */
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      language: 'bn',
      digits: 'bn',
      setLanguage: (language) => set({ language, digits: language === 'bn' ? 'bn' : 'en' }),
      setDigits: (digits) => set({ digits }),
      toggleLanguage: () =>
        set((s) => {
          const language = s.language === 'bn' ? 'en' : 'bn'
          return { language, digits: language === 'bn' ? 'bn' : 'en' }
        }),
    }),
    { name: 'baki.ui', storage: createJSONStorage(() => localStorage) },
  ),
)
