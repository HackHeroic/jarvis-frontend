import Link from "next/link";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    pitch: "Enough to try me. One active goal. The basics.",
    features: [
      "I capture and shape your brain dump.",
      "I build a schedule that won't conflict.",
      "I don't keep your stuff. You can delete me with one click.",
    ],
    cta: "begin →",
    popular: false,
  },
  {
    name: "Pro",
    price: "$9.99",
    period: "/mo",
    pitch: "Unlimited goals. Documents. Behavior. Memory. The whole loop.",
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
      className="py-24"
      style={{
        background: "linear-gradient(to bottom, #1C1A17, #0F0D0A)",
      }}
    >
      <div className="max-w-5xl mx-auto px-6 md:px-12">
        <p className="text-[#D4775A]/85 text-[11px] tracking-[2px] font-mono text-center mb-3">
          pick a tier.
        </p>
        <h2 className="text-[#FAF8F4] text-[28px] md:text-[32px] font-light text-center mb-16 tracking-[-0.4px]">
          Two ways to begin.
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-xl p-8 transition-transform hover:-translate-y-1 ${
                plan.popular
                  ? "border-2 border-[#D4775A] bg-[#D4775A]/10"
                  : "border border-[#FAF8F4]/10 bg-[#FAF8F4]/5"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#D4775A] text-[#1C1A17] text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-[1.5px]">
                  Popular
                </span>
              )}

              <h3 className="text-[#FAF8F4] font-medium text-[20px] mb-2 tracking-[-0.3px]">
                {plan.name}
              </h3>
              <div className="mb-3">
                <div className="flex items-baseline gap-1">
                  <span className="text-[#FAF8F4] text-[40px] font-light tracking-[-1px]">
                    {plan.price}
                  </span>
                  <span className="text-[#FAF8F4]/40 text-[14px]">{plan.period}</span>
                </div>
                {plan.popular && (
                  <span className="text-[#FAF8F4]/40 text-[11px]">($89/yr)</span>
                )}
              </div>

              <p className="text-[#FAF8F4]/65 text-[14px] font-light italic mb-6">
                {plan.pitch}
              </p>

              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-[#FAF8F4]/75 text-[13px] font-light leading-relaxed"
                  >
                    <svg
                      className="w-3.5 h-3.5 mt-1 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke={plan.popular ? "#D4775A" : "#FAF8F4"}
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/dashboard"
                className={`block text-center font-medium text-[14px] px-6 py-3 rounded-lg transition-colors ${
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

        <p className="text-center text-[#FAF8F4]/40 text-[12px] italic mt-10 font-light">
          No card. Cancel by saying so.
        </p>
      </div>
    </section>
  );
}
