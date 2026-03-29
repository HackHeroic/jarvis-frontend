"use client";

import { useState, useEffect } from "react";
import NavRail from "@/components/app/NavRail";
import AIChatPanel from "@/components/app/AIChatPanel";

export default function AppLayout({ children }: { children: React.ReactNode }) {
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
    <div className="flex h-screen overflow-hidden bg-surface-canvas">
      <NavRail />
      <main className="flex-1 overflow-y-auto">{children}</main>
      <AIChatPanel
        collapsed={chatCollapsed}
        onToggle={() => setChatCollapsed((prev) => !prev)}
      />
    </div>
  );
}
