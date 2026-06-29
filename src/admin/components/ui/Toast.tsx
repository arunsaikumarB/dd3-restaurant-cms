import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, X } from "lucide-react";
import { useAdminTheme } from "../../context/AdminThemeContext";

export type ToastVariant = "success" | "error";

interface AdminToastProps {
  open: boolean;
  message: string;
  variant?: ToastVariant;
  onClose: () => void;
}

export default function AdminToast({
  open,
  message,
  variant = "success",
  onClose,
}: AdminToastProps) {
  const { dark } = useAdminTheme();

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(onClose, 4000);
    return () => window.clearTimeout(timer);
  }, [open, onClose]);

  const Icon = variant === "success" ? CheckCircle2 : XCircle;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          className="fixed bottom-6 right-6 z-[300] flex max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 shadow-admin-lg"
          style={{
            background: dark ? "#1a1a1a" : "#fff",
            borderColor: variant === "success" ? "rgba(22,163,74,0.35)" : "rgba(220,38,38,0.35)",
          }}
          role="status"
        >
          <Icon
            size={20}
            className={variant === "success" ? "text-admin-success shrink-0" : "text-admin-danger shrink-0"}
          />
          <p className="flex-1 text-sm">{message}</p>
          <button
            type="button"
            onClick={onClose}
            className="opacity-50 hover:opacity-100"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
