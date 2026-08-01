import { ACTION_ORDER, ENTITY_ORDER, HERO_SCOPED_ENTITY_TYPES, SITE_LANGS } from './schema.mjs'
import { contentHash } from './hash.mjs'
import { plainDesMap, resolveTitleMap, formatPlainLabel, resolveLc } from './plain-text.mjs'
import { isListed, loadHiddenSets } from './hidden.mjs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const HIDDEN = loadHiddenSets(ROOT)

const OWNER_HREF = {
  hero: (id) => `/heroes/${id}`,
  companion: (id) => `/companions/${id}`,
  artifact: (id) => `/artifacts/${id}`,
  force_card: (id) => `/force-cards/${id}`,
  item: (id) => `/items/${id}`,
}

function fieldChanges(beforeFields, afterFields) {
  const keys = new Set([
    ...Object.keys(beforeFields || {}),
    ...Object.keys(afterFields || {}),
  ])
  const changes = []
  for (const key of keys) {
    if (key === 'nameKey' || key === 'valueIds') continue
    const b = beforeFields?.[key]
    const a = afterFields?.[key]
    if (contentHash({ v: b }) === contentHash({ v: a })) continue
    changes.push({
      field: key,
      before: stringifyField(b),
      after: stringifyField(a),
    })
  }
  return changes
}

function stringifyField(v) {
  if (v == null) return ''
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v)
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}

function langMapFromScalar(value) {
  const s = value == null ? '' : String(value)
  const out = {}
  for (const lang of SITE_LANGS) out[lang] = s
  return out
}

const CATALOG_ENTITY_TYPES = new Set(['hero', 'companion', 'artifact', 'force_card', 'item'])

function isProtectedCatalogAdd(entry) {
  return entry?.action === 'added' && CATALOG_ENTITY_TYPES.has(entry.entityType)
}

function richness(entry) {
  let score = 0
  // Catalog adds must outrank skill-text noise when collapsing a large release
  if (isProtectedCatalogAdd(entry)) score += 250
  if (entry.action === 'added') score += 50
  if (entry.entityType === 'skill' && entry.changes?.some((c) => c.field === 'skill_des')) score += 100
  if (entry.entityType === 'hero') score += 40
  if (CATALOG_ENTITY_TYPES.has(entry.entityType)) score += 30
  if (entry.changes?.length) score += entry.changes.length * 5
  if (entry.action === 'removed') score += 10
  return score
}

const OWNER_PRIORITY = { hero: 0, companion: 1, artifact: 2, force_card: 3, item: 4 }

function pickPrimaryOwner(owners) {
  if (!owners?.length) return undefined
  return [...owners].sort((a, b) => {
    const pa = OWNER_PRIORITY[a.type] ?? 9
    const pb = OWNER_PRIORITY[b.type] ?? 9
    if (pa !== pb) return pa - pb
    return Number(a.id) - Number(b.id)
  })[0]
}

function ownerEntityMap(snap, type) {
  if (type === 'hero') return snap?.entities?.hero
  if (type === 'companion') return snap?.entities?.companion
  if (type === 'artifact') return snap?.entities?.artifact
  if (type === 'force_card') return snap?.entities?.force_card
  if (type === 'item') return snap?.entities?.item
  return null
}

function buildOwner(owners, snap) {
  if (!owners?.length) return undefined
  const primary = pickPrimaryOwner(owners)
  if (!primary) return undefined
  const hrefFn = OWNER_HREF[primary.type]
  const ownerEntity = ownerEntityMap(snap, primary.type)?.[String(primary.id)]
  // Skip owners that never made it into the catalog snapshot (hidden / out of range)
  if (!ownerEntity && (primary.type === 'hero' || primary.type === 'companion')) {
    const rest = owners.filter((o) => !(o.type === primary.type && o.id === primary.id))
    if (rest.length) return buildOwner(rest, snap)
    return undefined
  }
  const nameKey = ownerEntity?.nameKey || ownerEntity?.fields?.name
  const title =
    typeof nameKey === 'string' && nameKey.startsWith('LC_')
      ? resolveTitleMap(snap.lc, nameKey, String(primary.id))
      : typeof nameKey === 'string' && nameKey
        ? langMapFromScalar(nameKey)
        : undefined

  let portraitSrc = ownerEntity?.portraitSrc || null
  if (!portraitSrc && primary.type === 'hero') {
    portraitSrc = `/assets/resources/textures/hero/squareherohead/SquareHeroHead_${primary.id}0.png`
  }

  return {
    type: primary.type,
    id: primary.id,
    href: hrefFn ? hrefFn(primary.id) : null,
    extraCount: Math.max(0, owners.length - 1),
    title,
    portraitSrc: portraitSrc || undefined,
  }
}

