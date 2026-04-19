import { beforeEach, describe, expect, it, vi } from "vitest"

import type { SubscriptionEntry } from "../../../src/lib/shared/types"

const {
  getDownloaderConfigMock,
  getSubscriptionPolicyConfigMock
} = vi.hoisted(() => ({
  getDownloaderConfigMock: vi.fn(),
  getSubscriptionPolicyConfigMock: vi.fn()
}))

vi.mock("../../../src/lib/downloader/config/storage", () => ({
  getDownloaderConfig: getDownloaderConfigMock
}))

vi.mock("../../../src/lib/subscriptions/policy/storage", () => ({
  getSubscriptionPolicyConfig: getSubscriptionPolicyConfigMock
}))

describe("overview state query", () => {
  beforeEach(async () => {
    const { resetSubscriptionDb, subscriptionDb } = await import("../../../src/lib/subscriptions/db")
    vi.clearAllMocks()
    await resetSubscriptionDb()
    await subscriptionDb.subscriptions.clear()

    getDownloaderConfigMock.mockResolvedValue({
      activeId: "transmission",
      profiles: {
        qbittorrent: {
          baseUrl: "http://127.0.0.1:7474",
          username: "",
          password: ""
        },
        transmission: {
          baseUrl: "http://127.0.0.1:9091/transmission/rpc",
          username: "",
          password: ""
        }
      }
    })
    getSubscriptionPolicyConfigMock.mockResolvedValue({
      enabled: true,
      pollingIntervalMinutes: 30,
      notificationsEnabled: true,
      notificationDownloadActionEnabled: true
    })
  })

  it("counts boolean-enabled subscriptions correctly", async () => {
    const { subscriptionDb } = await import("../../../src/lib/subscriptions/db")
    const enabledSubscription: SubscriptionEntry = {
      id: "sub-enabled",
      name: "Enabled",
      enabled: true,
      sourceIds: ["acgrip"],
      multiSiteModeEnabled: false,
      titleQuery: "Enabled",
      subgroupQuery: "",
      deliveryMode: "direct-only",
      advanced: {
        must: [],
        any: []
      },
      createdAt: "2026-04-19T00:00:00.000Z",
      baselineCreatedAt: "2026-04-19T00:00:00.000Z"
    }
    const disabledSubscription: SubscriptionEntry = {
      ...enabledSubscription,
      id: "sub-disabled",
      name: "Disabled",
      enabled: false
    }

    await subscriptionDb.subscriptions.bulkPut([enabledSubscription, disabledSubscription])

    const { getOverviewState } = await import("../../../src/lib/background/queries/overview-state")
    const state = await getOverviewState()

    expect(state.downloaderName).toBe("Transmission")
    expect(state.downloaderBaseUrl).toBe("http://127.0.0.1:9091/transmission/rpc")
    expect(state.subscriptionsEnabled).toBe(true)
    expect(state.configuredSubscriptionCount).toBe(2)
    expect(state.enabledSubscriptionCount).toBe(1)
  })
})
