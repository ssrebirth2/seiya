import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type WechatPost = {
  id: string
  title: string | null
  author: string | null
  published_at: string | null
  cover_url: string | null
}

function formatLocalDate(iso?: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

export default async function NewsPage() {
  const { data: posts, error } = await supabase
    .from('wechat_posts')
    .select('id,title,author,published_at,cover_url')
    .order('published_at', { ascending: false })
    .limit(100)

  if (error) {
    return (
      <div className="panel">
        <h2 className="text-lg font-bold">Erro ao carregar notícias</h2>
        <pre className="text-xs mt-2">{error.message}</pre>
      </div>
    )
  }

  return (
    <div className="panel">
      <h1 className="text-xl font-bold mb-4">News</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {posts?.map((p: WechatPost) => (
          <Link
            key={p.id} // ✅ key adicionada
            href={`/news/view?id=${encodeURIComponent(p.id)}`}
            className="border rounded-lg overflow-hidden hover:shadow-md transition bg-white/5"
          >
            {/* ✅ COVER */}
            {p.cover_url ? (
              <div className="aspect-[16/9] bg-black/10">
                <img
                  src={p.cover_url}
                  alt={p.title ?? 'cover'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="aspect-[16/9] bg-black/10" />
            )}

            <div className="p-4">
              <h3 className="font-semibold line-clamp-2">
                {p.title ?? '(sem título)'}
              </h3>

              <div className="text-sm text-muted mt-1">
                {p.author && <span>{p.author}</span>}
                {p.published_at && (
                  <span> · {formatLocalDate(p.published_at)}</span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {posts?.length === 0 && (
        <p className="text-sm text-muted mt-6">Nenhuma notícia encontrada.</p>
      )}
    </div>
  )
}
