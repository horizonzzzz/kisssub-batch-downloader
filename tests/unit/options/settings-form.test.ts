import { describe, expect, it } from "vitest"

import {
  createSettingsFormDefaults,
  settingsFormSchema,
  toSettingsPayload,
  type SettingsFormInput
} from "../../../src/components/options/schema/settings-form"

describe("options settings form helpers", () => {
  it("creates merged default values from partial stored settings", () => {
    expect(
      createSettingsFormDefaults({
        currentDownloaderId: "qbittorrent",
        downloaders: {
          qbittorrent: {
            baseUrl: " http://127.0.0.1:17474/// "
          }
        },
        concurrency: 99,
        enabledSources: {
          kisssub: false
        }
      })
    ).toMatchObject({
      currentDownloaderId: "qbittorrent",
      downloaders: {
        qbittorrent: {
          baseUrl: "http://127.0.0.1:17474"
        }
      },
      concurrency: 5,
      enabledSources: {
        kisssub: false,
        dongmanhuayuan: true,
        acgrip: true,
        bangumimoe: true
      }
    })
  })

  it("hydrates transmission settings when the selected downloader is transmission", () => {
    expect(
      createSettingsFormDefaults({
        currentDownloaderId: "transmission",
        downloaders: {
          transmission: {
            baseUrl: " http://127.0.0.1:9091/transmission/rpc/ ",
            username: " admin ",
            password: "secret"
          }
        }
      })
    ).toMatchObject({
      currentDownloaderId: "transmission",
      downloaders: {
        qbittorrent: {
          baseUrl: "http://127.0.0.1:7474"
        },
        transmission: {
          baseUrl: "http://127.0.0.1:9091/transmission/rpc",
          username: "admin",
          password: "secret"
        }
      }
    })
  })

  it("coerces numeric field values and trims strings before save", () => {
    const rawValues: SettingsFormInput = {
      ...createSettingsFormDefaults(),
      downloaders: {
        qbittorrent: {
          baseUrl: " http://127.0.0.1:8080/ ",
          username: " operator ",
          password: ""
        },
        transmission: createSettingsFormDefaults().downloaders.transmission
      },
      lastSavePath: "  D:\\Anime\\Save  ",
      concurrency: "2",
      retryCount: "0",
      injectTimeoutMs: "16000",
      domSettleMs: "900"
    }
    const payload = toSettingsPayload(rawValues)

    expect(payload).toMatchObject({
      downloaders: {
        qbittorrent: {
          baseUrl: "http://127.0.0.1:8080",
          username: "operator"
        }
      },
      lastSavePath: "D:\\Anime\\Save",
      concurrency: 2,
      retryCount: 0,
      injectTimeoutMs: 16000,
      domSettleMs: 900
    })
  })

  it("rejects an empty qBittorrent WebUI address", () => {
    const result = settingsFormSchema.safeParse({
      ...createSettingsFormDefaults(),
      downloaders: {
        qbittorrent: {
          baseUrl: "   ",
          username: "",
          password: ""
        }
      }
    })

    expect(result.success).toBe(false)

    if (result.success) {
      throw new Error("schema unexpectedly accepted an empty qbittorrent baseUrl")
    }
  })

  it("allows an empty inactive transmission address when qBittorrent is selected", () => {
    const result = settingsFormSchema.safeParse({
      ...createSettingsFormDefaults(),
      currentDownloaderId: "qbittorrent",
      downloaders: {
        qbittorrent: {
          baseUrl: "http://127.0.0.1:17474",
          username: "admin",
          password: ""
        },
        transmission: {
          baseUrl: "   ",
          username: "",
          password: ""
        }
      }
    })

    expect(result.success).toBe(true)
  })

  it("allows an empty inactive qBittorrent address when transmission is selected", () => {
    const result = settingsFormSchema.safeParse({
      ...createSettingsFormDefaults(),
      currentDownloaderId: "transmission",
      downloaders: {
        qbittorrent: {
          baseUrl: "   ",
          username: "",
          password: ""
        },
        transmission: {
          baseUrl: "http://127.0.0.1:9091/transmission/rpc",
          username: "admin",
          password: ""
        }
      }
    })

    expect(result.success).toBe(true)
  })

  it("rejects an empty active transmission address", () => {
    const result = settingsFormSchema.safeParse({
      ...createSettingsFormDefaults(),
      currentDownloaderId: "transmission",
      downloaders: {
        qbittorrent: {
          baseUrl: "http://127.0.0.1:17474",
          username: "",
          password: ""
        },
        transmission: {
          baseUrl: "   ",
          username: "",
          password: ""
        }
      }
    })

    expect(result.success).toBe(false)

    if (result.success) {
      throw new Error("schema unexpectedly accepted an empty transmission baseUrl")
    }

    expect(result.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["downloaders", "transmission", "baseUrl"]
        })
      ])
    )
  })

  it("hydrates filters from stored settings", () => {
    expect(
      createSettingsFormDefaults({
        filters: [
          {
            id: "filter-1",
            name: "爱恋 1080 简繁",
            enabled: true,
            must: [
              {
                id: "condition-1",
                field: "subgroup",
                operator: "contains",
                value: "爱恋字幕社"
              }
            ],
            any: [
              {
                id: "condition-2",
                field: "title",
                operator: "contains",
                value: "1080"
              }
            ]
          }
        ]
      }).filters
    ).toEqual([
      {
        id: "filter-1",
        name: "爱恋 1080 简繁",
        enabled: true,
        must: [
          {
            id: "condition-1",
            field: "subgroup",
            operator: "contains",
            value: "爱恋字幕社"
          }
        ],
        any: [
          {
            id: "condition-2",
            field: "title",
            operator: "contains",
            value: "1080"
          }
        ]
      }
    ])
  })

  it("drops invalid stored filters when creating defaults", () => {
    expect(
      createSettingsFormDefaults({
        filters: [
          {
            id: "filter-1",
            name: "空筛选器",
            enabled: true,
            must: [],
            any: []
          }
        ]
      }).filters
    ).toEqual([])
  })

  it("rejects filters without any must conditions", () => {
    const result = settingsFormSchema.safeParse({
      ...createSettingsFormDefaults(),
      filters: [
        {
          id: "filter-1",
          name: "空筛选器",
          enabled: true,
          must: [],
          any: []
        }
      ]
    })

    expect(result.success).toBe(false)
  })

  it("rejects source conditions without a supported source id", () => {
    const result = settingsFormSchema.safeParse({
      ...createSettingsFormDefaults(),
      filters: [
        {
          id: "filter-1",
          name: "非法站点",
          enabled: true,
          must: [
            {
              id: "condition-1",
              field: "source",
              operator: "is",
              value: "invalid-source"
            }
          ],
          any: []
        }
      ]
    })

    expect(result.success).toBe(false)
  })

  it("rejects source conditions inside any clauses", () => {
    const result = settingsFormSchema.safeParse({
      ...createSettingsFormDefaults(),
      filters: [
        {
          id: "filter-1",
          name: "Bangumi 任一",
          enabled: true,
          must: [
            {
              id: "condition-1",
              field: "title",
              operator: "contains",
              value: "1080"
            }
          ],
          any: [
            {
              id: "condition-2",
              field: "source",
              operator: "is",
              value: "bangumimoe"
            }
          ]
        }
      ]
    })

    expect(result.success).toBe(false)
  })
})
