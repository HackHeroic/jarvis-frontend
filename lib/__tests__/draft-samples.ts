/**
 * What backend 1f8351a answers, literally, for the flow its tests pin
 * (tests/test_drafts_one_path.py::test_rest_accept__edited_after_the_read__409_with_the_latest_and_nothing_written,
 * on tests/test_draft_endpoints.py's solved draft): read the draft, edit t1's title,
 * then accept with the version that was read. Captured by running those requests on
 * the backend's in-memory fakes.
 */

/** `GET /drafts/{id}` before the edit. */
export const DRAFT_READ = {
  draft_id: "3ba3d014-32d3-4154-99bc-cb7a6b15dca0",
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
  created_at: "2026-11-14T14:56:22.252941+00:00",
  schedule: {
    horizon_start: "2026-11-16T08:00:00+05:30",
    schedule: {
      t1: {
        task_id: "t1", title: "Read ch1", start_min: 60, end_min: 85,
        start: "2026-11-16T09:00:00+05:30", end: "2026-11-16T09:25:00+05:30", duration_minutes: 25,
      },
      t2: {
        task_id: "t2", title: "Practice problems", start_min: 0, end_min: 20,
        start: "2026-11-16T08:00:00+05:30", end: "2026-11-16T08:20:00+05:30", duration_minutes: 20,
      },
    },
  },
  version: "37506042eff02067",
};

/** `POST /drafts/{id}/accept` with `expected_version: "37506042eff02067"` after the edit: 409. */
export const STALE_ACCEPT_409 = {
  error: {
    code: "stale_version",
    message: "This plan changed since you looked — here is the latest.",
    details: {
      draft_id: "3ba3d014-32d3-4154-99bc-cb7a6b15dca0",
      expected_version: "37506042eff02067",
      version: "6f2f15015ab658b5",
      draft: {
        draft_id: "3ba3d014-32d3-4154-99bc-cb7a6b15dca0",
        user_id: "test_user",
        goal_id: null,
        tasks: [
          { task_id: "t1", title: "Read ch1 slowly", duration_minutes: 25 },
          { task_id: "t2", title: "Practice problems", duration_minutes: 20 },
          { task_id: "t3", title: "Not placed", duration_minutes: 25 },
        ],
        horizon_start: "2026-11-16T08:00:00+05:30",
        status: "modified",
        rejection_reason: null,
        created_at: "2026-11-14T14:56:22.252941+00:00",
        schedule: {
          horizon_start: "2026-11-16T08:00:00+05:30",
          schedule: {
            t1: {
              task_id: "t1", title: "Read ch1 slowly", start_min: 60, end_min: 85,
              start: "2026-11-16T09:00:00+05:30", end: "2026-11-16T09:25:00+05:30", duration_minutes: 25,
            },
            t2: {
              task_id: "t2", title: "Practice problems", start_min: 0, end_min: 20,
              start: "2026-11-16T08:00:00+05:30", end: "2026-11-16T08:20:00+05:30", duration_minutes: 20,
            },
          },
        },
        version: "6f2f15015ab658b5",
      },
    },
    request_id: "20674e85a6964b07bb15bd9df63bfeb4",
  },
};

/**
 * The chat stream's `complete` frame for a turn that hands over a draft, literally as
 * backend 25a7eab's tests/golden/sse/scripted_planning_turn.sse records it (test_sse_golden.py
 * feeds the turn draft_version "0123456789abcdef"; the golden masks it and the timings,
 * restored here). `draft_version` sits next to `draft_id` and is present only with it.
 */
export const PLANNING_COMPLETE_FRAME = {
  intent: "PLAN_DAY",
  message: "Here's the plan, sir.",
  schedule: { horizon_start: "2026-11-16T08:00:00+05:30", schedule: { t1: { start_min: 0, end_min: 25 } } },
  execution_graph: { decomposition: [{ task_id: "t1", title: "Graphs" }] },
  ingestion_result: null,
  action_proposals: null,
  search_result: null,
  suggested_action: "replan",
  thinking_process: "Three tasks fit before noon.",
  schedule_status: "draft",
  conflict_summary: null,
  draft_id: "draft-1",
  draft_version: "0123456789abcdef",
  saved_constraints: ["never before 11 AM"],
  conversation_id: "sess-1",
  message_id: "msg-reply",
  clarification_options: null,
  memories: null,
  since_last_spoke: null,
  pearl_insights: null,
  generation_metrics: { total_tokens: 1, total_time_s: 0.01, tok_per_sec: 100.0, ttft_ms: null, model: "none (structured response)" },
};

/**
 * A `complete` frame for a turn that hands over no draft (tests/golden/sse/streamed_chat_turn_cloud.sse,
 * the fields that matter): `draft_id` null and no `draft_version` key at all.
 */
export const CHAT_COMPLETE_FRAME = {
  intent: "CHAT",
  message: "Hello there.",
  schedule_status: null,
  conflict_summary: null,
  draft_id: null,
  saved_constraints: null,
  conversation_id: "sess-2",
  message_id: "msg-2",
  pearl_insights: null,
};
