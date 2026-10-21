import { defineConfig } from 'vitest/config'

// Rules tests need the Firestore emulator: run `npm run test:rules` from the project root.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rules/**/*.test.ts'],
    testTimeout: 20_000,
    fileParallelism: false,
  },
})
