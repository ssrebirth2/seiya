'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SkillFilterBar, type SkillListFilters, type SkillSortKey } from '@/components/skills/SkillFilterBar'
import { SkillIndexRow, useOpenSkillFromUrl } from '@/components/skills/SkillIndexRow'
import { ListPagePanel } from '@/components/layout/ListPagePanel'
import { Button, EmptyState, LoadingSkeleton, PageHeader } from '@/components/ui/v2'
import { useLanguage } from '@/context/language-context'
import {
  loadSkillValues,
  setupGlobalSkillTooltips,
} from '@/lib/game/apply-skill-values'
import {
  collectSkillCatalogLcKeys,
  filterSkillCatalog,
  loadSkillCatalog,
  SKILL_CATALOG_PAGE_SIZE,
  type SkillCatalogFilters,
  type SkillCatalogRow,
} from '@/lib/game/skill-catalog'
import { skillBandFilterLabel } from '@/lib/game/skill-filter-labels'
import { type SkillDisplayCopy } from '@/lib/game/skill-completeness'
import {
  collectUniqueOwners,
  loadSkillOwnerDisplayMap,
  type SkillOwnerDisplay,
} from '@/lib/game/skill-owner-display'
import {
  buildSkillTagOptions,
  collectSkillLinkIds,
  skillFeatureNameLcKey,
} from '@/lib/game/skill-tag-filter'
import { normalizeDesValueList } from '@/lib/game/parse-game-data'
import { createTranslationGetter, translateKeys } from '@/lib/i18n/language-package'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'

function mergeTranslationMaps(
  prev: Record<string, string>,
  incoming: Record<string, string>
): Record<string, string> {
  let changed = false
  const next = { ...prev }
  for (const [key, value] of Object.entries(incoming)) {
    if (prev[key] !== value) {
      next[key] = value
      changed = true
    }
  }
  return changed ? next : prev
}

const INITIAL_FILTERS: SkillListFilters = {
  search: '',
  skillType: '',
  tag: '',
  band: '',
}

