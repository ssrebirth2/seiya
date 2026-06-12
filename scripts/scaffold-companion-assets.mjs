import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DEFAULT_LUA_DIR = path.resolve(
  'C:/Users/multp/Documents/MuMuSharedFolder/Download/TextAsset'
)

const PUBLIC_TEXTURES = path.join(ROOT, 'public/assets/resources/textures')
const MANIFEST_OUT = path.join(ROOT, 'scripts/data/companion-assets-manifest.json')
const README_OUT = path.join(
  ROOT,
  'public/assets/resources/textures/primaryspirit/spirit/README.md'
)

const SPIRIT_ID_MIN = 8201
const SPIRIT_ID_MAX = 8231
const RESOURCE_ID_MIN = 82010
const RESOURCE_ID_MAX = 82310

function parseArgs() {
  const luaDirArg = process.argv.find((a) => a.startsWith('--lua-dir='))
  return {
    luaDir: luaDirArg ? luaDirArg.slice('--lua-dir='.length) : DEFAULT_LUA_DIR,
  }
}

function extractReturnBlock(content) {
  const m = content.match(/\breturn\b/)
  if (!m) throw new Error('return block not found')
  const start = content.indexOf('{', m.index)
  let depth = 0
  for (let i = start; i < content.length; i++) {
    if (content[i] === '{') depth++
    else if (content[i] === '}') {
      depth--
      if (depth === 0) return content.slice(start, i + 1)
    }
  }
  throw new Error('unclosed return block')
}

function parseSpiritSkins(luaDir) {
  const file = path.join(luaDir, 'SpiritConfig.lua')
  if (!fs.existsSync(file)) {
    console.warn(`SpiritConfig.lua not found at ${file}, using id * 10 heuristic`)
    const map = new Map()
    for (let id = SPIRIT_ID_MIN; id <= SPIRIT_ID_MAX; id++) {
      map.set(id, id * 10)
    }
    return map
  }

  const content = fs.readFileSync(file, 'utf8')
  const block = extractReturnBlock(content)
  const map = new Map()

  const rowRe = /\[(\d+)\]\s*=\s*\{([^}]+)\}/g
  let match
  while ((match = rowRe.exec(block)) !== null) {
    const spiritId = Number(match[1])
    if (spiritId < SPIRIT_ID_MIN || spiritId > SPIRIT_ID_MAX) continue
    const parts = match[2].split(',').map((s) => s.trim())
    const skinsRaw = parts[parts.length - 2]
    const skins = skinsRaw === 'nil' ? spiritId * 10 : Number(skinsRaw)
    map.set(spiritId, skins)
  }

  return map
}

function parseArtifactResources(luaDir) {
  const file = path.join(luaDir, 'ArtifactResourcesConfig.lua')
  if (!fs.existsSync(file)) {
    throw new Error(`ArtifactResourcesConfig.lua not found at ${file}`)
  }

  const content = fs.readFileSync(file, 'utf8')
  const block = extractReturnBlock(content)
  const resources = new Map()

  const rowRe = /\[(\d+)\]\s*=\s*\{([^}]+)\}/g
  let match
  while ((match = rowRe.exec(block)) !== null) {
    const id = Number(match[1])
    if (id < RESOURCE_ID_MIN || id > RESOURCE_ID_MAX) continue

    const parts = match[2].split(',').map((s) => s.trim().replace(/^"|"$/g, ''))
    const preview = parts.find((p) => p.startsWith('Textures/PrimarySpirit'))
    const itemIcon = parts.find((p) => p.startsWith('Textures/ItemIcon'))

    resources.set(id, {
      id,
      preview_icon: preview || null,
      item_icon: itemIcon || null,
    })
  }

  return resources
}

function gamePathToPublic(gamePath) {
  if (!gamePath) return null
  const relative = gamePath.replace(/^Textures\//i, '').replace(/\\/g, '/').toLowerCase()
  return {
    gamePath,
    publicPath: `public/assets/resources/textures/${relative}.png`,
    sitePath: `/assets/resources/textures/${relative}.png`,
  }
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
  const keep = path.join(dir, '.gitkeep')
  if (!fs.existsSync(keep)) fs.writeFileSync(keep, '')
}

function main() {
  const { luaDir } = parseArgs()
  console.log(`Lua dir: ${luaDir}`)

  const skinsMap = parseSpiritSkins(luaDir)
  const resources = parseArtifactResources(luaDir)

  const previewDir = path.join(PUBLIC_TEXTURES, 'primaryspirit/spirit')
  const itemIconDir = path.join(PUBLIC_TEXTURES, 'itemicon')
  ensureDir(previewDir)
  ensureDir(itemIconDir)

  const companions = []

  for (let spiritId = SPIRIT_ID_MIN; spiritId <= SPIRIT_ID_MAX; spiritId++) {
    const skinsId = skinsMap.get(spiritId) ?? spiritId * 10
    const res = resources.get(skinsId)
    if (!res) {
      console.warn(`No ArtifactResourcesConfig entry for skins ${skinsId} (spirit ${spiritId})`)
      continue
    }

    companions.push({
      spiritId,
      skinsResourceId: skinsId,
      preview: gamePathToPublic(res.preview_icon),
      listIcon: gamePathToPublic(res.item_icon),
    })
  }

  fs.mkdirSync(path.dirname(MANIFEST_OUT), { recursive: true })
  fs.writeFileSync(
    MANIFEST_OUT,
    JSON.stringify({ generatedAt: new Date().toISOString(), companions }, null, 2),
    'utf8'
  )

  const readme = `# Companion preview images

Copy PNG files from the game client into this folder.

Each file name matches \`ArtifactResourcesConfig.preview_icon\` (without the \`Textures/\` prefix).

Example:
- Game: \`Textures/PrimarySpirit/Spirit/ItemIcon_128010\`
- Here: \`ItemIcon_128010.png\`

Full list: \`scripts/data/companion-assets-manifest.json\`

After copying files, run \`npm run predev\` to refresh the asset manifest.
`
  fs.writeFileSync(README_OUT, readme, 'utf8')

  console.log(`Created scaffold dirs under public/assets/resources/textures/`)
  console.log(`Wrote ${companions.length} entries -> ${MANIFEST_OUT}`)
  console.log(`Wrote ${README_OUT}`)
}

main()
