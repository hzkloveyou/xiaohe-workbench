import { Hono } from "hono";
import { authRoutes } from "./auth";
import { allowedOrigins, type WorkerEnv } from "./env";
import { isAllowedOrigin } from "./security";
import { syncRoutes } from "./sync";

const app = new Hono<{ Bindings: WorkerEnv }>();

app.use("/v1/*", async (context, next) => {
  const origin = context.req.header("Origin") ?? null;
  if (!isAllowedOrigin(origin, allowedOrigins(context.env))) {
    return context.json({ error: { code: "ORIGIN_REJECTED", message: "请求来源无效" } }, 403);
  }
  context.header("Access-Control-Allow-Origin", origin!);
  context.header("Access-Control-Allow-Credentials", "true");
  context.header("Vary", "Origin");
  if (context.req.method === "OPTIONS") {
    context.header("Access-Control-Allow-Headers", "Content-Type");
    context.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    return context.body(null, 204);
  }
  await next();
});

app.get("/health", (context) => context.json({ ok: true, service: "xiaohe-workbench-api" }));
app.route("/v1/auth", authRoutes);
app.route("/v1/sync", syncRoutes);

export default app;
