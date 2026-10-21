import { useCallback, useEffect } from 'react'
import { withDigits } from '../domain/digits'
import type { Language } from '../domain/types'
import { useUiStore } from '../stores/ui'
import { bn, type MessageKey, type Messages } from './bn'
import { en } from './en'

const dictionaries: Record<Language, Messages> = { bn, en }

export type TranslateVars = Record<string, string | number>

export function translate(language: Language, key: MessageKey, vars?: TranslateVars): string {
  const template = dictionaries[language][key]
  if (!vars) return template
  const digits = language === 'bn' ? 'bn' : 'en'
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => {
    const v = vars[name]
    return v === undefined ? whole : withDigits(String(v), digits)
  })
}

export function useT(): (key: MessageKey, vars?: TranslateVars) => string {
  const language = useUiStore((s) => s.language)
  return useCallback((key, vars) => translate(language, key, vars), [language])
}

/** Keep <html lang> in sync for screen readers and font shaping. */
export function useHtmlLang(): void {
  const language = useUiStore((s) => s.language)
  useEffect(() => {
    document.documentElement.lang = language
  }, [language])
}

export type { MessageKey }
