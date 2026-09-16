export function Toast({ message, onDismiss }) {
  if (!message) return null
  return (
    <div className="toast" role="alert">
      <span>{message}</span>
      <button type="button" className="toast-close" onClick={onDismiss} aria-label="Fechar aviso">
        ×
      </button>
    </div>
  )
}
