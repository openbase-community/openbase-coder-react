import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/contexts/auth";
import { getRuntimeShell } from "@/lib/runtime-config";
import { usePluginRegistry } from "@/plugin-registry";
import type { PluginConsolePage } from "@/types/plugins";
import {
  HashRouter,
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
  useSearchParams,
} from "react-router-dom";
import AgentsMd from "./pages/AgentsMd";
import ApprovalRequests from "./pages/ApprovalRequests";
import BoilerSync from "./pages/BoilerSync";
import Dashboard from "./pages/Dashboard";
import DispatchChat from "./pages/DispatchChat";
import Reports from "./pages/Reports";
import Diff from "./pages/Diff";
import Devices from "./pages/Devices";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import ProjectDetail from "./pages/ProjectDetail";
import ProjectView from "./pages/ProjectView";
import Projects from "./pages/Projects";
import Routines from "./pages/Routines";
import SessionDetail from "./pages/SessionDetail";
import Sessions from "./pages/Sessions";
import Settings from "./pages/Settings";
import Skills from "./pages/Skills";
import ThreadSyncConflicts from "./pages/ThreadSyncConflicts";
import Launchctl from "./pages/Launchctl";
import Status from "./pages/Status";
import ToolDetail from "./pages/ToolDetail";
import Tools from "./pages/Tools";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AnonymousRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function PluginConsoleRoute({
  page,
}: {
  page: PluginConsolePage;
}) {
  const [searchParams] = useSearchParams();
  const projectPath = searchParams.get("path") || undefined;
  const stack = searchParams.get("stack") || undefined;
  if (page.render === "iframe" && page.iframeUrl) {
    const url = new URL(page.iframeUrl, window.location.origin);
    if (projectPath) {
      url.searchParams.set("projectPath", projectPath);
    }
    if (stack) {
      url.searchParams.set("stack", stack);
    }
    url.searchParams.set("pluginId", page.pluginId);
    return (
      <iframe
        title={page.title}
        src={`${url.pathname}${url.search}`}
        className="h-screen w-full border-0"
      />
    );
  }

  if (!page.component) {
    return <NotFound />;
  }

  const Component = page.component;
  return (
    <Component
      projectPath={projectPath}
      stack={stack}
      pluginId={page.pluginId}
    />
  );
}

function AppRoutes() {
  const { pluginConsolePages } = usePluginRegistry();

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="/login"
        element={
          <AnonymousRoute>
            <Login />
          </AnonymousRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/projects"
        element={
          <ProtectedRoute>
            <Projects />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/project-view"
        element={
          <ProtectedRoute>
            <ProjectView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/project"
        element={
          <ProtectedRoute>
            <ProjectDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/reports"
        element={
          <ProtectedRoute>
            <Reports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/dispatch"
        element={
          <ProtectedRoute>
            <DispatchChat />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/threads"
        element={
          <ProtectedRoute>
            <Sessions />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/threads/sync-conflicts"
        element={
          <ProtectedRoute>
            <ThreadSyncConflicts />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/threads/:threadId"
        element={
          <ProtectedRoute>
            <SessionDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/approvals"
        element={
          <ProtectedRoute>
            <ApprovalRequests />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/routines"
        element={
          <ProtectedRoute>
            <Routines />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/diff"
        element={<Diff />}
      />
      <Route
        path="/mobile/diff"
        element={<Navigate to="/dashboard/diff?mobile=true" replace />}
      />
      <Route
        path="/dashboard/skills"
        element={
          <ProtectedRoute>
            <Skills />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/boilersync"
        element={
          <ProtectedRoute>
            <BoilerSync />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/status"
        element={
          <ProtectedRoute>
            <Status />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/devices"
        element={
          <ProtectedRoute>
            <Devices />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/instructions"
        element={
          <ProtectedRoute>
            <AgentsMd />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/agents-md"
        element={<Navigate to="/dashboard/instructions" replace />}
      />
      <Route
        path="/dashboard/tools"
        element={
          <ProtectedRoute>
            <Tools />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/tools/:toolName"
        element={
          <ProtectedRoute>
            <ToolDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/launchctl"
        element={
          <ProtectedRoute>
            <Launchctl />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/launchctl/:serviceLabel"
        element={
          <ProtectedRoute>
            <Launchctl />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      {pluginConsolePages.map((page) => (
        <Route
          key={`${page.pluginId}:${page.key}`}
          path={page.route}
          element={
            <ProtectedRoute>
              <PluginConsoleRoute page={page} />
            </ProtectedRoute>
          }
        />
      ))}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  const RouterComponent = getRuntimeShell() === "electron" ? HashRouter : Router;

  return (
    <RouterComponent>
      <AuthProvider>
        <AppRoutes />
        <Toaster />
      </AuthProvider>
    </RouterComponent>
  );
}

export default App;
