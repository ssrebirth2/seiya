'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { SquareItem } from '@/components/game/SquareItem'
import type { ItemCraftRecipe } from '@/lib/game/item-business'
import type { ConsumeRefMap } from '@/lib/game/load-hero-talents-bundle'
import { ITEM_QUALITY_SHOW_TYPE } from '@/lib/game/item-quality-ui'
import type { ConsumeEntry } from '@/lib/game/parse-game-data'
import { resolveConsumeEntry } from '@/lib/game/resolve-consume-item'
import { useLocalizedHref } from '@/lib/i18n/localized-href'

type ItemCraftRecipeCardProps = {
  recipe: ItemCraftRecipe
  consumeRefMap: ConsumeRefMap
}

function RecipeSlot({
  entry,
  consumeRefMap,
}: {
  entry: ConsumeEntry
  consumeRefMap: ConsumeRefMap
}) {
  const localized = useLocalizedHref()
  const resolved = resolveConsumeEntry(entry, consumeRefMap, ITEM_QUALITY_SHOW_TYPE.small)
  const href = resolved.href ? localized(resolved.href) : null

  return (
    <div className="item-craft-recipe__slot">
      <SquareItem
        iconSrc={resolved.iconUrl}
        iconRawSrc={resolved.iconRawSrc}
        frameSrc={resolved.frameSrc}
        frameRawSrc={resolved.frameRawSrc}
        quantity={entry.num}
        name={resolved.name}
        title={resolved.name}
        href={href ?? undefined}
        size="sm"
        showQuantity
      />
      <p className="item-craft-recipe__name" title={resolved.name}>
        {href ? (
          <Link href={href} className="hover:text-accent">
            {resolved.name}
          </Link>
        ) : (
          resolved.name
        )}
      </p>
    </div>
  )
}

export function ItemCraftRecipeCard({ recipe, consumeRefMap }: ItemCraftRecipeCardProps) {
  return (
    <div className="item-craft-recipe">
      <div className="item-craft-recipe__inputs">
        {recipe.consume.map((entry, i) => (
          <RecipeSlot key={`in-${entry.sid}-${i}`} entry={entry} consumeRefMap={consumeRefMap} />
        ))}
      </div>

      <div className="item-craft-recipe__arrow" aria-hidden="true">
        <ArrowRight size={20} strokeWidth={2.25} />
      </div>

      <div className="item-craft-recipe__output">
        <RecipeSlot entry={recipe.output} consumeRefMap={consumeRefMap} />
      </div>
    </div>
  )
}
