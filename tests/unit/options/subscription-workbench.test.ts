import { describe, expect, it } from "vitest"

import {
  createSubscriptionDraft,
  duplicateSubscriptionDraft,
  getSubscriptionSourceOptions,
  normalizeSubscriptionDraft,
  summarizeSubscriptionSourceIds,
  summarizeSubscriptionRecentHits
} from "../../../src/components/options/pages/subscriptions/subscription-workbench"
import type {
  CreateSubscriptionInput,
  SubscriptionEntry,
  SubscriptionHitRecord
} from "../../../src/lib/shared/types"

function createSubscription(overrides: Partial<SubscriptionEntry> = {}): SubscriptionEntry {
  return {
    id: "sub-1",
    name: "Medalist",
    enabled: true,
    sourceIds: ["acgrip"],
    multiSiteModeEnabled: false,
    titleQuery: "Medalist",
    subgroupQuery: "",
    advanced: {
      must: [],
      any: []
    },
    createdAt: "2026-04-13T00:00:00.000Z",
    baselineCreatedAt: "2026-04-13T00:00:00.000Z",
    deletedAt: null,
    ...overrides
  }
}

function createHit(overrides: Partial<SubscriptionHitRecord> = {}): SubscriptionHitRecord {
  return {
    id: "hit-1",
    subscriptionId: "sub-1",
    sourceId: "acgrip",
    title: "[LoliHouse] Medalist - 01 [1080p]",
    normalizedTitle: "[lolihouse] medalist - 01 [1080p]",
    subgroup: "LoliHouse",
    detailUrl: "https://acg.rip/t/100",
    magnetUrl: "",
    torrentUrl: "https://acg.rip/t/100.torrent",
    discoveredAt: "2026-04-14T08:00:00.000Z",
    downloadedAt: null,
    downloadStatus: "idle",
    readAt: null,
    resolvedAt: null,
    ...overrides
  }
}

describe("subscription workbench helpers", () => {
  it("creates and normalizes subscription drafts with only editable create fields", () => {
    const draft = createSubscriptionDraft()

    expect(Object.keys(draft).sort()).toEqual([
      "advanced",
      "enabled",
      "multiSiteModeEnabled",
      "name",
      "sourceIds",
      "subgroupQuery",
      "titleQuery"
    ])
    expect(draft).toEqual(expect.objectContaining({
      sourceIds: ["acgrip"],
      titleQuery: "",
      subgroupQuery: "",
      enabled: true,
      multiSiteModeEnabled: false,
      name: "",
      advanced: {
        must: [],
        any: []
      }
    }))

    const normalized = normalizeSubscriptionDraft({
      ...draft,
      name: "Medalist",
      titleQuery: "Medalist"
    })

    expect(Object.keys(normalized).sort()).toEqual([
      "advanced",
      "enabled",
      "multiSiteModeEnabled",
      "name",
      "sourceIds",
      "subgroupQuery",
      "titleQuery"
    ])
    expect(normalized).toEqual(expect.objectContaining({
      name: "Medalist",
      sourceIds: ["acgrip"],
      titleQuery: "Medalist",
    }))
  })

  it("duplicates subscription entries into create drafts without system metadata", () => {
    const duplicated = duplicateSubscriptionDraft(
      createSubscription({ deletedAt: "2026-04-18T00:00:00.000Z" })
    )

    expect(duplicated).toEqual<CreateSubscriptionInput>(
      expect.objectContaining({
        name: "Medalist",
        enabled: true,
        sourceIds: ["acgrip"],
        titleQuery: "Medalist"
      })
    )
    expect(duplicated).not.toHaveProperty("id")
    expect(duplicated).not.toHaveProperty("createdAt")
    expect(duplicated).not.toHaveProperty("baselineCreatedAt")
    expect(duplicated).not.toHaveProperty("deletedAt")
  })

  it("keeps subscription source helpers aligned to the four supported background scan sites", () => {
    expect(getSubscriptionSourceOptions().map((option) => option.value)).toEqual([
      "acgrip",
      "bangumimoe",
      "comicat",
      "dongmanhuayuan"
    ])

    const mixedSummary = summarizeSubscriptionSourceIds(["acgrip", "dongmanhuayuan"])
    expect(mixedSummary).toContain("ACG.RIP")
    expect(mixedSummary).toContain("Dongmanhuayuan")
  })

  it("summarizes the newest retained hit instead of the oldest one", () => {
    const summary = summarizeSubscriptionRecentHits([
      createHit({
        id: "hit-1",
        title: "[LoliHouse] Medalist - 01 [1080p]"
      }),
      createHit({
        id: "hit-2",
        title: "[LoliHouse] Medalist - 02 [1080p]",
        detailUrl: "https://acg.rip/t/101",
        torrentUrl: "https://acg.rip/t/101.torrent",
        discoveredAt: "2026-04-14T09:00:00.000Z"
      })
    ])

    expect(summary).toContain("02")
    expect(summary).not.toContain("01 [1080p], plus 2")
  })
})
