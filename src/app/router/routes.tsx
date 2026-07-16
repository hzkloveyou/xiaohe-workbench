import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import OverviewPage from "../../pages/OverviewPage";
import { AppShell } from "./AppShell";

const CollectPage = lazy(() => import("../../pages/CollectPage"));
const TodayPage = lazy(() => import("../../pages/TodayPage"));
const ConnectPage = lazy(() => import("../../pages/ConnectPage"));

export function AppRoutes() {
  return (
    <Suspense fallback={<div className="loading-card" role="status"><span />正在打开工作台…</div>}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<OverviewPage />} />
          <Route path="collect" element={<CollectPage />} />
          <Route path="today" element={<TodayPage />} />
          <Route path="connect" element={<ConnectPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
