'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { translateKeys } from '@/lib/translate'
import { useLanguage } from '@/context/LanguageContext'
import ForceCardTabsContainer from '@/components/force-cards/ForceCardTabsContainer'

export default function ForceCardDetailPage() {
  const params = useParams()
  const id = Number(params?.id)
  const { lang } = useLanguage()

  const [item, setItem] = useState<any>(null)
  const [info, setInfo] = useState<any>(null)
  const [levels, setLevels] = useState<any[]>([])
  const [starUps, setStarUps] = useState<any[]>([])
  const [awakens, setAwakens] = useState<any[]>([])
  const [reborns, setReborns] = useState<any[]>([])
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)

  // 🔹 Novo estado para erro de imagem
  const [imageError, setImageError] = useState(false)

  const getT = (key?: string) => translations[key || ''] || key || ''

  useEffect(() => {
    if (!id) return

    const loadAll = async () => {
      setIsLoading(true)
      try {
        const [
          { data: itemRow },
          { data: infoRow },
          { data: lvRows },
        ] = await Promise.all([
          supabase.from('ForceCardItemConfig').select('*').eq('id', id).maybeSingle(),
          supabase.from('ForceCardInfoConfig').select('*').eq('id', id).maybeSingle(),
          supabase.from('ForceCardLevelConfig').select('*').order('id', { ascending: true }),
        ])

        if (!itemRow) {
          setIsLoading(false)
          return setItem(null)
        }

        setItem(itemRow)
        setInfo(infoRow || null)
        setLevels(lvRows || [])

        const parseIds = (input: any) => {
          if (Array.isArray(input)) return input
          if (typeof input === 'string' && input.trim() !== '') {
            try {
              const parsed = JSON.parse(input)
              return Array.isArray(parsed) ? parsed : []
            } catch {
              return []
            }
          }
          return []
        }

        const starIds = parseIds(infoRow?.card_star)
        const awakenIds = parseIds(infoRow?.card_awaken)
        const rebornIds = parseIds(infoRow?.reborn_id)

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

        setStarUps((suRes.data || []).sort((a: any, b: any) => a.id - b.id))
        setAwakens((akRes.data || []).sort((a: any, b: any) => a.id - b.id))
        setReborns((rbRes.data || []).sort((a: any, b: any) => a.id - b.id))

        const keys = new Set<string>()
        if (itemRow?.name) keys.add(itemRow.name)
        if (itemRow?.desc) keys.add(itemRow.desc)
        if (itemRow?.quality)
          keys.add(`LC_COMMON_force_card_quality_quality_name_${itemRow.quality}`)
        const translated = await translateKeys(Array.from(keys), lang)
        setTranslations(translated)
      } catch (err) {
        console.error('Error loading ForceCard:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadAll()
  }, [id, lang])

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

  return (
    <div className="p-4 space-y-6">
      {/* 🔹 Header responsivo */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* 🔹 Imagem da carta (com fallback e frame condicional) */}
        <div className="relative inline-block">
          <img
            src={imageError ? placeholderImage : cardImage}
            alt={getT(item.name)}
            onError={() => setImageError(true)}
            className="rounded-2xl object-cover"
          />

          {/* Só mostra a borda se a imagem carregou corretamente */}
          {!imageError && (
            <img
              src={frameImage}
              alt="Card Frame"
              className="absolute inset-0 object-cover pointer-events-none select-none"
            />
          )}
        </div>

        {/* 🔹 Conteúdo textual + abas */}
        <div className="flex-1 space-y-3 w-full">
          <br />
          <h1 className="text-2xl font-bold">{getT(item.name)}</h1>

          <div
            className="opacity-90 text-sm"
            dangerouslySetInnerHTML={{
              __html: getT(item.desc),
            }}
          />

          <div className="text-sm opacity-70">
            <b>Quality:</b>{' '}
            {getT(`LC_COMMON_force_card_quality_quality_name_${item.quality}`)}
          </div>

          {/* 🔹 Tabs (só renderiza após tudo carregar) */}
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
