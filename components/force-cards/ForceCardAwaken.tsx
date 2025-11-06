'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { translateKeys } from '@/lib/translate'
import {
  applySkillValues,
  loadSkillValues,
  setupGlobalSkillTooltips,
} from '@/lib/applySkillValues'

type Props = {
  awakens: any[]
}

type SkillConfig = {
  skillid: number | string
  name?: string
  skill_des?: any
  skill_sketch?: any
}

const parseJSON = (v: any) => {
  if (!v) return []
  try {
    if (typeof v === 'string') return JSON.parse(v)
    if (Array.isArray(v)) return v
    if (typeof v === 'object') return [v]
  } catch {}
  return []
}

const fmt = (n?: number) =>
  typeof n === 'number' && !Number.isNaN(n) ? n.toLocaleString() : '0'

export default function ForceCardAwaken({ awakens }: Props) {
  const { lang } = useLanguage()
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [skillsById, setSkillsById] = useState<Map<string, SkillConfig>>(new Map())
  const [valuesMap, setValuesMap] = useState<Record<number, (string | number)[]>>({})

  const getT = (key?: string) => (key ? translations[key] || key : '')

  useEffect(() => setupGlobalSkillTooltips(), [])

  // 🔹 Captura todos os skill_ids únicos nas entradas de awaken
  const targetSkillIds = useMemo(() => {
    const ids = new Set<string>()
    for (const a of awakens || []) {
      const ups = parseJSON(a?.skill_up)
      const id = ups?.[0]?.skill_id
      if (id != null) ids.add(String(id))
    }
    return Array.from(ids)
  }, [awakens])

  // 🔹 Carrega os dados da SkillConfig e traduz
  useEffect(() => {
    const load = async () => {
      if (!targetSkillIds.length) {
        setSkillsById(new Map())
        setValuesMap({})
        setTranslations({})
        return
      }

      const { data: skills } = await supabase
        .from('SkillConfig')
        .select('*')
        .in('skillid', targetSkillIds)

      const all: SkillConfig[] = skills || []

      // Coleta chaves de tradução
      const tKeys = new Set<string>()
      all.forEach((s) => {
        if (s.name?.startsWith?.('LC_')) tKeys.add(s.name)
        parseJSON(s.skill_des).forEach((d: any) => d?.des && tKeys.add(d.des))
        parseJSON(s.skill_sketch).forEach((d: any) => d?.des && tKeys.add(d.des))
      })
      const translated = await translateKeys(Array.from(tKeys), lang)
      setTranslations(translated)

      // Coleta valores numéricos (para applySkillValues)
      const valueIds = new Set<number>()
      all.forEach((s) => {
        ;['skill_des', 'skill_sketch'].forEach((field) => {
          parseJSON((s as any)[field]).forEach((node: any) => {
            const v = Number(node?.value)
            if (!Number.isNaN(v)) valueIds.add(v)
          })
        })
      })
      const vMap = await loadSkillValues(Array.from(valueIds))
      setValuesMap(vMap)

      // Mapeia por ID
      const byId = new Map<string, SkillConfig>(all.map((s) => [String(s.skillid), s]))
      setSkillsById(byId)
    }
    load()
  }, [targetSkillIds, lang])

  // 🔹 Renderiza a sketch igual ao ForceCardProgression
  const renderSkillSketch = (skill: SkillConfig | undefined, lv: number) => {
    if (!skill) return '-'
    const sketches = parseJSON(skill.skill_sketch)
    const entry =
      sketches?.find((_: Record<string, any>, i: number) => i + 1 === lv) ||
      sketches[sketches.length - 1]
    if (!entry?.des) return '-'
    const html = applySkillValues(getT(entry.des), entry.value, valuesMap)
    return <span dangerouslySetInnerHTML={{ __html: html }} />
  }

  const validAwakens = useMemo(
    () => (Array.isArray(awakens) ? [...awakens].sort((a, b) => a.id - b.id) : []),
    [awakens]
  )

  if (!validAwakens.length)
    return (
      <div className="rounded-2xl p-6 bg-[var(--panel)] shadow-md border border-[var(--panel-border)]">
        <p className="text-sm opacity-70">No awaken data available.</p>
      </div>
    )

  return (
    <div className="rounded-2xl p-6 bg-[var(--panel)] shadow-md space-y-4 border border-[var(--panel-border)]">

      {/* DESKTOP / TABLET */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm border border-[var(--panel-border)] rounded-lg overflow-hidden table-auto">
          <thead className="bg-[var(--panel-hover)] text-xs uppercase tracking-wider">
            <tr>
              <th className="px-3 py-2 text-center font-semibold w-[10%]">★ Level</th>
              <th className="px-3 py-2 text-center font-semibold w-[45%]">Effect</th>
              <th className="px-3 py-2 text-center font-semibold w-[15%]">Copies Next LV</th>
              <th className="px-3 py-2 text-center font-semibold w-[15%]">Accumulated / Refund</th>
              <th className="px-3 py-2 text-center font-semibold w-[15%]">Awaken Item Cost</th>
            </tr>
          </thead>
          <tbody>
            {validAwakens.map((row, idx) => {
              const skillData = parseJSON(row.skill_up)
              const skillId = skillData?.[0]?.skill_id
              const skillLv = Number(skillData?.[0]?.skill_lv ?? 0)
              const skill = skillsById.get(String(skillId))
              const goldList = parseJSON(row.consume)
              const decompose = parseJSON(row.decompose_return)

              const goldCost =
                Array.isArray(goldList) && goldList.length > 0
                  ? goldList.map((g: any) => fmt(Number(g?.num))).join(', ')
                  : '—'

              const decomposeText =
                Array.isArray(decompose) && decompose.length > 0
                  ? decompose
                      .map(
                        (d: any) =>
                          `${fmt(Number(d?.num))}${d?.type ? ` ${d.type.replace(/_/g, ' ')}` : ''}`
                      )
                      .join(', ')
                  : row.decompose_return && !isNaN(Number(row.decompose_return))
                  ? fmt(Number(row.decompose_return))
                  : '—'

              return (
                <tr
                  key={row.id}
                  className={`${
                    idx % 2 ? 'bg-[var(--panel-hover)]' : ''
                  } hover:bg-[var(--panel-hover)]/80 transition`}
                >
                  <td className="px-3 py-2 text-center font-semibold">{skillLv} ★</td>
                  <td className="px-3 py-2 text-[var(--text-muted)] leading-tight text-left">
                    {renderSkillSketch(skill, skillLv)}
                  </td>
                  <td className="px-3 py-2 text-center font-medium">
                    {row.consume_currency ? fmt(row.consume_currency) : '—'}
                  </td>
                  <td className="px-3 py-2 text-center text-[var(--text-muted)]">
                    {decomposeText}
                  </td>
                  <td className="px-3 py-2 text-center">{goldCost}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* MOBILE VIEW */}
      <div className="block md:hidden space-y-3">
        {validAwakens.map((row) => {
          const skillData = parseJSON(row.skill_up)
          const skillId = skillData?.[0]?.skill_id
          const skillLv = Number(skillData?.[0]?.skill_lv ?? 0)
          const skill = skillsById.get(String(skillId))
          const goldList = parseJSON(row.consume)
          const decompose = parseJSON(row.decompose_return)

          const goldCost =
            Array.isArray(goldList) && goldList.length > 0
              ? goldList.map((g: any) => fmt(Number(g?.num))).join(', ')
              : '—'

          const decomposeText =
            Array.isArray(decompose) && decompose.length > 0
              ? decompose
                  .map(
                    (d: any) =>
                      `${fmt(Number(d?.num))}${d?.type ? ` ${d.type.replace(/_/g, ' ')}` : ''}`
                  )
                  .join(', ')
              : row.decompose_return && !isNaN(Number(row.decompose_return))
              ? fmt(Number(row.decompose_return))
              : '—'

          return (
            <div
              key={row.id}
              className="p-3 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-hover)]/50 shadow-sm"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold">{skillLv} ★</span>
              </div>

              <div className="text-regular text-[var(--text-muted)] leading-tight mb-2">
                {renderSkillSketch(skill, skillLv)}
              </div>

              <div className="text-xs flex flex-col gap-1 opacity-80">
                <span>
                  <b>Copies Next Level:</b> {row.consume_currency || '—'}
                </span>
                <span>
                  <b>Accumulated / Refund:</b> {decomposeText}
                </span>
                <span>
                  <b>Awaken Item Cost:</b> {goldCost}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
