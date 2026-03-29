import clsx from "clsx";

type BadgeColor = "terra" | "sage" | "dusk" | "gold" | "ink";

interface BadgeProps {
  color?: BadgeColor;
  children: React.ReactNode;
}

const colorClasses: Record<BadgeColor, string> = {
  terra: "bg-terra/15 text-terra",
  sage: "bg-sage/15 text-sage",
  dusk: "bg-dusk/15 text-dusk",
  gold: "bg-gold/15 text-gold",
  ink: "bg-ink/15 text-ink",
};

export function Badge({ color = "terra", children }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-block rounded-pill px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        colorClasses[color],
      )}
    >
      {children}
    </span>
  );
}
