#!/usr/bin/env node
/**
 * Professional DB / assets sync hub.
 *
 *   npm run db              Interactive menu
 *   npm run db -- --full    Full sync
 *   npm run db -- --status
 *   npm run db -- --extract-lua
 *   npm run db -- --configs skills,heroes
 *   npm run db -- --langs
 *   npm run db -- --assets
 *   npm run db -- --assets cosmo,heroes
 *   npm run db -- --dry-run --configs skills
 *   npm run db -- --force-extract
 *
 * Configs come from StreamingResources_cn → luascript/luascript_bundle.assetbundle
 * Assets use CN → global → assets mirror → backup (via BundleResolver).
 */
import { spawnSync } from 'node:child_process'
import { createInterface } from 'node:readline'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const CONFIG_GROUPS = [
  'heroes',
  'skills',
  'talents',
  'spirits',
  'artifacts',
  'forcecards',
  'items',
  'cosmo',
  'cloth',
  'figures',
]

const ASSET_RECIPES = [
  'square-hero-item',
  'square-item',
  'nav-icons',
  'force-cards',
  'skill-item',
  'cosmo',
  'companions',
  'artifacts',
  'catalog-icons',
  'hero-overview',
]

const RECIPE_ALIASES = {
  heroes: 'square-hero-item',
  items: 'square-item',
  nav: 'nav-icons',
  'force-cards': 'force-cards',
  forcecards: 'force-cards',
  skills: 'skill-item',
  'skill-item': 'skill-item',
  cosmo: 'cosmo',
  companions: 'companions',
  spirits: 'companions',
  artifacts: 'artifacts',
  relics: 'artifacts',
  'catalog-icons': 'catalog-icons',
  icons: 'catalog-icons',
  'hero-overview': 'hero-overview',
  cloth: 'hero-overview',
  figures: 'hero-overview',
}

function run(label, cmd, args, { env } = {}) {
  console.log(`\n=== ${label} ===`)
  const result = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ...env },
  })
  if (result.status !== 0) {
    console.error(`\nERROR: failed at "${label}" (exit ${result.status ?? 1})`)
    process.exit(result.status ?? 1)
  }
}

function pythonCli(...args) {
  run(args.join(' '), 'python', ['scripts/game-assets/cli.py', ...args])
}

function getStatus() {
  const result = spawnSync(
    'python',
    ['scripts/game-assets/cli.py', 'sync-status', '--json'],
    { cwd: ROOT, encoding: 'utf8', shell: true }
  )
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout)
    process.exit(result.status ?? 1)
  }
  const text = (result.stdout || '').trim()
  const start = text.indexOf('{')
  if (start < 0) {
    console.error('Could not parse sync-status JSON')
    process.exit(1)
  }
  return JSON.parse(text.slice(start))
}

function printStatusBanner(status) {
  console.log('\n┌─ DB sync status ─────────────────────────────────────')
  console.log(`│ luascript_bundle  ${status.status}`)
  console.log(
    `│   CN hash         ${status.cn.hash || '(missing)'}  list=${status.cn.listSettingsMtime || '-'}`
  )
  console.log(
    `│   extract         ${status.extract.exists ? 'OK' : 'MISSING'}  files=${status.extract.luaFileCount}`
  )
  console.log(
    `│ languages         ${status.languages.files.length} packs  lastImport=${status.languages.lastImportAt || 'never'}`
  )
  console.log(`│ last full sync    ${status.lastFullSyncAt || 'never'}`)
  console.log('└──────────────────────────────────────────────────────\n')
}

function ensureLuaExtract({ force = false, status } = {}) {
  const st = status || getStatus()
  if (force || st.needsExtract) {
    pythonCli('extract-lua', ...(force ? ['--force'] : []))
  } else {
    console.log(`[db] luascript FRESH (hash=${st.active.hash}) — skip extract`)
  }
}

function importConfigs(groups, { dryRun = false } = {}) {
  const args = ['scripts/import-site-data.py', '--configs-only']
  if (dryRun) args.push('--dry-run')
  if (groups?.length) {
    for (const g of groups) {
      args.push('--group', g)
    }
  }
  run(
    groups?.length ? `Import configs (${groups.join(',')})` : 'Import all configs',
    'python',
    args
  )
}

function importLangs({ dryRun = false } = {}) {
  const args = ['scripts/import-site-data.py', '--langs-only']
  if (dryRun) args.push('--dry-run')
  run('Import language packs', 'python', args)
  // Mark langs import time via python helper
  spawnSync(
    'python',
    [
      '-c',
      'import sys; sys.path.insert(0,"scripts/game-assets"); from sync_state import mark_langs_import; mark_langs_import()',
    ],
    { cwd: ROOT, shell: true }
  )
}

