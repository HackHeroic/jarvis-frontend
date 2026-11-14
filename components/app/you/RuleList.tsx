"use client";

import { X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { deleteBehavioralConstraint } from "@/lib/api";
import { useJarvis } from "@/lib/context/JarvisContext";
import { useSingleFlight } from "@/lib/hooks/useSingleFlight";
import { errorMessageOf, freshnessLabel, provenanceLabel, removeWithRollback, statusOf } from "@/lib/you";
import type { RuleShown } from "@/lib/types";

interface RuleListProps {
  rules: RuleShown[];
  setRules: (update: (rules: RuleShown[]) => RuleShown[]) => void;
  /** The user's IANA zone, so "noted today" means today on their clock. */
  timeZone: string;
}

/** Rules every plan respects, said or inferred; forget one and plans stop applying it. */
export function RuleList({ rules, setRules, timeZone }: RuleListProps) {
  const { showToast } = useJarvis();
  const { run, isBusy } = useSingleFlight();
  const now = new Date();

  async function forget(rule: RuleShown, index: number) {
    const pending = run(rule.id, () =>
      removeWithRollback({
        item: rule,
        index,
        key: (r) => r.id,
        setItems: setRules,
        request: () => deleteBehavioralConstraint(rule.id),
        isGone: (err) => statusOf(err) === 404, // already removed: it is gone either way
      }),
    );
    if (!pending) return;
    const failure = await pending;
    if (failure) showToast(errorMessageOf(failure, "That didn't go through. Try again."), "error");
    else showToast("Forgotten — plans stop applying that rule.", "success");
  }

  if (rules.length === 0) {
    return (
      <p className="text-sm text-secondary">
        No rules yet. Tell Jarvis one in chat — like &ldquo;no work after 10 PM&rdquo;.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {rules.map((rule, index) => {
        const noted = rule.created_at ? freshnessLabel(rule.created_at, now, timeZone) : "";
        return (
          <li
            key={rule.id}
            className="flex flex-wrap items-center gap-2 rounded-lg bg-surface-muted px-3 py-2.5 sm:flex-nowrap sm:px-4"
          >
            <span className="min-w-0 flex-1 basis-full break-words text-sm text-primary sm:basis-auto">
              {rule.text}
            </span>
            <Badge color={rule.provenance === "said" ? "dusk" : "sage"}>
              {provenanceLabel(rule.provenance)}
            </Badge>
            {noted && <span className="text-[11px] text-muted">{noted}</span>}
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto"
              disabled={isBusy(rule.id)}
              onClick={() => forget(rule, index)}
            >
              <X size={12} className="mr-1" />
              Forget
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
