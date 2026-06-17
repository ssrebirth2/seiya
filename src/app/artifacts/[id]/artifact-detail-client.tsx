'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase-client'
import { useLanguage } from '@/context/language-context'
import { translateKeys, createTranslationGetter } from '@/lib/i18n/language-package'
import { LoadingSkeleton, QualityBadge, StatGrid, DetailPageShell } from '@/components/ui/v2'
import { SetPageMeta } from '@/lib/ui/usePageMeta'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'
import { qualityNameKey, SITE_ONLY_LABELS } from '@/lib/i18n/ui-keys'
import { applySkillValues, formatDisplayText, loadSkillValues } from '@/lib/game/apply-skill-values'
import {
  normalizeDesValueList,
  normalizeSkillRefList,
  parseGameData,
} from '@/lib/game/parse-game-data'
import ArtifactSkillList from '@/components/artifacts/ArtifactSkillList'
import ArtifactPreviewImage from '@/components/ui/ArtifactPreviewImage'
import GameImage from '@/components/ui/GameImage'
import { resolveAssetUrl, IMAGE_UNAVAILABLE } from '@/lib/assets/asset-registry'
import { resolveSkillIconUrl } from '@/lib/game/resolve-skill-icon'

type StarRow = {
  id: number
  artifact_id: number
  quality: number
  star: number
  consume_num?: number
  exchange_num?: number
  consume_money?: any
  consume_item?: any
  attribute?: any
  skill_up?: any
  power_ratio?: number
}

type SkillConfig = {
  skillid: number
  name: string
  iconpath?: string
  skill_des?: any
  skill_sketch?: any
}

