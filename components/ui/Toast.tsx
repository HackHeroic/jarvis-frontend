"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import clsx from "clsx";

type ToastType = "info" | "success" | "warning" | "error";

interface ToastItem {
  id: string;
  message: string;
  type?: ToastType;
  duration?: number;
}

interface ToastContextValue {
  toast: (item: Omit<ToastItem, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const borderColors: Record<ToastType, string> = {
  info: "border-l-dusk",
  success: "border-l-sage",
  warning: "border-l-gold",
  error: "border-l-terra",
};

function ToastEntry({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // trigger enter transition
    requestAnimationFrame(() => setShow(true));

    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(() => onDismiss(item.id), 200);
    }, item.duration ?? 5000);

    return () => clearTimeout(timer);
  }, [item, onDismiss]);

  return (
    <div
      className={clsx(
        "pointer-events-auto w-80 rounded-button border border-border border-l-4 bg-surface-card px-4 py-3 shadow-md",
        "transition-all duration-200",
        show ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0",
        borderColors[item.type ?? "info"],
      )}
    >
      <p className="text-sm text-primary">{item.message}</p>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counterRef = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((item: Omit<ToastItem, "id">) => {
    counterRef.current += 1;
    const id = `toast-${counterRef.current}-${Date.now()}`;
    setToasts((prev) => [...prev, { ...item, id }]);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <ToastEntry key={t.id} item={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
