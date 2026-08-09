/**
 * Frontend spinner verb fallback — used only when backend doesn't provide a verb.
 * Primary source is the backend (app/utils/spinner_verbs.py).
 */

const PHASE_VERBS: Record<string, string[]> = {
  loading_context:       ["Recollecting", "Summoning", "Dusting off", "Booting up", "Rehydrating"],
  brain_dump_extraction: ["Deciphering", "Noodling on", "Untangling", "Dissecting", "Decoding"],
  intent_classified:     ["Sussing out", "Reading between the lines", "Deducing", "Profiling"],
  planning:              ["Orchestrating", "Choreographing", "Tetris-ing", "Blueprinting"],
  habits_fetched:        ["Rounding up", "Herding", "Cataloguing", "Mustering"],
  translating:           ["Weaving", "Translating", "Mapping out", "Threading"],
  decomposing:           ["Decomposing", "Socratic-chunking", "Slicing into micro-tasks"],
  scheduling:            ["Crunching", "Optimizing", "Number-wrangling", "Tetrimino-ing"],
  researching:           ["Spelunking", "Excavating", "Rummaging the web", "Sleuthing"],
  coaching:              ["Checking in on", "Pep-talking", "Reviewing your wins"],
  ingesting:             ["Munching on", "Digesting", "Absorbing", "Inhaling"],
  synthesizing:          ["Crafting", "Distilling", "Bottling up", "Composing"],
  responding:            ["Composing", "Penning", "Wordsmithing", "Articulating"],
  learning:              ["Absorbing", "Filing away", "Cerebrating", "Jotting down"],
};

const WILDCARD_VERBS = [
  "Jarvising", "Flambéing", "Moonwalking through", "Discombobulating",
  "Combobulating", "Quantum-tunneling", "Vibing with", "Percolating",
  "Gallivanting through", "Razzle-dazzling", "Arc-reactoring",
  "Stark-industrializing", "Tomfoolering with", "Hyperspacing through",
];

export function getSpinnerVerb(phase: string): string {
  if (Math.random() < 0.2) {
    return WILDCARD_VERBS[Math.floor(Math.random() * WILDCARD_VERBS.length)]!;
  }
  const pool = PHASE_VERBS[phase] ?? PHASE_VERBS["responding"]!;
  return pool[Math.floor(Math.random() * pool.length)]!;
}

/**
 * Deterministic verb for COMPLETED phase lines — stable across re-renders.
 * Seeded by phase + timestamp so the word a phase finished with never changes.
 */
export function getStableVerb(phase: string, seed: number): string {
  const pool = PHASE_VERBS[phase] ?? PHASE_VERBS["responding"]!;
  return pool[Math.abs(seed) % pool.length]!;
}

/**
 * Cycling sequence for the ACTIVE phase line: walks the phase's own pool with
 * an occasional wildcard spliced in (the 80/20 rule), so the same line reads
 * "Stark-industrializing… → Orchestrating… → Tetris-ing…" while running.
 */
export function getVerbCycle(phase: string): string[] {
  const pool = [...(PHASE_VERBS[phase] ?? PHASE_VERBS["responding"]!)];
  const wildcard = WILDCARD_VERBS[Math.floor(Math.random() * WILDCARD_VERBS.length)]!;
  pool.splice(Math.min(2, pool.length), 0, wildcard);
  return pool;
}
