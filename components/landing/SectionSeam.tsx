"use client";

/**
 * Replacement for `<div className="section-divider" />` — same gradient hairline,
 * with 1-2 particles drifting along the seam to suggest the orb's signal flowing
 * between sections.
 */
export default function SectionSeam() {
  return (
    <div className="relative h-px w-full mx-auto max-w-[92%]" aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to right, transparent 0%, rgba(212,119,90,0.18) 30%, rgba(212,119,90,0.28) 50%, rgba(212,119,90,0.18) 70%, transparent 100%)",
        }}
      />
      {/* two particles drifting along the seam, slightly different speeds + delays */}
      {[0, 1].map((i) => (
        <span
          key={i}
          className="absolute top-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: 5,
            height: 5,
            background: i === 0 ? "#D4775A" : "#E09D5C",
            boxShadow: `0 0 10px ${i === 0 ? "#D4775A" : "#E09D5C"}`,
            opacity: 0,
            animation: `seam-drift ${i === 0 ? 14 : 18}s linear ${i * 5}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes seam-drift {
          0%   { left: 0%; opacity: 0; }
          8%   { opacity: 0.95; }
          50%  { left: 100%; opacity: 0.95; }
          58%  { opacity: 0; }
          100% { left: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}
