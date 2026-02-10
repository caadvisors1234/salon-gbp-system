import React from "react";

type BadgeVariant = "default" | "success" | "warning" | "error" | "info" | "primary";

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-stone-100 text-stone-700",
  success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border border-amber-200",
  error: "bg-red-50 text-red-700 border border-red-200",
  info: "bg-sky-50 text-sky-700 border border-sky-200",
  primary: "bg-pink-50 text-pink-700 border border-pink-200",
};

export default function Badge({
  variant = "default",
  children,
  className = "",
}: {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

export function statusVariant(status: string): BadgeVariant {
  switch (status) {
    case "posted":
    case "uploaded":
    case "active":
    case "completed":
    case "success":
      return "success";
    case "pending":
    case "queued":
    case "open":
      return "warning";
    case "failed":
    case "error":
    case "expired":
      return "error";
    case "posting":
    case "processing":
    case "running":
      return "info";
    case "skipped":
    case "acked":
      return "default";
    default:
      return "default";
  }
}

export function postTypeVariant(postType: string): BadgeVariant {
  switch (postType) {
    case "STANDARD":
      return "info";
    case "OFFER":
      return "success";
    case "EVENT":
      return "primary";
    default:
      return "default";
  }
}

export function severityVariant(severity: string): BadgeVariant {
  switch (severity) {
    case "critical":
    case "high":
      return "error";
    case "medium":
    case "warning":
      return "warning";
    case "low":
    case "info":
      return "info";
    default:
      return "default";
  }
}