export default function ArtifactDetailClient() {
  const { id } = useParams()
  const artifactId = parseInt(id as string)
  const { lang } = useLanguage()
  const { t, site } = useUiTranslation()

  const [artifact, setArtifact] = useState<any>(null)
  const [stars, setStars] = useState<StarRow[]>([])
  const [skill, setSkill] = useState<SkillConfig | null>(null)
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [valuesMap, setValuesMap] = useState<Record<number, (string | number)[]>>({})
  const [labelMap, setLabelMap] = useState<Record<number, string>>({})
  const [limitText, setLimitText] = useState<string>('')
  const [isReady, setIsReady] = useState(false)

  const getT = useMemo(() => createTranslationGetter(translations), [translations])

  useEffect(() => {
    const fetchArtifactData = async () => {
      const [{ data: art }, { data: res }, { data: starData }] = await Promise.all([
        supabase.from('ArtifactConfig').select('*').eq('id', artifactId).single(),
        supabase.from('ArtifactResourcesConfig').select('*').eq('id', artifactId).single(),
        supabase.from('ArtifactStarConfig').select('*').eq('artifact_id', artifactId)
      ])

      if (!art) {
        setIsReady(true)
        return
      }

      const artifact = {
        ...art,
        preview_icon_raw: res?.preview_icon ?? null,
        initial_quality:
          typeof art.initial_quality === 'number' ? art.initial_quality - 1 : art.initial_quality
      }

      const starRows = ((starData || []) as StarRow[]).map(row => ({
        ...row,
        quality: typeof row.quality === 'number' ? row.quality - 1 : row.quality
      }))

      const qualities = Array.from(new Set(starRows.map(s => s.quality))).sort((a, b) => a - b)

      const firstSkillId =
        starRows.map(s => normalizeSkillRefList(s.skill_up)[0]?.skill_id).find(Boolean) || null

      let labelIds: number[] = []
      try {
        if (artifact.label_list) {
          labelIds =
            typeof artifact.label_list === 'string'
              ? JSON.parse(artifact.label_list)
              : Array.isArray(artifact.label_list)
              ? artifact.label_list
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

      const skill = (skillRes.data?.[0] as SkillConfig) || null
      const labelRecords: any[] = labelsRes.data ?? []

      // === Traduções ===
      const keys = new Set<string>()
      const valueIds = new Set<number>()

      if (artifact.name) keys.add(artifact.name)
      if (artifact.desc) keys.add(artifact.desc)
      if (artifact.camp) keys.add(artifact.camp)

      labelRecords.forEach(l => keys.add(l.name))

      // 🔹 processar restrições (limit)
      let limitDisplay = ''
      try {
        const limits = parseGameData(artifact.limit)
        if (Array.isArray(limits) && limits.length > 0) {
          const entry = limits[0] as { type?: string; value?: number[] }
          if (entry?.type && Array.isArray(entry.value) && entry.value.length > 0) {
            // só mostra se NÃO for genérico (ex: [1, 2, 3])
            if (!(entry.value.length === 3 && entry.value.includes(1) && entry.value.includes(2) && entry.value.includes(3))) {
              const key = `LC_HERO_${entry.type}_${entry.value[0]}`
              limitDisplay = key
              keys.add(key)
            }
          }
        }
      } catch {
        limitDisplay = ''
      }

      // Qualidades
      qualities.forEach((q) => keys.add(qualityNameKey(q)))
      if (artifact.initial_quality != null)
        keys.add(qualityNameKey(artifact.initial_quality))

      // atributos
      starRows.forEach(row =>
        parseGameData(row.attribute).forEach((a: any) => a?.[0] && keys.add(a[0]))
      )

      // textos de skill
      if (skill) {
        if (skill.name) keys.add(skill.name)
        ;[...normalizeDesValueList(skill.skill_des), ...normalizeDesValueList(skill.skill_sketch)].forEach((d) => {
          if (d.des) keys.add(d.des)
          if (d.value) valueIds.add(Number(d.value))
        })
      }

      const [translated, values] = await Promise.all([
        translateKeys(Array.from(keys), lang),
        loadSkillValues(Array.from(valueIds))
      ])

      const lblMap: Record<number, string> = {}
      labelRecords.forEach(l => (lblMap[l.id] = translated[l.name] || l.name))

      setArtifact(artifact)
      setStars(starRows)
      setSkill(skill)
      setTranslations(translated)
      setValuesMap(values)
      setLabelMap(lblMap)
      setLimitText(limitDisplay ? translated[limitDisplay] || limitDisplay : '')
      setIsReady(true)
    }

    fetchArtifactData()
  }, [artifactId, lang])

  // === Skill base ===
  const skillMainDescription = useMemo(() => {
    const desList = normalizeDesValueList(skill?.skill_des)
    const first = desList[0]
    return first ? applySkillValues(getT(first.des), first.value ?? 0, valuesMap) : ''
  }, [skill, translations, valuesMap])

  const translatedTags = Object.values(labelMap).join(', ')
  const qualityLabel =
    artifact != null ? getT(qualityNameKey(artifact.initial_quality)) : ''

  const statEntries = useMemo(() => {
    if (!artifact) return []
    const entries: { key: string; label: string; value: string; html?: boolean }[] = []

    if (qualityLabel)
      entries.push({ key: 'quality', label: t(UI_KEYS.common.quality), value: qualityLabel })
    if (artifact.camp) {
      entries.push({
        key: 'camp',
        label: t(UI_KEYS.filter.faction),
        value: formatDisplayText(getT(artifact.camp), 0, {}),
        html: true,
      })
    }
    if (translatedTags)
      entries.push({ key: 'tags', label: SITE_ONLY_LABELS.tags, value: translatedTags })
    if (limitText) {
      entries.push({
        key: 'limit',
        label: t(UI_KEYS.artifact.restriction),
        value: applySkillValues(limitText, 0, valuesMap),
        html: true,
      })
    }
    return entries
  }, [artifact, qualityLabel, translatedTags, limitText, valuesMap, getT, t, site])

  if (!isReady) {
    return <LoadingSkeleton variant="detail" />
  }

  if (!artifact) {
    return (
      <div className="panel py-12 text-center">
        <p className="mb-4 text-text-muted">{site('artifactNotFound')}</p>
        <Link href="/artifacts" className="btn-secondary inline-flex items-center gap-2">
          <ArrowLeft size={16} />
          {t(UI_KEYS.common.loginBack)}
        </Link>
      </div>
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
          <section className="panel overflow-hidden">
            <div className="grid gap-6 md:grid-cols-[minmax(0,280px)_1fr] md:items-center">
              <ArtifactPreviewImage
                artifactId={artifactId}
                dbPreviewPath={artifact.preview_icon_raw}
                alt={getT(artifact.name)}
                className="mx-auto h-56 w-56 rounded-xl border border-panel-border bg-panel-hover/50 p-6 object-contain md:h-72 md:w-full"
              />
              <div className="text-center md:text-left">
                <div className="mb-3 flex flex-wrap items-center justify-center gap-2 md:justify-start">
                  {artifact.initial_quality != null ? (
                    <QualityBadge quality={artifact.initial_quality} className="text-sm" />
                  ) : null}
                  <span className="text-xs text-text-muted">ID {artifact.id}</span>
                </div>
                <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl">
                  {getT(artifact.name)}
                </h1>
              </div>
            </div>
          </section>
        }
        stats={statEntries.length > 0 ? <StatGrid title={t(UI_KEYS.common.baseAttribute)} entries={statEntries} /> : null}
      >
        {artifact.desc && (
          <section className="panel">
            <p
              className="text-sm leading-relaxed text-text-muted whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: applySkillValues(getT(artifact.desc), 0, {}) }}
            />
          </section>
        )}

        {skill && (
          <section className="panel">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
              {t(UI_KEYS.artifact.relicSkills)}
            </h2>
            <div className="flex items-start gap-4">
              <GameImage
                src={resolveAssetUrl(resolveSkillIconUrl(skill), IMAGE_UNAVAILABLE)}
                rawSrc={resolveSkillIconUrl(skill) || undefined}
                alt={getT(skill.name)}
                className="h-16 w-16 shrink-0 object-contain sm:h-20 sm:w-20"
              />
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-lg font-semibold">{getT(skill.name)}</p>
                {skillMainDescription && (
                  <div
                    className="text-sm leading-relaxed text-text-muted whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: skillMainDescription }}
                  />
                )}
              </div>
            </div>
          </section>
        )}

        {stars.length > 0 ? (
          <section className="panel !p-0 overflow-hidden">
            <ArtifactSkillList stars={stars} skill={skill} getT={getT} valuesMap={valuesMap} />
          </section>
        ) : (
          <section className="panel text-center text-sm text-text-muted">
            No progression data available for this artifact.
          </section>
        )}
      </DetailPageShell>
    </>
  )
}
