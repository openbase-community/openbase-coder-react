import { useLayoutEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useWorkspace } from "@/contexts/workspace-tabs";
import { validPanelPath } from "@/lib/workspace/layout-storage";

/** Browser history describes the focused resource, never the docking tree. */
export function WorkspaceUrlBridge() {
  const { controller } = useWorkspace();
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname + location.search + location.hash;
  const lastLocation = useRef<string>();
  useLayoutEffect(() => {
    if (lastLocation.current !== location.key) {
      lastLocation.current = location.key;
      if (validPanelPath(path) && path !== controller.path) {
        controller.navigate(path, undefined, true);
      }
    }
    if (path !== controller.path)
      navigate(controller.path, { replace: controller.urlChange !== "push" });
  }, [controller, controller.getSnapshot(), location.key, navigate, path]);
  return null;
}
