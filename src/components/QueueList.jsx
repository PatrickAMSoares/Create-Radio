export function QueueList({ queue }) {
  return (
    <section className="queue">
      <h3>Próximas músicas</h3>
      {queue.length === 0 ? (
        <p className="hint">A fila está vazia.</p>
      ) : (
        <ol className="queue-list">
          {queue.slice(0, 5).map((track, idx) => {
            const thumb = track.album?.images?.[track.album.images.length - 1]?.url
            return (
              <li key={track.id} className="queue-item">
                <span className="queue-index">{idx + 1}</span>
                {thumb && <img className="queue-thumb" src={thumb} alt="" />}
                <div className="queue-track-info">
                  <span className="queue-track-name">{track.name}</span>
                  <span className="queue-track-artist">{track.artists?.map((a) => a.name).join(', ')}</span>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
