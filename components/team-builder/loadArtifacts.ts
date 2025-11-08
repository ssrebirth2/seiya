import { supabase } from '@/lib/supabase'

export type Artifact = {
  id: number
  name: string
  initial_quality: number
  limit?: string
}

export async function loadArtifacts() {
  const { data } = await supabase.from('ArtifactConfig').select('id,name,initial_quality,limit')
  return (data || []) as Artifact[]
}

export function canEquipArtifact(hero: any, artifact: Artifact): boolean {
  if (!artifact?.limit) return true
  try {
    const limits = JSON.parse(artifact.limit)
    return limits.every((c: any) => {
      const val =
        c.type === 'stance'
          ? hero.stance
          : c.type === 'damagetype'
          ? hero.damagetype
          : c.type === 'occupation'
          ? hero.occupation
          : c.type === 'camp'
          ? hero.camp
          : null
      return !c.value?.length || c.value.includes(Number(val))
    })
  } catch {
    return true
  }
}
