import { describe, expect, it, vi } from "vitest"

import {
  addTorrentFilesToQb,
  addUrlsToQb,
  getQbLoginErrorMessage,
  loginQb,
  qbFetchText
} from "../../lib/downloader/qb"
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

describe("loginQb", () => {
  it("submits the login form with cookies included", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response("Ok.", {
        status: 200
      })
    )

    await expect(loginQb(qbSettings, fetchImpl)).resolves.toBeUndefined()

    expect(fetchImpl).toHaveBeenCalledTimes(1)

    const [url, request] = fetchImpl.mock.calls[0] as [string, RequestInit]
    const body = new URLSearchParams(String(request.body))

    expect(url).toBe("http://127.0.0.1:17474/api/v2/auth/login")
    expect(request.method).toBe("POST")
    expect(request.credentials).toBe("include")
    expect(request.headers).toEqual({
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
    })
    expect(body.get("username")).toBe("admin")
    expect(body.get("password")).toBe("secret")
  })

  it("throws the mapped HTTP login error when qB rejects the request", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response("", {
        status: 401
      })
    )

    await expect(loginQb(qbSettings, fetchImpl)).rejects.toThrow(
      "Enable Cross-Site Request Forgery (CSRF) protection"
    )
  })

  it("throws when qB returns a non-ok login body", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response("Fails.", {
        status: 200
      })
    )

    await expect(loginQb(qbSettings, fetchImpl)).rejects.toThrow(
      "qBittorrent login rejected the credentials: Fails."
    )
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

describe("qbFetchText", () => {
  it("requests the qB endpoint with cookies included and returns the response text", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(" v5.1.0 ", {
        status: 200
      })
    )

    await expect(
      qbFetchText(qbSettings, "/api/v2/app/version", { method: "GET" }, fetchImpl)
    ).resolves.toBe(" v5.1.0 ")

    const [url, request] = fetchImpl.mock.calls[0] as [string, RequestInit]

    expect(url).toBe("http://127.0.0.1:17474/api/v2/app/version")
    expect(request.method).toBe("GET")
    expect(request.credentials).toBe("include")
  })

  it("throws when qB returns a failed HTTP response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response("", {
        status: 403
      })
    )

    await expect(qbFetchText(qbSettings, "/api/v2/app/version", undefined, fetchImpl)).rejects.toThrow(
      "qBittorrent request failed with HTTP 403."
    )
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
