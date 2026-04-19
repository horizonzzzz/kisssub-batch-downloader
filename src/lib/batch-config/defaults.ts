import type { BatchExecutionConfig } from "./types"

export const DEFAULT_BATCH_EXECUTION_CONFIG: BatchExecutionConfig = Object.freeze({
  concurrency: 3,
  retryCount: 3,
  injectTimeoutMs: 15000,
  domSettleMs: 1200
})