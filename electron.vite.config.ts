import { resolve } from 'node:path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const shared = resolve(__dirname, 'src/shared');
const layers = {
  '@shared': shared,
  '@application': resolve(__dirname, 'src/application'),
  '@infrastructure': resolve(__dirname, 'src/infrastructure'),
};

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: ['zod'] })],
    resolve: { alias: layers },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias: { '@shared': shared } },
  },
  renderer: {
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@shared': shared, '@': resolve(__dirname, 'src/renderer') } },
  },
});
