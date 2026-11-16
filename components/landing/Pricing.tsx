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
        background: "linear-gradient(to bottom, #292724, #211F1C)",
      }}
    >
      <div className="max-w-4xl mx-auto px-6 md:px-12">
        <h2 className="text-3xl md:text-4xl font-extrabold text-[#FFFFFF] text-center mb-16">
          Start getting things done.
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-lg md:max-w-none mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-xl p-8 ${
                plan.popular
                  ? "border-2 border-[#D97859] bg-[#D97859]/10"
                  : "border border-[#FFFFFF]/10 bg-[#FFFFFF]/5"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#D97859] text-[#292724] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  Popular
                </span>
              )}

              <h3 className="text-[#FFFFFF] font-semibold text-xl mb-2">
                {plan.name}
              </h3>
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-[#FFFFFF] text-4xl font-extrabold">
                    {plan.price}
                  </span>
                  <span className="text-[#FFFFFF]/60 text-sm">{plan.period}</span>
                </div>
                {plan.popular && (
                  <span className="text-[#FFFFFF]/60 text-xs">($89/yr)</span>
                )}
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-[#FFFFFF]/70 text-sm"
                  >
                    <svg
                      className="w-4 h-4 mt-0.5 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke={plan.popular ? "#D97859" : "#FFFFFF"}
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
                    ? "bg-[#D97859] text-[#292724] hover:bg-[#D97859]/90"
                    : "border border-[#FFFFFF]/20 text-[#FFFFFF] hover:border-[#FFFFFF]/40"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-[#FFFFFF]/60 text-xs mt-8">
          No credit card required. Cancel anytime.
        </p>
      </div>
    </section>
  );
}
