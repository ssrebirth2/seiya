import { createClient } from '@supabase/supabase-js'
import { contentHash, normalizeDesList, normalizeJson, collectLcKeysFromDesLists } from './hash.mjs'
import { emptySnapshot, SITE_LANGS } from './schema.mjs'
import { isListed } from './hidden.mjs'

const PAGE = 1000

function pushOwner(skillOwners, skillId, owner) {
  const id = Number(skillId)
  if (!Number.isFinite(id) || !owner) return
  if (!skillOwners[id]) skillOwners[id] = []
  if (!skillOwners[id].some((o) => o.type === owner.type && o.id === owner.id)) {
    skillOwners[id].push(owner)
  }
}

/** Propagate ownership to nested sub_skills (stance skills on hero profile). */
function expandSubSkillOwners(skillOwners, skillEntities) {
  let guard = 0
  let grew = true
  while (grew && guard < 8) {
    grew = false
    guard++
    for (const [skillId, owners] of Object.entries(skillOwners)) {
      const subs = skillEntities[skillId]?.fields?.sub_skills
      if (!Array.isArray(subs)) continue
      for (const raw of subs) {
        const sid = Number(Array.isArray(raw) ? raw[0] : raw)
        if (!Number.isFinite(sid)) continue
        const before = skillOwners[sid]?.length || 0
        for (const owner of owners) pushOwner(skillOwners, sid, owner)
        if ((skillOwners[sid]?.length || 0) > before) grew = true
      }
    }
  }
}

function extractSkillIdFromInfo(raw) {
  const parsed = normalizeJson(raw)
  if (parsed == null) return null
  if (typeof parsed === 'number' && Number.isFinite(parsed)) return parsed
  if (Array.isArray(parsed)) {
    for (const entry of parsed) {
      if (typeof entry === 'number' && Number.isFinite(entry)) return entry
      if (Array.isArray(entry) && entry.length) {
        const n = Number(entry[0]?.skill_id ?? entry[0])
        if (Number.isFinite(n)) return n
      }
      if (entry && typeof entry === 'object') {
        const n = Number(entry.skill_id ?? entry.skillid ?? entry.id)
        if (Number.isFinite(n)) return n
      }
    }
  }
  if (typeof parsed === 'object') {
    const n = Number(parsed.skill_id ?? parsed.skillid ?? parsed.id)
    if (Number.isFinite(n)) return n
  }
  return null
}

async function fetchAll(sb, table, columns, { filter } = {}) {
  const rows = []
  let from = 0
  for (;;) {
    let q = sb.from(table).select(columns).range(from, from + PAGE - 1)
    if (filter) q = filter(q)
    const { data, error } = await q
    if (error) throw new Error(`${table}: ${error.message}`)
    const batch = data || []
    rows.push(...batch)
    if (batch.length < PAGE) break
    from += PAGE
  }
  return rows
}

/** Chunked `.in('id', …)` for large id lists (PostgREST URL limits). */
async function fetchByIds(sb, table, columns, ids, { idColumn = 'id', stringify = false } = {}) {
  const out = []
  const list = [...ids]
  for (let i = 0; i < list.length; i += 100) {
    const chunk = list.slice(i, i + 100).map((id) => (stringify ? String(id) : id))
    const batch = await fetchAll(sb, table, columns, {
      filter: (q) => q.in(idColumn, chunk),
    })
    out.push(...batch)
  }
  return out
}

async function fetchLcKeys(sb, keys) {
  const unique = [...new Set(keys)].filter((k) => typeof k === 'string' && k.startsWith('LC_'))
  const lc = Object.fromEntries(SITE_LANGS.map((l) => [l, {}]))
  if (unique.length === 0) return lc

  for (const lang of SITE_LANGS) {
    const table = `LanguagePackage_${lang}`
    for (let i = 0; i < unique.length; i += 200) {
      const chunk = unique.slice(i, i + 200)
      const { data, error } = await sb.from(table).select('key, value').in('key', chunk)
      if (error) {
        console.warn(`[changelog] ${table}: ${error.message}`)
        continue
      }
      for (const row of data || []) {
        const val = row.value ?? ''
        if (row.key) lc[lang][row.key] = typeof val === 'string' ? val : String(val ?? '')
      }
    }
  }
  return lc
}

function pick(row, keys) {
  const out = {}
  for (const k of keys) {
    if (row[k] !== undefined) out[k] = normalizeJson(row[k])
  }
  return out
}

function record(fields, extra = {}) {
  return {
    contentHash: contentHash(fields),
    fields,
    ...extra,
  }
}

/**
 * Build a full changelog snapshot from live Supabase tables.
 */
