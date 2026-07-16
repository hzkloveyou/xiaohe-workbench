import type { TaskView } from "./task-model";

const VIEWS: Array<{ id: TaskView; label: string }> = [
  { id: "today", label: "今天" },
  { id: "tomorrow", label: "明天" },
  { id: "later", label: "以后" },
  { id: "completed", label: "已完成" }
];

interface PlannerTabsProps {
  value: TaskView;
  counts: Record<TaskView, number>;
  onChange: (view: TaskView) => void;
}

export function PlannerTabs({ value, counts, onChange }: PlannerTabsProps) {
  return (
    <div className="planner-tabs" role="tablist" aria-label="计划时间范围">
      {VIEWS.map((view) => <button key={view.id} type="button" role="tab" aria-selected={value === view.id} onClick={() => onChange(view.id)}>{view.label}<span>{counts[view.id]}</span></button>)}
    </div>
  );
}
