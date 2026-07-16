import { describe, expect, it, vi } from "vitest";
import { loadGitHubSummary } from "../src/features/github/github-api";

const summary = {
  profile: { login: "hzkloveyou", name: "小贺", avatarUrl: "https://example.com/a.png", profileUrl: "https://github.com/hzkloveyou", publicRepos: 3, followers: 2 },
  repositories: [{ id: 1, name: "xiaohe-workbench", url: "https://github.com/hzkloveyou/xiaohe-workbench", description: "工作台", stars: 4, forks: 1, language: "TypeScript", updatedAt: "2026-07-16T10:00:00Z" }]
};

function storageWith(value?: string): Storage {
  const values = new Map<string, string>();
  if (value) values.set("xiaohe:github:hzkloveyou", value);
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, item) => { values.set(key, item); }, removeItem: (key) => { values.delete(key); }, clear: () => values.clear(), key: (index) => [...values.keys()][index] ?? null, get length() { return values.size; } };
}

describe("GitHub API", () => {
  it("returns a fresh fifteen-minute cache without another request", async () => {
    const now = 100_000;
    const storage = storageWith(JSON.stringify({ savedAt: now - 60_000, data: summary }));
    const fetcher = vi.fn();
    expect(await loadGitHubSummary("hzkloveyou", { fetcher, storage, now })).toMatchObject({ source: "cache", data: summary, stale: false });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("validates network responses and caches the public summary", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ login: "hzkloveyou", name: "小贺", avatar_url: "https://example.com/a.png", html_url: "https://github.com/hzkloveyou", public_repos: 3, followers: 2 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: 1, name: "xiaohe-workbench", html_url: "https://github.com/hzkloveyou/xiaohe-workbench", description: "工作台", stargazers_count: 4, forks_count: 1, language: "TypeScript", updated_at: "2026-07-16T10:00:00Z", fork: false }]), { status: 200 }));
    const result = await loadGitHubSummary("hzkloveyou", { fetcher, storage: storageWith(), now: 200_000 });
    expect(result).toMatchObject({ source: "network", stale: false, data: summary });
  });

  it("falls back to stale cache when the network is unavailable", async () => {
    const storage = storageWith(JSON.stringify({ savedAt: 1, data: summary }));
    const fetcher = vi.fn().mockRejectedValue(new Error("offline"));
    expect(await loadGitHubSummary("hzkloveyou", { fetcher, storage, now: 2_000_000 })).toMatchObject({ source: "cache", stale: true, data: summary });
  });
});
