import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // YouTube (Invidious) proxy — bypasses CORS
      '/api/invidious': {
        target: 'https://iv.ggtyler.dev',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/invidious/, '/api/v1'),
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            console.error('Invidious proxy error:', err.message);
            if (!res.headersSent) res.writeHead(502).end('Proxy error');
          });
        }
      },
      // YTS Movies proxy — bypasses CORS
      '/api/yts': {
        target: 'https://yts.torrentbay.st',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/yts/, '/api/v2'),
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            console.error('YTS proxy error:', err.message);
            if (!res.headersSent) res.writeHead(502).end('Proxy error');
          });
        }
      }
    }
  }
})

