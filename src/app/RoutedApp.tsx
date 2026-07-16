import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./router/routes";
import { WorkspaceProvider } from "./workspace/WorkspaceProvider";

export function RoutedApp() {
  return <BrowserRouter><WorkspaceProvider><AppRoutes /></WorkspaceProvider></BrowserRouter>;
}
