const encoder = new TextEncoder();
const PASSWORD_PROOF_VERSION = "xiaohe-workbench:password:v1";

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

export async function derivePasswordProof(
  usernameInput: string,
  password: string,
  iterations = 310_000
): Promise<string> {
  if (password.length < 12 || password.length > 200) {
    throw new Error("密码长度需要在 12–200 个字符之间");
  }
  const username = usernameInput.trim().toLocaleLowerCase("zh-CN");
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, [
    "deriveBits"
  ]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: toArrayBuffer(encoder.encode(`${PASSWORD_PROOF_VERSION}:${username}`)),
      iterations
    },
    key,
    256
  );
  return toBase64Url(new Uint8Array(bits));
}
