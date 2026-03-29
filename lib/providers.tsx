"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useTheme, type Theme } from "@/lib/hooks/useTheme";
import { ToastProvider } from "@/components/ui/Toast";

type ThemeContextType = { theme: Theme; setTheme: (t: Theme) => void; toggleTheme: () => void };
const ThemeContext = createContext<ThemeContextType | null>(null);
export function useThemeContext() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeContext must be used within Providers");
  return ctx;
}

export type AppMode = "demo" | "live";
type ModeContextType = { mode: AppMode; setMode: (m: AppMode) => void; isDemoMode: boolean };
const ModeContext = createContext<ModeContextType | null>(null);
export function useModeContext() {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error("useModeContext must be used within Providers");
  return ctx;
}

export function Providers({ children }: { children: ReactNode }) {
  const themeHook = useTheme();
  const [mode, setModeState] = useState<AppMode>("demo");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("jarvis-demo-mode");
    if (stored === "live") setModeState("live");
    setMounted(true);
  }, []);

  const setMode = (m: AppMode) => {
    setModeState(m);
    localStorage.setItem("jarvis-demo-mode", m);
  };

  if (!mounted || !themeHook.mounted) {
    // Render children with default context values to prevent flash of empty content.
    // The inline theme script in layout.tsx handles the initial theme.
    const noopTheme: ThemeContextType = { theme: "dark" as Theme, setTheme: () => {}, toggleTheme: () => {} };
    const noopMode: ModeContextType = { mode: "demo", setMode: () => {}, isDemoMode: true };
    return (
      <ThemeContext.Provider value={noopTheme}>
        <ModeContext.Provider value={noopMode}>
          {children}
        </ModeContext.Provider>
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme: themeHook.theme, setTheme: themeHook.setTheme, toggleTheme: themeHook.toggleTheme }}>
      <ModeContext.Provider value={{ mode, setMode, isDemoMode: mode === "demo" }}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </ModeContext.Provider>
    </ThemeContext.Provider>
  );
}
