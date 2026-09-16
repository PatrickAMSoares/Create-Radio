import { useAuth } from './hooks/useAuth'
import { RadioPage } from './pages/RadioPage'
import { CallbackPage } from './pages/CallbackPage'

export function App() {
  const auth = useAuth()

  if (window.location.pathname === '/callback') {
    return <CallbackPage onComplete={auth.completeLogin} />
  }

  return <RadioPage auth={auth} />
}
