import { z } from "zod"

const clampConcurrency = z
  .number()
  .int()
  .transform((value) => Math.max(1, Math.min(5, value)))

const clampRetryCount = z
  .number()
  .int()
  .transform((value) => Math.max(0, Math.min(10, value)))

const clampInjectTimeoutMs = z
  .number()
  .int()
  .transform((value) => Math.max(5000, Math.min(60000, value)))

const clampDomSettleMs = z
  .number()
  .int()
  .transform((value) => Math.max(200, Math.min(5000, value)))

export const batchExecutionConfigSchema = z.object({
  concurrency: clampConcurrency,
  retryCount: clampRetryCount,
  injectTimeoutMs: clampInjectTimeoutMs,
  domSettleMs: clampDomSettleMs
})

export type BatchExecutionConfig = z.infer<typeof batchExecutionConfigSchema>