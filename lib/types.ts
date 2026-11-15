/**
 * TypeScript types for Jarvis unified streaming chat.
 * Mirrors backend Pydantic schemas (app/schemas/context.py, app/schemas/workspace.py).
 * Supports both pipeline phase events and Voice of Jarvis token streaming.
 */

import type { LearningMoment } from "./learning";

// ---------------------------------------------------------------------------
// Environment constants
// ---------------------------------------------------------------------------

export const IS_DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
export const USER_ID = process.env.NEXT_PUBLIC_USER_ID || 'demo';
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ---------------------------------------------------------------------------
// Intent — extensible, not a hardcoded enum
// ---------------------------------------------------------------------------

export type IntentType = string;

// ---------------------------------------------------------------------------
// Generation Metrics
// ---------------------------------------------------------------------------

export interface GenerationMetrics {
  total_tokens: number;
  total_time_s: number;
  tok_per_sec: number;
  ttft_ms: number | null;
  model: string;
}

// ---------------------------------------------------------------------------
// Implementation Intention (WOOP)
// ---------------------------------------------------------------------------

export interface ImplementationIntention {
  obstacle_trigger: string;
  behavioral_response: string;
}

// ---------------------------------------------------------------------------
// Task Chunk (Socratic Chunker output)
// ---------------------------------------------------------------------------

export interface TaskChunk {
  task_id: string;
  title: string;
  duration_minutes: number;   // <= 25
  difficulty_weight: number;  // 0-1
  dependencies: string[];
  completion_criteria: string;
  implementation_intention?: ImplementationIntention;
  deadline_hint?: string;
  subject_tag?: string;
}

// ---------------------------------------------------------------------------
// Goal Metadata
// ---------------------------------------------------------------------------

export interface GoalMetadata {
  goal_id: string;
  objective?: string;
  original_goal?: string;
  outcome_visualization?: string;
  mastery_level_target?: number;
}

// ---------------------------------------------------------------------------
// Execution Graph
// ---------------------------------------------------------------------------

export interface ExecutionGraph {
  goal_metadata: GoalMetadata;
  decomposition: TaskChunk[];
  cognitive_load_estimate?: {
    intrinsic_load: number;
    germane_load: number;
    [key: string]: number;
  };
}

// ---------------------------------------------------------------------------
// Schedule types
// ---------------------------------------------------------------------------

export interface TaskSchedule {
  start_min: number;
  end_min: number;
  tmt_score?: number;
  title?: string;
  constraint_applied?: string;
}

export interface ScheduleResponse {
  schedule: Record<string, TaskSchedule>;
  horizon_start: string;   // ISO datetime
  horizon_end?: string;
  schedule_status?: string;
  draft_id?: string;
  conflict_summary?: string;
  thinking_process?: string;
  goal_metadata?: Record<string, unknown>;
}

export interface SchedulePayload {
  schedule: Record<string, TaskSchedule>;
  horizon_start: string;
  horizon_minutes?: number;
  horizon_end?: string;
  daily_cap_minutes?: number;
  draft_id?: string;
  status?: 'draft' | 'final';
  schedule_status?: string;
  applied_constraints?: AppliedConstraint[];
  conflict_summary?: string;
  thinking_process?: string;
  goal_metadata?: Record<string, unknown>;
}

export interface AppliedConstraint {
  name: string;
  start_min: number;
  end_min: number;
  availability: string;
  source: string;
}

export interface GoalSummary {
  goal_id: string;
  total: number;
  completed: number;
  progress_pct: number;
  tasks: { title: string; status: string }[];
}

// ---------------------------------------------------------------------------
// PEARL Insights
// ---------------------------------------------------------------------------

/** One confirmed pattern on a `complete` frame (`pearl_insights`). */
export interface PearlInsight {
  insight: string;
  confidence: number;
  occurrences: number;
  /** The memory holding the pattern, to confirm or dismiss; null when none is stored yet. */
  memory_id: string | null;
}

// ---------------------------------------------------------------------------
// Memory Records
// ---------------------------------------------------------------------------

/** 'said': the user's own words. 'inferred': Jarvis noticed it from what happened. */
export type Provenance = "said" | "inferred";

/**
 * One memory as the Memory panel shows it. `GET /memories/` sends the full
 * `MemoryOut`; a chat `complete` frame's `memories` carry only some fields, and
 * no `memory_id` on older backends (null here: shown, but no actions).
 */
