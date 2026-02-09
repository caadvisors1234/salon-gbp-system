import React from "react";
import { IconSpinner } from "./icons";

type Variant = "primary" | "secondary" | "danger" | "ghost";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  loading?: boolean;
};

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-pink-600 text-white hover:bg-pink-700 active:bg-pink-800 focus:ring-pink-300",
  secondary:
    "border border-stone-300 bg-white text-stone-700 hover:bg-stone-50 active:bg-stone-100 focus:ring-pink-300",
  danger:
    "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus:ring-red-300",
  ghost:
    "text-stone-600 hover:bg-stone-100 active:bg-stone-200 focus:ring-pink-300",
};

export default function Button({
  variant = "secondary",
  loading = false,
  disabled,
  children,
  className = "",
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <IconSpinner className="h-4 w-4" />}
      {children}
    </button>
  );
}
