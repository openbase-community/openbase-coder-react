import { PanelLeft, PanelTop } from "lucide-react";
import { useTabPosition } from "@/hooks/useTabPosition";
import { SegmentedSetting } from "./SegmentedSetting";

const options = [
  { value: "horizontal", label: "Horizontal", Icon: PanelTop },
  { value: "vertical", label: "Vertical", Icon: PanelLeft },
] as const;

export function TabSettings() {
  const [position, setPosition] = useTabPosition();
  return (
    <SegmentedSetting
      label="Tab position"
      value={position}
      options={options}
      onChange={setPosition}
    />
  );
}
