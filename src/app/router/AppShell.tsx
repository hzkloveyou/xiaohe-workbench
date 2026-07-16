import { NavLink, Outlet } from "react-router-dom";

export const APP_ROUTES = [
  { to: "/", label: "概览", icon: "⌂" },
  { to: "/collect", label: "收集", icon: "＋" },
  { to: "/today", label: "今日", icon: "✓" },
  { to: "/connect", label: "连接", icon: "◎" }
] as const;

export function AppShell() {
  return (
    <div className="routed-workbench">
      <nav className="route-nav" aria-label="主要页面">
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
      <Outlet />
    </div>
  );
}
