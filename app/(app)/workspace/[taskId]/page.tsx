"use client";

export const runtime = "edge";

import { useEffect, useState, useCallback, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getWorkspace, completeTask } from "@/lib/api";
import { documentHref, linkedDocumentsOf, type LinkedDocumentView } from "@/lib/documents";
import { USER_ID } from "@/lib/constants";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SM2QualityRating } from "@/components/app/SM2QualityRating";
import { WoopCard } from "@/components/app/WoopCard";
import { Markdown } from "@/components/app/Markdown";
import { QuizCard } from "@/components/app/QuizCard";
import {
  excerptSource,
  groupAssets,
  approachOf,
  noticesOf,
  preparedTitle,
  quizOf,
  taskFacts,
  woopFor,
  workspaceHeader,
  type WorkspaceWoop,
} from "@/lib/workspace";
import type { TaskWorkspace, StudyAsset } from "@/lib/types";
import {
  ArrowLeft,
  ExternalLink,
  Play,
  FileText,
  Code,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  Loader2,
  AlertTriangle,
  ArrowUpRight,
  Info,
} from "lucide-react";
import clsx from "clsx";

// ---------------------------------------------------------------------------
// Asset icon + color by type
// ---------------------------------------------------------------------------

// Static Tailwind class map — avoids dynamic `bg-${color}` which Tailwind can't detect
const COLOR_CLASSES: Record<string, { bg: string; text: string; border: string }> = {
  terra: { bg: "bg-terra/15", text: "text-terra", border: "border-terra" },
  sage:  { bg: "bg-sage/15",  text: "text-sage",  border: "border-sage" },
  dusk:  { bg: "bg-dusk/15",  text: "text-dusk",  border: "border-dusk" },
  gold:  { bg: "bg-gold/15",  text: "text-gold",  border: "border-gold" },
  ink:   { bg: "bg-ink/15",   text: "text-ink",   border: "border-ink" },
};

const ASSET_CONFIG: Record<string, { icon: typeof Play; color: string; label: string }> = {
  youtube_link:      { icon: Play,     color: "terra", label: "YouTube" },
  article_link:      { icon: FileText, color: "dusk",  label: "Article" },
  blog_link:         { icon: FileText, color: "dusk",  label: "Blog" },
  pdf_chunk:         { icon: FileText, color: "gold",  label: "PDF Excerpt" },
  generated_content: { icon: FileText, color: "sage",  label: "Generated Content" },
  generated_quiz:    { icon: FileText, color: "sage",  label: "Quiz" },
  leetcode_link:     { icon: Code,     color: "gold",  label: "LeetCode" },
  codeforces_link:   { icon: Code,     color: "dusk",  label: "Codeforces" },
};

// ---------------------------------------------------------------------------
// Expandable Content Card
// ---------------------------------------------------------------------------

