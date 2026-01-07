import fs from 'fs'
import dotenv from 'dotenv'
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '../.env.local' })

// ================= SUPABASE =================
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// ================= INPUT =================
const links = JSON.parse(fs.readFileSync('./links.json', 'utf8'))

// ================= UTILS =================
function sanitizeHtml(html) {
  if (!html) return html

  return html.replace(/<img[^>]+>/gi, (imgTag) => {
    // Encontra o primeiro atributo com URL do WeChat
    const match = imgTag.match(/(src|data-src|data-croporisrc)=["'](https:\/\/mmbiz\.qpic\.cn\/[^"'>]+)["']/i)

    if (!match) return imgTag // não tem imagem do WeChat → deixa como está

    const [, attr, url] = match
    const clean = url.split('?')[0].split('#')[0]
    const encoded = encodeURIComponent(clean)

    // substitui qualquer src/data-src/data-croporisrc por src usando o proxy
    let finalTag = imgTag
      .replace(/(src|data-src|data-croporisrc)=["'][^"']+["']/gi, '') // remove os antigos
      .replace('<img', `<img src="/api/proxy-image?url=${encoded}"`)

    return finalTag
  })
}



function decodeHtmlEntities(str) {
  if (!str) return str
  return str.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
}

// 👉 EXTRAÇÃO DA DATA REAL DO WECHAT (UTC)
function extractPublishedAt(html) {
  const match = html.match(/var\s+ct\s*=\s*["'](\d{10})["']/)
  if (!match) return null
  const unix = Number(match[1])
  return new Date(unix * 1000).toISOString()
}

// 👉 EXTRAÇÃO DO COVER (prioridade: og:image -> twitter:image -> msg_cdn_url -> fallback)
function extractCoverUrl(html) {
  // 1) meta og:image
  let m =
    html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
    html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i)

  if (m?.[1]) return decodeHtmlEntities(m[1])

  // 2) meta twitter:image
  m =
    html.match(/<meta\s+property=["']twitter:image["']\s+content=["']([^"']+)["']/i) ||
    html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']twitter:image["']/i)

  if (m?.[1]) return decodeHtmlEntities(m[1])

  // 3) var msg_cdn_url = "..."
  m = html.match(/var\s+msg_cdn_url\s*=\s*["']([^"']+)["']\s*;/i)
  if (m?.[1]) return decodeHtmlEntities(m[1])

  return null
}

// ================= PRE-FILTER (NÍVEL 2) =================
console.log('📥 Buscando posts já importados no banco...')

const { data: existingPosts, error: fetchError } = await supabase
  .from('wechat_posts')
  .select('id')

if (fetchError) {
  console.error('❌ Erro ao buscar posts existentes:', fetchError.message)
  process.exit(1)
}

const existingIds = new Set((existingPosts ?? []).map(p => p.id))

const pendingLinks = links.filter(url => {
  const id = Buffer.from(url).toString('base64')
  return !existingIds.has(id)
})

console.log(`🧮 Total de links: ${links.length}`)
console.log(`⏭️ Já ingeridos: ${links.length - pendingLinks.length}`)
console.log(`🚀 Novos para processar: ${pendingLinks.length}`)

if (pendingLinks.length === 0) {
  console.log('✅ Nada novo para processar. Encerrando.')
  process.exit(0)
}

// ================= MAIN =================
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
})

for (const url of pendingLinks) {
  console.log(`🔎 Processando ${url}`)

  try {
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.waitForSelector('#js_content', { timeout: 20000 })

    // HTML COMPLETO (JS já executou)
    const html = await page.content()

    const published_at = extractPublishedAt(html)
    let cover_url = extractCoverUrl(html)

    const data = await page.evaluate(() => {
      const title =
        document.querySelector('#activity-name')?.innerText.trim() ||
        document.title

      const author =
        document.querySelector('#js_name')?.innerText.trim() || ''

      const content =
        document.querySelector('#js_content')?.innerHTML || ''

      // fallback: primeira imagem do conteúdo
      const firstImg = document.querySelector('#js_content img')
      const firstImgUrl =
        firstImg?.getAttribute('data-src') ||
        firstImg?.getAttribute('data-croporisrc') ||
        firstImg?.getAttribute('src') ||
        ''

      return { title, author, content, firstImgUrl }
    })

    if (!data.content) {
      console.log('❌ Conteúdo vazio')
      continue
    }

    // se não achou cover no HTML, usa 1ª img do conteúdo
    if (!cover_url && data.firstImgUrl) cover_url = data.firstImgUrl

    const id = Buffer.from(url).toString('base64')

    const record = {
      id,
      title: data.title,
      author: data.author,
      published_at,     // UTC (data original do post)
      cover_url,        // ✅ agora vai preenchido
      content_html: sanitizeHtml(data.content),
      canonical_url: url,
      source_url: url
    }

    const { error } = await supabase.from('wechat_posts').insert(record)

    if (error) {
      console.error('❌ Erro ao inserir:', error.message)
    } else {
      console.log('✅ Inserido')
    }
  } catch (err) {
    console.error('❌ Falha ao processar:', err.message)
  }
}

await browser.close()
console.log('🎉 Fim da ingestão')
