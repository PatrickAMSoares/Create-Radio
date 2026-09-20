import { spotifyApi } from './spotifyApi'

// Peso de "familiaridade" por fonte: quanto maior, mais "conhecida" a faixa tende a ser
// para o usuário. Usado para sorteio ponderado (algoritmo A-Res).
const FAMILIARITY_WEIGHT = {
  savedTracks: 3,
  topArtists: 3,
  popular: 3,
  playlists: 2,
  albums: 2,
  discovery: 1,
}

function shuffle(array) {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function tag(tracks, source) {
  return tracks.filter(Boolean).map((t) => ({ ...t, _source: source }))
}

async function collectSavedTracks(token) {
  const data = await spotifyApi.getSavedTracks(token, 50)
  return tag((data?.items || []).map((i) => i.track), 'savedTracks')
}

async function collectPopular(token) {
  const data = await spotifyApi.getTopTracks(token, 'short_term', 50)
  return tag(data?.items || [], 'popular')
}

async function collectTopArtistsTracks(token) {
  const artists = await spotifyApi.getTopArtists(token, 'medium_term', 20)
  const picks = (artists?.items || []).slice(0, 10)
  const results = await Promise.all(picks.map((a) => spotifyApi.getArtistTopTracks(token, a.id).catch(() => null)))
  return tag(results.flatMap((r) => r?.tracks || []), 'topArtists')
}

async function collectPlaylistTracks(token) {
  const playlists = await spotifyApi.getPlaylists(token, 30)
  const picks = shuffle(playlists?.items || []).slice(0, 5)
  const results = await Promise.all(
    picks.map((p) => spotifyApi.getPlaylistTracks(token, p.id, 50).catch(() => null)),
  )
  return tag(results.flatMap((r) => (r?.items || []).map((i) => i.track)), 'playlists')
}

async function collectAlbumTracks(token) {
  const albums = await spotifyApi.getSavedAlbums(token, 30)
  const picks = shuffle(albums?.items || []).slice(0, 5)
  const results = await Promise.all(
    picks.map((a) => spotifyApi.getAlbumTracks(token, a.album.id, 50).catch(() => null)),
  )
  const tracks = results.flatMap((r, idx) => {
    const album = picks[idx]?.album
    return (r?.items || []).map((t) => ({ ...t, album }))
  })
  return tag(tracks, 'albums')
}

async function collectDiscovery(token) {
  const [releases, followed] = await Promise.all([
    spotifyApi.getNewReleases(token, 30).catch(() => null),
    spotifyApi.getFollowedArtists(token, 30).catch(() => null),
  ])
  const releaseAlbums = (releases?.albums?.items || []).slice(0, 8)
  const albumTrackResults = await Promise.all(
    releaseAlbums.map((a) => spotifyApi.getAlbumTracks(token, a.id, 10).catch(() => null)),
  )
  const albumTracks = albumTrackResults.flatMap((r, idx) => {
    const album = releaseAlbums[idx]
    return (r?.items || []).map((t) => ({ ...t, album }))
  })

  const followedArtists = shuffle(followed?.artists?.items || []).slice(0, 8)
  const artistTrackResults = await Promise.all(
    followedArtists.map((a) => spotifyApi.getArtistTopTracks(token, a.id).catch(() => null)),
  )
  const artistTracks = artistTrackResults.flatMap((r) => r?.tracks || [])

  return tag([...albumTracks, ...artistTracks], 'discovery')
}

// Rótulos em português mapeados para os termos que aparecem nos gêneros
// crus retornados pela Web API (ex.: artista pode ter "modern rock",
// "sertanejo universitario", "edm" etc. — por isso o match é por substring).
export const GENRE_STYLES = [
  { key: 'pop', label: 'Pop', keywords: ['pop'] },
  { key: 'rock', label: 'Rock', keywords: ['rock'] },
  { key: 'hiphop', label: 'Hip-Hop / Rap', keywords: ['hip hop', 'rap', 'trap'] },
  { key: 'eletronica', label: 'Eletrônica', keywords: ['edm', 'electro', 'house', 'techno', 'trance', 'dubstep'] },
  { key: 'sertanejo', label: 'Sertanejo', keywords: ['sertanejo'] },
  { key: 'mpb', label: 'MPB', keywords: ['mpb', 'musica popular brasileira'] },
  { key: 'samba', label: 'Samba / Pagode', keywords: ['samba', 'pagode'] },
  { key: 'funk', label: 'Funk', keywords: ['funk'] },
  { key: 'forro', label: 'Forró', keywords: ['forro', 'forró'] },
  { key: 'reggae', label: 'Reggae', keywords: ['reggae'] },
  { key: 'jazz', label: 'Jazz', keywords: ['jazz'] },
  { key: 'classica', label: 'Clássica', keywords: ['classical'] },
  { key: 'metal', label: 'Metal', keywords: ['metal'] },
  { key: 'indie', label: 'Indie', keywords: ['indie'] },
  { key: 'rnb', label: 'R&B / Soul', keywords: ['r&b', 'soul'] },
  { key: 'gospel', label: 'Gospel', keywords: ['gospel'] },
]

// Cache em memória (dura a sessão do navegador): gênero de artista é dado
// praticamente imutável, não vale a pena buscar de novo a cada fila gerada.
const artistGenreCache = new Map()

async function fetchArtistGenres(token, artistIds) {
  const uncached = artistIds.filter((id) => !artistGenreCache.has(id))
  const chunks = []
  for (let i = 0; i < uncached.length; i += 50) chunks.push(uncached.slice(i, i + 50))
  const results = await Promise.all(chunks.map((ids) => spotifyApi.getArtists(token, ids).catch(() => null)))
  for (const r of results) {
    for (const artist of r?.artists || []) {
      if (artist) artistGenreCache.set(artist.id, artist.genres || [])
    }
  }
  const map = new Map()
  for (const id of artistIds) map.set(id, artistGenreCache.get(id) || [])
  return map
}

export async function filterPoolByGenres(token, pool, selectedStyleKeys) {
  if (!selectedStyleKeys?.length) return pool
  const keywords = selectedStyleKeys.flatMap((key) => GENRE_STYLES.find((s) => s.key === key)?.keywords || [])
  if (!keywords.length) return pool

  const artistIds = [...new Set(pool.map((t) => t.artists?.[0]?.id).filter(Boolean))]
  const genresByArtist = await fetchArtistGenres(token, artistIds)

  const filtered = pool.filter((t) => {
    const genres = genresByArtist.get(t.artists?.[0]?.id) || []
    return genres.some((g) => keywords.some((kw) => g.includes(kw)))
  })
  // Sem faixa nenhuma bate com o estilo escolhido (ex.: conta sem nada nesse
  // gênero) — melhor devolver o pool inteiro do que travar a rádio.
  return filtered.length ? filtered : pool
}

const COLLECTORS = {
  savedTracks: collectSavedTracks,
  topArtists: collectTopArtistsTracks,
  playlists: collectPlaylistTracks,
  albums: collectAlbumTracks,
  discovery: collectDiscovery,
  popular: collectPopular,
}

function dedupeTracks(tracks) {
  const map = new Map()
  for (const t of tracks) {
    if (!t?.id || t.is_local || t.is_playable === false) continue
    if (!map.has(t.id)) map.set(t.id, t)
  }
  return [...map.values()]
}

export async function buildCandidatePool(token, sources) {
  const active = Object.entries(sources || {})
    .filter(([, enabled]) => enabled)
    .map(([key]) => key)
  // Nenhuma fonte marcada = "totalmente aleatório": usa todas as fontes disponíveis.
  const keys = active.length ? active : Object.keys(COLLECTORS)
  const batches = await Promise.all(keys.map((key) => COLLECTORS[key]?.(token).catch(() => []) ?? []))
  return dedupeTracks(batches.flat())
}

function familiarityScore(track, familiaridade) {
  const weight = FAMILIARITY_WEIGHT[track._source] ?? 2
  if (familiaridade === 'conhecidas') return weight
  if (familiaridade === 'descobertas') return 4 - weight
  return 1
}

// Sorteio ponderado sem reposição (algoritmo A-Res): cada item recebe uma chave
// aleatória elevada ao inverso do peso, e ordenar por essa chave aproxima a
// probabilidade de seleção ao peso relativo de cada faixa.
function weightedShuffle(items, weightFn) {
  return items
    .map((item) => ({ item, key: Math.random() ** (1 / Math.max(weightFn(item), 0.01)) }))
    .sort((a, b) => b.key - a.key)
    .map((entry) => entry.item)
}

export function generateQueue(pool, { familiaridade = 'equilibrado', variedade = 'media', repeticao = 'evitar', size = 20 } = {}, historyIds = []) {
  let candidates = pool
  if (repeticao === 'evitar') {
    const recent = new Set(historyIds.slice(0, 50))
    candidates = pool.filter((t) => !recent.has(t.id))
  } else if (repeticao === 'algumas') {
    const recent = new Set(historyIds.slice(0, 15))
    candidates = pool.filter((t) => !recent.has(t.id))
  }
  if (!candidates.length) candidates = pool
  if (!candidates.length) return []

  const maxPerArtist = variedade === 'alta' ? 1 : variedade === 'baixa' ? 4 : 2
  const ordered = weightedShuffle(candidates, (t) => familiarityScore(t, familiaridade))

  const perArtistCount = new Map()
  const queue = []
  for (const track of ordered) {
    const artistId = track.artists?.[0]?.id || 'unknown'
    const count = perArtistCount.get(artistId) || 0
    if (count >= maxPerArtist) continue
    perArtistCount.set(artistId, count + 1)
    queue.push(track)
    if (queue.length >= size) break
  }
  return queue.length ? queue : ordered.slice(0, size)
}

export function reshuffleQueue(queue) {
  if (queue.length <= 1) return queue
  const [current, ...rest] = queue
  return [current, ...shuffle(rest)]
}
