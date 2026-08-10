
  import { defineConfig } from 'vitest/config';
  import react from '@vitejs/plugin-react-swc';
  import path from 'path';

  export default defineConfig({
    plugins: [react()],
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    test: {
      environment: 'node',
      setupFiles: ['./src/test/setup.ts'],
      coverage: {
        provider: 'v8',
        include: ['src/**'],
        exclude: ['src/**/*.test.*', 'src/vite-env.d.ts'],
      },
    },
    build: {
      target: 'esnext',
      outDir: 'build',
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            // maplibre-gl n'est PAS regroupé ici : le forcer dans un chunk
            // nommé le rend "partagé" aux yeux de Rollup, qui ajoute alors un
            // import statique de ce chunk dans TOUTES les routes (y compris
            // Login/Profile/Settings) au lieu de le garder privé à MapView,
            // seule route qui l'utilise réellement via un import() dynamique.
            if (!id.includes('node_modules')) {
              return;
            }

            if (id.includes('@supabase/supabase-js')) {
              return 'vendor-supabase';
            }
          },
        },
      },
    },
    server: {
      port: 3000,
      open: true,
    },
  });