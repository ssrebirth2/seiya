'use client'

import { useMemo, type ReactNode } from 'react'
import { ConsumeList } from '@/components/game/ConsumeList'
import { ItemBoxRewardsGrid } from '@/components/items/ItemBoxRewardsGrid'
import { ItemCraftRecipeCard } from '@/components/items/ItemCraftRecipeCard'
import { ItemExchangeSection, getExchangeSectionTitle } from '@/components/items/ItemExchangeSection'
import { ItemGetPathSection } from '@/components/items/ItemGetPathSection'
import { ItemRelatedSection } from '@/components/items/ItemRelatedSection'
import { ItemRewardSourcesSection } from '@/components/items/ItemRewardSourcesSection'
import { ItemStageRewardsSection } from '@/components/items/ItemStageRewardsSection'
import { ItemUsageSection } from '@/components/items/ItemUsageSection'
import { boxSectionKeyForChildType, filterExchangeBlocksForItemDetail } from '@/lib/game/item-business'
import {
  collectItemObtainModes,
  filterObtainModesNotInGetPath,
} from '@/lib/game/item-stage-rewards'
import type { ItemDetailBundle } from '@/lib/game/load-item-detail'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'

type ItemDetailSectionsProps = {
  bundle: ItemDetailBundle
  getT: (key?: string) => string
}

function Section({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="surface panel">
      <h2 className="item-detail-section__title">{title}</h2>
      {children}
    </section>
  )
}

function Subheading({ children }: { children: ReactNode }) {
  return <h3 className="mb-3 text-sm font-semibold text-foreground">{children}</h3>
}

