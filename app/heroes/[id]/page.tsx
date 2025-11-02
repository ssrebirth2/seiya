'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { translateKeys } from '@/lib/translate'
import { applySkillValues, setupGlobalSkillTooltips } from '@/lib/applySkillValues'
import HeroTabsContainer from '@/components/HeroTabs/HeroTabsContainer'

export default function HeroProfilePage() {
  const { id } = useParams()
  const heroId = parseInt(id as string)
  const { lang } = useLanguage()

  const [hero, setHero] = useState<any>(null)
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [typeMap, setTypeMap] = useState<Record<string, string>>({})
  const [labelMap, setLabelMap] = useState<Record<number, string>>({})
  const [roleName, setRoleName] = useState<string>('')
  const [skillIds, setSkillIds] = useState<(number | string)[]>([])
  const [isReady, setIsReady] = useState(false) // 🔹 indica quando TUDO está pronto

  const specialFields = ['camp', 'stance', 'damagetype', 'occupation']
  const qualityMap: Record<number, string> = { 2: 'R', 3: 'SR', 4: 'SSR', 5: 'UR' }

  const getT = (key?: string) => translations[key || ''] || key || ''

  useEffect(() => setupGlobalSkillTooltips(), [])

  useEffect(() => {
    const loadHeroData = async () => {
      try {
        // === Busca dados principais ===
        const { data: heroData } = await supabase
          .from('RoleConfig')
          .select('*')
          .eq('id', heroId)
          .single()

        if (!heroData) return

        // === Busca resource e tipos ===
        const resourceId = heroId * 10
        const [{ data: resource }, { data: types }] = await Promise.all([
          supabase.from('RoleResourcesConfig').select('role_name').eq('id', resourceId).single(),
          supabase.from('HeroTypeDescConfig').select('key, desc'),
        ])

        const tMap: Record<string, string> = {}
        const translationKeys = new Set<string>()

        if (resource?.role_name) translationKeys.add(resource.role_name)
        types?.forEach((t) => {
          tMap[t.key] = t.desc
          translationKeys.add(t.desc)
        })
        setTypeMap(tMap)

        // === Labels ===
        let labelRecords: any[] = []
        const labelIds: number[] = (() => {
          try {
            const val = heroData.role_labels
            if (!val) return []
            if (typeof val === 'string') return JSON.parse(val)
            if (Array.isArray(val)) return val
            return []
          } catch {
            return []
          }
        })()

        if (labelIds.length > 0) {
          const { data: labels } = await supabase
            .from('SkillLabelConfig')
            .select('id, name')
            .in('id', labelIds)
          labelRecords = labels ?? []
          labelRecords.forEach((l) => translationKeys.add(l.name))
        }

        // === Traduções ===
        Object.entries(heroData).forEach(([_, value]) => {
          if (typeof value === 'string' && value.startsWith('LC_')) translationKeys.add(value)
        })
        specialFields.forEach((key) => {
          const mapKey = `${key}_${heroData[key]}`
          if (tMap[mapKey]) translationKeys.add(tMap[mapKey])
        })

        const translated = await translateKeys(Array.from(translationKeys), lang)

        // === Monta mapas ===
        const lblMap: Record<number, string> = {}
        labelRecords.forEach((l) => (lblMap[l.id] = translated[l.name] || l.name))
        setLabelMap(lblMap)
        setTranslations(translated)
        setRoleName(resource?.role_name || '')

        // === Extrai skillIds ===
        try {
          const parsed = typeof heroData.skills === 'string' ? JSON.parse(heroData.skills) : heroData.skills
          if (Array.isArray(parsed)) {
            const ids = parsed.map((s: any) => (typeof s === 'string' ? s : Number(s)))
            setSkillIds(ids)
          }
        } catch {
          setSkillIds([])
        }

        // === Define o herói ===
        setHero(heroData)

        // 🔹 Só agora marcamos como pronto
        setIsReady(true)
      } catch (err) {
        console.error('Erro ao carregar dados do herói:', err)
        setIsReady(true)
      }
    }

    loadHeroData()
  }, [heroId, lang])

  /** Traduz campos especiais */
  const translateField = (key: string, value: any) => {
    if (key === 'quality') return qualityMap[value] || value
    if (key === 'role_labels') {
      const ids = Array.isArray(value) ? value : []
      const labels = ids.map((id) => labelMap[id]).filter(Boolean)
      return labels.join(', ')
    }
    if (specialFields.includes(key)) return getT(typeMap[`${key}_${value}`])
    return getT(String(value))
  }

  // === Loader centralizado (tudo ainda carregando) ===
  if (!isReady || !hero || skillIds.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[var(--text-muted)]">Carregando perfil completo do herói...</p>
        </div>
      </div>
    )
  }

  // === Dados carregados ===
  const bannerUrl = `/assets/resources/textures/hero/skillicon/skillbanner/SuperSkill_${hero.id}0.png`

  const fieldsToShow = [
    'rolename_short',
    'role_constellation_name',
    'role_labels',
    'quality',
    'occupation',
    'stance',
    'damagetype',
    'camp',
  ]

  return (
    <div className="relative w-full mx-auto overflow-hidden min-h-screen">
      {/* Fundo do banner do herói */}
      <div
        className="absolute inset-0 bg-no-repeat bg-top-left bg-auto opacity-85 z-0"
        style={{ backgroundImage: `url(${bannerUrl})` }}
      />

      {/* Conteúdo do herói */}
      <div className="relative z-10 px-6 py-10 transition-opacity duration-700 opacity-100">
        <div className="flex flex-col lg:flex-row gap-8 items-start mb-12">
          {/* Espaço reservado para imagem à esquerda */}
          <div className="flex-1 min-h-[400px]" />

          {/* Painel principal */}
          <div
            className="w-full max-w-xl backdrop-blur-md rounded-lg shadow p-6"
            style={{ backgroundColor: 'var(--panel)' }}
          >
            {/* Nome do Herói */}
            <h1
              className="text-3xl font-bold mb-2"
              dangerouslySetInnerHTML={{
                __html: applySkillValues(getT(roleName), 0, {}),
              }}
            />

            {/* Descrições */}
            {[hero.role_introduction, hero.role_features].map(
              (text, i) =>
                text && (
                  <p
                    key={i}
                    className="text-sm text-[var(--text-muted)] whitespace-pre-wrap mb-6"
                    dangerouslySetInnerHTML={{
                      __html: applySkillValues(getT(text), 0, {}),
                    }}
                  />
                )
            )}

            {/* Atributos principais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fieldsToShow.map((key) => {
                const val = hero[key]
                if (val === undefined || val === null) return null
                const label = key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
                const fieldValue = translateField(key, val)

                return (
                  <div
                    key={key}
                    className="rounded border p-3 backdrop-blur-sm shadow-sm"
                    style={{
                      backgroundColor: 'var(--panel)',
                      borderColor: 'var(--panel-border)',
                    }}
                  >
                    <div className="text-xs text-[var(--text-muted)] mb-1 font-medium truncate">{label}</div>
                    <div
                      className="text-sm font-semibold whitespace-pre-wrap break-words"
                      dangerouslySetInnerHTML={{
                        __html: applySkillValues(fieldValue, 0, {}),
                      }}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Painel de Abas (montado só depois que o herói estiver 100 % pronto) */}
        {hero && skillIds.length > 0 && (
          <div
            className="mx-auto backdrop-blur-sm rounded-lg shadow p-6"
            style={{ backgroundColor: 'var(--panel)' }}
          >
            <HeroTabsContainer heroId={heroId} skillIds={skillIds} />
          </div>
        )}
      </div>
    </div>
  )
}