function skillTextChanges(prevEntity, nextEntity, prevSnap, nextSnap) {
  const changes = []
  const prevDes = prevEntity?.fields?.skill_des?.[0]
  const nextDes = nextEntity?.fields?.skill_des?.[0]

  if (prevDes || nextDes) {
    const beforeMap = prevDes
      ? plainDesMap(prevSnap.lc, prevDes.des, prevDes.value, prevSnap.skillValues)
      : langMapFromScalar('')
    const afterMap = nextDes
      ? plainDesMap(nextSnap.lc, nextDes.des, nextDes.value, nextSnap.skillValues)
      : langMapFromScalar('')

    const changed = SITE_LANGS.some((l) => (beforeMap[l] || '') !== (afterMap[l] || ''))
    if (changed) {
      changes.push({ field: 'skill_des', before: beforeMap, after: afterMap })
    }
  }

  // Value-only change on same des key
  if (prevDes && nextDes && prevDes.des === nextDes.des) {
    const prevVals = JSON.stringify(prevSnap.skillValues[String(prevDes.value)] || [])
    const nextVals = JSON.stringify(nextSnap.skillValues[String(nextDes.value)] || [])
    if (prevVals !== nextVals && !changes.some((c) => c.field === 'skill_des')) {
      const beforeMap = plainDesMap(prevSnap.lc, prevDes.des, prevDes.value, prevSnap.skillValues)
      const afterMap = plainDesMap(nextSnap.lc, nextDes.des, nextDes.value, nextSnap.skillValues)
      if (SITE_LANGS.some((l) => beforeMap[l] !== afterMap[l])) {
        changes.push({ field: 'skill_des', before: beforeMap, after: afterMap })
      }
    }
  }

  // Sketch level lines (summarize if any level text changed)
  const prevSketch = prevEntity?.fields?.skill_sketch || []
  const nextSketch = nextEntity?.fields?.skill_sketch || []
  const maxLen = Math.max(prevSketch.length, nextSketch.length)
  for (let i = 0; i < maxLen; i++) {
    const p = prevSketch[i]
    const n = nextSketch[i]
    if (!p && !n) continue
    const beforeMap = p
      ? plainDesMap(prevSnap.lc, p.des, p.value, prevSnap.skillValues)
      : langMapFromScalar('')
    const afterMap = n
      ? plainDesMap(nextSnap.lc, n.des, n.value, nextSnap.skillValues)
      : langMapFromScalar('')
    if (SITE_LANGS.some((l) => (beforeMap[l] || '') !== (afterMap[l] || ''))) {
      changes.push({
        field: `skill_sketch[${i}]`,
        before: beforeMap,
        after: afterMap,
      })
      // Cap sketch noise: first changed level is enough for richness, keep all up to 3
      if (changes.filter((c) => c.field.startsWith('skill_sketch')).length >= 3) break
    }
  }

  return changes
}

function nameTitle(entity, snap, fallbackId) {
  const key = entity?.nameKey || entity?.fields?.name || entity?.fields?.nameKey
  if (typeof key === 'string' && key.startsWith('LC_')) {
    return resolveTitleMap(snap.lc, key, String(fallbackId))
  }
  if (typeof key === 'string' && key) {
    return langMapFromScalar(key)
  }
  return langMapFromScalar(String(fallbackId))
}

/** True when title is just the bare id in every language (unresolved LC / missing name). */
function isIdOnlyTitle(title, entityId) {
  if (!title || typeof title !== 'object') return true
  const id = String(entityId)
  return SITE_LANGS.every((lang) => {
    const v = title[lang]
    return v == null || v === '' || String(v) === id
  })
}

