"use client";

import { useJarvis, type Toast } from "@/lib/context/JarvisContext";
import { X } from "lucide-react";
import clsx from "clsx";

const TOAST_STYLES: Record<Toast["type"], string> = {
  success: "bg-sage text-white",
  error: "bg-red-600 text-white",
  info: "bg-amber-600 text-white",
};

export default function ToastContainer() {
  const { toasts, dismissToast } = useJarvis();
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={clsx(
            "flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg animate-in slide-in-from-bottom-2 fade-in duration-200",
            TOAST_STYLES[toast.type],
          )}
        >
          <span className="flex-1">{toast.message}</span>
          <button
            onClick={() => dismissToast(toast.id)}
            className="shrink-0 rounded-full p-0.5 hover:bg-white/20 transition"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
