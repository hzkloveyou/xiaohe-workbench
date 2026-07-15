import { useState, type FormEvent } from "react";
import { Button } from "../../components/Button";
import { Dialog } from "../../components/Dialog";
import { authApi, type AuthResult, type AuthUser } from "./auth-api";

export interface AuthClient {
  login(username: string, password: string): Promise<AuthResult>;
  register(username: string, password: string): Promise<AuthResult>;
  recover(username: string, recoveryCode: string, newPassword: string): Promise<AuthResult>;
  logout(): Promise<void>;
  session(): Promise<{ user: AuthUser | null }>;
}

interface AuthDialogProps {
  open: boolean;
  client?: AuthClient;
  onClose: () => void;
  onAuthenticated: (user: AuthUser) => void;
}

type AuthMode = "login" | "register" | "recover";

export function AuthDialog({ open, client = authApi, onClose, onAuthenticated }: AuthDialogProps) {
  if (!open) return null;
  return <AuthDialogForm client={client} onClose={onClose} onAuthenticated={onAuthenticated} />;
}

function AuthDialogForm({ client, onClose, onAuthenticated }: Omit<AuthDialogProps, "open" | "client"> & { client: AuthClient }) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [newRecoveryCode, setNewRecoveryCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [registeredUser, setRegisteredUser] = useState<AuthUser | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const result = mode === "login"
        ? await client.login(username, password)
        : mode === "register"
          ? await client.register(username, password)
          : await client.recover(username, recoveryCode, password);
      if (result.recoveryCode) {
        setNewRecoveryCode(result.recoveryCode);
        setRegisteredUser(result.user);
      } else {
        onAuthenticated(result.user);
        onClose();
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "操作失败，请稍后重试");
    } finally {
      setPending(false);
    }
  };

  if (newRecoveryCode && registeredUser) {
    return (
      <Dialog open title="保存恢复码" onClose={() => undefined}>
        <div className="recovery-panel">
          <div className="recovery-panel__icon" aria-hidden="true">✓</div>
          <p>这是找回账户的唯一凭证，<strong>只显示这一次</strong>。请保存到安全的地方。</p>
          <output className="recovery-code" aria-label="账户恢复码">{newRecoveryCode}</output>
          <Button variant="primary" onClick={() => { onAuthenticated(registeredUser); onClose(); }}>我已保存，开始使用</Button>
        </div>
      </Dialog>
    );
  }

  const labels = { login: "登录并同步", register: "创建账户", recover: "恢复账户" } as const;
  return (
    <Dialog open title="云端同步" onClose={onClose}>
      <p className="dialog-intro">游客模式可以使用全部功能；登录后，书签与专注内容会安全同步到其他设备。</p>
      <div className="auth-tabs" role="tablist" aria-label="账户操作">
        {(["login", "register", "recover"] as const).map((item) => <button key={item} type="button" role="tab" aria-selected={mode === item} onClick={() => { setMode(item); setError(""); }}>{item === "login" ? "登录" : item === "register" ? "注册" : "找回"}</button>)}
      </div>
      <form className="stack-form" onSubmit={submit}>
        <label>用户名<input aria-label="用户名" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} minLength={3} maxLength={32} required /></label>
        {mode === "recover" ? <label>恢复码<input aria-label="恢复码" value={recoveryCode} onChange={(event) => setRecoveryCode(event.target.value)} required /></label> : null}
        <label>{mode === "recover" ? "新密码" : "密码"}<input aria-label="密码" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={12} required /></label>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <Button variant="primary" type="submit" disabled={pending}>{pending ? (mode === "register" ? "正在创建…" : "正在处理…") : labels[mode]}</Button>
      </form>
    </Dialog>
  );
}
