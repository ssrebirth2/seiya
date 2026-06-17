import { supabase } from '@/lib/supabase-client'
import { translateKeys } from '@/lib/i18n/language-package'
import { resolveForceCardDisplayAsset } from '@/lib/assets/game-images'
import { IMAGE_UNAVAILABLE } from '@/lib/assets/asset-registry'
import { isForceCardListed } from '@/lib/game/hidden-force-card-ids'
import type { EntityMetadataPayload } from '@/lib/metadata/defaults'
import { toPlainMetadataText } from '@/lib/metadata/plain-text'

export async function fetchForceCardMetadata(
  cardId: number,
  lang: string
): Promise<EntityMetadataPayload | null> {
  if (!Number.isFinite(cardId) || !isForceCardListed(cardId)) return null

  const { data: item } = await supabase
    .from('ForceCardItemConfig')
    .select('name, desc, quality')
    .eq('id', cardId)
    .maybeSingle()

  if (!item?.name) return null

  const keys = [item.name, item.desc].filter(Boolean) as string[]
  const translated = await translateKeys(keys, lang)

  const title = toPlainMetadataText(translated[item.name] || item.name)
  const description = toPlainMetadataText(
    (item.desc && translated[item.desc]) || translated[item.name] || ''
  )

  const { cardSrc } = resolveForceCardDisplayAsset(cardId, item.quality)
  const imageUrl = cardSrc !== IMAGE_UNAVAILABLE ? cardSrc : null

  return { title, description, imageUrl }
}
