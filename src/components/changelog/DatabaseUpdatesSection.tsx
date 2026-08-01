'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Surface } from '@/components/ui/v2/Surface'
import { EmptyState } from '@/components/ui/v2/EmptyState'
import { LoadingSkeleton } from '@/components/ui/v2/LoadingSkeleton'
import { ChangelogReleaseGroup } from '@/components/changelog/ChangelogReleaseGroup'
import { useDbChangelog } from '@/hooks/use-db-changelog'
import { useLocalizedHref } from '@/lib/i18n/localized-href'
import { useUiTranslation } from '@/lib/i18n/use-ui-translation'

const HOME_RELEASE_LIMIT = 2
const HOME_GROUPS_PER_RELEASE = 16

type Filter = 'all' | 'added' | 'updated'

export function DatabaseUpdatesSection() {
  const { site } = useUiTranslation()
  const localized = useLocalizedHref()
  const { data, isLoading, isError } = useDbChangelog()
  const [filter, setFilter] = useState<Filter>('all')

  const releases = data?.releases ?? []
  const shownReleases = releases.slice(0, HOME_RELEASE_LIMIT)
  const hasHistory = releases.length > 1
  const hasAnyEntries = releases.some((r) => r.entries?.length > 0)

  return (
    <Surface as="section" className="db-changelog patch-notes-shell">
      <header className="db-changelog__header">
        <div>
          <h2 className="db-changelog__title font-display">{site('changelogTitle')}</h2>
          <p className="db-changelog__subtitle">{site('changelogSubtitle')}</p>
        </div>
        {hasAnyEntries ? (
          <div className="db-changelog__filters" role="tablist" aria-label={site('changelogTitle')}>
            {(
              [
                ['all', 'changelogFilterAll'],
                ['added', 'changelogAdded'],
                ['updated', 'changelogUpdated'],
              ] as const
            ).map(([value, key]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={filter === value}
                className={`db-changelog__filter${filter === value ? ' is-active' : ''}`}
                onClick={() => setFilter(value)}
              >
                {site(key)}
              </button>
            ))}
          </div>
        ) : null}
      </header>

      {isLoading ? <LoadingSkeleton variant="page" /> : null}

      {!isLoading && (isError || !hasAnyEntries) ? (
        <EmptyState message={site('changelogEmpty')} />
      ) : null}

      {!isLoading && hasAnyEntries ? (
        <>
          <div className="patch-notes-feed">
            {shownReleases.map((release) => (
              <ChangelogReleaseGroup
                key={release.id}
                release={release}
                filter={filter}
                maxGroups={HOME_GROUPS_PER_RELEASE}
                defaultCollapsed
              />
            ))}
          </div>
          {hasHistory || (releases[0]?.entries.length ?? 0) > HOME_GROUPS_PER_RELEASE ? (
            <div className="db-changelog__footer">
              <Link href={localized('/changelog')} className="db-changelog__view-all">
                {site('changelogViewAll')}
              </Link>
            </div>
          ) : null}
        </>
      ) : null}
    </Surface>
  )
}
