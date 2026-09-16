const { onRequest } = require('firebase-functions/v2/https')
const { defineSecret } = require('firebase-functions/params')
const admin = require('firebase-admin')
const { randomUUID } = require('crypto')

admin.initializeApp()
const db = admin.firestore()

// Client ID/Secret nunca ficam no código: são injetados como secrets do
// Firebase (firebase functions:secrets:set) e só existem em tempo de execução.
const SPOTIFY_CLIENT_ID = defineSecret('SPOTIFY_CLIENT_ID')
const SPOTIFY_CLIENT_SECRET = defineSecret('SPOTIFY_CLIENT_SECRET')

// Lista de origens do frontend autorizadas a chamar essas Functions
// (defina via `firebase functions:config` ou variável de ambiente ALLOWED_ORIGINS,
// separadas por vírgula, ex.: "http://127.0.0.1:5173,https://seu-app.web.app").
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean)

function applyCors(req, res) {
  const origin = req.headers.origin
  if (ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin || '*')
  }
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.set('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') {
    res.status(204).send('')
    return true
  }
  return false
}

async function tokenRequest(params, clientId, clientSecret) {
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams(params).toString(),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Spotify token error ${res.status}: ${text}`)
  }
  return res.json()
}

// Troca o "code" do Authorization Code Flow por tokens. O refresh_token nunca
// é devolvido ao navegador: fica só no Firestore, referenciado por um
// sessionId opaco que o frontend guarda em localStorage.
exports.exchangeToken = onRequest({ secrets: [SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET] }, async (req, res) => {
  if (applyCors(req, res)) return
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' })
    return
  }
  const { code, redirectUri } = req.body || {}
  if (!code || !redirectUri) {
    res.status(400).json({ error: 'missing_params' })
    return
  }
  try {
    const data = await tokenRequest(
      { grant_type: 'authorization_code', code, redirect_uri: redirectUri },
      SPOTIFY_CLIENT_ID.value(),
      SPOTIFY_CLIENT_SECRET.value(),
    )
    const sessionId = randomUUID()
    await db.collection('spotifySessions').doc(sessionId).set({
      refreshToken: data.refresh_token,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })
    res.json({ accessToken: data.access_token, expiresIn: data.expires_in, sessionId })
  } catch (err) {
    console.error('exchangeToken failed', err)
    res.status(502).json({ error: 'spotify_unavailable' })
  }
})

// Renova o access_token usando o refresh_token guardado no Firestore.
// O frontend chama isso ao carregar a página e periodicamente antes do token expirar.
exports.refreshToken = onRequest({ secrets: [SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET] }, async (req, res) => {
  if (applyCors(req, res)) return
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' })
    return
  }
  const { sessionId } = req.body || {}
  if (!sessionId) {
    res.status(400).json({ error: 'missing_params' })
    return
  }
  const ref = db.collection('spotifySessions').doc(sessionId)
  const snap = await ref.get()
  if (!snap.exists) {
    res.status(401).json({ error: 'invalid_session' })
    return
  }
  try {
    const data = await tokenRequest(
      { grant_type: 'refresh_token', refresh_token: snap.data().refreshToken },
      SPOTIFY_CLIENT_ID.value(),
      SPOTIFY_CLIENT_SECRET.value(),
    )
    const update = { lastRefreshedAt: admin.firestore.FieldValue.serverTimestamp() }
    // Spotify pode rotacionar o refresh_token; se vier um novo, substitui o guardado.
    if (data.refresh_token) update.refreshToken = data.refresh_token
    await ref.update(update)
    res.json({ accessToken: data.access_token, expiresIn: data.expires_in })
  } catch (err) {
    console.error('refreshToken failed', err)
    await ref.delete().catch(() => {})
    res.status(401).json({ error: 'refresh_failed' })
  }
})

// Encerra a sessão local. O Spotify não oferece endpoint público de revogação
// de token; para revogar de fato o acesso, o usuário precisa remover o app em
// https://www.spotify.com/account/apps/.
exports.logout = onRequest({}, async (req, res) => {
  if (applyCors(req, res)) return
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' })
    return
  }
  const { sessionId } = req.body || {}
  if (sessionId) await db.collection('spotifySessions').doc(sessionId).delete().catch(() => {})
  res.json({ ok: true })
})
