'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase-client'
import { useLanguage } from '@/context/language-context'
import { useLocalizedHref } from '@/lib/i18n/localized-href'
import { translateKeys, createTranslationGetter } from '@/lib/i18n/language-package'
import { LoadingSkeleton, DetailPageShell } from '@/components/ui/v2'
import { SetPageMeta } from '@/lib/ui/usePageMeta'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'
import { qualityNameKey } from '@/lib/i18n/ui-keys'
import { applySkillValues, formatPlainLabel, loadSkillValues } from '@/lib/game/apply-skill-values'
import {
  ARTIFACT_UR_QUALITY_KEY,
  artifactQualityLabelKey,
  artifactDisplayQuality,
  artifactFrameQuality,
  buildArtifactRestrictionChips,
  collectArtifactRestrictionTranslationKeys,
  getArtifactTierConsumeSource,
  isArtifactAdvanceAwakenStarQuality,
  sortArtifactStarRows,
  type ArtifactStarRow,
} from '@/lib/game/artifact-equip'
import type { ConsumeEntry } from '@/lib/game/parse-game-data'
import type { ConsumeRefMap } from '@/lib/game/load-hero-talents-bundle'
import { preloadConsumeRefMap } from '@/hooks/use-consume-ref-map'
import ArtifactAscensionList from '@/components/artifacts/ArtifactAscensionList'
import { ArtifactDetailHeader } from '@/components/artifacts/ArtifactDetailHeader'
import { SkillDetailCard } from '@/components/heroes/SkillDetailCard'
import { resolveSkillIconUrl } from '@/lib/game/resolve-skill-icon'
import {
  normalizeConsumeList,
  normalizeDesValueList,
  normalizeSkillRefList,
  parseGameData,
} from '@/lib/game/parse-game-data'

type SkillConfig = {
  skillid: number
  name: string
  iconpath?: string
  skill_des?: unknown
  skill_sketch?: unknown
}

function collectArtifactConsumeEntries(stars: ArtifactStarRow[]): ConsumeEntry[] {
  const sorted = sortArtifactStarRows(stars)
  const entries: ConsumeEntry[] = []
  for (let index = 1; index < sorted.length; index++) {
    const source = getArtifactTierConsumeSource(sorted, index)
    if (!source) continue
    entries.push(...normalizeConsumeList(source.consume_money))
    entries.push(...normalizeConsumeList(source.consume_item))
  }
  return entries
}

