interface QuickNoteProps {
  value: string;
  onChange?: (value: string) => void;
}

export function QuickNote({ value, onChange }: QuickNoteProps) {
  return (
    <label className="quick-note">
      <span>随手记 <small>自动保存</small></span>
      <textarea aria-label="随手记" value={value} onChange={(event) => onChange?.(event.target.value)} placeholder="记下一闪而过的想法…" maxLength={4000} />
    </label>
  );
}
