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

  it("defaults filters to an empty array", () => {
    expect(sanitizeSettings({}).filters).toEqual([])
  })

  it("normalizes filters and trims valid nested fields", () => {
    expect(
      sanitizeSettings({
        filters: [
          {
            id: " filter-1 ",
            name: " 爱恋 1080 简繁 ",
            enabled: true,
            must: [
              {
                id: " condition-1 ",
                field: "subgroup",
                operator: "contains",
                value: " 爱恋字幕社 "
              },
              {
                id: " condition-2 ",
                field: "title",
                operator: "contains",
                value: " 1080 "
              }
            ],
            any: [
              {
                id: " condition-3 ",
                field: "title",
                operator: "contains",
                value: " 简 "
              },
              {
                id: " condition-4 ",
                field: "title",
                operator: "contains",
                value: " 繁 "
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
          },
          {
            id: "condition-2",
            field: "title",
            operator: "contains",
            value: "1080"
          }
        ],
        any: [
          {
            id: "condition-3",
            field: "title",
            operator: "contains",
            value: "简"
          },
          {
            id: "condition-4",
            field: "title",
            operator: "contains",
            value: "繁"
          }
        ]
      }
    ])
  })

  it("drops invalid filters and conditions during sanitization", () => {
    expect(
      sanitizeSettings({
        filters: [
          {
            id: "filter-valid",
            name: "保留 Kisssub 1080",
            enabled: true,
            must: [
              {
                id: "condition-valid",
                field: "source",
                operator: "is",
                value: "kisssub"
              },
              {
                id: "condition-invalid",
                field: "title",
                operator: "is",
                value: "1080p"
              } as never
            ],
            any: [
              {
                id: "condition-any",
                field: "title",
                operator: "contains",
                value: "1080p"
              }
            ]
          },
          {
            id: "filter-invalid",
            name: "空筛选器",
            enabled: true,
            must: [],
            any: []
          }
        ]
      }).filters
    ).toEqual([
      {
        id: "filter-valid",
        name: "保留 Kisssub 1080",
        enabled: true,
        must: [
          {
            id: "condition-valid",
            field: "source",
            operator: "is",
            value: "kisssub"
          }
        ],
        any: [
          {
            id: "condition-any",
            field: "title",
            operator: "contains",
            value: "1080p"
          }
        ]
      }
    ])
  })

  it("drops legacy filterGroups data instead of migrating it", () => {
    expect(
      sanitizeSettings({
        filterGroups: [
          {
            id: "group-1",
            name: "旧规则组",
            enabled: true,
            description: "",
            rules: [
              {
                id: "rule-1",
                name: "旧规则",
                enabled: true,
                action: "include",
                relation: "and",
                conditions: [
                  {
                    id: "condition-1",
                    field: "title",
                    operator: "contains",
                    value: "1080p"
                  }
                ]
              }
            ]
          }
        ]
      } as never).filters
    ).toEqual([])
  })
})