export function ItemDetailSections({ bundle, getT }: ItemDetailSectionsProps) {
  const { t } = useUiTranslation()

  const craftUsage = useMemo(
    () => bundle.groupedUsage.find((g) => g.domain === 'craft'),
    [bundle.groupedUsage]
  )
  const boxSectionKey = boxSectionKeyForChildType(bundle.item.child_type)

  const craftRecipe = bundle.craftRecipe
  const isCraftOutput =
    craftRecipe != null &&
    craftRecipe.output.sid != null &&
    bundle.item.id === Number(craftRecipe.output.sid)
  const showCraftUsage = !craftRecipe && (craftUsage?.entries.length ?? 0) > 0

  const relatedItems = useMemo(() => {
    const outputId = craftRecipe?.output.sid
    let items = !outputId
      ? bundle.relatedItems
      : bundle.relatedItems.filter(
          (rel) => !(rel.relation === 'compose_parent' && rel.id === Number(outputId))
        )
    if (bundle.rewardSources.length > 0) {
      items = items.filter((rel) => rel.relation !== 'box_source')
    }
    return items
  }, [bundle.relatedItems, bundle.rewardSources.length, craftRecipe?.output.sid])

  const exchangeBlocksForPage = useMemo(
    () => filterExchangeBlocksForItemDetail(bundle.exchangeBlocks, bundle.item.id),
    [bundle.exchangeBlocks, bundle.item.id]
  )

  const hasExchangePreview = exchangeBlocksForPage.some((b) => b.get.length > 0)
  const hasStageRewards = bundle.stageRewardLines.length > 0
  const hasProgressRewards = bundle.progressRewardLines.length > 0
  const hasExchangeUnlock = bundle.exchangeUnlockLines.length > 0
  const hasBoxPreview = bundle.boxShowAwards.length > 0
  const hasBoxConsume = bundle.boxConsumeAwards.length > 0

  const hasGamePath = bundle.getPathByRegion.length > 0
  const hasRewardSources = bundle.rewardSources.length > 0

  /** Infer tabs from stage drops; fall back to progress modes when get_path is empty. */
  const obtainModes = useMemo(() => {
    const fromStages = collectItemObtainModes(bundle.stageRewardLines)
    const hasGetPathEntries = bundle.getPathByRegion.some((group) => group.entries.length > 0)
    if (fromStages.length > 0 || hasGetPathEntries) return fromStages
    return collectItemObtainModes(bundle.progressRewardLines)
  }, [bundle.stageRewardLines, bundle.progressRewardLines, bundle.getPathByRegion])

  const getPathLabels = useMemo(
    () => bundle.getPathByRegion.flatMap((group) => group.entries.map((entry) => entry.name)),
    [bundle.getPathByRegion]
  )

  const getPathFunopenIds = useMemo(
    () => bundle.getPathByRegion.flatMap((group) => group.entries.map((entry) => entry.funopenId)),
    [bundle.getPathByRegion]
  )

  const obtainModesForFonte = useMemo(
    () => filterObtainModesNotInGetPath(obtainModes, getPathFunopenIds, getPathLabels),
    [obtainModes, getPathFunopenIds, getPathLabels]
  )

  const hasObtainModes = obtainModesForFonte.length > 0
  const hasFontePaths = hasGamePath || hasObtainModes
  const showFonteSection = hasFontePaths || hasRewardSources

  return (
    <div className="space-y-4">
      {hasExchangeUnlock ? (
        <Section title={t(UI_KEYS.common.unlockCondition)}>
          <ItemStageRewardsSection lines={bundle.exchangeUnlockLines} />
        </Section>
      ) : null}

      {showFonteSection ? (
        <Section title={t(UI_KEYS.common.getPath)}>
          {hasFontePaths ? (
            <ItemGetPathSection
              groups={bundle.getPathByRegion}
              obtainModes={obtainModesForFonte}
            />
          ) : null}
          {hasRewardSources ? (
            <div className={hasFontePaths ? 'mt-5 border-t border-border/60 pt-5' : undefined}>
              <ItemRewardSourcesSection
                entries={bundle.rewardSources}
                consumeRefMap={bundle.consumeRefMap}
              />
            </div>
          ) : null}
        </Section>
      ) : null}

      {craftRecipe ? (
        isCraftOutput ? (
          <Section title={t(UI_KEYS.common.materialNeed)}>
            <ConsumeList
              items={craftRecipe.consume}
              consumeRefMap={bundle.consumeRefMap}
              layout="rewards"
              className="!mt-0"
            />
          </Section>
        ) : (
          <Section title={t(UI_KEYS.item.compose)}>
            <ItemCraftRecipeCard recipe={craftRecipe} consumeRefMap={bundle.consumeRefMap} />
          </Section>
        )
      ) : null}

      {showCraftUsage && craftUsage ? (
        <Section title={t(UI_KEYS.item.usedInCraft)}>
          <ItemUsageSection
            groupedUsage={[craftUsage]}
            consumeRefMap={bundle.consumeRefMap}
            embedded
            flat
            showIngredientQty
          />
        </Section>
      ) : null}

      {hasStageRewards ? (
        <Section title={t(UI_KEYS.item.stageRewards)}>
          <ItemStageRewardsSection lines={bundle.stageRewardLines} />
        </Section>
      ) : null}

      {hasProgressRewards ? (
        <Section title={t(UI_KEYS.item.progressRewards)}>
          <ItemStageRewardsSection lines={bundle.progressRewardLines} variant="progress" />
        </Section>
      ) : null}

      {hasExchangePreview ? (
        <Section title={getExchangeSectionTitle(exchangeBlocksForPage, t)}>
          <ItemExchangeSection
            exchangeBlocks={exchangeBlocksForPage}
            consumeRefMap={bundle.consumeRefMap}
            embedded
          />
        </Section>
      ) : null}

      {hasBoxPreview || hasBoxConsume ? (
        <Section
          title={
            boxSectionKey
              ? t(boxSectionKey)
              : hasBoxConsume
                ? t(UI_KEYS.item.boxConsume)
                : t(UI_KEYS.common.preview)
          }
        >
          <div className="space-y-6">
            {hasBoxPreview ? (
              <div>
                {hasBoxConsume ? <Subheading>{t(UI_KEYS.common.preview)}</Subheading> : null}
                <ItemBoxRewardsGrid
                  entries={bundle.boxShowAwards}
                  consumeRefMap={bundle.consumeRefMap}
                />
              </div>
            ) : null}
            {hasBoxConsume ? (
              <div>
                {hasBoxPreview ? <Subheading>{t(UI_KEYS.item.boxConsume)}</Subheading> : null}
                <ConsumeList items={bundle.boxConsumeAwards} consumeRefMap={bundle.consumeRefMap} />
              </div>
            ) : null}
          </div>
        </Section>
      ) : null}

      {relatedItems.length > 0 ? (
        <section className="surface panel">
          <ItemRelatedSection
            relatedItems={relatedItems}
            consumeRefMap={bundle.consumeRefMap}
            getT={getT}
            embedded
          />
        </section>
      ) : null}
    </div>
  )
}
