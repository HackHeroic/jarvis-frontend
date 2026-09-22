"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import NavRail from "@/components/app/NavRail";
import AIChatPanel from "@/components/app/AIChatPanel";
import { JarvisProvider } from "@/lib/context/JarvisContext";
import ToastContainer from "@/components/ui/ToastContainer";
import clsx from "clsx";
import { useIsDesktop } from "@/lib/hooks/useMediaQuery";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDesktop = useIsDesktop();
  const showAIPanel = pathname !== "/chat";

  // The panel is a docked column on desktop and a full-screen sheet on mobile,
  // so it opens by default only where it has room to sit beside the content.
  const [chatCollapsed, setChatCollapsed] = useState(true);
  const [hasSetInitial, setHasSetInitial] = useState(false);

  useEffect(() => {
    if (hasSetInitial) return;
    if (isDesktop) {
      setChatCollapsed(false);
      setHasSetInitial(true);
    }
  }, [isDesktop, hasSetInitial]);

  // Collapse the sheet again when a phone rotates into, then out of, desktop width
  useEffect(() => {
    if (!isDesktop) setChatCollapsed(true);
  }, [isDesktop]);

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

  // Close the mobile sheet on navigation so it never hides the page you opened
  useEffect(() => {
    if (!isDesktop) setChatCollapsed(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <JarvisProvider>
      <div className="px-safe-x flex h-app overflow-hidden bg-surface-canvas">
        <NavRail />
        {/* min-w-0 lets this column shrink below its content width instead of
            forcing the whole row wider than the screen */}
        <main
          className={clsx(
            "min-w-0 flex-1 overflow-y-auto overflow-x-hidden pb-nav",
            // Reserve room for the floating Jarvis button while it is showing
            showAIPanel && chatCollapsed && "pb-fab",
          )}
        >
          {children}
        </main>
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
