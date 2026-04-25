import { describe, expect, it, vi } from "vitest"

import { fetchComicatSubscriptionCandidates } from "../../../src/lib/subscriptions/source-fetch/comicat"

describe("fetchComicatSubscriptionCandidates", () => {
  it("parses rss items into comicat candidates with a prebuilt magnet url", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => `<?xml version="1.0" encoding="utf-8"?>
        <rss version="2.0">
          <channel>
            <item>
              <title><![CDATA[[LoliHouse] Episode 01]]></title>
              <link>http://www.comicat.org/show-86584c42ac1abb6a346effaa1faff53448f1b71a.html</link>
            </item>
          </channel>
        </rss>`
    })

    await expect(fetchComicatSubscriptionCandidates(fetchImpl as never)).resolves.toEqual([
      {
        sourceId: "comicat",
        title: "[LoliHouse] Episode 01",
        detailUrl: "http://www.comicat.org/show-86584c42ac1abb6a346effaa1faff53448f1b71a.html",
        magnetUrl: "magnet:?xt=urn:btih:86584c42ac1abb6a346effaa1faff53448f1b71a",
        torrentUrl: "",
        subgroup: ""
      }
    ])
  })

  it("handles multiple items and skips malformed entries", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => `<?xml version="1.0" encoding="utf-8"?>
        <rss version="2.0">
          <channel>
            <item>
              <title><![CDATA[[Group] Episode A]]></title>
              <link>http://www.comicat.org/show-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.html</link>
            </item>
            <item>
              <title><![CDATA[Invalid Link]]></title>
              <link>http://www.comicat.org/other-page.html</link>
            </item>
            <item>
              <title><![CDATA[[Group] Episode B]]></title>
              <link>http://www.comicat.org/show-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.html</link>
            </item>
          </channel>
        </rss>`
    })

    const result = await fetchComicatSubscriptionCandidates(fetchImpl as never)
    expect(result).toHaveLength(2)
    expect(result[0]?.title).toBe("[Group] Episode A")
    expect(result[1]?.title).toBe("[Group] Episode B")
  })

  it("throws when the rss request fails", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 500
    })

    await expect(fetchComicatSubscriptionCandidates(fetchImpl as never)).rejects.toThrow(
      "Comicat subscription fetch failed: 500"
    )
  })
})