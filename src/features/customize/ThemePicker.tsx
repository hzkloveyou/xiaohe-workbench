import type { ThemeId } from "../../../shared/entities";

const themes: { id: ThemeId; name: string; description: string; colors: string[] }[] = [
  { id: "morning", name: "晨雾", description: "清透蓝绿，默认主题", colors: ["#dff7ff", "#bdebdc", "#fffaf0"] },
  { id: "dusk", name: "晚霞", description: "温柔杏粉与暮光紫", colors: ["#ffe4d6", "#f7c6d8", "#d8d1f7"] },
  { id: "night", name: "夜航", description: "深海蓝与薄荷微光", colors: ["#101d2f", "#1b4b53", "#79d6c2"] },
  { id: "system", name: "跟随系统", description: "自动匹配明暗模式", colors: ["#edf8fb", "#768693", "#152133"] }
];

export function ThemePicker({ value, onChange }: { value: ThemeId; onChange: (theme: ThemeId) => void }) {
  return <fieldset className="theme-picker"><legend>主题</legend>{themes.map((theme) => <label key={theme.id} className="theme-option" data-selected={value === theme.id || undefined}><input type="radio" name="theme" value={theme.id} checked={value === theme.id} onChange={() => onChange(theme.id)} /><span className="theme-swatches" aria-hidden="true">{theme.colors.map((color) => <i key={color} style={{ background: color }} />)}</span><span><strong>{theme.name}</strong><small>{theme.description}</small></span></label>)}</fieldset>;
}
