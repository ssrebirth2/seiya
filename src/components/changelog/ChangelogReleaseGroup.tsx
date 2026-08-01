'use client'

import { ChangelogOwnerGroupCard } from '@/components/changelog/ChangelogOwnerGroupCard'
import {
  filterEntries,
  filterSiteVisibleEntries,
  groupEntriesByOwner,
} from '@/lib/changelog/load-changelog'
import type { ChangelogEntryGroup } from '@/lib/changelog/load-changelog'
import type { ChangelogAction, ChangelogRelease } from '@/lib/changelog/types'
import { useLanguage } from '@/context/language-context'
import { useUiTranslation } from '@/lib/i18n/use-ui-translation'

type ChangelogReleaseGroupProps = {
  release: ChangelogRelease
  entries?: ChangelogRelease['entries']
  compact?: boolean
  showSummary?: boolean
  maxGroups?: number
  filter?: 'all' | 'added' | 'updated' | 'removed'
  defaultCollapsed?: boolean
}

const SECTION_ORDER: ChangelogAction[] = ['added', 'updated', 'removed']

function formatSyncDate(iso: string, lang: string): string {
  try {
    return new Intl.DateTimeFormat(
      lang === 'CN'
        ? 'zh-CN'
        : lang === 'PT'
          ? 'pt-BR'
          : lang === 'SP'
            ? 'es'
            : lang === 'FR'
              ? 'fr'
              : lang === 'ID'
                ? 'id'
                : 'en',
      { dateStyle: 'long' }
    ).format(new Date(iso))
  } catch {
    return iso.slice(0, 10)
  }
}

function sectionTitle(
  action: ChangelogAction,
  site: (key: 'changelogSectionAdded' | 'changelogSectionRemoved' | 'changelogSectionUpdated') => string
): string {
  if (action === 'added') return site('changelogSectionAdded')
  if (action === 'removed') return site('changelogSectionRemoved')
  return site('changelogSectionUpdated')
}

function partitionByAction(groups: ChangelogEntryGroup[]) {
  const map: Record<ChangelogAction, ChangelogEntryGroup[]> = {
    added: [],
    updated: [],
    removed: [],
  }
  for (const g of groups) {
    map[g.action].push(g)
  }
  return map
}

export function ChangelogReleaseGroup({
  release,
  entries,
  compact = false,
  showSummary = true,
  maxGroups,
  filter = 'all',
  defaultCollapsed = true,
}: ChangelogReleaseGroupProps) {
  const { lang } = useLanguage()
  const { site } = useUiTranslation()
  const source = entries ?? release.entries
  const filtered = filterSiteVisibleEntries(filterEntries(source, filter))
  const groups = groupEntriesByOwner(filtered, release.entries)
  const shown = maxGroups != null ? groups.slice(0, maxGroups) : groups
  const hiddenCount = groups.length - shown.length
  const sections = partitionByAction(shown)

  const visibleSummary = { added: 0, updated: 0, removed: 0 }
  for (const e of filtered) {
    visibleSummary[e.action] = (visibleSummary[e.action] || 0) + 1
  }

  const totalEntries = release.totalEntries ?? release.entries.length
  const collapsed = release.collapsed
  const collapsedTotal = collapsed
    ? Object.values(collapsed).reduce((sum, n) => sum + (Number(n) || 0), 0)
    : 0
  // Only show omit note when the JSON actually dropped entries (legacy capped releases)
  const showCollapseNote =
    collapsedTotal > 0 && totalEntries > release.entries.length && release.entries.length > 0

  const summaryAdded = release.summary?.added ?? visibleSummary.added
  const summaryUpdated = release.summary?.updated ?? visibleSummary.updated
  const summaryRemoved = release.summary?.removed ?? visibleSummary.removed

  return (
    <article className="patch-notes-release">
      <header className="patch-notes-release__header">
        <div>
          <p className="patch-notes-release__eyebrow">{site('changelogPatchLabel')}</p>
          <h3 className="patch-notes-release__date">
            <time dateTime={release.syncedAt}>{formatSyncDate(release.syncedAt, lang)}</time>
          </h3>
        </div>
        {showSummary ? (
          <div className="patch-notes-release__stats">
            {summaryAdded > 0 ? (
              <span className="patch-notes-tag patch-notes-tag--added">
                +{summaryAdded}
              </span>
            ) : null}
            {summaryUpdated > 0 ? (
              <span className="patch-notes-tag patch-notes-tag--updated">
                ~{summaryUpdated}
              </span>
            ) : null}
            {summaryRemoved > 0 ? (
              <span className="patch-notes-tag patch-notes-tag--removed">
                −{summaryRemoved}
              </span>
            ) : null}
          </div>
        ) : null}
      </header>

      {showCollapseNote ? (
        <p className="patch-notes-release__collapse text-text-muted">
          {site('changelogShowingOf')
            .replace('{shown}', String(release.entries.length))
            .replace('{total}', String(totalEntries))}
          {' — '}
          {site('changelogOmitted')}:{' '}
          {Object.entries(collapsed!)
            .map(([type, count]) => `${type} ${count}`)
            .join(', ')}
        </p>
      ) : null}

      <div className="patch-notes-release__body">
        {SECTION_ORDER.map((action) => {
          const list = sections[action]
          if (!list.length) return null
          return (
            <section key={action} className={`patch-notes-section patch-notes-section--${action}`}>
              <h4 className="patch-notes-section__title">{sectionTitle(action, site)}</h4>
              <div className="patch-notes-section__list">
                {list.map((group) => (
                  <ChangelogOwnerGroupCard
                    key={group.key}
                    group={group}
                    compact={compact}
                    defaultCollapsed={defaultCollapsed}
                  />
                ))}
              </div>
            </section>
          )
        })}
      </div>

      {hiddenCount > 0 ? (
        <p className="patch-notes-release__more">
          +{hiddenCount} {site('changelogChanges')}
        </p>
      ) : null}
    </article>
  )
}
