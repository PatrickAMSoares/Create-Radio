# Rádio Pessoal — Spotify

Webapp que conecta à conta Spotify do usuário e monta uma "rádio pessoal": uma
fila de músicas sorteada a partir do que a própria conta já tem (salvas, artistas
seguidos, playlists, álbuns), reproduzida através do **Spotify Web Playback SDK**
(oficial). Nenhum áudio é baixado, copiado ou re-transmitido — a reprodução
acontece inteiramente dentro dos mecanismos do Spotify.

## Arquitetura

- **Frontend**: React + Vite, sem roteador externo (duas "páginas": `/` e `/callback`).
- **Backend**: Firebase Cloud Functions — a única parte que conhece o *Client Secret*
  do Spotify. É responsável por:
  - troca do `code` do OAuth por `access_token`/`refresh_token`;
  - renovação do `access_token` quando expira;
  - guardar o `refresh_token` no Firestore (nunca no navegador), associado a um
    `sessionId` opaco.
- **Firestore**: só guarda `{ sessionId → refreshToken }`. Regras bloqueiam
  qualquer leitura/escrita direta do cliente — só as Functions (Admin SDK) acessam.
- Todo o resto (perfil, músicas salvas, playlists, tocar/pausar/pular) é chamado
  **diretamente do navegador** para a Web API do Spotify, usando o `access_token`
  — é assim que o Spotify espera que apps web funcionem, e evita duplicar tráfego
  passando pelo backend sem necessidade.

Este projeto é **independente** do app "Conta Aí" — não compartilha código,
Firebase, nem dados. É um projeto novo, para ser publicado em seu próprio
repositório GitHub.

## Por que existe um backend, se dá para usar PKCE sem ele?

O Spotify aceita Authorization Code Flow **com PKCE**, que dispensa backend
(não precisa de Client Secret). Optamos por manter um backend simples porque:
- o Client Secret nunca fica exposto, nem por engano, em nenhum bundle de frontend;
- o `refresh_token` nunca passa pelo navegador, reduzindo a superfície de um
  eventual XSS;
- fica pronto para, no futuro, suportar múltiplos usuários com dados por sessão
  no servidor, sem redesenhar o fluxo de autenticação.

## Pré-requisitos que você precisa preparar

### 1. App no Spotify Developer Dashboard

1. Acesse https://developer.spotify.com/dashboard e crie um app.
2. Em **Redirect URIs**, cadastre:
   - `http://127.0.0.1:5173/callback` (desenvolvimento local)
   - a URL de produção do seu domínio + `/callback` (ex.: `https://seu-app.web.app/callback`)
3. Anote o **Client ID** e o **Client Secret**.
4. Em "Which API/SDKs are you planning to use?", marque **Web API** e **Web Playback SDK**.

> Uma conta **Spotify Premium** é necessária para testar a reprodução: o Web
> Playback SDK não funciona com contas gratuitas (o Spotify retorna
> `account_error`/403 "Premium required"). Contas gratuitas conseguem logar,
> configurar a rádio e ver a fila, mas não reproduzir.

### 2. Projeto Firebase (novo, dedicado a este app)

1. Crie um projeto em https://console.firebase.google.com — **não reutilize** o
   projeto do Conta Aí.
2. Ative **Firestore** (modo produção) e **Cloud Functions** (plano Blaze é
   necessário para Functions 2ª geração fazerem chamadas HTTP externas).
3. Instale o Firebase CLI (`npm install -g firebase-tools`) e faça login (`firebase login`).
4. Copie `.firebaserc.example` para `.firebaserc` e coloque o ID do seu projeto.
5. Configure os secrets do Spotify (nunca vão para o código-fonte):
   ```bash
   firebase functions:secrets:set SPOTIFY_CLIENT_ID
   firebase functions:secrets:set SPOTIFY_CLIENT_SECRET
   ```
6. (Opcional, recomendado) restrinja os CORS das Functions à sua origem de produção:
   defina a variável de ambiente `ALLOWED_ORIGINS` (separada por vírgulas) no
   deploy das Functions.

