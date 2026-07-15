import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { z } from "zod";
import { syncEntitySchema } from "../shared/contracts";
import { createAuthService } from "./auth-service";
import { D1AuthStore } from "./d1-auth-store";
import { D1SyncStore } from "./d1-sync-store";
import type { WorkerEnv } from "./env";
import { createSyncService } from "./sync-service";

const pushSchema = z.object({ changes: z.array(syncEntitySchema).max(500) });
const SESSION_COOKIE = "xiaohe_session";

export const syncRoutes = new Hono<{ Bindings: WorkerEnv }>();

async function currentUser(context: Parameters<typeof getCookie>[0]) {
  const token = getCookie(context, SESSION_COOKIE);
  if (!token) return null;
  return createAuthService(new D1AuthStore(context.env.DB)).getSession(token);
}

syncRoutes.get("/", async (context) => {
  const user = await currentUser(context);
  if (!user) return context.json({ error: { code: "UNAUTHORIZED", message: "请先登录" } }, 401);
  const since = Number(context.req.query("since") ?? 0);
  const result = await createSyncService(new D1SyncStore(context.env.DB)).pull(
    user.id,
    Number.isFinite(since) ? since : 0
  );
  return context.json(result);
});

syncRoutes.post("/push", async (context) => {
  const user = await currentUser(context);
  if (!user) return context.json({ error: { code: "UNAUTHORIZED", message: "请先登录" } }, 401);
  const parsed = pushSchema.safeParse(await context.req.json());
  if (!parsed.success) {
    return context.json({ error: { code: "INVALID_SYNC_DATA", message: "同步数据格式无效" } }, 400);
  }
  const service = createSyncService(new D1SyncStore(context.env.DB));
  const pushed = await service.push(user.id, parsed.data.changes);
  const pulled = await service.pull(user.id, 0);
  return context.json({ ...pushed, changes: pulled.changes, cursor: pulled.cursor });
});
