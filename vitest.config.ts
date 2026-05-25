import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'node',
    globals: false,
    include: ['app/**/*.test.ts', 'hooks/**/*.test.ts', 'lib/**/*.test.ts', 'tests/**/*.test.ts'],
    clearMocks: true,
  },
})
