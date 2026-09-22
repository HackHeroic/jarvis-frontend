"use client";

import { useEffect, useState } from "react";

/**
 * Subscribes to a CSS media query.
 *
 * Starts `false` on the server and on the first client render so markup matches
 * between the two, then settles to the real value in an effect.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);

    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/** True once we know we're on a `lg`-and-up viewport (Tailwind's 1024px). */
export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 1024px)");
}

/** True on devices whose primary pointer can't hover — phones and tablets. */
export function useIsTouch(): boolean {
  return useMediaQuery("(hover: none), (pointer: coarse)");
}
