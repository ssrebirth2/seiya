'use client'

import { useMemo, type ReactNode } from 'react'
import { ConsumeList } from '@/components/game/ConsumeList'
import { ItemBoxRewardsGrid } from '@/components/items/ItemBoxRewardsGrid'
import { ItemCraftRecipeCard } from '@/components/items/ItemCraftRecipeCard'
import { ItemExchangeSection } from '@/components/items/ItemExchangeSection'
import { ItemGetPathSection } from '@/components/items/ItemGetPathSection'
import { ItemRelatedSection } from '@/components/items/ItemRelatedSection'
import { ItemRewardSourcesSection } from '@/components/items/ItemRewardSourcesSection'
import { ItemUsageSection } from '@/components/items/ItemUsageSection'
import { boxSectionKeyForChildType } from '@/lib/game/item-business'
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

  const hasExchange =
    bundle.exchangeBlocks.length > 0 ||
    bundle.exchangeConditions.some((c) => c.unlock != null)
  const hasBoxPreview = bundle.boxShowAwards.length > 0
  const hasBoxConsume = bundle.boxConsumeAwards.length > 0

  const hasGamePath = bundle.getPathByRegion.length > 0
  const hasRewardSources = bundle.rewardSources.length > 0

  return (
    <div className="space-y-4">
      {hasGamePath || hasRewardSources ? (
        <Section title={t(UI_KEYS.common.getPath)}>
          {hasGamePath ? <ItemGetPathSection groups={bundle.getPathByRegion} /> : null}
          {hasRewardSources ? (
            <div className={hasGamePath ? 'mt-5 border-t border-border/60 pt-5' : undefined}>
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

      {hasExchange ? (
        <ItemExchangeSection
          exchangeBlocks={bundle.exchangeBlocks}
          exchangeConditions={bundle.exchangeConditions}
          consumeRefMap={bundle.consumeRefMap}
          getT={getT}
          embedded
        />
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
