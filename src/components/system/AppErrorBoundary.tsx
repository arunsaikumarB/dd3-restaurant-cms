import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

const RELOAD_FLAG_KEY = "dd-chunk-reload-attempted";

/** True for the "module fetch failed" errors thrown when a lazy-loaded
 * chunk can't be found — typically because the browser/CDN briefly served
 * an HTML shell referencing chunk hashes from a since-replaced deploy. */
function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /ChunkLoadError/i.test(message)
  );
}

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    if (isChunkLoadError(error)) {
      // Only auto-reload once per session to avoid a refresh loop if the
      // deploy is genuinely broken rather than just momentarily stale.
      const alreadyAttempted = window.sessionStorage.getItem(RELOAD_FLAG_KEY);
      if (!alreadyAttempted) {
        window.sessionStorage.setItem(RELOAD_FLAG_KEY, "1");
        window.location.reload();
        return;
      }
    }
    // eslint-disable-next-line no-console
    console.error("Unhandled error in app tree:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-cocoa px-6 text-center text-white">
          <p className="font-serif text-2xl font-semibold">Something went wrong loading this page.</p>
          <p className="text-sm text-white/70">
            This usually clears up with a refresh — sorry about that.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-md bg-saffron px-5 py-2 font-semibold text-cocoa"
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}