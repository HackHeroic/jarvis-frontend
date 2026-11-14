"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { updateYouSettings } from "@/lib/api";
import { useJarvis } from "@/lib/context/JarvisContext";
import { isShapeError } from "@/lib/learning";
import { AUTONOMY_OPTIONS, errorMessageOf } from "@/lib/you";
import type { AutonomyMode, YouProfile } from "@/lib/types";

interface AutonomySettingsProps {
  profile: YouProfile;
  onSaved: (profile: YouProfile) => void;
  /** Re-read the page: the save answered in a shape this page can't read. */
  onStale: () => void;
}

const HH_MM = /^\d{2}:\d{2}$/;
const TRY_AGAIN = "That didn't save. Try again.";

/** How far Jarvis may act on its own, and when the user's day starts. Saved through PATCH /you/settings. */
export function AutonomySettings({ profile, onSaved, onStale }: AutonomySettingsProps) {
  const { showToast } = useJarvis();
  const [mode, setMode] = useState<AutonomyMode>(profile.autonomy_mode);
  const [savingMode, setSavingMode] = useState(false);
  const [wake, setWake] = useState(profile.wake_time);
  const [savingWake, setSavingWake] = useState(false);
  const [wakeError, setWakeError] = useState<string | null>(null);

  // A re-read of the page (e.g. after Retry) brings the saved values back in.
  useEffect(() => setMode(profile.autonomy_mode), [profile.autonomy_mode]);
  useEffect(() => setWake(profile.wake_time), [profile.wake_time]);

  async function chooseMode(next: AutonomyMode) {
    if (savingMode || next === mode) return;
    const previous = mode;
    setMode(next); // optimistic; rolled back below on failure
    setSavingMode(true);
    try {
      onSaved(await updateYouSettings({ autonomy_mode: next }));
      showToast("Saved.", "success");
    } catch (err) {
      if (isShapeError(err)) {
        onStale(); // saved (2xx), but unreadable: the re-read shows what is stored
      } else {
        setMode(previous);
        showToast(errorMessageOf(err, TRY_AGAIN), "error");
      }
    } finally {
      setSavingMode(false);
    }
  }

  async function saveWake() {
    if (savingWake) return;
    const value = wake.slice(0, 5);
    if (!HH_MM.test(value)) {
      setWakeError("Pick a time like 07:00.");
      return;
    }
    setWakeError(null);
    setSavingWake(true);
    try {
      const saved = await updateYouSettings({ wake_time: value });
      onSaved(saved);
      setWake(saved.wake_time);
      showToast("Wake time saved.", "success");
    } catch (err) {
      if (isShapeError(err)) onStale();
      else setWakeError(errorMessageOf(err, TRY_AGAIN));
    } finally {
      setSavingWake(false);
    }
  }

  return (
    <div className="space-y-5">
      <fieldset disabled={savingMode}>
        <legend className="text-sm font-medium text-primary">
          How far Jarvis may act on its own
        </legend>
        <div className="mt-2 space-y-2">
          {AUTONOMY_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={clsx(
                "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                mode === option.value
                  ? "border-terra bg-terra/5"
                  : "border-border hover:bg-surface-muted",
              )}
            >
              <input
                type="radio"
                name="autonomy_mode"
                value={option.value}
                checked={mode === option.value}
                onChange={() => chooseMode(option.value)}
                className="mt-1 accent-[var(--color-terra)]"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-primary">
                  {option.label}
                  {savingMode && mode === option.value && (
                    <Loader2 size={12} className="ml-2 inline animate-spin text-muted" />
                  )}
                </span>
                <span className="block text-xs text-secondary">{option.description}</span>
                {option.note && (
                  <span className="mt-1 block text-[11px] italic text-muted">{option.note}</span>
                )}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="wake-time" className="text-sm font-medium text-primary">
          Usual wake time
        </label>
        <p className="text-xs text-secondary">
          Your morning brief is ready once you&apos;re up. Times follow your zone, {profile.timezone}.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            id="wake-time"
            type="time"
            value={wake}
            onChange={(e) => {
              setWake(e.target.value);
              setWakeError(null);
            }}
            aria-invalid={wakeError ? true : undefined}
            aria-describedby={wakeError ? "wake-time-error" : undefined}
            className="rounded-button border border-border bg-transparent px-3 py-1.5 text-sm text-primary outline-none focus:border-terra max-md:min-h-10"
          />
          <Button
            size="sm"
            disabled={savingWake || wake.slice(0, 5) === profile.wake_time}
            onClick={saveWake}
          >
            {savingWake && <Loader2 size={12} className="mr-1 animate-spin" />}
            Save
          </Button>
        </div>
        {wakeError && (
          <p id="wake-time-error" role="alert" className="mt-1.5 text-xs text-terra">
            {wakeError}
          </p>
        )}
      </div>
    </div>
  );
}
