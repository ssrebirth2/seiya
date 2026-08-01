import { createHash } from 'node:crypto'

/** Stable JSON stringify (sorted keys) for hashing. */
export function stableStringify(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(',')}]`
  }
  const keys = Object.keys(value).sort()
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`
}

export function contentHash(fields) {
  return createHash('sha256').update(stableStringify(fields)).digest('hex').slice(0, 16)
}

export function normalizeJson(value) {
  if (value == null) return null
  if (typeof value === 'string') {
    const t = value.trim()
    if (!t) return null
    if ((t.startsWith('[') && t.endsWith(']')) || (t.startsWith('{') && t.endsWith('}'))) {
      try {
        return normalizeJson(JSON.parse(t))
      } catch {
        return value
      }
    }
    return value
  }
  if (Array.isArray(value)) return value.map(normalizeJson)
  if (typeof value === 'object') {
    const out = {}
    for (const key of Object.keys(value).sort()) {
      out[key] = normalizeJson(value[key])
    }
    return out
  }
  return value
}

/** Extract [desKey, valueId] pairs from skill_des-like columns. */
export function normalizeDesList(raw) {
  const parsed = normalizeJson(raw)
  if (!Array.isArray(parsed)) return []
  const out = []
  for (const entry of parsed) {
    if (Array.isArray(entry) && entry.length >= 1) {
      const des = typeof entry[0] === 'string' ? entry[0] : entry[0]?.des ?? null
      const value = entry[1] ?? entry[0]?.value ?? 0
      if (typeof des === 'string' && des.startsWith('LC_')) {
        out.push({ des, value: Number(value) || 0 })
      }
    } else if (entry && typeof entry === 'object' && typeof entry.des === 'string') {
      out.push({ des: entry.des, value: Number(entry.value) || 0 })
    }
  }
  return out
}

export function collectLcKeysFromDesLists(...lists) {
  const keys = new Set()
  for (const list of lists) {
    for (const item of list || []) {
      if (item?.des) keys.add(item.des)
    }
  }
  return keys
}
