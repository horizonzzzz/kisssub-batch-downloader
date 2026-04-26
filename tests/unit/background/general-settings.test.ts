import { beforeEach, describe, expect, it, vi } from "vitest"
import { fakeBrowser } from "wxt/testing/fake-browser"

import { DEFAULT_BATCH_EXECUTION_CONFIG } from "../../../src/lib/batch-config/defaults"
import { saveGeneralSettings } from "../../../src/lib/background/general-settings"
import { DEFAULT_DOWNLOADER_CONFIG } from "../../../src/lib/downloader/config/defaults"
import { DOWNLOADER_VALIDATION_STORAGE_KEY } from "../../../src/lib/downloader/validation"

vi.mock("../../../src/lib/shared/browser", () => ({
  getBrowser: () => fakeBrowser
}))

describe("background general settings save", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fakeBrowser.storage.local.clear()
  })

  it("validates active downloader and returns validation metadata with sanitized saves", async () => {
    const validatedAt = "2026-04-26T10:00:00.000Z"
    const testActiveDownloader = vi.fn().mockResolvedValue({
      version: "5.0.0"
    })

    const saved = await saveGeneralSettings({
      downloaderConfig: {
        activeId: "qbittorrent",
        profiles: {
          qbittorrent: {
            baseUrl: " http://127.0.0.1:17474/// ",
            username: " admin ",
            password: "secret"
          },
          transmission: DEFAULT_DOWNLOADER_CONFIG.profiles.transmission
        }
      },
      batchExecutionConfig: {
        concurrency: 99,
        retryCount: -1,
        injectTimeoutMs: 999999,
        domSettleMs: 1
      }
    }, {
      now: () => validatedAt,
      testActiveDownloader
    })

    expect(testActiveDownloader).toHaveBeenCalledWith({
      activeId: "qbittorrent",
      profiles: {
        qbittorrent: {
          baseUrl: "http://127.0.0.1:17474",
          username: "admin",
          password: "secret"
        },
        transmission: DEFAULT_DOWNLOADER_CONFIG.profiles.transmission
      }
    })

    expect(saved.downloaderConfig).toEqual({
      activeId: "qbittorrent",
      profiles: {
        qbittorrent: {
          baseUrl: "http://127.0.0.1:17474",
          username: "admin",
          password: "secret"
        },
        transmission: DEFAULT_DOWNLOADER_CONFIG.profiles.transmission
      }
    })
    expect(saved.batchExecutionConfig).toEqual({
      concurrency: 5,
      retryCount: 0,
      injectTimeoutMs: 60000,
      domSettleMs: 200
    })
    expect(saved.validation.downloaderId).toBe("qbittorrent")
    expect(saved.validation.reusedExisting).toBe(false)
    expect(saved.validation.validatedAt).toBe(validatedAt)
    expect(saved.validation.version).toBe("5.0.0")
    expect(saved.validation.configFingerprint).toMatch(/^[a-f0-9]{64}$/)
    expect(saved.validation.configFingerprint).not.toContain("secret")

    const stored = await fakeBrowser.storage.local.get([
      "downloader_config",
      "batch_execution_config",
      DOWNLOADER_VALIDATION_STORAGE_KEY
    ])

    expect(stored.downloader_config).toEqual(saved.downloaderConfig)
    expect(stored.batch_execution_config).toEqual(saved.batchExecutionConfig)
    expect(stored[DOWNLOADER_VALIDATION_STORAGE_KEY]).toEqual({
      qbittorrent: {
        configFingerprint: saved.validation.configFingerprint,
        validatedAt,
        version: "5.0.0"
      }
    })
  })

  it("reuses an existing matching validation snapshot without re-testing connection", async () => {
    const initialValidatedAt = "2026-04-26T10:00:00.000Z"
    const reusedAttemptValidatedAt = "2026-04-26T11:00:00.000Z"
    const initialTest = vi.fn().mockResolvedValue({
      version: "5.0.0"
    })

    const firstSave = await saveGeneralSettings({
      downloaderConfig: DEFAULT_DOWNLOADER_CONFIG,
      batchExecutionConfig: DEFAULT_BATCH_EXECUTION_CONFIG
    }, {
      now: () => initialValidatedAt,
      testActiveDownloader: initialTest
    })

    const reusedTest = vi.fn().mockResolvedValue({
      version: "6.0.0"
    })

    const secondSave = await saveGeneralSettings({
      downloaderConfig: DEFAULT_DOWNLOADER_CONFIG,
      batchExecutionConfig: {
        ...DEFAULT_BATCH_EXECUTION_CONFIG,
        concurrency: 4
      }
    }, {
      now: () => reusedAttemptValidatedAt,
      testActiveDownloader: reusedTest
    })

    expect(initialTest).toHaveBeenCalledTimes(1)
    expect(reusedTest).not.toHaveBeenCalled()
    expect(secondSave.validation).toEqual({
      downloaderId: "qbittorrent",
      reusedExisting: true,
      configFingerprint: firstSave.validation.configFingerprint,
      validatedAt: initialValidatedAt,
      version: "5.0.0"
    })
  })

  it("does not update either storage key when active downloader validation fails", async () => {
    const existingValidation = {
      qbittorrent: {
        configFingerprint: "existing-fingerprint",
        validatedAt: "2026-04-25T00:00:00.000Z",
        version: "4.6.1"
      }
    }

    await fakeBrowser.storage.local.set({
      downloader_config: DEFAULT_DOWNLOADER_CONFIG,
      batch_execution_config: DEFAULT_BATCH_EXECUTION_CONFIG,
      [DOWNLOADER_VALIDATION_STORAGE_KEY]: existingValidation
    })

    await expect(
      saveGeneralSettings({
        downloaderConfig: {
          ...DEFAULT_DOWNLOADER_CONFIG,
          profiles: {
            ...DEFAULT_DOWNLOADER_CONFIG.profiles,
            qbittorrent: {
              ...DEFAULT_DOWNLOADER_CONFIG.profiles.qbittorrent,
              baseUrl: "http://127.0.0.1:18474"
            }
          }
        },
        batchExecutionConfig: {
          concurrency: 5,
          retryCount: 4,
          injectTimeoutMs: 25000,
          domSettleMs: 900
        }
      }, {
        testActiveDownloader: vi.fn().mockRejectedValue(new Error("Connection failed"))
      })
    ).rejects.toThrow("无法连接到当前下载器，请检查地址、端口和服务状态，未保存任何设置。")

    const stored = await fakeBrowser.storage.local.get([
      "downloader_config",
      "batch_execution_config",
      DOWNLOADER_VALIDATION_STORAGE_KEY
    ])

    expect(stored).toEqual({
      downloader_config: DEFAULT_DOWNLOADER_CONFIG,
      batch_execution_config: DEFAULT_BATCH_EXECUTION_CONFIG,
      [DOWNLOADER_VALIDATION_STORAGE_KEY]: existingValidation
    })
  })

  it("does not leave validation metadata behind when the combined settings write fails", async () => {
    const originalSet = fakeBrowser.storage.local.set.bind(fakeBrowser.storage.local)
    let setCallCount = 0

    vi.spyOn(fakeBrowser.storage.local, "set").mockImplementation(async (items: Record<string, unknown>) => {
      setCallCount += 1
      if (setCallCount === 1) {
        throw new Error("storage write failed")
      }

      await originalSet(items)
    })

    await expect(
      saveGeneralSettings({
        downloaderConfig: DEFAULT_DOWNLOADER_CONFIG,
        batchExecutionConfig: DEFAULT_BATCH_EXECUTION_CONFIG
      }, {
        now: () => "2026-04-26T10:00:00.000Z",
        testActiveDownloader: vi.fn().mockResolvedValue({
          version: "5.0.0"
        })
      })
    ).rejects.toThrow("storage write failed")

    const stored = await fakeBrowser.storage.local.get([
      "downloader_config",
      "batch_execution_config",
      DOWNLOADER_VALIDATION_STORAGE_KEY
    ])

    expect(stored).toEqual({
      downloader_config: undefined,
      batch_execution_config: undefined,
      [DOWNLOADER_VALIDATION_STORAGE_KEY]: undefined
    })
  })

  it("maps downloader authentication failures to a save-specific error message", async () => {
    await expect(
      saveGeneralSettings({
        downloaderConfig: DEFAULT_DOWNLOADER_CONFIG,
        batchExecutionConfig: DEFAULT_BATCH_EXECUTION_CONFIG
      }, {
        testActiveDownloader: vi.fn().mockRejectedValue(
          new Error("qBittorrent login failed with HTTP 401 at http://127.0.0.1:17474.")
        )
      })
    ).rejects.toThrow("已连接到下载器，但身份验证失败。请检查用户名或密码，未保存任何设置。")
  })

  it("maps downloader permission failures to a save-specific error message", async () => {
    await expect(
      saveGeneralSettings({
        downloaderConfig: DEFAULT_DOWNLOADER_CONFIG,
        batchExecutionConfig: DEFAULT_BATCH_EXECUTION_CONFIG
      }, {
        testActiveDownloader: vi.fn().mockRejectedValue(
          new Error("扩展缺少访问 qBittorrent（http://127.0.0.1:17474）的权限。")
        )
      })
    ).rejects.toThrow("未获得当前下载器地址的访问权限，未保存任何设置。")
  })
})