### 3. Variáveis de ambiente do frontend

Copie `.env.example` para `.env` e preencha:

```
VITE_SPOTIFY_CLIENT_ID=<client id do passo 1>
VITE_SPOTIFY_REDIRECT_URI=http://127.0.0.1:5173/callback
VITE_API_BASE_URL=http://127.0.0.1:5001/SEU_PROJETO_FIREBASE/us-central1
```

Em produção, `VITE_API_BASE_URL` passa a ser a URL das Functions publicadas
(`https://us-central1-SEU_PROJETO_FIREBASE.cloudfunctions.net`) e
`VITE_SPOTIFY_REDIRECT_URI` passa a ser a URL do seu domínio + `/callback`.

## Rodando localmente

```bash
# backend (emulador do Firebase)
cd functions && npm install
cd .. && firebase emulators:start --only functions,firestore

# frontend, em outro terminal
npm install
npm run dev
```

Abra `http://127.0.0.1:5173`, clique em "Conectar com Spotify" e autorize.

## Deploy

```bash
firebase deploy --only functions,firestore:rules
npm run build   # gera dist/, publique em qualquer hosting estático com HTTPS
                # (ex.: firebase hosting, Vercel, Netlify)
```

A aplicação **precisa** estar em HTTPS em produção (exigência do próprio
Spotify para o Web Playback SDK e para o redirect OAuth, exceto em `127.0.0.1`).

## Limitações atuais da plataforma Spotify (não são bugs deste app)

- **Reprodução completa exige Premium.** Contas gratuitas não conseguem tocar
  faixas inteiras via Web Playback SDK — é uma restrição do próprio Spotify.
- **`/recommendations`, `/recommendations/available-genre-seeds`,
  `/artists/{id}/related-artists` e `/browse/featured-playlists` foram
  descontinuados pelo Spotify (novembro/2024) para apps novos.** Por isso a
  rádio não usa o motor de recomendação "oficial" do Spotify — em vez disso,
  monta a seleção a partir de dados que o próprio usuário já possui (músicas
  salvas, artistas/álbuns seguidos, playlists, lançamentos recentes), que
  continuam disponíveis e são a alternativa oficialmente suportada.
- **URLs de preview de 30 segundos também foram descontinuadas** para apps
  novos — por isso não há fallback de "preview" quando o Premium falta; a
  interface apenas explica a limitação.
- **Sem "anterior" nativo do Spotify.** Como a fila é gerenciada pelo próprio
  app (fora do contexto padrão do Spotify), o botão "Anterior" usa um
  histórico local de reprodução, não a API de fila do Spotify.
- **Logout não revoga o acesso no lado do Spotify.** O Spotify não oferece um
  endpoint público de revogação de token; "Desconectar" apaga a sessão local
  (Firestore + localStorage). Para revogar de fato, o usuário precisa remover
  o app em https://www.spotify.com/account/apps/.
- **Rate limits**: a Web API pode responder 429; o cliente já trata isso com
  espera automática (`Retry-After`), mas em uso muito intenso pode haver
  atraso perceptível.

## Segurança

- Client Secret só existe como secret do Firebase Functions, nunca no bundle
  do frontend nem no repositório.
- `refresh_token` nunca é enviado ao navegador; fica no Firestore, acessível
  apenas via Admin SDK dentro das Functions (regras do Firestore bloqueiam
  qualquer acesso direto do cliente).
- O frontend guarda apenas um `sessionId` opaco (não é um token) em
  `localStorage`, e o `access_token` em memória (estado do React) — não é
  persistido em `localStorage`/`sessionStorage`.
- Preferências de rádio e histórico de reprodução ficam só em `localStorage`,
  no navegador do usuário; nada disso é enviado a nenhum servidor.
- Senha do Spotify nunca passa por este app — o login é feito inteiramente na
  página oficial `accounts.spotify.com`.
