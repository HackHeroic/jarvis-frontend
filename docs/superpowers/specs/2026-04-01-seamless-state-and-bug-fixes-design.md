# Seamless State Layer & Critical Bug Fixes

**Date:** 2026-04-01
**Status:** Active
**Scope:** Fix 3 critical frontend bugs + add shared state foundation + integration tests

---

## Problem Statement

The Jarvis frontend has three critical usability bugs that share a root cause: **fragmented state management**. Each page (dashboard, chat, schedule) reads from different data sources (localStorage keys, independent API calls, local component state) with no synchronization.

### Bug 1: Accept/Reject Buttons Do Nothing Visible
- **Symptom:** User clicks "Accept All" on a draft schedule. Nothing happens — no feedback, no navigation, tasks don't appear in the calendar.
- **Root cause:** `acceptDraftFn()` in `useJarvisChat.ts` calls `POST /api/v1/drafts/{id}/accept` (which works), then calls `promoteDraftToFinal()` (clears localStorage draft). But it doesn't refresh the task list, show any confirmation, or navigate anywhere. The schedule page fetches tasks independently on its own mount — so the newly accepted tasks never appear.

### Bug 2: Schedule View Shows "No Tasks" After View Switch
- **Symptom:** Dashboard shows today's tasks. Schedule page loads, shows tasks in Day view. Switch to Week, switch back to Day — "No tasks scheduled."
- **Root cause:** `schedule/page.tsx` calls `loadTasks()` once on mount via `useEffect`. Day view renders an empty state when `allTasks.length === 0 && viewMode === "day"`. If the fetch returned data initially but state gets stale or the component re-renders with cleared state, the empty state shows. Week/Month views render empty grids without the empty-state guard, so they appear "fine" even with no data. The asymmetry makes it confusing.

### Bug 3: Sidebar Chat Is Disconnected
- **Symptom:** The `AIChatPanel` on dashboard/schedule pages has its own independent message state. It calls the backend with `model_mode: "4b"`, but for any meaningful intent (PLAN_DAY, INGEST_DOCUMENT) it shows "Continue in Chat" instead of the response. When clicked, the main chat opens a fresh conversation — losing all sidebar context.
- **Root cause:** No shared conversation ID between sidebar and main chat. Sidebar has `const [messages, setMessages] = useState<PanelMessage[]>([])` — completely isolated.

### Bug 5: Sidebar Shows Only "Continue in Chat" Link
- **Symptom:** After typing "hi" in the sidebar chat, only a "J" avatar and "Continue in Chat" link appear — no response text visible.
- **Root cause:** The sidebar replaces the response text with a "Continue in Chat" prompt for heavy intents, but even for lightweight intents (GREETING), the response text rendering is minimal.

---

## Solution: Shared State Layer (Approach B)

Introduce a `JarvisContext` React Context that wraps the app layout and serves as the single source of truth for cross-page state. All pages read from this context instead of independent fetches or localStorage reads.

---

## 1. JarvisContext Provider

### File: `lib/context/JarvisContext.tsx`

```typescript
interface JarvisState {
  // Tasks (from GET /api/v1/tasks)
  tasks: ScheduleTask[];
  tasksLoading: boolean;

  // Draft state
  draftResponse: ChatResponse | null;

  // Conversation continuity
  conversationId: string | null;

  // Toast notifications
  toasts: Toast[];
}

interface JarvisActions {
  refreshTasks: () => Promise<void>;
  setDraft: (response: ChatResponse) => void;
  clearDraft: () => void;
  setConversationId: (id: string | null) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
  dismissToast: (id: string) => void;
}
```

### Auto-behaviors:
- **On mount:** Call `refreshTasks()` to hydrate from backend
- **On window focus:** Call `refreshTasks()` if last fetch was >30s ago (stale data check)

Note: `refreshTasks()` is called explicitly in the accept flow (after the API returns 200), not via an auto-behavior. The backend persists tasks synchronously in the accept endpoint, so the subsequent GET /tasks will return them immediately.

### localStorage sync:
- `draftResponse` writes to `jarvis-draft-schedule` for persistence across refreshes
- `conversationId` writes to `jarvis-conversation-id`
- On mount, hydrate from localStorage, then validate against backend

