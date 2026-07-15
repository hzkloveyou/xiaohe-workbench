export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  if (!message) return null;
  return <div className="toast" role="status"><span>{message}</span><button type="button" aria-label="关闭提示" onClick={onClose}>×</button></div>;
}
