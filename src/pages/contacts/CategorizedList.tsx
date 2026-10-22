import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ContactCategory, ContactPerson } from "@/lib/messaging-contacts";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

import { ContactPersonSummary } from "./ContactPersonSummary";

const CLEAR_VALUE = "__clear__";

type CategorizedListProps = {
  people: ContactPerson[];
  categories: ContactCategory[];
  acting: boolean;
  onAssign: (keys: string[], category: string | null) => Promise<boolean>;
};

/** Already categorized (or skipped) people, collapsible, with a way to change
 * the category later. */
export function CategorizedList({ people, categories, acting, onAssign }: CategorizedListProps) {
  const [open, setOpen] = useState(false);
  if (people.length === 0) return null;
  return (
    <Panel>
      <Button
        variant="ghost"
        className="h-9 w-full justify-start gap-2 rounded-none px-3 text-[12.5px] font-medium"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        Reviewed contacts ({people.length})
      </Button>
      {open ? (
        <ul className="border-t border-border">
          {people.map((person) => (
            <li
              key={person.key}
              className="flex flex-wrap items-center gap-3 border-b border-border px-3 py-2 last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <ContactPersonSummary person={person} compact />
              </div>
              {person.skipped && !person.category ? (
                <span className="text-[11px] text-muted-foreground">Skipped until tomorrow</span>
              ) : null}
              <Select
                value={person.category?.id ?? ""}
                disabled={acting}
                onValueChange={(value) =>
                  void onAssign([person.key], value === CLEAR_VALUE ? null : value)
                }
              >
                <SelectTrigger
                  className="h-7 w-44 text-[12px]"
                  aria-label={`Category for ${person.display_name ?? person.key}`}
                >
                  <SelectValue placeholder="Uncategorized" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id} className="text-[12px]">
                      {category.label}
                    </SelectItem>
                  ))}
                  {person.category ? (
                    <SelectItem value={CLEAR_VALUE} className="text-[12px] text-muted-foreground">
                      Back to the queue
                    </SelectItem>
                  ) : null}
                </SelectContent>
              </Select>
            </li>
          ))}
        </ul>
      ) : null}
    </Panel>
  );
}
