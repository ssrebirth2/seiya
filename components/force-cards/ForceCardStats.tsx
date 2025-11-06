'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { translateKeys } from '@/lib/translate'
import { useLanguage } from '@/context/LanguageContext'

type Props = { info: any }

export default function ForceCardStats({ info }: Props) {
  const { lang } = useLanguage()
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [developData, setDevelopData] = useState<Record<number, any[]>>({})
  const [levelTable, setLevelTable] = useState<any[]>([])
  const [quality, setQuality] = useState<number>(1)
  const [maxLevel, setMaxLevel] = useState(1)
  const [star, setStar] = useState(1)
  const [level, setLevel] = useState(1)

  const translationCache = useRef<Record<string, Record<string, string>>>({})

  const getT = (key?: string) => translations[key || ''] || key || ''
  const toNum = (v: any, def = NaN) => {
    const n = Number(v)
    return Number.isNaN(n) ? def : n
  }
  const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max)

  // 🔹 Extrai qualidade (cache simples)
  useEffect(() => {
    if (!info) return
    ;(async () => {
      let q = parseInt(String(info?.quality ?? ''), 10)
      if (!Number.isInteger(q) || q < 1 || q > 6) {
        if (info?.id != null) {
          const { data } = await supabase
            .from('ForceCardItemConfig')
            .select('quality')
            .eq('id', info.id)
            .maybeSingle()
          const qDb = parseInt(String(data?.quality ?? ''), 10)
          if (Number.isInteger(qDb) && qDb >= 1 && qDb <= 6) q = qDb
        }
      }
      setQuality(Number.isInteger(q) && q >= 1 && q <= 6 ? q : 1)
    })()
  }, [info])

  const baseAttrs = useMemo(() => safeParseAttributes(info?.attribute_initial), [info])

  const starIdList = useMemo<number[]>(() => {
    if (!info?.attribute_develop) return []
    try {
      const parsed =
        typeof info.attribute_develop === 'string'
          ? JSON.parse(info.attribute_develop)
          : info.attribute_develop
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }, [info])

  // 🔹 Carrega dados principais
  useEffect(() => {
    if (!info || !quality) return
    ;(async () => {
      try {
        // 🔸 Dados de desenvolvimento por estrela
        if (starIdList.length > 0) {
          const { data } = await supabase
            .from('ForceCardAttributeDevelopConfig')
            .select('id, attribute')
            .in('id', starIdList)

          const mapped: Record<number, any[]> = {}
          data?.forEach((row: any) => (mapped[row.id] = safeParseAttributes(row.attribute)))
          setDevelopData(mapped)
        } else {
          setDevelopData({})
        }

        // 🔸 Tabela de XP
        const { data: xpData } = await supabase.from('ForceCardLevelConfig').select('*')
        const sorted = (xpData || []).sort((a: any, b: any) => toNum(a.id, 0) - toNum(b.id, 0))
        setLevelTable(sorted)

        // 🔸 Determina nível máximo
        const expKey = `exp_${quality}`
        let computedMax = 1
        for (const row of sorted) {
          const expVal = toNum(row?.[expKey], -1)
          if (expVal === -1) break
          computedMax = toNum(row.id, computedMax)
        }
        setMaxLevel(computedMax)

        // 🔸 Traduções (cache)
        const keys = new Set<string>()
        baseAttrs.forEach((a: any) => a?.[0] && keys.add(a[0]))
        const kArr = Array.from(keys)
        if (!translationCache.current[lang]) {
          const result = await translateKeys(kArr, lang)
          translationCache.current[lang] = result
        }
        setTranslations(translationCache.current[lang])

        setStar((prev) => clamp(prev, 1, starIdList.length || 1))
        setLevel((prev) => clamp(prev || 1, 1, computedMax))
      } catch (err) {
        console.error('Error loading ForceCardStats:', err)
      }
    })()
  }, [info, lang, starIdList, baseAttrs, quality])

  // 🔹 Calcula atributos
  const computedStats = useMemo(() => {
    if (!info || starIdList.length === 0) return []
    const starIndex = clamp(star, 1, starIdList.length) - 1
    const dev = developData[starIdList[starIndex]]
    if (!dev) return []

    return baseAttrs.map((base: any) => {
      const devAttr = dev.find((d: any) => d[0] === base[0])
      const baseValue = Number(base?.[2]) || 0
      const starValue = Number(devAttr?.[2]) || 0
      return {
        name: base?.[0],
        base: baseValue,
        starValue,
        total: baseValue + level * starValue,
      }
    })
  }, [developData, starIdList, star, level, baseAttrs, info])

  // 🔹 Tabela de XP
  const xpRows = useMemo(() => {
    if (!levelTable.length || !quality) return []
    const expKey = `exp_${quality}`
    const sumKey = `sumexp_${quality}`
    const cap = Math.min(level, maxLevel)

    return levelTable
      .filter((row) => toNum(row?.[expKey], -1) !== -1 && toNum(row.id, 0) <= cap)
      .map((row) => ({
        id: toNum(row.id, 0),
        exp: toNum(row?.[expKey], 0),
        sumexp: toNum(row?.[sumKey], 0),
      }))
      .sort((a, b) => b.id - a.id)
  }, [levelTable, level, maxLevel, quality])

  return (
    <div className="rounded-2xl p-6 bg-[var(--panel)] shadow-md space-y-6 border border-[var(--panel-border)]">
      <Controls
        star={star}
        setStar={setStar}
        starCount={starIdList.length}
        level={level}
        setLevel={setLevel}
        maxLevel={maxLevel}
      />

      {computedStats.length > 0 && xpRows.length > 0 ? (
        <div className="flex flex-col lg:flex-row gap-6 justify-between">
          <AttributeTable stats={computedStats} getT={getT} />
          <XpTable rows={xpRows} level={level} maxLevel={maxLevel} />
        </div>
      ) : (
        <p className="text-sm opacity-70 text-center py-6">
          {computedStats.length === 0
            ? 'No attribute data available.'
            : 'No experience data available.'}
        </p>
      )}
    </div>
  )
}

