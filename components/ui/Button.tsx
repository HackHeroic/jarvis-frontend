"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-terra text-ink shadow-sm hover:-translate-y-px hover:shadow-md hover:brightness-95 active:translate-y-0 active:brightness-90",
  secondary:
    "bg-surface-muted text-primary hover:bg-surface-muted/80 active:bg-surface-muted/70",
  ghost:
    "bg-transparent text-primary hover:bg-surface-muted active:bg-surface-muted/70",
  outline:
    "bg-transparent border border-border text-primary hover:bg-surface-muted active:bg-surface-muted/70",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs rounded-button max-md:min-h-10",
  md: "px-4 py-2 text-sm rounded-button",
  lg: "px-6 py-3 text-base rounded-button",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap font-medium transition-all duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terra/50",
          variantClasses[variant],
          sizeClasses[size],
          disabled && "opacity-50 cursor-not-allowed pointer-events-none",
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
export { Button, type ButtonProps };
