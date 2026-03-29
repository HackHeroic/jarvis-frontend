// --- Chat ---
export type StreamPhase =
  | "idle" | "connecting" | "brain_dump_extraction" | "intent_classified"
  | "habits_saved" | "habits_fetched" | "habits_translated"
  | "plan_day_start" | "decomposing" | "decomposition_done"
  | "scheduling" | "schedule_done" | "synthesizing"
  | "awaiting_confirmation" | "confirming"
  | "reasoning" | "responding" | "complete" | "error" | "aborted";

export interface GenerationMetrics {
  model?: string;
  tokens_per_second?: number;
  total_tokens?: number;
  total_time_ms?: number;
  ttft_ms?: number;
}

export interface ImplementationIntention {
  obstacle_trigger: string;
  behavioral_response: string;
}

export interface TaskChunk {
  task_id: string;
  title: string;
  duration_minutes: number;
  difficulty_weight: number;
  dependencies: string[];
  completion_criteria: string;
  implementation_intention?: ImplementationIntention;
  deadline_hint?: string;
}

export interface GoalMetadata {
  goal_id: string;
  objective: string;
  outcome_visualization?: string;
  mastery_level_target?: number;
}

export interface ExecutionGraph {
  goal_metadata: GoalMetadata;
  decomposition: TaskChunk[];
  cognitive_load_estimate?: Record<string, number>;
}

export interface ScheduleSlot {
  start_min: number;
  end_min: number;
  tmt_score?: number;
  title?: string;
  constraint_applied?: string;
}

export interface PearlInsight {
  insight: string;
  confidence?: number;
}

export interface MemoryRecord {
  id?: string;
  memory_type: "fact" | "preference" | "behavioral_pattern" | "temporal_event" | "goal" | "feedback" | "constraint";
  content: string;
  confidence?: number;
  created_at?: string;
}

export interface ChatResponse {
  intent?: string;
  message: string;
  schedule?: Record<string, ScheduleSlot>;
  execution_graph?: ExecutionGraph;
  thinking_process?: string;
  suggested_action?: string;
  awaiting_task_confirmation?: boolean;
  schedule_status?: "draft" | "accepted";
  draft_id?: string;
  conversation_id?: string;
  message_id?: string;
  clarification_options?: string[];
  memories?: MemoryRecord[];
  generation_metrics?: GenerationMetrics;
  pearl_insights?: PearlInsight[];
}

export interface PhaseEvent {
  phase: StreamPhase;
  message?: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

export interface JarvisStreamState {
  phase: StreamPhase;
  reasoning: string;
  message: string;
  error: string | null;
  intent: string | null;
  phaseHistory: PhaseEvent[];
  activeModel: string | null;
}

export const INITIAL_STREAM_STATE: JarvisStreamState = {
  phase: "idle",
  reasoning: "",
  message: "",
  error: null,
  intent: null,
  phaseHistory: [],
  activeModel: null,
};

export interface FileAttachment {
  name: string;
  type: string;
  base64: string;
  mediaType: "pdf" | "image" | "png" | "jpeg";
}

export interface JarvisMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  phaseHistory?: PhaseEvent[];
  response?: ChatResponse;
  isStreaming?: boolean;
  file?: { name: string; type: string };
  conversationId?: string;
  timestamp: number;
}

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

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  href: string;
}
