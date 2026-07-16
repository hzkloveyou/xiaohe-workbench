import { GlassCard } from "../components/GlassCard";

export default function CollectPage() {
  return (
    <main className="app-shell route-page">
      <section className="hero route-page__hero"><p className="eyebrow">COLLECT</p><h1>收集与书签</h1><p>把链接、任务和灵感先放进来，再从容整理。</p></section>
      <GlassCard><p className="subtle-empty">万能收集箱将在这里出现。</p></GlassCard>
    </main>
  );
}
