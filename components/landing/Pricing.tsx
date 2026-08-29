import Link from "next/link";

type Plan = {
  name: string;
  price: string;
  period: string;
  meta?: string;
  pitch: string;
  advice: string;
  features: string[];
  cta: string;
  popular: boolean;
  accent: "terra" | "gold" | "muted";
};

const PLANS: Plan[] = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    pitch: "Try me. One goal at a time. Most days you'll find me sufficient.",
    advice: "Good for: students just starting, anyone curious.",
    features: [
      "1 active goal",
      "7-day memory window",
      "Basic scheduling",
      "No behavioral learning",
    ],
    cta: "begin →",
    popular: false,
    accent: "muted",
  },
  {
    name: "Pro",
    price: "$9.99",
    period: "/mo",
    meta: "$89/yr",
    pitch: "The whole loop. The compounding starts on day 1.",
    advice: "Good for: anyone who wants me to know them by month three.",
    features: [
      "Unlimited goals & projects",
      "PEARL brain — learns your patterns",
      "Predictive, energy-aware scheduling",
      "Document & email intelligence",
      "Anti-procrastination coach",
      "Permanent workspace memory",
    ],
    cta: "begin →",
    popular: true,
    accent: "terra",
  },
  {
    name: "Team",
    price: "$24",
    period: "/user/mo",
    meta: "min 3 seats",
    pitch: "I learn the whole team. Shared context, manager view.",
    advice: "Good for: small teams who plan together.",
    features: [
      "Everything in Pro",
      "Shared team context & memory",
      "Manager insights dashboard",
      "SSO + admin controls",
      "Priority support",
    ],
    cta: "talk to us →",
    popular: false,
    accent: "gold",
  },
];

const UNIT_ECON: Array<{ value: string; label: string; tone: "sage" | "gold" | "terra" }> = [
  { value: "~$0.001", label: "Cloud AI cost per request", tone: "sage" },
  { value: "1.7 mo", label: "CAC payback at $9.99 ARPU", tone: "gold" },
  { value: "12×", label: "Projected LTV / CAC", tone: "terra" },
  { value: "90%+", label: "Gross margin at scale", tone: "terra" },
];

const TONE_COLOR: Record<"sage" | "gold" | "terra", string> = {
  sage: "#6FA88F",
  gold: "#E09D5C",
  terra: "#D4775A",
};

