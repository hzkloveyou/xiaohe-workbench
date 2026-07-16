import { useCallback, useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { AccountMenu } from "../../features/auth/AccountMenu";
import { AuthDialog } from "../../features/auth/AuthDialog";
import { CustomizeDrawer } from "../../features/customize/CustomizeDrawer";
import { CommandPalette } from "../../features/command/CommandPalette";
import { buildCommands } from "../../features/command/command-model";
import { useCommandShortcut } from "../../features/command/useCommandShortcut";
import { Button } from "../../components/Button";
import { Toast } from "../../components/Toast";
import { useWorkspace } from "../workspace/workspace-context";

const APP_ROUTES = [
  { to: "/", label: "概览", icon: "⌂" },
  { to: "/collect", label: "收集", icon: "＋" },
  { to: "/today", label: "今日", icon: "✓" },
  { to: "/connect", label: "连接", icon: "◎" }
] as const;

function PageNavigation({ className = "" }: { className?: string }) {
  return (
    <nav className={`route-nav ${className}`.trim()} aria-label="主要页面">
      {APP_ROUTES.map((route) => (
        <NavLink
          key={route.to}
          to={route.to}
          end={route.to === "/"}
          className={({ isActive }) => `route-nav__link${isActive ? " is-active" : ""}`}
        >
          <span aria-hidden="true">{route.icon}</span>
          {route.label}
        </NavLink>
      ))}
    </nav>
  );
}

export function AppShell() {
  const workspace = useWorkspace();
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const openCommand = useCallback(() => setCommandOpen(true), []);
  useCommandShortcut(openCommand);
  const commands = useMemo(() => buildCommands({
    bookmarks: workspace.entities,
    navigate,
    openUrl: (url) => window.open(url, "_blank", "noopener,noreferrer"),
    setTheme: (theme) => void workspace.setTheme(theme)
  }), [navigate, workspace]);

  return (
    <div className="app-canvas routed-workbench">
      <div className="ambient ambient--one" /><div className="ambient ambient--two" /><div className="ambient ambient--three" />
      <header className="topbar">
        <NavLink className="brand" to="/" aria-label="小贺的工作台首页">
          <span className="brand__mark">贺</span>
          <span><strong>小贺的工作台</strong><small>MY DAILY SPACE</small></span>
        </NavLink>
        <PageNavigation className="route-nav--responsive" />
        <nav className="topbar__actions" aria-label="账户与设置">
          <Button className="command-button" variant="ghost" aria-label="打开全局指令中心" onClick={openCommand}>
            <span aria-hidden="true">⌘</span><span>指令</span><kbd>Ctrl K</kbd>
          </Button>
          <AccountMenu
            user={workspace.user}
            syncState={workspace.syncState}
            onLogin={() => setAuthOpen(true)}
            onLogout={() => void workspace.logout()}
          />
          <Button className="settings-button" variant="ghost" aria-label="打开个性化设置" onClick={() => setCustomizeOpen(true)}>⚙</Button>
        </nav>
      </header>
      <Outlet />
      <AuthDialog
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onAuthenticated={(user) => {
          workspace.setAuthenticatedUser(user);
          workspace.showToast("登录成功，正在同步");
        }}
      />
      <CommandPalette
        open={commandOpen}
        items={commands}
        onClose={() => setCommandOpen(false)}
        onWebSearch={(query) => {
          window.location.assign(`https://www.bing.com/search?q=${encodeURIComponent(query)}`);
        }}
        onQuickCapture={(query) => {
          setCommandOpen(false);
          navigate(`/collect?capture=${encodeURIComponent(query)}`);
        }}
      />
      {workspace.snapshot ? (
        <CustomizeDrawer
          open={customizeOpen}
          theme={workspace.snapshot.theme}
          visibility={workspace.visibility}
          snapshot={workspace.snapshot}
          onClose={() => setCustomizeOpen(false)}
          onThemeChange={(theme) => void workspace.setTheme(theme)}
          onVisibilityChange={workspace.setVisibility}
          onImport={(snapshot) => {
            void workspace.importSnapshot(snapshot).then(() => setCustomizeOpen(false));
          }}
          onError={workspace.showToast}
        />
      ) : null}
      <Toast message={workspace.toast} onClose={workspace.clearToast} />
    </div>
  );
}
