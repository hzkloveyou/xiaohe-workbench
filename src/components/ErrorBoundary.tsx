import { Component, type ErrorInfo, type ReactNode } from "react";

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("workbench render failed", error, info.componentStack); }
  render() {
    if (this.state.failed) return <main className="fatal-error"><h1>工作台暂时没有打开</h1><p>你的本地数据仍然安全，请刷新页面重试。</p><button type="button" onClick={() => location.reload()}>刷新页面</button></main>;
    return this.props.children;
  }
}
