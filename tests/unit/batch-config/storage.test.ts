import { describe, expect, it, vi, beforeEach } from "vitest"
import { fakeBrowser } from "wxt/testing/fake-browser"

import { DEFAULT_BATCH_EXECUTION_CONFIG } from "../../../src/lib/batch-config/defaults"
import {
  getBatchExecutionConfig,
  saveBatchExecutionConfig
} from "../../../src/lib/batch-config/storage"

vi.mock("../../../src/lib/shared/browser", () => ({
  getBrowser: () => fakeBrowser
}))

describe("batch execution config storage", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    fakeBrowser.storage.local.clear()
  })

  it("hydrates default execution config", async () => {
    await expect(getBatchExecutionConfig()).resolves.toEqual(DEFAULT_BATCH_EXECUTION_CONFIG)
  })

  it("keeps the existing execution defaults", async () => {
    expect(DEFAULT_BATCH_EXECUTION_CONFIG).toEqual({
      concurrency: 3,
      retryCount: 3,
      injectTimeoutMs: 15000,
      domSettleMs: 1200
    })
  })

  it("clamps numeric execution values to the existing bounds when saving", async () => {
    const saved = await saveBatchExecutionConfig({
      concurrency: 99,
      retryCount: -1,
      injectTimeoutMs: 999999,
      domSettleMs: 1
    })

    expect(saved).toEqual({
      concurrency: 5,
      retryCount: 0,
      injectTimeoutMs: 60000,
      domSettleMs: 200
    })
  })

  it("preserves values inside the pre-refactor execution bounds", async () => {
    const saved = await saveBatchExecutionConfig({
      concurrency: 4,
      retryCount: 8,
      injectTimeoutMs: 4000,
      domSettleMs: 8000
    })

    expect(saved).toEqual({
      concurrency: 4,
      retryCount: 5,
      injectTimeoutMs: 4000,
      domSettleMs: 8000
    })
  })

  it("persists execution config changes to dedicated storage key", async () => {
    const saved = await saveBatchExecutionConfig({
      concurrency: 2,
      retryCount: 1,
      injectTimeoutMs: 20000,
      domSettleMs: 500
    })

    expect(saved.concurrency).toBe(2)
    expect(saved.retryCount).toBe(1)
    expect(saved.injectTimeoutMs).toBe(20000)
    expect(saved.domSettleMs).toBe(500)

    const stored = await fakeBrowser.storage.local.get("batch_execution_config")
    expect(stored.batch_execution_config).toEqual(saved)

    // Re-read to verify persistence
    const reRead = await getBatchExecutionConfig()
    expect(reRead).toEqual(saved)
  })

  it("ignores legacy app_settings execution fields and hydrates defaults", async () => {
    await fakeBrowser.storage.local.set({
      app_settings: {
        concurrency: 5,
        injectTimeoutMs: 30000,
        domSettleMs: 2000,
        retryCount: 2
      }
    })

    const config = await getBatchExecutionConfig()

    expect(config).toEqual(DEFAULT_BATCH_EXECUTION_CONFIG)

    const stored = await fakeBrowser.storage.local.get("batch_execution_config")
    expect(stored.batch_execution_config).toEqual(config)
  })

  it("uses batch_execution_config directly when it exists, ignoring legacy app_settings", async () => {
    // Set up both batch_execution_config and legacy app_settings
    await fakeBrowser.storage.local.set({
      batch_execution_config: {
        concurrency: 1,
        retryCount: 0,
        injectTimeoutMs: 10000,
        domSettleMs: 300
      },
      app_settings: {
        concurrency: 5, // Should be ignored
        retryCount: 10, // Should be ignored
        injectTimeoutMs: 60000, // Should be ignored
        domSettleMs: 5000 // Should be ignored
      }
    })

    const config = await getBatchExecutionConfig()

    // Should use batch_execution_config values, not legacy
    expect(config.concurrency).toBe(1)
    expect(config.retryCount).toBe(0)
    expect(config.injectTimeoutMs).toBe(10000)
    expect(config.domSettleMs).toBe(300)
  })

  it("still hydrates defaults when only legacy app_settings is present", async () => {
    await fakeBrowser.storage.local.set({
      app_settings: {
        concurrency: 4
      }
    })

    const config = await getBatchExecutionConfig()

    expect(config).toEqual(DEFAULT_BATCH_EXECUTION_CONFIG)
  })
})
