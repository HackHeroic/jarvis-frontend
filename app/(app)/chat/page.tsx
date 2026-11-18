"use client";

import { useRef, useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Paperclip,
  ArrowUp,
  Square,
  SquarePen,
  X,
  FileText,
  Brain,
  GraduationCap,
  Mic,
  Volume2,
  VolumeX,
} from "lucide-react";
import clsx from "clsx";
import { jarvisUtterance, speechRecognition, type BrowserSpeechRecognition } from "@/lib/speech";
import { DICTATION_EVENT, takeVoiceCommand, VOICE_COMMAND_EVENT } from "@/lib/wakeWord";
import { voiceAction } from "@/lib/voiceActions";
import { CAPSTONE_MODE_KEY } from "@/lib/capstone";

import { useJarvisChat } from "@/lib/hooks/useJarvisChat";
import { JarvisResponse } from "@/components/app/JarvisResponse";
import { listMemories, deleteMemory, confirmMemory, dismissMemory } from "@/lib/api";
import { PromptSelector } from "@/components/app/PromptSelector";
import { EmptyState } from "@/components/app/EmptyState";
import { ErrorState } from "@/components/app/ErrorState";
import { ModelModeSelector } from "@/components/app/ModelModeSelector";
import { LearningToast } from "@/components/app/LearningToast";
import { ChatSessionPanel } from "@/components/app/ChatSessionPanel";
import MemoryPanel from "@/components/app/MemoryPanel";
import { isShapeError } from "@/lib/learning";
import { toMemoryPanelState, toPanelMemory } from "@/lib/transforms";
import { errorMessageOf, statusOf } from "@/lib/you";
import { fileProblem, promptProblem } from "@/lib/chatLimits";
import { useJarvis } from "@/lib/context/JarvisContext";
import { useSingleFlight } from "@/lib/hooks/useSingleFlight";
import type { MemoryOut, MemoryRecord } from "@/lib/types";

// ---------------------------------------------------------------------------
// Attachment type
// ---------------------------------------------------------------------------

interface FileAttachment {
  base64: string;
  mediaType: string;
  fileName: string;
}

// ---------------------------------------------------------------------------
// Chat Page
// ---------------------------------------------------------------------------

export default function ChatPageWrapper() {
  return (
    <Suspense>
      <ChatPage />
    </Suspense>
  );
}

