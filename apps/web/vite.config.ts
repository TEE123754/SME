import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

export default defineConfig(({ mode }) => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const env = { ...loadEnv(mode, root, ''), ...process.env };
  const webPort = Number(env.WEB_PORT ?? 5173);
  const apiPort = Number(env.API_PORT ?? 3001);
  if (
    ![webPort, apiPort].every((port) => Number.isInteger(port) && port >= 1024 && port <= 65535)
  ) {
    throw new Error('WEB_PORT and API_PORT must be valid local ports');
  }
  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: '127.0.0.1',
      port: webPort,
      strictPort: true,
      proxy: { '/api': `http://127.0.0.1:${apiPort}` },
      fs: { allow: [root], deny: ['**/.env*', '**/.local/**', '**/.git/**'] },
    },
    preview: { host: '127.0.0.1', port: webPort, strictPort: true },
  };
});
