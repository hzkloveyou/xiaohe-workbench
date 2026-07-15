import { Button } from "../../components/Button";
import { SyncStatus } from "../../components/SyncStatus";
import type { SyncState } from "../../lib/sync/engine";
import type { AuthUser } from "./auth-api";

interface AccountMenuProps {
  user: AuthUser | null;
  syncState: SyncState;
  onLogin: () => void;
  onLogout: () => void;
}

export function AccountMenu({ user, syncState, onLogin, onLogout }: AccountMenuProps) {
  return user ? (
    <div className="account-menu"><span className="avatar" aria-hidden="true">{Array.from(user.username)[0]?.toUpperCase()}</span><div><strong>{user.username}</strong><SyncStatus state={syncState} /></div><Button variant="ghost" onClick={onLogout}>退出</Button></div>
  ) : <Button className="account-button" onClick={onLogin}><span aria-hidden="true">☁</span> 登录同步</Button>;
}
