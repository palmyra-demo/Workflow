import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));
const externalPackages = [...Object.keys(pkg.dependencies), ...Object.keys(pkg.peerDependencies)];

const isExternal = (id: string) =>
  !id.endsWith('.css') &&
  (externalPackages.some((name) => id === name || id.startsWith(`${name}/`)) || id === 'react/jsx-runtime');

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: 'src/lib.ts',
      formats: ['es', 'cjs'],
      fileName: (format) => `workflow-editor.${format === 'es' ? 'js' : 'cjs'}`,
    },
    cssCodeSplit: false,
    rollupOptions: { external: isExternal },
  },
});
