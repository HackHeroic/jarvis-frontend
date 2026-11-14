import { describe, expect, it } from "vitest";
import {
  acceptResultMessage,
  createSingleFlight,
  focusCaption,
  freshnessLabel,
  patternToastOf,
  provenanceLabel,
  receiptLine,
  receiptWindow,
  reinsert,
  removeWithRollback,
} from "@/lib/you";
import type { ActionResultOut, FocusProfile, Receipt, SuggestionOut } from "@/lib/types";

const NOW = new Date("2026-11-14T10:00:00Z"); // 15:30 IST

function receipt(over: Partial<Receipt> = {}): Receipt {
  return {
    since: "2026-10-15T10:00:00Z",
    truncated: false,
    on_device_calls: 12,
    cloud_calls: 3,
    pii_redactions: 1,
    input_tokens: 4200,
    output_tokens: 900,
    ...over,
  };
}

function result(over: Partial<ActionResultOut> = {}): ActionResultOut {
  return { kind: "apply_plan", message: "Done.", tasks_written: null, draft_id: null, ...over };
}

function focus(source: "prior" | "learned", observations: number): FocusProfile {
  return {
    source,
    observations,
    hours: Array.from({ length: 24 }, (_, hour) => ({ hour, score: 0.5, done: 0, not_done: 0 })),
  };
}

function suggestion(over: Partial<SuggestionOut> = {}): SuggestionOut {
  return {
    id: "s1",
    trigger: "pattern_rule",
    kind: "adopt_rule",
    title: "A pattern around 9 AM",
    body: "You've set aside 3 of the last 3 tasks around 9 AM. Want me to stop putting demanding work there?",
    status: "pending",
    consent_behavior: "ask",
    consent_kind: "mode_decision",
    consent_reason: "This changes your schedule, so I'm asking first.",
    created_at: "2026-11-14T03:30:00Z",
    expires_at: null,
    details: {
      kind: "adopt_rule",
      pattern_key: "skip_time_window:9",
      memory_id: "m-9",
      confidence: 0.9,
      occurrences: 3,
    },
    ...over,
  };
}

describe("freshnessLabel", () => {
  it("a memory noted earlier today reads 'noted today'", () => {
    expect(freshnessLabel("2026-11-14T04:00:00Z", NOW, "Asia/Kolkata")).toBe("noted today");
  });

  it("one calendar day back reads 'noted yesterday'", () => {
    expect(freshnessLabel("2026-11-13T10:00:00Z", NOW, "Asia/Kolkata")).toBe("noted yesterday");
  });

  it("twelve days back reads 'noted 12 days ago'", () => {
    expect(freshnessLabel("2026-11-02T10:00:00Z", NOW, "Asia/Kolkata")).toBe("noted 12 days ago");
  });

  it("counts days on the user's clock: 00:30 IST is today in IST, yesterday in UTC", () => {
    const justAfterIstMidnight = "2026-11-13T19:00:00Z"; // 00:30 IST on 14 Nov
    expect(freshnessLabel(justAfterIstMidnight, NOW, "Asia/Kolkata")).toBe("noted today");
    expect(freshnessLabel(justAfterIstMidnight, NOW, "UTC")).toBe("noted yesterday");
  });

  it("a stamp a little in the future (clock skew) still reads 'noted today'", () => {
    expect(freshnessLabel("2026-11-14T10:05:00Z", NOW, "UTC")).toBe("noted today");
  });

  it("an unreadable stamp shows nothing rather than a wrong age", () => {
    expect(freshnessLabel("not a date", NOW, "UTC")).toBe("");
  });
});

describe("provenanceLabel", () => {
  it("'said' is the user's own words", () => {
    expect(provenanceLabel("said")).toBe("you said");
  });

  it("'inferred' is what Jarvis noticed", () => {
    expect(provenanceLabel("inferred")).toBe("I noticed");
  });
});

describe("receiptLine", () => {
  it("plural redactions", () => {
    expect(receiptLine(receipt({ pii_redactions: 2 }))).toBe(
      "12 on this device · 3 sent to the cloud · 2 redactions",
    );
  });

  it("a single redaction is singular", () => {
    expect(receiptLine(receipt())).toBe("12 on this device · 3 sent to the cloud · 1 redaction");
  });

  it("zero redactions are plural and the cloud is never named by vendor", () => {
    const line = receiptLine(receipt({ cloud_calls: 0, pii_redactions: 0 }));
    expect(line).toBe("12 on this device · 0 sent to the cloud · 0 redactions");
    expect(line).not.toMatch(/gemini|claude|anthropic|google/i);
  });

  it("a truncated read says 'at least' for every count", () => {
    expect(receiptLine(receipt({ truncated: true }))).toBe(
      "at least 12 on this device · at least 3 sent to the cloud · at least 1 redaction",
    );
  });
});

describe("receiptWindow", () => {
  it("names the window the counts cover, never 'all time'", () => {
    expect(receiptWindow("2026-10-15T10:00:00Z", NOW)).toBe("in the last 30 days");
  });

  it("a window opened a moment ago (rounding) still reads in whole days", () => {
    expect(receiptWindow("2026-10-15T09:59:58Z", NOW)).toBe("in the last 30 days");
  });

  it("a one-day window is singular", () => {
    expect(receiptWindow("2026-11-13T10:00:00Z", NOW)).toBe("in the last day");
  });
});

