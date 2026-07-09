'use client'

import { useMemo } from 'react'
import { applySkillValues, setupGlobalSkillTooltips } from '@/lib/game/apply-skill-values'
import {
  artifactAscensionQualityLabelKey,
  artifactAscensionQualityToneClass,
  getArtifactTierConsumeSource,
  isArtifactAdvanceAwakenStarQuality,
  sortArtifactStarRows,
  type ArtifactStarRow,
} from '@/lib/game/artifact-equip'
import { normalizeDesValueList, normalizeSkillRefList } from '@/lib/game/parse-game-data'
import { ArtifactMaterialPanel } from '@/components/artifacts/ArtifactMaterialPanel'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'
import { getAwakenStarIconPath, getStarIconPath } from '@/lib/game/hero-ui-sprites'
import GameImage from '@/components/ui/GameImage'
import type { ConsumeRefMap } from '@/lib/game/load-hero-talents-bundle'

setupGlobalSkillTooltips()

export type { ArtifactStarRow } from '@/lib/game/artifact-equip'

type SkillConfig = {
  skillid: number
  name: string
  iconpath?: string
  skill_des?: unknown
  skill_sketch?: unknown
}

type Props = {
  stars: ArtifactStarRow[]
  skill: SkillConfig | null
  artifactId: number
  frameQuality?: number
  itemIconPath?: string | null
  getT: (key?: string) => string
  valuesMap: Record<number, (string | number)[]>
  consumeRefMap?: ConsumeRefMap
  consumeRefReady?: boolean
}

function ArtifactAwakeningGrade({
  qualityLabel,
  starCount,
  advanceAwaken,
  qualityToneClass,
}: {
  qualityLabel: string
  starCount: number
  advanceAwaken: boolean
  qualityToneClass: string
}) {
  const iconSrc = advanceAwaken ? getAwakenStarIconPath() : getStarIconPath()

  return (
    <div className="artifact-ascension__grade" aria-label={`${qualityLabel} ${starCount}`}>
      <span className={`artifact-ascension__quality${qualityToneClass ? ` ${qualityToneClass}` : ''}`}>
        {qualityLabel}
      </span>
      <span
        className={`artifact-ascension__stars${advanceAwaken ? ' artifact-ascension__stars--awaken' : ''}`}
        aria-hidden
      >
        {Array.from({ length: starCount }, (_, index) => (
          <GameImage
            key={`star-${index}`}
            src={iconSrc}
            rawSrc={iconSrc}
            alt=""
            className="artifact-ascension__star-icon"
          />
        ))}
      </span>
    </div>
  )
}

function ArtifactAwakeningRow({
  row,
  qualityLabel,
  effectHtml,
  consumeSource,
  artifactId,
  frameQuality,
  itemIconPath,
  consumeRefMap,
  consumeRefReady,
}: {
  row: ArtifactStarRow
  qualityLabel: string
  effectHtml: string | null
  consumeSource: ArtifactStarRow | null
  artifactId: number
  frameQuality?: number
  itemIconPath?: string | null
  consumeRefMap?: ConsumeRefMap
  consumeRefReady?: boolean
}) {
  const advanceAwaken = isArtifactAdvanceAwakenStarQuality(
    row.config_quality ?? row.quality + 1
  )
  const configQuality = row.config_quality ?? row.quality + 1

  return (
    <li
      className={`artifact-ascension__row${advanceAwaken ? ' artifact-ascension__row--awaken' : ''}`}
    >
      <ArtifactAwakeningGrade
        qualityLabel={qualityLabel}
        starCount={row.star}
        advanceAwaken={advanceAwaken}
        qualityToneClass={artifactAscensionQualityToneClass(configQuality)}
      />

      <div className="artifact-ascension__effect skill-detail-card__prose">
        {effectHtml ? (
          <span dangerouslySetInnerHTML={{ __html: effectHtml }} />
        ) : (
          <span className="force-card-material-empty">—</span>
        )}
      </div>

      <div className="artifact-ascension__consume">
        <ArtifactMaterialPanel
          artifactId={artifactId}
          frameQuality={frameQuality}
          itemIconPath={itemIconPath}
          copies={consumeSource ? (consumeSource.consume_num ?? 0) : 1}
          consumeMoney={consumeSource?.consume_money}
          consumeItem={consumeSource?.consume_item}
          layout="inline"
          consumeRefMap={consumeRefMap}
          consumeRefReady={consumeRefReady}
        />
      </div>
    </li>
  )
}

