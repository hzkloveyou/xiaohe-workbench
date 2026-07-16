import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useWorkspace } from "../app/workspace/workspace-context";
import { Button } from "../components/Button";
import { GlassCard } from "../components/GlassCard";
import { FocusTimer } from "../features/focus/FocusTimer";
import { createTimerState, type TimerState } from "../features/focus/timer";
import { FocusInsights } from "../features/insights/FocusInsights";
import { buildFocusStats, isFocusSessionEntity } from "../features/insights/focus-stats";
import { PlannerTabs } from "../features/planner/PlannerTabs";
import { TaskDialog } from "../features/planner/TaskDialog";
import { TaskList } from "../features/planner/TaskList";
import {
  completeTask,
  createTask,
  isTaskEntity,
  localDate,
  restoreTask,
  tasksForView,
  updateTask,
  type TaskEntity,
  type TaskInput,
  type TaskView
} from "../features/planner/task-model";

export default function TodayPage() {
  const { entities, commit, remove, showToast } = useWorkspace();
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState<TaskView>("today");
  const [dialogOpen, setDialogOpen] = useState(searchParams.get("new") === "1");
  const [editingTask, setEditingTask] = useState<TaskEntity>();
  const today = localDate();
  const tasks = entities.filter(isTaskEntity);
  const timerEntity = entities.find((entity) => entity.type === "timer" && !entity.deletedAt);
  const timer = (timerEntity?.data as TimerState | undefined) ?? createTimerState();
  const stats = buildFocusStats(entities.filter(isFocusSessionEntity), tasks);
  const buckets = useMemo(() => ({
    today: tasksForView(tasks, "today", today),
    tomorrow: tasksForView(tasks, "tomorrow", today),
    later: tasksForView(tasks, "later", today),
    completed: tasksForView(tasks, "completed", today)
  }), [tasks, today]);
  const counts = { today: buckets.today.length, tomorrow: buckets.tomorrow.length, later: buckets.later.length, completed: buckets.completed.length };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingTask(undefined);
    if (searchParams.has("new")) setSearchParams({}, { replace: true });
  };
  const saveTask = async (input: TaskInput) => {
    try {
      await commit([editingTask ? updateTask(editingTask, input) : createTask({ ...input, order: tasks.length })]);
      showToast(editingTask ? "任务已更新" : "任务已添加");
      closeDialog();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "无法保存任务");
    }
  };
  const finishTask = async (task: TaskEntity) => {
    await commit(completeTask(task));
    showToast(task.data.recurrence ? "已完成，并创建下一次任务" : "任务已完成");
  };
  const restore = async (task: TaskEntity) => {
    await commit([restoreTask(task)]);
    showToast("任务已恢复");
  };
  const saveTimer = async (value: TimerState) => commit([{
    id: timerEntity?.id ?? "focus-timer",
    type: "timer",
    updatedAt: Date.now(),
    data: value
  }]);

  return (
    <main className="app-shell route-page today-page">
      <section className="hero route-page__hero"><p className="eyebrow">TODAY</p><h1>今日计划</h1><p>把重要的事排好，也为专注留下空间。</p></section>
      <div className="today-dashboard">
      <GlassCard className="planner-panel" aria-labelledby="planner-heading">
        <header className="panel-header"><div><p className="eyebrow">PLANNER</p><h2 id="planner-heading">任务安排</h2></div><Button variant="primary" onClick={() => { setEditingTask(undefined); setDialogOpen(true); }}>＋ 添加任务</Button></header>
        <PlannerTabs value={view} counts={counts} onChange={setView} />
        <TaskList
          tasks={buckets[view]}
          view={view}
          onComplete={(task) => void finishTask(task)}
          onRestore={(task) => void restore(task)}
          onEdit={(task) => { setEditingTask(task); setDialogOpen(true); }}
          onDelete={(task) => { if (window.confirm(`删除“${task.data.title}”？`)) void remove(task); }}
        />
      </GlassCard>
      <div className="today-dashboard__focus">
        <GlassCard className="focus-session-panel" aria-labelledby="focus-session-heading"><header className="panel-header"><div><p className="eyebrow">FOCUS</p><h2 id="focus-session-heading">专注计时</h2></div></header><FocusTimer state={timer} tasks={buckets.today} onChange={(value) => void saveTimer(value)} onSessionComplete={(session) => void commit([{ id: `focus-${session.startedAt}`, type: "focusSession", updatedAt: session.endedAt, data: session }])} /></GlassCard>
        <FocusInsights stats={stats} />
      </div>
      </div>
      <TaskDialog open={dialogOpen} task={editingTask} defaultDate={view === "tomorrow" ? buckets.tomorrow[0]?.data.scheduledFor : today} onClose={closeDialog} onSave={(input) => void saveTask(input)} />
    </main>
  );
}
