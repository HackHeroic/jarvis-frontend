"use client";

import { useCallback, useRef, useState } from "react";
import { createSingleFlight } from "@/lib/you";

/**
 * `createSingleFlight` for a component: `run(key, fn)` returns null, without
 * calling `fn`, while a run with that key is in flight (checked synchronously,
 * so a double-click fires one request), and `isBusy(key)` re-renders so the
 * button can show it is working.
 */
export function useSingleFlight() {
  const flight = useRef(createSingleFlight());
  const [busyKeys, setBusyKeys] = useState<ReadonlySet<string>>(() => new Set());

  const run = useCallback(<T,>(key: string, fn: () => Promise<T>): Promise<T> | null => {
    const pending = flight.current.run(key, fn);
    if (!pending) return null;
    setBusyKeys((prev) => new Set(prev).add(key));
    pending
      .finally(() =>
        setBusyKeys((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        }),
      )
      .catch(() => {
        // the caller handles the failure; this branch only clears the busy flag
      });
    return pending;
  }, []);

  const isBusy = useCallback((key: string) => busyKeys.has(key), [busyKeys]);

  return { run, isBusy };
}
