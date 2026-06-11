export type Artifact = {
  id: number
  name: string
  initial_quality: number
  limit?: string
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
