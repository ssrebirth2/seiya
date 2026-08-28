import { SITE_LANGS } from './schema.mjs'

/** Port of formatPlainLabel for Node changelog generation (no DOM). */

function decodeEntities(s) {
  if (!s) return ''
  return String(s)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function applySkillValues(text, valueId, valuesMap) {
  if (text == null) return ''
  let result = decodeEntities(typeof text === 'string' ? text : String(text))
  const values = valuesMap[Number(valueId)]
  if (Array.isArray(values)) {
    for (let i = 0; i < values.length; i++) {
      result = result.replace(new RegExp(`\\{${i}\\}`, 'g'), String(values[i]))
    }
  }
  result = result.replace(
    /<color=(#[A-Fa-f0-9]{3,8}|[A-Za-z]+)>([\s\S]*?)<\/color>/g,
    (_m, _c, content) => content
  )
  result = result.replace(/<link=\d+>([\s\S]*?)<\/link>/g, (_m, content) => content)
  result = result.replace(/\\n/g, ' ').replace(/\n/g, ' ')
  return result
}

export function formatPlainLabel(text, valueId = 0, valuesMap = {}) {
  if (text == null || text === '') return ''
  return applySkillValues(text, valueId, valuesMap)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function resolveLc(lcByLang, key, lang) {
  if (!key) return ''
  const pack = lcByLang[lang] || {}
  if (pack[key]) return pack[key]
  if (lang !== 'CN' && lcByLang.CN?.[key]) return lcByLang.CN[key]
  if (lang !== 'EN' && lcByLang.EN?.[key]) return lcByLang.EN[key]
  return ''
}

export function resolveTitleMap(lcByLang, key, fallback = '') {
  const out = {}
  for (const lang of SITE_LANGS) {
    const resolved = resolveLc(lcByLang, key, lang)
    out[lang] = resolved || fallback || (key ? String(key) : '')
  }
  return out
}

/** ItemConfig.des_value — LC keys (or raw strings) substituted into `{0}`, `{1}`, … */
export function parseDesValueKeys(val) {
  if (!val) return []
  if (Array.isArray(val)) {
    return val.filter((x) => typeof x === 'string' && x.length > 0)
  }
  if (typeof val === 'string') {
    const trimmed = val.trim()
    if (!trimmed) return []
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) {
          return parsed.filter((x) => typeof x === 'string' && x.length > 0)
        }
      } catch {
        return []
      }
    }
    if (trimmed.startsWith('LC_')) return [trimmed]
  }
  return []
}

/** Port of GetLCString(template, ...args). */
export function applyLcPlaceholders(template, args) {
  let result = String(template ?? '')
  for (let i = 0; i < args.length; i++) {
    const placeholder = `{${i}}`
    if (!result.includes(placeholder)) continue
    result = result.split(placeholder).join(args[i] ?? '')
  }
  return result
}

/**
 * Resolve an item name/desc LC key and apply des_value args
 * (GameUtil.GetItemNameByConfig: GetLCString(name, GetLCString(des_value[1]), …)).
 */
export function resolveItemTitleMap(lcByLang, nameKey, desValue, fallback = '') {
  const argKeys = parseDesValueKeys(desValue)
  const out = {}
  for (const lang of SITE_LANGS) {
    const template = resolveLc(lcByLang, nameKey, lang) || fallback || (nameKey ? String(nameKey) : '')
    if (!argKeys.length) {
      out[lang] = template
      continue
    }
    const args = argKeys.map((k) =>
      typeof k === 'string' && k.startsWith('LC_') ? resolveLc(lcByLang, k, lang) || k : String(k)
    )
    out[lang] = applyLcPlaceholders(template, args)
  }
  return out
}

export function plainDesMap(lcByLang, desKey, valueId, skillValues) {
  const out = {}
  for (const lang of SITE_LANGS) {
    const raw = resolveLc(lcByLang, desKey, lang)
    out[lang] = formatPlainLabel(raw, valueId, skillValues)
  }
  return out
}
