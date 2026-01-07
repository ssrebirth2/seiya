"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function NewsDetailClient() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || "";

  const [post, setPost] = useState<any>(null);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("wechat_posts")
      .select("id,title,author,published_at,content_html,source_url")
      .eq("id", id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) setError(error);
        else setPost(data);
      });
  }, [id]);

  if (error) {
    return (
      <div className="panel">
        <Link href="/news" className="text-sm underline">
          ← Voltar
        </Link>
        <h2 className="text-lg font-bold mt-3">Erro ao carregar notícia</h2>
        <pre className="text-xs mt-2">{error.message}</pre>
        <pre className="text-xs mt-2">ID: {id}</pre>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="panel">
        <Link href="/news" className="text-sm underline">
          ← Voltar
        </Link>
        <h2 className="text-lg font-bold mt-3">Carregando...</h2>
        <p className="text-sm text-muted mt-2">ID: {id}</p>
      </div>
    );
  }

  return (
  <div className="news-detail-page">
    <div className="news-detail-panel panel">
      <Link href="/news" className="text-sm underline">
        ← Voltar
      </Link>

      <h1 className="text-2xl font-bold mt-3">
        {post.title ?? "(sem título)"}
      </h1>

      <div className="text-sm text-muted mt-1">
        Autor: {post.author ?? "Desconhecido"} · Publicado:{" "}
        {post.published_at ?? "Desconhecido"}
      </div>

      <div
        className="wechat-content mt-6"
        dangerouslySetInnerHTML={{
          __html: post.content_html ?? "<p>Sem conteúdo</p>",
        }}
      />
    </div>
  </div>
);

}
