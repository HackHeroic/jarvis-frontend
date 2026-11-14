/**
 * The backend's response shapes, as literal samples copied from the Jarvis-Engine
 * API tests (tests/test_you_api.py, tests/test_anticipation_api.py,
 * tests/test_memories_api.py) and the response models they validate against
 * (app/api/v1/endpoints/{you,anticipation,memories}.py). A field renamed on
 * either side fails here, not on screen.
 */
import { describe, expect, it } from "vitest";
import {
  ContractError,
  parseAcceptResponse,
  parseDraftState,
  parseMemoryList,
  parseMemoryOut,
  parseRunTriggerResponse,
  parseSuggestion,
  parseSuggestionList,
  parseYouProfile,
  parseYouResponse,
} from "@/lib/contracts";
import { toPanelMemory } from "@/lib/transforms";

const MARATHON = "Training for the Mumbai marathon in March";

/** MemoryOut — test_memories_api._MEMORY_OUT_FIELDS, test_you_api._MEMORY. */
const MEMORY_OUT = {
  memory_id: "6f1c2a4e-1d2b-4c3d-8e9f-0a1b2c3d4e5f",
  memory_type: "goal",
  content: MARATHON,
  confidence: 0.8,
  provenance: "said",
  freshness: 0.9998,
  noted_at: "2026-11-14T08:00:00.123456Z",
  last_confirmed_at: null,
  observation_count: 1,
  pattern_key: null,
};

function hours() {
  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    score: hour === 9 ? 0.32 : 0.6,
    done: 0,
    not_done: hour === 9 ? 3 : 0,
  }));
}

/** YouResponse — test_you_api.test_you_api__get__matches_response_model. */
const YOU = {
  profile: {
    display_name: null,
    timezone: "Asia/Kolkata",
    wake_time: "07:00",
    autonomy_mode: "ask_first",
  },
  patterns: [
    {
      memory_id: "0d9a7c1e-5b44-4f0e-9d7a-3c2b1a0f9e8d",
      pattern_key: "skip_time_window:9",
      detector: "skip_time_window",
      description: "User avoids tasks during hour 9 (3 of 3 set aside)",
      confidence: 1.0,
      occurrences: 3,
      evidence: [
        "set aside Fri 13 Nov 09:00 · Morning task",
        "set aside Thu 12 Nov 09:00 · Morning task",
        "set aside Wed 11 Nov 09:00 · Morning task",
      ],
      confirmed: false,
    },
  ],
  rules: [
    {
      id: "00000000-0000-4000-8000-0000000a11ce",
      text: "No work after 10 PM",
      provenance: "said",
      created_at: "2026-11-14T08:00:00Z",
    },
  ],
  memories: [MEMORY_OUT],
  focus: { source: "prior", observations: 3, hours: hours() },
  receipt: {
    since: "2026-10-15T10:00:00.000001Z",
    truncated: false,
    on_device_calls: 1,
    cloud_calls: 0,
    pii_redactions: 0,
    input_tokens: 120,
    output_tokens: 30,
  },
};

/**
 * SuggestionOut as the real triggers make it (app/services/anticipation/triggers.py):
 * `kind` is the trigger name; `details` is the action's to_payload() (actions.py).
 */
const SUGGESTION = {
  id: "3b2f0c1a-7d6e-4f5a-9b8c-1d2e3f4a5b6c",
  trigger: "morning_brief",
  kind: "morning_brief",
  title: "Today is ready",
  body: "4 tasks are planned for today; the hardest, 'Graph DP set', is at 19:00 — your strongest hour.\n2 from yesterday found a new slot.",
  status: "pending",
  consent_behavior: "ask",
  consent_kind: "mode_decision",
  consent_reason: "This changes your schedule, so I'm asking first.",
  created_at: "2026-11-14T01:35:00Z",
  expires_at: "2026-11-14T18:29:59.999999Z",
  details: {
    kind: "apply_plan",
    dedupe_key: "apply_plan:9c0e6f1d-2a3b-4c5d-8e7f-6a5b4c3d2e1f",
    draft_id: "9c0e6f1d-2a3b-4c5d-8e7f-6a5b4c3d2e1f",
  },
};

