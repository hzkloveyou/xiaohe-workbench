import { GlassCard } from "../../components/GlassCard";
import type { FocusStats } from "./focus-stats";

interface FocusInsightsProps { stats: FocusStats }

export function FocusInsights({ stats }: FocusInsightsProps) {
  const maxMinutes = Math.max(1, ...stats.days.map((day) => day.minutes));
  const hasActivity = stats.completedSessions > 0 || stats.completedTasks > 0;
  return (
    <GlassCard className="focus-insights" aria-labelledby="focus-insights-heading">
      <header className="panel-header"><div><p className="eyebrow">INSIGHTS</p><h2 id="focus-insights-heading">近七天节奏</h2></div><span className="streak-pill">连续 {stats.streakDays} 天</span></header>
      {!hasActivity ? <div className="planner-empty"><span aria-hidden="true">↗</span><h3>完成一次专注后，这里会长出你的节奏</h3><p>数据只记录完成的专注，不会因为暂停或刷新重复计算。</p></div> : (
        <>
          <div className="insight-metrics"><div><strong>{stats.totalMinutes} 分钟</strong><span>专注时长</span></div><div><strong>{stats.completedSessions}</strong><span>完成专注</span></div><div><strong>{stats.completedTasks}</strong><span>完成任务</span></div></div>
          <div className="focus-bars" aria-label="近七天专注分钟">
            {stats.days.map((day) => <div key={day.date} className="focus-bar"><div role="meter" aria-label={`${day.date} 专注 ${day.minutes} 分钟`} aria-valuemin={0} aria-valuemax={maxMinutes} aria-valuenow={day.minutes} style={{ "--bar-height": `${Math.max(day.minutes ? 10 : 2, day.minutes / maxMinutes * 100)}%` } as React.CSSProperties} /><span>{new Intl.DateTimeFormat("zh-CN", { weekday: "narrow" }).format(new Date(`${day.date}T12:00:00`))}</span></div>)}
          </div>
        </>
      )}
    </GlassCard>
  );
}
