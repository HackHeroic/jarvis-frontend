"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
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
// Conversation Context
// ---------------------------------------------------------------------------

interface ConversationContextType {
  conversationId: string | null;
  setConversationId: (id: string | null) => void;
  startNewConversation: () => void;
}

const ConversationContext = createContext<ConversationContextType | null>(null);

export function useConversation() {
  const ctx = useContext(ConversationContext);
  if (!ctx)
    throw new Error("useConversation must be used within Providers");
  return ctx;
}

function ConversationProvider({ children }: { children: ReactNode }) {
  const [conversationId, setConversationIdState] = useState<string | null>(
    () => {
      if (typeof window !== "undefined") {
        return localStorage.getItem("jarvis-conversation-id");
      }
      return null;
    },
  );

  // Persist to localStorage on change
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (conversationId) {
      localStorage.setItem("jarvis-conversation-id", conversationId);
    } else {
      localStorage.removeItem("jarvis-conversation-id");
    }
  }, [conversationId]);

  const setConversationId = useCallback((id: string | null) => {
    setConversationIdState(id);
  }, []);

  const startNewConversation = useCallback(() => {
    setConversationIdState(null);
  }, []);

  return (
    <ConversationContext.Provider
      value={{ conversationId, setConversationId, startNewConversation }}
    >
      {children}
    </ConversationContext.Provider>
  );
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
        <ConversationProvider>{children}</ConversationProvider>
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
      <ConversationProvider>
        <ToastProvider>{children}</ToastProvider>
      </ConversationProvider>
    </ThemeContext.Provider>
  );
}
