import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
} from "react";
import { createPortal } from "react-dom";
import { Router } from "react-router-dom";
import { Layout, TabNode, TabSetNode } from "flexlayout-react";
import { Maximize2, Minimize2, Pin, X } from "lucide-react";
import { useWorkspace, WorkspacePanelContext } from "@/contexts/workspace-tabs";
import { WorkspaceToolbar } from "./WorkspaceToolbar";
import { confirmDiscardDrafts, showWorkspaceTabMenu } from "./WorkspaceTabMenu";
import { PanelErrorBoundary } from "./PanelErrorBoundary";
import { getRouterBasename, getRuntimeShell } from "@/lib/runtime-config";
import { workspaceItemHref } from "@/lib/workspace/urls";
import "flexlayout-react/style/light.css";
import "./workspace.css";

function WorkspacePanel({
  node,
  Content,
}: {
  node: TabNode;
  Content: ComponentType;
}) {
  const { controller } = useWorkspace();
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const runtime = controller.runtime(node.getId());
  const navigator = useMemo(
    () => ({
      ...runtime.history,
      createHref: (to: Parameters<typeof runtime.history.createHref>[0]) =>
        workspaceItemHref(
          runtime.history.createHref(to),
          getRouterBasename(),
          getRuntimeShell(),
        ),
    }),
    [runtime.history],
  );
  const focus = () => controller.focus(node.getId());
  const focused = controller.focused?.getId() === node.getId();
  return (
    <WorkspacePanelContext.Provider value={{ id: node.getId(), root }}>
      <div
        ref={setRoot}
        data-workspace-panel={node.getId()}
        data-focused={focused}
        className="workspace-panel"
        onPointerDownCapture={focus}
        onFocusCapture={focus}
      >
        <Router location={runtime.history.location} navigator={navigator}>
          <PanelErrorBoundary key={runtime.history.location.pathname}>
            <Content />
          </PanelErrorBoundary>
        </Router>
      </div>
    </WorkspacePanelContext.Provider>
  );
}

export function WorkspaceSurface({
  components,
}: {
  components: Record<string, ComponentType>;
}) {
  const { controller, host } = useWorkspace();
  useEffect(() => {
    if (!host) return;
    const update = () => controller.setCompact(host.clientWidth < 640);
    const observer = new ResizeObserver(update);
    observer.observe(host);
    update();
    return () => observer.disconnect();
  }, [controller, host]);
  const factory = useCallback(
    (node: TabNode) => {
      const Content = components[node.getComponent()];
      return Content ? (
        <WorkspacePanel node={node} Content={Content} />
      ) : (
        <div>Unavailable view</div>
      );
    },
    [components],
  );
  if (!host) return null;
  // The portal is a sibling of the browser router in the React tree. Each panel
  // has an independent router, while sharing auth and backend services.
  return createPortal(
    <div className="workspace-surface">
      <Layout
        model={controller.model}
        factory={factory}
        supportsPopout={false}
        realtimeResize
        invalidateTabContentOnParentRender={false}
        onAction={(action) =>
          controller.allowAction(action, confirmDiscardDrafts)
        }
        onContextMenu={(node, event) =>
          showWorkspaceTabMenu(node, event, controller)
        }
        onRenderTab={(node, values) => {
          if (controller.hasDrafts(node.getId()))
            values.leading = (
              <span
                title="Unfinished text"
                className="mr-1 block h-1.5 w-1.5 rounded-full bg-warning"
              />
            );
        }}
        icons={{
          close: <X size={13} />,
          maximize: <Maximize2 size={13} />,
          restore: <Minimize2 size={13} />,
          pin: <Pin size={13} />,
        }}
        onRenderTabSet={(node, values) => {
          if (node instanceof TabSetNode)
            values.stickyButtons.push(
              <WorkspaceToolbar
                key="workspace"
                tabId={(node.getSelectedNode() as TabNode | undefined)?.getId()}
                compact
              />,
            );
        }}
        onAuxMouseClick={(node, event) => {
          if (event.button === 1 && node instanceof TabNode)
            controller.close(node.getId(), confirmDiscardDrafts);
        }}
      />
    </div>,
    host,
  );
}
