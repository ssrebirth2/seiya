// utils/teamEncode.ts
import LZString from 'lz-string'

/**
 * Compacta e codifica um objeto de time + equipamentos para uso em link público.
 * Mantém compatibilidade com o formato antigo (somente time).
 */
export const encodeTeam = (payload: any): string => {
  try {
    // payload agora pode conter { team, equipment }
    const json = JSON.stringify(payload)
    const compressed = LZString.compressToEncodedURIComponent(json)
    return compressed
  } catch (err) {
    console.error('Erro ao codificar o time:', err)
    return ''
  }
}

/**
 * Decodifica e descompacta um time a partir de um código de link.
 * Retorna { team, equipment } ou somente array do time (formato antigo).
 */
export const decodeTeam = (code: string): any => {
  try {
    if (!code) return null

    const json = LZString.decompressFromEncodedURIComponent(code)
    if (!json) return null

    const obj = JSON.parse(json)

    // 🔹 Compatibilidade: se for array simples, é formato antigo
    if (Array.isArray(obj)) {
      return { team: obj, equipment: {} }
    }

    // 🔹 Novo formato com equipamentos
    if (obj.team && obj.equipment) {
      return obj
    }

    return null
  } catch (err) {
    console.warn('Erro ao decodificar o time:', err)
    return null
  }
}
