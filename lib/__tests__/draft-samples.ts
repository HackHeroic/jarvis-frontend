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
