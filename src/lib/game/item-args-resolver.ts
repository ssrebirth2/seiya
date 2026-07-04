export type LinkedEntityKind = 'hero' | 'artifact' | 'spirit' | 'force_card'

export type LinkedEntity = {
  kind: LinkedEntityKind
  id: number
  href: string
}

const toNum = (v: unknown): number | null => {
  if (v == null) return null
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Resolve ItemConfig.args + child_type to a site entity link when possible. */
export function resolveLinkedEntity(
  args: unknown,
  childType: unknown
): LinkedEntity | null {
  const entityId = toNum(args)
  if (entityId == null) return null

  const ct = String(childType ?? '').toLowerCase()

  if (
    ct === 'skin_unlock' ||
    ct === 'hero_coin_gold' ||
    ct === 'hero_coin_silver' ||
    ct === 'hero_coin_copper' ||
    ct === 'hero_coin_color' ||
    ct === 'hero_exp'
  ) {
    return { kind: 'hero', id: entityId, href: `/heroes/${entityId}` }
  }

  if (ct === 'artifact_chip' || ct === 'artifact_gem_chip') {
    return { kind: 'artifact', id: entityId, href: `/artifacts/${entityId}` }
  }

  if (ct === 'spirit_exp') {
    return { kind: 'spirit', id: entityId, href: `/companions/${entityId}` }
  }

  if (ct === 'force_card_exp') {
    return { kind: 'force_card', id: entityId, href: `/force-cards/${entityId}` }
  }

  return null
}
