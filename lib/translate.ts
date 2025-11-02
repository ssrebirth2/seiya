// lib/translate.ts
import { supabase } from './supabase'


const translationCache: Record<string, Record<string, string>> = {}

export async function translateKeys(keys: string[], lang: string = 'EN'): Promise<Record<string, string>> {
  const table = `LanguagePackage_${lang}`
  if (!translationCache[lang]) translationCache[lang] = {}

  const missingKeys = keys.filter((key) => !(key in translationCache[lang]))
  if (missingKeys.length > 0) {
    const { data, error } = await supabase
      .from(table)
      .select('key, value')
      .in('key', missingKeys)

    if (!error && data) {
      for (const { key, value } of data) {
        translationCache[lang][key] = value
      }
    }

  }

  const translations: Record<string, string> = {}
  for (const key of keys) {
    translations[key] = translationCache[lang][key] || key
  }

  return translations
}
