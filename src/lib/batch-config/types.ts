import { z } from "zod"

export const batchExecutionConfigSchema = z.object({
  concurrency: z.number().int().min(1).max(5),
  retryCount: z.number().int().min(0).max(10),
  injectTimeoutMs: z.number().int().min(5000).max(60000),
  domSettleMs: z.number().int().min(200).max(5000)
})

export type BatchExecutionConfig = z.infer<typeof batchExecutionConfigSchema>