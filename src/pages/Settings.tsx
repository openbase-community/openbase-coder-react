import DashboardLayout from "@/components/layouts/DashboardLayout";
import { getRuntimeShell } from "@/lib/runtime-config";
import {
  Bot,
  Cog,
  LayoutPanelLeft,
  Radio,
  Settings2,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import React, { type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
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
  | "account"
  | "machine"
  | "agents"
  | "voice"
  | "interface"
  | "safety"
  | "advanced";

// Sections follow the user's mental model, not the implementation's: who I
// am, this machine, how agents behave, voice, how the console looks, what
// needs my approval, and expert escape hatches last.
const SETTINGS_SECTIONS: Array<{
  id: SettingsSectionId;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    id: "account",
    label: "Account",
    description: "Sign-in and plan",
    icon: UserRound,
  },
  {
    id: "machine",
    label: "This Machine",
    description: "Local Openbase services",
    icon: Cog,
  },
  {
    id: "agents",
    label: "Agents",
    description: "Backend, model, and effort",
    icon: Bot,
  },
  {
    id: "voice",
    label: "Voice",
    description: "Calls and screen sharing",
    icon: Radio,
  },
  {
    id: "interface",
    label: "Interface",
    description: "Console layout",
    icon: LayoutPanelLeft,
  },
  {
    id: "safety",
    label: "Safety",
    description: "Approval requirements",
    icon: ShieldCheck,
  },
  {
    id: "advanced",
    label: "Advanced",
    description: "Environment and overrides",
    icon: Settings2,
  },
];

const DEFAULT_SECTION: SettingsSectionId = "account";

// Pre-redesign section ids that may live in bookmarks or docs links.
const LEGACY_SECTION_IDS: Record<string, SettingsSectionId> = {
  general: "machine",
};

function resolveSection(raw: string | null): SettingsSectionId {
  if (raw && SETTINGS_SECTIONS.some((item) => item.id === raw)) {
    return raw as SettingsSectionId;
  }
  if (raw && raw in LEGACY_SECTION_IDS) {
    return LEGACY_SECTION_IDS[raw];
  }
  return DEFAULT_SECTION;
}

const Settings: React.FC = () => {
  const openbaseServices = useOpenbaseServices();
  const [searchParams, setSearchParams] = useSearchParams();
  const section = resolveSection(searchParams.get("section"));
  const isNativeShell = getRuntimeShell() === "electron";

  const setSection = (next: SettingsSectionId) => {
    setSearchParams(
      (params) => {
        const updated = new URLSearchParams(params);
        if (next === DEFAULT_SECTION) {
          updated.delete("section");
        } else {
          updated.set("section", next);
        }
        return updated;
      },
      { replace: true },
    );
  };

  const sectionContent: Record<SettingsSectionId, ReactNode> = {
    account: <AuthenticationSettings />,
    machine: <OpenbaseServicesSettings controller={openbaseServices} />,
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
    interface: <SidebarItemsSettings />,
    safety: <DangerousConfirmationSettings />,
    advanced: (
      <>
        <EnvSettings />
        <IgnoredLaunchctlSettings />
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
            Configure your account, this machine, and how agents work — and
            control what requires approval.
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
