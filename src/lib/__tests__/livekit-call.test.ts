import { describe, expect, it } from "vitest";

import {
  lifecycleAutoMuteApplies,
  parseVoiceEngine,
  VOICE_ENGINE_ATTRIBUTE,
} from "../livekit-call";

describe("parseVoiceEngine", () => {
  it("names the attribute the agent publishes", () => {
    expect(VOICE_ENGINE_ATTRIBUTE).toBe("openbase.voice.engine");
  });

  it("accepts the two known engines, tolerating case and whitespace", () => {
    expect(parseVoiceEngine("live")).toBe("live");
    expect(parseVoiceEngine(" Live\n")).toBe("live");
    expect(parseVoiceEngine("pipeline")).toBe("pipeline");
  });

  it("treats anything else as not announced", () => {
    expect(parseVoiceEngine("")).toBeNull();
    expect(parseVoiceEngine("duplex")).toBeNull();
    expect(parseVoiceEngine(undefined)).toBeNull();
    expect(parseVoiceEngine(null)).toBeNull();
  });
});

describe("lifecycleAutoMuteApplies", () => {
  it("keeps classic mute timing unless the engine is live", () => {
    expect(lifecycleAutoMuteApplies(null)).toBe(true);
    expect(lifecycleAutoMuteApplies("pipeline")).toBe(true);
    expect(lifecycleAutoMuteApplies("live")).toBe(false);
  });
});
