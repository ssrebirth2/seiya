'use client'

import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { ChangelogDiffText, listChangedLangCodes } from '@/components/changelog/ChangelogDiffText'
import GameImage from '@/components/ui/GameImage'
import { IMAGE_UNAVAILABLE } from '@/lib/assets/game-images'
import { pickLangText, resolveGroupTitle } from '@/lib/changelog/load-changelog'
import type { ChangelogEntryGroup } from '@/lib/changelog/load-changelog'
import {
  isTextChangeField,
  summarizeStructuralChange,
} from '@/lib/changelog/meaningful'
import type { ChangelogChange, ChangelogEntry, ChangelogEntityType } from '@/lib/changelog/types'
import { useLanguage } from '@/context/language-context'
import { useHeroTypeLabels } from '@/hooks/use-hero-type-labels'
import {
  heroTypeFieldOf,
  parseHeroTypeId,
  type HeroTypeField,
} from '@/lib/game/hero-type-fields'
import { useLocalizedHref } from '@/lib/i18n/localized-href'
import { UI_KEYS } from '@/lib/i18n/ui-keys'
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

type Translate = ReturnType<typeof useUiTranslation>

function entityLabel(entityType: ChangelogEntityType, { site }: Translate): string {
  return site(ENTITY_SITE_KEY[entityType] ?? 'changelogEntityItem')
}

function nestedScopeLabel(field: string, entityType: ChangelogEntityType, ui: Translate): string | null {
  if (field.startsWith('role.') || field === 'role') {
    const hero = ui.site('changelogEntityHero')
    return hero === entityLabel(entityType, ui) ? null : hero
  }
  if (field.startsWith('cloth.') || field === 'cloth') {
    const cloth = ui.t(UI_KEYS.hero.cloth)
    return cloth === entityLabel(entityType, ui) ? null : cloth
  }
  return null
}

function qualifyFieldLabel(
  base: string,
  field: string,
  entityType: ChangelogEntityType,
  ui: Translate
): string {
  const entity = entityLabel(entityType, ui)
  const nested = nestedScopeLabel(field, entityType, ui)
  if (nested) return `${base} · ${entity} · ${nested}`
  return `${base} · ${entity}`
}

function fieldLabel(field: string, entityType: ChangelogEntityType, ui: Translate): string {
  const { t, site } = ui
  if (field === 'name' || field.endsWith('.name')) {
    return qualifyFieldLabel(site('changelogFieldName'), field, entityType, ui)
  }
  if (field === 'desc' || field.endsWith('.desc')) {
    return qualifyFieldLabel(t(UI_KEYS.common.description), field, entityType, ui)
  }
  if (field === 'role_introduction') return t(UI_KEYS.common.roleIntro)
  if (field === 'role_features') return t(UI_KEYS.common.briefIntro)
  if (field === 'occupation' || field.endsWith('.occupation')) return t(UI_KEYS.filter.class)
  if (field === 'camp' || field.endsWith('.camp')) return t(UI_KEYS.filter.faction)
  if (field === 'stance' || field.endsWith('.stance')) return t(UI_KEYS.filter.position)
  if (field === 'damagetype' || field.endsWith('.damagetype')) return t(UI_KEYS.filter.damageType)
  if (field === 'quality' || field.endsWith('.quality')) return t(UI_KEYS.common.quality)
  if (field === 'steps' && entityType === 'hero_awaken') return t(UI_KEYS.common.awakening)
  if (field === 'steps' || field.startsWith('star:')) return t(UI_KEYS.hero.starUp)
  if (field === 'cd') return t(UI_KEYS.common.cooldown)
  if (field === 'skill_type' || field === 'skill_des' || field.startsWith('skill_sketch')) {
    return site('changelogEntitySkill')
  }
  if (field === 'label_list') return site('tags')
  if (field === 'general_item') return site('changelogGenericItem')
  if (field === 'consume' || field.endsWith(':consume')) return t(UI_KEYS.common.materials)
  if (field.endsWith(':skill_up') || field === 'skill_up') return site('changelogSkillUnlocks')
  if (field === 'role' || field.startsWith('role.')) return t(UI_KEYS.hero.figures)
  if (field.startsWith('cloth')) return t(UI_KEYS.hero.cloth)
  return entityLabel(entityType, ui)
}

function structuralLineTitle(
  key: string,
  entityType: ChangelogEntityType,
  ui: Translate
): string {
  const starMatch = /^star:(\d+)(?::(.+))?$/.exec(key)
  if (starMatch) {
    const star = ui.site('changelogStarLevel').replace('{n}', starMatch[1])
    if (!starMatch[2]) return star
    return `${star} — ${fieldLabel(starMatch[2], entityType, ui)}`
  }
  return fieldLabel(key, entityType, ui)
}

