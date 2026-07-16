import { GitHubProfileSchema, GitHubRepositoriesSchema, type GitHubSummary } from "./github-schema";

const CACHE_TTL_MS = 15 * 60_000;
const USERNAME_PATTERN = /^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i;

export interface CachedResult<T> { data: T; source: "network" | "cache"; stale: boolean; savedAt: number }
export interface GitHubLoadOptions {
  fetcher?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  storage?: Pick<Storage, "getItem" | "setItem">;
  now?: number;
}

function cacheKey(username: string) { return `xiaohe:github:${username.toLocaleLowerCase()}`; }

function readCache(storage: Pick<Storage, "getItem">, username: string): { savedAt: number; data: GitHubSummary } | null {
  try {
    const raw = storage.getItem(cacheKey(username));
    if (!raw) return null;
    const value = JSON.parse(raw) as { savedAt?: unknown; data?: GitHubSummary };
    return typeof value.savedAt === "number" && value.data ? { savedAt: value.savedAt, data: value.data } : null;
  } catch { return null; }
}

async function githubJson(url: string, fetcher: NonNullable<GitHubLoadOptions["fetcher"]>, signal: AbortSignal): Promise<unknown> {
  const response = await fetcher(url, { headers: { Accept: "application/vnd.github+json" }, signal });
  if (!response.ok) {
    if (response.status === 403 || response.status === 429) throw new Error("GitHub API 请求受限，请稍后再试");
    if (response.status === 404) throw new Error("没有找到这个 GitHub 用户");
    throw new Error("暂时无法读取 GitHub 数据");
  }
  return response.json();
}

async function fetchSummary(username: string, fetcher: NonNullable<GitHubLoadOptions["fetcher"]>): Promise<GitHubSummary> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const [profileValue, repositoriesValue] = await Promise.all([
      githubJson(`https://api.github.com/users/${encodeURIComponent(username)}`, fetcher, controller.signal),
      githubJson(`https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=12&type=owner`, fetcher, controller.signal)
    ]);
    const profile = GitHubProfileSchema.parse(profileValue);
    const repositories = GitHubRepositoriesSchema.parse(repositoriesValue).filter((repository) => !repository.fork).slice(0, 6);
    return {
      profile: { login: profile.login, name: profile.name, avatarUrl: profile.avatar_url, profileUrl: profile.html_url, publicRepos: profile.public_repos, followers: profile.followers },
      repositories: repositories.map((repository) => ({ id: repository.id, name: repository.name, url: repository.html_url, description: repository.description, stars: repository.stargazers_count, forks: repository.forks_count, language: repository.language, updatedAt: repository.updated_at }))
    };
  } finally { clearTimeout(timeout); }
}

export async function loadGitHubSummary(username: string, options: GitHubLoadOptions = {}): Promise<CachedResult<GitHubSummary>> {
  const normalized = username.trim();
  if (!USERNAME_PATTERN.test(normalized)) throw new Error("GitHub 用户名格式不正确");
  const storage = options.storage ?? window.localStorage;
  const now = options.now ?? Date.now();
  const fetcher = options.fetcher ?? fetch;
  const cached = readCache(storage, normalized);
  if (cached && now - cached.savedAt < CACHE_TTL_MS) return { ...cached, source: "cache", stale: false };
  try {
    const data = await fetchSummary(normalized, fetcher);
    storage.setItem(cacheKey(normalized), JSON.stringify({ savedAt: now, data }));
    return { data, source: "network", stale: false, savedAt: now };
  } catch (error) {
    if (cached) return { ...cached, source: "cache", stale: true };
    throw error;
  }
}
