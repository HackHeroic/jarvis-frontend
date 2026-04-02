"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import NavRail from "@/components/app/NavRail";
import AIChatPanel from "@/components/app/AIChatPanel";
import { JarvisProvider } from "@/lib/context/JarvisContext";
import ToastContainer from "@/components/ui/ToastContainer";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showAIPanel = pathname !== "/chat";
  const [chatCollapsed, setChatCollapsed] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "j") {
        e.preventDefault();
        setChatCollapsed((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <JarvisProvider>
      <div className="flex h-screen overflow-hidden bg-surface-canvas">
        <NavRail />
        <main className="flex-1 overflow-y-auto">{children}</main>
        {showAIPanel && (
          <AIChatPanel
            collapsed={chatCollapsed}
            onToggle={() => setChatCollapsed((prev) => !prev)}
          />
        )}
      </div>
      <ToastContainer />
    </JarvisProvider>
  );
}
