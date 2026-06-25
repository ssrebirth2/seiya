import { readdirSync, writeFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const ROOT = process.cwd()
const PUBLIC_DIR = join(ROOT, 'public')
const OUTPUT = join(ROOT, 'src', 'lib', 'assets', 'asset-manifest.json')

/** Asset folders scanned at build/dev time (relative to public/). */
const SCAN_DIRS = [
  'assets/resources/textures/hero/squareherohead',
  'assets/resources/textures/hero/circleherohead',
  'assets/resources/textures/hero/heroshowcard',
  'assets/resources/textures/hero/herohalfcard',
  'assets/resources/textures/hero/herobardcard',
  'assets/resources/textures/hero/barherohead',
  'assets/resources/textures/hero/skillicon/texture',
  'assets/resources/textures/hero/skillicon/skillbanner',
  'assets/resources/textures/hero/talent',
  'assets/resources/textures/dynamis',
  'assets/resources/textures/dynamis/card',
  'assets/resources/ui/sprites/dynamis',
  'assets/resources/textures/artifact/artifactskill/skillicon',
  'assets/resources/textures/artifact/artifactshowview',
  'assets/resources/textures/itemicon',
  'assets/resources/textures/primaryspirit/spirit',
  'assets/resources/textures/levelup',
  'assets/resources/ui/sprites/common',
  'assets/resources/ui/sprites/commonitem',
  'assets/resources/ui/sprites/commonhero',
  'assets/resources/ui/sprites/languageres/cn/common',
  'assets/resources/ui/sprites/languageres/en/common',
  'assets/resources/ui/sprites/languageres/id/common',
  'assets/resources/ui/sprites/languageres/sp/common',
  'assets/resources/ui/sprites/languageres/po/common',
  'assets/resources/ui/sprites/languageres/fr/common',
]

function collectPaths(dir) {
  const abs = join(PUBLIC_DIR, dir)
  let paths = []

  try {
    for (const entry of readdirSync(abs)) {
      const full = join(abs, entry)
      const st = statSync(full)
      if (st.isDirectory()) {
        paths = paths.concat(collectPaths(join(dir, entry)))
        continue
      }
      if (!/\.(png|jpe?g|webp|svg)$/i.test(entry)) continue
      const rel = relative(PUBLIC_DIR, full).split(sep).join('/')
      paths.push(`/${rel}`)
    }
  } catch {
    // folder may not exist in all environments
  }

  return paths
}

const paths = Array.from(new Set(SCAN_DIRS.flatMap(collectPaths))).sort()

const manifest = {
  generatedAt: new Date().toISOString(),
  count: paths.length,
  paths,
}

writeFileSync(OUTPUT, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
console.log(`[assets:manifest] wrote ${paths.length} paths → ${relative(ROOT, OUTPUT)}`)
