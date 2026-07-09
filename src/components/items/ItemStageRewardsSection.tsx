'use client'

import type { ReactNode } from 'react'
import type { ItemStageRewardLine, LevelType } from '@/lib/game/item-stage-rewards'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'

type ItemStageRewardsSectionProps = {
  lines: ItemStageRewardLine[]
  /** Progress milestones use chapter + condition + progress pill. */
  variant?: 'default' | 'progress'
}

type RewardHighlight = 'first_clear' | 'stage_drop' | 'fixed' | 'progress'

const HIGHLIGHT_CLASS: Record<RewardHighlight, string> = {
  first_clear: 'first-clear',
  stage_drop: 'stage-drop',
  fixed: 'fixed',
  progress: 'progress',
}

function InlineDifficulty({ label, levelType }: { label: string; levelType?: LevelType }) {
  const modifier =
    levelType === 2 ? 'elite' : levelType === 3 ? 'nightmare' : levelType === 1 ? 'story' : 'unknown'
  return (
    <span className={`item-stage-rewards__difficulty item-stage-rewards__difficulty--${modifier}`}>
      {label}
    </span>
  )
}

function RewardQuantities({ quantities }: { quantities: number[] }) {
  const { t } = useUiTranslation()

  if (!quantities.length) return null

  const value = quantities.map((qty) => qty.toLocaleString()).join(' · ')
  const accessibleLabel = `${t(UI_KEYS.common.num)} ${value}`

  return (
    <span className="item-stage-rewards__qty" aria-label={accessibleLabel}>
      <span className="item-stage-rewards__qty-label">{t(UI_KEYS.common.num)}</span>
      <span className="item-stage-rewards__qty-value">{value}</span>
    </span>
  )
}

function InlineTypeBadge({
  highlight,
  label,
}: {
  highlight: RewardHighlight
  label: string
}) {
  return (
    <span
      className={`item-stage-rewards__type item-stage-rewards__type--${HIGHLIGHT_CLASS[highlight]} item-stage-rewards__type--inline`}
      title={label}
    >
      {label}
    </span>
  )
}

function RewardRow({
  className,
  quantities,
  difficulty,
  typeTags,
  chapter,
  detail,
  detailVariant,
}: {
  className?: string
  quantities: number[]
  difficulty?: ReactNode
  typeTags?: ReactNode
  chapter?: string
  detail?: ReactNode
  detailVariant?: 'stage'
}) {
  const detailClassName =
    detailVariant === 'stage'
      ? 'item-stage-rewards__detail item-stage-rewards__detail--stage'
      : 'item-stage-rewards__detail'

  const hasPills = Boolean(difficulty || typeTags)
  const hasInfo = Boolean(chapter || detail)

  return (
    <li className={className ? `item-stage-rewards__row ${className}` : 'item-stage-rewards__row'}>
      <div className="item-stage-rewards__leading">
        {hasPills ? (
          <div className="item-stage-rewards__pills">
            {difficulty}
            {typeTags}
          </div>
        ) : null}
        {hasInfo ? (
          <div className="item-stage-rewards__info">
            {chapter ? <span className="item-stage-rewards__chapter">{chapter}</span> : null}
            {detail ? <span className={detailClassName}>{detail}</span> : null}
          </div>
        ) : null}
      </div>
      {quantities.length > 0 ? (
        <div className="item-stage-rewards__aside">
          <RewardQuantities quantities={quantities} />
        </div>
      ) : null}
    </li>
  )
}

function MetaRewardRow({ row }: { row: ItemStageRewardLine }) {
  const qty = row.qty ?? 1

  return (
    <RewardRow
      quantities={[qty]}
      difficulty={
        row.difficulty ? (
          <InlineDifficulty label={row.difficulty} levelType={row.levelType} />
        ) : undefined
      }
      chapter={row.chapter}
    />
  )
}

function ProgressRewardRow({ row }: { row: ItemStageRewardLine }) {
  const { t } = useUiTranslation()
  const qty = row.qty ?? 1

  return (
    <RewardRow
      className="item-stage-rewards__row--progress"
      quantities={[qty]}
      difficulty={
        row.difficulty ? (
          <InlineDifficulty label={row.difficulty} levelType={row.levelType} />
        ) : undefined
      }
      typeTags={<InlineTypeBadge highlight="progress" label={t(UI_KEYS.item.progressRewards)} />}
      chapter={row.chapter}
      detail={row.condition ? row.condition : undefined}
    />
  )
}

function StageMergedRow({ row }: { row: ItemStageRewardLine }) {
  const { t } = useUiTranslation()
  const quantities: number[] = []

  if (row.hasFirstClear) quantities.push(row.firstClearQty ?? 1)
  if (row.hasStageDrop) quantities.push(row.stageDropQty ?? 1)

  return (
    <RewardRow
      className="item-stage-rewards__row--merged"
      quantities={quantities}
      difficulty={
        row.difficulty ? (
          <InlineDifficulty label={row.difficulty} levelType={row.levelType} />
        ) : undefined
      }
      typeTags={
        <>
          {row.hasFirstClear ? (
            <InlineTypeBadge
              highlight="first_clear"
              label={t(UI_KEYS.item.stageRewardFirstClear)}
            />
          ) : null}
          {row.hasStageDrop ? (
            <InlineTypeBadge highlight="stage_drop" label={t(UI_KEYS.item.stageRewardDrop)} />
          ) : null}
        </>
      }
      chapter={row.chapter}
      detail={row.stage}
      detailVariant="stage"
    />
  )
}

export function ItemStageRewardsSection({
  lines,
  variant = 'default',
}: ItemStageRewardsSectionProps) {
  if (!lines.length) return null

  return (
    <div className="item-stage-rewards">
      <ul className="item-stage-rewards__list scroll-y" role="list">
        {lines.map((row) => {
          if (row.line) {
            return (
              <li key={row.id} className="item-stage-rewards__row item-stage-rewards__row--plain">
                {row.line}
              </li>
            )
          }

          if (variant === 'progress' || row.kind === 'chapter_progress') {
            return <ProgressRewardRow key={row.id} row={row} />
          }

          if (row.kind === 'stage_merged') {
            return <StageMergedRow key={row.id} row={row} />
          }

          if (row.kind === 'chapter_award') {
            return <MetaRewardRow key={row.id} row={row} />
          }

          return <MetaRewardRow key={row.id} row={row} />
        })}
      </ul>
    </div>
  )
}
