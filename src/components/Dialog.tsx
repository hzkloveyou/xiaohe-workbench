import { useEffect, useRef, type ReactNode } from "react";

interface DialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}

export function Dialog({ open, title, children, onClose }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} className="dialog" onCancel={onClose} onClose={onClose} aria-labelledby="dialog-title">
      <div className="dialog__header">
        <h2 id="dialog-title">{title}</h2>
        <ButtonClose onClick={onClose} />
      </div>
      {children}
    </dialog>
  );
}

function ButtonClose({ onClick }: { onClick: () => void }) {
  return <button type="button" className="icon-button" aria-label="关闭对话框" onClick={onClick}>×</button>;
}
