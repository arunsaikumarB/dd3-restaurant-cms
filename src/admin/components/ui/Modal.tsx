import { useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useAdminTheme } from "../../context/AdminThemeContext";
import AdminButton from "./Button";

interface AdminModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}

const sizeMap = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl" };

export default function AdminModal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
}: AdminModalProps) {
  const { dark } = useAdminTheme();

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className={[
              "relative w-full rounded-2xl border shadow-admin-lg",
              sizeMap[size],
              dark ? "border-admin-border-dark bg-admin-surface-dark" : "border-admin-border bg-white",
            ].join(" ")}
          >
            <div className="flex items-center justify-between border-b border-inherit px-6 py-4">
              <h2 className="text-lg font-semibold">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 opacity-60 transition-opacity hover:opacity-100"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5">{children}</div>
            {footer && (
              <div className="flex justify-end gap-2 border-t border-inherit px-6 py-4">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function ModalFooter({
  onCancel,
  onConfirm,
  confirmLabel = "Save",
  loading = false,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  loading?: boolean;
}) {
  return (
    <>
      <AdminButton variant="outline" onClick={onCancel}>Cancel</AdminButton>
      <AdminButton onClick={onConfirm} disabled={loading}>{confirmLabel}</AdminButton>
    </>
  );
}
