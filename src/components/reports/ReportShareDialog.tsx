import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  addShareGrant,
  fetchShareState,
  revokeShareGrant,
  shareReport,
  unshareReport,
  type ShareState,
  type ShareTarget,
} from "@/lib/reportSharing";
import { Loader2, Share2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type ReportShareDialogProps = {
  target: ShareTarget;
};

export const ReportShareDialog = ({ target }: ReportShareDialogProps) => {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ShareState | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const next = await fetchShareState(target);
    setState(next);
    if (next.error) {
      setError(next.error);
    }
    setLoading(false);
  }, [target]);

  useEffect(() => {
    if (open) {
      void refresh();
    }
  }, [open, refresh]);

  const run = useCallback(
    async (operation: () => Promise<ShareState>) => {
      setBusy(true);
      setError(null);
      const next = await operation();
      setState(next);
      if (next.error) {
        setError(next.error);
      }
      setBusy(false);
    },
    [],
  );

  const activeGrants = (state?.grants ?? []).filter(
    (grant) => !grant.revoked_at,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[12px]"
        >
          <Share2 className="h-3.5 w-3.5" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share report</DialogTitle>
          <DialogDescription>
            People you add can view this report at app.openbase.cloud after
            signing in with their email. There are no public links.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking share status...
          </div>
        ) : state?.shared ? (
          <div className="flex flex-col gap-3">
            <form
              className="flex items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                const trimmed = email.trim();
                if (!trimmed) {
                  return;
                }
                void run(() => addShareGrant(target, trimmed)).then(() =>
                  setEmail(""),
                );
              }}
            >
              <Input
                type="email"
                value={email}
                placeholder="teammate@example.com"
                onChange={(event) => setEmail(event.target.value)}
                disabled={busy}
                className="h-8 text-sm"
              />
              <Button
                type="submit"
                size="sm"
                className="h-8"
                disabled={busy || !email.trim()}
              >
                Add
              </Button>
            </form>
            {activeGrants.length ? (
              <ul className="flex flex-col gap-1">
                {activeGrants.map((grant) => (
                  <li
                    key={grant.id}
                    className="flex items-center justify-between rounded border border-border px-2 py-1 text-sm"
                  >
                    <span className="truncate">{grant.grantee_email}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      disabled={busy}
                      aria-label={`Remove ${grant.grantee_email}`}
                      onClick={() =>
                        void run(() => revokeShareGrant(target, grant.id))
                      }
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Shared, but nobody has access yet. Add an email above.
              </p>
            )}
            <div className="flex items-center justify-between border-t border-border pt-2">
              <span className="text-xs text-muted-foreground">
                {state.item?.latest_revision_seq
                  ? `Revision ${state.item.latest_revision_seq} published`
                  : "Published"}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-[12px]"
                disabled={busy}
                onClick={() => void run(() => unshareReport(target))}
              >
                Stop sharing
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 py-2">
            <p className="text-sm text-muted-foreground">
              This report is not shared. Publishing uploads its current
              content (and referenced images) to your Openbase Cloud account
              so people you choose can view it.
            </p>
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={() => void run(() => shareReport(target))}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Share this report
            </Button>
          </div>
        )}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </DialogContent>
    </Dialog>
  );
};
