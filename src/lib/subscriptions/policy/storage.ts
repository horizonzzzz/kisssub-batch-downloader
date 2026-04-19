import { getBrowser } from "../../shared/browser"
import type { SubscriptionPolicyConfig } from "./types"
import { DEFAULT_SUBSCRIPTION_POLICY_CONFIG } from "./defaults"
import { sanitizeSubscriptionPolicyConfig } from "./schema"

const SUBSCRIPTION_POLICY_STORAGE_KEY = "subscription_policy_config"

export async function ensureSubscriptionPolicyConfig(): Promise<void> {
  const stored = await getBrowser().storage.local.get(SUBSCRIPTION_POLICY_STORAGE_KEY)
  if (!stored[SUBSCRIPTION_POLICY_STORAGE_KEY]) {
    await getBrowser().storage.local.set({
      [SUBSCRIPTION_POLICY_STORAGE_KEY]: DEFAULT_SUBSCRIPTION_POLICY_CONFIG
    })
  }
}

export async function getSubscriptionPolicyConfig(): Promise<SubscriptionPolicyConfig> {
  await ensureSubscriptionPolicyConfig()
  const stored = await getBrowser().storage.local.get(SUBSCRIPTION_POLICY_STORAGE_KEY)
  return sanitizeSubscriptionPolicyConfig(stored[SUBSCRIPTION_POLICY_STORAGE_KEY] ?? DEFAULT_SUBSCRIPTION_POLICY_CONFIG)
}

export async function saveSubscriptionPolicyConfig(config: SubscriptionPolicyConfig): Promise<SubscriptionPolicyConfig> {
  const sanitized = sanitizeSubscriptionPolicyConfig(config)
  await getBrowser().storage.local.set({
    [SUBSCRIPTION_POLICY_STORAGE_KEY]: sanitized
  })
  return sanitized
}