import { SPOTIFY_CLIENT_ID, SPOTIFY_REDIRECT_URI, SPOTIFY_SCOPES } from './config'
import { RadioError, ERROR_MESSAGES } from './errors'
import { generateCodeChallenge, generateCodeVerifier } from './pkce'

const STATE_KEY = 'spotify_auth_state'
const VERIFIER_KEY = 'spotify_code_verifier'
const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token'

export async function buildAuthorizeUrl() {
  const state = crypto.randomUUID()
  const verifier = generateCodeVerifier()
  const challenge = await generateCodeChallenge(verifier)
  sessionStorage.setItem(STATE_KEY, state)
  sessionStorage.setItem(VERIFIER_KEY, verifier)

  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: SPOTIFY_REDIRECT_URI,
    scope: SPOTIFY_SCOPES,
    state,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  })
  return `https://accounts.spotify.com/authorize?${params.toString()}`
}

export function consumeAuthState(returnedState) {
  const saved = sessionStorage.getItem(STATE_KEY)
  sessionStorage.removeItem(STATE_KEY)
  return Boolean(saved) && saved === returnedState
}

async function tokenRequest(body) {
  let res
  try {
    res = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: SPOTIFY_CLIENT_ID, ...body }).toString(),
    })
  } catch {
    throw new RadioError('API_UNAVAILABLE', ERROR_MESSAGES.API_UNAVAILABLE)
  }
  if (!res.ok) throw new RadioError('AUTH_FAILED', ERROR_MESSAGES.AUTH_FAILED)
  return res.json()
}

export function exchangeCodeForTokens(code) {
  const verifier = sessionStorage.getItem(VERIFIER_KEY)
  sessionStorage.removeItem(VERIFIER_KEY)
  return tokenRequest({
    grant_type: 'authorization_code',
    code,
    redirect_uri: SPOTIFY_REDIRECT_URI,
    code_verifier: verifier,
  })
}

export async function refreshTokens(refreshToken) {
  try {
    return await tokenRequest({ grant_type: 'refresh_token', refresh_token: refreshToken })
  } catch {
    throw new RadioError('TOKEN_EXPIRED', ERROR_MESSAGES.TOKEN_EXPIRED)
  }
}
