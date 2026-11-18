/**
 * Capstone mode: Jarvis explains how it was built. Each topic is a script: what to
 * draw, step by step, and what to say at each step. Nothing here calls a model, so the
 * walkthrough plays the same every time.
 */

export type CapstoneStep = {
  /** Sequence diagrams: index of the lane the arrow leaves and the lane it reaches. */
  from?: number;
  to?: number;
  /** The arrow's label, or the card's title. */
  label: string;
  /** Cards: one line under the title. */
  detail?: string;
  /** What Jarvis says while this step is on screen. */
  say: string;
};

export type CapstoneTopic = {
  id: string;
  title: string;
  /** Who presents it. */
  by: string;
  kind: "sequence" | "cards";
  lanes?: string[];
  intro: string;
  steps: CapstoneStep[];
  /** Words in a spoken request that mean this topic. */
  words: RegExp;
};

export const CAPSTONE_MODE_KEY = "jarvis-capstone-mode";
/** Fired on window with detail "stop" | "resume" | "next" | "back" to steer the walkthrough. */
export const CAPSTONE_CONTROL_EVENT = "jarvis:capstone-control";

export const CAPSTONE_TOPICS: CapstoneTopic[] = [
  {
    id: "architecture",
    title: "Architecture: dependencies point inward",
    by: "Murali",
    kind: "cards",
    words: /\b(architecture|layers?|high[- ]level design|hld|big picture)\b/,
    intro: "I am one FastAPI process, built in layers. Every dependency points inward, toward the domain.",
    steps: [
      { label: "Frontend", detail: "Next.js", say: "The frontend is a Next.js app. It talks to me over one streaming chat endpoint and a set of REST routes." },
      { label: "API", detail: "app/api", say: "The API layer only routes. It reads the request, calls a service, and returns a typed model. No business logic lives here." },
      { label: "Services", detail: "app/services", say: "Services hold the application logic: the chat turn, drafts, tasks, memory and anticipation." },
      { label: "Orchestrator", detail: "app/orchestrator, app/modules", say: "The orchestrator is a LangGraph graph. It decides which steps a turn goes through, including the planning sub graph." },
      { label: "Domain", detail: "app/domain", say: "The domain is the centre. Entities, abstract ports, events, consent and errors. It imports nothing from the outer layers." },
      { label: "Infrastructure", detail: "app/infrastructure", say: "Infrastructure implements the ports: Supabase and in memory repositories, the model providers, and the embedder." },
      { label: "Composition root", detail: "app/container.py", say: "One place, the app container, chooses every concrete class at startup. A test reads every import and fails if a layer breaks the rule." },
    ],
  },
  {
    id: "chat-turn",
    title: "Sequence: the life of one chat turn",
    by: "Murali",
    kind: "sequence",
    words: /\b(chat turn|life of (?:a|one) (?:chat )?turn|brain dump|planning (?:flow|sequence)|sequence diagram)\b/,
    lanes: ["Browser", "Router", "ChatTurn", "Graph", "Model", "Solver", "DraftService"],
    intro: "This is what happens when you send me one message. Watch the request travel.",
    steps: [
      { from: 0, to: 1, label: "POST /chat/stream", say: "The browser posts to my one chat endpoint. The router only validates the request." },
      { from: 1, to: 2, label: "open_turn", say: "The chat turn service opens a turn, and the reply starts streaming back as typed frames." },
      { from: 2, to: 2, label: "lock, read history and memories", say: "The turn takes the conversation lock, reads the history and my memories of you, and saves your message." },
      { from: 2, to: 3, label: "run the graph", say: "The graph runs in its own background task, so you see progress while I work." },
      { from: 3, to: 4, label: "extract (fast model)", say: "A fast model reads your message and pulls out the goal, the tasks, and anything you stated about yourself." },
      { from: 3, to: 3, label: "classify by rules", say: "Plain rules, with no model call, decide this is a planning request." },
      { from: 3, to: 4, label: "decompose (primary model)", say: "The primary model breaks the goal into small tasks. It does not schedule them." },
      { from: 3, to: 5, label: "solve with CP-SAT", say: "A constraint solver places the tasks around your rules. Every hard rule holds, or it reports that nothing fits." },
      { from: 3, to: 6, label: "propose a draft", say: "The result is saved as a draft. Nothing reaches your task list until you accept." },
      { from: 3, to: 3, label: "learn inside the turn", say: "Before I finish, I remember what you stated, and PEARL gets half a second to look for patterns." },
      { from: 2, to: 0, label: "one complete frame", say: "One final frame closes the turn, and the lock is released." },
    ],
  },
  {
    id: "accept",
    title: "Sequence: a double click on Accept writes once",
    by: "Amathziah",
    kind: "sequence",
    words: /\b(double click|accept (?:flow|sequence)|atomic accept|two clicks|concurrency)\b/,
    lanes: ["Click 1", "Click 2", "DraftService", "Postgres"],
    intro: "Two Accept requests arrive at the same moment. Only one may win.",
    steps: [
      { from: 0, to: 2, label: "accept", say: "The first click reaches the draft service." },
      { from: 1, to: 2, label: "accept", say: "The second click arrives a moment later. Both pass the quick check, because the draft is still pending." },
      { from: 2, to: 3, label: "accept_draft, call 1", say: "Call one enters the database function. It locks your profile row, then the draft row." },
      { from: 2, to: 3, label: "accept_draft, call 2 waits", say: "Call two has to wait on that lock." },
      { from: 3, to: 3, label: "write tasks, mark accepted, commit", say: "Call one replaces the pending tasks, marks the draft accepted, and commits. All in one transaction." },
      { from: 3, to: 0, label: "200 accepted", say: "The first click gets a two hundred." },
      { from: 3, to: 1, label: "409 conflict", say: "Call two now reads the status, sees accepted, and is refused with a four oh nine. The tasks were written exactly once." },
    ],
  },
  {
    id: "anticipation",
    title: "Sequence: the morning brief, under consent",
    by: "Murali",
    kind: "sequence",
    words: /\b(anticipation|morning brief|proactive|consent|clock|trigger)\b/,
    lanes: ["Clock", "Sweeps", "Trigger", "Planner", "Consent", "Suggestions", "You"],
    intro: "Here the first actor is not you. It is a clock.",
    steps: [
      { from: 0, to: 0, label: "tick every 60 s", say: "Every sixty seconds, my scheduler ticks." },
      { from: 0, to: 1, label: "run sweeps", say: "First the sweeps. For example, a task whose time passed with no outcome is marked missed. I infer it. I never ask, did you do this." },
      { from: 0, to: 2, label: "run the trigger", say: "Then the triggers for each user. Every trigger follows one fixed order that no trigger can change." },
      { from: 2, to: 5, label: "already done today?", say: "Was a brief already made today? If so, I stop. One brief a day." },
      { from: 2, to: 3, label: "draft today's plan", say: "I draft today's plan with the same planner a chat turn uses." },
      { from: 2, to: 4, label: "may I?", say: "Then consent. Four rules in order. Did you dismiss this before? Is it read only? Did you already state a rule? Otherwise your autonomy setting decides." },
      { from: 4, to: 2, label: "ask: it changes your schedule", say: "Applying a plan changes your schedule, so the answer is: ask first." },
      { from: 2, to: 5, label: "store as pending", say: "The suggestion is stored as pending. That is the card on your dashboard." },
      { from: 6, to: 5, label: "Accept: claim, then run", say: "When you click Accept, I claim the suggestion first and then run it. A double click runs it once." },
    ],
  },
  {
    id: "memory",
    title: "Sequence: remember, recall, and a forget that sticks",
    by: "Murali",
    kind: "sequence",
    words: /\b(memory|memories|remember|forget|recall)\b/,
    lanes: ["You", "Chat turn", "MemoryService", "Embedder", "Postgres"],
    intro: "This is how I remember what you say, and how I forget for good.",
    steps: [
      { from: 0, to: 1, label: "\"I work best after 9 pm\"", say: "You tell me something about yourself." },
      { from: 1, to: 2, label: "remember", say: "The fact was already found by the extraction step, so remembering costs no extra model call." },
      { from: 2, to: 3, label: "embed", say: "The words become a vector, a fingerprint of the meaning, computed on this machine." },
      { from: 2, to: 4, label: "suppress, supersede, reinforce or create", say: "Then one of four things. Ignore it if you once asked me to forget it. Replace a memory it contradicts. Strengthen one it repeats. Or create it, labelled, you said." },
      { from: 1, to: 4, label: "recall within a budget", say: "On a later message, one query finds only the memories that matter, by similarity, filtered by user and status, within a token budget." },
      { from: 0, to: 2, label: "Forget", say: "You click Forget." },
      { from: 2, to: 4, label: "tombstone: words erased", say: "The words are erased, but the fingerprint is kept as a tombstone." },
      { from: 0, to: 2, label: "says it again", say: "So when you say the same thing next week, I recognise it and store nothing. Forget sticks." },
    ],
  },
  {
    id: "solver",
    title: "CP-SAT: the solver places the work",
    by: "Murali",
    kind: "cards",
    words: /\b(cp[- ]?sat|solver|scheduler|constraint|pearl|patterns? detect\w*)\b/,
    intro: "A language model asked to schedule makes overlaps. So I never let the model schedule.",
    steps: [
      { label: "Hard blocks", detail: "sleep, classes, your rules, the past", say: "Hard blocks can never be crossed: sleep, classes, the rules you gave me, and the part of today already gone." },
      { label: "Soft blocks", detail: "only short, easy tasks", say: "Soft blocks allow only short, easy tasks. Fifteen minutes at most." },
      { label: "Objective", detail: "shorter plan + urgency × value", say: "The objective prefers a shorter plan, and puts urgent, valuable work first." },
      { label: "What PEARL learned", detail: "the energy term", say: "PEARL reads your outcome history and learns your strong hours. Hard tasks lean toward them. But a task due within a day always wins." },
      { label: "Time limits", detail: "10 s, stop 1 s after the last gain", say: "The search is capped at ten seconds and stops one second after it last improved." },
      { label: "Nothing fits", detail: "3 → 5 → 7 → 14 → 30 days", say: "If nothing fits, I widen the window, from three days up to thirty. Past that, I say it is a scope problem, not a you problem." },
    ],
  },
  {
    id: "database",
    title: "Database: current state beside append-only history",
    by: "Ravi",
    kind: "cards",
    words: /\b(database|schema|er diagram|tables)\b/,
    intro: "My state lives in one Postgres database. Every table carries a user id.",
    steps: [
      { label: "user_profiles", detail: "the root", say: "User profiles is the root. Every other table points to it. It holds your timezone, wake time and autonomy setting." },
      { label: "draft_schedules", detail: "a proposal, as JSON", say: "A draft is a proposed plan, kept as a whole until you accept it." },
      { label: "user_tasks", detail: "current state only", say: "User tasks holds only the current state of each task." },
      { label: "task_events", detail: "append-only history", say: "Task events is append only. One row per outcome: completed, skipped, missed, rescheduled. Learning reads this, never the status column." },
      { label: "user_memories", detail: "status + vector(384)", say: "Memories carry a status and an embedding, so one query can filter and rank by meaning." },
      { label: "proactive_suggestions", detail: "what I proposed, and why", say: "Suggestions record everything I proposed on my own, the consent decision, and the reason." },
      { label: "accept_draft()", detail: "one transaction", say: "And one database function, accept draft, turns a draft into real tasks inside a single transaction." },
    ],
  },
  {
    id: "api",
    title: "API design: one stream in, typed frames out",
    by: "Ravi",
    kind: "cards",
    words: /\b(api|endpoints?|rest|error handling|errors?)\b/,
    intro: "My API has one streaming endpoint for chat, and REST resources for everything else.",
    steps: [
      { label: "POST /api/v1/chat/stream", detail: "server-sent events", say: "Chat is one endpoint. The reply is a stream of typed frames over a single response." },
      { label: "Typed responses", detail: "a response model on every route", say: "Every JSON route declares a typed response model." },
      { label: "Verbs for state changes", detail: "POST /drafts/{id}/accept", say: "A state change is a post to a verb, because accepting is a move in a state machine, not a field edit." },
      { label: "One error envelope", detail: "code, message, details, request_id", say: "Every error has one shape, and exception text never reaches the client." },
      { label: "409 for conflicts", detail: "invalid_state_transition, stale_version", say: "A second accept, or an accept of a plan that changed, is a four oh nine conflict." },
      { label: "404, not 403", detail: "another user's row", say: "Another user's data answers not found, never forbidden, so nothing reveals that it exists." },
    ],
  },
  {
    id: "oop",
    title: "OOP: four pillars, four real classes",
    by: "Pugal",
    kind: "cards",
    words: /\b(oop|oops|object[- ]oriented|pillars?|encapsulation|inheritance|polymorphism|abstraction)\b/,
    intro: "The four pillars of object oriented design, each with a real class from my code.",
    steps: [
      { label: "Encapsulation", detail: "DraftSchedule.transition()", say: "Encapsulation. A draft's status can only change through its transition method, which checks the table of legal moves." },
      { label: "Abstraction", detail: "LLMProvider", say: "Abstraction. The code that asks a question sees an abstract provider. No vendor, no retry, no network detail." },
      { label: "Inheritance", detail: "JarvisError", say: "Inheritance. Every error extends one base, and each subclass carries its own code and HTTP status." },
      { label: "Polymorphism", detail: "FallbackChainProvider.complete", say: "Polymorphism. One loop calls complete on any provider: the local model, Claude, or Gemini." },
    ],
  },
  {
    id: "solid",
    title: "SOLID, as the tests keep it",
    by: "Pugal",
    kind: "cards",
    words: /\b(solid|single responsibility|open[- ]closed|liskov|interface segregation|dependency inversion)\b/,
    intro: "The five SOLID principles. Each one has a test that fails if it breaks.",
    steps: [
      { label: "S · Single responsibility", detail: "the chat router only routes", say: "Single responsibility. The chat router only routes, and each model decorator adds exactly one concern." },
      { label: "O · Open/closed", detail: "add a PatternDetector, edit nothing", say: "Open closed. A new pattern detector is a new class. The trigger that offers it as a rule is never edited." },
      { label: "L · Liskov substitution", detail: "two repository families, one contract", say: "Liskov. The Supabase and in memory repositories pass the very same tests, so either can replace the other." },
      { label: "I · Interface segregation", detail: "PlanningServices", say: "Interface segregation. Planning receives a small record of what it needs, not the whole container." },
      { label: "D · Dependency inversion", detail: "AppContainer injects ports", say: "Dependency inversion. Services depend on abstract ports, and one container injects the real classes." },
      { label: "Where it falls short", detail: "said out loud", say: "And honestly: the turn state is large and carries the whole container, and a few files still call the database directly." },
    ],
  },
  {
    id: "patterns",
    title: "Design patterns, each with a job",
    by: "The team",
    kind: "cards",
    words: /\b(design patterns?|patterns|singleton|factory|strategy|observer|repository|adapter|decorator|template method|state machine)\b/,
    intro: "Design patterns, each solving a real problem, and who presents it.",
    steps: [
      { label: "Repository", detail: "Ravi · 11 ports, two families", say: "Repository. Services store data without knowing the database exists. Presented by Ravi." },
      { label: "Adapter", detail: "Ravi · ClaudeProvider, Supabase repos", say: "Adapter. Outside libraries are made to fit my own interfaces, and their errors become mine." },
      { label: "Strategy", detail: "Murali · LLMProvider, PatternDetector", say: "Strategy. Three models and four pattern detectors, each swappable without touching the caller. Presented by Murali." },
      { label: "State", detail: "Murali · transition tables", say: "State. Tables of legal moves refuse a second accept, or the return of a forgotten memory." },
      { label: "Observer", detail: "Amathziah · EventBus", say: "Observer. When you finish a task, the event bus tells PEARL. The click never waits for learning. Presented by Amathziah." },
      { label: "Template Method", detail: "Amathziah · Trigger.run", say: "Template method. Every trigger follows one fixed order, so consent can never be skipped." },
      { label: "Factory", detail: "Pugal · RepositoryFactory", say: "Factory. One place builds a whole matching family of objects. Presented by Pugal." },
      { label: "Singleton", detail: "Pugal · one AppContainer", say: "Singleton. One container, built once at startup and passed in, never fetched from a global." },
    ],
  },
];

/** The topic a spoken request asks about, if any. */
export function capstoneTopicFor(request: string): CapstoneTopic | null {
  const said = request.toLowerCase();
  return CAPSTONE_TOPICS.find((topic) => topic.words.test(said)) ?? null;
}
