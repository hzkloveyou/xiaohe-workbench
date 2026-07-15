import { SEARCH_ENGINES, type SearchEngineId } from "./search";

export function SearchEngineMenu({
  value,
  onChange
}: {
  value: SearchEngineId;
  onChange: (engine: SearchEngineId) => void;
}) {
  return (
    <label className="search-engine">
      <span className="sr-only">搜索引擎</span>
      <select value={value} onChange={(event) => onChange(event.target.value as SearchEngineId)}>
        {Object.entries(SEARCH_ENGINES).map(([id, engine]) => (
          <option key={id} value={id}>{engine.label}</option>
        ))}
      </select>
    </label>
  );
}
