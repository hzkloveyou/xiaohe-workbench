import { z } from "zod";

export const GitHubProfileSchema = z.object({
  login: z.string(),
  name: z.string().nullable(),
  avatar_url: z.url(),
  html_url: z.url(),
  public_repos: z.number().int().nonnegative(),
  followers: z.number().int().nonnegative()
});

export const GitHubRepositorySchema = z.object({
  id: z.number(),
  name: z.string(),
  html_url: z.url(),
  description: z.string().nullable(),
  stargazers_count: z.number().int().nonnegative(),
  forks_count: z.number().int().nonnegative(),
  language: z.string().nullable(),
  updated_at: z.string(),
  fork: z.boolean()
});

export const GitHubRepositoriesSchema = z.array(GitHubRepositorySchema);

export interface GitHubSummary {
  profile: {
    login: string;
    name: string | null;
    avatarUrl: string;
    profileUrl: string;
    publicRepos: number;
    followers: number;
  };
  repositories: Array<{
    id: number;
    name: string;
    url: string;
    description: string | null;
    stars: number;
    forks: number;
    language: string | null;
    updatedAt: string;
  }>;
}
