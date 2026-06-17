import { supabase } from '@/lib/supabase-client'
import { translateKeys } from '@/lib/i18n/language-package'
import { IMAGE_UNAVAILABLE } from '@/lib/assets/asset-registry'
import {
  fetchHeroHeadIconEntry,
  getHeroSquareHeadUrl,
} from '@/lib/game/fetch-hero-head-icons'
import { isHeroListed } from '@/lib/game/hidden-hero-ids'
import type { EntityMetadataPayload } from '@/lib/metadata/defaults'
import { toPlainMetadataText } from '@/lib/metadata/plain-text'

export async function fetchHeroMetadata(
  heroId: number,
  lang: string
): Promise<EntityMetadataPayload | null> {
  if (!Number.isFinite(heroId) || !isHeroListed(heroId)) return null

  const resourceId = heroId * 10
  const [{ data: hero }, { data: resource }, headEntry] = await Promise.all([
    supabase
      .from('RoleConfig')
      .select('role_introduction, role_features')
      .eq('id', heroId)
      .maybeSingle(),
    supabase
      .from('RoleResourcesConfig')
      .select('role_name')
      .eq('id', resourceId)
      .maybeSingle(),
    fetchHeroHeadIconEntry(heroId),
  ])

  if (!hero || !resource?.role_name) return null

  const introKey = hero.role_introduction || hero.role_features
  const keys = [resource.role_name, introKey].filter(Boolean) as string[]
  const translated = await translateKeys(keys, lang)

  const title = toPlainMetadataText(translated[resource.role_name] || resource.role_name)
  const description = toPlainMetadataText(
    (introKey && translated[introKey]) || translated[resource.role_name] || ''
  )

  const imageUrl = getHeroSquareHeadUrl({ [heroId]: headEntry }, heroId)
  if (imageUrl === IMAGE_UNAVAILABLE) {
    return { title, description, imageUrl: null }
  }

  return { title, description, imageUrl }
}
