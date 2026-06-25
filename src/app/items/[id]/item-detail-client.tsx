'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { useLanguage } from '@/context/language-context'
import { ConsumeEntityRow } from '@/components/game/ConsumeEntityRow'
import { ConsumeList } from '@/components/game/ConsumeList'
import { SquareItem } from '@/components/game/SquareItem'
import { DetailPageShell, LoadingSkeleton, QualityBadge } from '@/components/ui/v2'
import { boxSectionKeyForChildType } from '@/lib/game/item-business'
import { loadItemDetail, type ItemDetailBundle } from '@/lib/game/load-item-detail'
import { ITEM_QUALITY_SHOW_TYPE, resolveItemQualityFramePath } from '@/lib/game/item-quality-ui'
import { itemIconUrl } from '@/lib/game/resolve-item-icon'
import { SetPageMeta } from '@/lib/ui/usePageMeta'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'
import { useLocalizedHref } from '@/lib/i18n/localized-href'
import { supabase } from '@/lib/supabase-client'
import type { UsedInCraft } from '@/lib/game/item-business'
import { normalizeConsumeList } from '@/lib/game/parse-game-data'

const EXCHANGE_LABEL_KEYS: Record<string, string> = {
  compose: UI_KEYS.item.materialCompose,
  decompose: UI_KEYS.item.materialDecompose,
  exchange: UI_KEYS.item.materialExchange,
}