export async function buildSnapshotFromSupabase(sb, hidden) {
  const snap = emptySnapshot()
  const lcKeys = new Set()

  // --- Heroes ---
  const roles = await fetchAll(
    sb,
    'RoleConfig',
    'id, skills, quality, occupation, stance, damagetype, camp, star, stage, role_labels, isRare, role_introduction, role_features, role_skins, role_initial_skins'
  )
  const resources = await fetchAll(sb, 'RoleResourcesConfig', 'id, role_name')
  const resourceById = new Map(resources.map((r) => [Number(r.id), r]))

  let cosmoIds = new Set()
  let talentIds = new Set()
  try {
    const cosmoRows = await fetchAll(sb, 'CosmoConfig', 'id')
    cosmoIds = new Set(cosmoRows.map((r) => Number(r.id)))
  } catch (e) {
    console.warn(`[changelog] CosmoConfig: ${e.message}`)
  }
  try {
    const talentRows = await fetchAll(sb, 'HeroTalentConfig', 'id')
    talentIds = new Set(talentRows.map((r) => Number(r.id)))
  } catch (e) {
    console.warn(`[changelog] HeroTalentConfig: ${e.message}`)
  }

  /** HeroConfig.clothid / hero_star for Overview entities */
  const heroCfgById = new Map()
  try {
    const heroCfgsEarly = await fetchAll(sb, 'HeroConfig', 'id, clothid, hero_star, hero_quality_skill_ids')
    for (const row of heroCfgsEarly) {
      const hid = Number(row.id)
      if (!Number.isFinite(hid)) continue
      heroCfgById.set(hid, row)
    }
  } catch (e) {
    console.warn(`[changelog] HeroConfig early: ${e.message}`)
  }

  const skillOwners = {}

  for (const row of roles) {
    const id = Number(row.id)
    if (!isListed(hidden, 'hero', id)) continue
    const res = resourceById.get(id * 10)
    const nameKey = res?.role_name || `LC_ROLE_role_full_name_${id}`
    if (typeof nameKey === 'string') lcKeys.add(nameKey)

    const skills = normalizeJson(row.skills) || []
    if (Array.isArray(skills)) {
      for (const sid of skills) {
        pushOwner(skillOwners, sid, { type: 'hero', id })
      }
    }

    const roleSkins = normalizeJson(row.role_skins)
    const roleInitialSkins = normalizeJson(row.role_initial_skins)
    const clothid = heroCfgById.get(id)?.clothid ?? null

    snap.entities.hero[String(id)] = record(
      {
        skills: Array.isArray(skills) ? skills.map(Number).filter(Number.isFinite) : [],
        quality: row.quality ?? null,
        occupation: row.occupation ?? null,
        stance: row.stance ?? null,
        damagetype: row.damagetype ?? null,
        camp: row.camp ?? null,
        star: row.star ?? null,
        stage: row.stage ?? null,
        role_labels: normalizeJson(row.role_labels),
        isRare: row.isRare ?? null,
        role_introduction: row.role_introduction ?? null,
        role_features: row.role_features ?? null,
        role_skins: Array.isArray(roleSkins)
          ? roleSkins.map(Number).filter(Number.isFinite)
          : roleSkins,
        role_initial_skins: Array.isArray(roleInitialSkins)
          ? roleInitialSkins.map(Number).filter(Number.isFinite)
          : roleInitialSkins,
        clothid: clothid != null && Number.isFinite(Number(clothid)) ? Number(clothid) : null,
        hasCosmo: cosmoIds.has(id),
        hasTalent: talentIds.has(id),
        nameKey,
      },
      {
        nameKey,
        href: `/heroes/${id}`,
        portraitSrc: `/assets/resources/textures/hero/squareherohead/SquareHeroHead_${id}0.png`,
      }
    )
    if (row.role_introduction && String(row.role_introduction).startsWith('LC_')) {
      lcKeys.add(row.role_introduction)
    }
    if (row.role_features && String(row.role_features).startsWith('LC_')) {
      lcKeys.add(row.role_features)
    }
  }

  // --- Skills ---
  const skills = await fetchAll(
    sb,
    'SkillConfig',
    'skillid, name, iconpath, skill_type, cd, label_list, sub_skills, skill_des, skill_sketch, awaken_skill_des, skill_des_short, skill_sketch_short, skill_quality, skill_condition'
  )

  for (const row of skills) {
    const id = Number(row.skillid)
    if (!Number.isFinite(id)) continue
    const des = normalizeDesList(row.skill_des)
    const sketch = normalizeDesList(row.skill_sketch)
    const awaken = normalizeDesList(row.awaken_skill_des)
    const nameKey = typeof row.name === 'string' ? row.name : null
    if (nameKey) lcKeys.add(nameKey)
    for (const k of collectLcKeysFromDesLists(des, sketch, awaken)) lcKeys.add(k)

    const valueIds = [...des, ...sketch, ...awaken].map((d) => d.value).filter(Boolean)

    snap.entities.skill[String(id)] = record(
      {
        name: nameKey,
        iconpath: row.iconpath ?? null,
        skill_type: row.skill_type ?? null,
        cd: row.cd ?? null,
        label_list: normalizeJson(row.label_list),
        sub_skills: normalizeJson(row.sub_skills),
        skill_des: des,
        skill_sketch: sketch,
        awaken_skill_des: awaken,
        skill_quality: row.skill_quality ?? null,
        skill_condition: row.skill_condition ?? null,
        valueIds,
      },
      { nameKey, valueIds }
    )
  }

  // --- Skill values ---
  try {
    const valueRows = await fetchAll(sb, 'SkillValueConfig', 'skillid, show_value')
    for (const row of valueRows) {
      const id = Number(row.skillid)
      if (!Number.isFinite(id)) continue
      let parsed = normalizeJson(row.show_value)
      if (parsed && !Array.isArray(parsed) && typeof parsed === 'object') {
        parsed = Object.values(parsed)
      }
      if (!Array.isArray(parsed)) parsed = []
      snap.skillValues[String(id)] = parsed
    }
  } catch (e) {
    console.warn(`[changelog] SkillValueConfig: ${e.message}`)
  }

  // --- Companions ---
  try {
    const spirits = await fetchAll(sb, 'SpiritConfig', 'id, name, desc, init_quality, skill_id, isRare, skins')
    const listedSpirits = spirits.filter((r) => isListed(hidden, 'companion', Number(r.id)))
    const listedSkinIds = [...new Set(listedSpirits.map((r) => Number(r.skins)).filter(Number.isFinite))]
    const artRes =
      listedSkinIds.length > 0
        ? await fetchAll(sb, 'ArtifactResourcesConfig', 'id, item_icon, preview_icon', {
            filter: (q) => q.in('id', listedSkinIds),
          })
        : []
    const artById = new Map(artRes.map((r) => [Number(r.id), r]))

    /** List icon path — same resolution as CompanionListIcon (item_icon → preview → skins fallback). */
    function companionPortrait(skinsId) {
      const res = artById.get(Number(skinsId))
      const dbPath = res?.item_icon || res?.preview_icon
      if (dbPath) {
        const relative = String(dbPath).replace(/^Textures\//i, '').replace(/\\/g, '/').toLowerCase()
        return `/assets/resources/textures/${relative}.png`
      }
      if (skinsId != null) {
        const iconName = `ItemIcon_${String(skinsId).replace(/^82/, '128')}`
        return `/assets/resources/textures/primaryspirit/spirit/${iconName}.png`
      }
      return null
    }

    for (const row of listedSpirits) {
      const id = Number(row.id)
      const nameKey = row.name || `LC_SPIRIT_name_${id}`
      const descKey = row.desc || `LC_SPIRIT_desc_${id}`
      if (typeof nameKey === 'string') lcKeys.add(nameKey)
      if (typeof descKey === 'string' && descKey.startsWith('LC_')) lcKeys.add(descKey)
      const skillId = Number(row.skill_id)
      if (Number.isFinite(skillId)) {
        pushOwner(skillOwners, skillId, { type: 'companion', id })
      }
      snap.entities.companion[String(id)] = record(
        {
          name: nameKey,
          desc: descKey,
          init_quality: row.init_quality ?? null,
          skill_id: Number.isFinite(skillId) ? skillId : null,
          isRare: row.isRare ?? null,
          skins: row.skins ?? null,
        },
        {
          nameKey,
          href: `/companions/${id}`,
          portraitSrc: companionPortrait(row.skins),
        }
      )
    }
  } catch (e) {
    console.warn(`[changelog] SpiritConfig: ${e.message}`)
  }

  // --- Artifacts ---
  try {
    const artifacts = await fetchAll(
      sb,
      'ArtifactConfig',
      'id, name, desc, initial_quality, initial_star, initial_level, camp, camp_type, limit, label_list, isRare'
    )
    for (const row of artifacts) {
      const id = Number(row.id)
      const nameKey = row.name || `LC_ARTIFACT_artifact_name_${id}`
      const descKey = row.desc || `LC_ARTIFACT_artifact_desc_${id}`
      if (typeof nameKey === 'string') lcKeys.add(nameKey)
      if (typeof descKey === 'string' && descKey.startsWith('LC_')) lcKeys.add(descKey)
      snap.entities.artifact[String(id)] = record(
        {
          name: nameKey,
          desc: descKey,
          initial_quality: row.initial_quality ?? null,
          initial_star: row.initial_star ?? null,
          initial_level: row.initial_level ?? null,
          camp: row.camp ?? null,
          camp_type: row.camp_type ?? null,
          limit: row.limit ?? null,
          label_list: normalizeJson(row.label_list),
          isRare: row.isRare ?? null,
        },
        {
          nameKey,
          href: `/artifacts/${id}`,
          portraitSrc: `/assets/resources/textures/artifact/artifactskill/skillicon/SkillIcon_${id}00.png`,
        }
      )
    }
  } catch (e) {
    console.warn(`[changelog] ArtifactConfig: ${e.message}`)
  }

  // --- Force cards ---
  try {
    const cards = await fetchAll(sb, 'ForceCardItemConfig', 'id, name, desc, quality, star')
    for (const row of cards) {
      const id = Number(row.id)
      if (!isListed(hidden, 'force_card', id)) continue
      const nameKey = row.name || `LC_Force_card_name_${id}`
      const descKey = row.desc || `LC_Force_card_des_${id}`
      if (typeof nameKey === 'string') lcKeys.add(nameKey)
      if (typeof descKey === 'string' && descKey.startsWith('LC_')) lcKeys.add(descKey)
      snap.entities.force_card[String(id)] = record(
        {
          name: nameKey,
          desc: descKey,
          quality: row.quality ?? null,
          star: row.star ?? null,
        },
        {
          nameKey,
          href: `/force-cards/${id}`,
          portraitSrc: `/assets/resources/textures/dynamis/card/Card_small_${id}.png`,
        }
      )
    }
  } catch (e) {
    console.warn(`[changelog] ForceCardItemConfig: ${e.message}`)
  }

  // --- Items ---
  try {
    const items = await fetchAll(
      sb,
      'ItemConfig',
      'id, name, desc, quality, type, child_type, compose, get_path, des_value, isRare, icon_path'
    )
    for (const row of items) {
      const id = Number(row.id)
      if (!isListed(hidden, 'item', id)) continue
      // type 5 = force-card bag slot — skip catalog noise
      if (Number(row.type) === 5) continue
      const nameKey = row.name || `LC_ITEM_itemname_${id}`
      const descKey = row.desc || `LC_ITEM_itemdes_${id}`
      if (typeof nameKey === 'string') lcKeys.add(nameKey)
      if (typeof descKey === 'string' && descKey.startsWith('LC_')) lcKeys.add(descKey)
      snap.entities.item[String(id)] = record(
        {
          name: nameKey,
          desc: descKey,
          quality: row.quality ?? null,
          type: row.type ?? null,
          child_type: row.child_type ?? null,
          compose: normalizeJson(row.compose),
          get_path: normalizeJson(row.get_path),
          des_value: normalizeJson(row.des_value),
          isRare: row.isRare ?? null,
          icon_path: row.icon_path ?? null,
        },
        {
          nameKey,
          href: `/items/${id}`,
          portraitSrc: row.icon_path
            ? `/assets/resources/textures/${String(row.icon_path)
                .replace(/^Textures\//i, '')
                .replace(/\\/g, '/')
                .toLowerCase()}.png`
            : undefined,
        }
      )
    }
  } catch (e) {
    console.warn(`[changelog] ItemConfig: ${e.message}`)
  }

  // --- Bonds (fetters) ---
  try {
    const fetters = await fetchAll(sb, 'HeroFettersConfig', 'id, name, condition, active_skill, attribute')
    for (const row of fetters) {
      const id = Number(row.id)
      const nameKey = row.name || `LC_ROLE_Fetters_${id}`
      if (typeof nameKey === 'string') lcKeys.add(nameKey)
      snap.entities.bond[String(id)] = record(
        {
          kind: 'fetter',
          name: nameKey,
          condition: normalizeJson(row.condition),
          active_skill: row.active_skill ?? null,
          attribute: normalizeJson(row.attribute),
        },
        { nameKey }
      )
    }
  } catch (e) {
    console.warn(`[changelog] HeroFettersConfig: ${e.message}`)
  }

  try {
    const combos = await fetchAll(
      sb,
      'HeroRelationSkillConfig',
      'id, name, hero_id, hero_list, skill_id, type'
    )
    for (const row of combos) {
      const id = `combo_${row.id}`
      const nameKey = typeof row.name === 'string' ? row.name : null
      if (nameKey) lcKeys.add(nameKey)
      const heroId = Number(row.hero_id)
      const skillId = Number(row.skill_id)
      // Combo skill belongs to the launcher hero (HeroRelationSkillConfig.hero_id)
      if (Number.isFinite(heroId) && isListed(hidden, 'hero', heroId) && Number.isFinite(skillId)) {
        pushOwner(skillOwners, skillId, { type: 'hero', id: heroId })
      }
      snap.entities.bond[id] = record(
        {
          kind: 'combo',
          name: nameKey,
          hero_id: Number.isFinite(heroId) ? heroId : null,
          hero_list: normalizeJson(row.hero_list),
          skill_id: row.skill_id ?? null,
          type: row.type ?? null,
        },
        {
          nameKey,
          href: Number.isFinite(heroId) && isListed(hidden, 'hero', heroId) ? `/heroes/${heroId}` : null,
          portraitSrc:
            Number.isFinite(heroId) && isListed(hidden, 'hero', heroId)
              ? `/assets/resources/textures/hero/squareherohead/SquareHeroHead_${heroId}0.png`
              : null,
        }
      )
    }
  } catch (e) {
    console.warn(`[changelog] HeroRelationSkillConfig: ${e.message}`)
  }

  // --- Cosmo (per hero) ---
  try {
    const cosmoRows = await fetchAll(sb, 'CosmoConfig', 'id, payload')
    for (const row of cosmoRows) {
      const id = Number(row.id)
      if (!isListed(hidden, 'hero', id)) continue
      const hero = snap.entities.hero[String(id)]
      const payload = normalizeJson(row.payload)
      snap.entities.cosmo[String(id)] = record(
        {
          payload,
        },
        {
          nameKey: hero?.nameKey || null,
          href: `/heroes/${id}`,
          portraitSrc: hero?.portraitSrc,
        }
      )
    }
  } catch (e) {
    console.warn(`[changelog] CosmoConfig fields: ${e.message}`)
  }

  // --- Talent trees (per hero) ---
  try {
    const talentRows = await fetchAll(sb, 'HeroTalentConfig', 'id, talent_layers, skill_layers')
    for (const row of talentRows) {
      const id = Number(row.id)
      if (!isListed(hidden, 'hero', id)) continue
      const hero = snap.entities.hero[String(id)]
      snap.entities.talent[String(id)] = record(
        {
          talent_layers: normalizeJson(row.talent_layers),
          skill_layers: normalizeJson(row.skill_layers),
        },
        {
          nameKey: hero?.nameKey || null,
          href: `/heroes/${id}`,
          portraitSrc: hero?.portraitSrc,
        }
      )
    }
  } catch (e) {
    console.warn(`[changelog] HeroTalentConfig fields: ${e.message}`)
  }

  // --- Hero Overview: cloth / figures / star-up / awaken (keyed by heroId) ---
  function clothArrayField(payload, index) {
    const row = normalizeJson(payload)
    return Array.isArray(row) ? row[index] : null
  }

  function partPathFromPayload(payload) {
    const row = normalizeJson(payload)
    if (row && typeof row === 'object' && !Array.isArray(row)) {
      const path = row['5'] ?? row[5]
      return typeof path === 'string' ? path : null
    }
    return null
  }

  function figureFromPayload(payload, fallbackId) {
    const row = normalizeJson(payload)
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      return { id: fallbackId, name: null, desc: null, figure_path: null, icon_path: null, quality: null }
    }
    return {
      id: Number(row['1'] ?? fallbackId) || fallbackId,
      name: typeof row['2'] === 'string' ? row['2'] : null,
      desc: typeof row['3'] === 'string' ? row['3'] : null,
      figure_path: typeof row['5'] === 'string' ? row['5'] : null,
      icon_path: typeof row['6'] === 'string' ? row['6'] : null,
      quality: row['10'] != null && Number.isFinite(Number(row['10'])) ? Number(row['10']) : null,
    }
  }

  function starStepFromPayload(payload, fallbackId) {
    const row = normalizeJson(payload)
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      return { id: fallbackId, consume: null, general_item: null, skill_up: null }
    }
    return {
      id: Number(row['1'] ?? fallbackId) || fallbackId,
      consume: normalizeJson(row['6']),
      general_item: row['7'] != null && Number.isFinite(Number(row['7'])) ? Number(row['7']) : null,
      skill_up: normalizeJson(row['3']),
    }
  }

  try {
    const clothIds = [
      ...new Set(
        [...heroCfgById.entries()]
          .filter(([hid]) => isListed(hidden, 'hero', hid) && snap.entities.hero[String(hid)])
          .map(([, row]) => Number(row.clothid))
          .filter(Number.isFinite)
      ),
    ]

    const clothById = new Map()
    const galleryById = new Map()
    const partById = new Map()

    if (clothIds.length) {
      const clothRows = await fetchByIds(sb, 'ClothConfig', 'id, payload', clothIds)
      for (const row of clothRows) clothById.set(Number(row.id), row.payload)

      try {
        const galleryRows = await fetchByIds(sb, 'GalleryClothInfoConfig', 'id, payload', clothIds)
        for (const row of galleryRows) galleryById.set(Number(row.id), row.payload)
      } catch (e) {
        console.warn(`[changelog] GalleryClothInfoConfig: ${e.message}`)
      }

      const partIds = new Set()
      for (const payload of clothById.values()) {
        const parts = clothArrayField(payload, 8)
        if (Array.isArray(parts)) {
          for (const pid of parts) {
            const n = Number(pid)
            if (Number.isFinite(n)) partIds.add(n)
          }
        }
      }
      if (partIds.size) {
        const partRows = await fetchByIds(sb, 'ClothPartConfig', 'id, payload', [...partIds])
        for (const row of partRows) partById.set(Number(row.id), row.payload)
      }
    }

    const figureSids = new Set()
    for (const [hid, cfg] of heroCfgById) {
      if (!isListed(hidden, 'hero', hid) || !snap.entities.hero[String(hid)]) continue
      figureSids.add(8500 + hid)
      const clothid = Number(cfg.clothid)
      if (Number.isFinite(clothid)) figureSids.add(8000 + clothid)
    }

    const figureById = new Map()
    if (figureSids.size) {
      try {
        const figRows = await fetchByIds(sb, 'FigureAttributeConfig', 'id, payload', [...figureSids], {
          stringify: true,
        })
        for (const row of figRows) {
          figureById.set(Number(row.id), figureFromPayload(row.payload, Number(row.id)))
        }
      } catch (e) {
        console.warn(`[changelog] FigureAttributeConfig: ${e.message}`)
      }
    }

    const starIdSet = new Set()
    const heroStarMap = new Map()
    for (const [hid, cfg] of heroCfgById) {
      if (!isListed(hidden, 'hero', hid) || !snap.entities.hero[String(hid)]) continue
      const list = normalizeJson(cfg.hero_star)
      if (!Array.isArray(list) || !list.length) continue
      const ids = list.map(Number).filter(Number.isFinite)
      // Index 0 = base; cost steps are [1..]
      const costIds = ids.slice(1)
      heroStarMap.set(hid, costIds)
      costIds.forEach((i) => starIdSet.add(i))
    }

    const starById = new Map()
    if (starIdSet.size) {
      try {
        const starRows = await fetchByIds(sb, 'HeroStarUpConfig', 'id, payload', [...starIdSet])
        for (const row of starRows) {
          starById.set(Number(row.id), starStepFromPayload(row.payload, Number(row.id)))
        }
      } catch (e) {
        console.warn(`[changelog] HeroStarUpConfig: ${e.message}`)
      }
    }

    const awakenIdSet = new Set()
    const heroAwakenConsumeMap = new Map()
    try {
      const awakenCfgs = await fetchAll(sb, 'HeroAwakenConfig', 'id, awaken_list')
      for (const row of awakenCfgs) {
        const heroId = Number(row.id)
        if (!isListed(hidden, 'hero', heroId) || !snap.entities.hero[String(heroId)]) continue
        const list = normalizeJson(row.awaken_list)
        if (!Array.isArray(list) || !list.length) continue
        const ids = list.map(Number).filter(Number.isFinite)
        heroAwakenConsumeMap.set(heroId, ids)
        ids.forEach((i) => awakenIdSet.add(i))
      }
    } catch (e) {
      console.warn(`[changelog] HeroAwakenConfig overview: ${e.message}`)
    }

    const awakenInfoById = new Map()
    if (awakenIdSet.size) {
      try {
        const infos = await fetchAll(
          sb,
          'HeroAwakenInfoConfig',
          'id, awaken_level, consume, add_skill'
        )
        for (const row of infos) {
          awakenInfoById.set(Number(row.id), {
            id: Number(row.id),
            awaken_level: row.awaken_level ?? null,
            consume: normalizeJson(row.consume),
            add_skill: normalizeJson(row.add_skill),
          })
        }
      } catch (e) {
        console.warn(`[changelog] HeroAwakenInfoConfig overview: ${e.message}`)
      }
    }

    for (const heroId of Object.keys(snap.entities.hero).map(Number)) {
      if (!Number.isFinite(heroId)) continue
      const hero = snap.entities.hero[String(heroId)]
      const cfg = heroCfgById.get(heroId)
      const clothid = cfg?.clothid != null && Number.isFinite(Number(cfg.clothid)) ? Number(cfg.clothid) : null

      if (clothid != null && clothById.has(clothid)) {
        const payload = clothById.get(clothid)
        const partIdsRaw = clothArrayField(payload, 8)
        const partIds = Array.isArray(partIdsRaw)
          ? partIdsRaw.map(Number).filter(Number.isFinite)
          : []
        const showIcon = clothArrayField(payload, 5)
        const clothName = clothArrayField(payload, 7)
        const gallery = galleryById.get(clothid)
        const galleryName = clothArrayField(gallery, 2) || (typeof clothName === 'string' ? clothName : null)
        const galleryDesc = clothArrayField(gallery, 3)
        if (typeof galleryName === 'string' && galleryName.startsWith('LC_')) lcKeys.add(galleryName)
        if (typeof galleryDesc === 'string' && galleryDesc.startsWith('LC_')) lcKeys.add(galleryDesc)
        if (typeof clothName === 'string' && clothName.startsWith('LC_')) lcKeys.add(clothName)

        const parts = partIds.map((pid) => ({
          id: pid,
          path: partPathFromPayload(partById.get(pid)),
        }))

        snap.entities.cloth[String(heroId)] = record(
          {
            clothid,
            show_icon_path: typeof showIcon === 'string' ? showIcon : null,
            name: typeof galleryName === 'string' ? galleryName : null,
            desc: typeof galleryDesc === 'string' ? galleryDesc : null,
            part_ids: partIds,
            parts,
          },
          {
            nameKey: hero?.nameKey || null,
            href: `/heroes/${heroId}`,
            portraitSrc: hero?.portraitSrc,
          }
        )
      }

      const roleSid = 8500 + heroId
      const clothSid = clothid != null ? 8000 + clothid : null
      const roleFig =
        figureById.get(roleSid) ||
        ({
          id: roleSid,
          name: `LC_ROLE_role_full_name_${heroId}`,
          desc: hero?.fields?.role_introduction ?? null,
          figure_path: `Textures/Figure/Role/RoleIcon_${heroId}`,
          icon_path: null,
          quality: null,
        })
      const clothFig =
        clothSid != null
          ? figureById.get(clothSid) || {
              id: clothSid,
              name: snap.entities.cloth[String(heroId)]?.fields?.name ?? null,
              desc: snap.entities.cloth[String(heroId)]?.fields?.desc ?? null,
              figure_path: `Textures/Figure/Cloth/ClothIcon_${clothid}`,
              icon_path: null,
              quality: null,
            }
          : null

      for (const fig of [roleFig, clothFig]) {
        if (!fig) continue
        if (typeof fig.name === 'string' && fig.name.startsWith('LC_')) lcKeys.add(fig.name)
        if (typeof fig.desc === 'string' && fig.desc.startsWith('LC_')) lcKeys.add(fig.desc)
      }

      snap.entities.figure[String(heroId)] = record(
        {
          role: {
            sid: roleFig.id,
            name: roleFig.name,
            desc: roleFig.desc,
            figure_path: roleFig.figure_path,
            icon_path: roleFig.icon_path,
            quality: roleFig.quality,
          },
          cloth: clothFig
            ? {
                sid: clothFig.id,
                name: clothFig.name,
                desc: clothFig.desc,
                figure_path: clothFig.figure_path,
                icon_path: clothFig.icon_path,
                quality: clothFig.quality,
              }
            : null,
        },
        {
          nameKey: hero?.nameKey || null,
          href: `/heroes/${heroId}`,
          portraitSrc: hero?.portraitSrc,
        }
      )

      const starCostIds = heroStarMap.get(heroId) || []
      if (starCostIds.length) {
        snap.entities.hero_star[String(heroId)] = record(
          {
            star_ids: starCostIds,
            steps: starCostIds.map((sid, index) => {
              const step = starById.get(sid) || {
                id: sid,
                consume: null,
                general_item: null,
                skill_up: null,
              }
              return {
                id: step.id,
                star_level: index + 1,
                consume: step.consume,
                general_item: step.general_item,
                skill_up: step.skill_up,
              }
            }),
          },
          {
            nameKey: hero?.nameKey || null,
            href: `/heroes/${heroId}`,
            portraitSrc: hero?.portraitSrc,
          }
        )
      }

      const awakenIds = heroAwakenConsumeMap.get(heroId) || []
      if (awakenIds.length) {
        snap.entities.hero_awaken[String(heroId)] = record(
          {
            awaken_ids: awakenIds,
            steps: awakenIds
              .map((aid) => awakenInfoById.get(aid))
              .filter(Boolean)
              .map((step) => ({
                id: step.id,
                awaken_level: step.awaken_level,
                consume: step.consume,
                add_skill: step.add_skill,
              })),
          },
          {
            nameKey: hero?.nameKey || null,
            href: `/heroes/${heroId}`,
            portraitSrc: hero?.portraitSrc,
          }
        )
      }
    }
  } catch (e) {
    console.warn(`[changelog] hero overview entities: ${e.message}`)
  }

  snap.skillOwners = skillOwners

  // Quality / awaken skills (same set the hero profile UI shows)
  try {
    const qualityIdSet = new Set()
    const heroQualityMap = new Map()
    for (const [heroId, row] of heroCfgById) {
      if (!isListed(hidden, 'hero', heroId)) continue
      const qids = normalizeJson(row.hero_quality_skill_ids)
      if (!Array.isArray(qids) || !qids.length) continue
      heroQualityMap.set(heroId, qids.map(Number).filter(Number.isFinite))
      qids.forEach((q) => qualityIdSet.add(Number(q)))
    }
    if (qualityIdSet.size) {
      const qualityRows = await fetchAll(sb, 'HeroQualitySkillConfig', 'id, skill_info')
      const byId = new Map(qualityRows.map((r) => [Number(r.id), r]))
      for (const [heroId, qids] of heroQualityMap) {
        const last = qids[qids.length - 1]
        const skillId = extractSkillIdFromInfo(byId.get(last)?.skill_info)
        if (skillId != null) pushOwner(skillOwners, skillId, { type: 'hero', id: heroId })
      }
    }
  } catch (e) {
    console.warn(`[changelog] quality skills: ${e.message}`)
  }

  try {
    const awakenCfgs = await fetchAll(sb, 'HeroAwakenConfig', 'id, awaken_list')
    const awakenIds = new Set()
    const heroAwakenMap = new Map()
    for (const row of awakenCfgs) {
      const heroId = Number(row.id)
      if (!isListed(hidden, 'hero', heroId)) continue
      const list = normalizeJson(row.awaken_list)
      if (!Array.isArray(list) || !list.length) continue
      const ids = list.map(Number).filter(Number.isFinite)
      heroAwakenMap.set(heroId, ids)
      ids.forEach((i) => awakenIds.add(i))
    }
    if (awakenIds.size) {
      const infos = await fetchAll(sb, 'HeroAwakenInfoConfig', 'id, add_skill')
      const byId = new Map(infos.map((r) => [Number(r.id), r]))
      for (const [heroId, ids] of heroAwakenMap) {
        for (const aid of ids) {
          const skillId = extractSkillIdFromInfo(byId.get(aid)?.add_skill)
          if (skillId != null) {
            pushOwner(skillOwners, skillId, { type: 'hero', id: heroId })
            break
          }
        }
      }
    }
  } catch (e) {
    console.warn(`[changelog] awaken skills: ${e.message}`)
  }

  // Force-card / artifact equipment skills (detail pages) — keep them out of the orphan drop
  function skillIdsFromSkillUp(raw) {
    const parsed = normalizeJson(raw)
    const ids = []
    if (!Array.isArray(parsed)) return ids
    for (const entry of parsed) {
      if (Array.isArray(entry) && entry.length) {
        const n = Number(entry[0])
        if (Number.isFinite(n)) ids.push(n)
      } else if (typeof entry === 'number' && Number.isFinite(entry)) {
        ids.push(entry)
      } else if (entry && typeof entry === 'object') {
        const n = Number(entry.skill_id ?? entry.skillid)
        if (Number.isFinite(n)) ids.push(n)
      }
    }
    return ids
  }

  try {
    const infos = await fetchAll(sb, 'ForceCardInfoConfig', 'id, card_star, card_awaken')
    const starIds = new Set()
    const awakenIds = new Set()
    const cardStarMap = new Map()
    const cardAwakenMap = new Map()
    for (const row of infos) {
      const cardId = Number(row.id)
      if (!isListed(hidden, 'force_card', cardId)) continue
      if (!snap.entities.force_card[String(cardId)]) continue
      const stars = normalizeJson(row.card_star)
      const awakens = normalizeJson(row.card_awaken)
      const starList = Array.isArray(stars) ? stars.map(Number).filter(Number.isFinite) : []
      const awakenList = Array.isArray(awakens) ? awakens.map(Number).filter(Number.isFinite) : []
      cardStarMap.set(cardId, starList)
      cardAwakenMap.set(cardId, awakenList)
      starList.forEach((i) => starIds.add(i))
      awakenList.forEach((i) => awakenIds.add(i))
    }

    const starById = new Map()
    if (starIds.size) {
      const rows = await fetchAll(sb, 'ForceCardStarUpConfig', 'id, skill_up')
      for (const row of rows) starById.set(Number(row.id), row)
    }
    const awakenById = new Map()
    if (awakenIds.size) {
      try {
        const rows = await fetchAll(sb, 'ForceCardAwakenUpConfig', 'id, skill_up')
        for (const row of rows) awakenById.set(Number(row.id), row)
      } catch (e) {
        console.warn(`[changelog] ForceCardAwakenUpConfig: ${e.message}`)
      }
    }

    for (const [cardId, ids] of cardStarMap) {
      for (const configId of ids) {
        for (const skillId of skillIdsFromSkillUp(starById.get(configId)?.skill_up)) {
          pushOwner(skillOwners, skillId, { type: 'force_card', id: cardId })
        }
      }
    }
    for (const [cardId, ids] of cardAwakenMap) {
      for (const configId of ids) {
        for (const skillId of skillIdsFromSkillUp(awakenById.get(configId)?.skill_up)) {
          pushOwner(skillOwners, skillId, { type: 'force_card', id: cardId })
        }
      }
    }
  } catch (e) {
    console.warn(`[changelog] force-card skills: ${e.message}`)
  }

  try {
    const starRows = await fetchAll(sb, 'ArtifactStarConfig', 'artifact_id, skill_up')
    for (const row of starRows) {
      const artifactId = Number(row.artifact_id)
      if (!Number.isFinite(artifactId)) continue
      if (!snap.entities.artifact[String(artifactId)]) continue
      for (const skillId of skillIdsFromSkillUp(row.skill_up)) {
        pushOwner(skillOwners, skillId, { type: 'artifact', id: artifactId })
      }
    }
  } catch (e) {
    console.warn(`[changelog] artifact skills: ${e.message}`)
  }

  expandSubSkillOwners(skillOwners, snap.entities.skill)
  snap.skillOwners = skillOwners

  // Drop skill entities that never appear on the site (no catalog owner)
  const ownedSkillIds = new Set(Object.keys(skillOwners))
  let droppedOrphanSkills = 0
  for (const id of Object.keys(snap.entities.skill)) {
    if (!ownedSkillIds.has(id)) {
      delete snap.entities.skill[id]
      droppedOrphanSkills++
    }
  }
  if (droppedOrphanSkills) {
    console.log(`[changelog] dropped ${droppedOrphanSkills} orphan skills (not used on site)`)
  }

  console.log(`[changelog] fetching ${lcKeys.size} LC keys × ${SITE_LANGS.length} langs…`)
  snap.lc = await fetchLcKeys(sb, [...lcKeys])
  snap.createdAt = new Date().toISOString()
  return snap
}

export function createSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (or anon key)')
  }
  return createClient(url, key)
}
