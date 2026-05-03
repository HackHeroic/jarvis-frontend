import Link from "next/link";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    pitch: "Try me. Most days you'll find me sufficient.",
    advice: "Good for: students just starting, anyone curious.",
    features: [
      "I capture and shape your brain dump.",
      "I build a schedule that won't conflict.",
      "I forget your data when you ask.",
    ],
    cta: "begin →",
    popular: false,
  },
  {
    name: "Pro",
    price: "$9.99",
    period: "/mo",
    pitch: "Most students keep me here. The compounding starts on day 1.",
    advice: "Good for: anyone who wants me to know them by month three.",
    features: [
      "Everything in Free.",
      "I read your documents and pin them to your work.",
      "I learn your patterns and adjust the math.",
      "I negotiate when you push back.",
      "I remember on the curve, not the streak.",
    ],
    cta: "begin →",
    popular: true,
  },
];

export default function Pricing() {
  return (
    <section
      id="pricing"
      className="py-24 relative"
      style={{
        background: "linear-gradient(to bottom, #1C1A17, #0F0D0A)",
      }}
    >
      <div className="max-w-5xl mx-auto px-6 md:px-12">
        <p className="text-[#D4775A]/95 text-[11px] tracking-[2.5px] font-mono text-center mb-3 uppercase flex items-center justify-center gap-2.5">
          <span
            className="block w-[6px] h-[6px] rounded-full bg-[#D4775A]"
            style={{ boxShadow: "0 0 12px #D4775A", animation: "glow-pulse 2.4s ease-in-out infinite" }}
          />
          how do you want me?
        </p>
        <h2 className="text-[#FAF8F4] text-[28px] md:text-[34px] font-light text-center mb-3 tracking-[-0.4px] mt-3">
          Two ways to begin.{" "}
          <em className="not-italic text-[#FAF8F4]/55 italic">Either is fine.</em>
        </h2>
        <p className="text-[#FAF8F4]/45 text-[14px] font-light italic text-center mb-16 max-w-md mx-auto">
          (advice from the system itself)
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`glass-card relative rounded-2xl p-8 transition-all hover:-translate-y-1 ${
                plan.popular ? "" : ""
              }`}
              style={{
                borderColor: plan.popular ? "rgba(212,119,90,0.55)" : "rgba(255,255,255,0.08)",
                background: plan.popular
                  ? "linear-gradient(145deg, rgba(212,119,90,0.10), rgba(212,119,90,0.03) 60%, rgba(224,157,92,0.06))"
                  : undefined,
              }}
            >
              {plan.popular && (
                <span
                  className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-mono tracking-[1.5px] uppercase px-3 py-1 rounded-full"
                  style={{
                    background: "#D4775A",
                    color: "#1C1A17",
                    fontWeight: 600,
                    boxShadow: "0 0 14px rgba(212,119,90,0.55)",
                  }}
                >
                  most pick this
                </span>
              )}

              <h3 className="text-[#FAF8F4] font-light text-[22px] mb-2 tracking-[-0.4px]">
                {plan.name}
              </h3>
              <div className="mb-4">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[#FAF8F4] text-[42px] font-light tracking-[-1.2px]">
                    {plan.price}
                  </span>
                  <span className="text-[#FAF8F4]/45 text-[13px] font-mono tracking-[1px]">
                    {plan.period}
                  </span>
                </div>
                {plan.popular && (
                  <span className="text-[#FAF8F4]/40 text-[11px] font-mono">$89/yr</span>
                )}
              </div>

              <p className="text-[#FAF8F4]/80 text-[15px] font-light leading-relaxed mb-2">
                {plan.pitch}
              </p>
              <p className="text-[#FAF8F4]/40 text-[12px] font-light italic mb-7">
                {plan.advice}
              </p>

              <ul className="space-y-3 mb-9 pt-5 border-t border-white/5">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2.5 text-[#FAF8F4]/75 text-[13px] font-light leading-relaxed"
                  >
                    <span
                      className="block w-[5px] h-[5px] rounded-full mt-2 shrink-0"
                      style={{
                        background: plan.popular ? "#D4775A" : "rgba(250,248,244,0.45)",
                        boxShadow: plan.popular ? "0 0 6px rgba(212,119,90,0.5)" : "none",
                      }}
                    />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/dashboard"
                className={`block text-center font-medium text-[14px] px-6 py-3 rounded-lg transition-all ${
                  plan.popular
                    ? "bg-[#D4775A] text-[#1C1A17] hover:bg-[#E09D5C]"
                    : "border border-[#FAF8F4]/20 text-[#FAF8F4] hover:border-[#FAF8F4]/40"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-[#FAF8F4]/45 text-[13px] italic font-light mt-12">
          No card. <span className="text-[#D4775A]/85 not-italic font-medium">Cancel by saying so.</span>
        </p>
      </div>
    </section>
  );
}
