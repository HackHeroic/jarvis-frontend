/**
 * TypeScript types for Jarvis unified streaming chat.
 * Mirrors backend Pydantic schemas (app/schemas/context.py, app/schemas/workspace.py).
 * Supports both pipeline phase events and Voice of Jarvis token streaming.
 */

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

// ---------------------------------------------------------------------------
// PEARL Insights
// ---------------------------------------------------------------------------

export interface PearlInsight {
  insight: string;
  confidence?: number;
}

// ---------------------------------------------------------------------------
// Memory Records
// ---------------------------------------------------------------------------

export interface MemoryRecord {
  id: string;
  memory_type: string;   // Dynamic — not hardcoded enum
  content: string;
  confidence: number;
  strength?: number;
  stability?: number;
  source?: string;
  observation_count?: number;
  superseded_by?: string;
  created_at?: string;
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
  schedule?: ScheduleResponse;
  execution_graph?: ExecutionGraph;
  ingestion_result?: Record<string, unknown>;
  action_proposals?: ActionItemProposal[];
  search_result?: Record<string, unknown>;
  thinking_process?: string;
  generation_metrics?: GenerationMetrics;
  awaiting_task_confirmation?: boolean;
  clarification_options?: string[];
  suggested_action?: string;
  conversation_id?: string;
  message_id?: string;
  memories?: MemoryRecord[];
  draft_id?: string;
  schedule_status?: 'draft' | 'accepted' | 'rejected';
  pearl_insights?: PearlInsight[];
}

// ---------------------------------------------------------------------------
// Chat Request
// ---------------------------------------------------------------------------

export interface ChatRequest {
  user_prompt: string;
  user_id: string;
  conversation_id?: string;
  file_base64?: string;
  media_type?: string;
  file_name?: string;
  model_mode?: 'auto' | '4b' | '27b';
  confirm_before_schedule?: boolean;
  draft_schedule?: {
    schedule?: ScheduleResponse;
    execution_graph?: ExecutionGraph;
    horizon_start?: string;
  };
  day_start_hour?: number;
  deadline_override?: string;
  min_deep_work_minutes?: number;
  max_deep_work_minutes?: number;
}

// ---------------------------------------------------------------------------
// Confirm Schedule Request
// ---------------------------------------------------------------------------

export interface ConfirmScheduleRequest {
  user_id: string;
  tasks: Array<{
    task_id: string;
    title: string;
    duration_minutes: number;
    difficulty_weight: number;
    dependencies: unknown[];
    completion_criteria: string;
    implementation_intention?: ImplementationIntention;
  }>;
  goal_metadata?: Record<string, unknown>;
  model_mode?: "auto" | "4b" | "27b";
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
  // Task confirmation phases
  | "awaiting_confirmation"
  | "confirming"
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

export interface ScheduleTask {
  task_id: string;
  title: string;
  start_time: Date;
  end_time: Date;
  duration_minutes: number;
  status: "pending" | "in_progress" | "completed" | "skipped";
  completed_at?: Date;
  goal_id?: string;
  color: string;
  deadline_hint?: string;
  constraint_applied?: string;
  implementation_intention?: ImplementationIntention;
}

// ---------------------------------------------------------------------------
// Preview Task (editable task card in draft review)
// ---------------------------------------------------------------------------

export interface PreviewTask {
  task_id: string;
  title: string;
  duration_minutes: number;
  difficulty_weight: number;
  completion_criteria: string;
  implementation_intention?: ImplementationIntention;
  deadline_hint?: string;
  subject_tag?: string;
  isEditing?: boolean;
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
  summary?: string;
  messages?: SessionMessage[];
}

export interface SessionMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  href: string;
}
