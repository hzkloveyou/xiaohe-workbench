import { useEffect, useMemo, useRef, useState } from "react";
import { filterCommands, type CommandItem } from "./command-model";

export function CommandPalette({
  open,
  items,
  onClose,
  onWebSearch,
  onQuickCapture
}: {
  open: boolean;
  items: CommandItem[];
  onClose: () => void;
  onWebSearch: (query: string) => void;
  onQuickCapture: (query: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const results = useMemo(() => filterCommands(items, query), [items, query]);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    queueMicrotask(() => inputRef.current?.focus());
    return () => previousFocus.current?.focus();
  }, [open]);

  if (!open) return null;
  const close = () => {
    setQuery("");
    setActiveIndex(0);
    onClose();
  };
  const execute = (item: CommandItem) => {
    item.run();
    close();
  };
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === "ArrowDown" && results.length) {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % results.length);
      return;
    }
    if (event.key === "ArrowUp" && results.length) {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + results.length) % results.length);
      return;
    }
    if (event.key === "Enter" && results[activeIndex]) {
      event.preventDefault();
      execute(results[activeIndex]);
    }
  };

  return (
    <div className="command-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section className="command-palette" role="dialog" aria-modal="true" aria-label="全局指令中心">
        <div className="command-palette__search">
          <span aria-hidden="true">⌘</span>
          <input
            ref={inputRef}
            role="combobox"
            aria-label="搜索指令"
            aria-controls="command-results"
            aria-expanded="true"
            aria-activedescendant={results[activeIndex] ? `command-${results[activeIndex].id}` : undefined}
            value={query}
            onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="搜索页面、书签或输入一个动作…"
          />
          <kbd>Esc</kbd>
        </div>
        {results.length ? (
          <ul id="command-results" className="command-results" role="listbox" aria-label="指令结果">
            {results.map((item, index) => (
              <li key={item.id} id={`command-${item.id}`} role="option" aria-selected={index === activeIndex}>
                <button type="button" onMouseEnter={() => setActiveIndex(index)} onClick={() => execute(item)}>
                  <span className="command-result__icon" aria-hidden="true">{item.icon ?? "→"}</span>
                  <span><strong>{item.label}</strong>{item.description ? <small>{item.description}</small> : null}</span>
                  <em>{item.group === "bookmark" ? "书签" : item.group === "page" ? "页面" : "动作"}</em>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="command-empty">
            <p>工作台里暂时没有匹配项</p>
            <button type="button" aria-label={`搜索网页：${query}`} onClick={() => onWebSearch(query)}>搜索网页“{query}”</button>
            <button type="button" aria-label={`收集：${query}`} onClick={() => onQuickCapture(query)}>收集这段内容</button>
          </div>
        )}
        <div className="command-palette__footer"><span>↑↓ 选择</span><span>Enter 执行</span><span>Esc 关闭</span></div>
      </section>
    </div>
  );
}
