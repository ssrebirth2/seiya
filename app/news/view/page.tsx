import { Suspense } from "react";
import NewsDetailClient from "./NewsDetailClient";

export default function NewsViewPage() {
  return (
    <Suspense fallback={<div className="panel">Carregando...</div>}>
      <NewsDetailClient />
    </Suspense>
  );
}