export default function SkillsClient() {
  const { lang } = useLanguage()
  const { t, site, noData } = useUiTranslation()

  const [rows, setRows] = useState<SkillCatalogRow[]>([])
  const [labels, setLabels] = useState<{ id: number; nameKey: string }[]>([])
  const [ownerDisplayMap, setOwnerDisplayMap] = useState<Map<string, SkillOwnerDisplay>>(
    () => new Map()
  )
  const [loading, setLoading] = useState(true)
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [valuesMap, setValuesMap] = useState<Record<number, (string | number)[]>>({})
  const [labelMap, setLabelMap] = useState<Record<number, string>>({})
  const [page, setPage] = useState(1)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [filters, setFilters] = useState<SkillListFilters>(INITIAL_FILTERS)
  const [sortBy, setSortBy] = useState<SkillSortKey>('id')

  const displayCopy: SkillDisplayCopy = useMemo(
    () => ({
      noName: site('skillHasNoName'),
      noDescription: site('skillHasNoDescription'),
      noIcon: site('skillHasNoIcon'),
    }),
    [site]
  )

  useEffect(() => {
    setupGlobalSkillTooltips()
  }, [])

  useOpenSkillFromUrl(setExpandedId)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    loadSkillCatalog()
      .then(async (data) => {
        if (cancelled) return
        setRows(data.rows)
        setLabels(data.labels)
        const owners = collectUniqueOwners(
          data.rows.map((r) => r.owners),
          new Set(['hero', 'force_card', 'artifact', 'spirit'])
        )
        const displayMap = await loadSkillOwnerDisplayMap(owners, lang)
        if (!cancelled) setOwnerDisplayMap(displayMap)
      })
      .catch((err) => {
        console.error('[skills] load failed', err)
        if (!cancelled) {
          setRows([])
          setLabels([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [lang])

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(filters.search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [filters.search])

  useEffect(() => {
    setPage(1)
  }, [
    filters.skillType,
    filters.tag,
    filters.band,
    sortBy,
    debouncedSearch,
  ])

  const translationKeys = useMemo(
    () => collectSkillCatalogLcKeys(rows, labels),
    [rows, labels]
  )

  const translationKeysKey = translationKeys.join('\0')

  useEffect(() => {
    if (!translationKeysKey) return
    let cancelled = false
    const keys = translationKeysKey.split('\0').filter(Boolean)
    translateKeys(keys, lang).then((map) => {
      if (cancelled) return
      setTranslations((prev) => mergeTranslationMaps(prev, map))
    })
    return () => {
      cancelled = true
    }
  }, [lang, translationKeysKey])

  const getT = useMemo(
    () => createTranslationGetter(translations, { lang }),
    [translations, lang]
  )

  const rowsWithFeatures = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        featureIds: row.layer === 'hidden' ? [] : collectSkillLinkIds(row.raw, getT),
      })),
    [rows, getT]
  )

  const usedFeatureIdsKey = useMemo(() => {
    const ids = new Set<number>()
    for (const row of rowsWithFeatures) {
      if (row.layer === 'hidden') continue
      for (const id of row.featureIds) ids.add(id)
    }
    return [...ids].sort((a, b) => a - b).join(',')
  }, [rowsWithFeatures])

  const usedFeatureIds = useMemo(
    () =>
      usedFeatureIdsKey
        ? usedFeatureIdsKey.split(',').map(Number).filter(Number.isFinite)
        : [],
    [usedFeatureIdsKey]
  )

  useEffect(() => {
    if (!usedFeatureIdsKey) return
    let cancelled = false
    const keys = usedFeatureIdsKey.split(',').map((id) => skillFeatureNameLcKey(Number(id)))
    translateKeys(keys, lang).then((map) => {
      if (cancelled) return
      setTranslations((prev) => mergeTranslationMaps(prev, map))
    })
    return () => {
      cancelled = true
    }
  }, [lang, usedFeatureIdsKey])

  const tagOptions = useMemo(
    () =>
      buildSkillTagOptions({
        labels,
        usedFeatureIds,
        getT,
        noData,
      }),
    [labels, usedFeatureIds, getT, noData]
  )

  useEffect(() => {
    if (!filters.tag) return
    if (tagOptions.some((opt) => opt.value === filters.tag)) return
    setFilters((prev) => ({ ...prev, tag: '' }))
  }, [tagOptions, filters.tag])

  useEffect(() => {
    const next: Record<number, string> = {}
    for (const label of labels) {
      const text = getT(label.nameKey)
      if (!text?.trim() || text === label.nameKey) continue
      if (text === noData) continue
      next[label.id] = text
    }
    setLabelMap((prev) => {
      const prevKeys = Object.keys(prev)
      const nextKeys = Object.keys(next)
      if (
        prevKeys.length === nextKeys.length &&
        nextKeys.every((k) => prev[Number(k)] === next[Number(k)])
      ) {
        return prev
      }
      return next
    })
  }, [labels, getT, noData])

  const activeFilters: SkillCatalogFilters = useMemo(
    () => ({ ...filters, search: debouncedSearch, sortBy }),
    [filters, debouncedSearch, sortBy]
  )

  const filtered = useMemo(
    () => filterSkillCatalog(rowsWithFeatures, activeFilters, getT, displayCopy, ownerDisplayMap),
    [rowsWithFeatures, activeFilters, getT, displayCopy, ownerDisplayMap]
  )

  const visible = useMemo(
    () => filtered.slice(0, page * SKILL_CATALOG_PAGE_SIZE),
    [filtered, page]
  )

  const listRows = useMemo(() => {
    if (expandedId == null) return visible
    if (visible.some((r) => r.skillid === expandedId)) return visible
    const extra = rowsWithFeatures.find((r) => r.skillid === expandedId)
    return extra ? [extra, ...visible] : visible
  }, [visible, rowsWithFeatures, expandedId])

  const listValueIdsKey = useMemo(() => {
    const ids = new Set<number>()
    for (const row of listRows) {
      for (const field of ['skill_des', 'skill_sketch', 'awaken_skill_des'] as const) {
        for (const entry of normalizeDesValueList(row.raw[field])) {
          const vid = entry.value != null ? Number(entry.value) : NaN
          if (Number.isFinite(vid)) ids.add(vid)
        }
      }
    }
    return [...ids].sort((a, b) => a - b).join(',')
  }, [listRows])

  const listDesKeysKey = useMemo(() => {
    const keys = new Set<string>()
    for (const row of listRows) {
      for (const field of ['skill_des', 'skill_sketch', 'awaken_skill_des'] as const) {
        for (const entry of normalizeDesValueList(row.raw[field])) {
          if (entry.des) keys.add(entry.des)
        }
      }
    }
    return [...keys].sort().join('\0')
  }, [listRows])

  const loadedValueIdsRef = useRef<Set<number>>(new Set())

  useEffect(() => {
    if (!listDesKeysKey) return
    let cancelled = false
    const keys = listDesKeysKey.split('\0').filter(Boolean)
    translateKeys(keys, lang).then((map) => {
      if (!cancelled) setTranslations((prev) => mergeTranslationMaps(prev, map))
    })
    return () => {
      cancelled = true
    }
  }, [lang, listDesKeysKey])

  useEffect(() => {
    if (!listValueIdsKey) return
    let cancelled = false
    const wanted = listValueIdsKey.split(',').map(Number).filter(Number.isFinite)
    const missing = wanted.filter((id) => !loadedValueIdsRef.current.has(id))
    if (!missing.length) return

    loadSkillValues(missing, {
      onChunk: (partial) => {
        if (cancelled) return
        for (const id of Object.keys(partial)) loadedValueIdsRef.current.add(Number(id))
        setValuesMap((prev) => ({ ...prev, ...partial }))
      },
    }).then((map) => {
      if (cancelled) return
      for (const id of Object.keys(map)) loadedValueIdsRef.current.add(Number(id))
      setValuesMap((prev) => ({ ...prev, ...map }))
    })

    return () => {
      cancelled = true
    }
  }, [listValueIdsKey])

  const handleFilterChange = useCallback(
    <K extends keyof SkillListFilters>(field: K, value: SkillListFilters[K]) => {
      setFilters((prev) => ({ ...prev, [field]: value }))
    },
    []
  )

  const resetFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS)
    setSortBy('id')
  }, [])

  const toggleExpanded = useCallback((skillId: number) => {
    setExpandedId((prev) => (prev === skillId ? null : skillId))
  }, [])

  if (loading) {
    return (
      <ListPagePanel>
        <LoadingSkeleton variant="filters" />
        <LoadingSkeleton variant="detail" />
      </ListPagePanel>
    )
  }

  return (
    <ListPagePanel>
      <PageHeader
        title={t(UI_KEYS.nav.skills) || site('skillList')}
        subtitle={site('skillsCardDesc')}
      />

      <SkillFilterBar
        filters={filters}
        sortBy={sortBy}
        tagOptions={tagOptions}
        onFilterChange={handleFilterChange}
        onSortChange={setSortBy}
        onClear={resetFilters}
        getT={getT}
        resultCount={filtered.length}
      />

      {listRows.length === 0 ? (
        <EmptyState message={site('noSkillsMatch')} />
      ) : (
        <>
          <div className="skill-index-list">
            {listRows.map((row) => (
              <SkillIndexRow
                key={row.skillid}
                row={row}
                getT={getT}
                displayCopy={displayCopy}
                ownerDisplayMap={ownerDisplayMap}
                valuesMap={valuesMap}
                labelMap={labelMap}
                expanded={expandedId === row.skillid}
                onToggle={() => toggleExpanded(row.skillid)}
                bandLabel={skillBandFilterLabel(row.band, t, (key) => site(key as 'skillBandHero'))}
              />
            ))}
          </div>

          {visible.length < filtered.length ? (
            <div className="mt-6 flex justify-center">
              <Button type="button" onClick={() => setPage((p) => p + 1)}>
                {site('loadMore')} ({visible.length}/{filtered.length})
              </Button>
            </div>
          ) : null}
        </>
      )}
    </ListPagePanel>
  )
}
