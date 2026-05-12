import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[GlobalErrorBoundary] Uncaught error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleHome = () => {
    window.location.href = `${basePath}/`;
  };

  handleSupport = () => {
    // Open support page or contact form
    window.location.href = `${basePath}/support`;
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="relative min-h-screen flex items-center justify-center px-4 py-12 overflow-hidden"
          style={{ backgroundColor: "hsl(var(--landing-cream))" }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -top-40 -left-40 h-[28rem] w-[28rem] rounded-full blur-3xl"
            style={{ backgroundColor: "hsl(var(--landing-amber) / 0.18)" }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-40 -right-40 h-[32rem] w-[32rem] rounded-full blur-3xl"
            style={{ backgroundColor: "hsl(var(--primary) / 0.07)" }}
          />
          <div className="relative z-10 w-full max-w-md flex flex-col items-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/80 backdrop-blur px-3.5 py-1.5 text-[11px] font-medium text-foreground/70 shadow-sm ring-1 ring-black/[0.04] mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Unexpected hiccup
            </span>
            <h1 className="font-serif text-4xl sm:text-5xl font-normal leading-[1.05] tracking-[-0.02em] text-foreground text-center">
              Something{" "}
              <span className="italic text-primary">went sideways</span>
            </h1>
            <p className="mt-4 max-w-sm text-center text-foreground/60 text-sm sm:text-base leading-relaxed">
              An unexpected error tripped us up. Your data is safe — give the page a reload and you should be right back to it.
            </p>
            <div className="mt-10 w-full flex flex-col items-center gap-3">
              <button
                onClick={this.handleReload}
                className="inline-flex h-11 items-center justify-center rounded-full bg-foreground px-6 text-sm font-medium text-background shadow-sm transition-colors hover:bg-foreground/90 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 w-full sm:w-auto sm:min-w-[220px]"
              >
                Reload page
              </button>
              <div className="flex gap-2 flex-wrap justify-center">
                <button
                  onClick={this.handleHome}
                  className="inline-flex h-11 items-center justify-center rounded-full px-6 text-sm font-medium text-foreground/70 transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2"
                >
                  Back to home
                </button>
                <button
                  onClick={this.handleSupport}
                  className="inline-flex h-11 items-center justify-center rounded-full px-6 text-sm font-medium text-foreground/70 transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2"
                >
                  Contact support
                </button>
              </div>
            </div>
            {import.meta.env.DEV && this.state.error && (
              <details className="text-left mt-8 w-full p-4 rounded-2xl bg-white/70 backdrop-blur ring-1 ring-black/[0.04] text-sm">
                <summary className="cursor-pointer font-medium text-foreground/70">
                  Error details
                </summary>
                <pre className="mt-2 whitespace-pre-wrap text-destructive text-xs overflow-auto max-h-48">
                  {this.state.error.message}
                  {'\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
