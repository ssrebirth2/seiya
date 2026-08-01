import type { SITE_LANGUAGE_CODES } from '@/lib/i18n/site-languages'

export type SiteLangCode = (typeof SITE_LANGUAGE_CODES)[number] | string

export type ChangelogAction = 'added' | 'updated' | 'removed'

export type ChangelogEntityType =
  | 'hero'
  | 'companion'
  | 'artifact'
  | 'force_card'
  | 'item'
  | 'skill'
  | 'bond'
  | 'cosmo'
  | 'talent'
  | 'cloth'
  | 'figure'
  | 'hero_star'
  | 'hero_awaken'

export type LangTextMap = Partial<Record<SiteLangCode, string>> & Record<string, string>

export type ChangelogChange = {
  field: string
  before?: LangTextMap
  after?: LangTextMap
}

export type ChangelogOwner = {
  type: string
  id: number
  href: string | null
  extraCount?: number
  title?: LangTextMap
  portraitSrc?: string
}

export type ChangelogEntry = {
  id: string
  action: ChangelogAction
  entityType: ChangelogEntityType
  entityId: string | number
  href: string | null
  owner?: ChangelogOwner
  title: LangTextMap
  changes?: ChangelogChange[]
  portraitSrc?: string
}

export type ChangelogRelease = {
  id: string
  syncedAt: string
  summary: { added: number; updated: number; removed: number }
  totalEntries?: number
  collapsed?: Record<string, number>
  entries: ChangelogEntry[]
}

export type DbChangelogDocument = {
  version: number
  generatedAt: string | null
  releases: ChangelogRelease[]
}
