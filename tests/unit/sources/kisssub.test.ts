import { describe, expect, it } from "vitest"

import { parseKisssubDetailSnapshot } from "../../../lib/sources/kisssub"

describe("parseKisssubDetailSnapshot", () => {
  it("returns the extracted magnet or torrent URLs when the detail page exposes them", () => {
    expect(
      parseKisssubDetailSnapshot({
        title: " Episode 01 ",
        hash: "deadbeef",
        magnetUrl: "magnet:?xt=urn:btih:ABCDEF123456",
        torrentUrl: "https://www.kisssub.org/download/deadbeef.torrent",
        magnetLabel: "磁力链接",
        downloadLabel: "本地下载"
      })
    ).toEqual({
      ok: true,
      title: "Episode 01",
      hash: "deadbeef",
      magnetUrl: "magnet:?xt=urn:btih:ABCDEF123456",
      torrentUrl: "https://www.kisssub.org/download/deadbeef.torrent",
      failureReason: ""
    })
  })

  it("returns a helper timeout failure when the wormhole links never resolve", () => {
    expect(
      parseKisssubDetailSnapshot({
        title: "Episode 02",
        hash: "feedface",
        magnetUrl: "",
        torrentUrl: "",
        magnetLabel: "开启虫洞",
        downloadLabel: "开启虫洞"
      })
    ).toEqual({
      ok: false,
      title: "Episode 02",
      hash: "feedface",
      magnetUrl: "",
      torrentUrl: "",
      failureReason: "The helper script timed out and the detail buttons still point to the wormhole page."
    })
  })

  it("returns a generic extraction failure when no usable URLs are exposed", () => {
    expect(
      parseKisssubDetailSnapshot({
        title: "Episode 03",
        hash: "cafebabe",
        magnetUrl: "",
        torrentUrl: "",
        magnetLabel: "",
        downloadLabel: ""
      })
    ).toEqual({
      ok: false,
      title: "Episode 03",
      hash: "cafebabe",
      magnetUrl: "",
      torrentUrl: "",
      failureReason: "The detail page finished loading, but no usable magnet or torrent URL was exposed."
    })
  })
})
