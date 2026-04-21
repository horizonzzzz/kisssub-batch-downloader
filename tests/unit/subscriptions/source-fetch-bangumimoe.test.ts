import { describe, expect, it, vi } from "vitest"
import { fetchBangumiMoeSubscriptionCandidates } from "../../../src/lib/subscriptions/source-fetch/bangumimoe"

describe("fetchBangumiMoeSubscriptionCandidates", () => {
  it("reads latest torrents from the Bangumi API without a list-page tab", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          torrents: [
            {
              _id: "69e5c31584f11a93b597ac80",
              title: "[LoliHouse] Medalist - 01 [1080p]",
              magnet: "magnet:?xt=urn:btih:AAA111"
            }
          ]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    )

    await expect(fetchBangumiMoeSubscriptionCandidates(fetchImpl)).resolves.toEqual([
      {
        sourceId: "bangumimoe",
        title: "[LoliHouse] Medalist - 01 [1080p]",
        detailUrl: "https://bangumi.moe/torrent/69e5c31584f11a93b597ac80",
        magnetUrl: "magnet:?xt=urn:btih:AAA111",
        torrentUrl:
          "https://bangumi.moe/download/torrent/69e5c31584f11a93b597ac80/%5BLoliHouse%5D%20Medalist%20-%2001%20%5B1080p%5D.torrent",
        subgroup: ""
      }
    ])

    expect(fetchImpl).toHaveBeenCalledWith("https://bangumi.moe/api/torrent/latest")
  })

  it("throws on HTTP error response", async () => {
    const fetchImpl = vi.fn(async () => new Response("", { status: 500 }))

    await expect(fetchBangumiMoeSubscriptionCandidates(fetchImpl)).rejects.toThrow(
      "Bangumi.moe subscription fetch failed: 500"
    )
  })

  it("handles torrents with missing _id or title", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          torrents: [
            { _id: "valid", title: "Valid Title", magnet: "magnet:?xt=urn:btih:ABC" },
            { _id: "", title: "No ID" },
            { title: "No ID field at all" },
            { _id: "no-title" }
          ]
        }),
        { status: 200 }
      )
    )

    const results = await fetchBangumiMoeSubscriptionCandidates(fetchImpl)
    expect(results).toHaveLength(1)
    expect(results[0].title).toBe("Valid Title")
  })

  it("handles missing torrents array", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({}), { status: 200 })
    )

    await expect(fetchBangumiMoeSubscriptionCandidates(fetchImpl)).resolves.toEqual([])
  })

  it("filters invalid magnet URLs", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          torrents: [
            {
              _id: "abc123",
              title: "Test Torrent",
              magnet: "https://invalid-url.com"
            }
          ]
        }),
        { status: 200 }
      )
    )

    const results = await fetchBangumiMoeSubscriptionCandidates(fetchImpl)
    expect(results[0].magnetUrl).toBe("")
  })

  it("handles empty torrents array", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ torrents: [] }), { status: 200 })
    )

    await expect(fetchBangumiMoeSubscriptionCandidates(fetchImpl)).resolves.toEqual([])
  })
})
