"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getWorkspace, completeTask } from "@/lib/api";
import { USER_ID } from "@/lib/constants";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SM2QualityRating } from "@/components/app/SM2QualityRating";
import type { TaskWorkspace, StudyAsset, ImplementationIntention } from "@/lib/types";
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

function isLinkAsset(type: string): boolean {
  return ["youtube_link", "article_link", "blog_link", "leetcode_link", "codeforces_link"].includes(type);
}

// ---------------------------------------------------------------------------
// Expandable Content Card
// ---------------------------------------------------------------------------

function ExpandableAssetCard({ asset }: { asset: StudyAsset }) {
  const [open, setOpen] = useState(false);
  const config = ASSET_CONFIG[asset.asset_type] || { icon: FileText, color: "ink", label: asset.asset_type };
  const Icon = config.icon;
  const colors = COLOR_CLASSES[config.color] || COLOR_CLASSES.terra;

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-subtle"
      >
        <div className={clsx("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", colors.bg)}>
          <Icon size={16} className={colors.text} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-primary truncate">{asset.title}</p>
          <p className="text-xs text-muted truncate">{asset.rationale}</p>
        </div>
        {open ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
      </button>
      {open && (
        <div className="border-t border-border px-4 py-3">
          <div className="prose prose-sm max-w-none text-primary text-sm leading-relaxed whitespace-pre-wrap">
            {asset.content_or_url}
          </div>
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
  const [checked, setChecked] = useState<boolean[]>([]);
  const [showRating, setShowRating] = useState(false);
  const [completing, setCompleting] = useState(false);

  // WOOP from localStorage
  const [woop, setWoop] = useState<ImplementationIntention | null>(null);

  // ---- Load workspace ----
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const ws = await getWorkspace(taskId);
        if (cancelled) return;
        setWorkspace(ws);

        // Parse criteria from primary_objective or from localStorage execution_graph
        const parsedCriteria: string[] = [];
        try {
          const stored = localStorage.getItem("jarvis-last-chat-response");
          if (stored) {
            const response = JSON.parse(stored);
            if (response.execution_graph) {
              const task = response.execution_graph.decomposition?.find(
                (t: Record<string, unknown>) => t.task_id === taskId,
              );
              if (task?.completion_criteria) {
                const lines = (task.completion_criteria as string)
                  .split(/[;\n]/)
                  .map((s: string) => s.trim())
                  .filter(Boolean);
                parsedCriteria.push(...lines);
              }
              if (task?.implementation_intention) {
                setWoop(task.implementation_intention as ImplementationIntention);
              }
            }
          }
        } catch {
          // ignore
        }

        // Fallback: use primary_objective as single criterion
        if (parsedCriteria.length === 0 && ws.primary_objective) {
          parsedCriteria.push(ws.primary_objective);
        }

        setCriteria(parsedCriteria);
        setChecked(new Array(parsedCriteria.length).fill(false));
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

  // ---- Group assets by type ----
  const linkAssets = workspace?.surfaced_assets.filter((a) => isLinkAsset(a.asset_type)) ?? [];
  const contentAssets = workspace?.surfaced_assets.filter((a) => !isLinkAsset(a.asset_type)) ?? [];

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-8 w-8 rounded-lg bg-surface-muted animate-pulse" />
          <div className="h-6 w-48 rounded-lg bg-surface-muted animate-pulse" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-card bg-surface-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // ---- Error state ----
  if (error && !workspace) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
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
    <div className="mx-auto max-w-3xl px-6 py-8 space-y-5">
      {/* Header */}
      <div>
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-3 flex items-center gap-1.5 text-xs font-medium text-secondary transition-colors hover:text-primary"
        >
          <ArrowLeft size={14} />
          Back
        </button>
        <h1 className="text-xl font-bold text-primary">
          {workspace?.task_title ?? "Workspace"}
        </h1>
        {workspace?.primary_objective && (
          <p className="mt-1 text-sm text-secondary">{workspace.primary_objective}</p>
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
                  className="flex w-full items-start gap-2.5 rounded-lg p-1.5 text-left transition-colors hover:bg-surface-subtle"
                >
                  {checked[i] ? (
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-sage" />
                  ) : (
                    <Circle size={18} className="mt-0.5 shrink-0 text-muted" />
                  )}
                  <span
                    className={clsx(
                      "text-sm text-primary",
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

      {/* Study Materials */}
      {(linkAssets.length > 0 || contentAssets.length > 0) && (
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-secondary">
            Study Materials
          </h2>
          <div className="space-y-2">
            {linkAssets.map((asset, i) => (
              <LinkAssetCard key={`link-${i}`} asset={asset} />
            ))}
            {contentAssets.map((asset, i) => (
              <ExpandableAssetCard key={`content-${i}`} asset={asset} />
            ))}
          </div>
        </div>
      )}

      {/* Empty materials state */}
      {workspace && workspace.surfaced_assets.length === 0 && (
        <Card className="px-5 py-8 text-center">
          <p className="text-sm text-muted">No study materials surfaced for this task.</p>
        </Card>
      )}

      {/* WOOP: Implementation Intention */}
      {woop && (
        <Card className="border-l-[3px] border-dusk px-5 py-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-dusk">
            Implementation Intention (WOOP)
          </h2>
          <div className="space-y-2">
            <div className="rounded-lg bg-surface-subtle px-3 py-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted">IF</span>
              <p className="mt-0.5 text-sm text-primary">{woop.obstacle_trigger}</p>
            </div>
            <div className="rounded-lg bg-surface-subtle px-3 py-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted">THEN</span>
              <p className="mt-0.5 text-sm text-primary">{woop.behavioral_response}</p>
            </div>
          </div>
        </Card>
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
