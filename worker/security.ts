const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

export function randomToken(byteLength = 32): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(byteLength)));
}

export async function derivePassword(
  password: string,
  salt: string,
  iterations = 310_000
): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, [
    "deriveBits"
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: toArrayBuffer(fromBase64Url(salt)), iterations },
    key,
    256
  );
  return toBase64Url(new Uint8Array(bits));
}

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(token));
  return toBase64Url(new Uint8Array(digest));
}

export function isAllowedOrigin(origin: string | null, allowedOrigins: string[]): boolean {
  return Boolean(origin && allowedOrigins.includes(origin));
}

export function normalizeUsername(value: string): string {
  const username = value.trim().toLocaleLowerCase("zh-CN");
  if (!/^[\p{L}\p{N}_-]{3,32}$/u.test(username)) {
    throw new Error("用户名需为 3–32 个字母、数字、下划线或连字符");
  }
  return username;
}
