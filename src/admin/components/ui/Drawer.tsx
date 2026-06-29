import { useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useAdminTheme } from "../../context/AdminThemeContext";

interface AdminDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

export default function AdminDrawer({
  open,
  onClose,
  title,
  children,
  footer,
}: AdminDrawerProps) {
  const { dark } = useAdminTheme();

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className={[
              "absolute right-0 top-0 flex h-full w-full max-w-lg flex-col border-l shadow-admin-lg",
              dark ? "border-admin-border-dark bg-admin-surface-dark" : "border-admin-border bg-white",
            ].join(" ")}
          >
            <div className="flex items-center justify-between border-b border-inherit px-6 py-5">
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
            <div className="flex-1 overflow-y-auto admin-scrollbar px-6 py-5">{children}</div>
            {footer && (
              <div className="flex justify-end gap-2 border-t border-inherit px-6 py-4">
                {footer}
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
