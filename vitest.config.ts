import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@': dirname,
      'server-only': path.join(dirname, 'test/server-only.ts'),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['{lib,app,components,sanity,scripts}/**/*.test.{ts,tsx}'],
          env: { AI_MOCK: '1', CONTENT_MOCK: '1' },
        },
      },
    ],
  },
})
