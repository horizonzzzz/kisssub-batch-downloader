import { describe, expect, it } from "vitest"

import {
  createSettingsFormDefaults,
  settingsFormSchema,
  toSettingsPayload,
  type SettingsFormInput
} from "../../../components/options/schema/settings-form"

describe("options settings form helpers", () => {
  it("creates merged default values from partial stored settings", () => {
    expect(
      createSettingsFormDefaults({
        qbBaseUrl: " http://127.0.0.1:17474/// ",
        concurrency: 99,
        enabledSources: {
          kisssub: false
        }
      })
    ).toMatchObject({
      qbBaseUrl: "http://127.0.0.1:17474",
      concurrency: 5,
      enabledSources: {
        kisssub: false,
        dongmanhuayuan: true,
        acgrip: true,
        bangumimoe: true
      }
    })
  })

  it("coerces numeric field values and trims strings before save", () => {
    const rawValues: SettingsFormInput = {
      ...createSettingsFormDefaults(),
      qbBaseUrl: " http://127.0.0.1:8080/ ",
      qbUsername: " operator ",
      lastSavePath: "  D:\\Anime\\Save  ",
      concurrency: "2",
      retryCount: "0",
      injectTimeoutMs: "16000",
      domSettleMs: "900"
    }
    const payload = toSettingsPayload(rawValues)

    expect(payload).toMatchObject({
      qbBaseUrl: "http://127.0.0.1:8080",
      qbUsername: "operator",
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
      qbBaseUrl: "   "
    })

    expect(result.success).toBe(false)

    if (result.success) {
      throw new Error("schema unexpectedly accepted an empty qbBaseUrl")
    }

    expect(result.error.flatten().fieldErrors.qbBaseUrl).toContain(
      "请输入 qBittorrent WebUI 地址"
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
})
