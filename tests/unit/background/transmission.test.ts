import { describe, expect, it, vi } from "vitest"

import { DEFAULT_SETTINGS } from "../../../src/lib/settings"

import { getDownloaderAdapter, getDownloaderMeta, SUPPORTED_DOWNLOADERS } from "../../../src/lib/downloader"
import { transmissionDownloaderAdapter, transmissionRpc, addUrlsToTransmission } from "../../../src/lib/downloader/transmission"

describe("downloader registry", () => {
  it("registers transmission as a supported downloader", () => {
    expect(SUPPORTED_DOWNLOADERS).toContainEqual({
      id: "transmission",
      displayName: "Transmission"
    })

    expect(getDownloaderMeta("transmission")).toEqual({
      id: "transmission",
      displayName: "Transmission"
    })

    expect(getDownloaderAdapter("transmission")).toBe(transmissionDownloaderAdapter)
  })
})

describe("transmission submission", () => {
  it("sends magnet and torrent URLs through torrent-add with download-dir", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(
        new Response("", {
          status: 409,
          headers: {
            "X-Transmission-Session-Id": "session-123"
          }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ result: "success" }), {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ result: "success" }), {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        })
      )

    const settings = {
      ...DEFAULT_SETTINGS,
      currentDownloaderId: "transmission" as const,
      downloaders: {
        ...DEFAULT_SETTINGS.downloaders,
        transmission: {
          baseUrl: "http://127.0.0.1:9091/transmission/rpc",
          username: "admin",
          password: "secret"
        }
      }
    }

    await addUrlsToTransmission(
      settings,
      ["magnet:?xt=urn:btih:abc", "https://example.com/file.torrent"],
      { savePath: "/downloads/anime" },
      fetchImpl
    )

    expect(fetchImpl).toHaveBeenCalledTimes(3)
    const firstPayload = JSON.parse(String((fetchImpl.mock.calls[1]?.[1] as RequestInit).body))
    const secondPayload = JSON.parse(String((fetchImpl.mock.calls[2]?.[1] as RequestInit).body))

    expect(firstPayload).toEqual({
      method: "torrent-add",
      arguments: {
        filename: "magnet:?xt=urn:btih:abc",
        "download-dir": "/downloads/anime"
      }
    })
    expect(secondPayload).toEqual({
      method: "torrent-add",
      arguments: {
        filename: "https://example.com/file.torrent",
        "download-dir": "/downloads/anime"
      }
    })
  })

  it("continues submitting later URLs after one RPC failure", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ result: "success" }), {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ result: "duplicate torrent" }), {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ result: "success" }), {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        })
      )

    const settings = {
      ...DEFAULT_SETTINGS,
      currentDownloaderId: "transmission" as const
    }

    await expect(
      addUrlsToTransmission(
        settings,
        ["magnet:?xt=urn:btih:ok1", "magnet:?xt=urn:btih:bad", "magnet:?xt=urn:btih:ok2"],
        {},
        fetchImpl
      )
    ).resolves.toEqual({
      entries: [
        {
          url: "magnet:?xt=urn:btih:ok1",
          status: "submitted"
        },
        {
          url: "magnet:?xt=urn:btih:bad",
          status: "failed",
          error: "Transmission RPC failed: duplicate torrent"
        },
        {
          url: "magnet:?xt=urn:btih:ok2",
          status: "submitted"
        }
      ]
    })

    expect(fetchImpl).toHaveBeenCalledTimes(3)
  })
})
describe("transmissionDownloaderAdapter", () => {
  it("tests connection through the transmission RPC endpoint", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(
        new Response("", {
          status: 409,
          headers: {
            "X-Transmission-Session-Id": "session-123"
          }
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            result: "success",
            arguments: {
              version: "4.0.6"
            }
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json"
            }
          }
        )
      )

    const settings = {
      ...DEFAULT_SETTINGS,
      currentDownloaderId: "transmission" as const,
      downloaders: {
        ...DEFAULT_SETTINGS.downloaders,
        transmission: {
          baseUrl: "http://127.0.0.1:9091/transmission/rpc",
          username: "admin",
          password: "secret"
        }
      }
    }

    await expect(transmissionRpc<{ version?: string }>(settings, "session-get", {}, fetchImpl)).resolves.toEqual({
      result: "success",
      arguments: {
        version: "4.0.6"
      }
    })

    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(fetchImpl.mock.calls[1]?.[0]).toBe("http://127.0.0.1:9091/transmission/rpc")

    const secondRequest = fetchImpl.mock.calls[1]?.[1] as RequestInit
    expect(secondRequest.method).toBe("POST")
    expect(secondRequest.headers).toMatchObject({
      "Content-Type": "application/json",
      "X-Transmission-Session-Id": "session-123",
      Authorization: `Basic ${Buffer.from("admin:secret").toString("base64")}`
    })
  })

  it("encodes unicode credentials as UTF-8 basic auth", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          result: "success",
          arguments: {
            version: "4.0.6"
          }
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )
    )

    const settings = {
      ...DEFAULT_SETTINGS,
      currentDownloaderId: "transmission" as const,
      downloaders: {
        ...DEFAULT_SETTINGS.downloaders,
        transmission: {
          baseUrl: "http://127.0.0.1:9091/transmission/rpc",
          username: "管理员",
          password: "密码123"
        }
      }
    }

    await expect(transmissionRpc(settings, "session-get", {}, fetchImpl)).resolves.toMatchObject({
      result: "success"
    })

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const request = fetchImpl.mock.calls[0]?.[1] as RequestInit
    expect(request.headers).toMatchObject({
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from("管理员:密码123", "utf8").toString("base64")}`
    })
  })
})
