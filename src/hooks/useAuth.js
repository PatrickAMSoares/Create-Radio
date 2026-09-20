import { useCallback, useEffect, useRef, useState } from 'react'
import { buildAuthorizeUrl, consumeAuthState, exchangeCodeForTokens, refreshTokens } from '../lib/spotifyAuth'
import { spotifyApi } from '../lib/spotifyApi'
import { RadioError, ERROR_MESSAGES } from '../lib/errors'

// Sem backend, o refresh_token só pode ficar no navegador (é o trade-off
// padrão do fluxo PKCE para apps sem servidor). O access_token de curta
// duração nunca é persistido, só o refresh_token guardado em localStorage.
const REFRESH_TOKEN_KEY = 'radio_refresh_token'

export function useAuth() {
  const [accessToken, setAccessToken] = useState(null)
  const [profile, setProfile] = useState(null)
  const [status, setStatus] = useState('idle') // idle | loading | authenticated | error
  const [error, setError] = useState(null)
  const refreshTimer = useRef(null)

  const scheduleRefresh = useCallback((refreshToken, expiresIn) => {
    clearTimeout(refreshTimer.current)
    const delay = Math.max((expiresIn - 60) * 1000, 10000)
    refreshTimer.current = setTimeout(() => doRefresh(refreshToken), delay)
    // eslint-disable-next-line no-use-before-define
  }, [])

  const doRefresh = useCallback(
    async (refreshToken) => {
      try {
        const data = await refreshTokens(refreshToken)
        setAccessToken(data.access_token)
        const nextRefreshToken = data.refresh_token || refreshToken
        localStorage.setItem(REFRESH_TOKEN_KEY, nextRefreshToken)
        setStatus('authenticated')
        scheduleRefresh(nextRefreshToken, data.expires_in)
      } catch (err) {
        localStorage.removeItem(REFRESH_TOKEN_KEY)
        setAccessToken(null)
        setProfile(null)
        setStatus('error')
        setError(err instanceof RadioError ? err.message : ERROR_MESSAGES.TOKEN_EXPIRED)
      }
    },
    [scheduleRefresh],
  )

  useEffect(() => {
    const stored = localStorage.getItem(REFRESH_TOKEN_KEY)
    if (!stored) {
      setStatus('idle')
      return
    }
    setStatus('loading')
    doRefresh(stored)
    return () => clearTimeout(refreshTimer.current)
  }, [doRefresh])

  useEffect(() => {
    if (!accessToken) {
      setProfile(null)
      return
    }
    spotifyApi.getMe(accessToken).then(setProfile).catch(() => {})
  }, [accessToken])

  const login = useCallback(async () => {
    window.location.href = await buildAuthorizeUrl()
  }, [])

  const completeLogin = useCallback(
    async (code, state) => {
      setStatus('loading')
      setError(null)
      if (!consumeAuthState(state)) {
        setStatus('error')
        setError(ERROR_MESSAGES.AUTH_FAILED)
        return false
      }
      try {
        const data = await exchangeCodeForTokens(code)
        localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token)
        setAccessToken(data.access_token)
        setStatus('authenticated')
        scheduleRefresh(data.refresh_token, data.expires_in)
        return true
      } catch (err) {
        setStatus('error')
        setError(err instanceof RadioError ? err.message : ERROR_MESSAGES.AUTH_FAILED)
        return false
      }
    },
    [scheduleRefresh],
  )

  const logout = useCallback(() => {
    clearTimeout(refreshTimer.current)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    setAccessToken(null)
    setProfile(null)
    setStatus('idle')
  }, [])

  return { accessToken, profile, status, error, login, completeLogin, logout }
}
