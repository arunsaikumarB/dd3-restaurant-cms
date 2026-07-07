import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  size?: "md" | "lg";
}

const sizeMap = { md: "max-w-lg", lg: "max-w-2xl" };

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  size = "lg",
}: ModalProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center p-0 sm:items-center sm:p-4"
          role="presentation"
        >
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 cursor-default bg-cocoa/55 backdrop-blur-sm"
            onClick={onClose}
            aria-label="Close dialog"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className={`relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[28px] border border-cocoa/8 bg-[#FDFBF7] shadow-[0_40px_120px_-24px_rgba(43,29,24,0.35)] sm:rounded-[28px] ${sizeMap[size]}`}
          >
            <div className="flex items-start justify-between gap-4 border-b border-cocoa/8 px-6 py-5 md:px-8">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-saffron">
                  Catering Enquiry
                </p>
                <h2 id="modal-title" className="mt-1 font-serif text-[clamp(1.35rem,3vw,1.75rem)] text-cocoa">
                  {title}
                </h2>
                {subtitle && (
                  <p className="mt-2 max-w-md text-[14px] leading-relaxed text-cocoa/60">
                    {subtitle}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cocoa/10 text-cocoa/50 transition-colors hover:border-cocoa/20 hover:text-cocoa focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
                aria-label="Close"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-6 md:px-8">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
