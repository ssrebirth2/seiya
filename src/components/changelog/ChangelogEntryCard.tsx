'use client'

import Link from 'next/link'
import { MetaChip } from '@/components/ui/v2/MetaChip'
import { ChangelogDiffText } from '@/components/changelog/ChangelogDiffText'
import GameImage from '@/components/ui/GameImage'
import { IMAGE_UNAVAILABLE } from '@/lib/assets/game-images'
import { pickLangText } from '@/lib/changelog/load-changelog'
import type { ChangelogEntry, ChangelogEntityType } from '@/lib/changelog/types'
import { useLanguage } from '@/context/language-context'
import { useLocalizedHref } from '@/lib/i18n/localized-href'
import { useUiTranslation } from '@/lib/i18n/use-ui-translation'

const ENTITY_SITE_KEY: Record<
  ChangelogEntityType,
  | 'changelogEntityHero'
  | 'changelogEntitySkill'
  | 'changelogEntityCompanion'
  | 'changelogEntityArtifact'
  | 'changelogEntityForceCard'
  | 'changelogEntityItem'
  | 'changelogEntityBond'
  | 'changelogEntityCosmo'
  | 'changelogEntityTalent'
  | 'changelogEntityCloth'
  | 'changelogEntityFigure'
  | 'changelogEntityHeroStar'
  | 'changelogEntityHeroAwaken'
> = {
  hero: 'changelogEntityHero',
  skill: 'changelogEntitySkill',
  companion: 'changelogEntityCompanion',
  artifact: 'changelogEntityArtifact',
  force_card: 'changelogEntityForceCard',
  item: 'changelogEntityItem',
  bond: 'changelogEntityBond',
  cosmo: 'changelogEntityCosmo',
  talent: 'changelogEntityTalent',
  cloth: 'changelogEntityCloth',
  figure: 'changelogEntityFigure',
  hero_star: 'changelogEntityHeroStar',
  hero_awaken: 'changelogEntityHeroAwaken',
}

type ChangelogEntryCardProps = {
  entry: ChangelogEntry
  compact?: boolean
}

export function ChangelogEntryCard({ entry, compact = false }: ChangelogEntryCardProps) {
  const { lang } = useLanguage()
  const localized = useLocalizedHref()
  const { site } = useUiTranslation()

  const title = pickLangText(entry.title, lang, String(entry.entityId))
  const actionLabel =
    entry.action === 'added'
      ? site('changelogAdded')
      : entry.action === 'removed'
        ? site('changelogRemoved')
        : site('changelogUpdated')

  const entityLabel = site(ENTITY_SITE_KEY[entry.entityType] ?? 'changelogEntityItem')
  const href = entry.href ? localized(entry.href) : null

  const textChanges = (entry.changes || []).filter(
    (c) =>
      c.field === 'skill_des' ||
      c.field.startsWith('skill_sketch') ||
      c.field === 'name' ||
      c.field === 'desc'
  )
  const otherChanges = (entry.changes || []).filter((c) => !textChanges.includes(c))

  const body = (
    <>
      <div className="db-changelog-entry__meta">
        <span className={`db-changelog-badge db-changelog-badge--${entry.action}`}>{actionLabel}</span>
        <MetaChip>{entityLabel}</MetaChip>
        {entry.owner ? (
          <span className="db-changelog-entry__owner text-text-muted">
            #{entry.owner.id}
            {entry.owner.extraCount ? ` +${entry.owner.extraCount}` : ''}
          </span>
        ) : null}
      </div>
      <h3 className="db-changelog-entry__title">{title}</h3>
      {!compact && textChanges.length > 0 ? (
        <div className="db-changelog-entry__changes">
          {textChanges.slice(0, 3).map((change) => (
            <ChangelogDiffText key={change.field} change={change} />
          ))}
        </div>
      ) : null}
      {!compact && otherChanges.length > 0 ? (
        <ul className="db-changelog-entry__fields">
          {otherChanges.slice(0, 4).map((change) => {
            const before = pickLangText(change.before, lang)
            const after = pickLangText(change.after, lang)
            return (
              <li key={change.field}>
                <span className="db-changelog-entry__field-name">{change.field}</span>
                {before || after ? (
                  <span className="text-text-muted">
                    {before ? <s>{before}</s> : null}
                    {before && after ? ' → ' : null}
                    {after || null}
                  </span>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : null}
    </>
  )

  return (
    <article className={`db-changelog-entry db-changelog-entry--${entry.action}`}>
      <div className="db-changelog-entry__thumb" aria-hidden="true">
        <GameImage
          src={entry.portraitSrc || entry.owner?.portraitSrc || IMAGE_UNAVAILABLE}
          rawSrc={entry.portraitSrc || entry.owner?.portraitSrc}
          alt=""
          width={48}
          height={48}
        />
      </div>
      <div className="db-changelog-entry__body">
        {href ? (
          <Link href={href} className="db-changelog-entry__link">
            {body}
          </Link>
        ) : (
          body
        )}
      </div>
    </article>
  )
}
