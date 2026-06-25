import { supabase } from '@/lib/supabase-client'
import { translateKeys } from '@/lib/i18n/language-package'

/** Cache para tooltips (SkillFeaturesConfig) */
const featureCache = new Map<number, { name: string; desc: string }>()

/** Decodifica entidades HTML comuns (&lt; &gt; &amp; &quot; &#39;) */
function decodeEntities(s: string): string {
  if (!s) return ''
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

/** Carrega dados de uma feature (tooltip) já traduzida */
async function loadFeature(id: number) {
  if (featureCache.has(id)) return featureCache.get(id)

  try {
    // 🧠 monta as chaves de tradução
    const nameKey = `LC_SKILL_Feature_name_${id}`
    const descKey = `LC_SKILL_Feature_des_${id}`

    // idioma atual
    const lang = localStorage.getItem('lang') || 'EN'

    // busca traduções diretamente do LanguagePackage
    const translations = await translateKeys([nameKey, descKey], lang)

    const feature = {
      name: translations[nameKey] || nameKey,
      desc: translations[descKey] || descKey
    }

    featureCache.set(id, feature)
    return feature
  } catch (error) {
    console.warn(`⚠️ Erro ao carregar tradução de Feature id=${id}:`, error)
    return null
  }
}

/**
 * Substitui placeholders e aplica tags visuais.
 * - {0} -> <strong>...</strong>
 * - <color=#xxxxxx>...</color> -> <span style="color:#xxxxxx">...</span>
 * - <link=ID>...</link> -> <span class="skill-link" data-link-id="ID"><strong>...</strong></span>
 * - \n / \\n -> <br />
 */
export function applySkillValues(
  text: string | number,
  valueId: number | string,
  valuesMap: Record<number, (string | number)[]>
): string {
  if (text === null || text === undefined) return ''

  // ✅ sempre decode antes de regex
  let result: string = decodeEntities(typeof text === 'string' ? text : String(text))

  // 🔸 placeholders -> <strong>
  const values = valuesMap[Number(valueId)]
  if (Array.isArray(values)) {
    for (let i = 0; i < values.length; i++) {
      const placeholder = new RegExp(`\\{${i}\\}`, 'g')
      result = result.replace(placeholder, `<strong>${values[i]}</strong>`)
    }
  }

  // 🔹 <color=...> -> span inline
  result = result.replace(
    /<color=(#[A-Fa-f0-9]{3,8}|[A-Za-z]+)>([\s\S]*?)<\/color>/g,
    (_m, color, content) => `<span style="color:${color}">${content}</span>`
  )

  // 🔹 <link=ID> -> span com tooltip + bold
  result = result.replace(
    /<link=(\d+)>([\s\S]*?)<\/link>/g,
    (_m, id, content) =>
      `<span class="skill-link" data-link-id="${id}"><strong>${content}</strong></span>`
  )

  // 🔹 quebras de linha
  result = result.replace(/\\n/g, '<br />').replace(/\n/g, '<br />')

  return result
}

/** Remove game color tags and trailing colons from short label text (class, stance, etc.). */
function stripGameLabelMarkup(text: string): string {
  return text
    .replace(/<color=[^>]+>([\s\S]*?)<\/color>/gi, '$1')
    .replace(/<span style="color:[^"]+">([\s\S]*?)<\/span>/gi, '$1')
    .replace(/:+\s*$/g, '')
    .trim()
}

/**
 * Formats taxonomy/attribute labels for UI: no hardcoded dark colors, no trailing ":".
 */
export function formatDisplayText(
  text: string | number,
  valueId: number | string = 0,
  valuesMap: Record<number, (string | number)[]> = {}
): string {
  if (text === null || text === undefined) return ''
  const cleaned = stripGameLabelMarkup(decodeEntities(String(text)))
  if (!cleaned) return ''
  return stripGameLabelMarkup(applySkillValues(cleaned, valueId, valuesMap))
}

/** Plain text for icon tooltips / aria-labels (no HTML, no trailing ":"). */
export function formatPlainLabel(
  text: string | number,
  valueId: number | string = 0,
  valuesMap: Record<number, (string | number)[]> = {}
): string {
  return formatDisplayText(text, valueId, valuesMap)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Carrega valores de SkillValueConfig: { valueId => valores[] }
 */
export async function loadSkillValues(
  valueIds: (number | string)[]
): Promise<Record<number, (string | number)[]>> {
  const uniqueIds = Array.from(new Set(valueIds.map(Number))).filter((v) => !Number.isNaN(v))
  if (uniqueIds.length === 0) return {}

  const { data, error } = await supabase
    .from('SkillValueConfig')
    .select('skillid, show_value')
    .in('skillid', uniqueIds)

  if (error) {
    console.error('❌ Erro ao carregar SkillValueConfig:', error.message)
    return {}
  }

  const result: Record<number, (string | number)[]> = {}
  for (const row of data || []) {
    const key = Number(row.skillid)
    try {
      const raw = row.show_value
      let parsed: (string | number)[] = []

      if (typeof raw === 'string') parsed = JSON.parse(raw)
      else if (Array.isArray(raw)) parsed = raw
      else if (typeof raw === 'object' && raw !== null) parsed = Object.values(raw)

      result[key] = parsed
    } catch (e) {
      console.warn(`⚠️ Erro ao processar show_value para valueId ${key}`, e)
      result[key] = []
    }
  }
  return result
}

/**
 * Instala UMA VEZ listeners globais para tooltips via delegação.
 * Funciona para qualquer HTML inserido (dangerouslySetInnerHTML).
 */
let _tooltipsBound = false
export function setupGlobalSkillTooltips() {
  if (_tooltipsBound) return
  _tooltipsBound = true

  let tooltipEl: HTMLDivElement | null = null
  let activeLink: HTMLElement | null = null
  let hideTimer: number | null = null

  const ensureTooltip = () => {
    if (!tooltipEl) {
      tooltipEl = document.createElement('div')
      tooltipEl.className = 'tooltip'
      Object.assign(tooltipEl.style, {
        position: 'absolute',
        background: 'var(--tooltip-bg)',
        color: 'var(--tooltip-fg)',
        padding: '6px 8px',
        borderRadius: '4px',
        fontSize: '0.85rem',
        zIndex: '10000',
        pointerEvents: 'none',
        maxWidth: '360px',
        lineHeight: '1.25',
        boxShadow: 'var(--header-shadow)',
        opacity: '0',
        transition: 'opacity 0.12s ease',
      } as CSSStyleDeclaration)
      document.body.appendChild(tooltipEl)
    }
  }

  const showTooltip = (target: HTMLElement, html: string) => {
    ensureTooltip()
    if (!tooltipEl) return
    tooltipEl.innerHTML = html
    const rect = target.getBoundingClientRect()
    tooltipEl.style.left = `${rect.left + window.scrollX}px`
    tooltipEl.style.top = `${rect.bottom + window.scrollY + 6}px`
    tooltipEl.style.opacity = '1'
  }

  const hideTooltip = () => {
    if (!tooltipEl) return
    tooltipEl.style.opacity = '0'
    activeLink = null
  }

  // evento de entrada
  document.addEventListener('mouseenter', async (ev) => {
    const span = (ev.target as HTMLElement)?.closest?.('.skill-link') as HTMLElement | null
    if (!span) return

    // cancela timer de esconder
    if (hideTimer) {
      clearTimeout(hideTimer)
      hideTimer = null
    }

    activeLink = span
    const id = Number(span.dataset.linkId)
    if (!id || Number.isNaN(id)) return

    const feature = await loadFeature(id)
    if (!feature) return

    const html = `<strong>${feature.name}</strong><br/>${feature.desc}`
    if (activeLink === span) showTooltip(span, html)
  }, true)

  // evento de saída
  document.addEventListener('mouseleave', (ev) => {
    const el = (ev.target as HTMLElement)?.closest?.('.skill-link') as HTMLElement | null
    if (!el) return

    if (el === activeLink) {
      // atraso pequeno para evitar piscada
      hideTimer = window.setTimeout(() => hideTooltip(), 100)
    }
  }, true)
}
