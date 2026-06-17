import { DEFAULT_SITE_LANGUAGE, SITE_LANGUAGE_CODES } from '@/lib/i18n/site-languages'

export function resolveMetadataLang(langParam?: string | string[] | null): string {
  const raw = Array.isArray(langParam) ? langParam[0] : langParam
  const code = raw?.trim().toUpperCase()
  if (code && SITE_LANGUAGE_CODES.includes(code)) return code
  return DEFAULT_SITE_LANGUAGE
}

const OG_LOCALE_MAP: Record<string, string> = {
  EN: 'en_US',
  PT: 'pt_BR',
  CN: 'zh_CN',
  SP: 'es_ES',
  FR: 'fr_FR',
  ID: 'id_ID',
}

export function openGraphLocale(lang: string): string {
  return OG_LOCALE_MAP[lang] ?? 'en_US'
}
