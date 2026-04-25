import { describe, expect, it, vi, beforeEach } from "vitest"
import { fakeBrowser } from "wxt/testing/fake-browser"

import { DEFAULT_SOURCE_CONFIG } from "../../../src/lib/sources/config/defaults"
import {
  getSourceConfig,
  saveSourceConfig
} from "../../../src/lib/sources/config/storage"

vi.mock("../../../src/lib/shared/browser", () => ({
  getBrowser: () => fakeBrowser
}))

describe("source config storage", () => {
  beforeEach(() => {
    fakeBrowser.storage.local.clear()
  })

  it("hydrates default per-source config when storage is empty", async () => {
    const config = await getSourceConfig()

    expect(config).toEqual(DEFAULT_SOURCE_CONFIG)
    expect(config.kisssub.enabled).toBe(true)
    expect(config.kisssub.deliveryMode).toBe("magnet")
    expect(config.kisssub).toEqual({
      enabled: true,
      deliveryMode: "magnet"
    })
    expect(config.kisssub).not.toHaveProperty("script")
    expect(config.dongmanhuayuan.enabled).toBe(true)
    expect(config.dongmanhuayuan.deliveryMode).toBe("magnet")
    expect(config.acgrip.enabled).toBe(true)
    expect(config.acgrip.deliveryMode).toBe("torrent-file")
    expect(config.bangumimoe.enabled).toBe(true)
    expect(config.bangumimoe.deliveryMode).toBe("magnet")
  })

  it("drops legacy kisssub script fields during sanitization", async () => {
    await fakeBrowser.storage.local.set({
      source_config: {
        kisssub: {
          enabled: false,
          deliveryMode: "torrent-file",
          script: {
            url: "https://mirror.example.com/helpers/kisssub-helper.js",
            revision: "custom-rev"
          }
        },
        dongmanhuayuan: {
          enabled: true,
          deliveryMode: "magnet"
        },
        acgrip: {
          enabled: true,
          deliveryMode: "torrent-file"
        },
        bangumimoe: {
          enabled: true,
          deliveryMode: "magnet"
        },
        comicat: {
          enabled: true,
          deliveryMode: "magnet"
        }
      }
    })

    const config = await getSourceConfig()

    expect(config.kisssub).toEqual({
      enabled: false,
      deliveryMode: "torrent-file"
    })
    expect(config.kisssub).not.toHaveProperty("script")
  })

  it("persists source enablement changes under dedicated source config storage", async () => {
    const saved = await saveSourceConfig({
      ...DEFAULT_SOURCE_CONFIG,
      acgrip: {
        ...DEFAULT_SOURCE_CONFIG.acgrip,
        enabled: false
      }
    })

    expect(saved.acgrip.enabled).toBe(false)

    const reloaded = await getSourceConfig()
    expect(reloaded.acgrip.enabled).toBe(false)
  })

  it("persists delivery mode changes for each source", async () => {
    const saved = await saveSourceConfig({
      ...DEFAULT_SOURCE_CONFIG,
      kisssub: {
        ...DEFAULT_SOURCE_CONFIG.kisssub,
        deliveryMode: "torrent-file"
      },
      bangumimoe: {
        ...DEFAULT_SOURCE_CONFIG.bangumimoe,
        deliveryMode: "torrent-url"
      }
    })

    expect(saved.kisssub.deliveryMode).toBe("torrent-file")
    expect(saved.bangumimoe.deliveryMode).toBe("torrent-url")
  })

  it("uses source_config directly when it exists", async () => {
    await fakeBrowser.storage.local.set({
      source_config: {
        kisssub: {
          enabled: false,
          deliveryMode: "torrent-file"
        },
        dongmanhuayuan: {
          enabled: false,
          deliveryMode: "magnet"
        },
        acgrip: {
          enabled: true,
          deliveryMode: "torrent-file"
        },
        bangumimoe: {
          enabled: false,
          deliveryMode: "magnet"
        },
        comicat: {
          enabled: true,
          deliveryMode: "magnet"
        }
      }
    })

    const config = await getSourceConfig()

    expect(config.kisssub).toEqual({
      enabled: false,
      deliveryMode: "torrent-file"
    })
  })
})
