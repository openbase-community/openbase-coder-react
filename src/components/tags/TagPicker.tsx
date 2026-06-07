import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { TagOption } from "@/lib/item-tags";
import { cn } from "@/lib/utils";
import { Plus, Tag } from "lucide-react";
import { useMemo, useState } from "react";

type TagPickerProps = {
  tags: string[];
  options: TagOption[];
  disabled?: boolean;
  align?: "start" | "center" | "end";
  onChange: (tags: string[]) => Promise<void> | void;
};

const tagKey = (value: string) => value.trim().toLowerCase();

export const TagPicker = ({
  tags,
  options,
  disabled = false,
  align = "end",
  onChange,
}: TagPickerProps) => {
  const [open, setOpen] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [saving, setSaving] = useState(false);
  const currentKeys = useMemo(() => new Set(tags.map(tagKey)), [tags]);
  const mergedOptions = useMemo(() => {
    const byKey = new Map<string, string>();
    options.forEach((option) => byKey.set(tagKey(option.label), option.label));
    tags.forEach((tag) => byKey.set(tagKey(tag), tag));
    return Array.from(byKey.values()).sort((a, b) => a.localeCompare(b));
  }, [options, tags]);

  const applyTags = async (nextTags: string[]) => {
    setSaving(true);
    try {
      await onChange(nextTags);
    } finally {
      setSaving(false);
    }
  };

  const toggleTag = (tag: string) => {
    const key = tagKey(tag);
    const next = currentKeys.has(key)
      ? tags.filter((item) => tagKey(item) !== key)
      : [...tags, tag];
    void applyTags(next);
  };

  const addTag = () => {
    const label = newTag.trim();
    if (!label || currentKeys.has(tagKey(label))) return;
    setNewTag("");
    void applyTags([...tags, label]);
  };

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <div className="hidden min-w-0 flex-wrap gap-1 sm:flex">
        {tags.slice(0, 3).map((tag) => (
          <Badge
            key={tag}
            variant="outline"
            className="max-w-28 truncate rounded px-1.5 py-0 text-[10px] font-medium"
            title={tag}
          >
            {tag}
          </Badge>
        ))}
        {tags.length > 3 ? (
          <Badge
            variant="outline"
            className="rounded px-1.5 py-0 text-[10px] font-medium"
          >
            +{tags.length - 3}
          </Badge>
        ) : null}
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className={cn(
              "h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground",
              tags.length > 0 && "text-foreground",
            )}
            disabled={disabled || saving}
            aria-label="Tags"
            title="Tags"
            onClick={(event) => event.stopPropagation()}
          >
            <Tag className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align={align}
          className="w-64 p-2"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="max-h-48 space-y-1 overflow-y-auto">
            {mergedOptions.length === 0 ? (
              <div className="px-2 py-2 text-[12px] text-muted-foreground">
                No tags
              </div>
            ) : (
              mergedOptions.map((option) => {
                const checked = currentKeys.has(tagKey(option));
                return (
                  <label
                    key={option}
                    className="flex min-w-0 cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[12px] hover:bg-surface-muted"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleTag(option)}
                      disabled={saving}
                    />
                    <span className="min-w-0 truncate">{option}</span>
                  </label>
                );
              })
            )}
          </div>
          <div className="mt-2 flex gap-1.5 border-t border-border pt-2">
            <Input
              value={newTag}
              onChange={(event) => setNewTag(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addTag();
                }
              }}
              placeholder="New tag"
              className="h-7 min-w-0 text-[12px]"
              disabled={saving}
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-7 w-7 shrink-0"
              disabled={saving || !newTag.trim()}
              aria-label="Add tag"
              title="Add tag"
              onClick={addTag}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
