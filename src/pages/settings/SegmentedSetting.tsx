import { useId } from "react";
import type { LucideIcon } from "lucide-react";

export function SegmentedSetting<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | undefined;
  options: readonly { value: T; label: string; Icon: LucideIcon }[];
  onChange: (value: T) => void;
}) {
  const name = useId();
  return (
    <fieldset className="min-w-0 border-b border-border pb-4">
      <legend className="mb-3 text-[13px] font-medium text-foreground">
        {label}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map(({ value: option, label: title, Icon }) => (
          <label key={option} className="relative cursor-pointer">
            <input
              className="peer sr-only"
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
            />
            <span className="flex h-9 min-w-[88px] items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-[13px] text-muted-foreground transition-colors hover:bg-surface-muted peer-checked:border-primary peer-checked:bg-accent peer-checked:text-accent-foreground peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring">
              <Icon className="h-4 w-4" aria-hidden="true" />
              {title}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
