import { defineConfig } from 'vitest/config';
import path from 'path';
import ts from 'typescript';


const serverDecoratorTransformPlugin = () => ({
  name: 'vitest-server-decorator-transform',
  enforce: 'pre' as const,
  transform(code: string, id: string) {
    const filePath = id.split('?')[0];
    if (!filePath.endsWith('.ts') || !filePath.includes('/server/src/')) return null;
    const result = ts.transpileModule(code, {
      fileName: filePath,
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2021,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        esModuleInterop: true,
        sourceMap: true,
      },
    });
    return {
      code: result.outputText,
      map: result.sourceMapText ? JSON.parse(result.sourceMapText) : null,
    };
  },
});

export default defineConfig({
  plugins: [serverDecoratorTransformPlugin()],
  oxc: false,
  esbuild: {
    tsconfigRaw: {
      compilerOptions: {
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'node',
    env: {
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db',
    },
    include: ['**/*.spec.ts', '**/*.spec.tsx', '**/*.test.ts', '**/*.test.tsx'],
    exclude: [
      'node_modules',
      'dist',
      '.next',
      'tests/e2e/**',
      'tests/e2e/e2e/**',
      'tests/e2e/api/**',
      'tests/e2e/frontend/**',
      'tests/e2e/backend/**',
      'server/src/common/database/__tests__/**',
      'playwright-report/**',
      'test-results/**',
    ],
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '.next/',
        '**/*.spec.ts',
        '**/index.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@shared': path.resolve(__dirname, './shared'),
      '@/components': path.resolve(__dirname, './components'),
      '@/lib': path.resolve(__dirname, './lib'),
      '@/hooks': path.resolve(__dirname, './hooks'),
      '@/app': path.resolve(__dirname, './app'),
      '@server': path.resolve(__dirname, './server'),
    },
  },
});
