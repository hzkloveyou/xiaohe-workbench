import { derivePasswordProof } from "./password-proof";

export interface AuthUser { id: string; username: string }
export interface AuthResult { user: AuthUser; recoveryCode?: string }

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = import.meta.env.VITE_API_URL ?? "https://api.080492.xyz";
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers }
  });
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => null) as T | { error?: { message?: string } } | null;
  if (!response.ok) {
    const message = data && typeof data === "object" && "error" in data ? data.error?.message : undefined;
    throw new Error(message ?? "请求失败，请稍后重试");
  }
  return data as T;
}

export const authApi = {
  async login(username: string, password: string) {
    const passwordProof = await derivePasswordProof(username, password);
    return request<AuthResult>("/v1/auth/login", { method: "POST", body: JSON.stringify({ username, password: passwordProof }) });
  },
  async register(username: string, password: string) {
    const passwordProof = await derivePasswordProof(username, password);
    return request<AuthResult>("/v1/auth/register", { method: "POST", body: JSON.stringify({ username, password: passwordProof }) });
  },
  async recover(username: string, recoveryCode: string, newPassword: string) {
    const passwordProof = await derivePasswordProof(username, newPassword);
    return request<AuthResult>("/v1/auth/recover", { method: "POST", body: JSON.stringify({ username, recoveryCode, newPassword: passwordProof }) });
  },
  logout() { return request<void>("/v1/auth/logout", { method: "POST" }); },
  session() { return request<{ user: AuthUser | null }>("/v1/auth/session"); }
};
