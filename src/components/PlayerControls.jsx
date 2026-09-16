export function PlayerControls({ isPlaying, onPrevious, onTogglePlay, onNext, onShuffle, disabled }) {
  return (
    <div className="player-controls">
      <button type="button" className="control-btn" onClick={onPrevious} disabled={disabled} aria-label="Anterior">
        ⏮
      </button>
      <button
        type="button"
        className="control-btn control-btn--main"
        onClick={onTogglePlay}
        disabled={disabled}
        aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
      >
        {isPlaying ? '⏸' : '▶️'}
      </button>
      <button type="button" className="control-btn" onClick={onNext} disabled={disabled} aria-label="Próxima">
        ⏭
      </button>
      <button type="button" className="control-btn" onClick={onShuffle} disabled={disabled} aria-label="Aleatorizar fila">
        🔀
      </button>
    </div>
  )
}
