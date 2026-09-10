import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { RotateCw } from "lucide-react";

export class PanelErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-sm">
        <p>This view could not be displayed.</p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => this.setState({ failed: false })}
        >
          <RotateCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }
}
