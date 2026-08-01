'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { ItemStageRewardLine, LevelType } from '@/lib/game/item-stage-rewards'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'

type ItemStageRewardsSectionProps = {
  lines: ItemStageRewardLine[]
  /** Progress milestones use chapter + condition + progress pill. */
  variant?: 'default' | 'progress'
}

type RewardHighlight = 'first_clear' | 'stage_drop' | 'fixed' | 'progress'

type DifficultyTab = {
  levelType: LevelType
  label: string
  count: number
  lines: ItemStageRewardLine[]
}

const HIGHLIGHT_CLASS: Record<RewardHighlight, string> = {
  first_clear: 'first-clear',
  stage_drop: 'stage-drop',
  fixed: 'fixed',
  progress: 'progress',
}

const LEVEL_TYPE_MODIFIER: Record<LevelType, string> = {
  1: 'story',
  2: 'elite',
  3: 'nightmare',
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

function MetaRewardRow({
  row,
  hideDifficulty,
}: {
  row: ItemStageRewardLine
  hideDifficulty?: boolean
}) {
  const qty = row.qty ?? 1

  return (
    <RewardRow
      quantities={[qty]}
      difficulty={
        !hideDifficulty && row.difficulty ? (
          <InlineDifficulty label={row.difficulty} levelType={row.levelType} />
        ) : undefined
      }
      chapter={row.chapter}
    />
  )
}

function ProgressRewardRow({
  row,
  hideDifficulty,
}: {
  row: ItemStageRewardLine
  hideDifficulty?: boolean
}) {
  const { t } = useUiTranslation()
  const qty = row.qty ?? 1

  return (
    <RewardRow
      className="item-stage-rewards__row--progress"
      quantities={[qty]}
      difficulty={
        !hideDifficulty && row.difficulty ? (
          <InlineDifficulty label={row.difficulty} levelType={row.levelType} />
        ) : undefined
      }
      typeTags={<InlineTypeBadge highlight="progress" label={t(UI_KEYS.item.progressRewards)} />}
      chapter={row.chapter}
      detail={row.condition ? row.condition : undefined}
    />
  )
}

function StageMergedRow({
  row,
  hideDifficulty,
}: {
  row: ItemStageRewardLine
  hideDifficulty?: boolean
}) {
  const { t } = useUiTranslation()
  const quantities: number[] = []

  if (row.hasFirstClear) quantities.push(row.firstClearQty ?? 1)
  if (row.hasStageDrop) quantities.push(row.stageDropQty ?? 1)

  return (
    <RewardRow
      className="item-stage-rewards__row--merged"
      quantities={quantities}
      difficulty={
        !hideDifficulty && row.difficulty ? (
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

function StageRewardList({
  lines,
  variant,
  hideDifficulty,
}: {
  lines: ItemStageRewardLine[]
  variant: 'default' | 'progress'
  hideDifficulty?: boolean
}) {
  return (
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
          return <ProgressRewardRow key={row.id} row={row} hideDifficulty={hideDifficulty} />
        }

        if (row.kind === 'stage_merged') {
          return <StageMergedRow key={row.id} row={row} hideDifficulty={hideDifficulty} />
        }

        return <MetaRewardRow key={row.id} row={row} hideDifficulty={hideDifficulty} />
      })}
    </ul>
  )
}

function groupLinesByDifficulty(lines: ItemStageRewardLine[]): DifficultyTab[] {
  const buckets = new Map<LevelType, ItemStageRewardLine[]>()
  const labels = new Map<LevelType, string>()

  for (const line of lines) {
    if (line.levelType == null) continue
    const list = buckets.get(line.levelType) ?? []
    list.push(line)
    buckets.set(line.levelType, list)
    if (line.difficulty?.trim()) labels.set(line.levelType, line.difficulty)
  }

  return ([1, 2, 3] as LevelType[])
    .filter((type) => buckets.has(type))
    .map((levelType) => {
      const groupLines = buckets.get(levelType) ?? []
      return {
        levelType,
        label: labels.get(levelType) ?? String(levelType),
        count: groupLines.length,
        lines: groupLines,
      }
    })
}

export function ItemStageRewardsSection({
  lines,
  variant = 'default',
}: ItemStageRewardsSectionProps) {
  const { t } = useUiTranslation()
  const tabs = useMemo(() => groupLinesByDifficulty(lines), [lines])
  const useTabs = tabs.length > 1
  const [activeType, setActiveType] = useState<LevelType | null>(tabs[0]?.levelType ?? null)

  useEffect(() => {
    if (!tabs.length) {
      setActiveType(null)
      return
    }
    if (activeType == null || !tabs.some((tab) => tab.levelType === activeType)) {
      setActiveType(tabs[0].levelType)
    }
  }, [tabs, activeType])

  if (!lines.length) return null

  const activeTab = tabs.find((tab) => tab.levelType === activeType) ?? tabs[0]
  const visibleLines = useTabs && activeTab ? activeTab.lines : lines

  return (
    <div className={`item-stage-rewards${useTabs ? ' item-stage-rewards--tabbed' : ''}`}>
      {useTabs ? (
        <div
          className="item-stage-rewards__tabs"
          role="tablist"
          aria-label={t(UI_KEYS.item.stageRewards)}
        >
          {tabs.map((tab) => {
            const active = tab.levelType === activeTab?.levelType
            const modifier = LEVEL_TYPE_MODIFIER[tab.levelType]
            return (
              <button
                key={tab.levelType}
                type="button"
                role="tab"
                id={`stage-reward-tab-${tab.levelType}`}
                aria-selected={active}
                aria-controls={`stage-reward-panel-${tab.levelType}`}
                className={`item-stage-rewards__tab item-stage-rewards__tab--${modifier}${
                  active ? ' item-stage-rewards__tab--active' : ''
                }`}
                onClick={() => setActiveType(tab.levelType)}
              >
                <span className="item-stage-rewards__tab-label">{tab.label}</span>
                <span className="item-stage-rewards__tab-count">{tab.count}</span>
              </button>
            )
          })}
        </div>
      ) : null}

      <div
        key={useTabs ? activeTab?.levelType : 'all'}
        role={useTabs ? 'tabpanel' : undefined}
        id={useTabs && activeTab ? `stage-reward-panel-${activeTab.levelType}` : undefined}
        aria-labelledby={
          useTabs && activeTab ? `stage-reward-tab-${activeTab.levelType}` : undefined
        }
        className="item-stage-rewards__panel"
      >
        <StageRewardList lines={visibleLines} variant={variant} hideDifficulty={useTabs} />
      </div>
    </div>
  )
}
