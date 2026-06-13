/**
 * Site languages — single source of truth for:
 * - Language selector UI
 * - Supabase tables `LanguagePackage_{code}`
 * - `scripts/import-language-packages.py` (reads this file)
 *
 * When adding/removing a language, edit ONLY this file.
 */
export type SiteLanguage = {
  /** Supabase suffix: LanguagePackage_{code} */
  code: string
  label: string
  /** File under C:/rb2/languages/ — table name = stem (LanguagePackage_{suffix}) */
  luaFile: string
}

export const SITE_LANGUAGES: SiteLanguage[] = [
  { code: 'CN', label: '🇨🇳 中文', luaFile: 'LanguagePackage_CN.lua' },
  { code: 'PT', label: '🇧🇷 Português', luaFile: 'LanguagePackage_PT.lua' },
  { code: 'EN', label: '🇺🇸 English', luaFile: 'LanguagePackage_EN.lua' },
  { code: 'SP', label: '🇪🇸 Español', luaFile: 'LanguagePackage_SP.lua' },
  { code: 'FR', label: '🇫🇷 Français', luaFile: 'LanguagePackage_FR.lua' },
  { code: 'ID', label: '🇮🇩 Bahasa Indonesia', luaFile: 'LanguagePackage_ID.lua' },
]

export const SITE_LANGUAGE_CODES = SITE_LANGUAGES.map((l) => l.code)

export const DEFAULT_SITE_LANGUAGE = 'EN'

export function isSiteLanguage(code: string): boolean {
  return SITE_LANGUAGE_CODES.includes(code)
}

/** Asset bundle folder under ui/sprites/languageres/{lang}/ — game codes, not site codes (PT site → po). */
export const SITE_LANGUAGE_BUNDLE_LANG: Record<string, string> = {
  CN: 'cn',
  EN: 'en',
  SP: 'sp',
  ID: 'id',
  PT: 'po',
  FR: 'fr',
}

/** Maps site language code → ui/sprites/languageres/{lang}/ folder (HeroUtil LanguageRes). */
export function getSiteLanguageBundleLang(siteCode: string | undefined): string {
  if (!siteCode) return 'en'
  const upper = siteCode.toUpperCase()
  return SITE_LANGUAGE_BUNDLE_LANG[upper] ?? upper.toLowerCase()
}

export const SITE_BUNDLE_LANGUAGES = [
  ...new Set(SITE_LANGUAGES.map((l) => SITE_LANGUAGE_BUNDLE_LANG[l.code] ?? l.code.toLowerCase())),
]