/** A PatternRuleTrigger suggestion: AdoptRuleAction.to_payload() as its details. */
const PATTERN_RULE = {
  ...SUGGESTION,
  id: "5e4d3c2b-1a09-4f8e-9d7c-6b5a4f3e2d1c",
  trigger: "pattern_rule",
  kind: "pattern_rule",
  title: "A pattern around 9 AM",
  body: "You've set aside 3 of the last 3 tasks around 9 AM. Want me to stop putting demanding work there?",
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
};

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

describe("GET /api/v1/you", () => {
  it("parses the backend's sample, every section", () => {
    const you = parseYouResponse(clone(YOU));
    expect(you.profile).toEqual(YOU.profile);
    expect(you.patterns[0].pattern_key).toBe("skip_time_window:9");
    expect(you.patterns[0].evidence).toHaveLength(3);
    expect(you.rules[0]).toEqual(YOU.rules[0]);
    expect(you.memories[0].memory_id).toBe(MEMORY_OUT.memory_id);
    expect(you.memories[0].noted_at).toBe(MEMORY_OUT.noted_at);
    expect(you.focus.source).toBe("prior");
    expect(you.focus.hours.map((h) => h.hour)).toEqual(Array.from({ length: 24 }, (_, i) => i));
    expect(you.receipt.truncated).toBe(false);
    expect(you.receipt.since).toBe(YOU.receipt.since);
  });

  it("a pattern not yet remembered has a null memory_id", () => {
    const body = clone(YOU);
    (body.patterns[0] as { memory_id: string | null }).memory_id = null;
    expect(parseYouResponse(body).patterns[0].memory_id).toBeNull();
  });

  it("a rule older than the stamp has a null created_at", () => {
    const body = clone(YOU);
    (body.rules[0] as { created_at: string | null }).created_at = null;
    expect(parseYouResponse(body).rules[0].created_at).toBeNull();
  });

  it.each([
    ["the receipt's window", (b: typeof YOU) => delete (b.receipt as Partial<typeof YOU.receipt>).since],
    ["the receipt's truncation flag", (b: typeof YOU) => delete (b.receipt as Partial<typeof YOU.receipt>).truncated],
    ["a memory's noted_at", (b: typeof YOU) => delete (b.memories[0] as Partial<typeof MEMORY_OUT>).noted_at],
    ["a memory's memory_id", (b: typeof YOU) => delete (b.memories[0] as Partial<typeof MEMORY_OUT>).memory_id],
    ["the focus source", (b: typeof YOU) => delete (b.focus as Partial<typeof YOU.focus>).source],
    ["a rule's provenance", (b: typeof YOU) => delete (b.rules[0] as Partial<(typeof YOU.rules)[0]>).provenance],
    ["a pattern's evidence", (b: typeof YOU) => delete (b.patterns[0] as Partial<(typeof YOU.patterns)[0]>).evidence],
  ])("a missing field (%s) is a contract error, never a blank row", (_name, drop) => {
    const body = clone(YOU);
    drop(body);
    expect(() => parseYouResponse(body)).toThrow(ContractError);
  });

  it("an unknown provenance is a contract error", () => {
    const body = clone(YOU);
    body.memories[0].provenance = "user";
    expect(() => parseYouResponse(body)).toThrow(ContractError);
  });

  it("a focus profile without 24 hours is a contract error", () => {
    const body = clone(YOU);
    body.focus.hours = body.focus.hours.slice(0, 23);
    expect(() => parseYouResponse(body)).toThrow(ContractError);
  });

  it("the old memory field names (id, created_at, source) are not accepted", () => {
    const legacy = { id: "m1", memory_type: "goal", content: MARATHON, confidence: 0.8, source: "user", created_at: "2026-11-14T08:00:00Z" };
    expect(() => parseMemoryOut(legacy)).toThrow(ContractError);
  });
});

describe("PATCH /api/v1/you/settings", () => {
  it("parses the 200 body (test_you_api: the profile after the change)", () => {
    const body = {
      display_name: null,
      timezone: "Europe/London",
      wake_time: "06:30",
      autonomy_mode: "suggest_only",
    };
    expect(parseYouProfile(body)).toEqual(body);
  });

  it("rejects an autonomy mode the backend does not have", () => {
    expect(() =>
      parseYouProfile({ display_name: null, timezone: "UTC", wake_time: "07:00", autonomy_mode: "yolo" }),
    ).toThrow(ContractError);
  });
});

