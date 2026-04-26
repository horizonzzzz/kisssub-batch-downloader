import { describe, expect, it, vi } from "vitest"

import {
  addTorrentFilesToQb,
  addUrlsToQb,
  getQbLoginErrorMessage,
  loginQb,
  qbFetchText
} from "../../../src/lib/downloader/qb"
import { DEFAULT_DOWNLOADER_CONFIG } from "../../../src/lib/downloader/config/defaults"
import type { DownloaderConfig } from "../../../src/lib/downloader/config/types"

const qbConfig: DownloaderConfig = {
  ...DEFAULT_DOWNLOADER_CONFIG,
  profiles: {
    ...DEFAULT_DOWNLOADER_CONFIG.profiles,
    qbittorrent: {
      baseUrl: "http://127.0.0.1:17474",
      username: "admin",
      password: "secret"
    },
    transmission: DEFAULT_DOWNLOADER_CONFIG.profiles.transmission
  }
}

describe("getQbLoginErrorMessage", () => {
  it("returns actionable guidance for 401 responses", () => {
    expect(
      getQbLoginErrorMessage(401, {
        ...DEFAULT_DOWNLOADER_CONFIG,
        profiles: {
          ...DEFAULT_DOWNLOADER_CONFIG.profiles,
          qbittorrent: {
            baseUrl: "http://127.0.0.1:17474",
            username: "",
            password: ""
          },
          transmission: DEFAULT_DOWNLOADER_CONFIG.profiles.transmission
        }
      })
    ).toContain("Enable Cross-Site Request Forgery (CSRF) protection")
  })

  it("falls back to the generic HTTP status message", () => {
    expect(
      getQbLoginErrorMessage(403, {
        ...DEFAULT_DOWNLOADER_CONFIG,
        profiles: {
          ...DEFAULT_DOWNLOADER_CONFIG.profiles,
          qbittorrent: {
            baseUrl: "http://127.0.0.1:17474",
            username: "",
            password: ""
          },
          transmission: DEFAULT_DOWNLOADER_CONFIG.profiles.transmission
        }
      })
    ).toBe("qBittorrent login failed with HTTP 403.")
  })
})

describe("loginQb", () => {
  it("verifies fresh credentials first, then establishes a cookie-backed session", async () => {
    const fetchImpl = vi.fn().mockImplementation(async () =>
      new Response("Ok.", {
        status: 200
      })
    )

    await expect(loginQb(qbConfig, fetchImpl)).resolves.toBeUndefined()

    expect(fetchImpl).toHaveBeenCalledTimes(2)

    const [firstUrl, firstRequest] = fetchImpl.mock.calls[0] as [string, RequestInit]
    const [secondUrl, secondRequest] = fetchImpl.mock.calls[1] as [string, RequestInit]
    const firstBody = new URLSearchParams(String(firstRequest.body))
    const secondBody = new URLSearchParams(String(secondRequest.body))

    expect(firstUrl).toBe("http://127.0.0.1:17474/api/v2/auth/login")
    expect(firstRequest.method).toBe("POST")
    expect(firstRequest.credentials).toBe("omit")
    expect(firstRequest.headers).toEqual({
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
    })
    expect(firstBody.get("username")).toBe("admin")
    expect(firstBody.get("password")).toBe("secret")

    expect(secondUrl).toBe("http://127.0.0.1:17474/api/v2/auth/login")
    expect(secondRequest.method).toBe("POST")
    expect(secondRequest.credentials).toBe("include")
    expect(secondRequest.headers).toEqual({
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
    })
    expect(secondBody.get("username")).toBe("admin")
    expect(secondBody.get("password")).toBe("secret")
  })

  it("throws the mapped HTTP login error when qB rejects the request", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response("", {
        status: 401
      })
    )

    await expect(loginQb(qbConfig, fetchImpl)).rejects.toThrow(
      "Enable Cross-Site Request Forgery (CSRF) protection"
    )
  })

  it("throws when qB returns a non-ok login body", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response("Fails.", {
        status: 200
      })
    )

    await expect(loginQb(qbConfig, fetchImpl)).rejects.toThrow(
      "qBittorrent login rejected the credentials: Fails."
    )
  })

  it("rejects stale browser sessions when fresh credentials are invalid", async () => {
    const fetchImpl = vi.fn().mockImplementation(async (_url: string, request?: RequestInit) => {
      if (request?.credentials === "omit") {
        return new Response("Fails.", {
          status: 200
        })
      }

      return new Response("Ok.", {
        status: 200
      })
    })

    await expect(loginQb(qbConfig, fetchImpl)).rejects.toThrow(
      "qBittorrent login rejected the credentials: Fails."
    )
    expect(fetchImpl).toHaveBeenCalledTimes(1)
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
      qbConfig,
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
      qbConfig,
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
      qbFetchText(qbConfig, "/api/v2/app/version", { method: "GET" }, fetchImpl)
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

    await expect(qbFetchText(qbConfig, "/api/v2/app/version", undefined, fetchImpl)).rejects.toThrow(
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
      qbConfig,
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
