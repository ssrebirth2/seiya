#!/usr/bin/env node
/**
 * Export cosmo_sense LC keys from CommonBaseConfig.lua → public/data/cosmo-meta.json
 * Requires: npm run configs:extract (luascript_bundle → luaconfig)
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveLuaRoot } from './resolve-lua-root.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const luaPath = join(resolveLuaRoot(), 'game/common/CommonBaseConfig.lua')
const lua = readFileSync(luaPath, 'utf8')
const match = lua.match(/\["cosmo_sense"\]=\{[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,\{([^}]+)\}/)
if (!match) throw new Error('cosmo_sense not found in CommonBaseConfig.lua')

const keys = [...match[1].matchAll(/"([^"]+)"/g)].map((m) => m[1])
const outDir = join(ROOT, 'public/data')
mkdirSync(outDir, { recursive: true })
const outPath = join(outDir, 'cosmo-meta.json')
writeFileSync(outPath, JSON.stringify({ cosmoSenseLcKeys: keys }, null, 2), 'utf8')
const srcMirror = join(ROOT, 'src/data/cosmo-meta.json')
writeFileSync(srcMirror, JSON.stringify({ cosmoSenseLcKeys: keys }, null, 2), 'utf8')
console.log(`[cosmo-meta] wrote ${keys.length} sense keys → ${outPath}`)
