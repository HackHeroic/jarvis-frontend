import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export function Card({ hover, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-surface-card border border-border rounded-card",
        hover && "transition-shadow duration-200 hover:shadow-md",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
