import { useEffect, useRef, useState, type FormEvent } from "react";
import { SearchEngineMenu } from "./SearchEngineMenu";
import { resolveSearchInput, type SearchEngineId } from "./search";

export function SearchBar({ engine, onEngineChange, onNavigate = (url) => window.location.assign(url) }: {
  engine: SearchEngineId;
  onEngineChange: (engine: SearchEngineId) => void;
  onNavigate?: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    try {
      const result = resolveSearchInput(value, engine);
      setError("");
      onNavigate(result.url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "无法处理这段内容");
    }
  };
  return (
    <div className="search-wrap">
      <form className="search-bar" role="search" onSubmit={handleSubmit}>
        <span className="search-icon" aria-hidden="true">⌕</span>
        <input ref={inputRef} type="search" value={value} onChange={(event) => setValue(event.target.value)} placeholder="搜索网页，或输入网址" aria-label="搜索网页或输入网址" aria-describedby={error ? "search-error" : undefined} />
        <kbd>Ctrl K</kbd>
        <SearchEngineMenu value={engine} onChange={onEngineChange} />
        <button type="submit" className="search-submit" aria-label="开始搜索">前往</button>
      </form>
      {error ? <p className="field-error" id="search-error" role="alert">{error}</p> : null}
      <p className="search-hint"><span>gh</span> 搜 GitHub · <span>mdn</span> 搜开发文档</p>
    </div>
  );
}
