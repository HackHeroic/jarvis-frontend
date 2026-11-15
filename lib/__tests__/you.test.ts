import { describe, expect, it } from "vitest";
import {
  AUTONOMY_OPTIONS,
  acceptResultMessage,
  briefLines,
  checkNowOutcome,
  createSingleFlight,
  draftAwaitingReview,
  draftToChatResponse,
  focusCaption,
  freshnessLabel,
  groupMemories,
  hourIsObserved,
  MEMORY_MAX_CHARS,
  memoryEditCheck,
  provenanceLabel,
  receiptLine,
  receiptWindow,
  reinsert,
  removeWithRollback,
  strongestObservedHour,
} from "@/lib/you";
import type {
  ActionResultOut,
  DraftState,
  FocusProfile,
  Receipt,
  RunTriggerResponse,
  SuggestionOut,
} from "@/lib/types";

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

/**
 * A pattern_rule suggestion exactly as the backend stores it: `kind` is the
 * trigger name, `details` is AdoptRuleAction.to_payload()
 * (app/services/anticipation/{triggers,actions}.py).
 */
function patternRule(over: Partial<SuggestionOut> = {}): SuggestionOut {
  return {
    id: "s-rule",
    trigger: "pattern_rule",
    kind: "pattern_rule",
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
      dedupe_key: "pattern_rule:skip_time_window:9",
      pattern_key: "skip_time_window:9",
      hour: 9,
      memory_id: "0d9a7c1e-5b44-4f0e-9d7a-3c2b1a0f9e8d",
      confidence: 1.0,
      occurrences: 3,
    },
    ...over,
  };
}

