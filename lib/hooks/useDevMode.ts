"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "jarvis-dev-mode";

export function useDevMode(): [boolean, () => void] {
  const [devMode, setDevMode] = useState(false);

  useEffect(() => {
    setDevMode(localStorage.getItem(STORAGE_KEY) === "true");
  }, []);

  const toggle = useCallback(() => {
    setDevMode((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  return [devMode, toggle];
}