function PatchSkillLine({ entry }: { entry: ChangelogEntry }) {
  const { lang } = useLanguage()
  const ui = useUiTranslation()
  const { site } = ui
  const rawTitle = pickLangText(entry.title, lang, String(entry.entityId))
  const title =
    rawTitle === String(entry.entityId) ? site('changelogEntitySkill') : rawTitle

  const textChanges = (entry.changes || []).filter(
    (c) => isTextChangeField(c.field) || c.field.startsWith('skill_sketch')
  )
  const sketchChanges = textChanges.filter((c) => c.field.startsWith('skill_sketch'))
  const mainChanges = textChanges.filter((c) => !c.field.startsWith('skill_sketch'))
  const otherChanges = (entry.changes || []).filter((c) => !textChanges.includes(c))
  const langCodes = [...new Set(mainChanges.flatMap((c) => listChangedLangCodes(c, lang)))]
  const hasDiff = mainChanges.length > 0 || sketchChanges.length > 0 || otherChanges.length > 0

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
          {otherChanges.map((change) => (
            <StructuralChangeBlock
              key={change.field}
              change={change}
              entityType={entry.entityType}
            />
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

function HeroTypeChip({
  src,
  label,
  struck = false,
}: {
  src: string
  label: string
  struck?: boolean
}) {
  if (!src && !label) return null

  return (
    <span className={`patch-notes-enum__chip${struck ? ' patch-notes-enum__chip--before' : ''}`}>
      {src ? (
        <GameImage
          src={src}
          rawSrc={src}
          alt={label}
          title={label || undefined}
          className="patch-notes-enum__icon"
          width={20}
          height={20}
        />
      ) : null}
      {label ? <span className="patch-notes-enum__name">{label}</span> : null}
    </span>
  )
}

function HeroTypeShift({
  field,
  beforeId,
  afterId,
}: {
  field: HeroTypeField
  beforeId: number | null
  afterId: number | null
}) {
  const resolve = useHeroTypeLabels()
  if (beforeId == null && afterId == null) return null
  const before = beforeId != null ? resolve(field, beforeId) : null
  const after = afterId != null ? resolve(field, afterId) : null
  return (
    <span className="patch-notes-enum">
      {before ? <HeroTypeChip src={before.src} label={before.label} struck /> : null}
      {before && after ? (
        <span className="patch-notes-enum__arrow" aria-hidden="true">
          →
        </span>
      ) : null}
      {after ? <HeroTypeChip src={after.src} label={after.label} /> : null}
    </span>
  )
}

function StructuralChangeBlock({
  change,
  entityType,
}: {
  change: ChangelogChange
  entityType: ChangelogEntityType
}) {
  const { lang } = useLanguage()
  const ui = useUiTranslation()
  const deltas = summarizeStructuralChange(change, lang)
  if (deltas.length === 0) return null

  return (
    <ul className="patch-notes-line__deltas">
      {deltas.map((delta) => {
        const typeField = heroTypeFieldOf(delta.key)
        const beforeId = typeField && delta.before != null ? Number(delta.before) : NaN
        const afterId = typeField && delta.after != null ? Number(delta.after) : NaN
        const enumShift =
          typeField && (Number.isFinite(beforeId) || Number.isFinite(afterId)) ? (
            <HeroTypeShift
              field={typeField}
              beforeId={Number.isFinite(beforeId) ? beforeId : null}
              afterId={Number.isFinite(afterId) ? afterId : null}
            />
          ) : null

        return (
          <li key={delta.key} className="patch-notes-line__delta">
            <span className="patch-notes-line__delta-label">
              {structuralLineTitle(delta.key, entityType, ui)}
            </span>
            {enumShift ? (
              enumShift
            ) : delta.before || delta.after ? (
              <span className="patch-notes-line__delta-values">
                {delta.before ? <s>{delta.before}</s> : null}
                {delta.before && delta.after ? ' → ' : null}
                {delta.after || null}
              </span>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

function listSimpleChanges(
  entries: ChangelogEntry[]
): { change: ChangelogChange; entityType: ChangelogEntityType; entryId: string }[] {
  const seen = new Set<string>()
  const out: { change: ChangelogChange; entityType: ChangelogEntityType; entryId: string }[] = []
  for (const entry of entries) {
    for (const change of entry.changes || []) {
      const key = `${entry.id}:${change.field}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ change, entityType: entry.entityType, entryId: entry.id })
    }
  }
  return out
}

function PatchHeroTypeLine({
  change,
  entityType,
}: {
  change: ChangelogChange
  entityType: ChangelogEntityType
}) {
  const { lang } = useLanguage()
  const ui = useUiTranslation()
  const field = heroTypeFieldOf(change.field)
  if (!field) return null
  const beforeId = parseHeroTypeId(change.before, lang)
  const afterId = parseHeroTypeId(change.after, lang)
  if (beforeId == null && afterId == null) return null

  return (
    <li className="patch-notes-line">
      <div className="patch-notes-line__row">
        <span className="patch-notes-line__dot" aria-hidden="true" />
        <span className="patch-notes-line__title">{fieldLabel(change.field, entityType, ui)}</span>
        <HeroTypeShift field={field} beforeId={beforeId} afterId={afterId} />
      </div>
    </li>
  )
}

function PatchFieldLine({
  change,
  entityType,
}: {
  change: ChangelogChange
  entityType: ChangelogEntityType
}) {
  const { lang } = useLanguage()
  const ui = useUiTranslation()
  if (heroTypeFieldOf(change.field)) {
    return <PatchHeroTypeLine change={change} entityType={entityType} />
  }
  const isText = isTextChangeField(change.field)
  const langCodes = isText ? listChangedLangCodes(change, lang) : []

  return (
    <li className="patch-notes-line">
      <details className="patch-notes-line__details">
        <summary className="patch-notes-line__summary">
          <span className="patch-notes-line__dot" aria-hidden="true" />
          <span className="patch-notes-line__title">{fieldLabel(change.field, entityType, ui)}</span>
          {langCodes.length > 0 ? (
            <span className="patch-notes-line__langs">{langCodes.join(' · ')}</span>
          ) : null}
        </summary>
        <div className="patch-notes-line__body">
          {isText ? (
            <ChangelogDiffText change={change} />
          ) : (
            <StructuralChangeBlock change={change} entityType={entityType} />
          )}
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

  const skillEntries = group.entries.filter(
    (e) => e.entityType === 'skill' && (e.action === 'removed' || Boolean(e.changes?.length))
  )
  const selfEntries = group.entries.filter(
    (e) =>
      e.entityType !== 'skill' &&
      (e.entityType === 'hero' ||
        e.entityType === 'cosmo' ||
        e.entityType === 'talent' ||
        e.entityType === group.ownerType)
  )
  const otherEntries = group.entries.filter(
    (e) =>
      e.entityType !== 'skill' &&
      e.entityType !== 'hero' &&
      e.entityType !== 'cosmo' &&
      e.entityType !== 'talent' &&
      e.entityType !== group.ownerType
  )

  const simpleEntries = [
    ...selfEntries.filter((e) => e.changes?.length),
    ...otherEntries,
  ]
  const listedChanges = listSimpleChanges(simpleEntries)
  const lineCount = listedChanges.length + skillEntries.length
  const hasDetails = lineCount > 0
  const changeCount = lineCount
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
              {changeCount > 0 ? (
                <>
                  {changeCount} {site('changelogChanges')}
                </>
              ) : (
                <span className={`patch-notes-tag patch-notes-tag--${group.action}`}>{actionLabel}</span>
              )}
            </p>
          </div>
          {profileLink}
        </div>
      </article>
    )
  }

  const list = hasDetails ? (
    <ul className="patch-notes-unit__list">
      {listedChanges.map(({ change, entityType, entryId }) => (
        <PatchFieldLine
          key={`${entryId}:${change.field}`}
          change={change}
          entityType={entityType}
        />
      ))}
      {skillEntries.map((entry) => (
        <PatchSkillLine key={entry.id} entry={entry} />
      ))}
    </ul>
  ) : null

  const headText = (
    <div className="patch-notes-unit__head-text">
      <p className="patch-notes-unit__name">{title}</p>
      <p className="patch-notes-unit__meta">
        <span className={`patch-notes-tag patch-notes-tag--${group.action}`}>{actionLabel}</span>
        {hasDetails ? (
          <span>
            {changeCount} {site('changelogChanges')}
          </span>
        ) : null}
      </p>
    </div>
  )

  return (
    <article className={`patch-notes-unit ${actionClass}`}>
      <div className="patch-notes-unit__row">
        {hasDetails ? (
          <details className="patch-notes-unit__details" open={!defaultCollapsed}>
            <summary className="patch-notes-unit__summary">
              {portrait}
              {headText}
            </summary>
            {list}
          </details>
        ) : (
          <div className="patch-notes-unit__summary">
            {portrait}
            {headText}
          </div>
        )}
        {profileLink}
      </div>
    </article>
  )
}
