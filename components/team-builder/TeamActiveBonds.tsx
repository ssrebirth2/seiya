'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useTeamStore } from './useTeamStore'
import { useLanguage } from '@/context/LanguageContext'
import { translateKeys } from '@/lib/translate'
import { applySkillValues, loadSkillValues } from '@/lib/applySkillValues'

type TeamHero = { id: number; stance: number; position: string }

export default function TeamActiveBonds({
  teamOverride,
  onReady,
}: {
  teamOverride?: TeamHero[]
  onReady?: () => void
}) {
  const { team: storeTeam } = useTeamStore()
  const team = teamOverride ?? storeTeam
  const { lang } = useLanguage()

  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [valuesMap, setValuesMap] = useState<Record<number, (string | number)[]>>({})
  const [skillsMap, setSkillsMap] = useState<Map<string, any>>(new Map())
  const [allCombos, setAllCombos] = useState<any[]>([])
  const [activeCombos, setActiveCombos] = useState<any[]>([])
  const [readySignaled, setReadySignaled] = useState(false)

  const safeParse = (v: any): any[] => {
    if (!v) return []
    try {
      if (typeof v === 'string') return JSON.parse(v)
      if (Array.isArray(v)) return v
      return []
    } catch {
      return []
    }
  }

  const getT = (key?: string) => translations[key || ''] || key || ''

  // ============================================================
  // 1️⃣ Carrega combos/skills + traduções/values (depende do idioma)
  // ============================================================
  useEffect(() => {
    const loadStaticData = async () => {
      try {
        const { data: combosData, error: err1 } = await supabase
          .from('HeroRelationSkillConfig')
          .select('*')

        if (err1) throw err1

        if (!combosData || combosData.length === 0) {
          setAllCombos([])
          return
        }

        const skillIds = combosData
          .map((c) => c.skill_id)
          .filter((id) => typeof id === 'number' && id > 0)

        const tkeys = new Set<string>()
        combosData.forEach((c) => {
          if (c.name && c.name.startsWith('LC_')) tkeys.add(c.name)
        })

        const { data: skillsData, error: err2 } = await supabase
          .from('SkillConfig')
          .select('*')
          .in('skillid', skillIds)

        if (err2) throw err2

        const allSkills = skillsData ?? []
        const usedValueIds = new Set<number>()
        const skillMap = new Map<string, any>()

        allSkills.forEach((s) => {
          skillMap.set(String(s.skillid), s)
          if (s.name?.startsWith('LC_')) tkeys.add(s.name)
          const desList = safeParse(s.skill_des)
          desList.forEach((d: any) => {
            if (d?.des) tkeys.add(d.des)
            if (d?.value) usedValueIds.add(Number(d.value))
          })
        })

        const [tmap, vals] = await Promise.all([
          translateKeys(Array.from(tkeys), lang),
          loadSkillValues(Array.from(usedValueIds)),
        ])

        setTranslations(tmap)
        setValuesMap(vals)
        setSkillsMap(skillMap)
        setAllCombos(combosData)
      } catch (err) {
        console.error('⚠️ TeamActiveBonds load failed:', err)
        setAllCombos([]) // fallback seguro
      } finally {
        // ✅ garante que o onReady será chamado mesmo com erro
        if (!readySignaled) {
          setReadySignaled(true)
          onReady?.()
        }
      }
    }

    loadStaticData()
  }, [lang, onReady, readySignaled])

  // ============================================================
  // 2️⃣ Recalcula combos ativas quando o time muda
  // ============================================================
  useEffect(() => {
    if (allCombos.length === 0) {
      setActiveCombos([])
      return
    }

    const mainIds = team.filter((h) => h.stance !== 0).map((h) => h.id)
    const supportIds = team.filter((h) => h.stance === 0).map((h) => h.id)

    if (mainIds.length === 0 && supportIds.length === 0) {
      setActiveCombos([])
      return
    }

    const active: any[] = []

    for (const combo of allCombos) {
      try {
        const heroList: number[] = safeParse(combo.hero_list)
        const heroId = Number(combo.hero_id)
        if (heroId > 0 && supportIds.includes(heroId)) continue
        const hasMainHero = heroId > 0 ? mainIds.includes(heroId) : true
        const hasAllPartners = heroList.every(
          (hid) => mainIds.includes(hid) || supportIds.includes(hid)
        )
        if (hasMainHero && hasAllPartners) active.push(combo)
      } catch {
        continue
      }
    }

    setActiveCombos(active)
  }, [team, allCombos])

  // ============================================================
  // 🔹 Render
  // ============================================================
  const renderSkill = (skill: any, combo: any, heroList: number[]) => {
    const comboName = getT(combo.name)
    const desList = safeParse(skill.skill_des)
    const description =
      desList.length > 0
        ? applySkillValues(getT(desList[0].des), desList[0].value, valuesMap)
        : ''

    const isComboSkill = Number(combo.type) === 1
    const icon = isComboSkill
      ? `/assets/resources/textures/hero/skillicon/texture/SkillIcon_${skill.skillid}.png`
      : null

    return (
      <div
        key={combo.id}
        className="p-3 border border-[var(--panel-border)] rounded-lg hover:shadow-md transition-all"
      >
        <div className="flex justify-center gap-2 mb-2">
          {heroList.map((hid) => (
            <img
              key={hid}
              src={`/assets/resources/textures/hero/circleherohead/CircleHeroHead_${hid}0.png`}
              alt={`Hero ${hid}`}
              className="w-10 h-10 rounded-md border border-[var(--panel-border)]"
            />
          ))}
        </div>

        <p className="font-semibold text-base mb-2 text-center">{comboName}</p>

        {isComboSkill && icon ? (
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-3 mt-2 text-left">
            <img src={icon} alt={getT(skill.name)} className="w-12 h-12 flex-shrink-0 rounded" />
            <div className="flex flex-col text-center sm:text-left text-sm mt-1 sm:mt-0">
              <p className="font-medium mb-1">{getT(skill.name)}</p>
              <div
                className="text-xs text-[var(--text-muted)] whitespace-pre-wrap leading-relaxed"
                dangerouslySetInnerHTML={{ __html: description }}
              />
            </div>
          </div>
        ) : (
          <div
            className="text-xs text-[var(--text-muted)] text-center whitespace-pre-wrap leading-relaxed"
            dangerouslySetInnerHTML={{ __html: description }}
          />
        )}
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2 text-center">Combinations Skills</h2>
      {activeCombos.length === 0 ? (
        <div className="text-sm text-center text-[var(--text-muted)]">
          No active combination skills detected.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {activeCombos.map((combo) => {
            const heroList = safeParse(combo.hero_list)
            const skill = skillsMap.get(String(combo.skill_id))
            if (!skill) return null
            return renderSkill(skill, combo, heroList)
          })}
        </div>
      )}
    </div>
  )
}
