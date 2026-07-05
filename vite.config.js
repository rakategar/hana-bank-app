import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    host: true,
    // HMR melewati nginx (port 8080) — tanpa clientPort, WebSocket connect ke 5174
    // langsung dan gagal dari browser, memicu reconnect loop + full-reload.
    hmr: {
      clientPort: 8080,
      overlay: false,
    },
    // Matikan file polling — hanya pakai native FS events agar tidak ada false trigger
    watch: {
      usePolling: false,
    },
    proxy: {
      '/api/ai': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
      '/rest/v1': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      '/storage/v1': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
    },
  },
});
