'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { translateKeys } from '@/lib/translate'
import { useLanguage } from '@/context/LanguageContext'
import { applySkillValues } from '@/lib/applySkillValues'
import ForceCardTabsContainer from '@/components/force-cards/ForceCardTabsContainer'

export default function ForceCardDetailPage() {
  const { id } = useParams()
  const cardId = Number(id)
  const { lang } = useLanguage()

  const [item, setItem] = useState<any>(null)
  const [info, setInfo] = useState<any>(null)
  const [levels, setLevels] = useState<any[]>([])
  const [starUps, setStarUps] = useState<any[]>([])
  const [awakens, setAwakens] = useState<any[]>([])
  const [reborns, setReborns] = useState<any[]>([])
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [imageError, setImageError] = useState(false)

  const getT = useCallback(
    (key?: string) => translations[key || ''] || key || '',
    [translations]
  )

  /** 🔹 Parse seguro de JSON / arrays */
  const parseIds = useCallback((input: any): any[] => {
    if (Array.isArray(input)) return input
    if (typeof input === 'string' && input.trim()) {
      try {
        const parsed = JSON.parse(input)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    }
    return []
  }, [])

  /** 🔹 Carrega dados principais da carta */
  useEffect(() => {
    if (!cardId) return

    const loadForceCardData = async () => {
      setIsLoading(true)
      try {
        const [{ data: itemRow }, { data: infoRow }, { data: lvRows }] =
          await Promise.all([
            supabase.from('ForceCardItemConfig').select('*').eq('id', cardId).maybeSingle(),
            supabase.from('ForceCardInfoConfig').select('*').eq('id', cardId).maybeSingle(),
            supabase.from('ForceCardLevelConfig').select('*').order('id', { ascending: true }),
          ])

        if (!itemRow) {
          setItem(null)
          return
        }

        setItem(itemRow)
        setInfo(infoRow || null)
        setLevels(lvRows || [])

        // 🔹 Carrega configs de star / awaken / reborn
        const [starIds, awakenIds, rebornIds] = [
          parseIds(infoRow?.card_star),
          parseIds(infoRow?.card_awaken),
          parseIds(infoRow?.reborn_id),
        ]

        const [suRes, akRes, rbRes] = await Promise.all([
          starIds.length
            ? supabase.from('ForceCardStarUpConfig').select('*').in('id', starIds)
            : { data: [] },
          awakenIds.length
            ? supabase.from('ForceCardAwakenUpConfig').select('*').in('id', awakenIds)
            : { data: [] },
          rebornIds.length
            ? supabase.from('ForceCardRebornConfig').select('*').in('id', rebornIds)
            : { data: [] },
        ])

        setStarUps((suRes.data || []).sort((a, b) => a.id - b.id))
        setAwakens((akRes.data || []).sort((a, b) => a.id - b.id))
        setReborns((rbRes.data || []).sort((a, b) => a.id - b.id))

        // 🔹 Traduções
        const keys = new Set<string>()
        if (itemRow?.name) keys.add(itemRow.name)
        if (itemRow?.desc) keys.add(itemRow.desc)
        if (itemRow?.quality)
          keys.add(`LC_COMMON_force_card_quality_quality_name_${itemRow.quality}`)

        // 🔹 Adiciona chaves de tradução das restrições
        if (infoRow?.condition) {
          try {
            const conds = JSON.parse(infoRow.condition)
            if (Array.isArray(conds)) {
              conds.forEach(({ type, object_id }) => {
                if (type && Array.isArray(object_id)) {
                  object_id.forEach((oid: number) => keys.add(`LC_HERO_${type}_${oid}`))
                }
              })
            }
          } catch {
            /* ignora erros de parse */
          }
        }

        const translated = await translateKeys(Array.from(keys), lang)
        setTranslations(translated)
      } catch (err) {
        console.error('Error loading ForceCard:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadForceCardData()
  }, [cardId, lang, parseIds])

  // 🔹 Loading / erro
  if (isLoading)
    return (
      <div className="p-10 text-center text-[var(--text-muted)] animate-pulse">
        Loading Force Card...
      </div>
    )

  if (!item)
    return (
      <div className="p-10 text-center text-[var(--text-muted)]">
        Force Card not found.
      </div>
    )

  // 🔹 Caminhos das imagens
  const cardImage = `/assets/resources/textures/dynamis/card/Card_${item.id}.png`
  const frameImage = `/assets/resources/textures/dynamis/jjzl_box_kapaikuang_${item.quality}.png`
  const placeholderImage = `/assets/resources/textures/dynamis/jjzl_box_kapaisuo_1.png`

  /** 🔹 Renderiza todas as restrições */
  const renderRestrictions = () => {
    if (!info?.condition) return null

    try {
      const conds = JSON.parse(info.condition)
      const specialFields = ['occupation', 'stance', 'damagetype', 'camp']
      const rendered: string[] = []

      conds.forEach(({ type, object_id }: any) => {
        if (specialFields.includes(type)) {
          object_id?.forEach((oid: number) => {
            const labelKey = `LC_HERO_${type}_${oid}`
            rendered.push(applySkillValues(getT(labelKey), 0, {}))
          })
        }
      })

      if (!rendered.length) return null
      return (
        <div
          className="opacity-80"
          dangerouslySetInnerHTML={{
            __html: `<b>Restriction:</b> ${rendered.join(', ')}`,
          }}
        />
      )
    } catch {
      return null
    }
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex flex-col md:flex-row gap-6 items-start relative">
        {/* 🔹 Imagem */}
        <div className="relative inline-block z-10">
          <img
            src={imageError ? placeholderImage : cardImage}
            alt={getT(item.name)}
            onError={() => setImageError(true)}
            className="rounded-2xl object-cover relative z-0"
          />
          {!imageError && (
            <img
              src={frameImage}
              alt="Card Frame"
              className="absolute inset-0 object-cover pointer-events-none select-none z-10"
            />
          )}
        </div>

        {/* 🔹 Conteúdo */}
        <div className="flex-1 space-y-3 w-full relative z-20">
          <br />
          <h1 className="mt-2 text-2xl font-bold">{getT(item.name)}</h1>

          <div
            className="opacity-90 text-sm"
            dangerouslySetInnerHTML={{
              __html: applySkillValues(getT(item.desc), 0, {}),
            }}
          />

          <div className="text-sm opacity-70 flex flex-wrap gap-3 items-center">
            <div>
              <b>Quality:</b>{' '}
              {getT(`LC_COMMON_force_card_quality_quality_name_${item.quality}`)}
            </div>
            {renderRestrictions()}
          </div>

          {info && translations && (
            <div className="mt-4 w-full">
              <ForceCardTabsContainer
                info={info}
                starUps={starUps}
                levels={levels}
                awakens={awakens}
                reborns={reborns}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
