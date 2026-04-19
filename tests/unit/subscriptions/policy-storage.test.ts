import { beforeEach, describe, expect, it, vi } from "vitest"
import { fakeBrowser } from "wxt/testing/fake-browser"

import { DEFAULT_SUBSCRIPTION_POLICY_CONFIG } from "../../../src/lib/subscriptions/policy/defaults"
import {
  ensureSubscriptionPolicyConfig,
  getSubscriptionPolicyConfig,
  saveSubscriptionPolicyConfig
} from "../../../src/lib/subscriptions/policy/storage"

describe("subscription policy storage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fakeBrowser.storage.local.clear()
  })

  it("writes default subscription policy config when storage is empty", async () => {
    await ensureSubscriptionPolicyConfig()

    await expect(fakeBrowser.storage.local.get("subscription_policy_config")).resolves.toEqual({
      subscription_policy_config: DEFAULT_SUBSCRIPTION_POLICY_CONFIG
    })
  })

  it("hydrates default subscription policy config", async () => {
    await expect(getSubscriptionPolicyConfig()).resolves.toEqual(DEFAULT_SUBSCRIPTION_POLICY_CONFIG)
  })

  it("persists subscription-policy booleans and polling interval", async () => {
    await expect(
      saveSubscriptionPolicyConfig({
        enabled: true,
        pollingIntervalMinutes: 15,
        notificationsEnabled: true,
        notificationDownloadActionEnabled: false
      })
    ).resolves.toEqual({
      enabled: true,
      pollingIntervalMinutes: 15,
      notificationsEnabled: true,
      notificationDownloadActionEnabled: false
    })
  })

  it("retrieves stored subscription policy config without creating duplicates", async () => {
    await saveSubscriptionPolicyConfig({
      enabled: true,
      pollingIntervalMinutes: 60,
      notificationsEnabled: false,
      notificationDownloadActionEnabled: false
    })

    await ensureSubscriptionPolicyConfig()

    const stored = await fakeBrowser.storage.local.get("subscription_policy_config")
    expect(stored.subscription_policy_config.enabled).toBe(true)
    expect(stored.subscription_policy_config.pollingIntervalMinutes).toBe(60)
  })

  it("coerces polling interval to integer and clamps to valid range", async () => {
    const config = await saveSubscriptionPolicyConfig({
      enabled: true,
      pollingIntervalMinutes: 200, // Above max 120
      notificationsEnabled: true,
      notificationDownloadActionEnabled: true
    })

    expect(config.pollingIntervalMinutes).toBe(120)
  })

  it("clamps polling interval below minimum to 5", async () => {
    const config = await saveSubscriptionPolicyConfig({
      enabled: true,
      pollingIntervalMinutes: 2, // Below min 5
      notificationsEnabled: true,
      notificationDownloadActionEnabled: true
    })

    expect(config.pollingIntervalMinutes).toBe(5)
  })

  it("preserves existing policy when ensure runs on populated storage", async () => {
    await saveSubscriptionPolicyConfig({
      enabled: true,
      pollingIntervalMinutes: 45,
      notificationsEnabled: false,
      notificationDownloadActionEnabled: false
    })

    await ensureSubscriptionPolicyConfig()

    const config = await getSubscriptionPolicyConfig()
    expect(config.pollingIntervalMinutes).toBe(45)
    expect(config.notificationsEnabled).toBe(false)
  })
})