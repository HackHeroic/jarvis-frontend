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
