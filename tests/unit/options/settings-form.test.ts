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

  it("hydrates filter groups from stored settings", () => {
    expect(
      createSettingsFormDefaults({
        filterGroups: [
          {
            id: "group-1",
            name: "画质过滤",
            description: "拦截低画质",
            enabled: true,
            rules: [
              {
                id: "rule-1",
                name: "排除 RAW",
                enabled: true,
                action: "exclude",
                relation: "and",
                conditions: [
                  {
                    id: "condition-1",
                    field: "title",
                    operator: "contains",
                    value: "RAW"
                  }
                ]
              }
            ]
          }
        ]
      }).filterGroups
    ).toEqual([
      {
        id: "group-1",
        name: "画质过滤",
        description: "拦截低画质",
        enabled: true,
        rules: [
          {
            id: "rule-1",
            name: "排除 RAW",
            enabled: true,
            action: "exclude",
            relation: "and",
            conditions: [
              {
                id: "condition-1",
                field: "title",
                operator: "contains",
                value: "RAW"
              }
            ]
          }
        ]
      }
    ])
  })

  it("drops invalid stored rules when creating defaults", () => {
    expect(
      createSettingsFormDefaults({
        filterGroups: [
          {
            id: "group-1",
            name: "空规则组",
            description: "",
            enabled: true,
            rules: [
              {
                id: "rule-empty",
                name: "空规则",
                enabled: true,
                action: "exclude",
                relation: "and",
                conditions: []
              }
            ]
          }
        ]
      }).filterGroups
    ).toEqual([
      {
        id: "group-1",
        name: "空规则组",
        description: "",
        enabled: true,
        rules: []
      }
    ])
  })

  it("rejects rules without any conditions", () => {
    const result = settingsFormSchema.safeParse({
      ...createSettingsFormDefaults(),
      filterGroups: [
        {
          id: "group-1",
          name: "规则组",
          description: "",
          enabled: true,
          rules: [
            {
              id: "rule-empty",
              name: "空规则",
              enabled: true,
              action: "exclude",
              relation: "and",
              conditions: []
            }
          ]
        }
      ]
    })

    expect(result.success).toBe(false)
  })

  it("rejects invalid regex conditions", () => {
    const result = settingsFormSchema.safeParse({
      ...createSettingsFormDefaults(),
      filterGroups: [
        {
          id: "group-1",
          name: "规则组",
          description: "",
          enabled: true,
          rules: [
            {
              id: "rule-regex",
              name: "非法正则",
              enabled: true,
              action: "exclude",
              relation: "and",
              conditions: [
                {
                  id: "condition-1",
                  field: "title",
                  operator: "regex",
                  value: "[RAW"
                }
              ]
            }
          ]
        }
      ]
    })

    expect(result.success).toBe(false)
  })
})
