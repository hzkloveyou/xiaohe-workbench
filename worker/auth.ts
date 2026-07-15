import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { AuthError, createAuthService } from "./auth-service";
import { D1AuthStore } from "./d1-auth-store";
import type { WorkerEnv } from "./env";

const SESSION_COOKIE = "xiaohe_session";

function setSessionCookie(context: Parameters<typeof setCookie>[0], token: string) {
  setCookie(context, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "Strict",
    path: "/",
    maxAge: 30 * 24 * 60 * 60
  });
}

export const authRoutes = new Hono<{ Bindings: WorkerEnv }>();

authRoutes.onError((error, context) => {
  if (error instanceof AuthError) {
    return context.json({ error: { code: error.code, message: error.message } }, error.status);
  }
  console.error("auth request failed", { name: error.name });
  return context.json({ error: { code: "INTERNAL_ERROR", message: "服务暂时不可用" } }, 500);
});

authRoutes.post("/register", async (context) => {
  const body = await context.req.json<{ username: string; password: string }>();
  const result = await createAuthService(new D1AuthStore(context.env.DB)).register(body.username, body.password);
  setSessionCookie(context, result.sessionToken);
  return context.json({ user: result.user, recoveryCode: result.recoveryCode }, 201);
});

authRoutes.post("/login", async (context) => {
  const body = await context.req.json<{ username: string; password: string }>();
  const ipAddress = context.req.header("CF-Connecting-IP") ?? "unknown";
  const result = await createAuthService(new D1AuthStore(context.env.DB)).login(
    body.username,
    body.password,
    ipAddress
  );
  setSessionCookie(context, result.sessionToken);
  return context.json({ user: result.user });
});

authRoutes.post("/recover", async (context) => {
  const body = await context.req.json<{ username: string; recoveryCode: string; newPassword: string }>();
  const result = await createAuthService(new D1AuthStore(context.env.DB)).recover(
    body.username,
    body.recoveryCode,
    body.newPassword
  );
  setSessionCookie(context, result.sessionToken);
  return context.json({ user: result.user, recoveryCode: result.recoveryCode });
});

authRoutes.post("/logout", async (context) => {
  const token = getCookie(context, SESSION_COOKIE);
  if (token) await createAuthService(new D1AuthStore(context.env.DB)).logout(token);
  deleteCookie(context, SESSION_COOKIE, { path: "/", secure: true });
  return context.body(null, 204);
});

authRoutes.get("/session", async (context) => {
  const token = getCookie(context, SESSION_COOKIE);
  if (!token) return context.json({ user: null });
  const user = await createAuthService(new D1AuthStore(context.env.DB)).getSession(token);
  return context.json({ user });
});
