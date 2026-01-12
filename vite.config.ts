
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
    // تحميل متغيرات البيئة من النظام (مهم للعمل على Vercel)
    const env = loadEnv(mode, process.cwd(), '');
    
    // محاولة الحصول على المفتاح من عدة مصادر محتملة في Vercel
    const apiKey = env.GEMINI_API_KEY || env.API_KEY || '';

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        // حقن المفتاح ليكون متاحاً في كود المتصفح عبر process.env.API_KEY
        'process.env.API_KEY': JSON.stringify(apiKey),
        'process.env.GEMINI_API_KEY': JSON.stringify(apiKey)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        outDir: 'dist',
        sourcemap: false,
        rollupOptions: {
          output: {
            manualChunks: {
              leaflet: ['leaflet', 'react-leaflet', '@geoman-io/leaflet-geoman-free'],
            },
          },
        },
      }
    };
});
