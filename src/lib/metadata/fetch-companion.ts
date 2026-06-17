import { supabase } from '@/lib/supabase-client'
import { translateKeys } from '@/lib/i18n/language-package'
import { resolveCompanionPreviewAsset } from '@/lib/assets/game-images'
import { IMAGE_UNAVAILABLE } from '@/lib/assets/asset-registry'
import { isCompanionListed } from '@/lib/game/hidden-companion-ids'
import type { EntityMetadataPayload } from '@/lib/metadata/defaults'
import { toPlainMetadataText } from '@/lib/metadata/plain-text'

export async function fetchCompanionMetadata(
  companionId: number,
  lang: string
): Promise<EntityMetadataPayload | null> {
  if (!Number.isFinite(companionId) || !isCompanionListed(companionId)) return null

  const { data: spirit } = await supabase
    .from('SpiritConfig')
    .select('name, desc, skins')
    .eq('id', companionId)
    .maybeSingle()

  if (!spirit?.name) return null

  const { data: res } = spirit.skins
    ? await supabase
        .from('ArtifactResourcesConfig')
        .select('preview_icon')
        .eq('id', spirit.skins)
        .maybeSingle()
    : { data: null }

  const keys = [spirit.name, spirit.desc].filter(Boolean) as string[]
  const translated = await translateKeys(keys, lang)

  const title = toPlainMetadataText(translated[spirit.name] || spirit.name)
  const description = toPlainMetadataText(
    (spirit.desc && translated[spirit.desc]) || translated[spirit.name] || ''
  )

  const { src } = resolveCompanionPreviewAsset(res?.preview_icon, spirit.skins)
  const imageUrl = src !== IMAGE_UNAVAILABLE ? src : null

  return { title, description, imageUrl }
}
