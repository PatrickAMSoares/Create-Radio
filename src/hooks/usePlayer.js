import { useCallback, useEffect, useRef, useState } from 'react'
import { ERROR_MESSAGES } from '../lib/errors'

// O Web Playback SDK exige Spotify Premium (erro "account_error" em contas
// gratuitas) e só é inicializado quando sabemos que a conta é Premium.
export function usePlayer(accessToken, isPremium) {
  const [deviceId, setDeviceId] = useState(null)
  const [isReady, setIsReady] = useState(false)
  const [playbackState, setPlaybackState] = useState(null)
  const [playerError, setPlayerError] = useState(null)
  const playerRef = useRef(null)
  const tokenRef = useRef(accessToken)
  tokenRef.current = accessToken

  useEffect(() => {
    if (!accessToken || !isPremium) return

    function initPlayer() {
      const player = new window.Spotify.Player({
        name: 'Create Radio (navegador)',
        getOAuthToken: (cb) => cb(tokenRef.current),
        volume: 0.8,
      })
      player.addListener('ready', ({ device_id }) => {
        setDeviceId(device_id)
        setIsReady(true)
      })
      player.addListener('not_ready', () => setIsReady(false))
      player.addListener('player_state_changed', (state) => setPlaybackState(state))
      player.addListener('authentication_error', () => setPlayerError(ERROR_MESSAGES.TOKEN_EXPIRED))
      player.addListener('account_error', () => setPlayerError(ERROR_MESSAGES.PREMIUM_REQUIRED))
      player.addListener('initialization_error', () => setPlayerError(ERROR_MESSAGES.PLAYBACK_FAILED))
      player.connect()
      playerRef.current = player
    }

    if (window.Spotify) {
      initPlayer()
    } else {
      const script = document.createElement('script')
      script.src = 'https://sdk.scdn.co/spotify-player.js'
      script.async = true
      document.body.appendChild(script)
      window.onSpotifyWebPlaybackSDKReady = initPlayer
    }

    return () => {
      playerRef.current?.disconnect()
      playerRef.current = null
      setIsReady(false)
      setDeviceId(null)
    }
    // Recria o player só quando login/status Premium muda; o token em si é
    // sempre lido de tokenRef, então não precisa recriar o player a cada refresh.
  }, [Boolean(accessToken), isPremium])

  const togglePlay = useCallback(() => playerRef.current?.togglePlay(), [])

  return { deviceId, isReady, playbackState, playerError, togglePlay, setPlayerError }
}
