import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { ReactNode } from "react";
export function Dialog({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef(document.activeElement as HTMLElement | null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    const previous = opener.current;
    return () => {
      d?.close();
      queueMicrotask(() => {
        if (previous?.isConnected) previous.focus({ preventScroll: true });
      });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={wide ? "dialog wide" : "dialog"}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialog-head">
        <h2>{title}</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
