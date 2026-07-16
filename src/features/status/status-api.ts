export type ServiceState = "checking" | "up" | "down";
export interface ServiceStatus { id: "site" | "api" | "github"; name: string; url: string; state: ServiceState; latencyMs?: number }

const SERVICES: Array<Omit<ServiceStatus, "state" | "latencyMs">> = [
  { id: "site", name: "工作台网站", url: "https://080492.xyz/" },
  { id: "api", name: "云端同步 API", url: "https://api.080492.xyz/health" },
  { id: "github", name: "GitHub 公共 API", url: "https://api.github.com/" }
];

export async function checkWorkbenchServices(fetcher: typeof fetch = fetch): Promise<ServiceStatus[]> {
  const checks = SERVICES.map(async (service): Promise<ServiceStatus> => {
    const startedAt = performance.now();
    try {
      const response = await fetcher(service.url, { method: "GET", headers: service.id === "github" ? { Accept: "application/vnd.github+json" } : undefined });
      return { ...service, state: response.ok ? "up" : "down", latencyMs: Math.round(performance.now() - startedAt) };
    } catch { return { ...service, state: "down", latencyMs: Math.round(performance.now() - startedAt) }; }
  });
  const settled = await Promise.allSettled(checks);
  return settled.map((result, index) => result.status === "fulfilled" ? result.value : { ...SERVICES[index]!, state: "down" });
}
