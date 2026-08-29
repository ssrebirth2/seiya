'use client'

import GameImage from '@/components/ui/GameImage'
import { ConsumeList } from '@/components/game/ConsumeList'
import { Surface } from '@/components/ui/v2'
import {
  sortStageMaterials,
  type StageUpPlan,
} from '@/lib/game/compute-stage-plan'
import { applyLcPlaceholders } from '@/lib/game/format-cosmo-unlock'
import {
  getQualityIconClassName,
  getQualityIconPath,
} from '@/lib/game/hero-ui-sprites'
import type { ConsumeRefMap } from '@/lib/game/load-hero-talents-bundle'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'
import { heroQualityLcKey } from '@/lib/i18n/ui-keys'

type StageUpPlanViewProps = {
  plan: StageUpPlan
  consumeRefMap: ConsumeRefMap
}

function StageUpQualityIcon({ quality }: { quality: number }) {
  const { t } = useUiTranslation()
  const src = getQualityIconPath(quality)
  const label = t(heroQualityLcKey(quality))
  if (!src) return null
  return (
    <GameImage
      src={src}
      rawSrc={src}
      alt={label}
      title={label}
      className={`stage-up-plan__quality-icon ${getQualityIconClassName(quality)}`.trim()}
    />
  )
}

function StageUpQualityPair({ from, to }: { from: number; to: number }) {
  const { t } = useUiTranslation()
  const fromLabel = t(heroQualityLcKey(from))
  const toLabel = t(heroQualityLcKey(to))
  return (
    <div className="stage-up-plan__quality-pair" aria-label={`${fromLabel} → ${toLabel}`}>
      <StageUpQualityIcon quality={from} />
      <span className="stage-up-plan__quality-arrow" aria-hidden>
        →
      </span>
      <StageUpQualityIcon quality={to} />
    </div>
  )
}

export function StageUpPlanView({ plan, consumeRefMap }: StageUpPlanViewProps) {
  const { t, site } = useUiTranslation()
  const formatStage = (n: number) =>
    applyLcPlaceholders(t(UI_KEYS.stageUp.replacementStage), [n])
  const formatLv = (n: number) => applyLcPlaceholders(t(UI_KEYS.common.heroLv), [n])
  const allStage = sortStageMaterials(plan.allStageMaterials)
  const qualityMats = sortStageMaterials(plan.qualityMaterials)

  return (
    <div className="stage-up-plan">
      {plan.qualitySteps.length > 0 ? (
        <Surface className="stage-up-plan__quality-steps">
          <h2 className="stage-up-plan__title font-display">{t(UI_KEYS.hero.qualitySkillTab)}</h2>
          <div className="hero-overview-progression">
            <table>
              <thead>
                <tr>
                  <th scope="col">{t(UI_KEYS.common.quality)}</th>
                  <th scope="col">{t(UI_KEYS.common.materials)}</th>
                </tr>
              </thead>
              <tbody>
                {plan.qualitySteps.map((step) => (
                  <tr key={`${step.fromQuality}-${step.toQuality}`}>
                    <td>
                      <div className="stage-up-plan__step-label">
                        <StageUpQualityPair from={step.fromQuality} to={step.toQuality} />
                        <span className="stage-up-plan__step-note">
                          {applyLcPlaceholders(t(UI_KEYS.stageUp.qualityUpLimit), [step.needLv])}
                          {' · '}
                          {formatStage(step.minStageForNeedLv)}
                          {' · '}
                          {formatLv(step.capAtMinStage)}
                        </span>
                      </div>
                    </td>
                    <td>
                      {step.dataError ? (
                        <span className="force-card-material-empty">{t(UI_KEYS.common.noData)}</span>
                      ) : step.billable ? (
                        <ConsumeList items={step.materials} consumeRefMap={consumeRefMap} compact />
                      ) : (
                        <span className="force-card-material-empty">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Surface>
      ) : null}

      {plan.stageSteps.length > 0 ? (
        <Surface className="stage-up-plan__steps">
          <h2 className="stage-up-plan__title font-display">{t(UI_KEYS.stageUp.stageUp)}</h2>
          <div className="hero-overview-progression">
            <table>
              <thead>
                <tr>
                  <th scope="col">{t(UI_KEYS.stageUp.stageUp)}</th>
                  <th scope="col">{t(UI_KEYS.common.materials)}</th>
                </tr>
              </thead>
              <tbody>
                {plan.stageSteps.map((step) => (
                  <tr key={`${step.fromStage}-${step.toStage}`}>
                    <td>
                      <div className="stage-up-plan__step-label stage-up-plan__step-label--promote">
                        <StageUpQualityIcon quality={step.minQuality} />
                        <span className="stage-up-plan__step-copy">
                          <span className="stage-up-plan__step-tier">
                            {formatStage(step.fromStage)}
                            {' → '}
                            {formatStage(step.toStage)}
                          </span>
                          <span className="stage-up-plan__step-note">
                            {formatLv(step.levelCapFrom)}
                            {' → '}
                            {formatLv(step.levelCapTo)}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td>
                      {step.dataError ? (
                        <span className="force-card-material-empty">{t(UI_KEYS.common.noData)}</span>
                      ) : (
                        <ConsumeList items={step.materials} consumeRefMap={consumeRefMap} compact />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Surface>
      ) : null}

      <Surface className="stage-up-plan__totals">
        <h2 className="stage-up-plan__title font-display">{t(UI_KEYS.common.materials)}</h2>
        {allStage.length > 0 ? (
          <div className="stage-up-plan__group">
            <ConsumeList items={allStage} consumeRefMap={consumeRefMap} compact />
          </div>
        ) : null}
        {qualityMats.length > 0 ? (
          <div className="stage-up-plan__group">
            <h3>{site('qualityUpMaterials')}</h3>
            <ConsumeList items={qualityMats} consumeRefMap={consumeRefMap} compact />
          </div>
        ) : null}
        {allStage.length === 0 && qualityMats.length === 0 ? (
          <p className="stage-up-plan__empty">{t(UI_KEYS.common.noData)}</p>
        ) : null}
      </Surface>
    </div>
  )
}
