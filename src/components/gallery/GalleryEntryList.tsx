'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { GalleryCollectionBar } from '@/components/gallery/GalleryCollectionBar'
import { EmptyState, Modal } from '@/components/ui/v2'
import { resolveGalleryThumbAsset } from '@/lib/assets/game-images'
import { formatGalleryRequirement } from '@/lib/game/gallery-condition-text'
import {
  galleryEntryHref,
  type GalleryCategory,
  type GalleryEntry,
} from '@/lib/game/gallery-types'
import { useLocalizedHref } from '@/lib/i18n/localized-href'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'

type GalleryEntryListProps = {
  categories: GalleryCategory[]
  entries: GalleryEntry[]
  getT: (key: string) => string
  categoryType: string | null
}

function entryDisplayName(
  entry: GalleryEntry,
  getT: (key: string) => string,
  requirement: string
): string {
  if (entry.nameKey) {
    const name = getT(entry.nameKey)
    if (name && name !== entry.nameKey) return name
  }
  return requirement !== '—' ? requirement : `id ${entry.objectId || entry.id}`
}

export function GalleryEntryList({
  categories,
  entries,
  getT,
  categoryType,
}: GalleryEntryListProps) {
  const { t, site } = useUiTranslation()
  const localized = useLocalizedHref()
  const [search, setSearch] = useState('')
  const [visibleCount, setVisibleCount] = useState(60)
  const [preview, setPreview] = useState<{ src: string; title: string } | null>(null)

  useEffect(() => {
    setVisibleCount(60)
  }, [categoryType])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return entries
      .filter((e) => (categoryType ? e.categoryType === categoryType : true))
      .filter((e) => {
        if (!q) return true
        const label = categories.find((c) => c.type === e.categoryType)?.labelKey
        const requirement = formatGalleryRequirement(e, getT, site('galleryOr'))
        const displayName = entryDisplayName(e, getT, requirement)
        const hay = [
          String(e.id),
          String(e.objectId),
          e.descKey ?? '',
          e.nameKey ?? '',
          e.thumbPath ?? '',
          displayName,
          label ? getT(label) : '',
          requirement,
        ]
          .join(' ')
          .toLowerCase()
        return hay.includes(q)
      })
      .sort((a, b) => a.sort - b.sort || a.id - b.id)
  }, [entries, categoryType, search, categories, getT, site])

  const visible = filtered.slice(0, visibleCount)
  const hasActiveFilters = search.trim().length > 0

  return (
    <div className="gallery-entries space-y-3">
      <GalleryCollectionBar
        search={search}
        onSearchChange={(value) => {
          setSearch(value)
          setVisibleCount(60)
        }}
        onClear={() => {
          setSearch('')
          setVisibleCount(60)
        }}
        resultCount={filtered.length}
        hasActiveFilters={hasActiveFilters}
      />

      {filtered.length === 0 ? (
        <EmptyState message={t(UI_KEYS.common.noData)} />
      ) : (
        <>
          <ul className="gallery-entry-grid">
            {visible.map((entry) => {
              const href = galleryEntryHref(entry)
              const requirement = formatGalleryRequirement(entry, getT, site('galleryOr'))
              const title = entryDisplayName(entry, getT, requirement)
              const thumb = resolveGalleryThumbAsset(entry.thumbPath)
              const hasThumb = Boolean(thumb.rawSrc)

              return (
                <li key={entry.id} className="gallery-entry-card surface">
                  <div
                    className={`gallery-entry-card__thumb${hasThumb ? '' : ' gallery-entry-card__thumb--missing'}`}
                  >
                    {hasThumb ? (
                      <button
                        type="button"
                        className="gallery-entry-card__thumb-btn"
                        onClick={() => setPreview({ src: thumb.src, title })}
                        aria-label={site('galleryZoomImage')}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={thumb.src} alt="" loading="lazy" />
                      </button>
                    ) : (
                      <span>—</span>
                    )}
                    {entry.exp > 0 ? (
                      <span
                        className="gallery-entry-card__exp"
                        aria-label={`${site('galleryPoints')} +${entry.exp}`}
                      >
                        +{entry.exp}
                      </span>
                    ) : null}
                  </div>
                  <div className="gallery-entry-card__body">
                    {href ? (
                      <Link
                        href={localized(href)}
                        className="gallery-entry-card__name"
                        title={title}
                      >
                        {title}
                      </Link>
                    ) : (
                      <span
                        className="gallery-entry-card__name gallery-entry-card__name--static"
                        title={title}
                      >
                        {title}
                      </span>
                    )}
                    <p className="gallery-entry-card__req" title={requirement}>
                      {requirement}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
          {visibleCount < filtered.length ? (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                className="tab-btn tab-btn-inactive"
                onClick={() => setVisibleCount((n) => n + 60)}
              >
                {site('loadMore')} ({visible.length}/{filtered.length})
              </button>
            </div>
          ) : null}
        </>
      )}

      <Modal
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        title={preview?.title ?? ''}
        className="gallery-image-modal"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview.src} alt={preview.title} className="gallery-image-modal__img" />
        ) : null}
      </Modal>
    </div>
  )
}
