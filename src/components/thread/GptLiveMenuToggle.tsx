import {
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useVoiceModel } from "@/contexts/voice-model";

export function GptLiveMenuToggle() {
  const voice = useVoiceModel();
  return (
    <>
      <DropdownMenuCheckboxItem
        checked={voice?.settings?.model === "gpt-live-1"}
        disabled={!voice?.settings || voice.saving}
        onSelect={(event) => event.preventDefault()}
        onCheckedChange={(checked) =>
          void voice?.save(checked ? "gpt-live-1" : "pipeline")
        }
      >
        GPT Live
      </DropdownMenuCheckboxItem>
      <DropdownMenuLabel className="text-[11px] font-normal text-muted-foreground">
        Off: classic voice · Applies next call
      </DropdownMenuLabel>
    </>
  );
}
