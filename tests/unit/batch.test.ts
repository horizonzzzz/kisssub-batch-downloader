import { describe, expect, it } from "vitest"

import * as batchModule from "../../lib/batch"
import { DEFAULT_SETTINGS } from "../../lib/settings"

const { classifyExtractionResult } = batchModule

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
        DEFAULT_SETTINGS,
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

  it("marks duplicate torrent urls without preparing a submission", () => {
    const seenHashes = new Set<string>()
    const seenUrls = new Set<string>(["https://example.com/file.torrent"])

    expect(
      classifyExtractionResult(
        "kisssub",
        {
          ok: true,
          title: "Episode 02",
          detailUrl: "https://www.kisssub.org/show-feedface.html",
          hash: "feedface",
          magnetUrl: "",
          torrentUrl: "https://example.com/file.torrent",
          failureReason: ""
        },
        DEFAULT_SETTINGS,
        seenHashes,
        seenUrls
      )
    ).toMatchObject({
      status: "duplicate",
      message: "Duplicate torrent URL skipped."
    })
  })
})

describe("classifyPreparedBatchItem", () => {
  it("classifies pre-resolved torrent submissions without opening the detail page", () => {
    const classifyPreparedBatchItem = (
      batchModule as {
        classifyPreparedBatchItem?: (
          item: {
            sourceId: string
            detailUrl: string
            title: string
            magnetUrl?: string
            torrentUrl?: string
          },
          settings: typeof DEFAULT_SETTINGS,
          seenHashes: Set<string>,
          seenUrls: Set<string>
        ) => unknown
      }
    ).classifyPreparedBatchItem

    expect(classifyPreparedBatchItem).toBeTypeOf("function")

    expect(
      classifyPreparedBatchItem?.(
        {
          sourceId: "acgrip",
          detailUrl: "https://acg.rip/t/350361",
          title: "Hell Mode - 11",
          torrentUrl: "https://acg.rip/t/350361.torrent"
        },
        DEFAULT_SETTINGS,
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
    const classifyPreparedBatchItem = (
      batchModule as {
        classifyPreparedBatchItem?: (
          item: {
            sourceId: string
            detailUrl: string
            title: string
            magnetUrl?: string
            torrentUrl?: string
          },
          settings: typeof DEFAULT_SETTINGS,
          seenHashes: Set<string>,
          seenUrls: Set<string>
        ) => unknown
      }
    ).classifyPreparedBatchItem

    expect(classifyPreparedBatchItem).toBeTypeOf("function")

    expect(
      classifyPreparedBatchItem?.(
        {
          sourceId: "acgrip",
          detailUrl: "https://acg.rip/t/350361",
          title: "Hell Mode - 11",
          torrentUrl: "https://acg.rip/t/350361.torrent"
        },
        DEFAULT_SETTINGS,
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

  it("falls back to torrent-url when the preferred magnet mode is unavailable", () => {
    const seenHashes = new Set<string>()
    const seenUrls = new Set<string>()

    expect(
      classifyExtractionResult(
        "kisssub",
        {
          ok: true,
          title: "Episode 03",
          detailUrl: "https://www.kisssub.org/show-cafebabe.html",
          hash: "cafebabe",
          magnetUrl: "",
          torrentUrl: "https://files.example.com/cafebabe.torrent",
          failureReason: ""
        },
        DEFAULT_SETTINGS,
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
})