export default function ArtifactDetailClient() {
  const { id } = useParams()
  const artifactId = parseInt(id as string)
  const { lang } = useLanguage()
  const localized = useLocalizedHref()
  const { t, site } = useUiTranslation()

  const [artifact, setArtifact] = useState<any>(null)
  const [stars, setStars] = useState<ArtifactStarRow[]>([])
  const [skill, setSkill] = useState<SkillConfig | null>(null)
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [valuesMap, setValuesMap] = useState<Record<number, (string | number)[]>>({})
  const [labelMap, setLabelMap] = useState<Record<number, string>>({})
  const [consumeRefMap, setConsumeRefMap] = useState<ConsumeRefMap>({})
  const [isReady, setIsReady] = useState(false)

  const getT = useMemo(() => createTranslationGetter(translations, { lang }), [translations, lang])

  useEffect(() => {
    let cancelled = false

    const fetchArtifactData = async () => {
      setIsReady(false)

      const [{ data: art }, { data: res }, { data: starData }] = await Promise.all([
        supabase.from('ArtifactConfig').select('*').eq('id', artifactId).single(),
        supabase.from('ArtifactResourcesConfig').select('*').eq('id', artifactId).single(),
        supabase.from('ArtifactStarConfig').select('*').eq('artifact_id', artifactId),
      ])

      if (cancelled) return

      if (!art) {
        setArtifact(null)
        setIsReady(true)
        return
      }

      const artifactRow = {
        ...art,
        preview_icon_raw: res?.preview_icon ?? null,
        item_icon_raw: res?.item_icon ?? null,
        initial_quality: artifactDisplayQuality(art.initial_quality),
        frame_quality: artifactFrameQuality(art.initial_quality),
      }

      const starRows = ((starData || []) as ArtifactStarRow[]).map((row) => ({
        ...row,
        config_quality: typeof row.quality === 'number' ? row.quality : row.quality,
        quality: typeof row.quality === 'number' ? row.quality - 1 : row.quality,
      }))

      const qualities = Array.from(new Set(starRows.map((s) => s.quality))).sort((a, b) => a - b)

      const firstSkillId =
        starRows.map((s) => normalizeSkillRefList(s.skill_up)[0]?.skill_id).find(Boolean) || null

      let labelIds: number[] = []
      try {
        if (artifactRow.label_list) {
          labelIds =
            typeof artifactRow.label_list === 'string'
              ? JSON.parse(artifactRow.label_list)
              : Array.isArray(artifactRow.label_list)
                ? artifactRow.label_list
                : []
        }
      } catch {
        labelIds = []
      }

      const [skillRes, labelsRes] = await Promise.all([
        firstSkillId
          ? supabase.from('SkillConfig').select('*').eq('skillid', firstSkillId).limit(1)
          : Promise.resolve({ data: null as SkillConfig[] | null }),
        labelIds.length > 0
          ? supabase.from('SkillLabelConfig').select('id, name').in('id', labelIds)
          : Promise.resolve({ data: [] as { id: number; name: string }[] | null }),
      ])

      if (cancelled) return

      const skillRow = (skillRes.data?.[0] as SkillConfig) || null
      const labelRecords: { id: number; name: string }[] = labelsRes.data ?? []

      const keys = new Set<string>()
      if (artifactRow.name) keys.add(artifactRow.name)
      if (artifactRow.desc) keys.add(artifactRow.desc)
      if (artifactRow.camp) keys.add(artifactRow.camp)

      labelRecords.forEach((l) => keys.add(l.name))

      collectArtifactRestrictionTranslationKeys(artifactRow.limit).forEach((key) => keys.add(key))

      qualities.forEach((q) => keys.add(qualityNameKey(q)))
      if (starRows.some((row) => isArtifactAdvanceAwakenStarQuality(row.config_quality ?? row.quality + 1))) {
        keys.add(ARTIFACT_UR_QUALITY_KEY)
      }
      if (artifactRow.initial_quality != null) {
        keys.add(qualityNameKey(artifactRow.initial_quality))
        keys.add(artifactQualityLabelKey(artifactRow.frame_quality))
      }

      starRows.forEach((row) =>
        parseGameData(row.attribute).forEach((a: unknown) => {
          const attr = a as [string, unknown, unknown]
          if (attr?.[0]) keys.add(attr[0])
        })
      )

      const valueIds = new Set<number>()
      if (skillRow) {
        if (skillRow.name) keys.add(skillRow.name)
        ;[...normalizeDesValueList(skillRow.skill_des), ...normalizeDesValueList(skillRow.skill_sketch)].forEach(
          (d) => {
            if (d.des) keys.add(d.des)
            if (d.value) valueIds.add(Number(d.value))
          }
        )
      }

      const consumeEntries = collectArtifactConsumeEntries(starRows)

      const [translated, values, preloadedConsumeRefs] = await Promise.all([
        translateKeys(Array.from(keys), lang),
        loadSkillValues(Array.from(valueIds)),
        preloadConsumeRefMap(consumeEntries, lang),
      ])

      if (cancelled) return

      const lblMap: Record<number, string> = {}
      labelRecords.forEach((l) => (lblMap[l.id] = translated[l.name] || l.name))

      setArtifact(artifactRow)
      setStars(starRows)
      setSkill(skillRow)
      setTranslations(translated)
      setValuesMap(values)
      setLabelMap(lblMap)
      setConsumeRefMap(preloadedConsumeRefs)
      setIsReady(true)
    }

    fetchArtifactData()
    return () => {
      cancelled = true
    }
  }, [artifactId, lang])

  const skillMainDescription = useMemo(() => {
    const desList = normalizeDesValueList(skill?.skill_des)
    const first = desList[0]
    return first ? applySkillValues(getT(first.des), first.value ?? 0, valuesMap) : ''
  }, [skill, getT, valuesMap])

  const tagLabels = useMemo(() => Object.values(labelMap), [labelMap])

  const restrictionChips = useMemo(
    () => (artifact ? buildArtifactRestrictionChips(artifact.limit, lang) : []),
    [artifact, lang]
  )

  const campLabel = artifact?.camp
    ? formatPlainLabel(getT(artifact.camp), 0, valuesMap)
        .replace(/^(facção|faction):\s*/i, '')
        .trim()
    : undefined

  const storyHtml = artifact?.desc
    ? applySkillValues(getT(artifact.desc), 0, {})
    : undefined
  const skillIconPath = skill ? resolveSkillIconUrl(skill) : ''

  if (!isReady) {
    return <LoadingSkeleton variant="detail" />
  }

  if (!artifact) {
    return (
      <DetailPageShell
        backHref="/artifacts"
        backLabel={t(UI_KEYS.common.loginBack)}
        title={site('artifactNotFound')}
      >
        <div className="surface panel py-12 text-center">
          <p className="mb-4 text-text-muted">{site('artifactNotFound')}</p>
          <Link href={localized('/artifacts')} className="btn-secondary inline-flex items-center gap-2">
            <ArrowLeft size={16} />
            {t(UI_KEYS.common.loginBack)}
          </Link>
        </div>
      </DetailPageShell>
    )
  }

  return (
    <>
      <SetPageMeta title={getT(artifact.name)} />
      <DetailPageShell
        backHref="/artifacts"
        backLabel={t(UI_KEYS.common.loginBack)}
        title={getT(artifact.name)}
        header={
          <ArtifactDetailHeader
            artifactId={artifactId}
            badgeQuality={artifact.frame_quality}
            name={getT(artifact.name)}
            previewIconPath={artifact.preview_icon_raw}
            storyHtml={storyHtml}
            tagLabels={tagLabels}
            campLabel={campLabel}
            restrictionChips={restrictionChips}
            getT={getT}
          />
        }
      >
        {skill ? (
          <section className="surface panel">
            <h2 className="item-detail-section__title">{t(UI_KEYS.artifact.relicSkills)}</h2>
            <SkillDetailCard
              skill={skill}
              name={getT(skill.name)}
              iconPath={skillIconPath}
              skillTypeLabel=""
              tagLabels={[]}
              mainDescriptionHtml={skillMainDescription}
              levelLines={[]}
              headerMode="description"
              noDataLabel={site('noSkills')}
              getT={getT}
            />
            <ArtifactAscensionList
              stars={stars}
              skill={skill}
              artifactId={artifactId}
              frameQuality={artifact.frame_quality}
              itemIconPath={artifact.item_icon_raw}
              getT={getT}
              valuesMap={valuesMap}
              consumeRefMap={consumeRefMap}
              consumeRefReady
            />
          </section>
        ) : stars.length > 0 ? (
          <section className="surface panel">
            <h2 className="item-detail-section__title">{t(UI_KEYS.artifact.relicSkills)}</h2>
            <ArtifactAscensionList
              stars={stars}
              skill={null}
              artifactId={artifactId}
              frameQuality={artifact.frame_quality}
              itemIconPath={artifact.item_icon_raw}
              getT={getT}
              valuesMap={valuesMap}
              consumeRefMap={consumeRefMap}
              consumeRefReady
            />
          </section>
        ) : (
          <section className="surface panel text-center text-sm text-text-muted">
            {t(UI_KEYS.common.noData)}
          </section>
        )}
      </DetailPageShell>
    </>
  )
}