describe("acceptResultMessage", () => {
  it("tasks written reads as what is on today's plan", () => {
    expect(acceptResultMessage(result({ tasks_written: 4 }))).toBe("4 tasks are on today's plan.");
  });

  it("one task written is singular", () => {
    expect(acceptResultMessage(result({ tasks_written: 1 }))).toBe("1 task is on today's plan.");
  });

  it("a proposed draft uses the backend's own message", () => {
    const message = "Saved. I've drafted a plan that keeps 9 AM free — accept it when it suits you.";
    expect(acceptResultMessage(result({ kind: "adopt_rule", draft_id: "d1", message }))).toBe(message);
  });

  it("zero tasks written is never a count claim: the backend's message is used", () => {
    expect(acceptResultMessage(result({ tasks_written: 0, message: "Nothing to add." }))).toBe(
      "Nothing to add.",
    );
  });
});

describe("focusCaption", () => {
  it("a learned profile says how many outcomes it rests on", () => {
    expect(focusCaption(focus("learned", 18))).toBe("Learned from 18 outcomes");
  });

  it("the prior is a starting guess, never 'learned', even with some outcomes", () => {
    const caption = focusCaption(focus("prior", 3));
    expect(caption).toBe("Not enough history yet — this is a starting guess");
    expect(caption).not.toMatch(/learned/i);
  });
});

describe("patternToastOf", () => {
  it("a strong, recurring pattern_rule suggestion toasts", () => {
    const toast = patternToastOf(suggestion());
    expect(toast).not.toBeNull();
    expect(toast?.confidence).toBe(0.9);
    expect(toast?.occurrence_count).toBe(3);
    expect(toast?.memory_id).toBe("m-9");
    expect(toast?.content).toContain("set aside");
  });

  it("confidence under 0.7 does not toast", () => {
    expect(patternToastOf(suggestion({ details: { confidence: 0.69, occurrences: 5 } }))).toBeNull();
  });

  it("fewer than three occurrences does not toast", () => {
    expect(patternToastOf(suggestion({ details: { confidence: 0.95, occurrences: 2 } }))).toBeNull();
  });

  it("details without the numbers do not toast (no guessing)", () => {
    expect(patternToastOf(suggestion({ details: { kind: "adopt_rule" } }))).toBeNull();
  });

  it("only pattern_rule suggestions toast", () => {
    expect(patternToastOf(suggestion({ trigger: "morning_brief" }))).toBeNull();
  });
});

describe("reinsert (roll back an optimistic removal)", () => {
  const key = (s: string) => s;

  it("puts the item back where it was", () => {
    expect(reinsert(["a", "c"], "b", 1, key)).toEqual(["a", "b", "c"]);
  });

  it("does not duplicate an item that is already back", () => {
    expect(reinsert(["a", "b", "c"], "b", 1, key)).toEqual(["a", "b", "c"]);
  });

  it("an index past the end appends", () => {
    expect(reinsert(["a"], "z", 5, key)).toEqual(["a", "z"]);
  });
});

describe("createSingleFlight (double-click guard)", () => {
  it("a second run with the same key while the first is in flight does nothing", async () => {
    const flight = createSingleFlight();
    let calls = 0;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const fn = async () => {
      calls += 1;
      await gate;
      return "ok";
    };

    const first = flight.run("s1", fn);
    const second = flight.run("s1", fn);

    expect(first).not.toBeNull();
    expect(second).toBeNull();
    expect(flight.busy("s1")).toBe(true);
    release();
    await expect(first).resolves.toBe("ok");
    expect(calls).toBe(1);
    expect(flight.busy("s1")).toBe(false);
  });

  it("the key frees up after a failure, so a retry can run", async () => {
    const flight = createSingleFlight();
    await expect(flight.run("s1", async () => Promise.reject(new Error("503")))).rejects.toThrow("503");
    expect(flight.busy("s1")).toBe(false);
    await expect(flight.run("s1", async () => "again")).resolves.toBe("again");
  });

  it("different keys run independently", () => {
    const flight = createSingleFlight();
    const never = () => new Promise<void>(() => {});
    expect(flight.run("a", never)).not.toBeNull();
    expect(flight.run("b", never)).not.toBeNull();
  });
});

describe("removeWithRollback (forget / dismiss / remove a rule)", () => {
  type Row = { id: string };
  const key = (r: Row) => r.id;

  function harness(initial: string[]) {
    let items: Row[] = initial.map((id) => ({ id }));
    const seen: string[][] = [];
    const setItems = (update: (rows: Row[]) => Row[]) => {
      items = update(items);
      seen.push(items.map(key));
    };
    return { setItems, seen, now: () => items.map(key) };
  }

  it("removes at once and keeps it removed when the request succeeds", async () => {
    const h = harness(["a", "b", "c"]);
    const outcome = await removeWithRollback({
      item: { id: "b" }, index: 1, key, setItems: h.setItems, request: async () => undefined,
    });
    expect(outcome).toBeNull();
    expect(h.seen[0]).toEqual(["a", "c"]); // optimistic, before the request settles
    expect(h.now()).toEqual(["a", "c"]);
  });

  it("puts it back where it was and returns the error when the request fails", async () => {
    const h = harness(["a", "b", "c"]);
    const failure = Object.assign(new Error("503"), { status: 503 });
    const outcome = await removeWithRollback({
      item: { id: "b" }, index: 1, key, setItems: h.setItems,
      request: async () => { throw failure; },
    });
    expect(outcome).toBe(failure);
    expect(h.seen[0]).toEqual(["a", "c"]);
    expect(h.now()).toEqual(["a", "b", "c"]);
  });

  it("an error that means 'already gone' (404) counts as done: no rollback", async () => {
    const h = harness(["a", "b"]);
    const outcome = await removeWithRollback({
      item: { id: "b" }, index: 1, key, setItems: h.setItems,
      request: async () => { throw Object.assign(new Error("404"), { status: 404 }); },
      isGone: (err) => (err as { status?: number }).status === 404,
    });
    expect(outcome).toBeNull();
    expect(h.now()).toEqual(["a"]);
  });
});
