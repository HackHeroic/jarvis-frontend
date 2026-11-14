/**
 * The chat Memory panel's state: the fetched list once it has loaded, the
 * turn's own memories only before that, and loading / error / empty kept apart.
 */
import { describe, expect, it } from "vitest";
import { ContractError } from "@/lib/contracts";
import { toMemoryPanelState } from "@/lib/transforms";
import type { MemoryRecord } from "@/lib/types";

const frame: MemoryRecord[] = [
  { memory_id: "m-frame", memory_type: "goal", content: "DL contest on Friday", confidence: 0.9 },
];
const loaded: MemoryRecord[] = [
  { memory_id: "m-1", memory_type: "goal", content: "Training for the Mumbai marathon in March", confidence: 0.8, provenance: "said" },
];

describe("toMemoryPanelState", () => {
  it("first load in flight with nothing from the turn is loading, never 'No memories yet'", () => {
    expect(toMemoryPanelState({ loaded: undefined, loading: true, error: null, frame: [] }).kind).toBe("loading");
  });

  it("first load in flight shows the turn's memories meanwhile", () => {
    expect(toMemoryPanelState({ loaded: undefined, loading: true, error: null, frame })).toEqual({
      kind: "ready",
      items: frame,
    });
  });

  it("once loaded, the fetched list is shown", () => {
    expect(toMemoryPanelState({ loaded, loading: false, error: null, frame })).toEqual({
      kind: "ready",
      items: loaded,
    });
  });

  it("forgetting the last memory leaves the panel empty: the turn's memories never come back", () => {
    expect(toMemoryPanelState({ loaded: [], loading: false, error: null, frame }).kind).toBe("empty");
  });

  it("a refresh after an action keeps showing the loaded list, not a skeleton", () => {
    expect(toMemoryPanelState({ loaded, loading: true, error: null, frame: [] })).toEqual({
      kind: "ready",
      items: loaded,
    });
  });

  it("an outage is an error, never empty", () => {
    const state = toMemoryPanelState({ loaded: undefined, loading: false, error: new Error("503"), frame: [] });
    expect(state.kind).toBe("error");
  });

  it("a Retry in flight after an outage shows loading, not the old error", () => {
    expect(toMemoryPanelState({ loaded: undefined, loading: true, error: new Error("503"), frame: [] }).kind).toBe("loading");
  });

  it("a response in a shape the page doesn't understand says so, not 'can't reach'", () => {
    const state = toMemoryPanelState({
      loaded: undefined,
      loading: false,
      error: new ContractError("memories response.memories", "a list"),
      frame: [],
    });
    expect(state.kind).toBe("error");
    if (state.kind === "error") expect(state.headline).toMatch(/shape this page doesn't understand/);
  });
});
