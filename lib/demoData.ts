/**
 * Demo data for 4 scenarios.
 * Matches real API shapes exactly so components need no branching.
 */

import type { ChatResponse } from "./types";

// --- Scenario 1: Plan Week (multi-deadline scheduling) ---

export const DEMO_PLAN_WEEK: ChatResponse = {
  intent: "PLAN_DAY",
  message:
    "I've created a study plan for your deep learning contest (Friday) and calculus exam (Monday). The schedule respects cognitive load -- harder topics are placed during peak focus hours, with breaks between sessions.\n\n**8 tasks scheduled** across two goals. DL contest prep is front-loaded since it's due first.",
  thinking_process: `[Brain Dump Extraction] Detected intent: PLAN_DAY. Two goals extracted:
1. "DL contest" — deadline: Friday
2. "Calculus exam" — deadline: Monday

[Habit Translation] Fetched behavioral constraints from Supabase...
No constraints found for this user yet. Biological fallback injected: sleep block 00:00–08:00.

[Socratic Chunker] Decomposing both goals using Cognitive Load Theory...
DL contest → 5 micro-tasks (CNNs, backprop, optimization, implement, mock contest)
Calculus exam → 3 micro-tasks (integration, limits, practice exam)
Each chunk ≤ 25 min with WOOP implementation intentions.

[OR-Tools CP-SAT] Running multi-goal fusion scheduler...
8 tasks fused. TMT priority: DL tasks weighted higher (Friday deadline < Monday deadline).
Horizon: 5 days. Daily cap: 120 min (slack ratio ≥ 5).
Status: OPTIMAL.

[Voice of Jarvis] Synthesizing warm response...`,
  schedule_status: "draft",
  draft_id: "demo-draft-001",
  execution_graph: {
    goal_metadata: {
      objective: "DL contest prep + Calculus exam prep",
      goal_id: "demo-multi-goal",
    },
    decomposition: [
      {
        task_id: "dl_1",
        title: "Study CNNs -- convolution layers and pooling",
        duration_minutes: 25,
        difficulty_weight: 0.6,
        dependencies: [],
        completion_criteria: "Explain convolution operation and output dimensions without notes",
        implementation_intention: {
          obstacle_trigger: "If I feel overwhelmed by the math",
          behavioral_response: "Then I will draw the convolution grid on paper step by step",
        },
        deadline_hint: "Friday",
      },
      {
        task_id: "dl_2",
        title: "Study backpropagation -- chain rule and gradients",
        duration_minutes: 25,
        difficulty_weight: 0.8,
        dependencies: ["dl_1"],
        completion_criteria: "Derive gradient for a 2-layer network on paper",
        implementation_intention: {
          obstacle_trigger: "If I get stuck on the chain rule",
          behavioral_response: "Then I will re-derive the simple x^2 case first",
        },
        deadline_hint: "Friday",
      },
      {
        task_id: "dl_3",
        title: "Study optimization -- SGD, Adam, learning rate",
        duration_minutes: 25,
        difficulty_weight: 0.5,
        dependencies: [],
        completion_criteria: "Compare SGD vs Adam with momentum in a table",
        deadline_hint: "Friday",
      },
      {
        task_id: "dl_4",
        title: "Practice: implement basic CNN forward pass",
        duration_minutes: 25,
        difficulty_weight: 0.7,
        dependencies: ["dl_1", "dl_2"],
        completion_criteria: "Working convolution + pooling in Python without copying",
        deadline_hint: "Friday",
      },
      {
        task_id: "dl_5",
        title: "DL mock contest -- timed practice problems",
        duration_minutes: 25,
        difficulty_weight: 0.6,
        dependencies: ["dl_4"],
        completion_criteria: "Complete 3 problems in 25 minutes",
        deadline_hint: "Friday",
      },
      {
        task_id: "calc_1",
        title: "Review integration techniques -- substitution, parts",
        duration_minutes: 25,
        difficulty_weight: 0.5,
        dependencies: [],
        completion_criteria: "Solve 5 integration problems correctly",
        deadline_hint: "Monday",
      },
    ],
  },
  schedule: {
    dl_1: { start_min: 540, end_min: 565, title: "Study CNNs", tmt_score: 85 },
    dl_2: { start_min: 570, end_min: 595, title: "Study backpropagation", tmt_score: 92 },
    calc_1: { start_min: 630, end_min: 655, title: "Review integration", tmt_score: 72 },
    dl_3: { start_min: 660, end_min: 685, title: "Study optimization", tmt_score: 78 },
    dl_4: { start_min: 810, end_min: 835, title: "Implement CNN forward pass", tmt_score: 88 },
    dl_5: { start_min: 840, end_min: 865, title: "DL mock contest", tmt_score: 80 },
  },
  memories: [
    { memory_type: "goal", content: "DL contest on Friday", confidence: 0.95 },
    { memory_type: "goal", content: "Calculus exam on Monday", confidence: 0.95 },
    { memory_type: "fact", content: "Studying CNNs, backpropagation, optimization", confidence: 0.8 },
  ],
  generation_metrics: {
    model: "qwen-27b",
    tokens_per_second: 14.2,
    total_tokens: 1847,
    total_time_ms: 13007,
    ttft_ms: 312,
  },
  pearl_insights: [
    {
      insight: "This is your first multi-goal plan. I've front-loaded DL tasks since the contest deadline is earlier. After Friday, I'll automatically shift focus to calculus.",
      confidence: 0.88,
    },
  ],
};

