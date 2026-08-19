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
import { Checkbox } from "@/components/ui/checkbox";
import { useEffect, useState } from "react";

import {
  availableInstallScopes,
  marketplaceScopeLabels,
  type MarketplaceScope,
  type MarketplaceSkill,
} from "./marketplaceTypes";

interface MarketplaceInstallDialogProps {
  skill: MarketplaceSkill | null;
  installing: boolean;
  onClose: () => void;
  onInstall: (targets: MarketplaceScope[]) => Promise<void>;
}

export function MarketplaceInstallDialog({
  skill,
  installing,
  onClose,
  onInstall,
}: MarketplaceInstallDialogProps) {
  const [targets, setTargets] = useState<MarketplaceScope[]>([]);

  useEffect(() => {
    if (!skill) {
      setTargets([]);
      return;
    }
    const available = availableInstallScopes(skill);
    const preferred = available.find(
      (scope) => skill.installed_targets[scope] === "not_installed",
    );
    setTargets(preferred ? [preferred] : []);
  }, [skill]);

  if (!skill?.source) return null;

  const toggleTarget = (scope: MarketplaceScope, enabled: boolean) => {
    setTargets((current) =>
      enabled
        ? [...current, scope]
        : current.filter((target) => target !== scope),
    );
  };

  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Install /{skill.slug}?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Openbase will download only the pinned source below, verify its
                structure and optional integrity digest, and install no
                dependencies or scripts.
              </p>
              <div className="rounded border border-border bg-surface-muted p-2 font-mono text-[11px] text-foreground">
                <div className="break-all">{skill.source.repository_url}</div>
                <div className="mt-1 break-all text-muted-foreground">
                  {skill.source.commit}:{skill.source.path}
                </div>
              </div>
              {skill.install_notes ? (
                <p className="rounded border border-warning/30 bg-warning/5 p-2 text-foreground">
                  {skill.install_notes}
                </p>
              ) : null}
              <fieldset className="space-y-2 text-left">
                <legend className="mb-1 font-medium text-foreground">
                  Install locations
                </legend>
                {(Object.keys(marketplaceScopeLabels) as MarketplaceScope[]).map(
                  (scope) => {
                    const state = skill.installed_targets[scope];
                    const disabled = state === "conflict";
                    return (
                      <label
                        key={scope}
                        className="flex items-center gap-2 text-foreground"
                      >
                        <Checkbox
                          checked={targets.includes(scope)}
                          disabled={disabled || installing}
                          onCheckedChange={(checked) =>
                            toggleTarget(scope, checked === true)
                          }
                        />
                        <span>{marketplaceScopeLabels[scope]}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {state === "installed"
                            ? "already installed"
                            : state === "conflict"
                              ? "different skill exists"
                              : ""}
                        </span>
                      </label>
                    );
                  },
                )}
              </fieldset>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={installing}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={installing || targets.length === 0}
            onClick={(event) => {
              event.preventDefault();
              void onInstall(targets);
            }}
          >
            {installing ? "Installing…" : "Confirm install"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
