import React from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  resetKeys?: unknown[];
  onError?: (error: Error, info: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
    this.props.onError?.(error, info);
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && this.props.resetKeys) {
      const changed = this.props.resetKeys.some(
        (key, i) => key !== prevProps.resetKeys?.[i],
      );
      if (changed) {
        this.setState({ hasError: false, error: null });
      }
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
          <div className="w-full max-w-md text-center">
            <div className="rounded-xl border border-red-200 bg-white p-8 shadow-sm">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-stone-900">
                予期しないエラーが発生しました
              </h2>
              <p className="mt-2 text-sm text-stone-500">
                {this.state.error?.message ?? "不明なエラー"}
              </p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-pink-600 px-4 py-2 text-sm font-medium text-white hover:bg-pink-700 transition-colors"
                  onClick={this.handleRetry}
                >
                  再試行
                </button>
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
                  onClick={() => window.location.reload()}
                >
                  ページを再読込
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
