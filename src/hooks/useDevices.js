import { useCallback, useEffect, useState } from 'react'
import { spotifyApi } from '../lib/spotifyApi'

// Lista os dispositivos Spotify Connect ativos na conta (inclui o player do
// próprio navegador quando ele está pronto, e também o app oficial do
// Spotify se estiver aberto em outro aparelho, ex.: celular).
export function useDevices(accessToken) {
  const [devices, setDevices] = useState([])

  const refresh = useCallback(async () => {
    if (!accessToken) return
    try {
      const data = await spotifyApi.getDevices(accessToken)
      setDevices(data?.devices || [])
    } catch {
      // lista de dispositivos é um extra de conveniência, não crítico o suficiente para virar um erro visível
    }
  }, [accessToken])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { devices, refreshDevices: refresh }
}
