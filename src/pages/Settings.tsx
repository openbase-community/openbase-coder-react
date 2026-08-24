import DashboardLayout from "@/components/layouts/DashboardLayout";
import { getRuntimeShell } from "@/lib/runtime-config";
import {
  Bot,
  Cog,
  Radio,
  Settings2,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import React, { useState, type ReactNode } from "react";
import { AuthenticationSettings } from "./settings/AuthenticationSettings";
import { BackendModelSettings } from "./settings/BackendModelSettings";
import { CodingBackendSettings } from "./settings/CodingBackendSettings";
import { DangerousConfirmationSettings } from "./settings/DangerousConfirmationSettings";
import { DispatcherVoiceSettings } from "./settings/DispatcherVoiceSettings";
import { EnvSettings } from "./settings/EnvSettings";
import { IgnoredLaunchctlSettings } from "./settings/IgnoredLaunchctlSettings";
import { LiveKitCompanionSettings } from "./settings/LiveKitCompanionSettings";
import { OpenbaseServicesSettings } from "./settings/OpenbaseServicesSettings";
import { ReasoningSettings } from "./settings/ReasoningSettings";
import { ServiceTierSettings } from "./settings/ServiceTierSettings";
import { SidebarItemsSettings } from "./settings/SidebarItemsSettings";
import { useOpenbaseServices } from "./settings/useOpenbaseServices";

type SettingsSectionId =
  | "general"
  | "agents"
  | "voice"
  | "safety"
  | "advanced";

const SETTINGS_SECTIONS: Array<{
  id: SettingsSectionId;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  { id: "general", label: "General", description: "Services and account", icon: Cog },
  { id: "agents", label: "Agents", description: "Backend and model", icon: Bot },
  { id: "voice", label: "Voice", description: "Dispatch and sharing", icon: Radio },
  {
    id: "safety",
    label: "Safety",
    description: "Command confirmation",
    icon: ShieldCheck,
  },
  {
    id: "advanced",
    label: "Advanced",
    description: "Environment and tools",
    icon: Settings2,
  },
];

const Settings: React.FC = () => {
  const openbaseServices = useOpenbaseServices();
  const [section, setSection] = useState<SettingsSectionId>("general");
  const isNativeShell = getRuntimeShell() === "electron";

  const sectionContent: Record<SettingsSectionId, ReactNode> = {
    general: (
      <>
        <OpenbaseServicesSettings controller={openbaseServices} />
        <AuthenticationSettings />
      </>
    ),
    agents: (
      <>
        <CodingBackendSettings
          onRestartScheduled={openbaseServices.applyRestartResponse}
        />
        <BackendModelSettings />
        <ServiceTierSettings
          onRestartScheduled={openbaseServices.applyRestartResponse}
        />
        <ReasoningSettings />
      </>
    ),
    voice: (
      <>
        {isNativeShell ? <LiveKitCompanionSettings /> : null}
        <DispatcherVoiceSettings
          onRestartScheduled={openbaseServices.applyRestartResponse}
        />
      </>
    ),
    safety: <DangerousConfirmationSettings />,
    advanced: (
      <>
        <SidebarItemsSettings />
        <IgnoredLaunchctlSettings />
        <EnvSettings />
      </>
    ),
  };

  const activeSection = SETTINGS_SECTIONS.find((item) => item.id === section)!;

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Settings
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Configure this machine, choose how agents work, and control what
            requires approval.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-16 lg:self-start">
            <nav
              aria-label="Settings categories"
              className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0"
            >
              {SETTINGS_SECTIONS.map((item) => {
                const isCurrent = section === item.id;
                return (
                  <button
                    aria-current={isCurrent ? "page" : undefined}
                    className={`group flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-left transition-colors lg:w-full ${
                      isCurrent
                        ? "bg-surface text-primary shadow-sm ring-1 ring-border"
                        : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                    }`}
                    key={item.id}
                    onClick={() => setSection(item.id)}
                    type="button"
                  >
                    <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.9} />
                    <span className="min-w-0">
                      <span className="block text-[13px] font-medium">
                        {item.label}
                      </span>
                      <span className="hidden truncate text-[11px] font-normal opacity-70 lg:block">
                        {item.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <section className="min-w-0" key={section}>
            <div className="mb-4 border-b border-border pb-3">
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                {activeSection.label}
              </h2>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                {activeSection.description}
              </p>
            </div>
            <div className="space-y-4">{sectionContent[section]}</div>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
