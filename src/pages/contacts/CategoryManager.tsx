import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  type CategoryPolicy,
  type ContactCategory,
} from "@/lib/messaging-contacts";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

type CategoryManagerProps = {
  categories: ContactCategory[];
  acting: boolean;
  onAdd: (label: string, policy: CategoryPolicy) => Promise<boolean>;
  onEdit: (id: string, label: string, policy: CategoryPolicy) => Promise<boolean>;
  onRemove: (id: string) => Promise<boolean>;
};

const POLICIES: CategoryPolicy[] = ["ask", "block"];

function PolicySelect({
  value,
  disabled,
  label,
  onChange,
}: {
  value: CategoryPolicy;
  disabled: boolean;
  label: string;
  onChange: (policy: CategoryPolicy) => void;
}) {
  return (
    <Select value={value} disabled={disabled} onValueChange={(next) => onChange(next as CategoryPolicy)}>
      <SelectTrigger className="h-7 w-52 text-[12px]" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {POLICIES.map((policy) => (
          <SelectItem key={policy} value={policy} className="text-[12px]">
            {POLICY_LABELS[policy]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function CategoryRow({
  category,
  acting,
  onEdit,
  onRemove,
}: {
  category: ContactCategory;
  acting: boolean;
  onEdit: CategoryManagerProps["onEdit"];
  onRemove: CategoryManagerProps["onRemove"];
}) {
  const [label, setLabel] = useState(category.label);
  const [confirming, setConfirming] = useState(false);
  const dirty = label.trim() !== category.label;
  return (
    <li className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2 last:border-b-0">
      <Input
        value={label}
        aria-label={`Name for ${category.label}`}
        className="h-7 w-48 text-[12px]"
        disabled={acting}
        onChange={(event) => setLabel(event.target.value)}
        onBlur={() => {
          if (dirty && label.trim()) void onEdit(category.id, label.trim(), category.policy);
        }}
      />
      <PolicySelect
        value={category.policy}
        disabled={acting}
        label={`Agent access for ${category.label}`}
        onChange={(policy) => void onEdit(category.id, category.label, policy)}
      />
      <div className="ml-auto">
        {confirming ? (
          <Button
            size="sm"
            variant="destructive"
            className="h-7 px-2.5 text-[12px]"
            disabled={acting}
            onClick={() => void onRemove(category.id).then(() => setConfirming(false))}
          >
            Confirm delete
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-[12px] text-muted-foreground"
            aria-label={`Delete ${category.label}`}
            disabled={acting}
            onClick={() => setConfirming(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </li>
  );
}

/** Rename categories, set what agents may do with each, add or delete them.
 * Deleting a category sends its people back to the review queue. */
export function CategoryManager({ categories, acting, onAdd, onEdit, onRemove }: CategoryManagerProps) {
  const [open, setOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newPolicy, setNewPolicy] = useState<CategoryPolicy>("ask");

  const add = async () => {
    const label = newLabel.trim();
    if (!label) return;
    if (await onAdd(label, newPolicy)) {
      setNewLabel("");
      setNewPolicy("ask");
    }
  };

  return (
    <Panel>
      <Button
        variant="ghost"
        className="h-9 w-full justify-start gap-2 rounded-none px-3 text-[12.5px] font-medium"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        Categories ({categories.length})
      </Button>
      {open ? (
        <div className="border-t border-border">
          <p className="px-3 py-2 text-[11.5px] text-muted-foreground">
            "Agents ask for approval" keeps the normal approval flow for reading
            and sending. "Agents are blocked" declines every agent request about
            the contact automatically. Deleting a category sends its contacts back
            to the queue.
          </p>
          <ul>
            {categories.map((category) => (
              <CategoryRow
                key={category.id}
                category={category}
                acting={acting}
                onEdit={onEdit}
                onRemove={onRemove}
              />
            ))}
          </ul>
          <form
            className="flex flex-wrap items-center gap-2 border-t border-border px-3 py-2"
            onSubmit={(event) => {
              event.preventDefault();
              void add();
            }}
          >
            <Input
              value={newLabel}
              placeholder="New category"
              aria-label="New category name"
              className="h-7 w-48 text-[12px]"
              disabled={acting}
              onChange={(event) => setNewLabel(event.target.value)}
            />
            <PolicySelect
              value={newPolicy}
              disabled={acting}
              label="Agent access for the new category"
              onChange={setNewPolicy}
            />
            <Button type="submit" size="sm" className="h-7 px-2.5 text-[12px]" disabled={acting || !newLabel.trim()}>
              <Plus className="h-3 w-3" />
              Add
            </Button>
          </form>
        </div>
      ) : null}
    </Panel>
  );
}
