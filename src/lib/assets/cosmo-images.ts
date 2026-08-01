import { getCanonicalAssetPath, resolveAssetUrl } from '@/lib/assets/asset-registry'
import cosmoMeta from '@/data/cosmo-meta.json'

export const COSMO_SENSE_LC_KEYS: string[] = cosmoMeta.cosmoSenseLcKeys

export function cosmoBackgroundPath(heroId: number, configPath?: string | null): string {
  let rel = `textures/cosmo/Cosmo_${heroId}.png`
  if (configPath) {
    const normalized = configPath.replace(/^Textures\//i, 'textures/').replace(/\\/g, '/')
    const base = normalized.split('/').pop()
    if (base) rel = `textures/cosmo/${base}.png`
  }
  const canonical = `/assets/resources/${rel}`
  return resolveAssetUrl(getCanonicalAssetPath(canonical) ?? canonical)
}

export function cosmoPointSpritePath(spriteName: string): string {
  const name = spriteName.replace(/\.png$/i, '')
  const canonical = `/assets/resources/ui/sprites/common/${name}.png`
  return resolveAssetUrl(getCanonicalAssetPath(canonical) ?? canonical)
}
