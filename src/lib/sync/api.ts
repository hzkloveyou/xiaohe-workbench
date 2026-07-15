import type { SyncEntity } from "../../../shared/entities";

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
  }
}

export interface SyncApi {
  push(changes: SyncEntity[]): Promise<{ acknowledgedIds: string[]; changes: SyncEntity[]; cursor?: number }>;
  pull(since: number): Promise<{ changes: SyncEntity[]; cursor: number }>;
}

function isErrorPayload(value: unknown): value is { error?: { code?: string; message?: string } } {
  return typeof value === "object" && value !== null && "error" in value;
}

async function request<T>(baseUrl: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers }
  });
  const data = (await response.json().catch(() => null)) as
    | T
    | { error?: { code?: string; message?: string } }
    | null;
  if (!response.ok) {
    const error = isErrorPayload(data) ? data.error : undefined;
    throw new ApiRequestError(
      response.status,
      error?.code ?? "REQUEST_FAILED",
      error?.message ?? "请求失败，请稍后重试"
    );
  }
  return data as T;
}

export function createSyncApi(baseUrl = import.meta.env.VITE_API_URL ?? "https://api.080492.xyz"): SyncApi {
  return {
    push(changes) {
      return request(baseUrl, "/v1/sync/push", { method: "POST", body: JSON.stringify({ changes }) });
    },
    pull(since) {
      return request(baseUrl, `/v1/sync?since=${encodeURIComponent(since)}`);
    }
  };
}
