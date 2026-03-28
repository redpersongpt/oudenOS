import { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 px-8 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10">
            <AlertTriangle className="h-6 w-6 text-red-400" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink-secondary">Something went wrong</p>
            <p className="mt-1 max-w-xs text-xs text-ink-tertiary">
              {this.state.error?.message ?? "An unexpected error occurred in this page."}
            </p>
          </div>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-overlay px-3 py-1.5 text-xs font-medium text-ink-secondary transition-colors hover:bg-surface"
          >
            <RefreshCw className="h-3 w-3" />
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