describe("/api/v1/memories", () => {
  it("GET / parses {memories, count}", () => {
    const pattern = {
      ...MEMORY_OUT,
      memory_id: "a1b2c3d4-0000-4000-8000-000000000009",
      memory_type: "behavioral_pattern",
      content: "Skips work around 9 AM",
      provenance: "inferred",
      pattern_key: "skip_time_window:9",
      last_confirmed_at: "2026-11-14T09:00:00Z",
      observation_count: 3,
    };
    const list = parseMemoryList({ memories: [MEMORY_OUT, pattern], count: 2 });
    expect(list.map((m) => m.provenance)).toEqual(["said", "inferred"]);
    expect(list[1].pattern_key).toBe("skip_time_window:9");
  });

  it("GET / for a user with nothing remembered is an empty list", () => {
    expect(parseMemoryList({ memories: [], count: 0 })).toEqual([]);
  });

  it("confirm / dismiss answer one MemoryOut", () => {
    const confirmed = { ...MEMORY_OUT, confidence: 0.9, freshness: 1.0, last_confirmed_at: "2026-11-14T10:00:00Z" };
    expect(parseMemoryOut(confirmed).confidence).toBe(0.9);
  });
});

describe("chat complete frame: panel memories", () => {
  it("the recalled shape {memory_id, memory_type, content, confidence, provenance}", () => {
    const panel = toPanelMemory({
      memory_id: "m1",
      memory_type: "preference",
      content: "Prefers evenings for deep work",
      confidence: 0.7,
      provenance: "inferred",
    });
    expect(panel).toEqual({
      memory_id: "m1",
      memory_type: "preference",
      content: "Prefers evenings for deep work",
      confidence: 0.7,
      provenance: "inferred",
    });
  });

  it("today's shape without an id still shows, with no actions (memory_id null)", () => {
    const panel = toPanelMemory({ memory_type: "goal", content: MARATHON, confidence: 0.5 });
    expect(panel?.memory_id).toBeNull();
    expect(panel?.provenance).toBeUndefined();
  });

  it("an item without content is dropped", () => {
    expect(toPanelMemory({ memory_id: "m1", memory_type: "goal", content: "  " })).toBeNull();
    expect(toPanelMemory(null)).toBeNull();
  });
});

describe("/api/v1/anticipation", () => {
  it("GET /suggestions parses the pending list: a morning brief and a pattern rule", () => {
    const [brief, rule] = parseSuggestionList({ suggestions: [clone(SUGGESTION), clone(PATTERN_RULE)] });
    expect(brief.kind).toBe("morning_brief");
    expect(brief.consent_kind).toBe("mode_decision");
    expect(brief.details).toEqual(SUGGESTION.details);
    expect(rule.kind).toBe("pattern_rule");
    expect(rule.details).toMatchObject({ hour: 9, confidence: 1.0, occurrences: 3 });
  });

  it("the API test's suggestion (FakeAction payload with hours) parses too", () => {
    const fake = {
      ...clone(SUGGESTION),
      kind: "replan",
      title: "A lighter morning",
      body: "Two tasks found a new slot this afternoon.",
      expires_at: null,
      details: { kind: "fake_action", dedupe_key: "fake_action", hours: null },
    };
    expect(parseSuggestion(fake).details).toEqual({ kind: "fake_action", dedupe_key: "fake_action", hours: null });
  });

  it("GET /suggestions for a new user is {suggestions: []}", () => {
    expect(parseSuggestionList({ suggestions: [] })).toEqual([]);
  });

  it("an older suggestion has a null consent_kind", () => {
    expect(parseSuggestion({ ...clone(SUGGESTION), consent_kind: null }).consent_kind).toBeNull();
  });

  it("a suggestion without its details is a contract error", () => {
    const body: Record<string, unknown> = clone(SUGGESTION);
    delete body.details;
    expect(() => parseSuggestion(body)).toThrow(ContractError);
  });

  it("POST /accept of the brief: ApplyDraftAction's result (tasks written and the draft id)", () => {
    const accepted = parseAcceptResponse({
      suggestion: { ...clone(SUGGESTION), status: "accepted" },
      result: {
        kind: "apply_plan",
        message: "Done — today's plan is in place.",
        tasks_written: 4,
        draft_id: SUGGESTION.details.draft_id,
      },
    });
    expect(accepted.suggestion.status).toBe("accepted");
    expect(accepted.result.tasks_written).toBe(4);
    expect(accepted.result.draft_id).toBe(SUGGESTION.details.draft_id);
  });

  it("POST /accept of a pattern rule: AdoptRuleAction's result (a draft to review, no tasks)", () => {
    const accepted = parseAcceptResponse({
      suggestion: { ...clone(PATTERN_RULE), status: "accepted" },
      result: {
        kind: "adopt_rule",
        message: "Saved. I've drafted a plan that keeps 9 AM free — accept it when it suits you.",
        tasks_written: null,
        draft_id: "d-rule",
      },
    });
    expect(accepted.result.tasks_written).toBeNull();
    expect(accepted.result.draft_id).toBe("d-rule");
  });

  it("POST /accept without a result is a contract error", () => {
    expect(() => parseAcceptResponse({ suggestion: clone(SUGGESTION) })).toThrow(ContractError);
  });

  it("POST /dismiss answers one SuggestionOut", () => {
    expect(parseSuggestion({ ...clone(SUGGESTION), status: "dismissed" }).status).toBe("dismissed");
  });

  it("POST /run parses created-with-consent (test_anticipation_api)", () => {
    const run = parseRunTriggerResponse({
      status: "created",
      suggestion: clone(SUGGESTION),
      consent: {
        behavior: "ask",
        kind: "mode_decision",
        message: "This changes your schedule, so I'm asking first.",
      },
    });
    expect(run.status).toBe("created");
    expect(run.suggestion?.trigger).toBe("morning_brief");
    expect(run.consent?.behavior).toBe("ask");
  });

  it("POST /run with nothing to say has null suggestion and consent", () => {
    const run = parseRunTriggerResponse({ status: "nothing_to_say", suggestion: null, consent: null });
    expect(run).toEqual({ status: "nothing_to_say", suggestion: null, consent: null });
  });
});