### Hook: `lib/context/useJarvis.ts`
```typescript
export function useJarvis(): JarvisState & JarvisActions {
  const context = useContext(JarvisContext);
  if (!context) throw new Error("useJarvis must be used within JarvisProvider");
  return context;
}
```

---

## 2. Bug 1 Fix: Accept/Reject Flow

### Accept Flow (in `useJarvisChat.ts`)

**Before:**
```
acceptDraft() → API call → promoteDraftToFinal() → setTimeout clear state
```

**After:**
```
acceptDraft() → API call → on success:
  1. context.clearDraft()          // clears draft + localStorage
  2. context.refreshTasks()        // fetches fresh tasks from backend
  3. context.showToast("Schedule saved!", "success")
  4. router.push("/schedule")      // navigate to see the schedule

  on error:
  1. context.showToast("Failed to save schedule. Try again.", "error")
  2. Keep draft visible (no state change)
```

### Reject Flow

**Before:**
```
rejectDraft() → API call → clearDraftSchedule() → send rejection message
```

**After:**
```
rejectDraft(reason) → API call → on success:
  1. context.clearDraft()
  2. context.showToast("Schedule rejected. Replanning...", "info")
  3. If reason provided: sendMessage("I rejected because: {reason}. Please suggest a different approach.")

  on error:
  1. context.showToast("Failed to reject. Try again.", "error")
```

### Button States in SchedulePreview.tsx

Add proper loading + success states:
- **Idle:** "Accept All" (orange) + "Reject" (outline)
- **Accepting:** "Saving..." with spinner, both buttons disabled
- **Accepted:** "Saved!" with checkmark, auto-navigate after 1s
- **Error:** "Accept All" re-enabled, error toast shown

---

## 3. Bug 2 Fix: Schedule View Uses Shared State

### Current: `schedule/page.tsx`
```typescript
// BAD: Independent fetch, runs once
const [allTasks, setAllTasks] = useState<ScheduleTask[]>([]);
useEffect(() => { loadTasks(); }, [loadTasks]);
```

### New: `schedule/page.tsx`
```typescript
// GOOD: Reads from shared context
const { tasks, tasksLoading } = useJarvis();

// Filter for current view
const dayTasks = useMemo(() =>
  tasks.filter(t => isSameDay(t.start_time, selectedDate)),
  [tasks, selectedDate]
);
```

**Changes to schedule page:**
- Remove local `allTasks` state and `loadTasks()` effect
- Read `tasks` from `useJarvis()` context
- Remove the `!loading && allTasks.length === 0 && viewMode === "day"` conditional — use a single empty state that works for all view modes
- Day/Week/Month views all filter from the same `tasks` array

**Empty state logic:**
```typescript
// Show empty state only when we've loaded and truly have no tasks
if (!tasksLoading && tasks.length === 0) {
  return <EmptyState /> // Same for all view modes
}
```

### Dashboard reads from context too
```typescript
// dashboard/page.tsx
const { tasks, draftResponse } = useJarvis();
const todayTasks = tasks.filter(t => isToday(t.start_time));
const hasDraft = draftResponse !== null;
```

