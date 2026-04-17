import { describe, expect, it } from "vitest"

import { DEFAULT_SETTINGS, sanitizeSettings } from "../../../src/lib/settings"

describe("sanitizeSettings", () => {
  it("uses app-settings defaults for numeric and notification fields", () => {
    expect(sanitizeSettings({})).toMatchObject({
      concurrency: 3,
      retryCount: 3,
      subscriptionsEnabled: false,
      pollingIntervalMinutes: 30,
      notificationsEnabled: true,
      notificationDownloadActionEnabled: true
    })
  })

  it("normalizes downloader settings and the last used save path", () => {
    expect(
      sanitizeSettings({
        downloaders: {
          qbittorrent: {
            baseUrl: " http://127.0.0.1:17474/// ",
            username: " admin ",
            password: "123456"
          }
        },
        lastSavePath: "  D:\\Downloads\\Anime  "
      })
    ).toMatchObject({
      downloaders: {
        qbittorrent: {
          baseUrl: "http://127.0.0.1:17474",
          username: "admin",
          password: "123456"
        }
      },
      lastSavePath: "D:\\Downloads\\Anime"
    })
  })

  it("hydrates transmission settings and normalizes its base url", () => {
    expect(
      sanitizeSettings({
        currentDownloaderId: "transmission",
        downloaders: {
          transmission: {
            baseUrl: " http://127.0.0.1:9091/transmission/rpc/// ",
            username: " admin ",
            password: "secret"
          }
        }
      })
    ).toMatchObject({
      currentDownloaderId: "transmission",
      downloaders: {
        qbittorrent: DEFAULT_SETTINGS.downloaders.qbittorrent,
        transmission: {
          baseUrl: "http://127.0.0.1:9091/transmission/rpc",
          username: "admin",
          password: "secret"
        }
      }
    })
  })

  it("normalizes source delivery modes and source enablement", () => {
    expect(
      sanitizeSettings({
        sourceDeliveryModes: {
          kisssub: "torrent-file",
          dongmanhuayuan: "torrent-file",
          acgrip: "magnet",
          bangumimoe: "torrent-file"
        },
        enabledSources: {
          kisssub: false,
          dongmanhuayuan: "false",
          acgrip: null,
          bangumimoe: true
        } as never
      })
    ).toMatchObject({
      sourceDeliveryModes: {
        kisssub: "torrent-file",
        dongmanhuayuan: "magnet",
        acgrip: "torrent-file",
        bangumimoe: "torrent-file"
      },
      enabledSources: {
        kisssub: false,
        dongmanhuayuan: true,
        acgrip: true,
        bangumimoe: true
      }
    })
  })

  it("normalizes filters and drops invalid entries", () => {
    expect(
      sanitizeSettings({
        filters: [
          {
            id: " filter-1 ",
            name: " Bangumi 1080 ",
            enabled: true,
            sourceIds: ["bangumimoe"],
            must: [
              {
                id: " condition-1 ",
                field: "title",
                operator: "contains",
                value: " 1080 "
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
        id: "filter-1",
        name: "Bangumi 1080",
        enabled: true,
        sourceIds: ["bangumimoe"],
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
            field: "title",
            operator: "contains",
            value: "1080p"
          }
        ]
      }
    ])
  })

  it("sanitizes app settings without subscription-owned fields", () => {
    const sanitized = sanitizeSettings({
      currentDownloaderId: "qbittorrent",
      subscriptions: [{ id: "sub-1" }],
      lastSchedulerRunAt: "2026-04-13T01:23:45.000Z",
      subscriptionRuntimeStateById: {
        "sub-1": { lastScanAt: "x" }
      },
      subscriptionNotificationRounds: [{ id: "round-1", createdAt: "x", hitIds: [] }]
    } as never)

    expect(sanitized).toEqual(
      expect.objectContaining({
        currentDownloaderId: "qbittorrent",
        filters: []
      })
    )
    expect(sanitized).not.toHaveProperty("subscriptions")
    expect(sanitized).not.toHaveProperty("lastSchedulerRunAt")
    expect(sanitized).not.toHaveProperty("subscriptionRuntimeStateById")
    expect(sanitized).not.toHaveProperty("subscriptionNotificationRounds")
  })
})
