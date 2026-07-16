import { useEffect, useState } from "react";
import { GlassCard } from "../../components/GlassCard";
import { loadGitHubSummary, type CachedResult } from "./github-api";
import type { GitHubSummary } from "./github-schema";

interface GitHubPanelProps {
  username: string;
  loader?: (username: string) => Promise<CachedResult<GitHubSummary>>;
}

export function GitHubPanel({ username, loader = loadGitHubSummary }: GitHubPanelProps) {
  const [result, setResult] = useState<CachedResult<GitHubSummary>>();
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let current = true;
    void loader(username).then((value) => { if (current) { setResult(value); setError(""); } }).catch((reason) => { if (current) setError(reason instanceof Error ? reason.message : "无法读取 GitHub 数据"); });
    return () => { current = false; };
  }, [loader, reload, username]);
  const retry = () => { setError(""); setResult(undefined); setReload((value) => value + 1); };
  return (
    <GlassCard className="github-panel" aria-labelledby="github-heading">
      <header className="panel-header"><div><p className="eyebrow">GITHUB</p><h2 id="github-heading">公开动态</h2></div><button type="button" className="icon-button" aria-label="刷新 GitHub 数据" onClick={retry}>↻</button></header>
      {error ? <div className="integration-error" role="alert"><strong>没有读到 GitHub 数据</strong><p>{error}</p><button type="button" onClick={retry}>重试</button></div> : !result ? <div className="loading-card" role="status"><span />正在读取 GitHub…</div> : <>
        <div className="github-profile"><img src={result.data.profile.avatarUrl} alt="" /><div><a href={result.data.profile.profileUrl} target="_blank" rel="noreferrer"><strong>{result.data.profile.name ?? result.data.profile.login}</strong><span>@{result.data.profile.login}</span></a><p>{result.data.profile.publicRepos} 个公开仓库 · {result.data.profile.followers} 位关注者{result.stale ? " · 离线缓存" : ""}</p></div></div>
        <div className="repo-list">{result.data.repositories.map((repository) => <a key={repository.id} href={repository.url} target="_blank" rel="noreferrer" className="repo-card"><div><strong>{repository.name}</strong><span>{repository.language ?? "项目"}</span></div>{repository.description ? <p>{repository.description}</p> : null}<small>★ {repository.stars} · Fork {repository.forks} · {new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" }).format(new Date(repository.updatedAt))} 更新</small></a>)}</div>
      </>}
    </GlassCard>
  );
}
