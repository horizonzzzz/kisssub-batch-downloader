import { getBrowser } from "../../shared/browser"
import type { SubscriptionPolicyConfig } from "./types"
import { DEFAULT_SUBSCRIPTION_POLICY_CONFIG } from "./defaults"
import { sanitizeSubscriptionPolicyConfig } from "./schema"

const SUBSCRIPTION_POLICY_STORAGE_KEY = "subscription_policy_config"

export async function ensureSubscriptionPolicyConfig(): Promise<void> {
  const extensionBrowser = getBrowser()
  const stored = await extensionBrowser.storage.local.get(SUBSCRIPTION_POLICY_STORAGE_KEY)

  if (stored[SUBSCRIPTION_POLICY_STORAGE_KEY]) {
    return
  }

  await extensionBrowser.storage.local.set({
    [SUBSCRIPTION_POLICY_STORAGE_KEY]: DEFAULT_SUBSCRIPTION_POLICY_CONFIG
  })
}

export async function getSubscriptionPolicyConfig(): Promise<SubscriptionPolicyConfig> {
  const extensionBrowser = getBrowser()
  const stored = await extensionBrowser.storage.local.get(SUBSCRIPTION_POLICY_STORAGE_KEY)

  if (stored[SUBSCRIPTION_POLICY_STORAGE_KEY]) {
    try {
      return sanitizeSubscriptionPolicyConfig(stored[SUBSCRIPTION_POLICY_STORAGE_KEY])
    } catch {
      await extensionBrowser.storage.local.set({ [SUBSCRIPTION_POLICY_STORAGE_KEY]: DEFAULT_SUBSCRIPTION_POLICY_CONFIG })
      return DEFAULT_SUBSCRIPTION_POLICY_CONFIG
    }
  }

  await extensionBrowser.storage.local.set({
    [SUBSCRIPTION_POLICY_STORAGE_KEY]: DEFAULT_SUBSCRIPTION_POLICY_CONFIG
  })
  return DEFAULT_SUBSCRIPTION_POLICY_CONFIG
}

export async function saveSubscriptionPolicyConfig(config: SubscriptionPolicyConfig): Promise<SubscriptionPolicyConfig> {
  const sanitized = sanitizeSubscriptionPolicyConfig(config)
  await getBrowser().storage.local.set({
    [SUBSCRIPTION_POLICY_STORAGE_KEY]: sanitized
  })
  return sanitized
}
