import manifest from './asset-manifest.json'

export const IMAGE_UNAVAILABLE = '/assets/image-unavailable.svg'

const MANIFEST_PATHS = new Set(manifest.paths)
const MANIFEST_BY_LOWER = new Map<string, string>(
  manifest.paths.map((path) => [path.toLowerCase(), path])
)
const MISSING_CACHE_KEY = 'rb2_asset_missing_v2'

const runtimeMissing = new Set<string>()

function readSessionMissing(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = sessionStorage.getItem(MISSING_CACHE_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? new Set(parsed.filter((v) => typeof v === 'string')) : new Set()
  } catch {
    return new Set()
  }
}

function persistSessionMissing() {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(MISSING_CACHE_KEY, JSON.stringify([...runtimeMissing]))
  } catch {
    /* quota / private mode */
  }
}

function ensureRuntimeMissingLoaded() {
  if (runtimeMissing.size > 0 || typeof window === 'undefined') return
  readSessionMissing().forEach((url) => runtimeMissing.add(url))
}

function missingKey(url: string): string {
  return (getCanonicalAssetPath(url) ?? url).toLowerCase()
}

/** Resolve manifest path (case-insensitive filename match). */
export function getCanonicalAssetPath(url: string | undefined): string | undefined {
  if (!url) return undefined
  if (MANIFEST_PATHS.has(url)) return url
  return MANIFEST_BY_LOWER.get(url.toLowerCase())
}

/** True when a prior load failed this session (skip further network requests). */
export function isAssetMarkedMissing(url: string | undefined): boolean {
  if (!url) return false
  ensureRuntimeMissingLoaded()
  return runtimeMissing.has(missingKey(url))
}

/** True only when the file is listed in the build manifest and not marked missing at runtime. */
export function isAssetAvailable(url: string | undefined): boolean {
  if (!url) return false
  if (!getCanonicalAssetPath(url)) return false
  return !isAssetMarkedMissing(url)
}

/** Manifest-only resolution — safe for SSR / first paint (no session cache). */
export function resolveAssetUrlInitial(
  url: string | undefined,
  fallback: string = IMAGE_UNAVAILABLE
): string {
  if (!url || url === fallback) return fallback
  return getCanonicalAssetPath(url) ?? fallback
}

/**
 * Returns the asset URL when available, otherwise the placeholder — without a network request.
 */
export function resolveAssetUrl(
  url: string | undefined,
  fallback: string = IMAGE_UNAVAILABLE
): string {
  if (!url || url === fallback) return fallback
  const canonical = getCanonicalAssetPath(url)
  if (!canonical || isAssetMarkedMissing(canonical)) return fallback
  return canonical
}

/** Call when a manifest-listed asset fails to load (stale manifest / deleted file). */
export function reportAssetMissing(url: string | undefined): void {
  if (!url || url === IMAGE_UNAVAILABLE) return
  ensureRuntimeMissingLoaded()
  const key = missingKey(url)
  if (runtimeMissing.has(key)) return
  runtimeMissing.add(key)
  persistSessionMissing()
}

export function getManifestAssetCount(): number {
  return manifest.count
}