No more reading `jarvis-active-draft` or `jarvis-last-chat-response` from localStorage for task data. PEARL insights can still come from localStorage (they're display-only, not critical state).

---

## 4. Bug 3 Fix: Sidebar Chat Shares Conversation

### Changes to `AIChatPanel.tsx`:

1. **Read conversation ID from context:**
```typescript
const { conversationId, setConversationId } = useJarvis();
```

2. **Pass conversation ID to chatStream:**
```typescript
await chatStream({
  user_prompt: input,
  user_id: USER_ID,
  conversation_id: conversationId,  // was: undefined
  model_mode: "4b",
}, handlers);
```

3. **On complete, save conversation ID:**
```typescript
onComplete: (response) => {
  if (response.conversation_id) {
    setConversationId(response.conversation_id);
  }
  // ... rest of handler
}
```

4. **"Continue in Chat" passes session:**
```typescript
// Before: router.push("/chat")
// After:
router.push(`/chat?session=${conversationId}`);
```

5. **Main chat hydrates from URL param:**
In `chat/page.tsx`, on mount:
```typescript
const searchParams = useSearchParams();
const sessionParam = searchParams.get("session");
if (sessionParam) {
  loadConversation(sessionParam);  // existing function in useJarvisChat
}
```

---

## 5. Bug 5 Fix: Sidebar Shows Actual Response

### Changes to `AIChatPanel.tsx`:

**Current behavior:** For heavy intents, the response text is replaced with just "Continue in Chat."

**New behavior:** Always show the response text. Add "Continue in Chat" as a link BELOW the response for heavy intents.

```typescript
// For each assistant message:
<div className="text-sm">{msg.text}</div>
{msg.isHeavyIntent && (
  <Link href={`/chat?session=${conversationId}`} className="text-primary text-xs mt-1">
    Continue in Chat for full planning
  </Link>
)}
```

---

## 6. Toast Notification System

### File: `components/ui/ToastContainer.tsx`

Minimal toast system — no dependencies.

```typescript
interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
  createdAt: number;
}
```

**Rendering:** Fixed position bottom-right, stacked. Auto-dismiss success/info after 3s. Error stays until clicked.

**Styling:** Follows existing design system — warm earth tones:
- Success: green-600 background
- Error: red-600 background
- Info: neutral/amber background

**Rendered in:** `app/(app)/layout.tsx`, reads from `useJarvis().toasts`

---

## 7. Integration Tests

### Backend Tests (pytest)

#### `tests/test_draft_flow.py`
Tests the full draft lifecycle via API:

| Test | Description |
|------|------------|
| `test_draft_accept__persists_tasks` | Create draft → accept → GET /tasks returns the accepted tasks |
| `test_draft_reject__stores_reason` | Create draft → reject with reason → reason stored in memories |
| `test_draft_accept__idempotent` | Accept same draft twice → second call returns ok, no duplicate tasks |
| `test_draft_reject__clears_draft` | Reject draft → GET draft returns 404 or status=rejected |
| `test_draft_modify__updates_task` | PATCH task in draft → verify task field changed |

#### `tests/test_task_lifecycle.py`
Tests task state transitions:

| Test | Description |
|------|------------|
| `test_task_complete__updates_status` | Complete task with quality=4 → status=completed in DB |
| `test_task_skip__marks_skipped` | Skip task → status=skipped |
| `test_list_tasks__filters_by_status` | Create tasks with different statuses → filter returns correct subset |
| `test_list_tasks__filters_by_user` | Tasks for user_a not returned when querying user_b |

#### `tests/test_chat_session.py`
Tests conversation continuity:

| Test | Description |
|------|------------|
| `test_chat__returns_conversation_id` | POST /chat → response includes conversation_id |
| `test_chat__continues_session` | POST /chat with conversation_id → same session used |
| `test_sessions__lists_sessions` | After chat → GET /sessions returns the session |

### Frontend Tests (lightweight, component-level)

#### `__tests__/context/JarvisContext.test.tsx`
| Test | Description |
|------|------------|
| `test_refreshTasks__populates_tasks` | Mock API → context.tasks populated |
| `test_clearDraft__clears_state_and_localStorage` | clearDraft() → draftResponse null, localStorage cleared |
| `test_acceptFlow__refreshes_tasks` | Simulate accept → refreshTasks called |
| `test_toast__auto_dismisses` | showToast success → removed after 3s |

---

## 8. Additional Gaps Found (Re-Review)

### Gap A: Dashboard Brain Dump `?prompt=` Param Ignored by Chat Page

The dashboard's "Quick Brain Dump" input (line 204 of `dashboard/page.tsx`) does:
```typescript
router.push(`/chat?prompt=${encodeURIComponent(input)}`);
```

But `chat/page.tsx` never reads `?prompt=` from the URL. The brain dump text is silently lost.

**Fix:** In `chat/page.tsx`, on mount:
```typescript
const searchParams = useSearchParams();
useEffect(() => {
  const prompt = searchParams.get("prompt");
  if (prompt && messages.length === 0) {
    sendMessage(decodeURIComponent(prompt));
  }
}, []);  // Run once on mount
```

This also applies to `?session=` param (already covered in Section 4).

### Gap B: `apiTasksToScheduleTasks()` Has Silent Fallback Bugs

In `lib/transforms.ts`, the function that converts backend task data to `ScheduleTask[]` has fragile fallbacks:

1. **Start time defaults to `new Date()` (NOW)** if `start_time`, `scheduled_start`, and `horizon_start + start_min` are all missing. Tasks appear at the current moment — wrong.
2. **Duration defaults to 25 minutes** silently if `duration_minutes` is missing.
3. **No warnings** when using defaults — problems hide silently.

**Fix:**
- Default start time to start of today (8 AM) instead of `new Date()`, and add a `console.warn` when using the fallback
- Keep 25-minute default for duration (matches Pomodoro spec) but log a warning
- Add type validation for `status` field instead of raw `as` cast

### Gap C: Expired Draft Handling

The architecture spec defines 24-hour draft expiry (`status: "expired"`). The backend handles this in `draft_store.py`, but the frontend doesn't check for it.

**Fix:** In `JarvisContext`, when hydrating draft from localStorage:
```typescript
// Check if draft is expired (created > 24h ago)
const draft = loadDraftSchedule();
if (draft && draft.schedule?.draft_id) {
  // Optionally validate with backend: GET /api/v1/drafts/{id}
  // If 404 or status=expired → clear local draft, show info toast
}
```

For now, a simple 24-hour client-side check on the localStorage timestamp is sufficient. If the draft was saved >24h ago, clear it and show "Your previous draft has expired."

---

## 9. Files Changed

| File | Action | Description |
|------|--------|-------------|
| `lib/context/JarvisContext.tsx` | CREATE | Shared state provider with tasks, draft, conversationId, toasts |
| `lib/context/useJarvis.ts` | CREATE | Consumer hook |
| `components/ui/ToastContainer.tsx` | CREATE | Toast notification UI |
| `app/(app)/layout.tsx` | EDIT | Wrap with `<JarvisProvider>`, render `<ToastContainer>` |
| `lib/hooks/useJarvisChat.ts` | EDIT | Accept/reject use context methods, add router navigation |
| `app/(app)/schedule/page.tsx` | EDIT | Read tasks from context, remove local fetch, fix view switch |
| `app/(app)/dashboard/page.tsx` | EDIT | Read tasks + draft from context |
| `components/app/AIChatPanel.tsx` | EDIT | Share conversationId, show response text, fix "Continue in Chat" |
| `components/app/SchedulePreview.tsx` | EDIT | Add loading/success button states |
| `app/(app)/chat/page.tsx` | EDIT | Hydrate from `?session=` and `?prompt=` URL params |
| `lib/transforms.ts` | EDIT | Harden apiTasksToScheduleTasks fallbacks, add warnings |
| `tests/test_draft_flow.py` | CREATE | Backend draft lifecycle tests |
| `tests/test_task_lifecycle.py` | CREATE | Backend task state transition tests |
| `tests/test_chat_session.py` | CREATE | Backend session continuity tests |
| `__tests__/context/JarvisContext.test.tsx` | CREATE | Frontend context tests |

**No backend code changes required.** All endpoints already exist and work correctly. This is purely a frontend state management fix + backend test coverage.

---

## 9. What This Does NOT Cover (Deferred)

- ChromaDB Cloud migration / hybrid search — separate spec
- Memory UI (view/edit memories) — separate spec
- Workspace page enhancements — separate spec
- Document intelligence pipeline — separate spec
- Full test suite for all backend services — separate effort
- New intent types (EDIT_TASK, REARRANGE, etc.) — backend has them, frontend needs UI later

---

## 10. Success Criteria

1. User clicks "Accept All" → sees toast "Schedule saved!" → navigated to schedule page → tasks visible in Day view
2. User switches Day → Week → Month → Day → tasks remain visible throughout
3. User types in sidebar chat → sees response text → clicks "Continue in Chat" → main chat loads same conversation with history
4. Dashboard brain dump → redirects to chat → chat auto-sends the prompt (not lost)
5. Tasks with missing time data get sensible defaults (start of day, not NOW) with console warnings
6. Expired drafts (>24h) show info message instead of stale schedule
7. All backend integration tests pass: draft accept/reject/modify, task complete/skip/list, session continuity
8. No regressions in existing chat flow (streaming, task confirmation, draft review stages)
