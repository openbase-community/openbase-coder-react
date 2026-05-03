import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import UserProfile from "@/components/UserProfile";
import { usePluginRegistry } from "@/plugin-registry";
import { Activity, FileText, FolderOpen, Home, Inbox, MessageSquare, Server, Terminal, Wrench, Zap } from "lucide-react";
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

interface ExampleDashboardLayoutProps {
  children: React.ReactNode;
  noPadding?: boolean;
}

const ExampleDashboardLayout: React.FC<ExampleDashboardLayoutProps> = ({
  children,
  noPadding,
}) => {
  const { pluginConsolePages } = usePluginRegistry();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    {
      path: "/dashboard",
      icon: Home,
      title: "Dashboard",
      exact: true,
    },
    {
      path: "/dashboard/projects",
      icon: FolderOpen,
      title: "Projects",
    },
    {
      path: "/dashboard/sessions",
      icon: Terminal,
      title: "Sessions",
    },
    {
      path: "/dashboard/claude-md",
      icon: FileText,
      title: "CLAUDE.md",
    },
    {
      path: "/dashboard/skills",
      icon: Zap,
      title: "Skills",
    },
    {
      path: "/dashboard/inbox",
      icon: Inbox,
      title: "Inbox",
    },
    {
      path: "/dashboard/agent",
      icon: MessageSquare,
      title: "Agent",
    },
    {
      path: "/dashboard/status",
      icon: Activity,
      title: "Status",
    },
    {
      path: "/dashboard/tools",
      icon: Wrench,
      title: "Tools",
    },
    {
      path: "/dashboard/launchctl",
      icon: Server,
      title: "Launchctl",
    },
    ...pluginConsolePages
      .filter((page) => page.sidebar)
      .map((page) => ({
        path: page.route,
        icon: Zap,
        title: page.title,
      })),
  ];

  return (
    <SidebarProvider>
      <div className={`flex w-full bg-slate-100 ${noPadding ? "h-screen" : "min-h-screen"}`}>
        <Sidebar className="border-r border-slate-200/80 bg-white/90 backdrop-blur">
          <SidebarHeader className="border-b border-slate-200/80 px-5 py-5">
            <div className="flex items-center justify-start">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Local Workspace
                </p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                  Openbase Coder
                </h1>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup className="px-3 py-4">
              <SidebarGroupLabel className="px-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Navigation
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => {
                    const isActive = item.exact
                      ? location.pathname === item.path
                      : location.pathname.startsWith(item.path);
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => navigate(item.path)}
                          tooltip={item.title}
                          className="h-11 rounded-xl px-3 text-[15px] font-medium text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900 data-[active=true]:bg-slate-900 data-[active=true]:text-white data-[active=true]:shadow-sm"
                        >
                          <item.icon />
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <div className={`flex-1 flex flex-col ${noPadding ? "overflow-hidden" : "overflow-auto"}`}>
          <header className="sticky top-0 z-10 flex h-20 shrink-0 items-center border-b border-slate-200/80 bg-white/88 px-8 shadow-sm backdrop-blur">
            <div className="flex flex-1 items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Console
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                Openbase Coder Console
                </h2>
              </div>
              <div className="flex items-center space-x-1">
                <UserProfile />
              </div>
            </div>
          </header>
          <main className={`w-full ${noPadding ? "flex-1 min-h-0" : "p-8"}`}>{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default ExampleDashboardLayout;
