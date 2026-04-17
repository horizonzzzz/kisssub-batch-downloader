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

  it("omits subscription workspace fields from the shared app-settings save payload", () => {
    const payload = toSettingsPayload({
      ...createSettingsFormDefaults({
        subscriptionsEnabled: true,
        pollingIntervalMinutes: 30,
        notificationsEnabled: true,
        notificationDownloadActionEnabled: true,
        subscriptions: [
          {
            id: "sub-1",
            name: "Bangumi.moe Medalist",
            enabled: true,
            sourceIds: ["bangumimoe"],
            multiSiteModeEnabled: false,
            titleQuery: "Medalist",
            subgroupQuery: "爱恋字幕社",
            advanced: { must: [], any: [] },
            deliveryMode: "direct-only",
            createdAt: "2026-04-13T00:00:00.000Z",
            baselineCreatedAt: "2026-04-13T00:00:00.000Z"
          }
        ],
        lastSchedulerRunAt: "2026-04-13T04:00:00.000Z",
        subscriptionRuntimeStateById: {
          "sub-1": {
            lastScanAt: "2026-04-13T03:00:00.000Z",
            lastMatchedAt: null,
            lastError: "",
            seenFingerprints: ["fp-1"],
            recentHits: []
          }
        },
        subscriptionNotificationRounds: [
          {
            id: "round-1",
            createdAt: "2026-04-13T04:00:00.000Z",
            hitIds: ["hit-1"]
          }
        ]
      })
    })

    expect(payload).not.toHaveProperty("subscriptionsRuntimeStateById")
    expect(payload).not.toHaveProperty("subscriptions")
    expect(payload).not.toHaveProperty("subscriptionsEnabled")
    expect(payload).not.toHaveProperty("pollingIntervalMinutes")
    expect(payload).not.toHaveProperty("notificationsEnabled")
    expect(payload).not.toHaveProperty("notificationDownloadActionEnabled")
    expect(payload).not.toHaveProperty("lastSchedulerRunAt")
    expect(payload).not.toHaveProperty("subscriptionRuntimeStateById")
    expect(payload).not.toHaveProperty("subscriptionNotificationRounds")
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
          sourceIds: ["kisssub", "dongmanhuayuan", "acgrip", "bangumimoe"],
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
        sourceIds: ["kisssub", "dongmanhuayuan", "acgrip", "bangumimoe"],
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
            sourceIds: ["kisssub"],
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
          sourceIds: ["kisssub"],
          must: [],
          any: []
        }
      ]
    })

    expect(result.success).toBe(false)
  })

  it("rejects filters without any selected source ids", () => {
    const result = settingsFormSchema.safeParse({
      ...createSettingsFormDefaults(),
      filters: [
        {
          id: "filter-1",
          name: "未选择站点",
          enabled: true,
          sourceIds: [],
          must: [
            {
              id: "condition-1",
              field: "title",
              operator: "contains",
              value: "1080"
            }
          ],
          any: []
        }
      ]
    })

    expect(result.success).toBe(false)
  })

  it("rejects source ids outside the supported site list", () => {
    const result = settingsFormSchema.safeParse({
      ...createSettingsFormDefaults(),
      filters: [
        {
          id: "filter-1",
          name: "非法站点",
          enabled: true,
          sourceIds: ["invalid-source"],
          must: [
            {
              id: "condition-1",
              field: "title",
              operator: "contains",
              value: "1080"
            }
          ],
          any: []
        }
      ]
    })

    expect(result.success).toBe(false)
  })

  it("rejects legacy source conditions inside must clauses", () => {
    const result = settingsFormSchema.safeParse({
      ...createSettingsFormDefaults(),
      filters: [
        {
          id: "filter-1",
          name: "Bangumi 旧规则",
          enabled: true,
          sourceIds: ["bangumimoe"],
          must: [
            {
              id: "condition-2",
              field: "source",
              operator: "is",
              value: "bangumimoe"
            } as never
          ],
          any: []
        }
      ]
    })

    expect(result.success).toBe(false)
  })

  it("does not include subscription workspace fields in settings form defaults", () => {
    const values = createSettingsFormDefaults({
      subscriptionsEnabled: true,
      pollingIntervalMinutes: 30,
      notificationsEnabled: true,
      notificationDownloadActionEnabled: true,
      subscriptions: [
        {
          id: "sub-1",
          name: "Bangumi.moe Medalist",
          enabled: true,
          sourceIds: ["bangumimoe"],
          multiSiteModeEnabled: false,
          titleQuery: "Medalist",
          subgroupQuery: "爱恋字幕社",
          advanced: { must: [], any: [] },
          deliveryMode: "direct-only",
          createdAt: "2026-04-13T00:00:00.000Z",
          baselineCreatedAt: "2026-04-13T00:00:00.000Z"
        }
      ],
      subscriptionRuntimeStateById: {
        "sub-1": {
          lastScanAt: null,
          lastMatchedAt: null,
          lastError: "",
          seenFingerprints: [],
          recentHits: []
        }
      }
    })

    expect(values).not.toHaveProperty("subscriptions")
    expect(values).not.toHaveProperty("subscriptionsEnabled")
    expect(values).not.toHaveProperty("pollingIntervalMinutes")
    expect(values).not.toHaveProperty("notificationsEnabled")
    expect(values).not.toHaveProperty("notificationDownloadActionEnabled")
    expect(values).not.toHaveProperty("lastSchedulerRunAt")
    expect(values).not.toHaveProperty("subscriptionRuntimeStateById")
    expect(values).not.toHaveProperty("subscriptionNotificationRounds")
  })

  it("accepts settings payloads without subscription workspace fields", () => {
    const result = settingsFormSchema.safeParse({
      ...createSettingsFormDefaults()
    })

    expect(result.success).toBe(true)
  })
})
