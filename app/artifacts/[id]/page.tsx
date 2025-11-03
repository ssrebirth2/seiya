'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { translateKeys } from '@/lib/translate'
import { applySkillValues, loadSkillValues } from '@/lib/applySkillValues'
import ArtifactSkillList from '@/components/ArtifactSkillList'

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

const resolveImagePath = (path?: string): string =>
  path ? `/assets/resources/textures/${path.replace(/Textures\//i, '').toLowerCase()}.png` : ''

const parseOrEmpty = (v: any) => {
  if (!v) return []
  try {
    if (typeof v === 'string') return JSON.parse(v)
    if (Array.isArray(v)) return v
    if (typeof v === 'object') return v
  } catch {}
  return []
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

      if (!art) return

      const artifact = {
        ...art,
        preview_icon: res?.preview_icon ? resolveImagePath(res.preview_icon) : null,
        initial_quality:
          typeof art.initial_quality === 'number' ? art.initial_quality - 1 : art.initial_quality
      }

      const starRows = ((starData || []) as StarRow[]).map(row => ({
        ...row,
        quality: typeof row.quality === 'number' ? row.quality - 1 : row.quality
      }))

      const qualities = Array.from(new Set(starRows.map(s => s.quality))).sort((a, b) => a - b)

      const firstSkillId =
        starRows.map(s => parseOrEmpty(s.skill_up)[0]?.skill_id).find(Boolean) || null

      let skill: SkillConfig | null = null
      if (firstSkillId) {
        const { data: skillRows } = await supabase
          .from('SkillConfig')
          .select('*')
          .eq('skillid', firstSkillId)
          .limit(1)
        skill = (skillRows?.[0] as SkillConfig) || null
      }

      // === Traduções ===
      const keys = new Set<string>()
      const valueIds = new Set<number>()

      if (artifact.name) keys.add(artifact.name)
      if (artifact.desc) keys.add(artifact.desc)
      if (artifact.camp) keys.add(artifact.camp)

      // 🔹 processar tags (label_list)
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

      let labelRecords: any[] = []
      if (labelIds.length > 0) {
        const { data: labels } = await supabase
          .from('SkillLabelConfig')
          .select('id, name')
          .in('id', labelIds)
        labelRecords = labels ?? []
        labelRecords.forEach(l => keys.add(l.name))
      }

      // 🔹 processar restrições (limit)
      let limitDisplay = ''
      try {
        const limits = parseOrEmpty(artifact.limit)
        if (Array.isArray(limits) && limits.length > 0) {
          const entry = limits[0]
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
        parseOrEmpty(row.attribute).forEach((a: any) => a?.[0] && keys.add(a[0]))
      )

      // textos de skill
      if (skill) {
        if (skill.name) keys.add(skill.name)
        ;[...parseOrEmpty(skill.skill_des), ...parseOrEmpty(skill.skill_sketch)].forEach((d: any) => {
          if (d?.des) keys.add(d.des)
          if (d?.value) valueIds.add(Number(d.value))
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
  const skillIcon = useMemo(
    () =>
      skill
        ? `/assets/resources/textures/artifact/artifactskill/skillicon/SkillIcon_${skill.skillid}.png`
        : null,
    [skill]
  )

  const skillMainDescription = useMemo(() => {
    const desList = parseOrEmpty(skill?.skill_des)
    const first = desList?.[0]
    return first ? applySkillValues(getT(first.des), first.value, valuesMap) : ''
  }, [skill, translations, valuesMap])

  if (!isReady || !artifact) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[var(--text-muted)]">Carregando informações do artefato...</p>
      </div>
    </div>
  )
}
  const translatedTags = Object.values(labelMap).join(', ')

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* ===== HEADER ===== */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
        {artifact.preview_icon && (
          <img
            src={artifact.preview_icon}
            alt={getT(artifact.name)}
            className="w-96 h-96 p-5 border rounded-xl bg-[var(--panel)]"
            style={{ borderColor: 'var(--panel-border)' }}
          />
        )}

        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-1">{getT(artifact.name)}</h1>
          <p className="text-sm text-[var(--text-muted)] whitespace-pre-wrap mb-3">
            {getT(artifact.desc)}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm mb-4">
            <p>{getT(`LC_COMMON_quality_name_${artifact.initial_quality}`)}</p>
            <p>{getT(artifact.camp)}</p>
            <p>Tags: {translatedTags}</p>
           
            {limitText && (
            <p>
              Restrição: <span dangerouslySetInnerHTML={{ __html: applySkillValues(limitText, 0, valuesMap),}}/>
            </p>
            )}
          </div>

          {/* ===== SKILL BASE ===== */}
          {skill && (
            <section
              className="p-5 border rounded-xl bg-[var(--panel)]"
              style={{ borderColor: 'var(--panel-border)' }}
            >
              <div className="flex items-center gap-4 mb-3">
                {skillIcon && (
                  <img
                    src={skillIcon}
                    alt={getT(skill.name)}
                    className="w-24 h-24 object-contain"
                  />
                )}
                <p className="text-xl font-semibold">{getT(skill.name)}</p>
              </div>
              {skillMainDescription && (
                <div
                  className="text-sm text-[var(--text-muted)] whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: skillMainDescription }}
                />
              )}
            </section>
          )}
        </div>
      </div>

      {/* ===== TABS + PROGRESSÃO ===== */}
      <ArtifactSkillList stars={stars} skill={skill} getT={getT} valuesMap={valuesMap} />
    </div>
  )
}
