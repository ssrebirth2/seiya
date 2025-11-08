'use client'

import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { useEquipmentStore } from './useEquipmentStore'
import { useLanguage } from '@/context/LanguageContext'
import { translateKeys } from '@/lib/translate'
import { useRouter } from 'next/navigation'

const imageCache = new Map<string, boolean>()

const testImageCached = async (src: string): Promise<boolean> => {
  if (imageCache.has(src)) return imageCache.get(src)!
  try {
    const ok = await new Promise<boolean>((resolve) => {
      const img = new Image()
      img.onload = () => resolve(true)
      img.onerror = () => resolve(false)
      img.src = src
    })
    if (!ok) console.warn(`[Missing Asset] Image not found: ${src}`)
    imageCache.set(src, ok)
    return ok
  } catch (err) {
    console.error(`[Image Load Error] ${src}`, err)
    imageCache.set(src, false)
    return false
  }
}

type Props = {
  hero: any
  cards: any[]
  artifacts: any[]
  readOnly?: boolean
  onEquipCard: (cardId: number) => void
  onRemoveCard: (cardId: number) => void
  onEquipArtifact: (artifactId: number) => void
  onRemoveArtifact: () => void
}

export default function HeroEquipmentRow({
  hero,
  cards,
  artifacts,
  readOnly = false,
  onEquipCard,
  onRemoveCard,
  onEquipArtifact,
  onRemoveArtifact,
}: Props) {
  const router = useRouter()
  const equipment =
    useEquipmentStore((s) => s.equipment[Number(hero.id)] ?? s.equipment[hero.id as number]) || {
      artifact: null,
      cards: [],
    }

  const { lang } = useLanguage()
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const getT = useCallback((key?: string) => translations[key || ''] || key || '', [translations])

  const [cardsWithImage, setCardsWithImage] = useState<any[]>([])
  const [artsWithImage, setArtsWithImage] = useState<any[]>([])
  const [cardQualityFilter, setCardQualityFilter] = useState('all')
  const [artifactQualityFilter, setArtifactQualityFilter] = useState('all')

  const [popupType, setPopupType] = useState<'card' | 'artifact' | null>(null)
  const [popupSlot, setPopupSlot] = useState<number | null>(null)
  const popupRef = useRef<HTMLDivElement | null>(null)

  // Fecha popup clicando fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setPopupType(null)
        setPopupSlot(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Cache imagens (cartas)
  useEffect(() => {
    let active = true
    ;(async () => {
      const result = await Promise.all(
        (cards || []).map(async (c) => {
          const src = `/assets/resources/textures/dynamis/card/Card_small_${c.id}.png`
          return (await testImageCached(src)) ? c : null
        })
      )
      if (active) setCardsWithImage(result.filter(Boolean) as any[])
    })()
    return () => {
      active = false
    }
  }, [cards])

  // Cache imagens (artefatos)
  useEffect(() => {
    let active = true
    ;(async () => {
      const result = await Promise.all(
        (artifacts || []).map(async (a) => {
          const src = `/assets/resources/textures/artifact/artifactskill/skillicon/SkillIcon_${a.id}00.png`
          return (await testImageCached(src)) ? a : null
        })
      )
      if (active) setArtsWithImage(result.filter(Boolean) as any[])
    })()
    return () => {
      active = false
    }
  }, [artifacts])

  // Traduções
  useEffect(() => {
    const loadTranslations = async () => {
      const keys = new Set<string>()
      cards?.forEach((c) => c?.name && keys.add(c.name))
      artifacts?.forEach((a) => a?.name && keys.add(a.name))
      if (keys.size > 0) setTranslations(await translateKeys(Array.from(keys), lang))
    }
    loadTranslations()
  }, [cards, artifacts, lang])

  // Filtros
  const filteredCards = useMemo(() => {
    const equippedIds = new Set(equipment.cards)
    const available =
      cardQualityFilter === 'all'
        ? cardsWithImage
        : cardsWithImage.filter((c) => String(c.quality) === cardQualityFilter)
    return available.filter((c) => !equippedIds.has(c.id))
  }, [cardsWithImage, cardQualityFilter, equipment.cards])

  const filteredArtifacts = useMemo(() => {
    if (artifactQualityFilter === 'all') return artsWithImage
    return artsWithImage.filter((a) => String(a.initial_quality) === artifactQualityFilter)
  }, [artsWithImage, artifactQualityFilter])

  const replaceCardAtSlot = (slot: number, newCardId: number) => {
    const existing = equipment.cards?.[slot]
    if (existing) onRemoveCard(existing)
    onEquipCard(newCardId)
  }

  return (
    <div className="p-0 border border-[var(--panel-border)] rounded bg-[var(--panel)] flex flex-col gap-2 relative overflow-hidden">
      {/* 🔹 Fundo do herói */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden rounded-l">
        <img
          src={`/assets/resources/textures/hero/skillicon/skillbanner/SuperSkill_${hero.id}0.png`}
          alt={`Hero ${hero.id}`}
          className="w-[180px] object-cover scale-100 [mask-image:linear-gradient(to_right,black_70%,transparent)]"
        />
      </div>

      {/* Layout adaptável */}
      <div className="relative z-10 w-full min-h-[190px] flex items-center">
        {/* 🔹 Layout desktop (mantido igual) */}
        <div className="hidden md:grid grid-cols-[150px_1fr_auto] items-end gap-0 w-full">
          {/* Artefato */}
          <div className="flex justify-end pb-0">
            <div
              className={`relative ${readOnly ? 'cursor-pointer' : 'cursor-pointer'}`}
              onClick={() =>
                readOnly
                  ? equipment.artifact && router.push(`/artifacts/${equipment.artifact}`)
                  : (setPopupType('artifact'), setPopupSlot(0))
              }
            >
              <div className="w-20 h-20 border border-[var(--panel-border)] bg-[var(--panel-hover)] rounded-full flex items-center justify-center overflow-hidden">
                {equipment.artifact ? (
                  <img
                    src={`/assets/resources/textures/artifact/artifactskill/skillicon/SkillIcon_${equipment.artifact}00.png`}
                    alt="Artifact"
                    className="w-20 h-20 rounded-full"
                  />
                ) : (
                  <span className="text-[10px] opacity-60 select-none">Artifact</span>
                )}
              </div>

              {!readOnly && equipment.artifact && (
                <button
                  className="absolute -top-1 -right-1 text-[10px] leading-none bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center hover:bg-red-700"
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemoveArtifact()
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Cartas */}
          <div className="flex flex-wrap justify-center gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={`border border-[var(--panel-border)] bg-[var(--panel-hover)] flex items-center justify-center relative cursor-pointer
                w-[70px] h-[100px] sm:w-[90px] sm:h-[130px] md:w-[106px] md:h-[153px]
                transition-all duration-200`}
                onClick={() =>
                  readOnly
                    ? equipment.cards?.[i] && router.push(`/force-cards/${equipment.cards[i]}`)
                    : (setPopupType('card'), setPopupSlot(i))
                }
              >
                {equipment.cards?.[i] ? (
                  <>
                    <img
                      src={`/assets/resources/textures/dynamis/card/Card_${equipment.cards[i]}.png`}
                      alt={`Card ${equipment.cards[i]}`}
                      className="w-full h-auto rounded object-cover"
                    />
                    {!readOnly && (
                      <button
                        className="absolute -top-1 -right-1 text-xs bg-red-600 text-white rounded px-1 hover:bg-red-700"
                        onClick={(e) => {
                          e.stopPropagation()
                          onRemoveCard(equipment.cards[i])
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </>
                ) : (
                  <span className="text-[10px] opacity-60 select-none">Empty</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 🔹 Layout mobile */}
        <div className="flex flex-col md:hidden items-center justify-center p-3 gap-3 relative w-full">
          {/* Artifact */}
          <div className="absolute top-3 right-3 z-10">
            <div
              className={`relative ${readOnly ? 'cursor-pointer' : 'cursor-pointer'}`}
              onClick={() =>
                readOnly
                  ? equipment.artifact && router.push(`/artifacts/${equipment.artifact}`)
                  : (setPopupType('artifact'), setPopupSlot(0))
              }
            >
              <div className="w-16 h-16 border border-[var(--panel-border)] bg-[var(--panel-hover)] rounded-full flex items-center justify-center overflow-hidden shadow-md">
                {equipment.artifact ? (
                  <img
                    src={`/assets/resources/textures/artifact/artifactskill/skillicon/SkillIcon_${equipment.artifact}00.png`}
                    alt="Artifact"
                    className="w-16 h-16 rounded-full"
                  />
                ) : (
                  <span className="text-[10px] opacity-60 select-none">Artifact</span>
                )}
              </div>
            </div>
          </div>

          {/* Cartas */}
          <div className="mt-20 ml-5 flex flex-col items-center w-full">
            <div className="flex justify-center gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className={`border border-[var(--panel-border)] bg-[var(--panel-hover)] flex items-center justify-center relative cursor-pointer
                  w-[90px] h-[120px] transition-all duration-200`}
                  onClick={() =>
                    readOnly
                      ? equipment.cards?.[i] && router.push(`/force-cards/${equipment.cards[i]}`)
                      : (setPopupType('card'), setPopupSlot(i))
                  }
                >
                  {equipment.cards?.[i] ? (
                    <img
                      src={`/assets/resources/textures/dynamis/card/Card_${equipment.cards[i]}.png`}
                      alt={`Card ${equipment.cards[i]}`}
                      className="w-full h-full object-cover rounded"
                    />
                  ) : (
                    <span className="text-[10px] opacity-60 select-none">Empty</span>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-center gap-2 mt-2">
              {Array.from({ length: 2 }).map((_, idx) => {
                const i = idx + 3
                return (
                  <div
                    key={i}
                    className={`border border-[var(--panel-border)] bg-[var(--panel-hover)] flex items-center justify-center relative cursor-pointer
                    w-[90px] h-[120px] transition-all duration-200`}
                    onClick={() =>
                      readOnly
                        ? equipment.cards?.[i] && router.push(`/force-cards/${equipment.cards[i]}`)
                        : (setPopupType('card'), setPopupSlot(i))
                    }
                  >
                    {equipment.cards?.[i] ? (
                      <img
                        src={`/assets/resources/textures/dynamis/card/Card_${equipment.cards[i]}.png`}
                        alt={`Card ${equipment.cards[i]}`}
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      <span className="text-[10px] opacity-60 select-none">Empty</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Popup recolocado corretamente */}
      {!readOnly && popupType && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          ref={popupRef}
        >
          <div className="bg-[var(--panel)] border border-[var(--panel-border)] rounded-lg shadow-2xl p-4 w-[480px] max-h-[80vh] overflow-y-auto relative">
            <button
              className="absolute top-1 right-2 text-sm text-red-500 hover:text-red-700"
              onClick={() => {
                setPopupType(null)
                setPopupSlot(null)
              }}
            >
              ✕
            </button>

            {popupType === 'card' ? (
              <>
                <h4 className="text-sm font-semibold mb-2">Select a Card</h4>
                <div className="mb-2 flex gap-2 items-center">
                  <span className="text-xs opacity-70">Quality:</span>
                  <select
                    value={cardQualityFilter}
                    onChange={(e) => setCardQualityFilter(e.target.value)}
                    className="text-xs px-1 py-[2px] border rounded bg-[var(--panel-hover)]"
                  >
                    <option value="all">All</option>
                    <option value="2">N</option>
                    <option value="3">R</option>
                    <option value="4">SR</option>
                    <option value="5">SSR</option>
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {filteredCards.map((c) => (
                    <button
                      key={c.id}
                      className="border border-[var(--panel-border)] rounded bg-[var(--panel-hover)] hover:bg-[var(--panel)] flex flex-col items-center p-2"
                      onClick={() => {
                        if (popupSlot !== null)
                          useEquipmentStore.getState().replaceCard(hero.id, popupSlot, c.id)
                        setPopupType(null)
                        setPopupSlot(null)
                      }}
                    >
                      <img
                        src={`/assets/resources/textures/dynamis/card/Card_small_${c.id}.png`}
                        alt=""
                        className="w-16 h-16 mb-1 rounded"
                      />
                      <span className="text-xs text-center">{getT(c.name)}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <h4 className="text-sm font-semibold mb-2">Select an Artifact</h4>
                <div className="mb-2 flex gap-2 items-center">
                  <span className="text-xs opacity-70">Quality:</span>
                  <select
                    value={artifactQualityFilter}
                    onChange={(e) => setArtifactQualityFilter(e.target.value)}
                    className="text-xs px-1 py-[2px] border rounded bg-[var(--panel-hover)]"
                  >
                    <option value="all">All</option>
                    <option value="3">R</option>
                    <option value="4">SR</option>
                    <option value="5">SSR</option>
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {filteredArtifacts.map((a) => (
                    <button
                      key={a.id}
                      className="border border-[var(--panel-border)] rounded bg-[var(--panel-hover)] hover:bg-[var(--panel)] flex flex-col items-center p-2"
                      onClick={() => {
                        if (equipment.artifact) onRemoveArtifact()
                        onEquipArtifact(a.id)
                        setPopupType(null)
                        setPopupSlot(null)
                      }}
                    >
                      <img
                        src={`/assets/resources/textures/artifact/artifactskill/skillicon/SkillIcon_${a.id}00.png`}
                        alt=""
                        className="w-16 h-16 mb-1 rounded"
                      />
                      <span className="text-xs text-center">{getT(a.name)}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
