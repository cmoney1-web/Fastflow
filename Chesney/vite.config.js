import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Requests from React to /api go to the Express server on port 3000.
  server: { proxy: { '/api': 'http://127.0.0.1:3000' } },
});
