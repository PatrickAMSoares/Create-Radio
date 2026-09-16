import { useCallback, useEffect, useRef, useState } from 'react'
import { buildAuthorizeUrl, consumeAuthState, exchangeCodeForSession, refreshSession, endSession } from '../lib/spotifyAuth'
import { spotifyApi } from '../lib/spotifyApi'
import { RadioError, ERROR_MESSAGES } from '../lib/errors'

const SESSION_KEY = 'radio_session_id'

export function useAuth() {
  const [accessToken, setAccessToken] = useState(null)
  const [profile, setProfile] = useState(null)
  const [status, setStatus] = useState('idle') // idle | loading | authenticated | error
  const [error, setError] = useState(null)
  const refreshTimer = useRef(null)
  const sessionIdRef = useRef(localStorage.getItem(SESSION_KEY))

  const scheduleRefresh = useCallback((sessionId, expiresIn) => {
    clearTimeout(refreshTimer.current)
    const delay = Math.max((expiresIn - 60) * 1000, 10000)
    refreshTimer.current = setTimeout(() => doRefresh(sessionId), delay)
    // eslint-disable-next-line no-use-before-define
  }, [])

  const doRefresh = useCallback(
    async (sessionId) => {
      try {
        const { accessToken: token, expiresIn } = await refreshSession(sessionId)
        setAccessToken(token)
        setStatus('authenticated')
        scheduleRefresh(sessionId, expiresIn)
      } catch (err) {
        sessionIdRef.current = null
        localStorage.removeItem(SESSION_KEY)
        setAccessToken(null)
        setProfile(null)
        setStatus('error')
        setError(err instanceof RadioError ? err.message : ERROR_MESSAGES.TOKEN_EXPIRED)
      }
    },
    [scheduleRefresh],
  )

  useEffect(() => {
    const sessionId = sessionIdRef.current
    if (!sessionId) {
      setStatus('idle')
      return
    }
    setStatus('loading')
    doRefresh(sessionId)
    return () => clearTimeout(refreshTimer.current)
  }, [doRefresh])

  useEffect(() => {
    if (!accessToken) {
      setProfile(null)
      return
    }
    spotifyApi.getMe(accessToken).then(setProfile).catch(() => {})
  }, [accessToken])

  const login = useCallback(() => {
    window.location.href = buildAuthorizeUrl()
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
        const { accessToken: token, expiresIn, sessionId } = await exchangeCodeForSession(code)
        sessionIdRef.current = sessionId
        localStorage.setItem(SESSION_KEY, sessionId)
        setAccessToken(token)
        setStatus('authenticated')
        scheduleRefresh(sessionId, expiresIn)
        return true
      } catch (err) {
        setStatus('error')
        setError(err instanceof RadioError ? err.message : ERROR_MESSAGES.AUTH_FAILED)
        return false
      }
    },
    [scheduleRefresh],
  )

  const logout = useCallback(async () => {
    clearTimeout(refreshTimer.current)
    await endSession(sessionIdRef.current)
    sessionIdRef.current = null
    localStorage.removeItem(SESSION_KEY)
    setAccessToken(null)
    setProfile(null)
    setStatus('idle')
  }, [])

  return { accessToken, profile, status, error, login, completeLogin, logout }
}