function ChatPage() {
  const {
    messages,
    streamState,
    isStreaming,
    sendMessage,
    abort,
    modelMode,
    setModelMode,
    tutorMode,
    setTutorMode,
    conversationId,
    startNewConversation,
    loadConversation,
    conversationLoadError,
    triggerReplan,
    isReplanning,
    acceptDraft,
    rejectDraft,
    draftCardStateFor,
    devMode,
    toggleDevMode,
    dismissLearningToast,
    markMemoryForgotten,
  } = useJarvisChat();

  const searchParams = useSearchParams();

  const hasHandledParams = useRef(false);
  useEffect(() => {
    if (hasHandledParams.current) return;
    const sessionParam = searchParams.get("session");
    const promptParam = searchParams.get("prompt");
    if (sessionParam) {
      hasHandledParams.current = true;
      loadConversation(sessionParam);
    } else if (promptParam && messages.length === 0) {
      hasHandledParams.current = true;
      sendMessage(promptParam);
      // The prompt is sent once: out of the address bar, so a reload does not send it again.
      window.history.replaceState(null, "", "/chat");
    }
  }, [searchParams, loadConversation, sendMessage, messages.length]);

  const [input, setInput] = useState("");
  const [attachment, setAttachment] = useState<FileAttachment | null>(null);
  // Why the last file picked was not attached (over the backend's limit), if it wasn't.
  const [fileNote, setFileNote] = useState<string | null>(null);
  const [showMemoryPanel, setShowMemoryPanel] = useState(false);
  const [voiceReplies, setVoiceReplies] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const wasStreaming = useRef(false);
  const spokenChars = useRef(0);
  const speechBuffer = useRef("");
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const isResizing = useRef(false);

  // Collect memories from latest assistant response (the complete frame's panel memories)
  const latestMemories: MemoryRecord[] = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === "assistant" && msg.response?.memories?.length) {
        return msg.response.memories
          .map(toPanelMemory)
          .filter((m): m is MemoryRecord => m !== null);
      }
    }
    return [];
  }, [messages]);

  // Independently-fetched memories for the panel: undefined until GET /memories/ answers.
  const [panelMemories, setPanelMemories] = useState<MemoryOut[] | undefined>(undefined);
  const [memoriesLoading, setMemoriesLoading] = useState(false);
  const [memoriesError, setMemoriesError] = useState<unknown>(null);
  const { showToast } = useJarvis();
  const { run: runMemoryAction, isBusy: isMemoryBusy } = useSingleFlight();

  const refreshMemories = useCallback(async () => {
    setMemoriesLoading(true);
    try {
      const fresh = await listMemories();
      setPanelMemories(fresh);
      setMemoriesError(null);
    } catch (err) {
      // An outage (5xx) is never "no memories": the panel shows ErrorState with Retry.
      setMemoriesError(err);
    } finally {
      setMemoriesLoading(false);
    }
  }, []);
  // Once the list has loaded it is the only source: the turn's memories never come back.
  const memoryState = toMemoryPanelState({
    loaded: panelMemories,
    loading: memoriesLoading,
    error: memoriesError,
    frame: latestMemories,
  });

  /**
   * Run one action on one memory (a second click while it runs does nothing),
   * then re-read the panel. A 404 on forget means it is already gone: done.
   * An answer in an unexpected shape still landed: the re-read shows it.
   * Any other failure says so (409: the backend's reason).
   */
  const memoryAction = useCallback(
    async (id: string, action: () => Promise<unknown>, goneIsDone = false) => {
      const pending = runMemoryAction(id, action);
      if (!pending) return;
      try {
        await pending;
      } catch (err) {
        const done = isShapeError(err) || (goneIsDone && statusOf(err) === 404);
        if (!done) showToast(errorMessageOf(err, "That didn't go through. Try again."), "error");
      } finally {
        await refreshMemories();
      }
    },
    [runMemoryAction, refreshMemories, showToast],
  );
  /** Undo under a reply forgot a memory: its lines read "Forgotten", and the panel re-reads. */
  const handleMemoryForgotten = useCallback(
    (memoryId: string) => {
      markMemoryForgotten(memoryId);
      void refreshMemories();
    },
    [markMemoryForgotten, refreshMemories],
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("jarvis-voice-replies");
      if (saved !== null) setVoiceReplies(saved === "on");
    } catch { /* storage may be unavailable */ }
    return () => {
      recognitionRef.current?.stop();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  const speakText = useCallback((text: string) => {
    const spokenText = text.replace(/```[\s\S]*?```/g, " code block omitted. ")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[`*_>#]/g, " ").replace(/\s+/g, " ").trim();
    if (!spokenText || !("speechSynthesis" in window)) return;
    const utterance = jarvisUtterance(spokenText);
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      window.setTimeout(() => setIsSpeaking(window.speechSynthesis.speaking), 80);
    };
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, []);

  // Start speaking at sentence boundaries while the model is still streaming.
  // The remaining fragment is spoken at completion; restored history stays quiet.
  useEffect(() => {
    if (!voiceReplies || !("speechSynthesis" in window)) {
      if (!voiceReplies) {
        wasStreaming.current = false;
        spokenChars.current = 0;
        speechBuffer.current = "";
        setIsSpeaking(false);
      }
      return;
    }
    if (isStreaming) {
      if (!wasStreaming.current) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        spokenChars.current = 0;
        speechBuffer.current = "";
        wasStreaming.current = true;
      }
      const incoming = streamState.message.slice(spokenChars.current);
      spokenChars.current = streamState.message.length;
      speechBuffer.current += incoming;
      // Speak complete thoughts promptly without fragmenting sentence rhythm.
      const sentence = /[.!?…](?:["')\]]*)\s/g;
      let boundary: RegExpExecArray | null;
      while ((boundary = sentence.exec(speechBuffer.current)) !== null) {
        const phrase = speechBuffer.current.slice(0, boundary.index + boundary[0].length).trim();
        speechBuffer.current = speechBuffer.current.slice(boundary.index + boundary[0].length);
        sentence.lastIndex = 0;
        speakText(phrase);
      }
      return;
    }
    if (!wasStreaming.current) return;
    wasStreaming.current = false;
    const finalFragment = speechBuffer.current.trim();
    speechBuffer.current = "";
    if (finalFragment) speakText(finalFragment);
  }, [isStreaming, streamState.message, voiceReplies, speakText]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const Recognition = speechRecognition();
    if (!Recognition) return;
    const recognition = new Recognition();
    recognition.lang = navigator.language || "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) setInput((current) => current ? `${current.trim()} ${transcript}` : transcript);
    };
    // Hands-free listening steps aside while the composer's mic dictates.
    const done = () => {
      setIsListening(false);
      window.dispatchEvent(new CustomEvent(DICTATION_EVENT, { detail: false }));
    };
    recognition.onerror = done;
    recognition.onend = done;
    recognitionRef.current = recognition;
    setIsListening(true);
    window.dispatchEvent(new CustomEvent(DICTATION_EVENT, { detail: true }));
    // Give the hands-free recogniser a moment to let go of the microphone.
    window.setTimeout(() => { try { recognition.start(); } catch { done(); } }, 250);
  }, [isListening]);

  const toggleVoiceReplies = useCallback(() => {
    setVoiceReplies((enabled) => {
      const next = !enabled;
      try { localStorage.setItem("jarvis-voice-replies", next ? "on" : "off"); } catch { /* ignore */ }
      if (!next && "speechSynthesis" in window) window.speechSynthesis.cancel();
      return next;
    });
  }, []);

  // ---- Auto-scroll on new messages / streaming updates ----
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamState.message]);

  // ---- Auto-resize textarea ----
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  // ---- Send ----
  // The backend refuses a message over its limit (a 422); say so here and never send it.
  // sendMessage sends the trimmed text, so that is what is measured.
  const inputProblem = promptProblem(input.trim());
  const inputNote = inputProblem ?? fileNote;
  const router = useRouter();
  const handleSend = useCallback(() => {
    if (!input.trim() && !attachment) return;
    if (isStreaming) return;
    // Typed, as when spoken: capstone mode and its walkthroughs open their own page.
    if (!attachment) {
      const local = voiceAction(input);
      let capstone = false;
      try { capstone = localStorage.getItem(CAPSTONE_MODE_KEY) === "on"; } catch { /* stays off */ }
      if (local.kind === "capstone") {
        try { localStorage.setItem(CAPSTONE_MODE_KEY, local.on ? "on" : "off"); } catch { /* ignore */ }
        setInput("");
        if (local.on) router.push("/capstone");
        return;
      }
      if (local.kind === "explain" && capstone) {
        setInput("");
        router.push(`/capstone?topic=${local.topic}`);
        return;
      }
    }
    if (promptProblem(input.trim())) return;
    setFileNote(null);

    const msg = input;
    setInput("");

    const options = attachment
      ? {
          fileBase64: attachment.base64,
          mediaType: attachment.mediaType,
          fileName: attachment.fileName,
        }
      : undefined;

    setAttachment(null);
    sendMessage(msg, options);
  }, [input, isStreaming, sendMessage, attachment, router]);

  // A request spoken after "Jarvis" (on this page, or held from another one) is sent as
  // typed text would be. Refs keep the one listener reading the latest turn state.
  const voiceTurn = useRef({ sendMessage, isStreaming });
  voiceTurn.current = { sendMessage, isStreaming };
  useEffect(() => {
    const deliver = (text: string | null) => {
      const request = text?.trim();
      if (!request || voiceTurn.current.isStreaming || promptProblem(request)) return;
      voiceTurn.current.sendMessage(request, { voice: true });
    };
    const onCommand = (event: Event) => deliver((event as CustomEvent<string>).detail);
    window.addEventListener(VOICE_COMMAND_EVENT, onCommand);
    // After the stored conversation is restored, so the request joins it.
    const held = window.setTimeout(() => deliver(takeVoiceCommand()), 500);
    return () => {
      window.removeEventListener(VOICE_COMMAND_EVENT, onCommand);
      window.clearTimeout(held);
    };
  }, []);

  // ---- Keyboard ----
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // ---- File upload ----
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      // Over the backend's upload limit: not attached, and the input says why.
      const tooBig = fileProblem(file.size);
      setFileNote(tooBig);
      if (tooBig) {
        e.target.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        const mediaType =
          file.type === "application/pdf"
            ? "pdf"
            : file.type === "image/png"
              ? "png"
              : "jpeg";
        setAttachment({ base64, mediaType, fileName: file.name });
      };
      reader.readAsDataURL(file);
      // Reset input so re-selecting same file triggers change
      e.target.value = "";
    },
    []
  );

  // ---- Prompt selector ----
  const handlePromptSelect = useCallback(
    (prompt: string) => {
      sendMessage(prompt);
    },
    [sendMessage]
  );

  // ---- New chat handler ----
  const handleNewChat = useCallback(() => {
    startNewConversation();
    setInput("");
    setAttachment(null);
    setFileNote(null);
  }, [startNewConversation]);

  // Focus chat input for "Chat to modify" flow
  // ---- Sidebar drag-to-resize ----
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const onMouseMove = (ev: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = Math.min(400, Math.max(180, startWidth + ev.clientX - startX));
      setSidebarWidth(newWidth);
    };

    const onMouseUp = () => {
      isResizing.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [sidebarWidth]);

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-full min-w-0">
      <ChatSessionPanel
        currentSessionId={conversationId}
        onSelectSession={(id) => loadConversation(id)}
        onNewChat={handleNewChat}
        sidebarWidth={sidebarWidth}
      />
      {/* Drag handle — visible separator on desktop */}
      <div
        onMouseDown={handleResizeStart}
        className="hidden lg:block w-px shrink-0 cursor-col-resize relative select-none bg-border"
        title="Drag to resize"
      >
        {/* Wider invisible hit area for easy grabbing */}
        <div
          className="absolute inset-y-0 transition-colors hover:bg-terra/30 active:bg-terra/50"
          style={{ left: -4, right: -4 }}
        />
      </div>
      {/* Main chat area */}
      <div className="chat-main-container relative flex-1 flex flex-col min-w-0 h-full">
        {isSpeaking && (
          <div className="chat-speaking-frame" aria-hidden="true" />
        )}
        {/* Top bar */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border py-2 pl-[62px] pr-3 sm:pr-6 lg:pl-6">
          <span className="text-sm font-medium text-primary">Chat</span>
          <div className="flex min-w-0 items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={toggleVoiceReplies}
              aria-pressed={voiceReplies}
              aria-label={voiceReplies ? "Turn voice replies off" : "Turn voice replies on"}
              title={voiceReplies ? "Voice replies on" : "Voice replies off"}
              className={clsx(
                "flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors max-md:min-h-10",
                voiceReplies ? "bg-terra/15 text-terra" : "text-secondary hover:bg-surface-muted hover:text-primary",
              )}
            >
              {voiceReplies ? <Volume2 size={15} /> : <VolumeX size={15} />}
              <span className="hidden sm:inline">Voice {voiceReplies ? "on" : "off"}</span>
            </button>
            <button
              type="button"
              onClick={() => setTutorMode(!tutorMode)}
              disabled={isStreaming}
              aria-pressed={tutorMode}
              aria-label={tutorMode ? "Turn off active tutor mode" : "Turn on active tutor mode"}
              title={tutorMode ? "Turn off active tutor mode" : "Turn on active tutor mode"}
              className={clsx(
                "flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors max-md:min-h-10",
                tutorMode
                  ? "bg-sage/15 text-sage"
                  : "text-secondary hover:bg-surface-muted hover:text-primary",
              )}
            >
              <GraduationCap size={15} />
              <span className="hidden sm:inline">Tutor {tutorMode ? "on" : "off"}</span>
            </button>
            <button
              type="button"
              onClick={handleNewChat}
              disabled={isStreaming || (messages.length === 0 && !conversationLoadError)}
              className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-secondary transition-colors hover:bg-surface-muted hover:text-primary disabled:pointer-events-none disabled:opacity-40 max-md:min-h-10 max-md:min-w-10 sm:px-2.5"
            >
              <SquarePen size={14} />
              <span className="hidden sm:inline">New Chat</span>
            </button>
            <ModelModeSelector
              value={modelMode}
              onChange={setModelMode}
              disabled={isStreaming}
              devMode={devMode}
              onToggleDevMode={toggleDevMode}
            />
            <button
              type="button"
              onClick={() => {
                setShowMemoryPanel((p) => {
                  if (!p) refreshMemories();
                  return !p;
                });
              }}
              className={clsx(
                "flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors max-md:min-h-10 max-md:min-w-10",
                showMemoryPanel
                  ? "bg-dusk/15 text-dusk"
                  : "text-secondary hover:bg-surface-muted hover:text-primary"
              )}
              title="Jarvis's Memory"
              aria-label="Jarvis's Memory"
            >
              <Brain size={14} />
            </button>
          </div>
        </div>

        {/* Messages area */}
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6"
        >
          {isEmpty && conversationLoadError ? (
            // An outage while opening a conversation: never "it may have been deleted".
            <div className="flex flex-col items-center justify-center h-full">
              <ErrorState
                headline={conversationLoadError.headline}
                message={conversationLoadError.detail}
                onRetry={() => loadConversation(conversationLoadError.sessionId)}
              />
            </div>
          ) : isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full">
              <EmptyState
                icon="💬"
                headline="What's on your mind?"
                subtitle="Brain-dump your goals, deadlines, or habits -- Jarvis will turn them into a plan."
              />
              <PromptSelector onSelect={handlePromptSelect} />
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-4">
              {messages.map((msg) => {
                if (msg.role === "user") {
                  return (
                    <div key={msg.id} className="chat-message-enter flex justify-end">
                      <div
                        className="max-w-[88%] break-words bg-terra px-4 py-2.5 text-sm text-ink sm:max-w-[80%]"
                        style={{ borderRadius: "14px 14px 4px 14px" }}
                      >
                        {msg.fileName && (
                          <div className="flex items-center gap-1.5 mb-1.5 text-white/80 text-xs">
                            <FileText size={12} />
                            <span className="max-w-[160px] truncate">
                              {msg.fileName}
                            </span>
                          </div>
                        )}
                        {msg.content}
                      </div>
                    </div>
                  );
                }

                // Assistant message -- delegate to JarvisResponse
                return (
                  <div key={msg.id} className="chat-message-enter flex justify-start">
                    <div
                      className="min-w-0 max-w-full px-1 py-1 text-sm text-primary sm:max-w-[85%]"
                    >
                      <JarvisResponse
                        message={msg}
                        devMode={devMode}
                        onClarificationSelect={(text) => sendMessage(text)}
                        onReplan={() => triggerReplan()}
                        isReplanning={isReplanning}
                        onAcceptDraft={() => acceptDraft()}
                        onRejectDraft={(reason) => rejectDraft(reason)}
                        draftCard={msg.response ? draftCardStateFor(msg.response) : undefined}
                        onSendMessage={(text) => sendMessage(text)}
                        onMemoryForgotten={handleMemoryForgotten}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Scroll anchor */}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="shrink-0 border-t border-border px-3 py-3 sm:px-6">
          <div className="max-w-2xl mx-auto">
            {tutorMode && (
              <p role="status" className="mb-2 flex items-center gap-1.5 px-1 text-xs text-sage">
                <GraduationCap size={14} />
                Active tutor · explanations, hints and one understanding check at a time.
              </p>
            )}
            {/* Attachment badge */}
            {attachment && (
              <div className="flex items-center gap-2 mb-2 px-1">
                <div className="flex items-center gap-1.5 bg-terra/10 border border-terra/20 rounded-lg px-3 py-1.5 text-xs text-terra">
                  <FileText size={12} />
                  <span className="max-w-[140px] truncate sm:max-w-[200px]">
                    {attachment.fileName}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAttachment(null)}
                    className="ml-1 p-0.5 rounded hover:bg-terra/20 transition-colors"
                    aria-label="Remove attachment"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-end gap-2 max-md:gap-1">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Paperclip button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-shrink-0 items-center justify-center p-2 text-muted hover:text-secondary transition-colors max-md:h-10 max-md:w-10"
                aria-label="Attach file"
              >
                <Paperclip size={18} />
              </button>

              {/* Speak a prompt into the composer (supported in most Chromium browsers). */}
              <button
                type="button"
                onClick={toggleListening}
                className={clsx(
                  "flex flex-shrink-0 items-center justify-center rounded-lg p-2 transition-colors max-md:h-10 max-md:w-10",
                  isListening ? "bg-red-500/15 text-red-500" : "text-muted hover:bg-surface-muted hover:text-secondary",
                )}
                aria-label={isListening ? "Stop listening" : "Speak a message"}
                title={isListening ? "Listening… click to stop" : "Speak a message"}
              >
                <Mic size={18} className={isListening ? "animate-pulse" : ""} />
              </button>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                aria-describedby={inputNote ? "chat-input-note" : undefined}
                aria-invalid={inputProblem !== null}
                placeholder={tutorMode ? "Ask about a topic or your course material..." : "Tell Jarvis what's on your mind..."}
                className="min-w-0 flex-1 resize-none rounded-xl border border-border bg-surface-muted px-3.5 py-2.5 text-sm text-primary transition-colors placeholder:text-muted focus:border-terra/50 focus:outline-none max-md:px-3 sm:px-4"
                style={{ maxHeight: "120px" }}
              />

              {/* Send / Stop button */}
              {isStreaming ? (
                <button
                  type="button"
                  onClick={abort}
                  className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors max-md:h-10 max-md:w-10"
                  aria-label="Stop generating"
                >
                  <Square size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={(!input.trim() && !attachment) || inputProblem !== null}
                  className={clsx(
                    "flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-colors max-md:h-10 max-md:w-10",
                    (input.trim() || attachment) && !inputProblem
                      ? "bg-terra text-ink hover:brightness-95"
                      : "bg-surface-muted text-muted cursor-not-allowed"
                  )}
                  aria-label="Send message"
                >
                  <ArrowUp size={18} />
                </button>
              )}
            </div>

            {/* Over the backend's limit: why it won't send, before it is tried */}
            {inputNote && (
              <p id="chat-input-note" role="status" className="mt-1.5 px-1 text-xs text-gold">
                {inputNote}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* PEARL Learning Toast — strong, recurring patterns only (shouldToast) */}
      <LearningToast
        pattern={streamState.latestPattern ?? null}
        onDismiss={dismissLearningToast}
      />

      {/* Memory Panel */}
      <MemoryPanel
        state={memoryState}
        isOpen={showMemoryPanel}
        onClose={() => setShowMemoryPanel(false)}
        onDeleteMemory={(id: string) => memoryAction(id, () => deleteMemory(id), true)}
        onConfirmPattern={(id: string) => memoryAction(id, () => confirmMemory(id))}
        onDismissPattern={(id: string) => memoryAction(id, () => dismissMemory(id))}
        onRetry={refreshMemories}
        isBusy={isMemoryBusy}
      />
    </div>
  );
}
