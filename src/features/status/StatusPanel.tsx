import { useEffect, useState } from "react";
import { GlassCard } from "../../components/GlassCard";
import { checkWorkbenchServices, type ServiceStatus } from "./status-api";

interface StatusPanelProps { checker?: () => Promise<ServiceStatus[]> }

export function StatusPanel({ checker = checkWorkbenchServices }: StatusPanelProps) {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = () => { setLoading(true); void checker().then(setServices).finally(() => setLoading(false)); };
  useEffect(() => {
    let current = true;
    void checker().then((value) => { if (current) setServices(value); }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [checker]);
  return (
    <GlassCard className="status-panel" aria-labelledby="status-heading"><header className="panel-header"><div><p className="eyebrow">STATUS</p><h2 id="status-heading">服务状态</h2></div><button type="button" className="icon-button" aria-label="刷新服务状态" onClick={refresh}>↻</button></header>
      {loading && !services.length ? <div className="loading-card" role="status"><span />正在检查服务…</div> : <ul className="status-list">{services.map((service) => <li key={service.id}><span className="status-dot" data-state={service.state} aria-hidden="true" /><div><strong>{service.name}</strong><a href={service.url} target="_blank" rel="noreferrer">{service.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}</a></div><span>{service.state === "up" ? `${service.latencyMs ?? 0} ms` : "异常"}</span></li>)}</ul>}
      <p className="status-note">这里只做即时可用性检查，不替代专业监控和告警。</p>
    </GlassCard>
  );
}
