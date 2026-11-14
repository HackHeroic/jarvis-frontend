/**
 * The largest chat turn the backend accepts, so the chat input can refuse an
 * over-limit send before it leaves, in the same words as the backend's 422.
 * Pure: no fetch, no React.
 */

/**
 * Mirrored from Jarvis-Engine app/core/config.py (MAX_CHAT_PROMPT_CHARS,
 * MAX_CHAT_UPLOAD_BYTES), which app/schemas/chat_stream.py::ChatStreamRequest
 * enforces with a 422. Change them together.
 */
export const MAX_CHAT_PROMPT_CHARS = 8_000;
export const MAX_CHAT_UPLOAD_BYTES = 10 * 1024 * 1024;

export const PROMPT_TOO_LONG = `That message is too long — keep it under ${MAX_CHAT_PROMPT_CHARS.toLocaleString("en-US")} characters.`;
export const FILE_TOO_BIG = `That file is too big — keep it under ${MAX_CHAT_UPLOAD_BYTES / (1024 * 1024)} MB.`;

/**
 * Why this message cannot be sent, or null. Pass the text exactly as it will be
 * sent. Characters are counted as the backend counts them (code points: an emoji
 * is one character, not two).
 */
export function promptProblem(text: string): string | null {
  return Array.from(text).length > MAX_CHAT_PROMPT_CHARS ? PROMPT_TOO_LONG : null;
}

/** Why a file of `bytes` cannot be attached, or null. */
export function fileProblem(bytes: number): string | null {
  return bytes > MAX_CHAT_UPLOAD_BYTES ? FILE_TOO_BIG : null;
}
