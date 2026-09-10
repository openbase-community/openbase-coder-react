import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useId } from "react";

const options = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const name = useId();
  return (
    <fieldset className="min-w-0 border-b border-border pb-4">
      <legend className="mb-3 text-[13px] font-medium text-foreground">
        Appearance
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map(({ value, label, Icon }) => (
          <label key={value} className="relative cursor-pointer">
            <input
              className="peer sr-only"
              type="radio"
              name={name}
              value={value}
              checked={theme === value}
              onChange={() => setTheme(value)}
            />
            <span className="flex h-9 min-w-[88px] items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-[13px] text-muted-foreground transition-colors hover:bg-surface-muted peer-checked:border-primary peer-checked:bg-accent peer-checked:text-accent-foreground peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring">
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
