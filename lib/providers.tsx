"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { useTheme, type Theme } from "@/lib/hooks/useTheme";
import { ToastProvider } from "@/components/ui/Toast";

// ---------------------------------------------------------------------------
// Theme Context
// ---------------------------------------------------------------------------

type ThemeContextType = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

export function useThemeContext() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeContext must be used within Providers");
  return ctx;
}

// ---------------------------------------------------------------------------
// Combined Providers
// ---------------------------------------------------------------------------

export function Providers({ children }: { children: ReactNode }) {
  const themeHook = useTheme();

  if (!themeHook.mounted) {
    // Render children with default context values to prevent flash of empty content.
    // The inline theme script in layout.tsx handles the initial theme.
    const noopTheme: ThemeContextType = {
      theme: "dark" as Theme,
      setTheme: () => {},
      toggleTheme: () => {},
    };
    return (
      <ThemeContext.Provider value={noopTheme}>
        {children}
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider
      value={{
        theme: themeHook.theme,
        setTheme: themeHook.setTheme,
        toggleTheme: themeHook.toggleTheme,
      }}
    >
      <ToastProvider>{children}</ToastProvider>
    </ThemeContext.Provider>
  );
}
