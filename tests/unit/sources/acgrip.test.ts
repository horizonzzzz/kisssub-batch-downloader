import { describe, expect, it } from "vitest"

import { parseAcgRipDetailSnapshot } from "../../../lib/sources/acgrip"

describe("parseAcgRipDetailSnapshot", () => {
  it("returns the torrent URL exposed on the detail page", () => {
    expect(
      parseAcgRipDetailSnapshot(
        {
          title: "[LoliHouse] Hell Mode - 11",
          torrentUrl: "https://acg.rip/t/350361.torrent"
        },
        "https://acg.rip/t/350361"
      )
    ).toEqual({
      ok: true,
      title: "[LoliHouse] Hell Mode - 11",
      hash: "350361",
      magnetUrl: "",
      torrentUrl: "https://acg.rip/t/350361.torrent",
      failureReason: ""
    })
  })

  it("falls back to the detail id when no torrent URL is exposed", () => {
    expect(
      parseAcgRipDetailSnapshot(
        {
          title: "[LoliHouse] Hell Mode - 11",
          torrentUrl: ""
        },
        "https://acg.rip/t/350361"
      )
    ).toEqual({
      ok: false,
      title: "[LoliHouse] Hell Mode - 11",
      hash: "350361",
      magnetUrl: "",
      torrentUrl: "",
      failureReason: "The detail page finished loading, but no usable torrent URL was exposed."
    })
  })
})
