"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Mic, MicOff } from "lucide-react";
import clsx from "clsx";
import { useWakeWord, type PresenceStatus } from "@/lib/hooks/useWakeWord";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { jarvisUtterance } from "@/lib/speech";
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

  const onCommand = useCallback((text: string) => {
    if (pathname === "/chat") {
      window.dispatchEvent(new CustomEvent(VOICE_COMMAND_EVENT, { detail: text }));
      return;
    }
    holdVoiceCommand(text);
    router.push("/chat");
  }, [pathname, router]);

  const onWake = useCallback(() => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(jarvisUtterance("Yes?"));
  }, []);

  const { status, heard, enabled, toggle } = useWakeWord({ onCommand, onWake, available: roomy });
  if (status === "unsupported") return null;

  const text = status === "awake" && heard ? heard : LABEL[status];
  return (
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
      <span className="jarvis-presence-text" role="status" aria-live="polite">{text}</span>
    </button>
  );
}