function buildIndexes() {
  run('Item usage index', 'npm', ['run', 'items:index'])
  run('Item get-path index', 'npm', ['run', 'items:get-path:build'])
  run('Item stage rewards index', 'npm', ['run', 'items:stage-rewards:build'])
}

function extractAssets(recipes) {
  const list = recipes?.length
    ? recipes.map((r) => RECIPE_ALIASES[r] || r)
    : ASSET_RECIPES
  for (const recipe of list) {
    if (!ASSET_RECIPES.includes(recipe)) {
      console.error(`Unknown asset recipe: ${recipe}`)
      process.exit(1)
    }
    pythonCli('extract', '--recipe', recipe)
  }
}

function buildManifest() {
  run('Asset manifest', 'npm', ['run', 'assets:manifest'])
}

function buildCosmoMeta() {
  run('Cosmo meta', 'npm', ['run', 'cosmo:meta'])
}

function buildChangelog() {
  run('DB changelog', 'npm', ['run', 'changelog:build'])
}

function markFullSync() {
  spawnSync(
    'python',
    [
      '-c',
      'import sys; sys.path.insert(0,"scripts/game-assets"); from sync_state import mark_full_sync; mark_full_sync()',
    ],
    { cwd: ROOT, shell: true }
  )
}

function fullSync({ forceExtract = false, dryRun = false, skipChangelog = false } = {}) {
  const status = getStatus()
  printStatusBanner(status)
  ensureLuaExtract({ force: forceExtract, status })
  if (!dryRun) {
    importConfigs(null, { dryRun: false })
    importLangs({ dryRun: false })
    buildIndexes()
    buildCosmoMeta()
    extractAssets(null)
    buildManifest()
    if (!skipChangelog) buildChangelog()
    markFullSync()
  } else {
    importConfigs(null, { dryRun: true })
    importLangs({ dryRun: true })
  }
  console.log('\nFull sync complete.')
}

function ask(rl, question) {
  return new Promise((resolve) => rl.question(question, resolve))
}

async function interactiveMenu() {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const status = getStatus()
  printStatusBanner(status)

  console.log('1) Full sync (extract lua if stale → configs → langs → indexes → assets → changelog → manifest)')
  console.log('2) Refresh Lua base only (luascript_bundle)')
  console.log('3) Supabase configs (select groups) → changelog')
  console.log('4) Language packs → changelog')
  console.log('5) Assets / textures (select recipes)')
  console.log('6) Dry-run configs (+ optional langs)')
  console.log('7) Status only')
  console.log('8) Build DB changelog only')
  console.log('9) Exit')

  const choice = (await ask(rl, '\nSelect [1-9]: ')).trim()

  try {
    switch (choice) {
      case '1':
        rl.close()
        fullSync({ forceExtract: false })
        return
      case '2': {
        const force = (await ask(rl, 'Force re-extract even if FRESH? [y/N]: ')).trim().toLowerCase()
        rl.close()
        ensureLuaExtract({ force: force === 'y' || force === 'yes', status })
        return
      }
      case '3': {
        console.log(`Groups: all, ${CONFIG_GROUPS.join(', ')}`)
        const raw = (await ask(rl, 'Groups (comma-separated, or all): ')).trim().toLowerCase()
        rl.close()
        ensureLuaExtract({ status })
        if (!raw || raw === 'all') importConfigs(null)
        else {
          const groups = raw.split(/[,\s]+/).filter(Boolean)
          for (const g of groups) {
            if (!CONFIG_GROUPS.includes(g)) {
              console.error(`Unknown group: ${g}`)
              process.exit(1)
            }
          }
          importConfigs(groups)
          if (groups.includes('items')) buildIndexes()
          if (groups.includes('cosmo')) buildCosmoMeta()
        }
        buildChangelog()
        return
      }
      case '4':
        rl.close()
        importLangs()
        buildChangelog()
        return
      case '5': {
        console.log(
          `Recipes: all, ${ASSET_RECIPES.join(', ')} (aliases: heroes, items, nav, skills, cosmo, companions, artifacts, icons)`
        )
        const raw = (await ask(rl, 'Recipes (comma-separated, or all): ')).trim().toLowerCase()
        rl.close()
        if (!raw || raw === 'all') extractAssets(null)
        else extractAssets(raw.split(/[,\s]+/).filter(Boolean))
        buildManifest()
        return
      }
      case '6': {
        console.log(`Groups: all, ${CONFIG_GROUPS.join(', ')}`)
        const raw = (await ask(rl, 'Config groups for dry-run (or all): ')).trim().toLowerCase()
        const withLangs = (await ask(rl, 'Also dry-run langs? [y/N]: ')).trim().toLowerCase()
        rl.close()
        ensureLuaExtract({ status })
        if (!raw || raw === 'all') importConfigs(null, { dryRun: true })
        else importConfigs(raw.split(/[,\s]+/).filter(Boolean), { dryRun: true })
        if (withLangs === 'y' || withLangs === 'yes') importLangs({ dryRun: true })
        return
      }
      case '7':
        rl.close()
        return
      case '8':
        rl.close()
        buildChangelog()
        return
      case '9':
      default:
        rl.close()
        console.log('Bye.')
        return
    }
  } catch (err) {
    rl.close()
    throw err
  }
}

