import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const MANIFEST = path.join(ROOT, 'scripts/data/companion-assets-manifest.json')
const TEXTURES = path.join(ROOT, 'public/assets/resources/textures')
const ITEMICON = path.join(TEXTURES, 'itemicon')
const PREVIEW_DIR = path.join(TEXTURES, 'primaryspirit/spirit')

function basenameFromGamePath(gamePath) {
  const name = gamePath.replace(/^Textures\//i, '').replace(/\\/g, '/').split('/').pop()
  return `${name}.png`
}

function findFileCaseInsensitive(dir, filename) {
  if (!fs.existsSync(dir)) return null
  const target = filename.toLowerCase()
  for (const entry of fs.readdirSync(dir)) {
    if (entry.toLowerCase() === target) {
      return path.join(dir, entry)
    }
  }
  return null
}

function moveFile(src, destDir, label) {
  const dest = path.join(destDir, path.basename(src))
  if (path.resolve(src) === path.resolve(dest)) return false
  fs.mkdirSync(destDir, { recursive: true })
  if (fs.existsSync(dest)) fs.unlinkSync(dest)
  fs.renameSync(src, dest)
  console.log(`  ${label}: ${path.basename(src)} -> ${path.relative(ROOT, dest)}`)
  return true
}

function main() {
  if (!fs.existsSync(MANIFEST)) {
    console.error(`Manifest not found: ${MANIFEST}`)
    console.error('Run: npm run companions:scaffold-assets')
    process.exit(1)
  }

  const { companions } = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))
  let moved = 0

  for (const entry of companions) {
    const previewName = basenameFromGamePath(entry.preview.gamePath)
    const listName = basenameFromGamePath(entry.listIcon.gamePath)

    const previewInItemicon = findFileCaseInsensitive(ITEMICON, previewName)
    if (previewInItemicon) {
      if (moveFile(previewInItemicon, PREVIEW_DIR, 'preview')) moved++
    }

    const listInPreview = findFileCaseInsensitive(PREVIEW_DIR, listName)
    if (listInPreview) {
      if (moveFile(listInPreview, ITEMICON, 'list')) moved++
    }
  }

  console.log(`\nDone. ${moved} file(s) moved.`)
  if (moved > 0) {
    console.log('Run: npm run assets:manifest')
  }
}

main()
