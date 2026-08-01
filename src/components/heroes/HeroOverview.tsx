'use client'

import { useMemo } from 'react'
import GameImage from '@/components/ui/GameImage'
import { ConsumeList } from '@/components/game/ConsumeList'
import { LoadingSkeleton, EmptyState } from '@/components/ui/v2'
import { useHeroOverview } from '@/hooks/use-hero-overview'
import { aggregateConsume } from '@/lib/game/aggregate-consume'
import { applySkillValues } from '@/lib/game/apply-skill-values'
import { createTranslationGetter } from '@/lib/i18n/language-package'
import { IMAGE_UNAVAILABLE } from '@/lib/assets/game-images'
import {
  getAwakenStarIconPath,
  getStarIconPath,
} from '@/lib/game/hero-ui-sprites'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'
import { useLanguage } from '@/context/language-context'
import type {
  HeroOverviewAwakenStep,
  HeroOverviewBundle,
  HeroOverviewStarStep,
} from '@/lib/game/load-hero-overview-bundle'
import type { ConsumeEntry } from '@/lib/game/parse-game-data'

interface HeroOverviewProps {
  heroId: number
  /** Bio/eval already loaded on the profile (optional; bundle also carries them). */
  roleIntroduction?: string | null
  roleFeatures?: string | null
  getT?: (key: string) => string
}

