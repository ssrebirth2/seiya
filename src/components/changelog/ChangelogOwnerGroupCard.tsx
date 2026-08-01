'use client'

import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { ChangelogDiffText, listChangedLangCodes } from '@/components/changelog/ChangelogDiffText'
import GameImage from '@/components/ui/GameImage'
import { IMAGE_UNAVAILABLE } from '@/lib/assets/game-images'
import { pickLangText, resolveGroupTitle } from '@/lib/changelog/load-changelog'
import type { ChangelogEntryGroup } from '@/lib/changelog/load-changelog'
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

function PatchSkillLine({ entry }: { entry: ChangelogEntry }) {
  const { lang } = useLanguage()
  const { site } = useUiTranslation()
  const rawTitle = pickLangText(entry.title, lang, String(entry.entityId))
  const title =
    rawTitle === String(entry.entityId) && entry.owner?.title
      ? pickLangText(entry.owner.title, lang, rawTitle)
      : rawTitle

  const mainChanges = (entry.changes || []).filter(
    (c) => c.field === 'skill_des' || c.field === 'name' || c.field === 'desc'
  )
  const sketchChanges = (entry.changes || []).filter((c) => c.field.startsWith('skill_sketch'))
  const langCodes = [...new Set(mainChanges.flatMap((c) => listChangedLangCodes(c, lang)))]
  const hasDiff = mainChanges.length > 0 || sketchChanges.length > 0

  if (!hasDiff) {
    return (
      <li className="patch-notes-line">
        <span className="patch-notes-line__dot" aria-hidden="true" />
        <span className="patch-notes-line__title">{title}</span>
      </li>
    )
  }

  return (
    <li className="patch-notes-line">
      <details className="patch-notes-line__details">
        <summary className="patch-notes-line__summary">
          <span className="patch-notes-line__dot" aria-hidden="true" />
          <span className="patch-notes-line__title">{title}</span>
          {langCodes.length > 0 ? (
            <span className="patch-notes-line__langs">{langCodes.join(' · ')}</span>
          ) : null}
        </summary>
        <div className="patch-notes-line__body">
          {mainChanges.map((change) => (
            <ChangelogDiffText key={change.field} change={change} />
          ))}
          {sketchChanges.length > 0 ? (
            <details className="patch-notes-line__levels">
              <summary>{site('changelogSkillLevels')}</summary>
              {sketchChanges.slice(0, 3).map((change) => (
                <ChangelogDiffText key={change.field} change={change} />
              ))}
            </details>
          ) : null}
        </div>
      </details>
    </li>
  )
}

function PatchSimpleLine({ entry }: { entry: ChangelogEntry }) {
  const { lang } = useLanguage()
  const { site } = useUiTranslation()
  const title = pickLangText(entry.title, lang, String(entry.entityId))
  const mainChanges = (entry.changes || []).filter(
    (c) => c.field === 'name' || c.field === 'desc' || c.field === 'skill_des'
  )

  if (mainChanges.length === 0) {
    return (
      <li className="patch-notes-line">
        <span className="patch-notes-line__dot" aria-hidden="true" />
        <span className="patch-notes-line__title">{title}</span>
      </li>
    )
  }

  return (
    <li className="patch-notes-line">
      <details className="patch-notes-line__details">
        <summary className="patch-notes-line__summary">
          <span className="patch-notes-line__dot" aria-hidden="true" />
          <span className="patch-notes-line__title">{title}</span>
          <span className="patch-notes-line__langs">
            {site(ENTITY_SITE_KEY[entry.entityType] ?? 'changelogEntityItem')}
          </span>
        </summary>
        <div className="patch-notes-line__body">
          {mainChanges.slice(0, 2).map((change) => (
            <ChangelogDiffText key={change.field} change={change} />
          ))}
        </div>
      </details>
    </li>
  )
}

type ChangelogOwnerGroupCardProps = {
  group: ChangelogEntryGroup
  compact?: boolean
  defaultCollapsed?: boolean
}