/**
 * GET /api/v1/drafts/{id} — tests/test_draft_endpoints.py
 * ::test_get_draft__solved_draft__schedule_slots_with_local_times, literally.
 */
const DRAFT_WITH_SLOTS = {
  draft_id: "8f1d2c3b-4a5e-4f60-9a7b-6c5d4e3f2a1b",
  user_id: "test_user",
  goal_id: null,
  tasks: [
    { task_id: "t1", title: "Read ch1", duration_minutes: 25 },
    { task_id: "t2", title: "Practice problems", duration_minutes: 20 },
    { task_id: "t3", title: "Not placed", duration_minutes: 25 },
  ],
  horizon_start: "2026-11-16T08:00:00+05:30",
  status: "pending",
  rejection_reason: null,
  created_at: "2026-11-14 03:31:00+00:00",
  schedule: {
    horizon_start: "2026-11-16T08:00:00+05:30",
    schedule: {
      t1: {
        task_id: "t1", title: "Read ch1", start_min: 60, end_min: 85,
        start: "2026-11-16T09:00:00+05:30", end: "2026-11-16T09:25:00+05:30",
        duration_minutes: 25,
      },
      t2: {
        task_id: "t2", title: "Practice problems", start_min: 0, end_min: 20,
        start: "2026-11-16T08:00:00+05:30", end: "2026-11-16T08:20:00+05:30",
        duration_minutes: 20,
      },
    },
  },
};

describe("GET /api/v1/drafts/{id}", () => {
  it("parses a solved draft with its slots and local times", () => {
    const draft = parseDraftState(clone(DRAFT_WITH_SLOTS));
    expect(draft.status).toBe("pending");
    expect(draft.tasks).toHaveLength(3);
    expect(draft.schedule?.schedule.t1.start).toBe("2026-11-16T09:00:00+05:30");
    expect(draft.schedule?.schedule.t2.title).toBe("Practice problems");
    expect(draft.schedule?.schedule.t3).toBeUndefined(); // not placed
  });

  it("a draft stored without slots has schedule null (test_get_draft__no_solved_slots__schedule_null)", () => {
    expect(parseDraftState({ ...clone(DRAFT_WITH_SLOTS), schedule: null }).schedule).toBeNull();
  });

  it("a slot without its start instant is a contract error", () => {
    const body = clone(DRAFT_WITH_SLOTS);
    delete (body.schedule.schedule.t1 as Partial<typeof body.schedule.schedule.t1>).start;
    expect(() => parseDraftState(body)).toThrow(ContractError);
  });
});
