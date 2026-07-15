import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TriangleAlert } from "lucide-react";
import React from "react";
import type { ServiceTier } from "./settingsApi";

type TierValue = ServiceTier | "";

type Props = {
  open: boolean;
  currentDispatcherTier: TierValue;
  selectedDispatcherTier: TierValue;
  currentSuperAgentsTier: TierValue;
  selectedSuperAgentsTier: TierValue;
  saving: boolean;
  canConfirm: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

const tierLabel = (tier: TierValue) =>
  tier ? `${tier.charAt(0).toUpperCase()}${tier.slice(1)}` : "Unknown";

export const ServiceTierChangeDialog: React.FC<Props> = ({
  open,
  currentDispatcherTier,
  selectedDispatcherTier,
  currentSuperAgentsTier,
  selectedSuperAgentsTier,
  saving,
  canConfirm,
  onOpenChange,
  onConfirm,
}) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle className="flex items-center gap-2 text-base">
          <TriangleAlert className="h-4 w-4 text-warning" />
          Change service tiers?
        </AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div className="space-y-3 text-sm leading-5">
            <div className="space-y-1">
              {currentDispatcherTier !== selectedDispatcherTier ? (
                <p>
                  Voice dispatcher: {tierLabel(currentDispatcherTier)} to{" "}
                  {tierLabel(selectedDispatcherTier)}.
                </p>
              ) : null}
              {currentSuperAgentsTier !== selectedSuperAgentsTier ? (
                <p>
                  Super Agents: {tierLabel(currentSuperAgentsTier)} to{" "}
                  {tierLabel(selectedSuperAgentsTier)}.
                </p>
              ) : null}
            </div>
            <p>
              Openbase will restart its managed services so Codex App Server
              and the LiveKit voice agent both load the new tiers. This
              interrupts any active voice call and may interrupt in-progress
              coding turns.
            </p>
            <p>
              Dispatcher conversation context, existing Super Agent threads,
              and project files are preserved.
            </p>
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
        <AlertDialogAction disabled={!canConfirm} onClick={onConfirm}>
          Change and restart
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