export interface MemoryRecord {
  memory_id: string | null;
  memory_type: string;   // Dynamic — not hardcoded enum
  content: string;
  confidence: number;
  provenance?: Provenance;
  /** When it was first stored (ISO). */
  noted_at?: string;
  /** Strength now: 1 when just learned or confirmed, falling while unused. */
  freshness?: number;
}

/** `MemoryOut` (app/api/v1/endpoints/memories.py): the memories API and the You page. */
export interface MemoryOut extends MemoryRecord {
  memory_id: string;
  provenance: Provenance;
  freshness: number;
  noted_at: string;
  last_confirmed_at: string | null;
  observation_count: number;
  pattern_key: string | null;
}

/** A chat `complete` frame's panel memory, as it arrives (normalised by `toPanelMemory`). */
export interface PanelMemoryFrame {
  memory_id?: string;
  memory_type: string;
  content: string;
  confidence?: number;
  provenance?: Provenance;
}

// ---------------------------------------------------------------------------
// The You page (GET /api/v1/you — app/api/v1/endpoints/you.py)
// ---------------------------------------------------------------------------

export type AutonomyMode = "suggest_only" | "ask_first" | "auto_low_risk";

export interface YouProfile {
  display_name: string | null;
  /** IANA zone the user's day runs in. */
  timezone: string;
  /** Usual local wake-up time, HH:MM. */
  wake_time: string;
  autonomy_mode: AutonomyMode;
}

/** A pattern PEARL sees now, with its evidence (already worded "set aside" / "done"). */
export interface PatternShown {
  /** The memory to confirm or dismiss; null when the pattern is not remembered. */
  memory_id: string | null;
  pattern_key: string;
  detector: string;
  description: string;
  confidence: number;
  occurrences: number;
  evidence: string[];
  confirmed: boolean;
}

/** A rule the user's plans respect (a behavioral constraint). */
export interface RuleShown {
  id: string;
  text: string;
  provenance: Provenance;
  /** Null for a rule older than the stamp. */
  created_at: string | null;
}

export interface HourFocus {
  hour: number;
  score: number;
  done: number;
  not_done: number;
}

export interface FocusProfile {
  /** 'learned' once there are enough outcomes; 'prior' is the starting assumption. */
  source: "prior" | "learned";
  observations: number;
  /** 24 entries; index == local hour. */
  hours: HourFocus[];
}

/** The privacy receipt: where the user's model calls ran, since `since` (a 30-day window). */
export interface Receipt {
  since: string;
  /** True when the store stopped at its read bound: the counts may be short ("at least"). */
  truncated: boolean;
  on_device_calls: number;
  cloud_calls: number;
  pii_redactions: number;
  input_tokens: number;
  output_tokens: number;
}

export interface YouResponse {
  profile: YouProfile;
  patterns: PatternShown[];
  rules: RuleShown[];
  /** Memories in use, oldest first; a pattern's memory only when the pattern is not shown above. */
  memories: MemoryOut[];
  focus: FocusProfile;
  receipt: Receipt;
  /**
   * Consecutive days, ending today on the user's clock, with a task completed — the
   * coach's count. A day is not over until it ends: the number is shown as sent.
   * Absent from a backend that does not send it yet (unknown, never 0).
   */
  streak_days?: number;
}

/** `PATCH /you/settings`: settings left out stay as they are; an unknown key is a 422. */
export interface SettingsUpdate {
  autonomy_mode?: AutonomyMode;
  wake_time?: string;
  timezone?: string;
}

// ---------------------------------------------------------------------------
// Suggestions (app/api/v1/endpoints/anticipation.py)
// ---------------------------------------------------------------------------

export type ConsentBehavior = "allow" | "ask" | "deny";

export interface SuggestionOut {
  id: string;
  /** Trigger that made it, e.g. morning_brief, pattern_rule. */
  trigger: string;
  kind: string;
  title: string;
  body: string;
  /** pending | accepted | dismissed | expired | auto_applied */
  status: string;
  consent_behavior: ConsentBehavior;
  /** Which consent rule decided; null on older suggestions. */
  consent_kind: string | null;
  /** Why, in words the user can read. */
  consent_reason: string;
  created_at: string;
  expires_at: string | null;
  /** The action accepting it would run, as stored. */
  details: Record<string, unknown>;
}

export interface ActionResultOut {
  kind: string;
  message: string;
  tasks_written: number | null;
  draft_id: string | null;
}

