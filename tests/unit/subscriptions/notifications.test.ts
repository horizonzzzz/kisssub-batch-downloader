import { describe, expect, it } from "vitest"

import { retainSubscriptionNotificationRounds } from "../../../src/lib/subscriptions/notifications"

describe("retainSubscriptionNotificationRounds", () => {
  it("keeps the newest rounds by createdAt even when the input order is unstable", () => {
    const rounds = retainSubscriptionNotificationRounds([
      {
        id: "subscription-round:20260417130000000",
        createdAt: "2026-04-17T13:00:00.000Z",
        hitIds: ["hit-3"]
      },
      {
        id: "subscription-round:20260417110000000",
        createdAt: "2026-04-17T11:00:00.000Z",
        hitIds: ["hit-1"]
      },
      {
        id: "subscription-round:20260417120000000",
        createdAt: "2026-04-17T12:00:00.000Z",
        hitIds: ["hit-2"]
      }
    ])

    expect(rounds.map((round) => round.id)).toEqual([
      "subscription-round:20260417110000000",
      "subscription-round:20260417120000000",
      "subscription-round:20260417130000000"
    ])
  })
})
