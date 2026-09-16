export function NowPlayingCard({ track, isPlaying, isPremium }) {
  if (!track) {
    return (
      <div className="now-playing now-playing--empty">
        <p>Nenhuma música selecionada ainda. Clique em &quot;Iniciar Rádio&quot; para começar.</p>
      </div>
    )
  }

  const cover = track.album?.images?.[0]?.url

  return (
    <div className="now-playing">
      <div className="cover-wrapper">
        {cover ? (
          <img className="cover" src={cover} alt={track.album?.name || ''} />
        ) : (
          <div className="cover cover--placeholder" />
        )}
        {isPlaying && <span className="playing-indicator">▮▮ tocando</span>}
      </div>
      <div className="track-info">
        <h2 className="track-name">{track.name}</h2>
        <p className="track-artist">{track.artists?.map((a) => a.name).join(', ')}</p>
        <p className="track-album">{track.album?.name}</p>
        {!isPremium && <p className="premium-badge">Reprodução completa exige Spotify Premium</p>}
      </div>
    </div>
  )
}
