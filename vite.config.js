import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `base` controls the prefix Vite stamps on asset URLs in the built
// index.html. Resolution priority:
//   1. VITE_BASE_PATH env var (set by the GitHub Actions workflow to
//      `/<repo-name>/`) — gives absolute URLs that survive being loaded
//      with or without a trailing slash.
//   2. './' — relative URLs, fine for `npm run dev` and for any host
//      that always serves the index from a directory URL.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || './',
  server: { port: 5173 },
});
