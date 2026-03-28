// ─── Toast Notifications ──────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, AlertCircle, X } from "lucide-react";

type ToastVariant = "success" | "error" | "warning";

interface Toast {
  id: string;
  variant: ToastVariant;
  title: string;
  message?: string;
}

// ─── Global singleton state ───────────────────────────────────────────────────

type ToastListener = (toasts: Toast[]) => void;
let toasts: Toast[] = [];
const listeners = new Set<ToastListener>();

function notify() {
  listeners.forEach((l) => l([...toasts]));
}

export const toast = {
  success: (title: string, message?: string) => {
    const id = Math.random().toString(36).slice(2);
    toasts = [...toasts, { id, variant: "success", title, message }];
    notify();
    setTimeout(() => {
      toasts = toasts.filter((t) => t.id !== id);
      notify();
    }, 4000);
  },
  error: (title: string, message?: string) => {
    const id = Math.random().toString(36).slice(2);
    toasts = [...toasts, { id, variant: "error", title, message }];
    notify();
    setTimeout(() => {
      toasts = toasts.filter((t) => t.id !== id);
      notify();
    }, 6000);
  },
  warning: (title: string, message?: string) => {
    const id = Math.random().toString(36).slice(2);
    toasts = [...toasts, { id, variant: "warning", title, message }];
    notify();
    setTimeout(() => {
      toasts = toasts.filter((t) => t.id !== id);
      notify();
    }, 5000);
  },
};

// ─── Toast Provider (mount once in AppLayout or App) ─────────────────────────

export function ToastProvider() {
  const [items, setItems] = useState<Toast[]>([]);

  useEffect(() => {
    listeners.add(setItems);
    return () => { listeners.delete(setItems); };
  }, []);

  const dismiss = useCallback((id: string) => {
    toasts = toasts.filter((t) => t.id !== id);
    notify();
  }, []);

  const iconMap: Record<ToastVariant, React.ReactNode> = {
    success: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    error: <XCircle className="h-4 w-4 text-red-500" />,
    warning: <AlertCircle className="h-4 w-4 text-amber-500" />,
  };

  const borderMap: Record<ToastVariant, string> = {
    success: "border-green-500/25",
    error: "border-brand-500/25",
    warning: "border-amber-500/25",
  };

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {items.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className={`pointer-events-auto flex w-[320px] items-start gap-3 rounded-xl border bg-surface-raised p-4 shadow-xl ${borderMap[item.variant]}`}
          >
            <span className="mt-0.5 shrink-0">{iconMap[item.variant]}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink">{item.title}</p>
              {item.message && (
                <p className="mt-0.5 text-xs text-ink-secondary">{item.message}</p>
              )}
            </div>
            <button
              onClick={() => dismiss(item.id)}
              className="shrink-0 rounded-md p-0.5 text-ink-tertiary hover:text-ink-secondary transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