// --- Scenario 2: Learn (Dijkstra decomposition) ---

export const DEMO_LEARN_DIJKSTRA: ChatResponse = {
  intent: "PLAN_DAY",
  message:
    "## Dijkstra's Algorithm -- Learning Plan\n\nI've broken down learning Dijkstra's into 5 micro-tasks, from understanding the core concept to implementing it from scratch.\n\n### How it works:\n1. **Initialize:** Set distance to source = 0, all others = infinity\n2. **Pick:** Select unvisited node with smallest distance\n3. **Update:** For each neighbor, check if going through current node is shorter\n4. **Repeat:** Until all nodes visited\n\n**Time Complexity:** O((V + E) log V) with a min-heap\n\nYour schedule is ready -- starting with conceptual understanding, building up to implementation.",
  thinking_process: `[Brain Dump Extraction] Detected intent: PLAN_DAY. Goal: "learn Dijkstra's algorithm".
No file attached. No deadline specified — using default 48h horizon.

[Socratic Chunker] Decomposing using Cognitive Load Theory...
Applying mastery orientation: focus on deep understanding, not speed.
Breaking into 5 progressive chunks: concept → examples → pseudocode → implement → optimize.
Each chunk has active recall completion criteria.

[OR-Tools CP-SAT] Running scheduler...
Biological fallback: sleep block 00:00–08:00.
5 tasks placed starting at minute 540 (9:00 AM). Progressive difficulty ordering.
Status: OPTIMAL.

[Voice of Jarvis] Synthesizing response with embedded explanation...`,
  schedule_status: "draft",
  draft_id: "demo-draft-002",
  execution_graph: {
    goal_metadata: {
      objective: "Learn Dijkstra's algorithm from concept to implementation",
      goal_id: "demo-dijkstra",
      outcome_visualization: "Implement Dijkstra from scratch and explain it to someone",
    },
    decomposition: [
      {
        task_id: "dij_1",
        title: "Understand graph basics -- nodes, edges, weights",
        duration_minutes: 20,
        difficulty_weight: 0.3,
        dependencies: [],
        completion_criteria: "Draw a weighted graph with 5 nodes and explain adjacency list representation",
      },
      {
        task_id: "dij_2",
        title: "Dijkstra's core algorithm -- greedy relaxation",
        duration_minutes: 25,
        difficulty_weight: 0.6,
        dependencies: ["dij_1"],
        completion_criteria: "Trace Dijkstra's algorithm on a 6-node graph by hand, showing distance updates",
        implementation_intention: {
          obstacle_trigger: "If the relaxation step feels confusing",
          behavioral_response: "Then I will trace one edge at a time, writing old and new distances",
        },
      },
      {
        task_id: "dij_3",
        title: "Priority queue optimization -- min-heap variant",
        duration_minutes: 25,
        difficulty_weight: 0.7,
        dependencies: ["dij_2"],
        completion_criteria: "Explain why min-heap reduces complexity from O(V^2) to O((V+E) log V)",
      },
      {
        task_id: "dij_4",
        title: "Implement Dijkstra in Python",
        duration_minutes: 25,
        difficulty_weight: 0.8,
        dependencies: ["dij_3"],
        completion_criteria: "Working implementation using heapq, tested on 2 example graphs",
        implementation_intention: {
          obstacle_trigger: "If I get stuck on the heap operations",
          behavioral_response: "Then I will write the naive O(V^2) version first, then optimize",
        },
      },
      {
        task_id: "dij_5",
        title: "Edge cases and negative weights -- why Dijkstra fails",
        duration_minutes: 20,
        difficulty_weight: 0.5,
        dependencies: ["dij_4"],
        completion_criteria: "Construct a graph where Dijkstra gives wrong answer and explain why Bellman-Ford works",
      },
    ],
  },
  schedule: {
    dij_1: { start_min: 540, end_min: 560, title: "Graph basics", tmt_score: 70 },
    dij_2: { start_min: 565, end_min: 590, title: "Dijkstra core algorithm", tmt_score: 85 },
    dij_3: { start_min: 630, end_min: 655, title: "Priority queue optimization", tmt_score: 82 },
    dij_4: { start_min: 660, end_min: 685, title: "Implement in Python", tmt_score: 90 },
    dij_5: { start_min: 720, end_min: 740, title: "Edge cases & negative weights", tmt_score: 75 },
  },
  memories: [
    { memory_type: "fact", content: "User is learning graph algorithms", confidence: 0.85 },
    { memory_type: "goal", content: "Learn Dijkstra's algorithm", confidence: 0.95 },
  ],
  generation_metrics: {
    model: "qwen-27b",
    tokens_per_second: 15.1,
    total_tokens: 1523,
    total_time_ms: 10086,
    ttft_ms: 287,
  },
};

