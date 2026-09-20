import { useAuth } from './hooks/useAuth'
import { RadioPage } from './pages/RadioPage'
import { CallbackPage } from './pages/CallbackPage'

export function App() {
  const auth = useAuth()

  // Robusto a subpath (ex.: GitHub Pages serve em /Create-Radio/callback).
  if (window.location.pathname.endsWith('/callback')) {
    return <CallbackPage onComplete={auth.completeLogin} />
  }

  return <RadioPage auth={auth} />
}
