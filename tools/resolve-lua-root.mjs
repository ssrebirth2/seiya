/**
 * Resolve luaconfig root — primary extract only (no silent backup).
 * Override: LUA_CONFIG_ROOT
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const PRIMARY =
  process.env.LUA_CONFIG_ROOT ||
  'C:/rb2/assets/resources/luascriptwithoutcodecomments/luaconfig'

export function resolveLuaRoot() {
  if (existsSync(PRIMARY)) return PRIMARY
  throw new Error(
    `luaconfig not found at ${PRIMARY}\n` +
      '  Run: npm run configs:extract\n' +
      '  Or set LUA_CONFIG_ROOT\n' +
      '  Source: StreamingResources_cn → luascript/luascript_bundle.assetbundle'
  )
}

export function luaFile(...parts) {
  return join(resolveLuaRoot(), ...parts)
}
