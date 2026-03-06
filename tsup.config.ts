import { defineConfig } from 'tsup';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    target: 'node22',
    clean: true,
    banner: {
      js: '#!/usr/bin/env node',
    },
    define: {
      __PKG_VERSION__: JSON.stringify(version),
    },
  },
  {
    entry: { 'dashboard-client': 'src/commands/dashboard/client/index.tsx' },
    format: ['esm'],
    platform: 'browser',
    target: 'es2022',
    outDir: 'dist',
    noExternal: ['react', 'react-dom'],
    esbuildOptions(options) {
      options.jsx = 'automatic';
    },
    outExtension() {
      return { js: '.js' };
    },
  },
]);