function CopyBlock({
  title,
  html,
}: {
  title: string
  html: string
}) {
  if (!html) return null
  return (
    <div className="hero-profile-copy__block">
      <h3 className="hero-profile-copy__title">{title}</h3>
      <p className="hero-profile-copy__text" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}

/** HeroDetailRoot:ShowStar — xx_icon_star_liang / dsjx_icon_xingxing */
function StarIcons({
  count,
  variant,
  label,
}: {
  count: number
  variant: 'normal' | 'awaken'
  label: string
}) {
  if (count <= 0) return <span className="force-card-material-empty">—</span>
  const iconSrc =
    variant === 'awaken' ? getAwakenStarIconPath() : getStarIconPath()
  return (
    <span
      className={`hero-overview-stars${variant === 'awaken' ? ' hero-overview-stars--awaken' : ''}`}
      aria-label={`${label} ${count}`}
    >
      {Array.from({ length: count }, (_, i) => (
        <GameImage
          key={i}
          src={iconSrc}
          rawSrc={iconSrc}
          alt=""
          aria-hidden
          className="hero-overview-stars__icon"
        />
      ))}
    </span>
  )
}

function MaterialsCell({
  items,
  consumeRefMap,
}: {
  items: ConsumeEntry[] | null
  consumeRefMap: HeroOverviewBundle['consumeRefMap']
}) {
  if (!items?.length) {
    return <span className="force-card-material-empty">—</span>
  }
  return <ConsumeList items={items} consumeRefMap={consumeRefMap} compact />
}

function ProgressionTable({
  title,
  materialsLabel,
  cumulativeLabel,
  rows,
  variant,
  consumeRefMap,
}: {
  title: string
  materialsLabel: string
  cumulativeLabel: string
  rows: Array<{ key: string; level: number; materials: ConsumeEntry[] }>
  variant: 'normal' | 'awaken'
  consumeRefMap: HeroOverviewBundle['consumeRefMap']
}) {
  if (!rows.length) return null

  const cumulative = aggregateConsume(rows.flatMap((row) => row.materials))

  return (
    <div className="hero-overview-progression">
      <table>
        <thead>
          <tr>
            <th scope="col">{title}</th>
            <th scope="col">{materialsLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td data-label={title}>
                <StarIcons count={row.level} variant={variant} label={title} />
              </td>
              <td data-label={materialsLabel}>
                <MaterialsCell
                  items={row.materials}
                  consumeRefMap={consumeRefMap}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {cumulative.length > 0 ? (
        <div className="hero-overview-progression__total">
          <p className="hero-overview-progression__total-label">{cumulativeLabel}</p>
          <div className="hero-overview-progression__total-materials">
            <MaterialsCell items={cumulative} consumeRefMap={consumeRefMap} />
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ProgressionTables({
  starSteps,
  awakenSteps,
  consumeRefMap,
  starUpLabel,
  awakenLabel,
  materialsLabel,
  cumulativeLabel,
}: {
  starSteps: HeroOverviewStarStep[]
  awakenSteps: HeroOverviewAwakenStep[]
  consumeRefMap: HeroOverviewBundle['consumeRefMap']
  starUpLabel: string
  awakenLabel: string
  materialsLabel: string
  cumulativeLabel: string
}) {
  if (!starSteps.length && !awakenSteps.length) return null

  const starRows = starSteps.map((step) => ({
    key: `star-${step.id}`,
    level: step.starLevel,
    materials: step.materials,
  }))

  const awakenRows = awakenSteps.map((step) => ({
    key: `awaken-${step.id}`,
    level: step.awakenLevel,
    materials: step.consume,
  }))

  return (
    <div className="hero-overview-progression-grid">
      <ProgressionTable
        title={starUpLabel}
        materialsLabel={materialsLabel}
        cumulativeLabel={cumulativeLabel}
        rows={starRows}
        variant="normal"
        consumeRefMap={consumeRefMap}
      />
      <ProgressionTable
        title={awakenLabel}
        materialsLabel={materialsLabel}
        cumulativeLabel={cumulativeLabel}
        rows={awakenRows}
        variant="awaken"
        consumeRefMap={consumeRefMap}
      />
    </div>
  )
}

export default function HeroOverview({
  heroId,
  roleIntroduction,
  roleFeatures,
  getT: externalGetT,
}: HeroOverviewProps) {
  const { t, site } = useUiTranslation()
  const { lang } = useLanguage()
  const { data: bundle, isLoading, isError, isFetching } = useHeroOverview(heroId)
  const isRetranslating = isFetching && !isLoading

  const getT = useMemo(() => {
    if (externalGetT) return externalGetT
    return createTranslationGetter(bundle?.translations ?? {}, { lang })
  }, [externalGetT, bundle?.translations, lang])

  if (isLoading) {
    return (
      <section className="py-8">
        <LoadingSkeleton variant="detail" />
      </section>
    )
  }

  if (isError || !bundle) {
    return <EmptyState message={t(UI_KEYS.common.noData)} />
  }

  const introKey = roleIntroduction ?? bundle.roleIntroduction
  const featuresKey = roleFeatures ?? bundle.roleFeatures
  const introHtml = introKey
    ? applySkillValues(getT(introKey), 0, {})
    : ''
  const featuresHtml = featuresKey
    ? applySkillValues(getT(featuresKey), 0, {})
    : ''

  const cloth = bundle.cloth
  const clothIconOk = cloth != null && cloth.showIconUrl !== IMAGE_UNAVAILABLE
  const visibleParts =
    cloth?.parts.filter((p) => p.iconUrl !== IMAGE_UNAVAILABLE) ?? []
  const visibleFigures = bundle.figures.filter((f) => f.figureUrl !== IMAGE_UNAVAILABLE)
  const roleFigure = visibleFigures.find((f) => f.kind === 'role')
  const clothFigure = visibleFigures.find((f) => f.kind === 'cloth')
  /** Cloth showIcon === ClothIcon figure — only use showIcon when cloth figure is absent. */
  const clothStatue = clothFigure
    ? {
        src: clothFigure.figureUrl,
        rawSrc: clothFigure.figurePath,
        nameKey: clothFigure.nameKey ?? cloth?.nameKey ?? null,
        descKey: clothFigure.descKey ?? cloth?.descKey ?? null,
      }
    : clothIconOk && cloth
      ? {
          src: cloth.showIconUrl,
          rawSrc: cloth.showIconPath,
          nameKey: cloth.nameKey,
          descKey: cloth.descKey,
        }
      : null
  const showFigures = roleFigure != null || clothStatue != null
  const showClothParts = visibleParts.length > 0
  const showGallery = showFigures || showClothParts
  const galleryTitle =
    showFigures && showClothParts
      ? `${t(UI_KEYS.hero.figures)} / ${t(UI_KEYS.hero.cloth)}`
      : showFigures
        ? t(UI_KEYS.hero.figures)
        : t(UI_KEYS.hero.cloth)
  const materialsLabel = t(UI_KEYS.common.materials)
  const cumulativeLabel = site('cumulativeTotal')

  return (
    <section className={`hero-overview space-y-6 ${isRetranslating ? 'i18n-content--pending' : ''}`}>
      {(introHtml || featuresHtml) && (
        <div className="hero-profile-copy hero-overview-section">
          <CopyBlock title={t(UI_KEYS.common.biography)} html={introHtml} />
          <CopyBlock title={t(UI_KEYS.common.evaluate)} html={featuresHtml} />
        </div>
      )}

      {showGallery ? (
        <div className="hero-overview-section">
          <h3 className="hero-overview-section__title">{galleryTitle}</h3>
          <div className="hero-overview-gallery">
            {showFigures ? (
              <ul className="hero-overview-figures">
                {roleFigure ? (
                  <li className="hero-overview-figure">
                    <GameImage
                      src={roleFigure.figureUrl}
                      rawSrc={roleFigure.figurePath ?? undefined}
                      alt={
                        roleFigure.nameKey
                          ? getT(roleFigure.nameKey)
                          : t(UI_KEYS.hero.figures)
                      }
                      className="hero-overview-figure__img"
                    />
                    <div className="hero-overview-figure__meta">
                      {roleFigure.nameKey ? (
                        <p className="hero-overview-figure__name">
                          {getT(roleFigure.nameKey)}
                        </p>
                      ) : null}
                      {roleFigure.descKey ? (
                        <p
                          className="hero-overview-figure__desc"
                          dangerouslySetInnerHTML={{
                            __html: applySkillValues(getT(roleFigure.descKey), 0, {}),
                          }}
                        />
                      ) : null}
                    </div>
                  </li>
                ) : null}
                {clothStatue ? (
                  <li className="hero-overview-figure">
                    <GameImage
                      src={clothStatue.src}
                      rawSrc={clothStatue.rawSrc ?? undefined}
                      alt={
                        clothStatue.nameKey
                          ? getT(clothStatue.nameKey)
                          : t(UI_KEYS.hero.cloth)
                      }
                      className="hero-overview-figure__img"
                    />
                    <div className="hero-overview-figure__meta">
                      {clothStatue.nameKey ? (
                        <p className="hero-overview-figure__name">
                          {getT(clothStatue.nameKey)}
                        </p>
                      ) : null}
                      {clothStatue.descKey ? (
                        <p
                          className="hero-overview-figure__desc"
                          dangerouslySetInnerHTML={{
                            __html: applySkillValues(
                              getT(clothStatue.descKey),
                              0,
                              {}
                            ),
                          }}
                        />
                      ) : null}
                    </div>
                  </li>
                ) : null}
              </ul>
            ) : null}
            {showClothParts ? (
              <ul
                className="hero-overview-cloth__parts"
                aria-label={t(UI_KEYS.hero.cloth)}
              >
                {visibleParts.map((part) => (
                  <li key={part.id}>
                    <GameImage
                      src={part.iconUrl}
                      rawSrc={part.path ?? undefined}
                      alt={`${t(UI_KEYS.hero.cloth)} ${part.pos}`}
                      className="hero-overview-cloth__part"
                    />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}

      {bundle.skins.length > 0 ? (
        <div className="hero-overview-section">
          <h3 className="hero-overview-section__title">{t(UI_KEYS.hero.skins)}</h3>
          <ul className="hero-overview-skins">
            {bundle.skins.map((skin) => {
              const skinName = skin.nameKey ? getT(skin.nameKey) : null
              return (
                <li key={skin.skinId} className="hero-overview-skin">
                  <GameImage
                    src={skin.squareUrl}
                    rawSrc={skin.squarePath ?? undefined}
                    alt={skinName ?? `${t(UI_KEYS.hero.skins)} ${skin.skinId}`}
                    className="hero-overview-skin__img"
                    width={144}
                    height={144}
                  />
                  {skinName ? (
                    <p className="hero-overview-skin__name">{skinName}</p>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}

      <ProgressionTables
        starSteps={bundle.starSteps}
        awakenSteps={bundle.awakenSteps}
        consumeRefMap={bundle.consumeRefMap}
        starUpLabel={t(UI_KEYS.hero.starUp)}
        awakenLabel={t(UI_KEYS.common.awakening)}
        materialsLabel={materialsLabel}
        cumulativeLabel={cumulativeLabel}
      />
    </section>
  )
}
