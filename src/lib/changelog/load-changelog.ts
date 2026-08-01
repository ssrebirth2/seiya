import type {

  ChangelogEntry,

  ChangelogRelease,

  ChangelogAction,

  LangTextMap,

} from './types'

import { DEFAULT_SITE_LANGUAGE } from '@/lib/i18n/site-languages'

import { isHeroListed } from '@/lib/game/hidden-hero-ids'

import { isCompanionListed } from '@/lib/game/hidden-companion-ids'

import { isForceCardListed } from '@/lib/game/hidden-force-card-ids'

import { isItemListed } from '@/lib/game/hidden-item-ids'



const CHANGELOG_URL = '/data/db-changelog.json'



export async function loadChangelog(): Promise<import('./types').DbChangelogDocument> {

  const res = await fetch(CHANGELOG_URL, { cache: 'no-store' })

  if (!res.ok) {

    return { version: 1, generatedAt: null, releases: [] }

  }

  const data = (await res.json()) as import('./types').DbChangelogDocument

  return {

    version: data.version ?? 1,

    generatedAt: data.generatedAt ?? null,

    releases: Array.isArray(data.releases) ? data.releases : [],

  }

}



export function latestRelease(doc: { releases?: ChangelogRelease[] } | undefined): ChangelogRelease | null {

  return doc?.releases?.[0] ?? null

}



export function pickLangText(map: LangTextMap | undefined, lang: string, fallback = ''): string {

  if (!map) return fallback

  return map[lang] || map[DEFAULT_SITE_LANGUAGE] || map.EN || map.CN || map.PT || fallback

}



export function filterEntries(

  entries: ChangelogEntry[],

  filter: 'all' | 'added' | 'updated' | 'removed'

): ChangelogEntry[] {

  if (filter === 'all') return entries

  return entries.filter((e) => e.action === filter)

}



export type ChangelogEntryGroup = {

  key: string

  /** Catalog owner (hero/companion/…) when entries share one */

  ownerType: string | null

  ownerId: number | null

  href: string | null

  portraitSrc?: string

  title: LangTextMap

  /** Dominant action for badge (added > updated > removed) */

  action: ChangelogAction

  entries: ChangelogEntry[]

}



function isCatalogOwner(type: string | undefined, id: number | null | undefined): boolean {

  if (!type || id == null || !Number.isFinite(Number(id))) return false

  const n = Number(id)

  if (type === 'hero' || type === 'cosmo' || type === 'talent' || type === 'cloth' || type === 'figure' || type === 'hero_star' || type === 'hero_awaken') return isHeroListed(n)

  if (type === 'companion') return isCompanionListed(n)

  if (type === 'force_card') return isForceCardListed(n)

  if (type === 'item') return isItemListed(n)

  return true

}



function isPlaceholderOwnerTitle(

  title: LangTextMap | undefined,

  ownerType: string | null,

  ownerId: number | null

): boolean {

  if (!title || ownerId == null) return false

  const sample = title.EN || title.PT || Object.values(title).find(Boolean) || ''

  return sample === `${ownerType || 'entity'} #${ownerId}` || sample === `#${ownerId}`

}



/** Prefer catalog owner name; never keep skill name / `#id` placeholder as group header. */

export function resolveGroupTitle(group: ChangelogEntryGroup): LangTextMap {

  const fromOwner =

    group.entries.find((e) => e.owner?.title && Object.values(e.owner.title).some(Boolean))?.owner

      ?.title

  if (fromOwner && !isPlaceholderOwnerTitle(fromOwner, group.ownerType, group.ownerId)) {

    return fromOwner

  }

  if (group.title && !isPlaceholderOwnerTitle(group.title, group.ownerType, group.ownerId)) {

    const skillOnly =

      group.entries.length > 0 &&

      group.entries.every((e) => e.entityType === 'skill') &&

      group.entries.some(

        (e) => pickLangText(e.title, 'PT') === pickLangText(group.title, 'PT')

      )

    if (!skillOnly) return group.title

  }

  const catalogSelf = group.entries.find(

    (e) =>

      e.entityType === 'companion' ||

      e.entityType === 'artifact' ||

      e.entityType === 'force_card' ||

      e.entityType === 'item' ||

      e.entityType === 'hero'

  )

  if (catalogSelf?.title) return catalogSelf.title

  return (

    group.title ||

    (group.ownerId != null

      ? {

          EN: `${group.ownerType || 'entity'} #${group.ownerId}`,

          PT: `${group.ownerType || 'entity'} #${group.ownerId}`,

        }

      : { EN: '', PT: '' })

  )

}



/**

 * Keep only entries that map to content the site actually shows.

 * Skills must belong to a catalog owner (hero/companion/…).

 */

export function filterSiteVisibleEntries(entries: ChangelogEntry[]): ChangelogEntry[] {

  return entries.filter((e) => {

    if (e.entityType === 'skill') {

      if (!e.owner) return false

      return isCatalogOwner(e.owner.type, e.owner.id)

    }

    if (e.entityType === 'bond' && !e.href) return false

    if (e.entityType === 'hero' || e.entityType === 'cosmo' || e.entityType === 'talent' || e.entityType === 'cloth' || e.entityType === 'figure' || e.entityType === 'hero_star' || e.entityType === 'hero_awaken') {

      return isHeroListed(Number(e.entityId))

    }

    if (e.entityType === 'companion') return isCompanionListed(Number(e.entityId))

    if (e.entityType === 'force_card') return isForceCardListed(Number(e.entityId))

    if (e.entityType === 'item') return isItemListed(Number(e.entityId))

    return true

  })

}



