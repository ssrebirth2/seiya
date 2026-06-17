import { supabase } from '@/lib/supabase-client'
import { isForceCardListed } from '@/lib/game/hidden-force-card-ids'

type RawEquipmentCatalog = {
  forceCards: Array<{
    id: number
    name: string
    quality: number
    condition: string | null
  }>
  artifacts: Array<{
    id: number
    name: string
    initial_quality: number
    limit: string | null
  }>
}

export async function fetchRawEquipmentCatalog(): Promise<RawEquipmentCatalog> {
  const [cardsRes, infoRes, artifactsRes] = await Promise.all([
    supabase.from('ForceCardItemConfig').select('id, name, quality'),
    supabase.from('ForceCardInfoConfig').select('id, condition'),
    supabase.from('ArtifactConfig').select('id, name, initial_quality, limit'),
  ])

  const infoMap: Record<number, { condition?: string }> = {}
  infoRes.data?.forEach((r) => (infoMap[r.id] = r))

  const forceCards = (cardsRes.data || [])
    .filter((c) => isForceCardListed(c.id))
    .map((c) => ({
    ...c,
    condition: infoMap[c.id]?.condition ?? null,
  }))

  return {
    forceCards,
    artifacts: artifactsRes.data || [],
  }
}
