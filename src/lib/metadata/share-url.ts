import { resolveMetadataLang } from '@/lib/metadata/lang'
import { getSiteUrl } from '@/lib/metadata/site-url'

/** Builds a shareable path with ?lang= for the active locale. Preserves hash fragments. */
export function buildShareUrl(pathWithOptionalHash: string, lang: string): string {
  const hashIdx = pathWithOptionalHash.indexOf('#')
  const pathPart = hashIdx >= 0 ? pathWithOptionalHash.slice(0, hashIdx) : pathWithOptionalHash
  const hashPart = hashIdx >= 0 ? pathWithOptionalHash.slice(hashIdx) : ''

  const qIdx = pathPart.indexOf('?')
  const pathname = qIdx >= 0 ? pathPart.slice(0, qIdx) : pathPart
  const params = new URLSearchParams(qIdx >= 0 ? pathPart.slice(qIdx + 1) : '')

  params.set('lang', resolveMetadataLang(lang))

  const qs = params.toString()
  return `${pathname}${qs ? `?${qs}` : ''}${hashPart}`
}

/** Full absolute share URL for clipboard. */
export function buildAbsoluteShareUrl(pathWithOptionalHash: string, lang: string): string {
  const path = buildShareUrl(pathWithOptionalHash, lang)
  const hashIdx = path.indexOf('#')
  const pathPart = hashIdx >= 0 ? path.slice(0, hashIdx) : path
  const hashPart = hashIdx >= 0 ? path.slice(hashIdx) : ''
  return `${getSiteUrl()}${pathPart}${hashPart}`
}
