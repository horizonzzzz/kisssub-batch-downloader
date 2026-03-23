import { describe, expect, it, vi } from "vitest"

import { addTorrentFilesToQb, addUrlsToQb, getQbLoginErrorMessage } from "../../lib/qb"

describe("getQbLoginErrorMessage", () => {
  it("returns actionable guidance for 401 responses", () => {
    expect(
      getQbLoginErrorMessage(401, {
        qbBaseUrl: "http://127.0.0.1:17474"
      })
    ).toContain("Enable Cross-Site Request Forgery (CSRF) protection")
  })

  it("falls back to the generic HTTP status message", () => {
    expect(
      getQbLoginErrorMessage(403, {
        qbBaseUrl: "http://127.0.0.1:17474"
      })
    ).toBe("qBittorrent login failed with HTTP 403.")
  })
})

describe("addUrlsToQb", () => {
  it("adds savepath when a per-batch path is provided", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response("", {
        status: 200
      })
    )

    await addUrlsToQb(
      {
        qbBaseUrl: "http://127.0.0.1:17474",
        qbUsername: "admin",
        qbPassword: "secret",
        concurrency: 1,
        injectTimeoutMs: 15000,
        domSettleMs: 1200,
        retryCount: 1,
        remoteScriptUrl: "//1.acgscript.com/script/miobt/4.js?3",
        remoteScriptRevision: "20181120.2",
        lastSavePath: "",
        sourceDeliveryModes: {
          kisssub: "magnet",
          dongmanhuayuan: "magnet",
          acgrip: "torrent-file"
        }
      },
      ["magnet:?xt=urn:btih:abc"],
      {
        savePath: "D:\\Downloads\\Anime"
      },
      fetchImpl
    )

    const [, request] = fetchImpl.mock.calls[0] as [string, RequestInit]
    const body = request.body as FormData

    expect(body.get("urls")).toBe("magnet:?xt=urn:btih:abc")
    expect(body.get("savepath")).toBe("D:\\Downloads\\Anime")
  })

  it("does not send savepath when the batch uses qB defaults", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response("", {
        status: 200
      })
    )

    await addUrlsToQb(
      {
        qbBaseUrl: "http://127.0.0.1:17474",
        qbUsername: "admin",
        qbPassword: "secret",
        concurrency: 1,
        injectTimeoutMs: 15000,
        domSettleMs: 1200,
        retryCount: 1,
        remoteScriptUrl: "//1.acgscript.com/script/miobt/4.js?3",
        remoteScriptRevision: "20181120.2",
        lastSavePath: "",
        sourceDeliveryModes: {
          kisssub: "magnet",
          dongmanhuayuan: "magnet",
          acgrip: "torrent-file"
        }
      },
      ["https://example.com/test.torrent"],
      undefined,
      fetchImpl
    )

    const [, request] = fetchImpl.mock.calls[0] as [string, RequestInit]
    const body = request.body as FormData

    expect(body.get("urls")).toBe("https://example.com/test.torrent")
    expect(body.has("savepath")).toBe(false)
  })
})

describe("addTorrentFilesToQb", () => {
  it("uploads torrent files with savepath when provided", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response("", {
        status: 200
      })
    )

    await addTorrentFilesToQb(
      {
        qbBaseUrl: "http://127.0.0.1:17474",
        qbUsername: "admin",
        qbPassword: "secret",
        concurrency: 1,
        injectTimeoutMs: 15000,
        domSettleMs: 1200,
        retryCount: 1,
        remoteScriptUrl: "//1.acgscript.com/script/miobt/4.js?3",
        remoteScriptRevision: "20181120.2",
        lastSavePath: "",
        sourceDeliveryModes: {
          kisssub: "magnet",
          dongmanhuayuan: "magnet",
          acgrip: "torrent-file"
        }
      },
      [
        {
          filename: "episode-01.torrent",
          blob: new Blob(["torrent-data"], { type: "application/x-bittorrent" })
        }
      ],
      {
        savePath: "D:\\Downloads\\Anime"
      },
      fetchImpl
    )

    const [, request] = fetchImpl.mock.calls[0] as [string, RequestInit]
    const body = request.body as FormData
    const torrentFile = body.get("torrents")

    expect(torrentFile).toBeInstanceOf(File)
    expect((torrentFile as File).name).toBe("episode-01.torrent")
    expect(body.get("savepath")).toBe("D:\\Downloads\\Anime")
  })
})
