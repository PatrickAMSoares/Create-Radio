export function Header({ profile, onDisconnect }) {
  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">🎧</span>
        <span className="brand-name">Rádio Pessoal</span>
      </div>
      <div className="account">
        <span className="status-pill status-pill--ok">Spotify conectado</span>
        {profile?.images?.[0]?.url ? (
          <img className="avatar" src={profile.images[0].url} alt={profile?.display_name || 'Perfil'} />
        ) : (
          <span className="avatar avatar--placeholder">{(profile?.display_name || '?')[0]}</span>
        )}
        <button type="button" className="btn btn--ghost" onClick={onDisconnect}>
          Desconectar
        </button>
      </div>
    </header>
  )
}
