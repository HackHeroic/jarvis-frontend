/**
 * The model picker says what the backend does with each choice. The stream handler
 * reads model_mode two ways: 'cloud' (also 'gemini' and the older '4b') sends the turn
 * to the cloud providers only; anything else is auto (the local model first, the cloud
 * when it cannot answer). There is no "force local" mode, so the picker offers none.
 */
import { describe, expect, it } from "vitest";
import { modelModeOptions, toModelMode } from "@/lib/modelModes";

const LOCAL = {
  primary_model: "openai/google/gemma-4-26b-a4b-it",
  fast_model: "openai/google/gemma-4-e4b-it",
  cloud_model: "gemini/gemini-2.5-flash",
  gemini_primary: false,
  local_available: true,
};
const CLOUD_ONLY = { ...LOCAL, primary_model: "", fast_model: "", gemini_primary: true, local_available: false };

describe("modelModeOptions", () => {
  it("offers Auto and Cloud only: the backend has no force-local mode", () => {
    for (const status of [LOCAL, CLOUD_ONLY, null]) {
      expect(modelModeOptions(status).map((o) => [o.value, o.label])).toEqual([
        ["auto", "Auto"],
        ["4b", "Cloud"],
      ]);
    }
  });

  it("Auto names the loaded local model it tries first, then the cloud", () => {
    const [auto] = modelModeOptions(LOCAL);
    expect(auto.tooltip).toBe("gemma-4-26b-a4b first, cloud if it can't answer");
  });

  it("with no local model loaded, Auto says the cloud answers", () => {
    const [auto] = modelModeOptions(CLOUD_ONLY);
    expect(auto.tooltip).toBe("Cloud models (no local model is loaded)");
  });

  it("Cloud says it is cloud only, for this turn", () => {
    const [, cloud] = modelModeOptions(LOCAL);
    expect(cloud.tooltip).toBe("Cloud models only, for this turn");
  });
});

describe("toModelMode", () => {
  it("reads a stored mode the way the backend reads it", () => {
    expect(toModelMode("4b")).toBe("4b");
    expect(toModelMode("cloud")).toBe("4b");
    expect(toModelMode("gemini")).toBe("4b");
    expect(toModelMode("auto")).toBe("auto");
    expect(toModelMode("27b")).toBe("auto"); // the old "force local" choice was always auto
    expect(toModelMode(null)).toBe("auto");
  });
});
