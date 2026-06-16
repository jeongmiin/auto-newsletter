import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import type { UserConfig } from 'vite'
import viteConfig from './vite.config'

const resolvedViteConfig: UserConfig = typeof viteConfig === 'function'
  ? viteConfig({
    command: 'serve',
    mode: 'test',
    isSsrBuild: false,
    isPreview: false,
  }) as UserConfig
  : viteConfig as UserConfig

export default mergeConfig(
  resolvedViteConfig,
  defineConfig({
    test: {
      environment: 'happy-dom',
      exclude: [...configDefaults.exclude, 'e2e/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html', 'lcov'],
        exclude: [
          'node_modules/**',
          'dist/**',
          '**/*.config.ts',
          '**/*.d.ts',
          '**/types/**',
          '**/*.spec.ts',
          '**/*.test.ts',
        ],
      },
      globals: true,
    },
  }),
)
