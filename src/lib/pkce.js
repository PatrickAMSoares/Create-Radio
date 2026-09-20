// PKCE (Proof Key for Code Exchange) permite autenticar sem Client Secret e
// sem backend: o "segredo" de cada login é gerado no navegador e nunca sai dele.

function base64UrlEncode(buffer) {
  const bytes = new Uint8Array(buffer)
  let str = ''
  for (const byte of bytes) str += String.fromCharCode(byte)
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function generateCodeVerifier() {
  const array = new Uint8Array(64)
  crypto.getRandomValues(array)
  return base64UrlEncode(array.buffer)
}

export async function generateCodeChallenge(verifier) {
  const data = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return base64UrlEncode(digest)
}
