'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { GalleryWorkspace } from '@/components/gallery/GalleryWorkspace'
import { ListPagePanel } from '@/components/layout/ListPagePanel'
import { EmptyState, LoadingSkeleton, PageHeader } from '@/components/ui/v2'
import { useGalleryBundle } from '@/hooks/use-gallery'
import { useLanguage } from '@/context/language-context'
import { createTranslationGetter, translateKeys } from '@/lib/i18n/language-package'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'

function collectLcKeys(bundle: NonNullable<ReturnType<typeof useGalleryBundle>['data']>): string[] {
  const keys = new Set<string>()
  if (bundle.overall) {
    keys.add(bundle.overall.labelKey)
    for (const tier of bundle.overall.tiers) {
      if (tier.titleKey) keys.add(tier.titleKey)
    }
  }
  for (const cat of bundle.categories) {
    keys.add(cat.labelKey)
  }
  for (const entry of bundle.entries) {
    if (entry.descKey) keys.add(entry.descKey)
    if (entry.nameKey) keys.add(entry.nameKey)
    for (const c of entry.conditions) {
      if (c.descKey) keys.add(c.descKey)
      if (c.arg0Key) keys.add(c.arg0Key)
      if (c.arg1Key) keys.add(c.arg1Key)
    }
  }
  keys.add('LC_COMMON_gallery_total_award')
  keys.add('LC_COMMON_split_unit')
  keys.add('LC_UNLOCK_hero_skin')
  keys.add('LC_GALLERY_total_unlock_count')
  keys.add('LC_RULE_gallery_collect')
  keys.add('LC_RULE_gallery_schedule')
  return [...keys]
}

export default function GalleryClient() {
  const { lang } = useLanguage()
  const { t } = useUiTranslation()
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const bundleQuery = useGalleryBundle()

  const [categoryType, setCategoryType] = useState<string | null>(
    searchParams.get('category')
  )
  const [translations, setTranslations] = useState<Record<string, string>>({})

  const getT = useMemo(() => createTranslationGetter(translations, { lang }), [translations, lang])

  useEffect(() => {
    const next = searchParams.get('category')
    setCategoryType(next)
  }, [searchParams])

  const onCategoryTypeChange = (type: string | null) => {
    setCategoryType(type)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('tab')
    if (type) params.set('category', type)
    else params.delete('category')
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  useEffect(() => {
    const data = bundleQuery.data
    if (!data) return
    let cancelled = false
    translateKeys(collectLcKeys(data), lang).then((map) => {
      if (!cancelled) setTranslations(map)
    })
    return () => {
      cancelled = true
    }
  }, [bundleQuery.data, lang])

  if (bundleQuery.isLoading) {
    return (
      <ListPagePanel>
        <PageHeader title={t(UI_KEYS.nav.galleryMode)} />
        <LoadingSkeleton variant="detail" />
      </ListPagePanel>
    )
  }

  if (bundleQuery.isError || !bundleQuery.data) {
    return (
      <ListPagePanel>
        <PageHeader title={t(UI_KEYS.nav.galleryMode)} />
        <EmptyState message={t(UI_KEYS.common.noData)} />
      </ListPagePanel>
    )
  }

  const bundle = bundleQuery.data

  return (
    <ListPagePanel>
      <PageHeader title={t(UI_KEYS.nav.galleryMode)} />
      <GalleryWorkspace
        overall={bundle.overall}
        categories={bundle.categories}
        entries={bundle.entries}
        totals={bundle.totals}
        consumeRefMap={bundle.consumeRefMap}
        getT={getT}
        categoryType={categoryType}
        onCategoryTypeChange={onCategoryTypeChange}
      />
    </ListPagePanel>
  )
}
