"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Mic, MicOff } from "lucide-react";
import clsx from "clsx";
import { useWakeWord, type PresenceStatus } from "@/lib/hooks/useWakeWord";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { say } from "@/lib/speech";
import { useThemeContext } from "@/lib/providers";
import { voiceAction } from "@/lib/voiceActions";
import { CAPSTONE_MODE_KEY } from "@/lib/capstone";
import { holdVoiceCommand, VOICE_COMMAND_EVENT } from "@/lib/wakeWord";

const LABEL: Record<PresenceStatus, string> = {
  off: "Hands-free is off",
  unsupported: "",
  blocked: "Microphone blocked. Allow it for this site, then reload.",
  standby: "Say “Jarvis”",
  awake: "Listening…",
  speaking: "Speaking…",
};

/**
 * Jarvis's presence: an orb that breathes while it waits for its name, opens up while it
 * listens and ripples while it speaks. Saying "Jarvis" and a request sends it to chat,
 * from any page, with no button pressed. Clicking the orb turns hands-free off or on.
 */
export default function JarvisPresence() {
  const router = useRouter();
  const pathname = usePathname();
  // Continuous recognition is unreliable on phones, and the composer's mic covers them.
  const roomy = useMediaQuery("(min-width: 768px)");

  const { setTheme } = useThemeContext();

  const onCommand = useCallback((request: string) => {
    let action = voiceAction(request);
    if (action.kind === "capstone") {
      try { localStorage.setItem(CAPSTONE_MODE_KEY, action.on ? "on" : "off"); } catch { /* ignore */ }
      say(action.say);
      if (action.on) router.push("/capstone");
      else if (pathname === "/capstone") router.push("/dashboard");
      return;
    }
    if (action.kind === "explain") {
      // How Jarvis was built is told only in capstone mode; otherwise it is a normal request.
      let capstone = false;
      try { capstone = localStorage.getItem(CAPSTONE_MODE_KEY) === "on"; } catch { /* stays off */ }
      if (capstone) {
        router.push(`/capstone?topic=${action.topic}`);
        return;
      }
      action = action.otherwise;
    }
    if (action.kind === "capstone" || action.kind === "explain") return;
    if (action.kind === "navigate") {
      say(action.say);
      if (pathname !== action.href) router.push(action.href);
      return;
    }
    if (action.kind === "theme") {
      say(action.say);
      setTheme(action.theme);
      return;
    }
    if (pathname === "/chat") {
      window.dispatchEvent(new CustomEvent(VOICE_COMMAND_EVENT, { detail: action.text }));
      return;
    }
    holdVoiceCommand(action.text);
    router.push("/chat");
  }, [pathname, router, setTheme]);

  const onWake = useCallback(() => say("Yes, sir?"), []);

  const { status, heard, enabled, toggle } = useWakeWord({ onCommand, onWake, available: roomy });
  if (status === "unsupported") return null;

  const text = status === "awake" && heard ? heard : LABEL[status];
  return (
    <>
      {/* The moment Jarvis hears its name: the reactor opens over the page. */}
      {status === "awake" && (
        <div className="jarvis-hud" aria-hidden="true">
          <div className="jarvis-hud-reactor">
            <svg viewBox="0 0 200 200" className="h-full w-full">
              <circle className="jarvis-hud-ring jarvis-hud-ring--a" cx="100" cy="100" r="92" />
              <circle className="jarvis-hud-ring jarvis-hud-ring--b" cx="100" cy="100" r="76" />
              <circle className="jarvis-hud-ring jarvis-hud-ring--c" cx="100" cy="100" r="60" />
              <circle className="jarvis-hud-ring jarvis-hud-ring--d" cx="100" cy="100" r="44" />
            </svg>
            <span className="jarvis-hud-core" />
          </div>
          <p className="jarvis-hud-label">Listening</p>
          <p className="jarvis-hud-heard">{heard || "Go ahead, sir."}</p>
        </div>
      )}
      <button
        type="button"
        onClick={toggle}
        aria-pressed={enabled}
        aria-label={enabled ? "Turn hands-free off" : "Turn hands-free on"}
        title={enabled ? "Hands-free is on: say “Jarvis”. Click to turn it off." : "Turn hands-free on"}
        className={clsx("jarvis-presence", `jarvis-presence--${status}`)}
      >
        <span className="jarvis-presence-orb" aria-hidden="true">
          <span className="jarvis-presence-ring" />
          <span className="jarvis-presence-ring jarvis-presence-ring--late" />
          <span className="jarvis-presence-core">
            {status === "off" || status === "blocked" ? <MicOff size={13} /> : <Mic size={13} />}
          </span>
        </span>
        {status === "speaking" && (
          <span className="jarvis-presence-bars" aria-hidden="true"><i /><i /><i /><i /></span>
        )}
        <span className="jarvis-presence-text" role="status" aria-live="polite">{text}</span>
      </button>
    </>
  );
}
