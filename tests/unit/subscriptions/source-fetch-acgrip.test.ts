import { describe, expect, it, vi } from "vitest"
import { fetchAcgRipSubscriptionCandidates } from "../../../src/lib/subscriptions/source-fetch/acgrip"

describe("fetchAcgRipSubscriptionCandidates", () => {
  it("parses detail and torrent urls from fetched list HTML without opening a tab", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        `
          <table>
            <tr>
              <td><a href="/t/100">[LoliHouse] Medalist - 01 [1080p]</a></td>
              <td><a href="/t/100.torrent">Torrent</a></td>
            </tr>
            <tr>
              <td><a href="/t/101">[LoliHouse] Medalist - 02 [1080p]</a></td>
              <td><a href="/t/101.torrent">Torrent</a></td>
            </tr>
          </table>
        `,
        { status: 200, headers: { "Content-Type": "text/html" } }
      )
    )

    await expect(fetchAcgRipSubscriptionCandidates(fetchImpl)).resolves.toEqual([
      {
        sourceId: "acgrip",
        title: "[LoliHouse] Medalist - 01 [1080p]",
        detailUrl: "https://acg.rip/t/100",
        magnetUrl: "",
        torrentUrl: "https://acg.rip/t/100.torrent",
        subgroup: ""
      },
      {
        sourceId: "acgrip",
        title: "[LoliHouse] Medalist - 02 [1080p]",
        detailUrl: "https://acg.rip/t/101",
        magnetUrl: "",
        torrentUrl: "https://acg.rip/t/101.torrent",
        subgroup: ""
      }
    ])

    expect(fetchImpl).toHaveBeenCalledWith("https://acg.rip/")
  })

  it("throws on HTTP error response", async () => {
    const fetchImpl = vi.fn(async () => new Response("", { status: 500 }))

    await expect(fetchAcgRipSubscriptionCandidates(fetchImpl)).rejects.toThrow(
      "ACG.RIP subscription fetch failed: 500"
    )
  })

  it("handles rows without proper anchor structure", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(`<table><tr><td>No anchors here</td></tr></table>`, { status: 200 })
    )

    await expect(fetchAcgRipSubscriptionCandidates(fetchImpl)).resolves.toEqual([])
  })

  it("handles rows with detail URL but no torrent URL", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        `<table><tr><td><a href="/t/100">[LoliHouse] Medalist - 01 [1080p]</a></td></tr></table>`,
        { status: 200 }
      )
    )

    await expect(fetchAcgRipSubscriptionCandidates(fetchImpl)).resolves.toEqual([
      {
        sourceId: "acgrip",
        title: "[LoliHouse] Medalist - 01 [1080p]",
        detailUrl: "https://acg.rip/t/100",
        magnetUrl: "",
        torrentUrl: "",
        subgroup: ""
      }
    ])
  })

  it("decodes HTML entities in fetched titles", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        `<table><tr><td><a href="/t/100">[北宇治字幕组&amp;LoliHouse] Medalist - 01</a></td><td><a href="/t/100.torrent">Torrent</a></td></tr></table>`,
        { status: 200 }
      )
    )

    await expect(fetchAcgRipSubscriptionCandidates(fetchImpl)).resolves.toEqual([
      {
        sourceId: "acgrip",
        title: "[北宇治字幕组&LoliHouse] Medalist - 01",
        detailUrl: "https://acg.rip/t/100",
        magnetUrl: "",
        torrentUrl: "https://acg.rip/t/100.torrent",
        subgroup: ""
      }
    ])
  })

  it("handles empty HTML response", async () => {
    const fetchImpl = vi.fn(async () => new Response("", { status: 200 }))

    await expect(fetchAcgRipSubscriptionCandidates(fetchImpl)).resolves.toEqual([])
  })

  it("deduplicates rows with the same detail URL", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        `<table>
          <tr><td><a href="/t/100">[LoliHouse] Medalist - 01</a></td><td><a href="/t/100.torrent">Torrent</a></td></tr>
          <tr><td><a href="/t/100">[LoliHouse] Medalist - 01 Duplicate</a></td><td><a href="/t/100.torrent">Torrent</a></td></tr>
        </table>`,
        { status: 200 }
      )
    )

    const results = await fetchAcgRipSubscriptionCandidates(fetchImpl)
    expect(results).toHaveLength(2)
    expect(results[0].detailUrl).toBe("https://acg.rip/t/100")
  })
})