export default function ItemDetailClient() {
  const { id } = useParams()
  const itemId = parseInt(id as string, 10)
  const { lang } = useLanguage()
  const { t, site, noData } = useUiTranslation()
  const localized = useLocalizedHref()

  const [bundle, setBundle] = useState<ItemDetailBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [usedIn, setUsedIn] = useState<UsedInCraft[]>([])

  useEffect(() => {
    let cancelled = false

    async function loadUsedIn(): Promise<UsedInCraft[]> {
      const index: UsedInCraft[] = []
      let from = 0
      const BATCH = 1000
      while (true) {
        const { data } = await supabase
          .from('CompositeConfig')
          .select('id,consume')
          .order('id')
          .range(from, from + BATCH - 1)
        const rows = data ?? []
        if (!rows.length) break
        for (const r of rows) {
          const targetId = Number(r.id)
          for (const ing of normalizeConsumeList((r as { consume: unknown }).consume)) {
            if (ing.sid === itemId) index.push({ targetId, qty: ing.num })
          }
        }
        if (rows.length < BATCH) break
        from += BATCH
      }
      return index
    }

    async function run() {
      if (!Number.isFinite(itemId)) {
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const usedInCraft = await loadUsedIn()
        if (cancelled) return
        setUsedIn(usedInCraft)
        const detail = await loadItemDetail(itemId, lang, usedInCraft)
        if (!cancelled) setBundle(detail)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [itemId, lang])

  const getT = useMemo(() => {
    const tr = bundle?.translations ?? {}
    return (key?: string) => {
      if (!key) return ''
      return tr[key] || key
    }
  }, [bundle?.translations])

  if (loading) {
    return (
      <DetailPageShell backHref="/items" title={site('loadingItem')}>
        <LoadingSkeleton variant="detail" />
      </DetailPageShell>
    )
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

  const { item, resolvedName, resolvedDescHtml, consumeRefMap } = bundle
  const largeFrame =
    item.quality > 0 ? resolveItemQualityFramePath(ITEM_QUALITY_SHOW_TYPE.large, item.quality) : null
  const boxSectionKey = boxSectionKeyForChildType(item.child_type)

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
        badge={item.quality > 0 ? <QualityBadge quality={item.quality} /> : undefined}
        header={
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[auto_1fr]">
            <div className="flex justify-center lg:justify-start">
              <SquareItem
                iconSrc={itemIconUrl(item.icon_path)}
                frameSrc={largeFrame?.src}
                frameRawSrc={largeFrame?.rawSrc}
                name={resolvedName}
                size="lg"
                showType={ITEM_QUALITY_SHOW_TYPE.large}
                showQuantity={false}
              />
            </div>
            <div className="min-w-0 space-y-4">
              <span className="font-mono text-xs text-text-muted">
                {site('id')} {item.id}
              </span>
              {resolvedDescHtml ? (
                <div
                  className="text-sm leading-relaxed text-text-muted"
                  dangerouslySetInnerHTML={{ __html: resolvedDescHtml }}
                />
              ) : null}
            </div>
          </div>
        }
      >
        {bundle.getPathLines.length > 0 ? (
          <section className="item-detail-section">
            <h2 className="item-detail-section__title">{t(UI_KEYS.item.getPath)}</h2>
            <ul className="space-y-1 text-sm text-text-muted">
              {bundle.getPathLines.map((line, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: line }} />
              ))}
            </ul>
          </section>
        ) : null}

        {bundle.craftConsume.length > 0 ? (
          <section className="item-detail-section">
            <h2 className="item-detail-section__title">{t(UI_KEYS.item.compose)}</h2>
            <ConsumeList items={bundle.craftConsume} consumeRefMap={consumeRefMap} layout="row" />
          </section>
        ) : null}

        {usedIn.length > 0 ? (
          <section className="item-detail-section">
            <h2 className="item-detail-section__title">{t(UI_KEYS.item.usedInCraft)}</h2>
            <div className="space-y-2">
              {usedIn.map((u) => (
                <div key={u.targetId} className="flex items-center justify-between gap-4 text-sm">
                  <Link href={localized(`/items/${u.targetId}`)} className="font-medium hover:text-accent">
                    {consumeRefMap[String(u.targetId)]?.name ?? `#${u.targetId}`}
                  </Link>
                  <span className="tabular-nums text-text-muted">×{u.qty}</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {bundle.exchangeBlocks.map((block, idx) => (
          <section key={idx} className="item-detail-section">
            <h2 className="item-detail-section__title">
              {t(EXCHANGE_LABEL_KEYS[block.labelKey] ?? UI_KEYS.item.materialExchange)}
            </h2>
            {block.consume.length > 0 ? (
              <div className="mb-3">
                <p className="mb-2 text-xs text-text-muted">{t(UI_KEYS.common.consume)}</p>
                <div className="space-y-2">
                  {block.consume.map((entry, i) => (
                    <ConsumeEntityRow key={`c-${i}`} entry={entry} consumeRefMap={consumeRefMap} />
                  ))}
                </div>
              </div>
            ) : null}
            {block.get.length > 0 ? (
              <div>
                <p className="mb-2 text-xs text-text-muted">{t(UI_KEYS.common.preview)}</p>
                <div className="space-y-2">
                  {block.get.map((entry, i) => (
                    <ConsumeEntityRow key={`g-${i}`} entry={entry} consumeRefMap={consumeRefMap} />
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        ))}

        {bundle.boxShowAwards.length > 0 ? (
          <section className="item-detail-section">
            <h2 className="item-detail-section__title">
              {boxSectionKey ? t(boxSectionKey) : t(UI_KEYS.common.preview)}
            </h2>
            <div className="item-detail-box-strip">
              {bundle.boxShowAwards.map((entry, idx) => (
                <ConsumeEntityRow
                  key={idx}
                  entry={entry.award}
                  consumeRefMap={consumeRefMap}
                  rateLabel={entry.rateLabel ?? undefined}
                />
              ))}
            </div>
          </section>
        ) : null}

        {bundle.boxConsumeAwards.length > 0 ? (
          <section className="item-detail-section">
            <h2 className="item-detail-section__title">{t(UI_KEYS.item.boxConsume)}</h2>
            <ConsumeList items={bundle.boxConsumeAwards} consumeRefMap={consumeRefMap} />
          </section>
        ) : null}

        {!bundle.craftConsume.length &&
        !usedIn.length &&
        !bundle.exchangeBlocks.length &&
        !bundle.boxShowAwards.length &&
        !bundle.boxConsumeAwards.length &&
        !bundle.getPathLines.length ? (
          <p className="mt-6 text-sm text-text-muted">{noData}</p>
        ) : null}
      </DetailPageShell>
    </>
  )
}
