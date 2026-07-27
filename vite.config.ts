import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages project site serves from https://<user>.github.io/todo-board/,
// so all built asset URLs must be prefixed with the repo name.
export default defineConfig({
  base: '/todo-board/',
  plugins: [react()],
})