function ExpandableAssetCard({ asset, defaultOpen = false }: { asset: StudyAsset; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const config = ASSET_CONFIG[asset.asset_type] || { icon: FileText, color: "ink", label: asset.asset_type };
  const Icon = config.icon;
  const colors = COLOR_CLASSES[config.color] || COLOR_CLASSES.terra;
  // An excerpt that names its document opens it in the viewer.
  const source = excerptSource(asset);

  return (
    <Card className="overflow-hidden">
      <div className="flex items-stretch">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-subtle"
        >
          <div className={clsx("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", colors.bg)}>
            <Icon size={16} className={colors.text} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-primary truncate">{asset.title || config.label}</p>
            {asset.rationale && <p className="text-xs text-muted truncate">{asset.rationale}</p>}
          </div>
          {open ? <ChevronUp size={16} className="shrink-0 text-muted" /> : <ChevronDown size={16} className="shrink-0 text-muted" />}
        </button>
        {source && (
          <Link
            href={documentHref(source.sourceId)}
            aria-label={source.fileName ? `Open ${source.fileName}` : "Open document"}
            className="group flex shrink-0 items-center gap-1 border-l border-border px-3 text-xs font-medium text-terra transition-colors hover:bg-surface-subtle"
          >
            <span className="sm:hidden">Open</span>
            <span className="max-sm:hidden">Open document</span>
            <ArrowUpRight
              size={14}
              className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </Link>
        )}
      </div>
      {open && (
        <div className="border-t border-border px-4 py-3">
          <Markdown>{asset.content_or_url}</Markdown>
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Link Asset Card
// ---------------------------------------------------------------------------

function LinkAssetCard({ asset }: { asset: StudyAsset }) {
  const config = ASSET_CONFIG[asset.asset_type] || { icon: ExternalLink, color: "ink", label: asset.asset_type };
  const Icon = config.icon;
  const colors = COLOR_CLASSES[config.color] || COLOR_CLASSES.terra;

  return (
    <a
      href={asset.content_or_url}
      target="_blank"
      rel="noopener noreferrer"
      className="block"
    >
      <Card hover className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-subtle">
        <div className={clsx("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", colors.bg)}>
          <Icon size={16} className={colors.text} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-primary truncate">{asset.title}</p>
          <p className="text-xs text-muted truncate">{asset.rationale}</p>
        </div>
        <ExternalLink size={14} className="shrink-0 text-muted" />
      </Card>
    </a>
  );
}

// ---------------------------------------------------------------------------
// From your documents
// ---------------------------------------------------------------------------

/** A labelled section of the workspace; the page leaves out a section with nothing in it. */
function WorkspaceSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="mb-3 text-xs font-semibold uppercase tracking-wider text-secondary">
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

/** The user's own uploads linked to this task, each opening in the document viewer. */
function LinkedDocuments({ documents }: { documents: LinkedDocumentView[] }) {
  return (
    <Card className="divide-y divide-border overflow-hidden">
      {documents.map((doc) => (
        <Link
          key={doc.source_id}
          href={documentHref(doc.source_id)}
          className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-subtle max-md:min-h-12"
        >
          <div className={clsx("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", COLOR_CLASSES.terra.bg)}>
            <FileText size={16} className={COLOR_CLASSES.terra.text} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-primary">{doc.title}</p>
            {!doc.has_file && <p className="text-xs text-muted">Extracted text only</p>}
          </div>
          <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-terra">
            Open
            <ArrowUpRight
              size={14}
              className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </span>
        </Link>
      ))}
    </Card>
  );
}

/** A practice asset: a quiz with its answers hidden when it is data, else its markdown. */
function PracticeAsset({ asset }: { asset: StudyAsset }) {
  const quiz = quizOf(asset);
  if (quiz) return <QuizCard quiz={quiz} rationale={asset.rationale} />;
  // An outline or checklist is there to be used: open. A quiz kept only as markdown
  // holds its answers inline, so it starts closed.
  return <ExpandableAssetCard asset={asset} defaultOpen={asset.asset_type === "generated_content"} />;
}

// ---------------------------------------------------------------------------
// Workspace Page
// ---------------------------------------------------------------------------

export default function WorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.taskId as string;

  const [workspace, setWorkspace] = useState<TaskWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Completion criteria tracking
  const [criteria, setCriteria] = useState<string[]>([]);
  const [subtitle, setSubtitle] = useState<string | null>(null);
  const [checked, setChecked] = useState<boolean[]>([]);
  const [showRating, setShowRating] = useState(false);
  const [completing, setCompleting] = useState(false);

  // The task's if-then plan: the chat's plan first, else the workspace's own card
  const [woop, setWoop] = useState<WorkspaceWoop | null>(null);

  // ---- Load workspace ----
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const ws = await getWorkspace(taskId);
        if (cancelled) return;

        // What the chat's last plan said about this task, if it planned it
        let storedTask: Record<string, unknown> | null = null;
        try {
          const stored = localStorage.getItem("jarvis-last-chat-response");
          if (stored) {
            const response = JSON.parse(stored);
            const task = response?.execution_graph?.decomposition?.find(
              (t: Record<string, unknown>) => t?.task_id === taskId,
            );
            if (task && typeof task === "object") storedTask = task as Record<string, unknown>;
          }
        } catch {
          // unreadable: as if the chat never planned it
        }
        const storedCriteria =
          typeof storedTask?.completion_criteria === "string" ? [storedTask.completion_criteria] : [];

        // Backend returned null (404/503): a minimal workspace from local data
        const shown: TaskWorkspace = ws ?? {
          task_id: taskId,
          task_title:
            (typeof storedTask?.title === "string" && storedTask.title) || `Task ${taskId.slice(0, 8)}`,
          primary_objective: "",
          surfaced_assets: [],
        };
        setWorkspace(shown);

        // The task's own criteria first; never one that only repeats the title
        const header = workspaceHeader(shown, storedCriteria);
        setCriteria(header.criteria);
        setSubtitle(header.subtitle);
        setChecked(new Array(header.criteria.length).fill(false));
        setWoop(woopFor(shown, storedTask?.implementation_intention));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load workspace");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [taskId]);

  // ---- Toggle criterion ----
  const toggleCriterion = useCallback((index: number) => {
    setChecked((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  }, []);

  // Check if all criteria are complete
  const allComplete = checked.length > 0 && checked.every(Boolean);
  const completedCount = checked.filter(Boolean).length;
  const progressPercent = criteria.length > 0
    ? Math.round((completedCount / criteria.length) * 100)
    : 0;

  // ---- Handle task completion ----
  async function handleRate(quality: number) {
    setCompleting(true);
    try {
      await completeTask(taskId, USER_ID, quality);
      router.push("/dashboard");
    } catch {
      setError("Failed to mark task complete. Please try again.");
      setCompleting(false);
    }
  }

  // ---- Assets by section ----
  const { fromDocuments, practice, links } = groupAssets(workspace?.surfaced_assets);
  const linkedDocuments = linkedDocumentsOf(workspace);
  const notices = noticesOf(workspace);
  const facts = taskFacts(workspace);
  const approach = approachOf(workspace);
  const nothingFound =
    !!workspace && fromDocuments.length + practice.length + links.length + linkedDocuments.length === 0;

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:px-6 sm:py-8" aria-busy="true" aria-live="polite">
        <Card className="workspace-loading-enter relative overflow-hidden border-terra/15 bg-surface-card/90 px-5 py-10 text-center shadow-md sm:py-12">
          <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-terra/[0.08] blur-3xl" />
          <div className="workspace-loader mx-auto mb-5" aria-hidden="true">
            <span className="workspace-loader-orbit workspace-loader-orbit--outer"><i /></span>
            <span className="workspace-loader-orbit workspace-loader-orbit--inner"><i /></span>
            <span className="workspace-loader-core" />
          </div>
          <p className="relative text-[10px] font-semibold uppercase tracking-[0.2em] text-terra">Jarvis is getting things ready</p>
          <h1 className="relative mt-2 text-xl font-semibold tracking-tight text-primary sm:text-2xl">Opening your workspace</h1>
          <p className="relative mx-auto mt-2 max-w-sm text-sm leading-relaxed text-secondary">
            Gathering your task, notes, and practice materials.
          </p>
          <div className="relative mt-6 flex justify-center gap-1.5" aria-hidden="true">
            {[0, 1, 2].map((dot) => <span key={dot} className="workspace-loader-tick" style={{ animationDelay: `${dot * 180}ms` }} />)}
          </div>
        </Card>
        <div className="space-y-3" aria-hidden="true">
          {[0, 1].map((item) => (
            <div key={item} className="workspace-skeleton h-24 rounded-card border border-border/60 bg-surface-card/55" />
          ))}
        </div>
      </div>
    );
  }

  // ---- Error state ----
  if (error && !workspace) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <Card className="flex flex-col items-center gap-4 px-6 py-12 text-center">
          <AlertTriangle size={40} className="text-gold" />
          <h2 className="text-lg font-semibold text-primary">Could not load workspace</h2>
          <p className="text-sm text-secondary max-w-md">{error}</p>
          <Button variant="secondary" onClick={() => router.back()}>
            <ArrowLeft size={14} className="mr-1.5" />
            Go back
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:space-y-5 sm:px-6 sm:py-8">
      {/* Header */}
      <div>
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-3 flex items-center gap-1.5 text-xs font-medium text-secondary transition-colors hover:text-primary max-md:-ml-2 max-md:mb-1 max-md:min-h-10 max-md:px-2"
        >
          <ArrowLeft size={14} />
          Back
        </button>
        <h1 className="break-words text-xl font-bold text-primary">
          {workspace?.task_title ?? "Workspace"}
        </h1>
        {subtitle && <p className="mt-1 break-words text-sm text-secondary">{subtitle}</p>}
        {(facts.kind || facts.duration || facts.due) && (
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
            {facts.kind && <Badge color="dusk">{facts.kind}</Badge>}
            {facts.duration && <span>{facts.duration}</span>}
            {facts.duration && facts.due && <span aria-hidden="true">·</span>}
            {facts.due && <span className="min-w-0 break-words">{facts.due}</span>}
          </div>
        )}
        {approach && (
          <p className="mt-3 rounded-lg border-l-2 border-terra bg-surface-subtle px-3 py-2 text-sm leading-relaxed text-primary">
            {approach}
          </p>
        )}
      </div>

      {/* Progress bar */}
      {criteria.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-terra transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-secondary tabular-nums">
            {progressPercent}% ({completedCount}/{criteria.length})
          </span>
        </div>
      )}

      {/* Completion Criteria */}
      {criteria.length > 0 && (
        <Card className="px-5 py-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-secondary">
            Completion Criteria
          </h2>
          <ul className="space-y-2">
            {criteria.map((c, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => toggleCriterion(i)}
                  className="flex w-full items-start gap-2.5 rounded-lg p-1.5 text-left transition-colors hover:bg-surface-subtle max-md:min-h-10 max-md:py-2.5"
                >
                  {checked[i] ? (
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-sage" />
                  ) : (
                    <Circle size={18} className="mt-0.5 shrink-0 text-muted" />
                  )}
                  <span
                    className={clsx(
                      "min-w-0 break-words text-sm text-primary",
                      checked[i] && "line-through opacity-60",
                    )}
                  >
                    {c}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* What could not be surfaced (e.g. web results unavailable), said plainly */}
      {notices.length > 0 && (
        <Card role="note" className="space-y-1 px-4 py-3">
          {notices.map((notice, i) => (
            <p key={i} className="flex items-start gap-2 text-xs text-secondary">
              <Info size={14} className="mt-px shrink-0 text-dusk" />
              <span className="min-w-0 break-words">{notice}</span>
            </p>
          ))}
        </Card>
      )}

      {/* From your documents: the documents linked to this task, then excerpts from them */}
      {(linkedDocuments.length > 0 || fromDocuments.length > 0) && (
        <WorkspaceSection id="from-your-documents" title="From your documents">
          {linkedDocuments.length > 0 && <LinkedDocuments documents={linkedDocuments} />}
          {fromDocuments.map((asset, i) => (
            <ExpandableAssetCard key={`excerpt-${i}`} asset={asset} />
          ))}
        </WorkspaceSection>
      )}

      {/* Practice: a quiz, an outline or a checklist */}
      {practice.length > 0 && (
        <WorkspaceSection
          id="practice"
          title={preparedTitle(workspace)}
        >
          {practice.map((asset, i) => (
            <PracticeAsset key={`practice-${i}`} asset={asset} />
          ))}
        </WorkspaceSection>
      )}

      {/* Read or watch: links */}
      {links.length > 0 && (
        <WorkspaceSection id="read-or-watch" title="Read or watch">
          {links.map((asset, i) => (
            <LinkAssetCard key={`link-${i}`} asset={asset} />
          ))}
        </WorkspaceSection>
      )}

      {/* Nothing surfaced at all */}
      {nothingFound && (
        <Card className="px-5 py-6 text-center">
          <p className="text-sm text-secondary">Nothing was found for this task yet.</p>
          <Link
            href="/documents"
            className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-terra hover:underline max-md:min-h-10"
          >
            Upload a document for it
            <ArrowUpRight size={14} />
          </Link>
        </Card>
      )}

      {/* WOOP: Implementation Intention */}
      {woop && (
        <WoopCard
          wish={workspace?.task_title ?? ""}
          outcome={woop.outcome ?? undefined}
          obstacle={woop.obstacle}
          plan={woop.plan}
          taskId={taskId}
        />
      )}

      {/* Complete Task Section */}
      <Card className="border-t-[3px] border-sage px-5 py-4">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-secondary">
          Complete Task
        </h2>
        {!allComplete && criteria.length > 0 && (
          <p className="text-sm text-muted">
            Check off all criteria above to unlock completion.
          </p>
        )}
        {(allComplete || criteria.length === 0) && !showRating && (
          <Button
            variant="primary"
            onClick={() => setShowRating(true)}
            disabled={completing}
          >
            {completing ? (
              <>
                <Loader2 size={14} className="mr-1.5 animate-spin" />
                Completing...
              </>
            ) : (
              "Mark Complete"
            )}
          </Button>
        )}
        {showRating && (
          <SM2QualityRating
            onRate={handleRate}
            taskTitle={workspace?.task_title}
          />
        )}
        {error && workspace && (
          <p className="mt-2 text-xs text-red-500">{error}</p>
        )}
      </Card>
    </div>
  );
}
