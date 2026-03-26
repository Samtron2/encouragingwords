import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
          <h1 className="font-display text-4xl font-bold text-primary mb-4">
            Something went wrong
          </h1>
          <p className="text-muted-foreground text-lg mb-8">
            An unexpected error occurred. Please try reloading.
          </p>
          <Button onClick={() => window.location.reload()}>Reload app</Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
