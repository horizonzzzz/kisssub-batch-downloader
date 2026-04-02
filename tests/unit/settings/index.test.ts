import { describe, expect, it } from "vitest"

import { DEFAULT_SETTINGS, sanitizeSettings } from "../../../lib/settings"

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
          acgrip: "magnet",
          bangumimoe: "torrent-file"
        }
      })
    ).toMatchObject({
      sourceDeliveryModes: {
        kisssub: "torrent-file",
        dongmanhuayuan: "magnet",
        acgrip: "torrent-file",
        bangumimoe: "torrent-file"
      }
    })
  })

  it("defaults every source to enabled", () => {
    expect(sanitizeSettings({}).enabledSources).toEqual({
      kisssub: true,
      dongmanhuayuan: true,
      acgrip: true,
      bangumimoe: true
    })
  })

  it("keeps all sources enabled when older settings omit enabledSources", () => {
    expect(
      sanitizeSettings({
        qbBaseUrl: "http://127.0.0.1:17474",
        qbUsername: "admin"
      }).enabledSources
    ).toEqual({
      kisssub: true,
      dongmanhuayuan: true,
      acgrip: true,
      bangumimoe: true
    })
  })

  it("normalizes per-source enablement and falls back to defaults for invalid values", () => {
    expect(
      sanitizeSettings({
        enabledSources: {
          kisssub: false,
          dongmanhuayuan: "false",
          acgrip: null,
          bangumimoe: true
        } as never
      }).enabledSources
    ).toEqual({
      kisssub: false,
      dongmanhuayuan: true,
      acgrip: true,
      bangumimoe: true
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
      concurrency: 5,
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

  it("defaults filter groups to an empty array and ignores legacy filter rules", () => {
    expect(
      sanitizeSettings({
        filterRules: [
          {
            id: "legacy-rule",
            name: "排除 RAW"
          }
        ]
      } as never).filterGroups
    ).toEqual([])
  })

  it("normalizes filter groups and trims valid nested fields", () => {
    expect(
      sanitizeSettings({
        filterGroups: [
          {
            id: " group-1 ",
            name: " 画质过滤 ",
            description: " 拦截低画质 ",
            enabled: true,
            rules: [
              {
                id: " rule-1 ",
                name: " 排除 720p ",
                enabled: true,
                action: "exclude",
                relation: "or",
                conditions: [
                  {
                    id: " condition-1 ",
                    field: "title",
                    operator: "contains",
                    value: " 720p "
                  },
                  {
                    id: " condition-2 ",
                    field: "source",
                    operator: "is",
                    value: " kisssub "
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
            name: "排除 720p",
            enabled: true,
            action: "exclude",
            relation: "or",
            conditions: [
              {
                id: "condition-1",
                field: "title",
                operator: "contains",
                value: "720p"
              },
              {
                id: "condition-2",
                field: "source",
                operator: "is",
                value: "kisssub"
              }
            ]
          }
        ]
      }
    ])
  })

  it("drops invalid rules and conditions during sanitization", () => {
    expect(
      sanitizeSettings({
        filterGroups: [
          {
            id: "group-1",
            name: "规则组",
            description: "",
            enabled: true,
            rules: [
              {
                id: "rule-valid",
                name: "保留 Kisssub",
                enabled: true,
                action: "include",
                relation: "and",
                conditions: [
                  {
                    id: "condition-valid",
                    field: "source",
                    operator: "is",
                    value: "kisssub"
                  },
                  {
                    id: "condition-invalid",
                    field: "title",
                    operator: "regex",
                    value: "[RAW"
                  }
                ]
              },
              {
                id: "rule-invalid",
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
        name: "规则组",
        description: "",
        enabled: true,
        rules: [
          {
            id: "rule-valid",
            name: "保留 Kisssub",
            enabled: true,
            action: "include",
            relation: "and",
            conditions: [
              {
                id: "condition-valid",
                field: "source",
                operator: "is",
                value: "kisssub"
              }
            ]
          }
        ]
      }
    ])
  })
})
