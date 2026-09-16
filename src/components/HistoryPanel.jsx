export function HistoryPanel({ history, onClear }) {
  return (
    <section className="history-panel">
      <div className="history-header">
        <h3>Histórico da Rádio</h3>
        {history.length > 0 && (
          <button type="button" className="btn btn--ghost btn--small" onClick={onClear}>
            Limpar
          </button>
        )}
      </div>
      {history.length === 0 ? (
        <p className="hint">Nenhuma música reproduzida ainda.</p>
      ) : (
        <ul className="history-list">
          {history.map((entry, idx) => (
            <li key={`${entry.id}-${entry.playedAt}-${idx}`} className="history-item">
              {entry.image && <img className="history-thumb" src={entry.image} alt="" />}
              <div className="history-track-info">
                <p className="history-track">{entry.name}</p>
                <p className="history-artist">{entry.artist}</p>
              </div>
              <time className="history-time" dateTime={entry.playedAt}>
                {new Date(entry.playedAt).toLocaleString('pt-BR')}
              </time>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
