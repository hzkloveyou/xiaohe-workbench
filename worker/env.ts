export interface WorkerEnv {
  DB: D1Database;
  ALLOWED_ORIGINS: string;
}

export function allowedOrigins(env: WorkerEnv): string[] {
  return env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean);
}