function makeEntry({
  entityType,
  action,
  entityId,
  prevEntity,
  nextEntity,
  prevSnap,
  nextSnap,
}) {
  const entity = nextEntity || prevEntity
  const snap = nextSnap || prevSnap
  let title = nameTitle(entity, snap, entityId)
  const owners = (nextSnap || prevSnap).skillOwners?.[String(entityId)] || []
  const owner = entityType === 'skill' ? buildOwner(owners, nextSnap || prevSnap) : undefined

  // Skills not linked to any site catalog entity are noise — never publish
  if (entityType === 'skill' && !owner) return null

  // Force-card / artifact skills often have null SkillConfig.name — use owner card/relic name
  if (entityType === 'skill' && isIdOnlyTitle(title, entityId) && owner?.title) {
    title = owner.title
  }

  let href = entity?.href ?? null
  if (!href && owner?.href) href = owner.href
  if (!href && entityType === 'hero') href = `/heroes/${entityId}`
  if (!href && entityType === 'companion') href = `/companions/${entityId}`
  if (!href && entityType === 'artifact') href = `/artifacts/${entityId}`
  if (!href && entityType === 'force_card') href = `/force-cards/${entityId}`
  if (!href && entityType === 'item') href = `/items/${entityId}`
  if (!href && HERO_SCOPED_ENTITY_TYPES.includes(entityType)) href = `/heroes/${entityId}`

  // Bonds without a hero page link are not shown on the site
  if (entityType === 'bond' && !href) return null

  const changes = []

  if (action === 'updated') {
    if (entityType === 'skill') {
      changes.push(...skillTextChanges(prevEntity, nextEntity, prevSnap, nextSnap))
      const structural = fieldChanges(prevEntity?.fields, nextEntity?.fields).filter(
        (c) =>
          !['skill_des', 'skill_sketch', 'awaken_skill_des', 'valueIds'].includes(c.field)
      )
      for (const c of structural) {
        changes.push({
          field: c.field,
          before: langMapFromScalar(c.before),
          after: langMapFromScalar(c.after),
        })
      }
    } else {
      for (const c of fieldChanges(prevEntity?.fields, nextEntity?.fields)) {
        // Prefer LC-resolved name/desc when field is name or desc key
        if ((c.field === 'name' || c.field === 'desc') && typeof c.after === 'string' && c.after.startsWith('LC_')) {
          changes.push({
            field: c.field,
            before: resolveTitleMap(prevSnap.lc, c.before, c.before),
            after: resolveTitleMap(nextSnap.lc, c.after, c.after),
          })
        } else {
          changes.push({
            field: c.field,
            before: langMapFromScalar(c.before),
            after: langMapFromScalar(c.after),
          })
        }
      }
    }
  }

  // Skip empty updates (hash differed only due to ignored noise — shouldn't happen)
  if (action === 'updated' && changes.length === 0) return null

  const idParts = [entityType, action, String(entityId)]
  if (action === 'updated' && changes[0]) idParts.push(changes[0].field)

  let portraitSrc =
    entity?.portraitSrc ||
    owner?.portraitSrc ||
    (entityType === 'hero'
      ? `/assets/resources/textures/hero/squareherohead/SquareHeroHead_${entityId}0.png`
      : undefined)
  if (!portraitSrc && entityType === 'force_card') {
    portraitSrc = `/assets/resources/textures/dynamis/card/Card_small_${entityId}.png`
  }
  if (!portraitSrc && owner?.type === 'force_card' && owner.id != null) {
    portraitSrc = `/assets/resources/textures/dynamis/card/Card_small_${owner.id}.png`
  }
  if (!portraitSrc && owner?.type === 'artifact' && owner.id != null) {
    portraitSrc = `/assets/resources/textures/artifact/artifactskill/skillicon/SkillIcon_${owner.id}00.png`
  }

  return {
    id: idParts.join(':'),
    action,
    entityType,
    entityId: Number.isFinite(Number(entityId)) && !String(entityId).includes('_')
      ? Number(entityId)
      : entityId,
    href,
    owner,
    title,
    changes: changes.length ? changes : undefined,
    portraitSrc,
  }
}

/**
 * Diff two snapshots → changelog entries.
 */
