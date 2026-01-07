// app/api/proxy-image/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const imageUrl = req.nextUrl.searchParams.get('url')

  if (!imageUrl || !imageUrl.startsWith('https://mmbiz.qpic.cn/')) {
    return NextResponse.json({ error: 'Invalid or missing image URL' }, { status: 400 })
  }

  try {
    const response = await fetch(imageUrl)

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: 502 })
    }

    const contentType = response.headers.get('content-type') || 'image/png'
    const buffer = await response.arrayBuffer()

    return new NextResponse(Buffer.from(buffer), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 's-maxage=86400, stale-while-revalidate=43200',
      }
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal proxy error' }, { status: 500 })
  }
}
