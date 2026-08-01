'use client'

import { Surface } from '@/components/ui/v2/Surface'
import { EmptyState } from '@/components/ui/v2/EmptyState'
import { LoadingSkeleton } from '@/components/ui/v2/LoadingSkeleton'
import { ChangelogReleaseGroup } from '@/components/changelog/ChangelogReleaseGroup'
import { useDbChangelog } from '@/hooks/use-db-changelog'
import { useUiTranslation } from '@/lib/i18n/use-ui-translation'

export default function ChangelogClient() {
  const { site } = useUiTranslation()
  const { data, isLoading, isError } = useDbChangelog()
  const releases = data?.releases ?? []

  return (
    <div className="page-stack animate-slideUp">
      <header className="mb-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          {site('changelogPatchLabel')}
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {site('changelogPageTitle')}
        </h1>
        <p className="mt-2 max-w-2xl text-text-muted">{site('changelogSubtitle')}</p>
      </header>

      <Surface as="section" className="db-changelog patch-notes-shell db-changelog--page">
        {isLoading ? <LoadingSkeleton variant="page" /> : null}
        {!isLoading && (isError || releases.length === 0) ? (
          <EmptyState message={site('changelogEmpty')} />
        ) : null}
        {!isLoading && releases.length > 0 ? (
          <div className="patch-notes-feed">
            {releases.map((release) => (
              <ChangelogReleaseGroup
                key={release.id}
                release={release}
                defaultCollapsed={false}
              />
            ))}
          </div>
        ) : null}
      </Surface>
    </div>
  )
}
