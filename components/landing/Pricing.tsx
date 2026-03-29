import Link from "next/link";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    features: [
      "AI-generated daily schedule",
      "Basic brain dump processing",
      "Up to 3 active courses",
      "Community support",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Student Pro",
    price: "$9.99",
    period: "/mo",
    features: [
      "Everything in Free",
      "Unlimited courses & documents",
      "Anti-Guilt rescheduling engine",
      "Behavioral pattern learning",
      "9-Layer deep intelligence",
      "Priority support",
    ],
    cta: "Start Free Trial",
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
      <div className="max-w-4xl mx-auto px-6 md:px-12">
        <h2 className="text-3xl md:text-4xl font-extrabold text-[#FAF8F4] text-center mb-16">
          Start getting things done.
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-lg md:max-w-none mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-xl p-8 ${
                plan.popular
                  ? "border-2 border-[#D4775A] bg-[#D4775A]/10"
                  : "border border-[#FAF8F4]/10 bg-[#FAF8F4]/5"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#D4775A] text-[#1C1A17] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  Popular
                </span>
              )}

              <h3 className="text-[#FAF8F4] font-semibold text-xl mb-2">
                {plan.name}
              </h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-[#FAF8F4] text-4xl font-extrabold">
                  {plan.price}
                </span>
                <span className="text-[#FAF8F4]/40 text-sm">{plan.period}</span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-[#FAF8F4]/70 text-sm"
                  >
                    <svg
                      className="w-4 h-4 mt-0.5 shrink-0"
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
                className={`block text-center font-semibold text-sm px-6 py-3 rounded-lg transition-colors ${
                  plan.popular
                    ? "bg-[#D4775A] text-[#1C1A17] hover:bg-[#D4775A]/90"
                    : "border border-[#FAF8F4]/20 text-[#FAF8F4] hover:border-[#FAF8F4]/40"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-[#FAF8F4]/30 text-xs mt-8">
          No credit card required. Cancel anytime.
        </p>
      </div>
    </section>
  );
}
