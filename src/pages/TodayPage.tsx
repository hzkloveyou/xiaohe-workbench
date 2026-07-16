import { GlassCard } from "../components/GlassCard";

export default function TodayPage() {
  return (
    <main className="app-shell route-page">
      <section className="hero route-page__hero"><p className="eyebrow">TODAY</p><h1>今日计划</h1><p>把重要的事排好，也为专注留下空间。</p></section>
      <GlassCard><p className="subtle-empty">今日计划与专注统计将在这里出现。</p></GlassCard>
    </main>
  );
}
