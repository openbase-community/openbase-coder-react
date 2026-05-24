import DashboardLayout from "@/components/layouts/ExampleLayout";
import { getRuntimeShell } from "@/lib/runtime-config";
import React from "react";
import { AuthenticationSettings } from "./settings/AuthenticationSettings";
import { DispatcherVoiceSettings } from "./settings/DispatcherVoiceSettings";
import { IgnoredLaunchctlSettings } from "./settings/IgnoredLaunchctlSettings";
import { LiveKitCompanionSettings } from "./settings/LiveKitCompanionSettings";
import { OpenbaseServicesSettings } from "./settings/OpenbaseServicesSettings";
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

        {getRuntimeShell() === "electron" ? <LiveKitCompanionSettings /> : null}

        <DispatcherVoiceSettings
          onRestartScheduled={openbaseServices.applyRestartResponse}
        />
        <IgnoredLaunchctlSettings />
        <AuthenticationSettings />
        <SidebarItemsSettings />
      </div>
    </DashboardLayout>
  );
};

export default Settings;
