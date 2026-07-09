'use client'

import Link from 'next/link'
import { SquareItem } from '@/components/game/SquareItem'
import { ArtifactCatalogRestrictionIcons } from '@/components/artifacts/ArtifactCatalogRestrictionIcons'
import { resolveArtifactListIcon } from '@/lib/assets/game-images'
import type { ForceCardRestrictionChip } from '@/lib/game/force-card-equip'
import { ITEM_QUALITY_SHOW_TYPE, resolveItemQualityFramePath } from '@/lib/game/item-quality-ui'
import { useLocalizedHref } from '@/lib/i18n/localized-href'

export type ArtifactCatalogRow = {
  id: number
  name: string
  initial_quality: number
  frame_quality: number
  item_icon?: string | null
  restrictionChips?: ForceCardRestrictionChip[]
}

type ArtifactCatalogGridProps = {
  artifacts: ArtifactCatalogRow[]
  getArtifactName: (artifact: ArtifactCatalogRow) => string
  getT: (key?: string) => string
}

export function ArtifactCatalogGrid({
  artifacts,
  getArtifactName,
  getT,
}: ArtifactCatalogGridProps) {
  const localized = useLocalizedHref()
  if (!artifacts.length) return null

  return (
    <div className="artifact-catalog-grid">
      {artifacts.map((art) => {
        const frame =
          art.frame_quality > 0
            ? resolveItemQualityFramePath(ITEM_QUALITY_SHOW_TYPE.small, art.frame_quality)
            : null
        const icon = resolveArtifactListIcon(art.item_icon)
        const displayName = getArtifactName(art)
        const restrictionChips = art.restrictionChips ?? []

        return (
          <Link
            key={art.id}
            href={localized(`/artifacts/${art.id}`)}
            className="artifact-catalog-cell"
            title={displayName}
          >
            <div className="artifact-catalog-cell__icon-slot">
              <SquareItem
                iconSrc={icon.src}
                iconRawSrc={icon.rawSrc}
                frameSrc={frame?.src}
                frameRawSrc={frame?.rawSrc}
                name={displayName}
                size="sm"
                showType={ITEM_QUALITY_SHOW_TYPE.small}
                showQuantity={false}
                displayMode="native"
              />
              {restrictionChips.length > 0 ? (
                <ArtifactCatalogRestrictionIcons chips={restrictionChips} getT={getT} />
              ) : null}
            </div>
            <span className="artifact-catalog-cell__name">{displayName}</span>
          </Link>
        )
      })}
    </div>
  )
}

export default ArtifactCatalogGrid
