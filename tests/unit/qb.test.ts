import { describe, expect, it, vi } from "vitest"

import { addTorrentFilesToQb, addUrlsToQb, getQbLoginErrorMessage } from "../../lib/downloader/qb"
import { DEFAULT_SETTINGS } from "../../lib/settings"

const qbSettings = {
  ...DEFAULT_SETTINGS,
  qbBaseUrl: "http://127.0.0.1:17474",
  qbUsername: "admin",
  qbPassword: "secret"
}

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
      qbSettings,
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
      qbSettings,
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
      qbSettings,
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
