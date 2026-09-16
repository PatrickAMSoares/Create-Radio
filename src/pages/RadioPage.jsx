import { useEffect, useRef, useState } from 'react'
import { Header } from '../components/Header'
import { LoginScreen } from '../components/LoginScreen'
import { NowPlayingCard } from '../components/NowPlayingCard'
import { PlayerControls } from '../components/PlayerControls'
import { QueueList } from '../components/QueueList'
import { RadioSettingsPanel } from '../components/RadioSettingsPanel'
import { HistoryPanel } from '../components/HistoryPanel'
import { Toast } from '../components/Toast'
import { usePlayer } from '../hooks/usePlayer'
import { useRadio } from '../hooks/useRadio'
import { loadSettings, saveSettings } from '../lib/settingsStore'
import { loadHistory, clearHistory } from '../lib/historyStore'

export function RadioPage({ auth }) {
  const { accessToken, profile, status, error: authError, login, logout } = auth
  const isPremium = profile?.product === 'premium'
  const [settings, setSettings] = useState(loadSettings())
  const [history, setHistory] = useState(loadHistory())
  const lastPositionRef = useRef(0)

  useEffect(() => saveSettings(settings), [settings])

  const { deviceId, isReady, playbackState, playerError, setPlayerError } = usePlayer(accessToken, isPremium)
  const radio = useRadio({ accessToken, deviceId, settings })

  useEffect(() => {
    if (!radio.current) return
    setHistory(loadHistory())
  }, [radio.current])

  // O SDK não avança faixas automaticamente porque tocamos uma faixa por vez
  // (fila própria, fora do contexto nativo do Spotify). Detecta o fim da
  // faixa atual (pausou em position 0 após ter avançado de fato) para então
  // pedir a próxima música da nossa fila.
  useEffect(() => {
    if (!playbackState) return
    const wasPlaying = lastPositionRef.current > 3000
    const ended = playbackState.paused && playbackState.position === 0 && wasPlaying
    lastPositionRef.current = playbackState.position
    if (ended) radio.markEnded()
  }, [playbackState])

  const combinedError = playerError || radio.error || (status === 'error' ? authError : null)
  const dismissError = () => {
    setPlayerError(null)
    radio.setError(null)
  }

  if (status !== 'authenticated') {
    return <LoginScreen onLogin={login} loading={status === 'loading'} error={authError} />
  }

  const controlsDisabled = !isReady || !isPremium || radio.loading

  return (
    <div className="app-shell">
      <Header profile={profile} onDisconnect={logout} />
      <main className="main-content">
        <div className="radio-column">
          <h1>Sua Rádio</h1>
          <p className="subtitle">Uma seleção aleatória baseada no seu gosto musical.</p>

          {!isPremium && (
            <p className="premium-warning">
              Sua conta não é Premium: o Spotify não permite reprodução completa de músicas pelo navegador para
              contas gratuitas. Você ainda pode configurar a rádio e ver a fila, mas a reprodução ficará
              indisponível.
            </p>
          )}

          <NowPlayingCard track={radio.current} isPlaying={radio.isPlaying} isPremium={isPremium} />

          {radio.current ? (
            <PlayerControls
              isPlaying={radio.isPlaying}
              onPrevious={radio.playPrevious}
              onTogglePlay={radio.togglePause}
              onNext={radio.playNext}
              onShuffle={radio.shuffleQueue}
              disabled={controlsDisabled}
            />
          ) : (
            <button type="button" className="btn btn--primary btn--large" onClick={radio.start} disabled={controlsDisabled}>
              {radio.loading ? 'Preparando…' : '▶️ Iniciar Rádio'}
            </button>
          )}

          <QueueList queue={radio.queue} />
        </div>

        <div className="side-column">
          <RadioSettingsPanel settings={settings} onChange={setSettings} />
          <HistoryPanel
            history={history}
            onClear={() => {
              clearHistory()
              setHistory([])
            }}
          />
        </div>
      </main>
      <Toast message={combinedError} onDismiss={dismissError} />
    </div>
  )
}
