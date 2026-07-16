import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GitHubPanel } from "../src/features/github/GitHubPanel";

describe("GitHubPanel", () => {
  it("renders profile and repository data", async () => {
    const loader = vi.fn().mockResolvedValue({ source: "network", stale: false, savedAt: 1, data: { profile: { login: "hzkloveyou", name: "小贺", avatarUrl: "https://example.com/a.png", profileUrl: "https://github.com/hzkloveyou", publicRepos: 3, followers: 2 }, repositories: [{ id: 1, name: "xiaohe-workbench", url: "https://github.com/hzkloveyou/xiaohe-workbench", description: "个人工作台", stars: 4, forks: 1, language: "TypeScript", updatedAt: "2026-07-16T10:00:00Z" }] } });
    render(<GitHubPanel username="hzkloveyou" loader={loader} />);
    expect(await screen.findByText("xiaohe-workbench")).toBeInTheDocument();
    expect(screen.getByText(/3 个公开仓库/)).toBeInTheDocument();
  });

  it("shows a recoverable error", async () => {
    render(<GitHubPanel username="missing" loader={vi.fn().mockRejectedValue(new Error("GitHub API 请求受限"))} />);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("GitHub API 请求受限"));
  });
});
