import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { SegmentedSetting } from "./SegmentedSetting";

const options = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  return (
    <SegmentedSetting
      label="Appearance"
      value={theme}
      options={options}
      onChange={setTheme}
    />
  );
}
