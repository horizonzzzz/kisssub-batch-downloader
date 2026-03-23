import { describe, expect, it } from "vitest"

import { DEFAULT_SETTINGS, sanitizeSettings } from "../../lib/settings"

describe("sanitizeSettings", () => {
  it("uses 7474 as the default qB WebUI address", () => {
    expect(sanitizeSettings({})).toMatchObject({
      qbBaseUrl: "http://127.0.0.1:7474"
    })
  })

  it("uses defaults and normalizes the base url", () => {
    expect(
      sanitizeSettings({
        qbBaseUrl: " http://127.0.0.1:17474/// ",
        qbUsername: " admin ",
        qbPassword: "123456"
      })
    ).toEqual({
      ...DEFAULT_SETTINGS,
      qbBaseUrl: "http://127.0.0.1:17474",
      qbUsername: "admin",
      qbPassword: "123456"
    })
  })

  it("normalizes per-source delivery modes and falls back to source defaults", () => {
    expect(
      sanitizeSettings({
        sourceDeliveryModes: {
          kisssub: "torrent-file",
          dongmanhuayuan: "torrent-file",
          acgrip: "magnet"
        }
      })
    ).toMatchObject({
      sourceDeliveryModes: {
        kisssub: "torrent-file",
        dongmanhuayuan: "magnet",
        acgrip: "torrent-file"
      }
    })
  })

  it("clamps numeric settings to the existing limits", () => {
    expect(
      sanitizeSettings({
        concurrency: 99,
        injectTimeoutMs: 1,
        domSettleMs: 99999,
        retryCount: -5
      })
    ).toMatchObject({
      concurrency: 3,
      injectTimeoutMs: 3000,
      domSettleMs: 10000,
      retryCount: 0
    })
  })

  it("normalizes and keeps the last used save path", () => {
    expect(
      sanitizeSettings({
        lastSavePath: "  D:\\Downloads\\Anime  "
      })
    ).toMatchObject({
      lastSavePath: "D:\\Downloads\\Anime"
    })
  })
})
