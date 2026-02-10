import React, { createContext, useCallback, useContext, useState } from "react";
import { IconSuccess, IconError, IconWarning, IconInfo, IconX } from "../components/icons";

type ToastVariant = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: string;
  variant: ToastVariant;
  message: string;
}

interface ToastContextValue {
  toast: (variant: ToastVariant, message: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
});

const MAX_TOASTS = 3;
const AUTO_DISMISS_MS = 4000;

let fallbackToastIdCounter = 0;
function createToastId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // ignore and fall back
  }
  fallbackToastIdCounter += 1;
  return `toast-${Date.now()}-${fallbackToastIdCounter}-${Math.random().toString(16).slice(2)}`;
}

const variantStyles: Record<ToastVariant, { bg: string; icon: React.ReactNode }> = {
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

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (variant: ToastVariant, message: string) => {
      const id = createToastId();
      setToasts((prev) => [...prev.slice(-(MAX_TOASTS - 1)), { id, variant, message }]);
      setTimeout(() => removeToast(id), AUTO_DISMISS_MS);
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

function ToastContainer({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2" aria-live="polite">
      {toasts.map((t) => {
        const style = variantStyles[t.variant];
        return (
          <div
            key={t.id}
            className={`flex items-start gap-3 rounded-lg border p-3 text-sm shadow-lg animate-fade-in ${style.bg}`}
            role="status"
          >
            <span className="mt-0.5 flex-shrink-0">{style.icon}</span>
            <span className="flex-1">{t.message}</span>
            <button
              className="flex-shrink-0 opacity-60 hover:opacity-100"
              onClick={() => onDismiss(t.id)}
              aria-label="閉じる"
            >
              <IconX className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
