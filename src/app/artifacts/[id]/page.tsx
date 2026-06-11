'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase-client'
import { useLanguage } from '@/context/language-context'
import { translateKeys } from '@/lib/i18n/language-package'
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

export default function ArtifactDetailPage() {
  const { id } = useParams()
  const artifactId = parseInt(id as string)
  const { lang } = useLanguage()

  const [artifact, setArtifact] = useState<any>(null)
  const [stars, setStars] = useState<StarRow[]>([])
  const [skill, setSkill] = useState<SkillConfig | null>(null)
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [valuesMap, setValuesMap] = useState<Record<number, (string | number)[]>>({})
  const [labelMap, setLabelMap] = useState<Record<number, string>>({})
  const [limitText, setLimitText] = useState<string>('')
  const [isReady, setIsReady] = useState(false)

  const getT = (key?: string) => translations[key || ''] || key || ''

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
      qualities.forEach(q => keys.add(`LC_COMMON_quality_name_${q}`))
      if (artifact.initial_quality != null)
        keys.add(`LC_COMMON_quality_name_${artifact.initial_quality}`)

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
    artifact != null ? getT(`LC_COMMON_quality_name_${artifact.initial_quality}`) : ''

  const statEntries = useMemo(() => {
    if (!artifact) return []
    const entries: { key: string; label: string; value: string; html?: boolean }[] = []

    if (qualityLabel) entries.push({ key: 'quality', label: 'Quality', value: qualityLabel })
    if (artifact.camp) {
      entries.push({
        key: 'camp',
        label: 'Faction',
        value: formatDisplayText(getT(artifact.camp), 0, {}),
        html: true,
      })
    }
    if (translatedTags) entries.push({ key: 'tags', label: 'Tags', value: translatedTags })
    if (limitText) {
      entries.push({
        key: 'limit',
        label: 'Restriction',
        value: applySkillValues(limitText, 0, valuesMap),
        html: true,
      })
    }
    return entries
  }, [artifact, qualityLabel, translatedTags, limitText, valuesMap, translations])

  if (!isReady) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner h-10 w-10" />
          <p className="text-sm text-text-muted">Loading artifact profile...</p>
        </div>
      </div>
    )
  }

  if (!artifact) {
    return (
      <div className="panel py-12 text-center">
        <p className="mb-4 text-text-muted">Artifact not found.</p>
        <Link href="/artifacts" className="btn-secondary inline-flex items-center gap-2">
          <ArrowLeft size={16} />
          Back to Artifacts
        </Link>
      </div>
    )
  }

  return (
    <div className="page-stack -mx-2 sm:mx-0">
      <section className="panel">
        <Link
          href="/artifacts"
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-text-muted transition hover:text-foreground sm:text-sm"
        >
          <ArrowLeft size={14} className="shrink-0" />
          Back to Artifacts
        </Link>

        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <ArtifactPreviewImage
            artifactId={artifactId}
            dbPreviewPath={artifact.preview_icon_raw}
            alt={getT(artifact.name)}
            className="h-48 w-48 shrink-0 rounded-xl border border-panel-border bg-panel p-5 object-contain sm:h-64 sm:w-64 md:h-80 md:w-80"
          />

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="mb-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              {qualityLabel && <span className="badge-accent">{qualityLabel}</span>}
              <span className="text-xs text-text-muted">ID {artifact.id}</span>
            </div>
            <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{getT(artifact.name)}</h1>
          </div>
        </div>
      </section>

      {artifact.desc && (
        <section className="panel">
          <p
            className="text-sm leading-relaxed text-text-muted whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: applySkillValues(getT(artifact.desc), 0, {}) }}
          />
        </section>
      )}

      {statEntries.length > 0 && (
        <section className="panel">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
            Attributes
          </h2>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {statEntries.map(({ key, label, value, html }) => (
              <div
                key={key}
                className="rounded-lg border border-panel-border bg-panel-hover/50 px-3 py-2.5"
              >
                <dt className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-text-muted">
                  {label}
                </dt>
                {html ? (
                  <dd
                    className="text-sm font-semibold leading-snug break-words text-foreground"
                    dangerouslySetInnerHTML={{ __html: value }}
                  />
                ) : (
                  <dd className="text-sm font-semibold leading-snug break-words text-foreground">
                    {value}
                  </dd>
                )}
              </div>
            ))}
          </dl>
        </section>
      )}

      {skill && (
        <section className="panel">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
            Base Skill
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
        <section className="panel !p-0 sm:!p-0 overflow-hidden">
          <ArtifactSkillList stars={stars} skill={skill} getT={getT} valuesMap={valuesMap} />
        </section>
      ) : (
        <section className="panel text-center text-sm text-text-muted">
          No progression data available for this artifact.
        </section>
      )}
    </div>
  )
}
