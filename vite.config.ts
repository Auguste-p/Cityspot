
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
    },
    build: {
      target: 'esnext',
      outDir: 'build',
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) {
              return;
            }

            if (id.includes('maplibre-gl')) {
              return 'vendor-map';
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