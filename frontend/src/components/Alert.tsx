import React, { useEffect, useState } from "react";
import { IconSuccess, IconError, IconWarning, IconInfo, IconX } from "./icons";

type AlertVariant = "success" | "error" | "warning" | "info";

const variants: Record<AlertVariant, { bg: string; icon: React.ReactNode }> = {
  success: {
    bg: "bg-emerald-50 border-emerald-200 text-emerald-800",
    icon: <IconSuccess className="h-4 w-4 text-emerald-600" />,
  },
  error: {
    bg: "bg-red-50 border-red-200 text-red-800",
    icon: <IconError className="h-4 w-4 text-red-600" />,
  },
  warning: {
    bg: "bg-amber-50 border-amber-200 text-amber-800",
    icon: <IconWarning className="h-4 w-4 text-amber-600" />,
  },
  info: {
    bg: "bg-sky-50 border-sky-200 text-sky-800",
    icon: <IconInfo className="h-4 w-4 text-sky-600" />,
  },
};

export default function Alert({
  variant,
  message,
  dismissible = false,
  autoHide = false,
  onDismiss,
}: {
  variant: AlertVariant;
  message: string;
  dismissible?: boolean;
  autoHide?: boolean;
  onDismiss?: () => void;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (autoHide) {
      const timer = setTimeout(() => {
        setVisible(false);
        onDismiss?.();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [autoHide, onDismiss]);

  if (!visible) return null;

  const v = variants[variant];
  return (
    <div
      className={`flex items-start gap-3 rounded-lg border p-3 text-sm animate-fade-in ${v.bg}`}
      role="alert"
      aria-live={variant === "error" ? "assertive" : "polite"}
    >
      <span className="mt-0.5 flex-shrink-0">{v.icon}</span>
      <span className="flex-1">{message}</span>
      {dismissible && (
        <button
          className="flex-shrink-0 opacity-60 hover:opacity-100"
          onClick={() => {
            setVisible(false);
            onDismiss?.();
          }}
          aria-label="閉じる"
        >
          <IconX className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