export interface AcceptSuggestionResponse {
  suggestion: SuggestionOut;
  result: ActionResultOut;
}

export interface ConsentOut {
  behavior: ConsentBehavior;
  kind: string;
  message: string;
}

export type TriggerName = "morning_brief" | "pattern_rule";

export interface RunTriggerResponse {
  status: "created" | "already_done" | "not_due" | "nothing_to_say" | "denied";
  suggestion: SuggestionOut | null;
  consent: ConsentOut | null;
}

// ---------------------------------------------------------------------------
// Action Item Proposal (spec-corrected fields)
// ---------------------------------------------------------------------------

export interface ActionItemProposal {
  id: string;
  title: string;
  summary: string;
  suggested_actions: string[];
  deadline_mentioned: boolean;
  deadline_date?: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Chat Response — unified backend response
// ---------------------------------------------------------------------------

export interface ChatResponse {
  intent: IntentType;
  message: string;
  schedule?: SchedulePayload;
  execution_graph?: ExecutionGraph;
  ingestion_result?: Record<string, unknown>;
  action_proposals?: ActionItemProposal[];
  search_result?: Record<string, unknown>;
  thinking_process?: string;
  generation_metrics?: GenerationMetrics;
  clarification_options?: string[];
  /** 'replan' when the turn saved a constraint or set an anti-guilt message; null otherwise. */
  suggested_action?: 'replan' | null;
  conversation_id?: string;
  message_id?: string;
  /** The panel's memories: `{memory_id, memory_type, content, confidence, provenance}` (older backends omit id/provenance). */
  memories?: PanelMemoryFrame[] | null;
  /** Set only on the turn that produced a schedule; null on every other turn. */
  draft_id?: string | null;
  /**
   * That draft's version (as GET /drafts/{id} reports it), sent only with draft_id and
   * read strictly (`parseCompleteDraftVersion`). The review card's accept sends it as
   * `expected_version`: a plan changed since is refused (409 `stale_version`).
   */
  draft_version?: string;
  /**
   * 'draft' on the turn that produced a schedule; 'infeasible' when every horizon
   * was tried and the scope still did not fit; null on every other turn.
   */
  schedule_status?: 'draft' | 'infeasible' | null;
  /** That turn's clarification text, sent with schedule_status 'infeasible'. */
  conflict_summary?: string | null;
  pearl_insights?: PearlInsight[] | null;
  saved_constraints?: string[];
  /**
   * "Since we last spoke (…): …" — set only on the first turn of a new session
   * that has an earlier one to pick up from; null otherwise. Normalised by
   * `toSinceLastSpoke` (a non-string or blank value reads as null).
   */
  since_last_spoke?: string | null;
  /**
   * Client-only: where a stored draft came from. 'suggestion' — drafted by an
   * accepted suggestion (a learned rule); chat has no card for it, so the
   * dashboard banner acts on it in place. Absent: a chat turn's draft.
   */
  draft_source?: "chat" | "suggestion";
}

// ---------------------------------------------------------------------------
// Draft state (GET /api/v1/drafts/{id} — a draft_schedules row)
// ---------------------------------------------------------------------------

/** One task's solved slot (app/schemas/draft.py `DraftSlot`). */
export interface DraftSlot {
  task_id: string;
  title: string | null;
  start_min: number;
  end_min: number;
  /** ISO-8601 instant with the offset of the user's zone. */
  start: string;
  end: string;
  duration_minutes: number;
}

/** A draft's solved slots (`DraftScheduleView`): every task the solver placed, by task_id. */
export interface DraftScheduleView {
  horizon_start: string;
  schedule: Record<string, DraftSlot>;
}

/** draft_schedules.status. Only pending/modified drafts are open; the rest are closed for good. */
export type DraftStatus =
  | 'pending'
  | 'modified'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'superseded';

export interface DraftState {
  draft_id: string;
  user_id: string;
  goal_id?: string | null;
  tasks: Record<string, unknown>[];
  horizon_start?: string | null;
  /** The solved slots with their times on the user's clock; null for a draft stored without them. */
  schedule?: DraftScheduleView | null;
  status: DraftStatus;
  rejection_reason?: string | null;
  created_at?: string | null;
  /**
   * What this read saw, as one opaque value (a hash of the tasks and slots). Sent
   * back as the accept's `expected_version`: a plan changed since is not accepted
   * (409 `stale_version`, with the latest draft).
   */
  version: string;
}

// ---------------------------------------------------------------------------
// Chat Request
// ---------------------------------------------------------------------------

/**
 * Which models answer a turn: 'auto' (the local model first, the cloud when it
 * cannot answer) or '4b', the wire value for cloud only (the backend also accepts
 * 'cloud' and 'gemini'). The picker's words are in lib/modelModes.ts.
 */
export type ModelMode = 'auto' | '4b';

/** The body of POST /api/v1/chat/stream: exactly the fields the backend reads. */
export interface ChatRequest {
  user_prompt: string;
  user_id: string;
  conversation_id?: string;
  file_base64?: string;
  media_type?: string;
  file_name?: string;
  model_mode?: ModelMode;
}

// ---------------------------------------------------------------------------
// Streaming phases (data-driven from backend)
// ---------------------------------------------------------------------------

export type JarvisStreamPhase =
  // Pipeline phases (emitted by backend progress_callback)
  | "idle"
  | "connecting"
  | "brain_dump_extraction"
  | "intent_classified"
  | "habits_saved"
  | "habits_fetched"
  | "habits_translated"
  | "plan_day_start"
  | "decomposing"
  | "decomposition_done"
  | "scheduling"
  | "schedule_done"
  | "synthesizing"
  // Voice of Jarvis streaming phases
  | "reasoning"
  | "responding"
  // Terminal phases
  | "complete"
  | "error"
  | "aborted";

// ---------------------------------------------------------------------------
// Phase event data (dynamic from backend)
// ---------------------------------------------------------------------------

export interface PhaseEventData {
  phase: string;
  message?: string;
  data?: Record<string, unknown>;
  timestamp?: number;
  verb?: string;        // spinner verb from backend
  detail?: Record<string, unknown>;  // enriched phase detail
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Stream state
// ---------------------------------------------------------------------------

export interface JarvisStreamState {
  phase: JarvisStreamPhase;
  reasoning: string;
  message: string;
  error: string | null;
  reasoningDurationMs: number | null;
  // Pipeline phase data — dynamic from backend, not hardcoded
  intent: string | null;
  phaseHistory: PhaseEventData[];
  currentPhaseData: PhaseEventData | null;
  // Model info — which model is active for current phase
  activeModel: string | null;
  modelMode: string | null;
  toolUses: ToolUseEvent[];
  memoriesExtracted: MemoryExtractedEvent[];
  patternsDetected: PatternDetectedEvent[];
  devMode: boolean;
  latestPattern: PatternDetectedEvent | null;
}

export const INITIAL_STREAM_STATE: JarvisStreamState = {
  phase: "idle",
  reasoning: "",
  message: "",
  error: null,
  reasoningDurationMs: null,
  intent: null,
  phaseHistory: [],
  currentPhaseData: null,
  activeModel: null,
  modelMode: null,
  toolUses: [],
  memoriesExtracted: [],
  patternsDetected: [],
  devMode: false,
  latestPattern: null,
};

// ---------------------------------------------------------------------------
// Message model for chat history
// ---------------------------------------------------------------------------

export interface JarvisMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  reasoningDurationMs?: number | null;
  phaseHistory?: PhaseEventData[];
  response?: ChatResponse;
  isStreaming?: boolean;
  file?: { name: string; type: string };
  fileName?: string;
  mediaType?: string;
  conversationId?: string;
  conversation_id?: string;
  message_id?: string;
  timestamp: number;
  toolUses?: ToolUseEvent[];
  /** What Jarvis learned on this turn (memory_extracted / pattern_detected frames), in arrival order. */
  learningMoments?: LearningMoment[];
  /** Set when the turn paused for consent (a consent_request frame). */
  consentRequest?: ConsentRequestEvent;
}

export interface ChatResponseSessionFields {
  conversation_id?: string;
  message_id?: string;
  suggested_action?: string;
  clarification_options?: string[];
}

// ---------------------------------------------------------------------------
// File attachment
// ---------------------------------------------------------------------------

export interface FileAttachment {
  name: string;
  type: string;
  base64: string;
  mediaType: "pdf" | "image" | "png" | "jpeg";
}

// ---------------------------------------------------------------------------
// Schedule Task (rendered in schedule view)
// ---------------------------------------------------------------------------

/**
 * user_tasks.status: the backend's TaskStatus (app/domain/entities.py). Skipped and
 * missed both read "Set aside"; every chip goes through `taskStatusDisplay`.
 */
export type TaskStatus = "pending" | "completed" | "skipped" | "missed";

export interface ScheduleTask {
  task_id: string;
  title: string;
  start_time: Date;
  end_time: Date;
  duration_minutes: number;
  status: TaskStatus;
  completed_at?: Date;
  /**
   * True when the backend gave the task no slot yet. `start_time` is then only a
   * placeholder (8 AM today): the dashboard lists it under "Not scheduled yet".
   */
  unscheduled?: boolean;
  goal_id?: string;
  color: string;
  deadline_hint?: string;
  constraint_applied?: string;
  implementation_intention?: ImplementationIntention;
}

// ---------------------------------------------------------------------------
// Task Workspace (Proactive Cognitive Workspace)
// ---------------------------------------------------------------------------

export interface StudyAsset {
  asset_type: string;
  title: string;
  content_or_url: string;
  rationale: string;
  metadata?: Record<string, unknown>;
}

export interface TaskWorkspace {
  task_id: string;
  task_title: string;
  primary_objective: string;
  surfaced_assets: StudyAsset[];
  /** The user's uploaded documents linked to this task. Absent on older backends. */
  linked_documents?: LinkedDocument[];
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

/** One uploaded document, as `GET /documents/` lists it. */
export interface IngestionDocument {
  id: string;
  user_id: string;
  source_id: string;
  file_name: string | null;
  /** 'pdf', 'png', 'jpeg' or 'image' (what the upload sent); null when unknown. */
  media_type: string | null;
  document_topics: string[];
  chunk_count: number;
  created_at: string;
  linked_task_ids: string[];
  /** True when the original file was kept (`GET /documents/{id}/file`). Absent on older backends. */
  has_file?: boolean;
  /** The linked tasks with their titles. Absent on older backends: only `linked_task_ids` then. */
  linked_tasks?: DocumentLinkedTask[];
}

/** A task an uploaded document is linked to, by its title. */
export interface DocumentLinkedTask {
  task_id: string;
  title: string;
}

/** An uploaded document linked to a task, as the task's workspace lists it. */
export interface LinkedDocument {
  source_id: string;
  file_name: string | null;
  /** True when the original file was kept, so it can be opened in the viewer. */
  has_file: boolean;
}

// ---------------------------------------------------------------------------
// Session / Conversation persistence
// ---------------------------------------------------------------------------

export interface Session {
  id: string;
  title: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  is_pinned?: boolean;
  summary?: string;
  messages?: SessionMessage[];
}

export interface SessionMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  /** What the turn produced, as stored: a planning turn keeps its draft's id and slots. */
  metadata?: { draft_id?: string | null; schedule?: SchedulePayload | null } | null;
}

// ---------------------------------------------------------------------------
// Tool Use / Learning Events (v2 intelligent trace)
// ---------------------------------------------------------------------------

export interface ToolUseEvent {
  module: string;
  tool: string;
  /** 'skipped': the step did not run (its feature is off, or a hook held it); `detail.reason` says why. */
  status: "started" | "done" | "error" | "skipped";
  detail?: Record<string, unknown>;
  timestamp?: number;
}

/**
 * `event: memory_extracted` — one frame per memory created, reinforced or
 * superseded this turn, always before `complete`. A suppressed memory (one the
 * user asked Jarvis to forget) sends no frame.
 */
export interface MemoryExtractedEvent {
  memory_id: string;
  type: string;
  content: string;
  confidence: number;
  provenance: "said";
  action: "created" | "reinforced" | "superseded";
  timestamp?: number;
}

/**
 * `event: pattern_detected` — one frame per pattern created or strengthened, before
 * `complete`. `pattern_key` is optional in the backend (Pattern.pattern_key: str | None).
 */
export interface PatternDetectedEvent {
  memory_id: string;
  pattern_key?: string | null;
  type: string;
  content: string;
  confidence: number;
  occurrence_count: number;
  action: "created" | "strengthened";
  timestamp?: number;
}

/** `event: consent_request` — the turn paused before an action that needs the user's say-so. */
export interface ConsentRequestEvent {
  reason: string;
  module: string;
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

export interface NavItem {
  id: string;
  label: string;
  /** Shorter form for the mobile tab bar, where a full label would truncate. */
  shortLabel?: string;
  icon: string;
  href: string;
}
