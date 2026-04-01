'use client'

import { DndContext, useDroppable, useDraggable } from '@dnd-kit/core'
import { useTeamStore } from './useTeamStore'
import { useEffect, useState, useRef } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import { translateKeys } from '@/lib/translate'
import { applySkillValues } from '@/lib/applySkillValues'
import { useRouter } from 'next/navigation' // ✅ adicionado
import { useHeroTypeDescConfig } from '@/lib/hooks/useHeroTypeDescConfig'

// 👉 Ordem visual: BACK, MID, FRONT
const cols = [
  { key: 'back', stance: 3 },
  { key: 'mid', stance: 2 },
  { key: 'front', stance: 1 },
] as const

type TeamGridProps = {
  initialTeam?: any[]
  readOnly?: boolean
  onReady?: () => void
}

export default function TeamGrid({ initialTeam, readOnly = false, onReady }: TeamGridProps) {
  const { team, removeHero, swapHeroes } = useTeamStore()
  const { lang } = useLanguage()
  const { data: typeMap = {}, isSuccess: typesReady } = useHeroTypeDescConfig()
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [isDragging, setIsDragging] = useState(false)
  const [gridReady, setGridReady] = useState(false)
  const onReadyFired = useRef(false)
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady

  useEffect(() => {
    if (!typesReady) return

    let cancelled = false
    ;(async () => {
      try {
        const tkeys = new Set<string>()
        Object.values(typeMap).forEach((d) => tkeys.add(d))
        tkeys.add('LC_COMMON_partner')
        const tr = await translateKeys(Array.from(tkeys), lang)
        if (!cancelled) {
          setTranslations(tr)
          setGridReady(true)
          if (!onReadyFired.current) {
            onReadyFired.current = true
            onReadyRef.current?.()
          }
        }
      } catch (err) {
        console.error('⚠️ TeamGrid load failed:', err)
        if (!cancelled) {
          setTranslations({})
          setGridReady(true)
          if (!onReadyFired.current) {
            onReadyFired.current = true
            onReadyRef.current?.()
          }
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [lang, typesReady, typeMap])

  const loading = !typesReady || !gridReady

  const getT = (key?: string) => (key ? translations[key] || key : '')

  const displayTeam = readOnly ? initialTeam || [] : team
  const mainHeroes = displayTeam.filter((h: any) => h.stance !== 0)
  const supportHeroes = displayTeam.filter((h: any) => h.stance === 0)

  const sameCol = (a: string, b: string) => {
    if (a.startsWith('support') || b.startsWith('support')) return true
    return a.split('-')[0] === b.split('-')[0]
  }

  const handleDragStart = () => setIsDragging(true)
  const handleDrop = (event: any) => {
    setIsDragging(false)
    if (readOnly) return
    const { active, over } = event
    if (!over) return
    if (active.id === over.id) return
    if (!sameCol(String(active.id), String(over.id))) return
    swapHeroes(active.id, over.id)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center w-full py-10 animate-fadeIn">
        <div className="loader mb-4 border-4 border-t-[var(--accent)] rounded-full w-8 h-8 animate-spin" />
        <p className="text-sm text-[var(--text-muted)]">Loading team grid…</p>
      </div>
    )
  }

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDrop}>
      <div
        className={`flex flex-col items-center transition-all duration-200 ${
          isDragging ? 'overflow-hidden touch-none select-none' : ''
        }`}
      >
        <h2 className="text-xl font-semibold mb-2 text-center">Team Formation</h2>

        <div
          className={`flex flex-col sm:flex-row gap-2 sm:gap-4 p-2 border border-[var(--panel-border)] items-center rounded bg-[var(--panel-hover)] max-w-full ${
            isDragging ? 'overflow-hidden' : 'overflow-x-auto'
          }`}
        >
          {/* 🔹 Suporte (1x2) */}
          <div className="flex sm:flex-col justify-center gap-2">
            {[0, 1].map((slot) => {
              const pos = `support-${slot}`
              const hero = supportHeroes.find((h: any) => h.position === pos)
              return (
                <DropSlot
                  key={pos}
                  id={pos}
                  stance={0}
                  getT={getT}
                  typeMap={typeMap}
                  translations={translations}
                  readOnly={readOnly}
                >
                  {hero && (
                    <HeroAvatar
                      id={hero.position}
                      heroId={hero.id}
                      readOnly={readOnly}
                      onRemove={() => removeHero(pos)}
                    />
                  )}
                </DropSlot>
              )
            })}
          </div>

          {/* 🔹 Grid principal */}
          <div className="grid grid-cols-3 gap-1 sm:gap-2">
            {cols.map(({ key: col, stance }) => (
              <div key={col} className="flex flex-col items-center justify-center gap-1 sm:gap-2">
                {[0, 1, 2].map((slot) => {
                  const pos = `${col}-${slot}`
                  const hero = mainHeroes.find((h: any) => h.position === pos)
                  return (
                    <DropSlot
                      key={pos}
                      id={pos}
                      stance={stance}
                      typeMap={typeMap}
                      translations={translations}
                      getT={getT}
                      readOnly={readOnly}
                    >
                      {hero && (
                        <HeroAvatar
                          id={hero.position}
                          heroId={hero.id}
                          readOnly={readOnly}
                          onRemove={() => removeHero(pos)}
                        />
                      )}
                    </DropSlot>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </DndContext>
  )
}

// =============================
// 🔹 Slot
// =============================
function DropSlot({
  id,
  children,
  stance,
  typeMap,
  translations,
  getT,
  readOnly,
}: {
  id: string
  children?: React.ReactNode
  stance: number
  typeMap?: Record<string, string>
  translations?: Record<string, string>
  getT: (key?: string) => string
  readOnly?: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  const labelKey =
    stance === 0
      ? `LC_COMMON_partner`
      : typeMap?.[`stance_${stance}`] || `stance_${stance}`
  const translated = applySkillValues(getT(labelKey), 0, {})

  return (
    <div
      ref={setNodeRef}
      className={`border border-[var(--panel-border)] rounded flex items-center justify-center transition
        w-24 h-24 sm:w-26 sm:h-26 lg:w-28 lg:h-28
        ${isOver && !readOnly ? 'bg-[var(--panel-hover)] border-blue-400' : 'bg-[var(--panel)]'}
      `}
    >
      {children || (
        <span
          className="text-[9px] sm:text-[10px] text-[var(--text-muted)] select-none text-center"
          dangerouslySetInnerHTML={{ __html: translated }}
        />
      )}
    </div>
  )
}

// =============================
// 🔹 Avatar
// =============================
function HeroAvatar({
  id,
  heroId,
  onRemove,
  readOnly,
}: {
  id: string
  heroId: number
  onRemove?: () => void
  readOnly?: boolean
}) {
  const router = useRouter() // ✅ adicionado

  if (readOnly) {
    return (
      <div
        className="relative cursor-pointer"
        onClick={() => router.push(`/heroes/${heroId}`)} // ✅ abre página do herói
      >
        <img
          src={`/assets/resources/textures/hero/squareherohead/SquareHeroHead_${heroId}0.png`}
          alt=""
          className="w-24 h-24 sm:w-26 sm:h-26 lg:w-28 lg:h-28 rounded border border-[var(--panel-border)]"
        />
      </div>
    )
  }

  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id })
  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className="relative">
        <img
          src={`/assets/resources/textures/hero/squareherohead/SquareHeroHead_${heroId}0.png`}
          alt=""
          className="w-24 h-24 sm:w-26 sm:h-26 lg:w-28 lg:h-28 rounded border border-[var(--panel-border)] touch-none select-none"
          {...listeners}
        />
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onRemove?.()
          }}
          className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] sm:text-[10px] rounded px-1 leading-4 hover:bg-red-700"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
