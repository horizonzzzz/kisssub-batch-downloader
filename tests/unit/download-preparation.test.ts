import { describe, expect, it } from "vitest"

import {
  classifyExtractionResult,
  classifyPreparedBatchItem,
  extractDetailHash,
  extractMagnetHash
} from "../../src/lib/download-preparation"
import { DEFAULT_SOURCE_CONFIG } from "../../src/lib/sources/config/defaults"

describe("classifyPreparedBatchItem", () => {
  it("returns null when no valid magnet or torrent candidate is available", () => {
    expect(
      classifyPreparedBatchItem(
        {
          sourceId: "acgrip",
          detailUrl: "not-a-valid-url",
          title: "Hell Mode - 11",
          magnetUrl: "https://example.com/not-a-magnet",
          torrentUrl: "/t/350361.torrent"
        },
        DEFAULT_SOURCE_CONFIG,
        new Set<string>(),
        new Set<string>()
      )
    ).toBeNull()
  })

  it("classifies pre-resolved torrent submissions without opening the detail page", () => {
    expect(
      classifyPreparedBatchItem(
        {
          sourceId: "acgrip",
          detailUrl: "https://acg.rip/t/350361",
          title: "Hell Mode - 11",
          torrentUrl: "https://acg.rip/t/350361.torrent"
        },
        DEFAULT_SOURCE_CONFIG,
        new Set<string>(),
        new Set<string>()
      )
    ).toMatchObject({
      ok: true,
      status: "ready",
      deliveryMode: "torrent-file",
      submitUrl: "https://acg.rip/t/350361.torrent",
      torrentUrl: "https://acg.rip/t/350361.torrent",
      message: "Torrent file resolved and queued for upload."
    })
  })

  it("marks duplicate pre-resolved torrent urls without preparing a submission", () => {
    expect(
      classifyPreparedBatchItem(
        {
          sourceId: "acgrip",
          detailUrl: "https://acg.rip/t/350361",
          title: "Hell Mode - 11",
          torrentUrl: "https://acg.rip/t/350361.torrent"
        },
        DEFAULT_SOURCE_CONFIG,
        new Set<string>(),
        new Set<string>(["https://acg.rip/t/350361.torrent"])
      )
    ).toMatchObject({
      status: "duplicate",
      deliveryMode: "",
      submitUrl: "",
      message: "Duplicate torrent URL skipped."
    })
  })
})

describe("classifyExtractionResult", () => {
  it("prefers magnet submissions and records the btih hash", () => {
    const seenHashes = new Set<string>()
    const seenUrls = new Set<string>()

    expect(
      classifyExtractionResult(
        "kisssub",
        {
          ok: true,
          title: "Episode 01",
          detailUrl: "https://www.kisssub.org/show-deadbeef.html",
          hash: "deadbeef",
          magnetUrl: "magnet:?xt=urn:btih:ABCDEF123456",
          torrentUrl: "https://example.com/file.torrent",
          failureReason: ""
        },
        DEFAULT_SOURCE_CONFIG,
        seenHashes,
        seenUrls
      )
    ).toMatchObject({
      status: "ready",
      deliveryMode: "magnet",
      submitUrl: "magnet:?xt=urn:btih:ABCDEF123456",
      message: "Magnet resolved and queued for submission."
    })

    expect(seenHashes.has("abcdef123456")).toBe(true)
  })

  it("marks duplicate magnet hashes without preparing a submission", () => {
    expect(
      classifyExtractionResult(
        "kisssub",
        {
          ok: true,
          title: "Episode 02",
          detailUrl: "https://www.kisssub.org/show-feedface.html",
          hash: "feedface",
          magnetUrl: "magnet:?xt=urn:btih:ABCDEF123456",
          torrentUrl: "",
          failureReason: ""
        },
        DEFAULT_SOURCE_CONFIG,
        new Set<string>(["abcdef123456"]),
        new Set<string>()
      )
    ).toMatchObject({
      status: "duplicate",
      message: "Duplicate magnet hash skipped: abcdef123456"
    })
  })

  it("marks duplicate torrent urls without preparing a submission", () => {
    const seenHashes = new Set<string>()
    const seenUrls = new Set<string>(["https://example.com/file.torrent"])

    expect(
      classifyExtractionResult(
        "kisssub",
        {
          ok: true,
          title: "Episode 03",
          detailUrl: "https://www.kisssub.org/show-cafebabe.html",
          hash: "cafebabe",
          magnetUrl: "",
          torrentUrl: "https://example.com/file.torrent",
          failureReason: ""
        },
        DEFAULT_SOURCE_CONFIG,
        seenHashes,
        seenUrls
      )
    ).toMatchObject({
      status: "duplicate",
      message: "Duplicate torrent URL skipped."
    })
  })

  it("falls back to torrent-url when the preferred magnet mode is unavailable", () => {
    const seenHashes = new Set<string>()
    const seenUrls = new Set<string>()

    expect(
      classifyExtractionResult(
        "kisssub",
        {
          ok: true,
          title: "Episode 04",
          detailUrl: "https://www.kisssub.org/show-cafebabe.html",
          hash: "cafebabe",
          magnetUrl: "",
          torrentUrl: "https://files.example.com/cafebabe.torrent",
          failureReason: ""
        },
        DEFAULT_SOURCE_CONFIG,
        seenHashes,
        seenUrls
      )
    ).toMatchObject({
      status: "ready",
      deliveryMode: "torrent-url",
      submitUrl: "https://files.example.com/cafebabe.torrent",
      message: "Torrent URL resolved and queued for submission."
    })
  })

  it("reports extraction failures without trying to classify delivery modes", () => {
    expect(
      classifyExtractionResult(
        "kisssub",
        {
          ok: false,
          title: "Episode 05",
          detailUrl: "https://www.kisssub.org/show-deadbeef.html",
          hash: "",
          magnetUrl: "",
          torrentUrl: "",
          failureReason: "No download link could be extracted from the detail page."
        },
        DEFAULT_SOURCE_CONFIG,
        new Set<string>(),
        new Set<string>()
      )
    ).toMatchObject({
      status: "failed",
      message: "No download link could be extracted from the detail page."
    })
  })

  it("fails when the source has no supported delivery mode for the extracted links", () => {
    expect(
      classifyExtractionResult(
        "dongmanhuayuan",
        {
          ok: true,
          title: "Movie pack",
          detailUrl: "https://www.dongmanhuayuan.com/detail/G8Xvr.html",
          hash: "abcdef",
          magnetUrl: "",
          torrentUrl: "https://files.example.com/movie-pack.torrent",
          failureReason: ""
        },
        DEFAULT_SOURCE_CONFIG,
        new Set<string>(),
        new Set<string>()
      )
    ).toMatchObject({
      status: "failed",
      message: "No supported delivery mode was available for this source."
    })
  })
})

describe("preparation hash helpers", () => {
  it("extracts decoded lowercase btih hashes from magnet links", () => {
    expect(extractMagnetHash("magnet:?xt=urn:btih:ABCDEF123456&dn=Episode%2001")).toBe(
      "abcdef123456"
    )
  })

  it("extracts lowercase detail hashes from kisssub detail urls", () => {
    expect(extractDetailHash("https://www.kisssub.org/show-DEADBEEF.html")).toBe("deadbeef")
  })

  it("returns an empty string when no detail hash is present", () => {
    expect(extractDetailHash("https://www.kisssub.org/list-latest.html")).toBe("")
  })
})
