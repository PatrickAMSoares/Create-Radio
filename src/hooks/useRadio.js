import { useCallback, useRef, useState } from 'react'
import { buildCandidatePool, generateQueue, reshuffleQueue } from '../lib/queueEngine'
import { spotifyApi } from '../lib/spotifyApi'
import { loadHistory, pushHistory } from '../lib/historyStore'
import { RadioError, ERROR_MESSAGES } from '../lib/errors'

const QUEUE_SIZE = 20
const REFILL_THRESHOLD = 5
const PLAYED_STACK_LIMIT = 20

export function useRadio({ accessToken, deviceId, settings }) {
  const [queue, setQueue] = useState([])
  const [current, setCurrent] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const poolRef = useRef([])
  const playedStackRef = useRef([])
  const historyIdsRef = useRef(loadHistory().map((h) => h.id))

  const refillPool = useCallback(async () => {
    if (!accessToken) return []
    const pool = await buildCandidatePool(accessToken, settings.sources)
    poolRef.current = pool
    return pool
  }, [accessToken, settings.sources])

  const buildQueue = useCallback(async () => {
    let pool = poolRef.current
    if (pool.length < QUEUE_SIZE) pool = await refillPool()
    if (!pool.length) throw new RadioError('NO_TRACKS_FOUND', ERROR_MESSAGES.NO_TRACKS_FOUND)
    return generateQueue(
      pool,
      {
        familiaridade: settings.familiaridade,
        variedade: settings.variedade,
        repeticao: settings.repeticao,
        size: QUEUE_SIZE,
      },
      historyIdsRef.current,
    )
  }, [refillPool, settings])

  const playTrack = useCallback(
    async (track, { recordPrevious = true } = {}) => {
      if (!deviceId) throw new RadioError('PLAYBACK_FAILED', ERROR_MESSAGES.PLAYBACK_FAILED)
      try {
        await spotifyApi.play(accessToken, deviceId, [track.uri])
      } catch (err) {
        if (err.status === 403) throw new RadioError('PREMIUM_REQUIRED', ERROR_MESSAGES.PREMIUM_REQUIRED)
        if (err.status === 404) throw new RadioError('TRACK_UNAVAILABLE', ERROR_MESSAGES.TRACK_UNAVAILABLE)
        throw new RadioError('PLAYBACK_FAILED', ERROR_MESSAGES.PLAYBACK_FAILED)
      }
      setCurrent((prev) => {
        if (recordPrevious && prev) {
          playedStackRef.current = [prev, ...playedStackRef.current].slice(0, PLAYED_STACK_LIMIT)
        }
        return track
      })
      setIsPlaying(true)
      historyIdsRef.current = [track.id, ...historyIdsRef.current].slice(0, 200)
      pushHistory(track)
    },
    [accessToken, deviceId],
  )

  const start = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const newQueue = await buildQueue()
      const [first, ...rest] = newQueue
      setQueue(rest)
      await playTrack(first)
    } catch (err) {
      setError(err instanceof RadioError ? err.message : ERROR_MESSAGES.PLAYBACK_FAILED)
    } finally {
      setLoading(false)
    }
  }, [buildQueue, playTrack])

  const playNext = useCallback(async () => {
    setError(null)
    let nextQueue = queue
    if (nextQueue.length <= REFILL_THRESHOLD) {
      try {
        const more = await buildQueue()
        const existingIds = new Set(nextQueue.map((t) => t.id))
        nextQueue = [...nextQueue, ...more.filter((t) => !existingIds.has(t.id))]
      } catch {
        // mantém a fila atual se o reabastecimento falhar
      }
    }
    const [next, ...rest] = nextQueue
    if (!next) {
      setError(ERROR_MESSAGES.NO_TRACKS_FOUND)
      return
    }
    setQueue(rest)
    try {
      await playTrack(next)
    } catch (err) {
      setError(err instanceof RadioError ? err.message : ERROR_MESSAGES.PLAYBACK_FAILED)
    }
  }, [queue, buildQueue, playTrack])

  const playPrevious = useCallback(async () => {
    const [prev, ...restStack] = playedStackRef.current
    if (!prev) return
    setError(null)
    playedStackRef.current = restStack
    setQueue((q) => (current ? [current, ...q] : q))
    try {
      await playTrack(prev, { recordPrevious: false })
    } catch (err) {
      setError(err instanceof RadioError ? err.message : ERROR_MESSAGES.PLAYBACK_FAILED)
    }
  }, [current, playTrack])

  const togglePause = useCallback(async () => {
    if (!deviceId) return
    setError(null)
    try {
      if (isPlaying) await spotifyApi.pause(accessToken, deviceId)
      else await spotifyApi.resume(accessToken, deviceId)
      setIsPlaying((p) => !p)
    } catch {
      setError(ERROR_MESSAGES.PLAYBACK_FAILED)
    }
  }, [accessToken, deviceId, isPlaying])

  const shuffleQueue = useCallback(() => {
    setQueue((q) => reshuffleQueue(q))
  }, [])

  const markEnded = useCallback(() => {
    setIsPlaying(false)
    playNext()
  }, [playNext])

  return {
    queue,
    current,
    isPlaying,
    loading,
    error,
    start,
    playNext,
    playPrevious,
    togglePause,
    shuffleQueue,
    markEnded,
    setError,
  }
}
