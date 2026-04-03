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
      qbBaseUrl: "http://127.0.0.1:17474"
    }

    await ensureSettings()

    expect(storage.set).not.toHaveBeenCalled()
  })

  it("initializes the new storage key even when the legacy key still exists", async () => {
    state.values.settings = {
      qbBaseUrl: "http://127.0.0.1:17474"
    }

    await ensureSettings()

    expect(storage.set).toHaveBeenCalledWith({
      settings_v2: DEFAULT_SETTINGS
    })
    expect(state.values.settings).toEqual({
      qbBaseUrl: "http://127.0.0.1:17474"
    })
    expect(state.values.settings_v2).toEqual(DEFAULT_SETTINGS)
  })

  it("hydrates missing defaults and sanitizes stored values when reading settings", async () => {
    state.values.settings_v2 = {
      qbBaseUrl: " http://127.0.0.1:17474/// ",
      qbUsername: " admin ",
      lastSavePath: "  D:\\Anime  ",
      enabledSources: {
        kisssub: false
      }
    }

    await expect(getSettings()).resolves.toEqual({
      ...DEFAULT_SETTINGS,
      qbBaseUrl: "http://127.0.0.1:17474",
      qbUsername: "admin",
      lastSavePath: "D:\\Anime",
      filterGroups: [],
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
      qbBaseUrl: "http://legacy-host:9090",
      qbUsername: "legacy-user"
    }
    state.values.settings_v2 = {
      qbBaseUrl: " http://127.0.0.1:17474/// ",
      qbUsername: " admin "
    }

    await expect(getSettings()).resolves.toEqual({
      ...DEFAULT_SETTINGS,
      qbBaseUrl: "http://127.0.0.1:17474",
      qbUsername: "admin"
    })
  })

  it("merges partial updates into the sanitized stored settings before persisting", async () => {
    state.values.settings_v2 = {
      qbBaseUrl: " http://127.0.0.1:7474/// ",
      qbUsername: " admin ",
      enabledSources: {
        kisssub: false
      }
    }

    await expect(
      saveSettings({
        qbBaseUrl: " http://127.0.0.1:17474/// ",
        lastSavePath: "  D:\\Downloads\\Anime  ",
        enabledSources: {
          acgrip: false
        },
        filterGroups: [
          {
            id: " group-1 ",
            name: " 场景过滤 ",
            description: " 描述 ",
            enabled: true,
            rules: [
              {
                id: " rule-1 ",
                name: " 保留 Bangumi ",
                enabled: true,
                action: "include",
                relation: "and",
                conditions: [
                  {
                    id: " condition-1 ",
                    field: "source",
                    operator: "is",
                    value: " bangumimoe "
                  },
                  {
                    id: " condition-2 ",
                    field: "title",
                    operator: "contains",
                    value: " 1080p "
                  }
                ]
              }
            ]
          }
        ]
      })
    ).resolves.toEqual({
      ...DEFAULT_SETTINGS,
      qbBaseUrl: "http://127.0.0.1:17474",
      qbUsername: "admin",
      lastSavePath: "D:\\Downloads\\Anime",
      filterGroups: [
        {
          id: "group-1",
          name: "场景过滤",
          description: "描述",
          enabled: true,
          rules: [
            {
              id: "rule-1",
              name: "保留 Bangumi",
              enabled: true,
              action: "include",
              relation: "and",
              conditions: [
                {
                  id: "condition-1",
                  field: "source",
                  operator: "is",
                  value: "bangumimoe"
                },
                {
                  id: "condition-2",
                  field: "title",
                  operator: "contains",
                  value: "1080p"
                }
              ]
            }
          ]
        }
      ],
      enabledSources: {
        kisssub: true,
        dongmanhuayuan: true,
        acgrip: false,
        bangumimoe: true
      }
    })

    expect(storage.set).toHaveBeenCalledWith({
      settings_v2: {
        ...DEFAULT_SETTINGS,
        qbBaseUrl: "http://127.0.0.1:17474",
        qbUsername: "admin",
        lastSavePath: "D:\\Downloads\\Anime",
        filterGroups: [
          {
            id: "group-1",
            name: "场景过滤",
            description: "描述",
            enabled: true,
            rules: [
              {
                id: "rule-1",
                name: "保留 Bangumi",
                enabled: true,
                action: "include",
                relation: "and",
                conditions: [
                  {
                    id: "condition-1",
                    field: "source",
                    operator: "is",
                    value: "bangumimoe"
                  },
                  {
                    id: "condition-2",
                    field: "title",
                    operator: "contains",
                    value: "1080p"
                  }
                ]
              }
            ]
          }
        ],
        enabledSources: {
          kisssub: true,
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
        qbUsername: " admin "
      })
    ).resolves.toEqual({
      ...DEFAULT_SETTINGS,
      qbUsername: "admin"
    })

    expect(storage.set).toHaveBeenCalledTimes(2)
    expect(storage.set.mock.calls[0]?.[0]).toEqual({
      settings_v2: DEFAULT_SETTINGS
    })
  })
})