function ArtifactAscensionRows({
  rows,
  artifactId,
  frameQuality,
  itemIconPath,
  consumeRefMap,
  consumeRefReady,
}: {
  rows: Array<{
    row: ArtifactStarRow
    qualityLabel: string
    effectHtml: string | null
    consumeSource: ArtifactStarRow | null
  }>
  artifactId: number
  frameQuality?: number
  itemIconPath?: string | null
  consumeRefMap?: ConsumeRefMap
  consumeRefReady?: boolean
}) {
  return (
    <ol className="artifact-ascension__list">
      {rows.map(({ row, qualityLabel, effectHtml, consumeSource }) => (
        <ArtifactAwakeningRow
          key={row.id}
          row={row}
          qualityLabel={qualityLabel}
          effectHtml={effectHtml}
          consumeSource={consumeSource}
          artifactId={artifactId}
          frameQuality={frameQuality}
          itemIconPath={itemIconPath}
          consumeRefMap={consumeRefMap}
          consumeRefReady={consumeRefReady}
        />
      ))}
    </ol>
  )
}

export function ArtifactAscensionList({
  stars,
  skill,
  artifactId,
  frameQuality,
  itemIconPath,
  getT,
  valuesMap,
  consumeRefMap,
  consumeRefReady,
}: Props) {
  const { t } = useUiTranslation()

  const sortedRows = useMemo(() => sortArtifactStarRows(stars), [stars])

  const rowsWithEffects = useMemo(() => {
    const sketches = normalizeDesValueList(skill?.skill_sketch)

    return sortedRows.map((row, index) => {
      const skills = normalizeSkillRefList(row.skill_up)
      const skillLv = Number(skills[0]?.skill_lv ?? 0)
      const entry = skillLv > 0 ? sketches[skillLv - 1] : undefined
      const effectHtml =
        entry?.des != null
          ? applySkillValues(getT(entry.des), entry.value ?? 0, valuesMap)
          : null

      return {
        row,
        qualityLabel: getT(artifactAscensionQualityLabelKey(row)),
        effectHtml,
        consumeSource: getArtifactTierConsumeSource(sortedRows, index),
      }
    })
  }, [sortedRows, skill, getT, valuesMap])

  const baseRows = useMemo(
    () =>
      rowsWithEffects.filter(
        ({ row }) =>
          !isArtifactAdvanceAwakenStarQuality(row.config_quality ?? row.quality + 1)
      ),
    [rowsWithEffects]
  )

  const advanceRows = useMemo(
    () =>
      rowsWithEffects.filter(({ row }) =>
        isArtifactAdvanceAwakenStarQuality(row.config_quality ?? row.quality + 1)
      ),
    [rowsWithEffects]
  )

  if (!rowsWithEffects.length) return null

  const listProps = {
    artifactId,
    frameQuality,
    itemIconPath,
    consumeRefMap,
    consumeRefReady,
  }

  return (
    <>
      {baseRows.length > 0 ? (
        <section className="artifact-ascension artifact-ascension--stars">
          <ArtifactAscensionRows rows={baseRows} {...listProps} />
        </section>
      ) : null}

      {advanceRows.length > 0 ? (
        <section
          className="artifact-ascension artifact-ascension--awaken"
          aria-labelledby="artifact-awakening-title"
        >
          <h4 id="artifact-awakening-title" className="skill-detail-card__section-title">
            {t(UI_KEYS.common.awakening)}
          </h4>
          <ArtifactAscensionRows rows={advanceRows} {...listProps} />
        </section>
      ) : null}
    </>
  )
}

export default ArtifactAscensionList
