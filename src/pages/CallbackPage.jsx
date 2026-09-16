import { useEffect, useRef, useState } from 'react'

export function CallbackPage({ onComplete }) {
  const [message, setMessage] = useState('Concluindo autenticação com o Spotify…')
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')
    const authError = params.get('error')

    async function run() {
      if (authError) {
        setMessage('Autorização cancelada ou negada no Spotify.')
      } else if (!code) {
        setMessage('Não foi possível concluir a autenticação: código ausente.')
      } else {
        const ok = await onComplete(code, state)
        setMessage(ok ? 'Conectado! Redirecionando…' : 'Não foi possível concluir a autenticação com o Spotify.')
      }
      window.history.replaceState({}, '', '/')
      setTimeout(() => {
        window.location.href = '/'
      }, 800)
    }
    run()
  }, [onComplete])

  return (
    <div className="callback-screen">
      <p>{message}</p>
    </div>
  )
}
