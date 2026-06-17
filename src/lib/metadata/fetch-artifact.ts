import { supabase } from '@/lib/supabase-client'
import { translateKeys } from '@/lib/i18n/language-package'
import { resolveArtifactPreviewAsset } from '@/lib/assets/game-images'
import { IMAGE_UNAVAILABLE } from '@/lib/assets/asset-registry'
import type { EntityMetadataPayload } from '@/lib/metadata/defaults'
import { toPlainMetadataText } from '@/lib/metadata/plain-text'

export async function fetchArtifactMetadata(
  artifactId: number,
  lang: string
): Promise<EntityMetadataPayload | null> {
  if (!Number.isFinite(artifactId)) return null

  const [{ data: art }, { data: res }] = await Promise.all([
    supabase.from('ArtifactConfig').select('name, desc').eq('id', artifactId).maybeSingle(),
    supabase
      .from('ArtifactResourcesConfig')
      .select('preview_icon')
      .eq('id', artifactId)
      .maybeSingle(),
  ])

  if (!art?.name) return null

  const keys = [art.name, art.desc].filter(Boolean) as string[]
  const translated = await translateKeys(keys, lang)

  const title = toPlainMetadataText(translated[art.name] || art.name)
  const description = toPlainMetadataText(
    (art.desc && translated[art.desc]) || translated[art.name] || ''
  )

  const { src } = resolveArtifactPreviewAsset(res?.preview_icon, artifactId)
  const imageUrl = src !== IMAGE_UNAVAILABLE ? src : null

  return { title, description, imageUrl }
}
