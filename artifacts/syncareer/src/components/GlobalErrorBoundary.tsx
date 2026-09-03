import { Component, ErrorInfo, ReactNode } from 'react';
import { MessageScreen } from '@/components/layout/MessageScreen';
import { Button } from '@/components/ui/button';

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
        <MessageScreen
          as="div"
          role="alert"
          eyebrow="Unexpected error"
          title="Something went wrong"
          description="An unexpected error tripped us up. Your data is safe — give the page a reload and you should be right back to it."
          actions={
            <>
              <Button onClick={this.handleReload}>Reload page</Button>
              <Button variant="outline" onClick={this.handleHome}>
                Back to home
              </Button>
              <Button variant="ghost" onClick={this.handleSupport}>
                Contact support
              </Button>
            </>
          }
        >
          {import.meta.env.DEV && this.state.error && (
            <details className="surface-content mt-8 w-full p-4 text-left">
              <summary className="type-label cursor-pointer text-foreground">Error details</summary>
              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs text-destructive">
                {this.state.error.message}
                {'\n'}
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </MessageScreen>
      );
    }
    return this.props.children;
  }
}
