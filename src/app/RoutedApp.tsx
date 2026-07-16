import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./router/routes";

export function RoutedApp() {
  return <BrowserRouter><AppRoutes /></BrowserRouter>;
}
