import DashboardLayout from "@/components/layouts/DashboardLayout";
import { getRuntimeShell } from "@/lib/runtime-config";
import React from "react";
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

const Settings: React.FC = () => {
  const openbaseServices = useOpenbaseServices();

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
        <ServiceTierSettings />
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
