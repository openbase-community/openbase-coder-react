import DashboardLayout from "@/components/layouts/DashboardLayout";
import { SyncDaemonCard } from "./sync/SyncDaemonCard";
import { SyncExplainerCard } from "./sync/SyncExplainerCard";

const SyncPage = () => (
  <DashboardLayout>
    <div className="space-y-4">
      <div>
        <h1 className="text-base font-semibold tracking-tight text-foreground">
          Sync
        </h1>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          Openbase Sync mirrors your projects between this computer and your
          hub.
        </p>
      </div>

      <SyncDaemonCard />
      <SyncExplainerCard />
    </div>
  </DashboardLayout>
);

export default SyncPage;
