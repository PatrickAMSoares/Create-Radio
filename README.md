# Rádio Pessoal — Spotify

Webapp que conecta à conta Spotify do usuário e monta uma "rádio pessoal": uma
fila de músicas sorteada a partir do que a própria conta já tem (salvas, artistas
seguidos, playlists, álbuns), reproduzida através do **Spotify Web Playback SDK**
(oficial). Nenhum áudio é baixado, copiado ou re-transmitido — a reprodução
acontece inteiramente dentro dos mecanismos do Spotify.

**100% gratuito para rodar**: sem backend, sem banco de dados, sem cartão de
crédito. É um site estático hospedado de graça no GitHub Pages.

## Como usar (depois de configurado)

Abrir o link → clicar em "Conectar com Spotify" → autorizar → usar. Nada para
instalar, nenhuma conta além da sua própria conta Spotify.

## Arquitetura

- **Frontend**: React + Vite, site estático (sem servidor).
- **Autenticação**: Spotify Authorization Code Flow **com PKCE** — o método
  oficial do Spotify para apps sem backend. Não existe Client Secret: o
  "segredo" de cada login é gerado no próprio navegador e descartado depois
  de usado uma vez.
- **Hospedagem**: GitHub Pages, com deploy automático via GitHub Actions a
  cada push na branch `main`.
- Todas as chamadas (perfil, músicas salvas, playlists, tocar/pausar/pular)
  vão **diretamente do navegador** para a Web API do Spotify.

Este projeto é **independente** do app "Conta Aí" — não compartilha código
nem dados.

## Por que sem backend?

O Spotify aceita dois jeitos de autenticar: Authorization Code Flow "clássico"
(precisa de um Client Secret guardado em um servidor) e Authorization Code
Flow **com PKCE** (não precisa de secret nem servidor — foi desenhado
justamente para SPAs e apps móveis). Usar PKCE elimina completamente a
necessidade de backend, banco de dados e qualquer custo de hospedagem paga.

**Trade-off aceito**: sem servidor, o `refresh_token` só pode ficar guardado
no próprio navegador (`localStorage`). Isso é o padrão oficial recomendado
pelo Spotify para esse tipo de app — o risco equivalente é o de qualquer
sessão de site local (mitigado por não existir Client Secret nenhum para
vazar, e por token/scopes serem exclusivos da conta do próprio usuário).

## Pré-requisito único: app no Spotify Developer Dashboard

1. Acesse https://developer.spotify.com/dashboard e crie um app (**Create app**).
2. Em **Redirect URIs**, cadastre:
   - `http://127.0.0.1:5173/callback` (se quiser rodar localmente também)
   - `https://SEU_USUARIO.github.io/Create-Radio/callback` (produção — troque `SEU_USUARIO` pelo seu usuário do GitHub)
3. Marque **Web API** e **Web Playback SDK**.
4. Salve e copie o **Client ID** (o Client Secret não é usado neste projeto — pode ignorar).

> Uma conta **Spotify Premium** é necessária para a reprodução funcionar: o
> Web Playback SDK não toca músicas completas em contas gratuitas (o Spotify
> retorna erro de "Premium required"). Contas gratuitas conseguem logar,
> configurar a rádio e ver a fila, mas não reproduzir.

## Publicar no GitHub Pages (uma vez só)

1. No repositório, vá em **Settings → Pages**.
2. Em "Build and deployment", mude **Source** para **GitHub Actions**.
3. Edite o arquivo `.env.production` (pelo próprio GitHub: abra o arquivo, ícone
   de lápis) e preencha com o Client ID do passo anterior e a URL de produção
   (mesma do Redirect URI cadastrado no Spotify). Salve o commit.
4. Isso já dispara o workflow em `.github/workflows/deploy.yml`, que builda e
   publica automaticamente. Acompanhe em **Actions**; quando terminar, o link
   fica em `https://SEU_USUARIO.github.io/Create-Radio/`.

Qualquer novo push em `main` reimplanta automaticamente.

## Rodando localmente (opcional, só para quem for mexer no código)

```bash
npm install
cp .env.example .env   # preencha com o Client ID e o redirect local
npm run dev
```

## Limitações atuais da plataforma Spotify (não são bugs deste app)

- **Reprodução completa exige Premium.** Contas gratuitas não conseguem tocar
  faixas inteiras via Web Playback SDK — é uma restrição do próprio Spotify.
- **`/recommendations`, `/artists/{id}/related-artists` e
  `/browse/featured-playlists` foram descontinuados pelo Spotify
  (novembro/2024) para apps novos.** Por isso a rádio não usa o motor de
  recomendação "oficial" do Spotify — em vez disso, monta a seleção a partir
  de dados que o próprio usuário já possui (músicas salvas, artistas/álbuns
  seguidos, playlists, lançamentos recentes), que continuam disponíveis e são
  a alternativa oficialmente suportada.
- **URLs de preview de 30 segundos também foram descontinuadas** para apps
  novos — por isso não há fallback de "preview" quando falta Premium; a
  interface apenas explica a limitação.
- **Sem "anterior" nativo do Spotify.** Como a fila é gerenciada pelo próprio
  app (fora do contexto padrão do Spotify), o botão "Anterior" usa um
  histórico local de reprodução, não a API de fila do Spotify.
- **Logout não revoga o acesso no lado do Spotify.** O Spotify não oferece um
  endpoint público de revogação de token; "Desconectar" apaga só os tokens
  guardados no navegador. Para revogar de fato, o usuário remove o app em
  https://www.spotify.com/account/apps/.
- **Rate limits**: a Web API pode responder 429; o cliente já trata isso com
  espera automática (`Retry-After`).

## Segurança

- Não existe Client Secret em lugar nenhum deste projeto (fluxo PKCE).
- O `access_token` (curta duração) fica só em memória (estado do React).
- O `refresh_token` fica em `localStorage`, no navegador do próprio usuário —
  nunca é enviado a nenhum servidor além do Spotify.
- Preferências de rádio e histórico de reprodução também ficam só em
  `localStorage`.
- Senha do Spotify nunca passa por este app — o login é feito inteiramente na
  página oficial `accounts.spotify.com`.
