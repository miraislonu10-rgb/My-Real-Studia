import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Configuracion del servidor de desarrollo de Vite.
// El cliente React corre en el puerto 5173 y consume la API en el 4000
// a traves de VITE_API_URL (ver .env.example).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    open: false,
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