/** The morning brief: `kind` "morning_brief", details ApplyDraftAction.to_payload(). */
function morningBrief(over: Partial<SuggestionOut> = {}): SuggestionOut {
  return {
    ...patternRule(),
    id: "s-brief",
    trigger: "morning_brief",
    kind: "morning_brief",
    title: "Today is ready",
    body: "4 tasks are planned for today; the hardest, 'Graph DP set', is at 19:00.",
    expires_at: "2026-11-14T18:29:59.999999Z",
    details: { kind: "apply_plan", dedupe_key: "apply_plan:d-brief", draft_id: "d-brief" },
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

  it("tasks_written wins over draft_id (the brief's accept returns both)", () => {
    const brief = result({
      kind: "apply_plan",
      message: "Done — today's plan is in place.",
      tasks_written: 4,
      draft_id: "d-brief",
    });
    expect(acceptResultMessage(brief)).toBe("4 tasks are on today's plan.");
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

describe("draftAwaitingReview (what an accept leaves to review)", () => {
  const ruleWithDraft = result({
    kind: "adopt_rule",
    message: "Saved. I've drafted a plan that keeps 9 AM free — accept it when it suits you.",
    draft_id: "d-rule",
  });

  it("a pattern_rule accept that drafted a plan leaves that draft to review", () => {
    expect(draftAwaitingReview(patternRule(), ruleWithDraft)).toBe("d-rule");
  });

  it("a pattern_rule accept with no draft leaves nothing", () => {
    const saved = result({ kind: "adopt_rule", message: "Saved. Every plan from now on keeps 9 AM free." });
    expect(draftAwaitingReview(patternRule(), saved)).toBeNull();
  });

  it("the morning brief's draft_id is already applied: tasks_written wins, nothing to review", () => {
    const applied = result({
      kind: "apply_plan",
      message: "Done — today's plan is in place.",
      tasks_written: 4,
      draft_id: "d-brief",
    });
    expect(draftAwaitingReview(morningBrief(), applied)).toBeNull();
  });

  it("decides by the suggestion's kind, never by draft_id alone", () => {
    expect(draftAwaitingReview(morningBrief(), result({ draft_id: "d-x", tasks_written: null }))).toBeNull();
  });
});

describe("draftToChatResponse (the dashboard's pending-draft banner)", () => {
  const draft: DraftState = {
    draft_id: "d-rule",
    user_id: "demo",
    goal_id: null,
    tasks: [{ task_id: "t1", title: "Graph DP set" }],
    horizon_start: "2026-11-14T08:00:00+05:30",
    status: "pending",
    rejection_reason: null,
    created_at: "2026-11-14T03:31:00+00:00",
    version: "0a1b2c3d4e5f6071",
  };

  it("an open draft becomes a draft response carrying its id and the backend's words", () => {
    const response = draftToChatResponse(draft, "Saved. I've drafted a plan that keeps 9 AM free — accept it when it suits you.");
    expect(response?.draft_id).toBe("d-rule");
    expect(response?.schedule_status).toBe("draft");
    expect(response?.message).toContain("keeps 9 AM free");
  });

  it("is tagged as a suggestion's plan, so the banner acts on it in place (chat can't show it)", () => {
    expect(draftToChatResponse(draft, "x")?.draft_source).toBe("suggestion");
  });

  it("a closed draft (accepted, superseded…) is not offered for review", () => {
    expect(draftToChatResponse({ ...draft, status: "superseded" }, "x")).toBeNull();
    expect(draftToChatResponse({ ...draft, status: "accepted" }, "x")).toBeNull();
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

describe("checkNowOutcome (what a 'Check now' run says)", () => {
  const run = (over: Partial<RunTriggerResponse>): RunTriggerResponse => ({
    status: "nothing_to_say",
    suggestion: null,
    consent: null,
    ...over,
  });

  it("created and waiting for the user: the card appears, no note", () => {
    const brief = morningBrief();
    expect(
      checkNowOutcome(
        run({
          status: "created",
          suggestion: brief,
          consent: { behavior: "ask", kind: "mode_decision", message: "This changes your schedule, so I'm asking first." },
        }),
      ),
    ).toEqual({ card: brief, note: null, tasksChanged: false });
  });

  it("created and applied on its own (allow): no card to act on, a note, and the plan changed", () => {
    const applied = morningBrief({ status: "auto_applied" });
    expect(checkNowOutcome(run({ status: "created", suggestion: applied }))).toEqual({
      card: null,
      note: { text: "Done on its own: Today is ready.", tone: "quiet" },
      tasksChanged: true,
    });
  });

  it("already done today: says so, and brings back today's card if it is still waiting", () => {
    const brief = morningBrief();
    expect(checkNowOutcome(run({ status: "already_done", suggestion: brief }))).toEqual({
      card: brief,
      note: { text: "Today's brief is already here.", tone: "quiet" },
      tasksChanged: false,
    });
    expect(checkNowOutcome(run({ status: "already_done", suggestion: morningBrief({ status: "dismissed" }) })).card).toBeNull();
    expect(checkNowOutcome(run({ status: "already_done", suggestion: null })).note?.text).toBe(
      "Today's brief is already here.",
    );
  });

  it("nothing to say (or not due): an honest 'nothing needs you'", () => {
    for (const status of ["nothing_to_say", "not_due"] as const) {
      expect(checkNowOutcome(run({ status }))).toEqual({
        card: null,
        note: { text: "Nothing needs your attention right now.", tone: "quiet" },
        tasksChanged: false,
      });
    }
  });

  it("denied: the consent rule's own words say why Jarvis did not act", () => {
    const outcome = checkNowOutcome(
      run({
        status: "denied",
        consent: { behavior: "deny", kind: "rule_match", message: 'You already told me: "No work after 10 PM".' },
      }),
    );
    expect(outcome).toEqual({
      card: null,
      note: { text: "I held off.", detail: 'You already told me: "No work after 10 PM".', tone: "consent" },
      tasksChanged: false,
    });
  });

  it("denied without a message still says it held off, never a success", () => {
    expect(checkNowOutcome(run({ status: "denied", consent: null })).note).toEqual({
      text: "I held off.",
      tone: "consent",
    });
  });
});

describe("briefLines (a suggestion body, one line per line)", () => {
  it("splits on newlines, trims, and drops blank lines", () => {
    const body =
      "1 task is planned for today; the hardest, 'Revise Operating Systems lecture notes', is at 15:20.\n1 from yesterday found a new slot.\n\n  I noticed you tend to set work aside around 9 AM (14 of the last 15 times).  ";
    expect(briefLines(body)).toEqual([
      { text: "1 task is planned for today; the hardest, 'Revise Operating Systems lecture notes', is at 15:20.", noticed: false },
      { text: "1 from yesterday found a new slot.", noticed: false },
      { text: "I noticed you tend to set work aside around 9 AM (14 of the last 15 times).", noticed: true },
    ]);
  });

  it("a one-line body is one line; Windows newlines split too", () => {
    expect(briefLines("Want me to keep that hour clear?")).toEqual([
      { text: "Want me to keep that hour clear?", noticed: false },
    ]);
    expect(briefLines("a\r\nb").map((l) => l.text)).toEqual(["a", "b"]);
  });
});

describe("the focus chart's evidence", () => {
  function profile(source: "prior" | "learned", hours: [number, number, number, number][]): FocusProfile {
    const base = focus(source, 40);
    for (const [hour, score, done, notDone] of hours) {
      base.hours[hour] = { hour, score, done, not_done: notDone };
    }
    return base;
  }

  it("an hour with no outcomes is the starting assumption, not evidence", () => {
    expect(hourIsObserved({ hour: 7, score: 0.7, done: 0, not_done: 0 })).toBe(false);
    expect(hourIsObserved({ hour: 9, score: 0.2, done: 1, not_done: 14 })).toBe(true);
  });

  it("the strongest hour is the best-scoring hour that has outcomes behind it", () => {
    // 7 AM scores 0.95 but rests on nothing; 7 PM rests on 30 outcomes.
    const f = profile("learned", [
      [7, 0.95, 0, 0],
      [19, 0.9, 28, 2],
      [20, 0.88, 14, 1],
    ]);
    expect(strongestObservedHour(f)?.hour).toBe(19);
  });

  it("no strongest hour on the prior, or when no hour has outcomes", () => {
    expect(strongestObservedHour(profile("prior", [[19, 0.9, 28, 2]]))).toBeNull();
    expect(strongestObservedHour(focus("learned", 0))).toBeNull();
  });

  it("a tie goes to the hour with more outcomes behind it", () => {
    const f = profile("learned", [
      [10, 0.8, 2, 0],
      [19, 0.8, 20, 5],
    ]);
    expect(strongestObservedHour(f)?.hour).toBe(19);
  });
});

describe("AUTONOMY_OPTIONS", () => {
  it("'Small changes on its own' says honestly that it behaves like Ask first for now", () => {
    const auto = AUTONOMY_OPTIONS.find((o) => o.value === "auto_low_risk");
    expect(auto?.note).toBe("Nothing counts as a small change yet, so this behaves like Ask first for now.");
    expect(AUTONOMY_OPTIONS.filter((o) => o.note)).toHaveLength(1);
  });
});

describe("groupMemories", () => {
  it("splits said from noticed, each in the order given", () => {
    const memories = [
      { id: "a", provenance: "said" as const },
      { id: "b", provenance: "inferred" as const },
      { id: "c", provenance: "said" as const },
      { id: "d", provenance: "inferred" as const },
    ];
    const { said, noticed } = groupMemories(memories);
    expect(said.map((m) => m.id)).toEqual(["a", "c"]);
    expect(noticed.map((m) => m.id)).toEqual(["b", "d"]);
  });

  it("a provenance that is not 'said' is never shown as the user's own words", () => {
    const { said, noticed } = groupMemories([{ provenance: "unknown" as unknown as "said" }]);
    expect(said).toEqual([]);
    expect(noticed).toHaveLength(1);
  });

  it("none is two empty groups", () => {
    expect(groupMemories([])).toEqual({ said: [], noticed: [] });
  });
});

describe("memoryEditCheck", () => {
  const ORIGINAL = "Goes to the gym every weekday at 6 PM";

  it("new words can be saved", () => {
    expect(memoryEditCheck("Goes to the gym every weekday at 7 AM", ORIGINAL)).toEqual({ canSave: true, problem: null });
  });

  it("the same words (spacing aside) have nothing to save, and no complaint", () => {
    expect(memoryEditCheck(`  ${ORIGINAL} `, ORIGINAL)).toEqual({ canSave: false, problem: null });
  });

  it("blank words cannot be saved, and say why", () => {
    expect(memoryEditCheck("   ", ORIGINAL)).toEqual({ canSave: false, problem: "A memory needs at least one word." });
  });

  it("words past the backend's limit cannot be saved, and say why", () => {
    const check = memoryEditCheck("x".repeat(MEMORY_MAX_CHARS + 1), ORIGINAL);
    expect(check.canSave).toBe(false);
    expect(check.problem).toBe("That's too long — keep it under 2,000 characters.");
    expect(memoryEditCheck("x".repeat(MEMORY_MAX_CHARS), ORIGINAL).canSave).toBe(true);
  });
});
