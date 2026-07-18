import DashboardLayout from "@/components/layouts/DashboardLayout";
import { getRuntimeShell } from "@/lib/runtime-config";
import {
  Bot,
  ChevronRight,
  Cog,
  Radio,
  Settings2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import React, { useState, type ReactNode } from "react";
import { AuthenticationSettings } from "./settings/AuthenticationSettings";
import { AgentsGenerationSettings } from "./settings/AgentsGenerationSettings";
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

type SettingsSection =
  | "general"
  | "agents"
  | "voice"
  | "automation"
  | "safety"
  | "advanced";

const DESKTOP_SECTIONS: Array<{
  id: SettingsSection;
  label: string;
  description: string;
  icon: typeof Cog;
}> = [
  { id: "general", label: "General", description: "Services and account", icon: Cog },
  { id: "agents", label: "Agents", description: "Backend and model", icon: Bot },
  { id: "voice", label: "Voice", description: "Dispatch and sharing", icon: Radio },
  { id: "automation", label: "Automation", description: "Generated instructions", icon: Sparkles },
  { id: "safety", label: "Safety", description: "Command confirmation", icon: ShieldCheck },
  { id: "advanced", label: "Advanced", description: "Environment and tools", icon: Settings2 },
];

const Settings: React.FC = () => {
  const openbaseServices = useOpenbaseServices();
  const [desktopSection, setDesktopSection] = useState<SettingsSection>("general");
  const isDesktop = getRuntimeShell() === "electron";

  if (isDesktop) {
    const sectionContent: Record<SettingsSection, ReactNode> = {
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
          <LiveKitCompanionSettings />
          <DispatcherVoiceSettings onRestartScheduled={openbaseServices.applyRestartResponse} />
        </>
      ),
      automation: <AgentsGenerationSettings />,
      safety: <DangerousConfirmationSettings />,
      advanced: (
        <>
          <SidebarItemsSettings />
          <IgnoredLaunchctlSettings />
          <EnvSettings />
        </>
      ),
    };
    const activeSection = DESKTOP_SECTIONS.find((section) => section.id === desktopSection)!;

    return (
      <DashboardLayout>
        <div className="ob-settings-page space-y-6">
          <div>
            <p className="text-[12px] font-semibold tracking-[0.04em] text-primary">Openbase preferences</p>
            <h1 className="mt-2 text-[32px] font-semibold leading-none tracking-[-0.045em] text-foreground">Settings</h1>
            <p className="mt-3 max-w-2xl text-[15px] leading-6 text-muted-foreground">
              Configure this Mac, choose how agents work, and control what requires approval.
            </p>
          </div>

          <div className="ob-settings-layout grid min-h-[600px] overflow-hidden rounded-[22px] border border-primary/[0.09] bg-white/78 shadow-[0_24px_70px_-50px_rgba(24,73,139,.55)] lg:grid-cols-[250px_minmax(0,1fr)]">
            <aside className="border-b border-primary/[0.08] bg-primary/[0.025] p-3 lg:border-b-0 lg:border-r">
              <nav aria-label="Settings categories" className="space-y-1">
                {DESKTOP_SECTIONS.map((section) => (
                  <button
                    aria-current={desktopSection === section.id ? "page" : undefined}
                    className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors ${desktopSection === section.id ? "bg-white text-primary shadow-[0_1px_2px_rgba(24,73,139,.08),inset_0_0_0_1px_rgba(24,73,139,.05)]" : "text-muted-foreground hover:bg-white/55 hover:text-foreground"}`}
                    key={section.id}
                    onClick={() => setDesktopSection(section.id)}
                    type="button"
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${desktopSection === section.id ? "bg-primary/[0.09] text-primary" : "bg-white/55 text-muted-foreground"}`}>
                      <section.icon className="h-[17px] w-[17px]" strokeWidth={1.8} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{section.label}</span>
                      <span className="mt-0.5 block truncate text-[11px] font-normal opacity-70">{section.description}</span>
                    </span>
                    <ChevronRight className={`h-4 w-4 transition-transform ${desktopSection === section.id ? "translate-x-0 text-primary" : "-translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-50"}`} />
                  </button>
                ))}
              </nav>
            </aside>

            <section className="min-w-0 p-6 lg:p-8" key={desktopSection}>
              <div className="mb-6 border-b border-primary/[0.07] pb-5">
                <h2 className="text-xl font-semibold tracking-[-0.03em] text-foreground">{activeSection.label}</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">{activeSection.description}</p>
              </div>
              <div className="ob-settings-content space-y-4">{sectionContent[desktopSection]}</div>
            </section>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-base font-semibold tracking-tight text-foreground">
            Settings
          </h1>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Connection and authentication preferences.
          </p>
        </div>

        <OpenbaseServicesSettings controller={openbaseServices} />
        <CodingBackendSettings
          onRestartScheduled={openbaseServices.applyRestartResponse}
        />
        <BackendModelSettings />
        <ServiceTierSettings
          onRestartScheduled={openbaseServices.applyRestartResponse}
        />
        <ReasoningSettings />

        {getRuntimeShell() === "electron" ? <LiveKitCompanionSettings /> : null}

        <DispatcherVoiceSettings
          onRestartScheduled={openbaseServices.applyRestartResponse}
        />
        <IgnoredLaunchctlSettings />
        <AgentsGenerationSettings />
        <DangerousConfirmationSettings />
        <SidebarItemsSettings />
        <EnvSettings />
        <AuthenticationSettings />
      </div>
    </DashboardLayout>
  );
};

export default Settings;
