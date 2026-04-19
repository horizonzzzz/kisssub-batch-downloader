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
    expect(config.kisssub.script.url).toBe("//1.acgscript.com/script/miobt/4.js?3")
    expect(config.kisssub.script.revision).toBe("20181120.2")
    expect(config.dongmanhuayuan.enabled).toBe(true)
    expect(config.dongmanhuayuan.deliveryMode).toBe("magnet")
    expect(config.acgrip.enabled).toBe(true)
    expect(config.acgrip.deliveryMode).toBe("torrent-file")
    expect(config.bangumimoe.enabled).toBe(true)
    expect(config.bangumimoe.deliveryMode).toBe("magnet")
  })

  it("persists kisssub script fields inside source config", async () => {
    const saved = await saveSourceConfig({
      ...DEFAULT_SOURCE_CONFIG,
      kisssub: {
        ...DEFAULT_SOURCE_CONFIG.kisssub,
        script: {
          url: "//1.acgscript.com/script/miobt/4.js?3",
          revision: "20260418.1"
        }
      }
    })

    expect(saved.kisssub.script.revision).toBe("20260418.1")

    const reloaded = await getSourceConfig()
    expect(reloaded.kisssub.script.revision).toBe("20260418.1")
  })

  it("persists source enablement changes independently of app settings", async () => {
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
})