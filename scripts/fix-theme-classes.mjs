import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const replacements = [
  [/text-\[var\(--text-muted\)\]/g, 'text-text-muted'],
  [/text-\[var\(--foreground\)\]/g, 'text-foreground'],
  [/border-\[var\(--panel-border\)\]/g, 'border-panel-border'],
  [/bg-\[var\(--panel-hover\)\]/g, 'bg-panel-hover'],
  [/bg-\[var\(--panel\)\]/g, 'bg-panel'],
  [/hover:bg-\[var\(--panel-hover\)\]/g, 'hover:bg-panel-hover'],
  [/hover:text-\[var\(--foreground\)\]/g, 'hover:text-foreground'],
  [/hover:text-blue-300/g, 'hover:text-accent'],
  [/border-blue-400\/40/g, 'border-accent/40'],
  [/hover:border-blue-400\/40/g, 'hover:border-accent/40'],
  [/border-b-2 border-blue-400 text-blue-400/g, 'border-b-2 border-accent text-accent'],
  [/border-blue-400 text-blue-400/g, 'border-accent text-accent'],
  [/border-blue-400/g, 'border-accent'],
  [/text-blue-400/g, 'text-accent'],
  [/text-blue-300/g, 'text-accent'],
  [/text-\[var\(--text\)\]/g, 'text-foreground'],
  [/bg-red-600 text-white/g, 'btn-remove'],
  [/hover:bg-red-700/g, 'hover:bg-destructive-hover'],
  [/bg-black\/40/g, 'overlay-backdrop'],
  [/bg-black\/60/g, 'overlay-backdrop-strong'],
  [
    /w-6 h-6 border-4 border-accent border-t-transparent rounded-full animate-spin/g,
    'spinner h-6 w-6',
  ],
  [
    /w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin/g,
    'spinner h-10 w-10',
  ],
  [
    /h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent/g,
    'spinner h-10 w-10',
  ],
]

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const file = join(dir, name)
    if (statSync(file).isDirectory()) {
      walk(file)
      continue
    }
    if (!/\.(tsx|ts)$/.test(name)) continue

    let content = readFileSync(file, 'utf8')
    const original = content
    for (const [pattern, value] of replacements) {
      content = content.replace(pattern, value)
    }
    if (content !== original) writeFileSync(file, content, 'utf8')
  }
}

walk('src')
console.log('Theme class migration complete.')
