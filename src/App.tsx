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
import ClaudeMd from "./pages/ClaudeMd";
import Dashboard from "./pages/Dashboard";
import Diff from "./pages/Diff";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import ProjectView from "./pages/ProjectView";
import Projects from "./pages/Projects";
import SessionDetail from "./pages/SessionDetail";
import Sessions from "./pages/Sessions";
import Settings from "./pages/Settings";
import Skills from "./pages/Skills";
import Crons from "./pages/Crons";
import Inbox from "./pages/Inbox";
import Agent from "./pages/Agent";
import Status from "./pages/Status";

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
        path="/dashboard/sessions"
        element={
          <ProtectedRoute>
            <Sessions />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/sessions/:sessionId"
        element={
          <ProtectedRoute>
            <SessionDetail />
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
        path="/dashboard/claude-md"
        element={
          <ProtectedRoute>
            <ClaudeMd />
          </ProtectedRoute>
        }
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
        path="/dashboard/crons"
        element={
          <ProtectedRoute>
            <Crons />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/inbox"
        element={
          <ProtectedRoute>
            <Inbox />
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
        path="/dashboard/agent"
        element={
          <ProtectedRoute>
            <Agent />
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