/* ----------------------------------------------------------
   🔹 Subcomponentes
---------------------------------------------------------- */

function Controls({
  star,
  setStar,
  starCount,
  level,
  setLevel,
  maxLevel,
}: {
  star: number
  setStar: (n: number) => void
  starCount: number
  level: number
  setLevel: (n: number) => void
  maxLevel: number
}) {
  const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max)
  return (
    <div className="flex flex-wrap gap-6 items-end rounded-xl p-4 bg-[var(--panel-hover)]">
      <div>
        <label className="block text-xs mb-1 opacity-80 font-semibold uppercase tracking-wide">
          Star Level
        </label>
        <select
          aria-label="Select star level"
          value={star}
          onChange={(e) => setStar(Number(e.target.value))}
          className="w-24 h-10 rounded-xl px-3 bg-[var(--panel)] border border-[var(--panel-border)] font-semibold"
        >
          {Array.from({ length: Math.max(1, starCount || 1) }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {i + 1} ★
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs mb-1 opacity-80 font-semibold uppercase tracking-wide">
          Level (Max: {maxLevel})
        </label>
        <input
          aria-label="Set level"
          type="number"
          value={level}
          min={1}
          max={maxLevel}
          onChange={(e) => setLevel(clamp(Number(e.target.value) || 1, 1, maxLevel))}
          className="w-24 h-10 rounded-xl px-4 bg-[var(--panel)] border border-[var(--panel-border)] text-center font-semibold"
        />
      </div>
    </div>
  )
}

function AttributeTable({
  stats,
  getT,
}: {
  stats: { name: string; base: number; starValue: number; total: number }[]
  getT: (k?: string) => string
}) {
  return (
    <div className="flex-1 overflow-x-auto">
      <h3 className="text-lg font-bold mb-3">Attributes</h3>
      <table className="w-full text-sm border border-[var(--panel-border)] rounded-lg overflow-hidden table-auto">
        <thead className="bg-[var(--panel-hover)] text-xs uppercase tracking-wider">
          <tr>
            <th className="px-2 py-2 text-left font-semibold w-[35%]">Attribute</th>
            <th className="px-2 py-2 text-right font-semibold w-[20%]">Base</th>
            <th className="px-2 py-2 text-right font-semibold w-[20%]">+ per Lv</th>
            <th className="px-2 py-2 text-right font-semibold w-[25%]">Total</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((attr, idx) => (
            <tr
              key={attr.name}
              className={`transition-colors ${
                idx % 2 ? 'bg-[var(--panel-hover)]' : ''
              } hover:bg-[var(--panel-hover)]/80`}
            >
              <td className="px-2 py-2">{getT(attr.name)}</td>
              <td className="px-2 py-2 text-right text-[var(--text-muted)]">{attr.base}</td>
              <td className="px-2 py-2 text-right font-semibold">+{attr.starValue}</td>
              <td className="px-2 py-2 text-right font-bold text-blue-400">{attr.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function XpTable({
  rows,
  level,
  maxLevel,
}: {
  rows: { id: number; exp: number; sumexp: number }[]
  level: number
  maxLevel: number
}) {
  return (
    <div className="flex-1 overflow-x-auto">
      <h3 className="text-lg font-bold mb-3">Experience</h3>
      <table className="w-full text-sm border border-[var(--panel-border)] rounded-lg overflow-hidden table-auto">
        <thead className="bg-[var(--panel-hover)] text-xs uppercase tracking-wider">
          <tr>
            <th className="px-2 py-2 text-left font-semibold w-[20%]">Lv</th>
            <th className="px-2 py-2 text-right font-semibold w-[40%]">Exp to Next</th>
            <th className="px-2 py-2 text-right font-semibold w-[40%]">Total Exp</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const isCurrent = row.id === Math.min(level, maxLevel)
            return (
              <tr
                key={row.id}
                className={`transition-colors ${
                  idx % 2 ? 'bg-[var(--panel-hover)]' : ''
                } hover:bg-[var(--panel-hover)]/80 ${
                  isCurrent ? 'bg-blue-900/30' : ''
                }`}
              >
                <td className="px-2 py-2">{row.id}</td>
                <td className="px-2 py-2 text-right text-[var(--text-muted)]">
                  {row.exp.toLocaleString()}
                </td>
                <td className="px-2 py-2 text-right font-semibold">
                  {row.sumexp.toLocaleString()}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ----------------------------------------------------------
   🔹 Função utilitária
---------------------------------------------------------- */
function safeParseAttributes(input: any): any[] {
  if (!input) return []
  try {
    if (Array.isArray(input)) return input
    if (typeof input === 'string' && input.trim() !== '') return JSON.parse(input)
    if (typeof input === 'object' && Object.keys(input).length > 0) return Object.values(input)
  } catch {
    console.warn('Invalid attribute data:', input)
  }
  return []
}
