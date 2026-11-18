"use client";

/** Decorative holographic forms for the fixed app backdrop. */
export default function AmbientObjects() {
  return (
    <>
      <div className="ambient-object ambient-object--core" aria-hidden="true">
        <svg viewBox="0 0 300 300" className="h-full w-full overflow-visible">
          <defs>
            <radialGradient id="ambient-core-fill" cx="35%" cy="30%">
              <stop offset="0" stopColor="#FFFFFF" stopOpacity=".9" />
              <stop offset=".28" stopColor="#8ce8dc" stopOpacity=".58" />
              <stop offset=".72" stopColor="#9d8bff" stopOpacity=".24" />
              <stop offset="1" stopColor="#9d8bff" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="ambient-ring-stroke" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#68ded4" stopOpacity=".08" />
              <stop offset=".48" stopColor="#75e6dd" stopOpacity=".65" />
              <stop offset=".76" stopColor="#a891ff" stopOpacity=".58" />
              <stop offset="1" stopColor="#a891ff" stopOpacity=".08" />
            </linearGradient>
            <filter id="ambient-core-blur" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="9" />
            </filter>
          </defs>
          <circle cx="150" cy="150" r="67" fill="#78dfd3" opacity=".16" filter="url(#ambient-core-blur)" className="ambient-core-pulse" />
          <circle cx="150" cy="150" r="53" fill="url(#ambient-core-fill)" className="ambient-core-pulse" />
          <path d="M150 106 180 128 174 164 150 188 124 166 119 132Z" fill="#dffffa" fillOpacity=".18" stroke="#b4fff4" strokeOpacity=".34" />
          <path d="m150 106 1 82m-31-56 54 32m-50 2 50-38" fill="none" stroke="#f4fffd" strokeOpacity=".26" strokeWidth="1" />
          <ellipse cx="150" cy="150" rx="119" ry="43" fill="none" stroke="url(#ambient-ring-stroke)" strokeWidth="1.5" strokeDasharray="2 4" className="ambient-ring-spin ambient-ring-spin--one" />
          <ellipse cx="150" cy="150" rx="100" ry="61" fill="none" stroke="url(#ambient-ring-stroke)" strokeWidth="1.2" strokeDasharray="38 12 2 12" className="ambient-ring-spin ambient-ring-spin--two" />
          <ellipse cx="150" cy="150" rx="131" ry="72" fill="none" stroke="#91ded5" strokeOpacity=".2" strokeWidth=".8" transform="rotate(-32 150 150)" />
          <circle cx="34" cy="128" r="4" fill="#7ce9de" className="ambient-satellite ambient-satellite--one" />
          <circle cx="250" cy="185" r="3" fill="#b69aff" className="ambient-satellite ambient-satellite--two" />
          <circle cx="226" cy="94" r="2" fill="#fff" fillOpacity=".8" />
        </svg>
      </div>

      <div className="ambient-object ambient-object--prism" aria-hidden="true">
        <svg viewBox="0 0 140 190" className="h-full w-full overflow-visible">
          <defs>
            <linearGradient id="ambient-prism-left" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#d9fff9" stopOpacity=".52" />
              <stop offset="1" stopColor="#81d9cf" stopOpacity=".08" />
            </linearGradient>
            <linearGradient id="ambient-prism-right" x1="0" y1="0" x2=".8" y2="1">
              <stop offset="0" stopColor="#d4caff" stopOpacity=".34" />
              <stop offset="1" stopColor="#9b82e8" stopOpacity=".04" />
            </linearGradient>
          </defs>
          <path d="M70 7 126 43 111 145 70 182 27 146 13 45Z" fill="url(#ambient-prism-left)" stroke="#8fded5" strokeOpacity=".44" strokeWidth="1.2" />
          <path d="M70 7 70 182 111 145 126 43Z" fill="url(#ambient-prism-right)" />
          <path d="m13 45 57 17 56-19M27 146l43-84 41 83M70 62v120" fill="none" stroke="#e8fffb" strokeOpacity=".35" strokeWidth="1" />
          <path d="m70 7 17 49-17 6-17-7Z" fill="#fff" fillOpacity=".3" />
          <circle cx="70" cy="62" r="2.5" fill="#fff" className="ambient-satellite ambient-satellite--two" />
        </svg>
      </div>
    </>
  );
}
