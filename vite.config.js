import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // GitHub Pages serve projetos em /<nome-do-repo>/. Se renomear o repositório,
  // atualize este valor para bater com o novo nome.
  base: '/Create-Radio/',
  server: {
    port: 5173,
  },
})