// --- Scenario 3: Habit (constraint with replan) ---

export const DEMO_HABIT_CONSTRAINT: ChatResponse = {
  intent: "ADD_CONSTRAINT",
  message:
    "Got it -- I've recalibrated your schedule. All tasks are now after 2 PM with 1-hour breaks between sessions. Your deep learning and calculus prep will fit in the afternoon focus window.\n\n**Schedule recalibrated** -- 6 tasks shifted to respect your constraint.",
  thinking_process: `[Brain Dump Extraction] Detected intent: BEHAVIORAL_CONSTRAINT.
Extracted: "don't work before 2 PM" + "1-hour breaks between sessions".

[Behavioral Store] Persisting to Supabase behavioral_constraints table...
constraint_type: "time_preference"
structured_semantics: { "avoid_before_hour": 14, "break_minutes": 60, "recurrence": "daily" }
valid_from: today. valid_until: null (permanent).

[PEARL Logic] Checking for pattern reinforcement...
Historical data: user completes 92% of tasks scheduled after 2 PM but only 35% before 10 AM.
This constraint MATCHES observed behavior — promoting to permanent scheduling rule.

[Schedule Recalibration] Re-running OR-Tools with updated constraints...
Hard block: 00:00–14:00 (840 min). Soft constraint: 60-min gaps.
6 tasks rescheduled into afternoon window (14:00–20:00).
Status: OPTIMAL.

[Voice of Jarvis] Synthesizing response...`,
  schedule_status: "draft",
  draft_id: "demo-draft-003",
  schedule: {
    dl_1: { start_min: 840, end_min: 865, title: "Study CNNs", tmt_score: 85, constraint_applied: "No work before 2 PM" },
    dl_2: { start_min: 925, end_min: 950, title: "Study backpropagation", tmt_score: 92, constraint_applied: "No work before 2 PM" },
    calc_1: { start_min: 1010, end_min: 1035, title: "Review integration", tmt_score: 72, constraint_applied: "No work before 2 PM" },
    dl_3: { start_min: 1095, end_min: 1120, title: "Study optimization", tmt_score: 78, constraint_applied: "No work before 2 PM" },
    dl_4: { start_min: 1155, end_min: 1180, title: "Implement CNN", tmt_score: 88 },
    dl_5: { start_min: 1215, end_min: 1240, title: "DL mock contest", tmt_score: 80 },
  },
  memories: [
    { memory_type: "constraint", content: "No work before 2 PM", confidence: 0.95 },
    { memory_type: "constraint", content: "1-hour breaks between study sessions", confidence: 0.95 },
    { memory_type: "behavioral_pattern", content: "Completes 92% of tasks after 2 PM", confidence: 0.92 },
  ],
  generation_metrics: {
    model: "qwen-27b",
    tokens_per_second: 13.8,
    total_tokens: 1241,
    total_time_ms: 8993,
    ttft_ms: 298,
  },
  pearl_insights: [
    {
      insight: "Your new habit matches what I've observed -- you complete 92% of tasks scheduled after 2 PM, but only 35% before 10 AM. I've made 'no work before 2 PM' a permanent scheduling rule.",
      confidence: 0.92,
    },
  ],
};

// --- Scenario 4: Upload (document ingestion with clarification) ---

