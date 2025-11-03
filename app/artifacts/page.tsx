'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { translateKeys } from '@/lib/translate'

export default function ArtifactListPage() {
  const { lang } = useLanguage()
  const [artifacts, setArtifacts] = useState<any[]>([])
  const [resources, setResources] = useState<Record<number, any>>({})
  const [translations, setTranslations] = useState<Record<string, string>>({})

  const getT = (key?: string) => translations[key || ''] || key || ''

  const resolveImagePath = (path: string): string =>
    `/assets/resources/textures/${path.replace(/Textures\//i, '').toLowerCase()}.png`

  useEffect(() => {
    const loadData = async () => {
      const [{ data: arts }, { data: res }] = await Promise.all([
        supabase.from('ArtifactConfig').select('id, name, desc, initial_quality, isRare'),
        supabase.from('ArtifactResourcesConfig').select('id, preview_icon')
      ])

      if (!arts) return

      // ✅ ajusta qualidade (-1)
      const adjusted = arts.map(a => ({
        ...a,
        initial_quality:
          typeof a.initial_quality === 'number' ? a.initial_quality - 1 : a.initial_quality
      }))

      // 🔹 adiciona as chaves de qualidade e nome para tradução
      const keys = new Set<string>()
      adjusted.forEach(a => {
        if (a.name) keys.add(a.name)
        if (a.desc) keys.add(a.desc)
        if (a.initial_quality)
          keys.add(`LC_COMMON_quality_name_${a.initial_quality}`)
      })

      const [translated] = await Promise.all([translateKeys(Array.from(keys), lang)])

      // cria mapa de recursos
      const resMap: Record<number, any> = {}
      res?.forEach(r => (resMap[r.id] = r))

      setArtifacts(adjusted)
      setResources(resMap)
      setTranslations(translated)
    }

    loadData()
  }, [lang])

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {artifacts.map(art => {
        const rawIconPath = resources[art.id]?.preview_icon
        const icon = rawIconPath ? resolveImagePath(rawIconPath) : null
        const qualityText = getT(`LC_COMMON_quality_name_${art.initial_quality}`)

        return (
          <Link
            key={art.id}
            href={`/artifacts/${art.id}`}
            className="flex flex-col items-center p-4 border rounded-xl shadow hover:shadow-lg transition-all backdrop-blur-sm"
            style={{ backgroundColor: 'var(--panel)', borderColor: 'var(--panel-border)' }}
          >
            <h2 className="text-lg font-bold text-center">{getT(art.name)}</h2>
            
            {icon && (
              <img
                src={icon}
                alt={getT(art.name)}
                className="w-48 h-48 object-contain mb-2"
              />
            )}
            
            <p className="text-regular text-[var(--text-muted)] text-center mb-1">
              {qualityText}
            </p>
          </Link>
        )
      })}
    </div>
  )
}