function groupKey(entry: ChangelogEntry): string {

  if (entry.owner?.type && entry.owner.id != null) {

    return `${entry.owner.type}:${entry.owner.id}`

  }

  if (entry.entityType === 'hero' || entry.entityType === 'cosmo' || entry.entityType === 'talent' || entry.entityType === 'cloth' || entry.entityType === 'figure' || entry.entityType === 'hero_star' || entry.entityType === 'hero_awaken') {

    return `hero:${entry.entityId}`

  }

  if (

    entry.entityType === 'companion' ||

    entry.entityType === 'artifact' ||

    entry.entityType === 'force_card' ||

    entry.entityType === 'item'

  ) {

    return `${entry.entityType}:${entry.entityId}`

  }

  if (entry.entityType === 'skill') {

    return `drop:skill:${entry.entityId}`

  }

  return `solo:${entry.entityType}:${entry.entityId}`

}



function pickDominantAction(entries: ChangelogEntry[]): ChangelogAction {

  if (entries.some((e) => e.action === 'added')) return 'added'

  if (entries.some((e) => e.action === 'removed') && entries.every((e) => e.action === 'removed')) {

    return 'removed'

  }

  if (entries.some((e) => e.action === 'updated')) return 'updated'

  return entries[0]?.action ?? 'updated'

}



/**

 * Group flat entries by parent character/entity so one hero's skills share a card.

 * Card title is always the catalog owner (hero/companion/…), never a nested skill name.

 */

export function groupEntriesByOwner(

  entries: ChangelogEntry[],

  lookupPool?: ChangelogEntry[]

): ChangelogEntryGroup[] {

  const visible = filterSiteVisibleEntries(entries)

  const map = new Map<string, ChangelogEntry[]>()

  const order: string[] = []

  const pool = lookupPool ?? entries



  for (const entry of visible) {

    const key = groupKey(entry)

    if (key.startsWith('drop:')) continue

    if (!map.has(key)) {

      map.set(key, [])

      order.push(key)

    }

    map.get(key)!.push(entry)

  }



  return order.map((key) => {

    const groupEntries = map.get(key)!

    const withOwner =

      groupEntries.find((e) => e.owner?.title) ||

      groupEntries.find((e) => e.owner) ||

      pool.find((e) => groupKey(e) === key && e.owner?.title) ||

      pool.find((e) => groupKey(e) === key && e.owner)



    const heroId =

      withOwner?.owner?.type === 'hero'

        ? withOwner.owner.id

        : key.startsWith('hero:')

          ? Number(key.slice(5))

          : null



    const heroSelf =

      groupEntries.find((e) => e.entityType === 'hero') ||

      (heroId != null

        ? pool.find((e) => e.entityType === 'hero' && Number(e.entityId) === heroId)

        : undefined)



    const catalogSelf = groupEntries.find(

      (e) =>

        e.entityType === 'companion' ||

        e.entityType === 'artifact' ||

        e.entityType === 'force_card' ||

        e.entityType === 'item'

    )



    const primary =

      heroSelf ||

      catalogSelf ||

      groupEntries.find((e) => e.entityType !== 'skill') ||

      groupEntries[0]



    const ownerType =

      withOwner?.owner?.type ?? (key.startsWith('hero:') ? 'hero' : primary.entityType)

    const ownerId =

      withOwner?.owner?.id ??

      (key.startsWith('hero:') ||

      key.startsWith('companion:') ||

      key.startsWith('artifact:') ||

      key.startsWith('force_card:') ||

      key.startsWith('item:')

        ? Number(String(key.split(':')[1]))

        : null)



    const titledOwner = pool.find(

      (e) => e.owner?.id === ownerId && e.owner?.type === ownerType && e.owner?.title

    )



    const title =

      withOwner?.owner?.title ||

      titledOwner?.owner?.title ||

      heroSelf?.title ||

      (catalogSelf && catalogSelf.entityType !== 'skill' ? catalogSelf.title : undefined) ||

      (primary.entityType !== 'skill' ? primary.title : undefined)



    const fallbackTitle: LangTextMap =

      title ||

      (ownerId != null

        ? {

            EN: `${ownerType || 'entity'} #${ownerId}`,

            PT: `${ownerType || 'entity'} #${ownerId}`,

            CN: `${ownerType || 'entity'} #${ownerId}`,

            SP: `${ownerType || 'entity'} #${ownerId}`,

            FR: `${ownerType || 'entity'} #${ownerId}`,

            ID: `${ownerType || 'entity'} #${ownerId}`,

          }

        : primary.title)



    const group: ChangelogEntryGroup = {

      key,

      ownerType: ownerType || null,

      ownerId: Number.isFinite(ownerId as number) ? (ownerId as number) : null,

      href: withOwner?.owner?.href || heroSelf?.href || catalogSelf?.href || primary.href,

      portraitSrc:

        heroSelf?.portraitSrc ||

        catalogSelf?.portraitSrc ||

        withOwner?.owner?.portraitSrc ||

        withOwner?.portraitSrc ||

        titledOwner?.owner?.portraitSrc ||

        primary.portraitSrc ||

        groupEntries.find((e) => e.portraitSrc)?.portraitSrc,

      title: fallbackTitle,

      action: pickDominantAction(groupEntries),

      entries: groupEntries,

    }



    // Normalize: if we somehow still have a placeholder, re-resolve from entries

    group.title = resolveGroupTitle(group)

    return group

  })

}