export function ChangelogOwnerGroupCard({
  group,
  compact = false,
  defaultCollapsed = true,
}: ChangelogOwnerGroupCardProps) {
  const { lang } = useLanguage()
  const localized = useLocalizedHref()
  const { site } = useUiTranslation()

  const title = pickLangText(
    resolveGroupTitle(group),
    lang,
    group.ownerId != null ? `#${group.ownerId}` : ''
  )
  const href = group.href ? localized(group.href) : null
  const ownerEntityType = (group.ownerType || 'hero') as ChangelogEntityType

  const skillEntries = group.entries.filter((e) => e.entityType === 'skill')
  const otherEntries = group.entries.filter(
    (e) => e.entityType !== 'skill' && e.entityType !== 'hero' && e.entityType !== 'cosmo' && e.entityType !== 'talent'
  )
  const selfEntries = group.entries.filter(
    (e) =>
      e.entityType === 'hero' ||
      e.entityType === 'cosmo' ||
      e.entityType === 'talent' ||
      (e.entityType === group.ownerType && e.entityType !== 'skill')
  )

  const lineEntries = [...selfEntries.filter((e) => e.changes?.length), ...otherEntries, ...skillEntries]
  const changeCount = group.entries.length
  const actionClass = `patch-notes-unit--${group.action}`

  const portraitSrc =
    group.portraitSrc ||
    (group.ownerType === 'force_card' && group.ownerId != null
      ? `/assets/resources/textures/dynamis/card/Card_small_${group.ownerId}.png`
      : group.ownerType === 'artifact' && group.ownerId != null
        ? `/assets/resources/textures/artifact/artifactskill/skillicon/SkillIcon_${group.ownerId}00.png`
        : undefined)

  const portrait = (
    <GameImage
      src={portraitSrc || IMAGE_UNAVAILABLE}
      rawSrc={portraitSrc}
      alt=""
      className="patch-notes-unit__portrait"
      width={40}
      height={40}
    />
  )

  const profileLink = href ? (
    <Link href={href} className="patch-notes-unit__profile" prefetch={false}>
      <ExternalLink size={13} aria-hidden="true" />
      <span className="patch-notes-unit__profile-label">{site('changelogOpenProfile')}</span>
    </Link>
  ) : null

  const actionLabel =
    group.action === 'added'
      ? site('changelogAdded')
      : group.action === 'removed'
        ? site('changelogRemoved')
        : site('changelogUpdated')

  if (compact) {
    return (
      <article className={`patch-notes-unit ${actionClass}`}>
        <div className="patch-notes-unit__row">
          {portrait}
          <div className="patch-notes-unit__head-text">
            <p className="patch-notes-unit__name">{title}</p>
            <p className="patch-notes-unit__meta">
              {changeCount} {site('changelogChanges')}
            </p>
          </div>
          {profileLink}
        </div>
      </article>
    )
  }

  const list = (
    <ul className="patch-notes-unit__list">
      {lineEntries.length === 0 ? (
        <li className="patch-notes-line">
          <span className="patch-notes-line__dot" aria-hidden="true" />
          <span className="patch-notes-line__title">
            {site(ENTITY_SITE_KEY[ownerEntityType] ?? 'changelogEntityHero')}
          </span>
        </li>
      ) : (
        lineEntries.map((entry) =>
          entry.entityType === 'skill' ? (
            <PatchSkillLine key={entry.id} entry={entry} />
          ) : (
            <PatchSimpleLine key={entry.id} entry={entry} />
          )
        )
      )}
    </ul>
  )

  return (
    <article className={`patch-notes-unit ${actionClass}`}>
      <div className="patch-notes-unit__row">
        <details className="patch-notes-unit__details" open={!defaultCollapsed}>
          <summary className="patch-notes-unit__summary">
            {portrait}
            <div className="patch-notes-unit__head-text">
              <p className="patch-notes-unit__name">{title}</p>
              <p className="patch-notes-unit__meta">
                <span className={`patch-notes-tag patch-notes-tag--${group.action}`}>{actionLabel}</span>
                <span>
                  {changeCount} {site('changelogChanges')}
                </span>
              </p>
            </div>
          </summary>
          {list}
        </details>
        {profileLink}
      </div>
    </article>
  )
}
