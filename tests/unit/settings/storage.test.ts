import { beforeEach, describe, expect, it, vi } from "vitest"

import { DEFAULT_SETTINGS } from "../../../lib/settings/defaults"
import { ensureSettings, getSettings, saveSettings } from "../../../lib/settings/storage"

type StoredState = {
  values: Record<string, unknown>
}

function installChromeStorageMock(state: StoredState) {
  const get = vi.fn(async (keys?: string | string[]) => {
    if (typeof keys === "string") {
      return {
        [keys]: state.values[keys]
      }
    }

    if (Array.isArray(keys)) {
      return Object.fromEntries(keys.map((key) => [key, state.values[key]]))
    }

    return { ...state.values }
  })
  const set = vi.fn(async (value: Record<string, unknown>) => {
    Object.assign(state.values, value)
  })

  Object.defineProperty(globalThis, "chrome", {
    configurable: true,
    value: {
      storage: {
        local: {
          get,
          set
        }
      }
    }
  })

  return { get, set }
}

describe("settings storage helpers", () => {
  let state: StoredState
  let storage: ReturnType<typeof installChromeStorageMock>

  beforeEach(() => {
    vi.clearAllMocks()
    state = {
      values: {}
    }
    storage = installChromeStorageMock(state)
  })

  it("writes default settings when storage is empty", async () => {
    await ensureSettings()

    expect(storage.set).toHaveBeenCalledWith({
      settings_v2: DEFAULT_SETTINGS
    })
    expect(state.values.settings_v2).toEqual(DEFAULT_SETTINGS)
  })

  it("does not overwrite existing settings during ensureSettings", async () => {
    state.values.settings_v2 = {
      currentDownloaderId: "qbittorrent"
    }

    await ensureSettings()

    expect(storage.set).not.toHaveBeenCalled()
  })

  it("initializes the new storage key even when the legacy key still exists", async () => {
    state.values.settings = {
      currentDownloaderId: "qbittorrent"
    }

    await ensureSettings()

    expect(storage.set).toHaveBeenCalledWith({
      settings_v2: DEFAULT_SETTINGS
    })
    expect(state.values.settings).toEqual({
      currentDownloaderId: "qbittorrent"
    })
    expect(state.values.settings_v2).toEqual(DEFAULT_SETTINGS)
  })

  it("hydrates missing defaults and sanitizes stored values when reading settings", async () => {
    state.values.settings_v2 = {
      currentDownloaderId: "qbittorrent",
      downloaders: {
        qbittorrent: {
          baseUrl: " http://127.0.0.1:17474/// ",
          username: " admin "
        }
      },
      lastSavePath: "  D:\\Anime  ",
      enabledSources: {
        kisssub: false
      }
    }

    await expect(getSettings()).resolves.toEqual({
      ...DEFAULT_SETTINGS,
      downloaders: {
        ...DEFAULT_SETTINGS.downloaders,
        qbittorrent: {
          baseUrl: "http://127.0.0.1:17474",
          username: "admin",
          password: ""
        }
      },
      lastSavePath: "D:\\Anime",
      filters: [],
      enabledSources: {
        kisssub: false,
        dongmanhuayuan: true,
        acgrip: true,
        bangumimoe: true
      }
    })

    expect(storage.set).not.toHaveBeenCalled()
  })

  it("ignores the legacy storage key when reading settings", async () => {
    state.values.settings = {
      currentDownloaderId: "qbittorrent",
      downloaders: {
        qbittorrent: {
          baseUrl: "http://legacy-host:9090",
          username: "legacy-user"
        }
      }
    }
    state.values.settings_v2 = {
      currentDownloaderId: "qbittorrent",
      downloaders: {
        qbittorrent: {
          baseUrl: " http://127.0.0.1:17474/// ",
          username: " admin "
        }
      }
    }

    await expect(getSettings()).resolves.toEqual({
      ...DEFAULT_SETTINGS,
      downloaders: {
        ...DEFAULT_SETTINGS.downloaders,
        qbittorrent: {
          baseUrl: "http://127.0.0.1:17474",
          username: "admin",
          password: ""
        }
      },
    })
  })

  it("hydrates transmission defaults when reading older qb-only settings", async () => {
    state.values.settings_v2 = {
      currentDownloaderId: "qbittorrent",
      downloaders: {
        qbittorrent: {
          baseUrl: " http://127.0.0.1:17474/// ",
          username: " admin "
        }
      }
    }

    await expect(getSettings()).resolves.toEqual({
      ...DEFAULT_SETTINGS,
      downloaders: {
        qbittorrent: {
          baseUrl: "http://127.0.0.1:17474",
          username: "admin",
          password: ""
        },
        transmission: DEFAULT_SETTINGS.downloaders.transmission
      }
    })
  })

  it("merges partial updates into the sanitized stored settings before persisting", async () => {
    state.values.settings_v2 = {
      currentDownloaderId: "qbittorrent",
      downloaders: {
        qbittorrent: {
          baseUrl: " http://127.0.0.1:7474/// ",
          username: " admin "
        }
      },
      enabledSources: {
        kisssub: false
      }
    }

    await expect(
      saveSettings({
        downloaders: {
          qbittorrent: {
            baseUrl: " http://127.0.0.1:17474/// "
          }
        },
        lastSavePath: "  D:\\Downloads\\Anime  ",
        enabledSources: {
          acgrip: false
        },
        filters: [
          {
            id: " filter-1 ",
            name: " Bangumi 1080 ",
            enabled: true,
            must: [
              {
                id: " condition-1 ",
                field: "source",
                operator: "is",
                value: "bangumimoe"
              }
            ],
            any: [
              {
                id: " condition-2 ",
                field: "title",
                operator: "contains",
                value: " 1080p "
              }
            ]
          }
        ]
      })
    ).resolves.toEqual({
      ...DEFAULT_SETTINGS,
      downloaders: {
        ...DEFAULT_SETTINGS.downloaders,
        qbittorrent: {
          baseUrl: "http://127.0.0.1:17474",
          username: "admin",
          password: ""
        }
      },
      lastSavePath: "D:\\Downloads\\Anime",
      filters: [
        {
          id: "filter-1",
          name: "Bangumi 1080",
          enabled: true,
          must: [
            {
              id: "condition-1",
              field: "source",
              operator: "is",
              value: "bangumimoe"
            }
          ],
          any: [
            {
              id: "condition-2",
              field: "title",
              operator: "contains",
              value: "1080p"
            }
          ]
        }
      ],
      enabledSources: {
        kisssub: false,
        dongmanhuayuan: true,
        acgrip: false,
        bangumimoe: true
      }
    })

    expect(storage.set).toHaveBeenCalledWith({
      settings_v2: {
        ...DEFAULT_SETTINGS,
        downloaders: {
          ...DEFAULT_SETTINGS.downloaders,
          qbittorrent: {
            baseUrl: "http://127.0.0.1:17474",
            username: "admin",
            password: ""
          }
        },
        lastSavePath: "D:\\Downloads\\Anime",
        filters: [
          {
            id: "filter-1",
            name: "Bangumi 1080",
            enabled: true,
            must: [
              {
                id: "condition-1",
                field: "source",
                operator: "is",
                value: "bangumimoe"
              }
            ],
            any: [
              {
                id: "condition-2",
                field: "title",
                operator: "contains",
                value: "1080p"
              }
            ]
          }
        ],
        enabledSources: {
          kisssub: false,
          dongmanhuayuan: true,
          acgrip: false,
          bangumimoe: true
        }
      }
    })
  })

  it("initializes defaults before saving when storage was previously empty", async () => {
    await expect(
      saveSettings({
        downloaders: {
          qbittorrent: {
            username: " admin "
          }
        }
      })
    ).resolves.toEqual({
      ...DEFAULT_SETTINGS,
      downloaders: {
        ...DEFAULT_SETTINGS.downloaders,
        qbittorrent: {
          ...DEFAULT_SETTINGS.downloaders.qbittorrent,
          username: "admin"
        }
      }
    })

    expect(storage.set).toHaveBeenCalledTimes(2)
    expect(storage.set.mock.calls[0]?.[0]).toEqual({
      settings_v2: DEFAULT_SETTINGS
    })
  })
})