function parseArgs(argv) {
  const opts = {
    full: false,
    status: false,
    extractLua: false,
    forceExtract: false,
    dryRun: false,
    skipChangelog: false,
    langs: false,
    configs: null,
    assets: null,
    changelog: false,
    menu: true,
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--full') {
      opts.full = true
      opts.menu = false
    } else if (a === '--skip-changelog') {
      opts.skipChangelog = true
    } else if (a === '--changelog') {
      opts.changelog = true
      opts.menu = false
    } else if (a === '--status') {
      opts.status = true
      opts.menu = false
    } else if (a === '--extract-lua') {
      opts.extractLua = true
      opts.menu = false
    } else if (a === '--force-extract') {
      opts.forceExtract = true
    } else if (a === '--dry-run') {
      opts.dryRun = true
    } else if (a === '--langs') {
      opts.langs = true
      opts.menu = false
    } else if (a === '--configs') {
      opts.menu = false
      const next = argv[i + 1]
      if (next && !next.startsWith('--')) {
        opts.configs = next.split(',').map((s) => s.trim()).filter(Boolean)
        i++
      } else {
        opts.configs = []
      }
    } else if (a === '--assets') {
      opts.menu = false
      const next = argv[i + 1]
      if (next && !next.startsWith('--')) {
        opts.assets = next.split(',').map((s) => s.trim()).filter(Boolean)
        i++
      } else {
        opts.assets = []
      }
    } else if (a === '--help' || a === '-h') {
      console.log(`Usage: npm run db -- [options]

  (no args)           Interactive menu
  --full              Full sync
  --status            Freshness report
  --extract-lua       Unpack luascript_bundle
  --force-extract     Re-extract even if FRESH
  --configs [g,...]   Import config groups (omit list = all)
  --langs             Import language packs
  --assets [r,...]    Extract asset recipes (omit list = all)
  --changelog         Build DB changelog from live Supabase snapshot
  --skip-changelog    Skip changelog step during --full
  --dry-run           Parse-only for config/lang imports
`)
      process.exit(0)
    }
  }
  return opts
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))

  if (opts.status) {
    pythonCli('sync-status')
    return
  }

  if (opts.full) {
    fullSync({
      forceExtract: opts.forceExtract,
      dryRun: opts.dryRun,
      skipChangelog: opts.skipChangelog,
    })
    return
  }

  if (opts.menu) {
    await interactiveMenu()
    return
  }

  const status = getStatus()
  printStatusBanner(status)

  if (opts.extractLua) {
    ensureLuaExtract({ force: opts.forceExtract, status })
  }

  if (opts.configs !== null) {
    ensureLuaExtract({ force: opts.forceExtract, status })
    if (opts.configs.length === 0) importConfigs(null, { dryRun: opts.dryRun })
    else importConfigs(opts.configs, { dryRun: opts.dryRun })
    if (!opts.dryRun && (opts.configs.length === 0 || opts.configs.includes('items'))) {
      buildIndexes()
    }
    if (!opts.dryRun && (opts.configs.length === 0 || opts.configs.includes('cosmo'))) {
      buildCosmoMeta()
    }
  }

  if (opts.langs) {
    importLangs({ dryRun: opts.dryRun })
  }

  if (opts.assets !== null) {
    if (opts.assets.length === 0) extractAssets(null)
    else extractAssets(opts.assets)
    buildManifest()
  }

  const ranConfigsOrLangs = opts.configs !== null || opts.langs
  if (
    !opts.dryRun &&
    !opts.skipChangelog &&
    (opts.changelog || ranConfigsOrLangs)
  ) {
    buildChangelog()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