export const DEMO_UPLOAD_DOC: ChatResponse = {
  intent: "INGEST_DOCUMENT",
  message:
    "I've processed your practice problems PDF. Detected **10 practice problems** covering CNNs and backpropagation. I've linked them to your existing study tasks as completion criteria.\n\n**3 tasks enriched** with practice problems from your upload.",
  thinking_process: `[Brain Dump Extraction] File attached. Detected intent: KNOWLEDGE_INGESTION.
Media type: PDF. No planning goal detected.

[Ingestion Pipeline] Routing to process_ingestion with intent_override=KNOWLEDGE_INGESTION...
Docling extracting text — preserving table structure and heading hierarchy.
Chunking: splitting into ~500-token chunks with 50-token overlap.
Embedding via MLX-Embed (Nomic) → storing in ChromaDB cloud tenant.

[Task-Material Linker] Computing cosine similarity between new chunks and existing user_tasks...
Similarity threshold: 0.65. Matched 8 of 12 chunks to scheduled tasks.
Top matches: dl_1 (CNNs, sim=0.82), dl_2 (backprop, sim=0.79), dl_4 (implement, sim=0.71).
4 chunks are general reference (no task match above threshold).

[Supabase] Upserted 12 rows into task_materials (UNIQUE on user_id, task_id, source_id).

[Voice of Jarvis] Synthesizing response...`,
  clarification_options: [
    "Generate a quiz from these problems",
    "Link to specific tasks only",
    "Show me the extracted topics",
  ],
  memories: [
    { memory_type: "fact", content: "Uploaded practice problems for DL contest", confidence: 0.8 },
    { memory_type: "fact", content: "PDF contains 10 problems on CNNs and backpropagation", confidence: 0.9 },
  ],
  generation_metrics: {
    model: "qwen-4b",
    tokens_per_second: 42.7,
    total_tokens: 856,
    total_time_ms: 2005,
    ttft_ms: 145,
  },
};

// --- Demo Response Router ---

export function getDemoResponse(prompt: string): ChatResponse {
  const lower = prompt.toLowerCase();

  if (lower.includes("dijkstra") || lower.includes("teach me") || lower.includes("learn"))
    return DEMO_LEARN_DIJKSTRA;

  if (lower.includes("contest") || lower.includes("exam") || lower.includes("plan my") || lower.includes("plan week"))
    return DEMO_PLAN_WEEK;

  if (lower.includes("don't work before") || lower.includes("don\u2019t work before") || lower.includes("breaks between") || lower.includes("habit") || lower.includes("before 2"))
    return DEMO_HABIT_CONSTRAINT;

  if (lower.includes("practice problems") || lower.includes("upload") || lower.includes("pdf") || lower.includes("here are"))
    return DEMO_UPLOAD_DOC;

  // Default fallback: friendly Jarvis greeting for any unmatched prompt
  return {
    intent: "GENERAL_QA",
    message:
      "Hey! I'm Jarvis, your AI productivity engine. Here's what I can help you with:\n\n- **Plan your week** around deadlines and goals\n- **Teach you something** by breaking it into micro-tasks\n- **Add habits and constraints** to your schedule\n- **Upload documents** and link them to your study plan\n\nTry telling me about an upcoming exam, a topic you want to learn, or a habit you want to build!",
    generation_metrics: {
      model: "Gemini 2.5 Flash",
      tokens_per_second: 58.3,
      total_tokens: 124,
      total_time_ms: 2127,
      ttft_ms: 98,
    },
  };
}

// --- Prompt Selector Cards ---

export const DEMO_PROMPTS = [
  {
    id: "plan_week",
    label: "Plan my week",
    prompt: "Plan my week -- I have a deep learning contest on Friday and a calculus exam on Monday",
    icon: "Calendar",
    color: "#D4775A",
  },
  {
    id: "learn",
    label: "Teach me something",
    prompt: "Teach me Dijkstra's algorithm from scratch",
    icon: "GraduationCap",
    color: "#4A7B6B",
  },
  {
    id: "habit",
    label: "Add a habit",
    prompt: "I don't work before 2 PM and I need 1-hour breaks between sessions",
    icon: "Target",
    color: "#6B7FB5",
    hint: "Try planning your week first",
    dependsOn: "plan_week",
  },
  {
    id: "upload",
    label: "Upload a document",
    prompt: "Here are my practice problems for the DL contest",
    icon: "FileUp",
    color: "#E09D5C",
    hint: "Plan a week to link documents to tasks",
    dependsOn: "plan_week",
  },
];