export default function Pricing() {
  return (
    <section
      id="pricing"
      className="py-24 relative"
      style={{
        background: "linear-gradient(to bottom, #1C1A17, #0F0D0A)",
      }}
    >
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        <p className="text-[#D4775A]/95 text-[11px] tracking-[2.5px] font-mono text-center mb-3 uppercase flex items-center justify-center gap-2.5">
          <span
            className="block w-[6px] h-[6px] rounded-full bg-[#D4775A]"
            style={{ boxShadow: "0 0 12px #D4775A", animation: "glow-pulse 2.4s ease-in-out infinite" }}
          />
          how do you want me?
        </p>
        <h2 className="text-[#FAF8F4] text-[28px] md:text-[34px] font-light text-center mb-3 tracking-[-0.4px] mt-3">
          Three ways to begin.{" "}
          <em className="not-italic text-[#FAF8F4]/55 italic">Pick what fits.</em>
        </h2>
        <p className="text-[#FAF8F4]/45 text-[14px] font-light italic text-center mb-16 max-w-md mx-auto">
          (advice from the system itself)
        </p>

        {/* Three pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLANS.map((plan) => {
            const isPopular = plan.popular;
            const isTeam = plan.accent === "gold";
            const borderColor =
              plan.accent === "terra"
                ? "rgba(212,119,90,0.55)"
                : plan.accent === "gold"
                ? "rgba(224,157,92,0.4)"
                : "rgba(255,255,255,0.08)";
            const priceColor =
              plan.accent === "terra"
                ? "#FAF8F4"
                : plan.accent === "gold"
                ? "#E09D5C"
                : "#FAF8F4";

            return (
              <div
                key={plan.name}
                className={`glass-card relative rounded-2xl p-7 transition-all hover:-translate-y-1 ${
                  isPopular ? "md:-translate-y-2 md:hover:-translate-y-3" : ""
                }`}
                style={{
                  borderColor,
                  background: isPopular
                    ? "linear-gradient(145deg, rgba(212,119,90,0.10), rgba(212,119,90,0.03) 60%, rgba(224,157,92,0.06))"
                    : isTeam
                    ? "linear-gradient(145deg, rgba(224,157,92,0.06), rgba(255,255,255,0.015) 60%, rgba(212,119,90,0.03))"
                    : undefined,
                }}
              >
                {isPopular ? (
                  <span
                    className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-mono tracking-[1.5px] uppercase px-3 py-1 rounded-full"
                    style={{
                      background: "#D4775A",
                      color: "#1C1A17",
                      fontWeight: 600,
                      boxShadow: "0 0 14px rgba(212,119,90,0.55)",
                    }}
                  >
                    most popular
                  </span>
                ) : null}

                <h3 className="text-[#FAF8F4] font-light text-[22px] mb-2 tracking-[-0.4px]">
                  {plan.name}
                </h3>

                <div className="mb-4 min-h-[64px]">
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span
                      className="text-[36px] md:text-[40px] font-light tracking-[-1px]"
                      style={{ color: priceColor }}
                    >
                      {plan.price}
                    </span>
                    <span className="text-[#FAF8F4]/55 text-[13px] font-mono tracking-[0.5px]">
                      {plan.period}
                    </span>
                  </div>
                  {plan.meta ? (
                    <span className="text-[#FAF8F4]/40 text-[11px] font-mono">
                      {plan.meta}
                    </span>
                  ) : null}
                </div>

                <p className="text-[#FAF8F4]/85 text-[14.5px] font-light leading-relaxed mb-2">
                  {plan.pitch}
                </p>
                <p className="text-[#FAF8F4]/40 text-[12px] font-light italic mb-6">
                  {plan.advice}
                </p>

                <ul className="space-y-2.5 mb-8 pt-5 border-t border-white/5">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2.5 text-[#FAF8F4]/80 text-[13px] font-light leading-relaxed"
                    >
                      <span
                        className="block w-[5px] h-[5px] rounded-full mt-[7px] shrink-0"
                        style={{
                          background:
                            plan.accent === "terra"
                              ? "#D4775A"
                              : plan.accent === "gold"
                              ? "#E09D5C"
                              : "rgba(250,248,244,0.4)",
                          boxShadow:
                            plan.accent === "terra"
                              ? "0 0 6px rgba(212,119,90,0.5)"
                              : plan.accent === "gold"
                              ? "0 0 6px rgba(224,157,92,0.5)"
                              : "none",
                        }}
                      />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/dashboard"
                  className={`block text-center font-medium text-[14px] px-6 py-3 rounded-lg transition-all ${
                    isPopular
                      ? "bg-[#D4775A] text-[#1C1A17] hover:bg-[#E09D5C]"
                      : isTeam
                      ? "border border-[#E09D5C]/40 text-[#E09D5C] hover:border-[#E09D5C]/70 hover:text-[#FAF8F4]"
                      : "border border-[#FAF8F4]/20 text-[#FAF8F4] hover:border-[#FAF8F4]/40"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            );
          })}
        </div>

        {/* Unit economics strip */}
        <div className="mt-16 pt-10 border-t border-white/5">
          <p className="text-[#D4775A]/85 text-[10.5px] tracking-[2.5px] font-mono uppercase text-center mb-7 flex items-center justify-center gap-2.5">
            <span className="block w-[5px] h-[5px] rounded-full bg-[#D4775A]" style={{ boxShadow: "0 0 8px #D4775A" }} />
            unit economics
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {UNIT_ECON.map((stat) => {
              const color = TONE_COLOR[stat.tone];
              return (
                <div
                  key={stat.label}
                  className="text-center px-3 py-4 rounded-lg transition-colors"
                  style={{
                    background: "rgba(255,255,255,0.015)",
                    border: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <div
                    className="text-[26px] md:text-[28px] font-light tracking-[-0.6px] mb-1.5 tabular-nums"
                    style={{ color, textShadow: `0 0 18px ${color}40` }}
                  >
                    {stat.value}
                  </div>
                  <div className="text-[#FAF8F4]/50 text-[11px] font-light leading-snug">
                    {stat.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-center text-[#FAF8F4]/45 text-[13px] italic font-light mt-12">
          No card.{" "}
          <span className="text-[#D4775A]/85 not-italic font-medium">Cancel by saying so.</span>
        </p>
      </div>
    </section>
  );
}
