import * as esbuild from 'esbuild';
import { esbuildDecorators } from '@anatine/esbuild-decorators';

await esbuild.build({
  entryPoints: ['server/src/main.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile: 'dist/server-bundle.mjs',
  tsconfig: 'tsconfig.server.json',
  packages: 'external',
  plugins: [
    esbuildDecorators({
      tsconfig: './tsconfig.server.json',
    }),
  ],
  external: [],
});

console.log('✅ Server bundle created: dist/server-bundle.mjs');

