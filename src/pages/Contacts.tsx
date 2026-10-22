import { ConfigureTabs } from "@/components/ConfigureTabs";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import {
  ResourceEmptyState,
  ResourceError,
  ResourceLoading,
  ResourcePageHeader,
} from "@/components/resource/ResourcePage";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import {
  KIND_LABELS,
  progressLabel,
  type ContactPerson,
  type MessagingContactsSnapshot,
} from "@/lib/messaging-contacts";
import { relativeTimeShort } from "@/lib/relative-time";
import { CheckCircle2, Users } from "lucide-react";
import { useMemo, useState } from "react";

import { CategorizedList } from "./contacts/CategorizedList";
import { CategoryManager } from "./contacts/CategoryManager";
import { ReviewQueue } from "./contacts/ReviewQueue";
import { useMessagingContacts } from "./contacts/useMessagingContacts";

function ProgressBar({ snapshot }: { snapshot: MessagingContactsSnapshot }) {
  const { total, categorized } = snapshot.progress;
  const percent = total === 0 ? 100 : Math.round((categorized / total) * 100);
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={categorized}
      aria-label="Contacts categorized"
      className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted"
    >
      <div className="h-full rounded-full bg-success transition-[width]" style={{ width: `${percent}%` }} />
    </div>
  );
}

function SourcesNote({ snapshot }: { snapshot: MessagingContactsSnapshot }) {
  const parts = snapshot.sources.map((source) =>
    source.ssh_target ? `${source.label} (via ${source.ssh_target})` : source.label,
  );
  return (
    <span>
      {parts.length ? parts.join(" · ") : "no messaging sources"}
      {snapshot.refreshed_at ? ` · scanned ${relativeTimeShort(snapshot.refreshed_at)}` : ""}
    </span>
  );
}

const Contacts = () => {
  const { snapshot, loading, acting, error, load, assign, skip, addCategory, editCategory, removeCategory } =
    useMessagingContacts();
  const [includeSkipped, setIncludeSkipped] = useState(false);

  const { queue, reviewed } = useMemo(() => {
    const people = snapshot?.people ?? [];
    const byKey = new Map(people.map((person) => [person.key, person]));
    const queued: ContactPerson[] = (snapshot?.queue ?? [])
      .map((key) => byKey.get(key))
      .filter((person): person is ContactPerson => Boolean(person));
    const skipped = people.filter((person) => !person.category && person.skipped);
    return {
      queue: includeSkipped ? [...queued, ...skipped] : queued,
      reviewed: people.filter((person) => person.category || (!includeSkipped && person.skipped)),
    };
  }, [snapshot, includeSkipped]);

  const progress = snapshot?.progress;
  const skippedCount = progress?.skipped ?? 0;

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <ConfigureTabs />
        <ResourcePageHeader
          title="Contacts"
          loading={loading}
          onRefresh={() => void load(true)}
          refreshLabel="Rescan"
          subtitle={
            snapshot ? (
              <>
                {progressLabel(snapshot.progress)} · messages in the last {snapshot.window_days} days ·{" "}
                <SourcesNote snapshot={snapshot} />
              </>
            ) : (
              "Categorize everyone you message on WhatsApp and iMessage"
            )
          }
        />

        <ResourceError message={error} />
        {snapshot?.errors.map((item) => (
          <ResourceError key={item.source_id} message={item.message} />
        ))}

        {loading && !snapshot ? (
          <ResourceLoading>Reading your messaging sources...</ResourceLoading>
        ) : !snapshot ? null : snapshot.sources.length === 0 ? (
          <ResourceEmptyState icon={Users} className="py-8">
            No messaging sources found. Install the {KIND_LABELS.imessage} or {KIND_LABELS.whatsapp}{" "}
            skill, or point Openbase at the computer that runs it, then rescan.
          </ResourceEmptyState>
        ) : (
          <>
            <Panel className="space-y-2 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
                <span className="font-medium text-foreground">
                  {progress && progress.pending > 0
                    ? `${progress.pending - skippedCount} to review` +
                      (skippedCount ? ` · ${skippedCount} skipped` : "")
                    : "Everyone is categorized"}
                </span>
                {skippedCount > 0 ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[12px]"
                    onClick={() => setIncludeSkipped((value) => !value)}
                  >
                    {includeSkipped ? "Hide skipped" : "Review skipped now"}
                  </Button>
                ) : null}
              </div>
              <ProgressBar snapshot={snapshot} />
            </Panel>

            {queue.length > 0 ? (
              <ReviewQueue
                queue={queue}
                categories={snapshot.categories}
                acting={acting}
                onAssign={assign}
                onSkip={skip}
              />
            ) : snapshot.progress.total === 0 ? (
              <ResourceEmptyState icon={Users} className="py-8">
                No contacts with messages in the last {snapshot.window_days} days.
              </ResourceEmptyState>
            ) : (
              <ResourceEmptyState icon={CheckCircle2} className="py-8">
                {skippedCount > 0
                  ? "Nothing left right now. Skipped contacts come back tomorrow."
                  : "All contacts are categorized. New people you message will show up here."}
              </ResourceEmptyState>
            )}

            <CategorizedList
              people={reviewed}
              categories={snapshot.categories}
              acting={acting}
              onAssign={assign}
            />
            <CategoryManager
              categories={snapshot.categories}
              acting={acting}
              onAdd={addCategory}
              onEdit={editCategory}
              onRemove={removeCategory}
            />
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Contacts;