export function diffSnapshots(prevSnap, nextSnap) {
  const entries = []
  const types = ENTITY_ORDER

  function publishable(entityType, id) {
    // Types without a hidden/cap list always publish
    if (
      entityType === 'skill' ||
      entityType === 'artifact' ||
      entityType === 'bond' ||
      HERO_SCOPED_ENTITY_TYPES.includes(entityType)
    ) {
      // Hero-scoped entities still require a listed hero id
      if (HERO_SCOPED_ENTITY_TYPES.includes(entityType)) {
        return isListed(HIDDEN, 'hero', id)
      }
      return true
    }
    if (entityType === 'hero') return isListed(HIDDEN, 'hero', id)
    if (entityType === 'companion') return isListed(HIDDEN, 'companion', id)
    if (entityType === 'force_card') return isListed(HIDDEN, 'force_card', id)
    if (entityType === 'item') return isListed(HIDDEN, 'item', id)
    return true
  }

  for (const entityType of types) {
    const prevMap = prevSnap.entities[entityType] || {}
    const nextMap = nextSnap.entities[entityType] || {}
    const ids = new Set([...Object.keys(prevMap), ...Object.keys(nextMap)])

    for (const id of ids) {
      const prev = prevMap[id]
      const next = nextMap[id]

      // Ignore catalog-noise: unlisted heroes (e.g. id > 1499) that leaked into an old snapshot
      if (!publishable(entityType, id)) continue

      if (!prev && next) {
        const entry = makeEntry({
          entityType,
          action: 'added',
          entityId: id,
          nextEntity: next,
          nextSnap,
          prevSnap,
        })
        if (entry) entries.push(entry)
        continue
      }
      if (prev && !next) {
        const entry = makeEntry({
          entityType,
          action: 'removed',
          entityId: id,
          prevEntity: prev,
          prevSnap,
          nextSnap,
        })
        if (entry) entries.push(entry)
        continue
      }
      if (prev && next && prev.contentHash !== next.contentHash) {
        const entry = makeEntry({
          entityType,
          action: 'updated',
          entityId: id,
          prevEntity: prev,
          nextEntity: next,
          prevSnap,
          nextSnap,
        })
        if (entry) entries.push(entry)
        continue
      }

      // Same structural hash — still check skill LC / values drift for skills
      if (entityType === 'skill' && prev && next) {
        const textChanges = skillTextChanges(prev, next, prevSnap, nextSnap)
        if (textChanges.length) {
          const entry = makeEntry({
            entityType,
            action: 'updated',
            entityId: id,
            prevEntity: prev,
            nextEntity: next,
            prevSnap,
            nextSnap,
          })
          if (entry) entries.push(entry)
        }
      }
    }
  }

  // Also detect LC-only text changes for catalog entities (same key, different resolved text)
  for (const entityType of ['hero', 'companion', 'artifact', 'force_card', 'item', 'cloth', 'figure']) {
    const prevMap = prevSnap.entities[entityType] || {}
    const nextMap = nextSnap.entities[entityType] || {}
    for (const id of Object.keys(nextMap)) {
      if (!publishable(entityType, id)) continue
      if (!prevMap[id]) continue
      if (prevMap[id].contentHash !== nextMap[id].contentHash) continue
      if (entries.some((e) => e.entityType === entityType && String(e.entityId) === String(id) && e.action === 'updated')) {
        continue
      }

      const changes = []
      const nameKey = nextMap[id].nameKey || nextMap[id].fields?.name
      if (typeof nameKey === 'string' && nameKey.startsWith('LC_')) {
        const nameChanged = SITE_LANGS.some((lang) => {
          const b = resolveLc(prevSnap.lc, nameKey, lang)
          const a = resolveLc(nextSnap.lc, nameKey, lang)
          return formatPlainLabel(b) !== formatPlainLabel(a)
        })
        if (nameChanged) {
          changes.push({
            field: 'name',
            before: resolveTitleMap(prevSnap.lc, nameKey, String(id)),
            after: resolveTitleMap(nextSnap.lc, nameKey, String(id)),
          })
        }
      }

      const descKey = nextMap[id].fields?.desc
      if (typeof descKey === 'string' && descKey.startsWith('LC_')) {
        const descChanged = SITE_LANGS.some((lang) => {
          const b = resolveLc(prevSnap.lc, descKey, lang)
          const a = resolveLc(nextSnap.lc, descKey, lang)
          return formatPlainLabel(b) !== formatPlainLabel(a)
        })
        if (descChanged) {
          changes.push({
            field: 'desc',
            before: resolveTitleMap(prevSnap.lc, descKey, String(id)),
            after: resolveTitleMap(nextSnap.lc, descKey, String(id)),
          })
        }
      }

      const introKey = nextMap[id].fields?.role_introduction
      if (entityType === 'hero' && typeof introKey === 'string' && introKey.startsWith('LC_')) {
        const introChanged = SITE_LANGS.some((lang) => {
          const b = resolveLc(prevSnap.lc, introKey, lang)
          const a = resolveLc(nextSnap.lc, introKey, lang)
          return formatPlainLabel(b) !== formatPlainLabel(a)
        })
        if (introChanged) {
          changes.push({
            field: 'role_introduction',
            before: resolveTitleMap(prevSnap.lc, introKey, String(id)),
            after: resolveTitleMap(nextSnap.lc, introKey, String(id)),
          })
        }
      }

      const featuresKey = nextMap[id].fields?.role_features
      if (entityType === 'hero' && typeof featuresKey === 'string' && featuresKey.startsWith('LC_')) {
        const featuresChanged = SITE_LANGS.some((lang) => {
          const b = resolveLc(prevSnap.lc, featuresKey, lang)
          const a = resolveLc(nextSnap.lc, featuresKey, lang)
          return formatPlainLabel(b) !== formatPlainLabel(a)
        })
        if (featuresChanged) {
          changes.push({
            field: 'role_features',
            before: resolveTitleMap(prevSnap.lc, featuresKey, String(id)),
            after: resolveTitleMap(nextSnap.lc, featuresKey, String(id)),
          })
        }
      }

      // Nested figure LC keys (role/cloth)
      if (entityType === 'figure') {
        for (const side of ['role', 'cloth']) {
          const fig = nextMap[id].fields?.[side]
          if (!fig || typeof fig !== 'object') continue
          for (const field of ['name', 'desc']) {
            const key = fig[field]
            if (typeof key !== 'string' || !key.startsWith('LC_')) continue
            const changed = SITE_LANGS.some((lang) => {
              const b = resolveLc(prevSnap.lc, key, lang)
              const a = resolveLc(nextSnap.lc, key, lang)
              return formatPlainLabel(b) !== formatPlainLabel(a)
            })
            if (changed) {
              changes.push({
                field: `${side}.${field}`,
                before: resolveTitleMap(prevSnap.lc, key, String(id)),
                after: resolveTitleMap(nextSnap.lc, key, String(id)),
              })
            }
          }
        }
      }

      if (!changes.length) continue
      const titleKey = nameKey || String(id)
      entries.push({
        id: `${entityType}:updated:${id}:lc`,
        action: 'updated',
        entityType,
        entityId: Number(id),
        href: nextMap[id].href,
        title:
          typeof nameKey === 'string' && nameKey.startsWith('LC_')
            ? resolveTitleMap(nextSnap.lc, nameKey, String(id))
            : resolveTitleMap(nextSnap.lc, titleKey, String(id)),
        changes,
        portraitSrc: nextMap[id].portraitSrc,
      })
    }
  }

  entries.sort((a, b) => {
    const ao = ACTION_ORDER[a.action] ?? 9
    const bo = ACTION_ORDER[b.action] ?? 9
    if (ao !== bo) return ao - bo
    const ai = ENTITY_ORDER.indexOf(a.entityType)
    const bi = ENTITY_ORDER.indexOf(b.entityType)
    if (ai !== bi) return ai - bi
    return richness(b) - richness(a)
  })

  // Keep every entry — `/changelog` must be able to show the full release.
  // Home teaser truncates via maxGroups in DatabaseUpdatesSection.
  const summary = { added: 0, updated: 0, removed: 0 }
  for (const e of entries) {
    summary[e.action] = (summary[e.action] || 0) + 1
  }

  return { entries, summary, collapsedNote: null, totalEntries: entries.length }
}
