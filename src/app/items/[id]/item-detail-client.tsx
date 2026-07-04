'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useLanguage } from '@/context/language-context'
import { ItemDetailHeader } from '@/components/items/ItemDetailHeader'
import { ItemDetailSections } from '@/components/items/ItemDetailSections'
import { DetailPageShell, LoadingSkeleton } from '@/components/ui/v2'
import { fetchItemDetail } from '@/lib/query/fetchers/item-detail'
import { GAME_CONFIG_STALE_MS } from '@/lib/query/query-config'
import { queryKeys } from '@/lib/query/query-keys'
import { SetPageMeta } from '@/lib/ui/usePageMeta'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'
import { useLocalizedHref } from '@/lib/i18n/localized-href'
import { isItemListed } from '@/lib/game/hidden-item-ids'

export default function ItemDetailClient() {
  const { id } = useParams()
  const itemId = parseInt(id as string, 10)
  const listed = Number.isFinite(itemId) && isItemListed(itemId)
  const { lang } = useLanguage()
  const { t, site } = useUiTranslation()
  const localized = useLocalizedHref()

  const { data: bundle, isLoading } = useQuery({
    queryKey: queryKeys.itemDetail(itemId, lang),
    queryFn: () => fetchItemDetail(itemId, lang),
    enabled: listed,
    staleTime: GAME_CONFIG_STALE_MS,
  })

  const getT = useMemo(() => {
    const tr = bundle?.translations ?? {}
    return (key?: string) => {
      if (!key) return ''
      return tr[key] || key
    }
  }, [bundle?.translations])

  const hasContent = useMemo(() => {
    if (!bundle) return false
    const craftUsage = bundle.groupedUsage.find((g) => g.domain === 'craft')
    return (
      bundle.getPathByRegion.length > 0 ||
      bundle.rewardSources.length > 0 ||
      bundle.craftRecipe != null ||
      (craftUsage?.entries.length ?? 0) > 0 ||
      bundle.exchangeBlocks.length > 0 ||
      bundle.exchangeConditions.some((c) => c.unlock != null) ||
      bundle.boxShowAwards.length > 0 ||
      bundle.boxConsumeAwards.length > 0 ||
      bundle.relatedItems.length > 0
    )
  }, [bundle])

  if (!listed) {
    return (
      <DetailPageShell backHref="/items" title={site('itemNotFound')}>
        <p className="text-text-muted">{site('itemNotFound')}</p>
        <Link href={localized('/items')} className="mt-4 inline-flex text-accent">
          {t(UI_KEYS.common.back)}
        </Link>
      </DetailPageShell>
    )
  }

  if (isLoading) {
    return <LoadingSkeleton variant="detail" />
  }

  if (!bundle) {
    return (
      <DetailPageShell backHref="/items" title={site('itemNotFound')}>
        <p className="text-text-muted">{site('itemNotFound')}</p>
        <Link href={localized('/items')} className="mt-4 inline-flex text-accent">
          {t(UI_KEYS.common.back)}
        </Link>
      </DetailPageShell>
    )
  }

  const { item, resolvedName, resolvedDescHtml } = bundle

  return (
    <>
      <SetPageMeta
        title={resolvedName}
        breadcrumbs={[
          { label: t(UI_KEYS.nav.items), href: '/items' },
          { label: resolvedName },
        ]}
      />
      <DetailPageShell
        backHref="/items"
        backLabel={t(UI_KEYS.common.loginBack)}
        title={resolvedName}
        header={
          <ItemDetailHeader
            item={item}
            resolvedName={resolvedName}
            resolvedDescHtml={resolvedDescHtml}
            linkedEntity={bundle.linkedEntity}
          />
        }
      >
        {hasContent ? <ItemDetailSections bundle={bundle} getT={getT} /> : null}
      </DetailPageShell>
    </>
  )
}
