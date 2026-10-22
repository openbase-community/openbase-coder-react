import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Panel } from "@/components/ui/panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  POLICY_LABELS,
  type ContactCategory,
  type ContactPerson,
} from "@/lib/messaging-contacts";
import { SkipForward } from "lucide-react";
import { useMemo, useState } from "react";

import { ContactPersonSummary } from "./ContactPersonSummary";

type ReviewQueueProps = {
  /** Uncategorized people, most recent conversation first. */
  queue: ContactPerson[];
  categories: ContactCategory[];
  acting: boolean;
  onAssign: (keys: string[], category: string) => Promise<boolean>;
  onSkip: (keys: string[]) => Promise<boolean>;
};

/**
 * One contact at a time on top, with a bulk list underneath for assigning
 * or skipping many at once. The queue re-renders from the server snapshot
 * after every action, so the next contact appears on its own.
 */
export function ReviewQueue({ queue, categories, acting, onAssign, onSkip }: ReviewQueueProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState<string>("");
  const current = queue[0];
  const queueKeys = useMemo(() => new Set(queue.map((p) => p.key)), [queue]);
  const selectedKeys = useMemo(
    () => [...selected].filter((key) => queueKeys.has(key)),
    [selected, queueKeys],
  );
  const allSelected = queue.length > 0 && selectedKeys.length === queue.length;

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(queue.map((p) => p.key)));

  const applyBulk = async () => {
    if (!bulkCategory || selectedKeys.length === 0) return;
    if (await onAssign(selectedKeys, bulkCategory)) setSelected(new Set());
  };

  const skipSelected = async () => {
    if (selectedKeys.length === 0) return;
    if (await onSkip(selectedKeys)) setSelected(new Set());
  };

  if (!current) return null;

  return (
    <div className="space-y-3">
      <Panel className="space-y-3 p-4" data-testid="review-current">
        <div className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
          Who is this?
        </div>
        <ContactPersonSummary person={current} />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Choose a category">
          {categories.map((category) => (
            <Button
              key={category.id}
              size="sm"
              variant={category.policy === "block" ? "outline" : "default"}
              className="h-8 px-3 text-[12px]"
              title={POLICY_LABELS[category.policy]}
              disabled={acting}
              onClick={() => void onAssign([current.key], category.id)}
            >
              {category.label}
            </Button>
          ))}
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2.5 text-[12px] text-muted-foreground"
            disabled={acting}
            onClick={() => void onSkip([current.key])}
          >
            <SkipForward className="h-3 w-3" />
            Skip for now
          </Button>
        </div>
      </Panel>

      {queue.length > 1 ? (
        <Panel>
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
            <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
              <Checkbox
                checked={allSelected}
                onCheckedChange={toggleAll}
                aria-label="Select all pending contacts"
              />
              {selectedKeys.length > 0
                ? `${selectedKeys.length} selected`
                : `${queue.length} pending`}
            </label>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Select value={bulkCategory} onValueChange={setBulkCategory}>
                <SelectTrigger className="h-7 w-44 text-[12px]" aria-label="Category for selected contacts">
                  <SelectValue placeholder="Category for selected" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id} className="text-[12px]">
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                className="h-7 px-2.5 text-[12px]"
                disabled={acting || !bulkCategory || selectedKeys.length === 0}
                onClick={() => void applyBulk()}
              >
                Assign selected
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2.5 text-[12px]"
                disabled={acting || selectedKeys.length === 0}
                onClick={() => void skipSelected()}
              >
                Skip selected
              </Button>
            </div>
          </div>
          <ul className="max-h-[28rem] overflow-y-auto">
            {queue.map((person) => (
              <li key={person.key} className="flex items-center gap-3 border-b border-border px-3 py-2 last:border-b-0">
                <Checkbox
                  checked={selected.has(person.key)}
                  onCheckedChange={() => toggle(person.key)}
                  aria-label={`Select ${person.display_name ?? person.key}`}
                />
                <ContactPersonSummary person={person} compact />
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </div>
  );
}
