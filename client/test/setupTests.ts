// Import Temporal polyfill for Node.js environment
import { Temporal } from '@js-temporal/polyfill'

// Make Temporal available globally for tests
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
(global as any).Temporal = Temporal

// Also make it available for ES modules
if (typeof globalThis !== 'undefined') {
  // @ts-expect-error Temporal is expected to exist in tests
  (globalThis as unknown).Temporal = Temporal
}
