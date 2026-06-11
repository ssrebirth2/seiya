import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

function isValidUtf8(buf) {
  let i = 0
  while (i < buf.length) {
    const c = buf[i]
    if (c <= 0x7f) {
      i++
      continue
    }
    if (c >= 0xc2 && c <= 0xdf) {
      if (i + 1 >= buf.length || (buf[i + 1] & 0xc0) !== 0x80) return false
      i += 2
      continue
    }
    if (c >= 0xe0 && c <= 0xef) {
      if (
        i + 2 >= buf.length ||
        (buf[i + 1] & 0xc0) !== 0x80 ||
        (buf[i + 2] & 0xc0) !== 0x80
      )
        return false
      i += 3
      continue
    }
    if (c >= 0xf0 && c <= 0xf4) {
      if (
        i + 3 >= buf.length ||
        (buf[i + 1] & 0xc0) !== 0x80 ||
        (buf[i + 2] & 0xc0) !== 0x80 ||
        (buf[i + 3] & 0xc0) !== 0x80
      )
        return false
      i += 4
      continue
    }
    return false
  }
  return true
}

/** Fix stray Latin-1 bytes left inside otherwise UTF-8 source files. */
function repairUtf8(buffer) {
  const out = []
  let i = 0
  while (i < buffer.length) {
    const b = buffer[i]
    if (b < 0x80) {
      out.push(b)
      i++
      continue
    }

    let seqLen = 0
    if (b >= 0xc2 && b <= 0xdf) seqLen = 2
    else if (b >= 0xe0 && b <= 0xef) seqLen = 3
    else if (b >= 0xf0 && b <= 0xf4) seqLen = 4

    if (seqLen > 0 && i + seqLen <= buffer.length) {
      const slice = buffer.subarray(i, i + seqLen)
      if (isValidUtf8(slice)) {
        out.push(...slice)
        i += seqLen
        continue
      }
    }

    const encoded = Buffer.from(String.fromCharCode(b), 'utf8')
    out.push(...encoded)
    i++
  }
  return Buffer.from(out)
}

function walk(dir, fixed) {
  for (const name of readdirSync(dir)) {
    const file = join(dir, name)
    if (statSync(file).isDirectory()) {
      walk(file, fixed)
      continue
    }
    if (!/\.(tsx|ts|css|mjs|json)$/.test(name)) continue

    const original = readFileSync(file)
    if (isValidUtf8(original)) continue

    const repaired = repairUtf8(original)
    if (!isValidUtf8(repaired)) {
      console.error(`Still invalid after repair: ${file}`)
      continue
    }

    writeFileSync(file, repaired)
    fixed.push(file)
  }
}

const fixed = []
walk('src', fixed)
walk('scripts', fixed)
console.log(fixed.length ? `Repaired:\n${fixed.join('\n')}` : 'No invalid UTF-8 files found.')
