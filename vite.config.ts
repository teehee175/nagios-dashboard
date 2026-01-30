import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    // Base path for production - served at /nagios/warboard
    base: '/nagios/warboard/',
    server: {
      host: env.VITE_APP_HOST || 'localhost',
      port: parseInt(env.VITE_APP_PORT || '5173'),
      proxy: {
        '/nagios': {
          target: env.VITE_NAGIOS_BASE_URL?.replace('/nagios', '') || 'http://neo',
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (env.VITE_NAGIOS_AUTH) {
                proxyReq.setHeader('Authorization', `Basic ${env.VITE_NAGIOS_AUTH}`);
              }
            });
          },
        },
      },
    },
  }
})
