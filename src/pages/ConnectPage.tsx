import { GlassCard } from "../components/GlassCard";

export default function ConnectPage() {
  return (
    <main className="app-shell route-page">
      <section className="hero route-page__hero"><p className="eyebrow">CONNECT</p><h1>连接与状态</h1><p>在一个地方查看 GitHub 动态和工作台运行状态。</p></section>
      <GlassCard><p className="subtle-empty">GitHub 面板与状态中心将在这里出现。</p></GlassCard>
    </main>
  );
}
