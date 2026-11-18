"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import clsx from "clsx";
import { CAPSTONE_TOPICS, type CapstoneTopic } from "@/lib/capstone";
import { jarvisUtterance } from "@/lib/speech";

const CHIP: Record<string, string> = {
  architecture: "Architecture", "chat-turn": "Chat turn", accept: "Double click", anticipation: "Morning brief",
  memory: "Memory", solver: "CP-SAT", database: "Database", api: "API", oop: "OOP", solid: "SOLID", patterns: "Patterns",
};

/** Roughly how long a line takes to read, when it cannot be spoken. */
const readingMs = (text: string) => Math.max(2600, text.length * 62);

function SequenceDiagram({ topic, at }: { topic: CapstoneTopic; at: number }) {
  const lanes = topic.lanes ?? [];
  const gap = 140;
  const left = 78;
  const row = 46;
  const width = left * 2 + gap * (lanes.length - 1);
  const height = 96 + row * topic.steps.length;
  const x = (lane: number) => left + gap * lane;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label={topic.title}>
      <defs>
        <marker id="cap-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="10" markerHeight="10" markerUnits="userSpaceOnUse" orient="auto-start-reverse">
          <path d="M0 0 10 5 0 10z" fill="currentColor" />
        </marker>
      </defs>
      {lanes.map((lane, i) => (
        <g key={lane} className="capstone-compose" style={{ animationDelay: `${i * 140}ms` }}>
          <line x1={x(i)} y1={46} x2={x(i)} y2={height - 12} className="capstone-lifeline" />
          <rect x={x(i) - 62} y={10} width={124} height={34} rx={8} className="capstone-lane" />
          <text x={x(i)} y={32} textAnchor="middle" className="capstone-lane-text">{lane}</text>
        </g>
      ))}
      {topic.steps.map((step, i) => {
        if (i > at) return null;
        const y = 84 + row * i;
        const from = x(step.from ?? 0);
        const to = x(step.to ?? 0);
        const self = from === to;
        const now = i === at;
        const path = self
          ? `M${from} ${y} h34 v16 h-28`
          : `M${from} ${y} L${to + (to > from ? -4 : 4)} ${y}`;
        const mid = self ? from + 44 : (from + to) / 2;
        return (
          <g key={i} className={clsx("capstone-step", now && "capstone-step--now")}>
            <path d={path} pathLength={1} markerEnd="url(#cap-arrow)" className="capstone-arrow" />
            {now && !self && <circle r={5} className="capstone-pulse"><animateMotion dur="1.1s" repeatCount="indefinite" path={path} /></circle>}
            <text x={mid} y={y - 8} textAnchor={self ? "start" : "middle"} className="capstone-arrow-text">
              {`${i + 1}. ${step.label}`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Cards({ topic, at }: { topic: CapstoneTopic; at: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {topic.steps.map((step, i) => (
        <div
          key={step.label}
          style={{ animationDelay: `${i * 110}ms` }}
          className={clsx(
            "capstone-card capstone-compose rounded-card border px-4 py-3.5",
            i > at && "capstone-card--waiting",
            i === at && "capstone-card--now",
          )}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-terra">{String(i + 1).padStart(2, "0")}</p>
          <p className="mt-1 text-base font-semibold text-primary">{step.label}</p>
          {step.detail && <p className="mt-1 font-mono text-xs text-secondary">{step.detail}</p>}
        </div>
      ))}
    </div>
  );
}

function CapstoneWalkthrough() {
  const params = useSearchParams();
  const asked = params.get("topic");
  const [topicId, setTopicId] = useState(CAPSTONE_TOPICS[0].id);
  // -1 is the topic's opening line, before its first step.
  const [at, setAt] = useState(-1);
  const [playing, setPlaying] = useState(false);

  const topic = useMemo(
    () => CAPSTONE_TOPICS.find((candidate) => candidate.id === topicId) ?? CAPSTONE_TOPICS[0],
    [topicId],
  );

  const open = useCallback((id: string, play: boolean) => {
    setTopicId(id);
    setAt(-1);
    setPlaying(play);
  }, []);

  // A topic asked for by voice (or in the link) starts playing.
  useEffect(() => {
    if (asked && CAPSTONE_TOPICS.some((candidate) => candidate.id === asked)) open(asked, true);
  }, [asked, open]);

  const line = at < 0 ? `Let me draw that for you, sir. ${topic.intro}` : topic.steps[at].say;

  // The caption is written out as it is spoken.
  const [typed, setTyped] = useState(0);
  useEffect(() => {
    setTyped(0);
    const timer = window.setInterval(() => setTyped((count) => (count >= line.length ? count : count + 2)), 28);
    return () => window.clearInterval(timer);
  }, [line]);
  const composing = topic.kind === "sequence"
    ? `compose sequence · ${topic.lanes?.length ?? 0} participants · ${topic.steps.length} messages`
    : `compose view · ${topic.steps.length} parts`;

  // Say the current line, then move on. Without speech, wait about as long as reading takes.
  useEffect(() => {
    if (!playing) return;
    let over = false;
    let wait: number | undefined;
    const next = () => {
      if (over) return;
      over = true;
      if (at + 1 < topic.steps.length) setAt(at + 1);
      else setPlaying(false);
    };
    const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;
    if (canSpeak) {
      const utterance = jarvisUtterance(line);
      utterance.onend = () => { wait = window.setTimeout(next, 350); };
      utterance.onerror = () => { wait = window.setTimeout(next, readingMs(line)); };
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } else {
      wait = window.setTimeout(next, readingMs(line));
    }
    // A voice that never reports its end must not stall the walkthrough.
    const limit = window.setTimeout(next, readingMs(line) * 2 + 4000);
    return () => {
      over = true;
      window.clearTimeout(wait);
      window.clearTimeout(limit);
      if (canSpeak) window.speechSynthesis.cancel();
    };
  }, [playing, at, topic, line]);

  const step = (by: number) => {
    setPlaying(false);
    setAt((current) => Math.min(topic.steps.length - 1, Math.max(-1, current + by)));
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key === "ArrowRight") step(1);
      else if (event.key === "ArrowLeft") step(-1);
      else if (event.key === " ") { event.preventDefault(); setPlaying((on) => !on); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 sm:px-6 sm:py-8">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-terra">Capstone mode · how Jarvis was built</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-primary">{topic.title}</h1>
        <p className="mt-1 text-sm text-secondary">Presented by {topic.by}</p>
      </header>

      <nav className="flex flex-wrap gap-1.5" aria-label="Topics">
        {CAPSTONE_TOPICS.map((candidate) => (
          <button
            key={candidate.id}
            type="button"
            onClick={() => open(candidate.id, true)}
            aria-current={candidate.id === topic.id}
            className={clsx(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              candidate.id === topic.id
                ? "border-terra bg-terra text-ink"
                : "border-border bg-surface-card text-secondary hover:border-terra/50 hover:text-primary",
            )}
          >
            {CHIP[candidate.id] ?? candidate.title}
          </button>
        ))}
      </nav>

      <section key={topic.id} className="capstone-stage rounded-card border border-border bg-surface-card/90 p-4 shadow-sm sm:p-6">
        <p className="capstone-status mb-3 font-mono text-[11px] text-muted">
          <span className="text-terra">jarvis ›</span> {composing} · {at < 0 ? "drawing" : `step ${at + 1}/${topic.steps.length}`}
          <span className="capstone-cursor" aria-hidden="true" />
        </p>
        {topic.kind === "sequence" ? <SequenceDiagram topic={topic} at={at} /> : <Cards topic={topic} at={at} />}
      </section>

      <section className="capstone-caption flex items-center gap-3 rounded-card border border-terra/25 bg-surface-card px-4 py-3" aria-live="polite">
        <span className={clsx("capstone-voice", playing && "capstone-voice--on")} aria-hidden="true"><i /><i /><i /><i /></span>
        <p className="min-w-0 flex-1 text-base leading-snug text-primary">
          {line.slice(0, typed)}
          {typed < line.length && <span className="capstone-cursor" aria-hidden="true" />}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={() => step(-1)} aria-label="Previous step" className="rounded-lg p-2 text-secondary hover:bg-surface-muted hover:text-primary"><ChevronLeft size={18} /></button>
          <button
            type="button"
            onClick={() => { if (!playing && at >= topic.steps.length - 1) setAt(-1); setPlaying((on) => !on); }}
            aria-label={playing ? "Pause" : "Play"}
            className="rounded-lg bg-terra p-2 text-ink"
          >
            {playing ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <button type="button" onClick={() => step(1)} aria-label="Next step" className="rounded-lg p-2 text-secondary hover:bg-surface-muted hover:text-primary"><ChevronRight size={18} /></button>
        </div>
      </section>
      <p className="text-xs text-muted">
        Say “Jarvis, explain the chat turn”, “show the database schema”, “SOLID principles”, “design patterns”… or use ← → and space.
        Step {Math.max(at + 1, 0)} of {topic.steps.length}.
      </p>
    </div>
  );
}

export default function CapstonePage() {
  return (
    <Suspense fallback={null}>
      <CapstoneWalkthrough />
    </Suspense>
  );
}
