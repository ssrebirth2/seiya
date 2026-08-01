import { getCanonicalAssetPath } from '@/lib/assets/asset-registry'

/** Supabase SkillConfig.iconpath → public asset URL under /assets/resources/. */
export function convertSkillIconPath(rawPath?: string | null): string {
  if (!rawPath) return ''

  const cleanPath = rawPath.replace(/^\/+/, '').replace(/\\/g, '/')
  const lastSlashIndex = cleanPath.lastIndexOf('/')
  let dir = ''
  let file = cleanPath

  if (lastSlashIndex !== -1) {
    dir = cleanPath.substring(0, lastSlashIndex)
    file = cleanPath.substring(lastSlashIndex + 1)
  }

  // Match game_path_to_public (full path lowercased) + manifest case lookup for older PascalCase files.
  const candidate = `/assets/resources/${dir.toLowerCase()}/${file.toLowerCase()}.png`
  return getCanonicalAssetPath(candidate) ?? candidate
}

/** Icon URL from SkillConfig row — uses iconpath only (no inferred SkillIcon_{id}). */
export function resolveSkillIconUrl(skill: {
  skillid?: unknown
  iconpath?: unknown
}): string {
  return convertSkillIconPath(typeof skill.iconpath === 'string' ? skill.iconpath : null)
}
