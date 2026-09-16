export function LoginScreen({ onLogin, loading, error }) {
  return (
    <div className="login-screen">
      <span className="brand-mark brand-mark--large" aria-hidden="true">🎧</span>
      <h1>Sua Rádio</h1>
      <p className="subtitle">Uma seleção aleatória baseada no seu gosto musical.</p>
      <button type="button" className="btn btn--primary btn--large" onClick={onLogin} disabled={loading}>
        {loading ? 'Conectando…' : 'Conectar com Spotify'}
      </button>
      {error && <p className="error-text">{error}</p>}
      <p className="hint">
        Você será direcionado para o login oficial do Spotify. Não pedimos nem armazenamos sua senha.
      </p>
    </div>
  )
}
