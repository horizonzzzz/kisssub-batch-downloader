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

  it("ignores legacy app_settings and hydrates default source config", async () => {
    await fakeBrowser.storage.local.set({
      app_settings: {
        enabledSources: {
          kisssub: false,
          dongmanhuayuan: true,
          acgrip: false,
          bangumimoe: true
        },
        sourceDeliveryModes: {
          kisssub: "torrent-file",
          acgrip: "torrent-url"
        },
        // URL must match acgscript pattern: //{prefix}.acgscript.com/script/{path}/{file}.js?{version}
        remoteScriptUrl: "//custom.acgscript.com/script/miobt/test.js?20260419",
        remoteScriptRevision: "custom-rev"
      }
    })

    const config = await getSourceConfig()

    expect(config).toEqual(DEFAULT_SOURCE_CONFIG)

    const stored = await fakeBrowser.storage.local.get("source_config")
    expect(stored.source_config).toEqual(config)
  })

  it("uses source_config directly when it exists, ignoring legacy app_settings", async () => {
    // Set up both source_config and legacy app_settings
    await fakeBrowser.storage.local.set({
      source_config: {
        kisssub: {
          enabled: false,
          deliveryMode: "torrent-file",
          script: {
            // URL must match acgscript pattern
            url: "//new.acgscript.com/script/miobt/new.js?20260419",
            revision: "new-rev"
          }
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
        }
      },
      app_settings: {
        enabledSources: {
          kisssub: true // Should be ignored
        },
        sourceDeliveryModes: {
          kisssub: "magnet" // Should be ignored
        },
        remoteScriptUrl: "//old.acgscript.com/script/miobt/old.js?20180101", // Should be ignored
        remoteScriptRevision: "old-rev" // Should be ignored
      }
    })

    const config = await getSourceConfig()

    // Should use source_config values, not legacy
    expect(config.kisssub.enabled).toBe(false)
    expect(config.kisssub.deliveryMode).toBe("torrent-file")
    expect(config.kisssub.script.url).toBe("//new.acgscript.com/script/miobt/new.js?20260419")
    expect(config.kisssub.script.revision).toBe("new-rev")
  })

  it("still hydrates defaults when only legacy app_settings is present", async () => {
    await fakeBrowser.storage.local.set({
      app_settings: {
        enabledSources: {
          kisssub: false
        }
      }
    })

    const config = await getSourceConfig()

    expect(config).toEqual(DEFAULT_SOURCE_CONFIG)
  })
})
