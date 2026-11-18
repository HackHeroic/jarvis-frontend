"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import NavRail from "@/components/app/NavRail";
import AIChatPanel from "@/components/app/AIChatPanel";
import { JarvisProvider } from "@/lib/context/JarvisContext";
import ToastContainer from "@/components/ui/ToastContainer";
import clsx from "clsx";
import { useIsDesktop } from "@/lib/hooks/useMediaQuery";
import { motion } from "motion/react";
import AmbientObjects from "@/components/app/AmbientObjects";
import JarvisPresence from "@/components/app/JarvisPresence";

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
      <div className="relative isolate h-app overflow-hidden">
        <div className="ambient-backdrop" aria-hidden="true">
          <div className="ambient-blob ambient-blob--one" />
          <div className="ambient-blob ambient-blob--two" />
          <div className="ambient-blob ambient-blob--three" />
          <AmbientObjects />
          <div className="ambient-particles" />
        </div>
        <div className="px-safe-x relative z-10 flex h-full overflow-hidden">
          <NavRail />
          <div className="relative flex min-w-0 flex-1">
          <main
            className={clsx(
              "min-w-0 flex-1 overflow-y-auto overflow-x-hidden pb-nav",
              showAIPanel && chatCollapsed && "pb-fab",
            )}
          >
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 7 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              className={pathname === "/chat" ? "h-full" : undefined}
            >
              {children}
            </motion.div>
          </main>
          <JarvisPresence />
          </div>
          {showAIPanel && (
            <AIChatPanel
              collapsed={chatCollapsed}
              onToggle={() => setChatCollapsed((prev) => !prev)}
            />
          )}
        </div>
      </div>
      <ToastContainer />
    </JarvisProvider>
  );
}
