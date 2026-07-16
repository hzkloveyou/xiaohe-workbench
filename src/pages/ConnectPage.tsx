import { GlassCard } from "../components/GlassCard";
import { GitHubPanel } from "../features/github/GitHubPanel";
import { StatusPanel } from "../features/status/StatusPanel";

const EXTERNAL_LINKS = [
  { title: "GitHub", description: "仓库、Actions 与部署记录", url: "https://github.com/dashboard", mark: "GH" },
  { title: "Cloudflare", description: "Worker、D1、域名与请求日志", url: "https://dash.cloudflare.com/", mark: "CF" },
  { title: "Spaceship", description: "域名注册与续费管理", url: "https://www.spaceship.com/zh/application/domain-list-application/", mark: "SP" }
];

export default function ConnectPage() {
  return (
    <main className="app-shell route-page connect-page">
      <section className="hero route-page__hero"><p className="eyebrow">CONNECT</p><h1>连接与状态</h1><p>在一个地方查看 GitHub 动态、工作台运行状态和常用控制台。</p></section>
      <div className="connect-layout"><GitHubPanel username="hzkloveyou" /><div className="connect-layout__side"><StatusPanel /><GlassCard className="external-panel" aria-labelledby="external-heading"><header className="panel-header"><div><p className="eyebrow">EXTERNAL</p><h2 id="external-heading">外部控制台</h2></div></header><div className="external-links">{EXTERNAL_LINKS.map((link) => <a key={link.title} href={link.url} target="_blank" rel="noreferrer"><span aria-hidden="true">{link.mark}</span><div><strong>{link.title}</strong><p>{link.description}</p></div><b aria-hidden="true">↗</b></a>)}</div></GlassCard></div></div>
    </main>
  );
}
