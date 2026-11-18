"use client";

/** A tiny CSS animated companion face; the dance is decorative and motion-safe. */
export default function JarvisAvatar({ size = 64 }: { size?: number }) {
  return (
    <div
      className="jarvis-avatar-dance relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label="Jarvis, dancing"
    >
      <div className="jarvis-avatar-halo absolute inset-0 rounded-full" />
      <svg className="relative z-[1] h-full w-full overflow-visible" viewBox="0 0 80 80" aria-hidden="true">
        <defs>
          <linearGradient id="jarvis-shell" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff7ee" />
            <stop offset=".55" stopColor="#d9c5b4" />
            <stop offset="1" stopColor="#9a725f" />
          </linearGradient>
          <linearGradient id="jarvis-face" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#373C42" />
            <stop offset="1" stopColor="#20252B" />
          </linearGradient>
          <radialGradient id="jarvis-eye" cx=".4" cy=".35">
            <stop offset="0" stopColor="#fff7d0" />
            <stop offset=".42" stopColor="#ffd27a" />
            <stop offset="1" stopColor="#e78b48" />
          </radialGradient>
        </defs>
        <path d="M15 35c-6-2-9 2-8 8 1 5 4 7 10 6M65 35c6-2 9 2 8 8-1 5-4 7-10 6" fill="url(#jarvis-shell)" stroke="#8e6855" strokeWidth="2" />
        <path d="M19 19Q40 5 61 19l7 23q0 20-28 26Q12 61 12 42Z" fill="url(#jarvis-shell)" stroke="#8e6855" strokeWidth="2" />
        <path d="M19 25Q40 12 61 25l3 18q-1 16-24 20Q17 59 16 43Z" fill="url(#jarvis-face)" />
        <path d="M25 36q6-5 12 0M43 36q6-5 12 0" fill="none" stroke="#d8b994" strokeWidth="2" strokeLinecap="round" />
        <g className="jarvis-avatar-eyes">
          <ellipse cx="31" cy="42" rx="4.2" ry="5.2" fill="url(#jarvis-eye)" />
          <ellipse cx="49" cy="42" rx="4.2" ry="5.2" fill="url(#jarvis-eye)" />
          <circle cx="32.2" cy="40.2" r="1.2" fill="white" opacity=".9" />
          <circle cx="50.2" cy="40.2" r="1.2" fill="white" opacity=".9" />
        </g>
        <path d="M31 51q9 10 18 0" fill="none" stroke="#ffc98d" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M18 27q22-15 44 0" fill="none" stroke="#fffaf4" strokeWidth="2" strokeLinecap="round" opacity=".68" />
        <circle cx="10" cy="22" r="2" fill="#d97859" className="jarvis-avatar-sparkle" />
        <path d="M68 17v7m-3.5-3.5h7" stroke="#d97859" strokeWidth="1.8" strokeLinecap="round" className="jarvis-avatar-sparkle" />
      </svg>
      <span className="jarvis-avatar-note jarvis-avatar-note--one" aria-hidden="true">♪</span>
      <span className="jarvis-avatar-note jarvis-avatar-note--two" aria-hidden="true">♫</span>
    </div>
  );
}
